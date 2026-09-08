---
title: Prompt Caching in Agent Harnesses
date: 2026-09-06
lang: zh
duration:
description: 深入 Agents 中的 Prompt Caching 原理和实践
tag: Agent
place: 北京
---

# Prompt Caching in Agent Harnesses

“如果我必须选择一个指标，我认为 KV-cache 命中率是生产阶段 Agent 最重要的单一指标。” —— Manus 首席科学家季逸超在 2025 年的[一篇博客](https://manus.im/zh-cn/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus)中如是写道。

而 Prompt Caching，正是 Agent 提升 KV-cache 命中率的关键机制。从 Chatbot 到如今各种 Agent Harness，比如 Codex、Claude Code、Manus、Pi、DSH 等，Prompt Caching 俨然成为了 Agent 内部设计的一等公民，影响着上下文管理、模型推理成本、响应速度等关键环节。*“Prompt caching is everything.”*

## 从 KV Cache 说起

通常在一次 [Transformer](https://arxiv.org/abs/1706.03762) 模型的推理请求中，输入的所有 tokens 会经过一次前向计算，这个过程叫做 **Prefill**。之后，它会根据前序的计算结果逐步输出新的 token，这个过程叫做 **Decode**。

为了避免在 Decode 阶段重复计算前面已经处理过的 tokens，模型会将 Prefill 阶段产生的 Key(K) / Value(V) 中间状态缓存下来，这就是 [KV-cache](https://medium.com/@joaolages/kv-caching-explained-276520203249)。在后续生成过程中，Decode 会持续复用已有的 KV-cache，并将新生成 token 对应的 K/V 追加到其中。

在 Agent 中，随着用户对话轮次增加，输入上下文也会不断增长，Prefill 的计算量随之增大，首个 token 生成时间（TTFT）也会变长，直接影响用户体验。尤其是在 Coding Agent 中，输入上下文通常远大于单次生成的输出。[TraceLab](https://syfi.cs.washington.edu/blog/2026-06-25-tracelab/) 基于 Claude Code 和 Codex 真实使用数据的研究显示，输入与输出的 token 的比例高达约 **294:1**，使得 Prefill 和缓存复用的效率尤为重要。

这正是 Prompt Caching 要解决的问题，它的核心是利用推理系统的 **Prefix Caching** 机制：对于具有相同前缀的请求，推理系统可以复用此前已经计算并缓存的 KV-cache，只对未命中缓存的增量 tokens 执行 Prefill。这样既减少了重复计算，也能显著降低 TTFT 和推理成本。

<figure>
	<img src="/prompt-caching-in-agent-harnesses/request-cache-prefix.png" alt="前缀缓存示意：Request N+1 复用 Request N 的系统提示词、工具定义和消息前缀，并在末尾追加新的助手和用户消息" />
	<figcaption>Request N+1 复用已缓存的前缀，仅需对新增 tokens 进行 Prefill 计算。</figcaption>
</figure>

## 多实例部署下的推理服务

上一节中，Request N+1 可以命中 Request N 留下的 KV-cache，其中隐含了一个前提：处理新请求时，推理服务仍然能访问这些缓存。在实际的多实例部署中，请求可能被分配到不同的推理服务实例上，而且缓存也有相应的生命周期策略。因此，即使当前请求包含此前已经缓存过的前缀，也可能会出现 Cache Miss。要理解这一点，就需要我们进一步看推理服务中请求如何被路由，以及缓存如何被管理。

### 请求路由与缓存管理

对于保留在实例本地的 KV-cache，推理服务可以通过负载均衡器（Load Balancer）或请求网关，实施不同的请求路由策略来提高复用率。常见策略包括**会话亲和性**（Session Affinity）和**缓存感知路由**（Cache-Aware Routing）。前者一般根据会话 ID 等标识，将同一会话中的后续请求尽量路由回同一推理实例（Worker）。后者则根据请求前缀与各实例缓存的实际或估计匹配情况，并结合负载选择目标实例，这样共享相同前缀的请求即使来自不同会话，也更有机会复用缓存。

比如 SGLang 的 [Cache-Aware 路由策略](https://docs.sglang.io/docs/advanced_features/sgl_model_gateway#load-balancing-policies)结合了缓存感知与负载均衡。vLLM Production Stack 也提供了 [Cache-Aware 路由](https://docs.vllm.ai/projects/production-stack/en/latest/use_cases/kv-cache-aware-routing.html)。再比如，OpenAI 的缓存复用同样依赖请求到达持有匹配缓存的机器，其请求 API 提供可选参数 [`prompt_cache_key`](https://developers.openai.com/api/docs/guides/prompt-caching#cache-location)，用于辅助服务端对请求进行路由分组，让共享相同前缀的请求更有机会复用缓存。

<figure>
	<img src="/prompt-caching-in-agent-harnesses/request-cache-routing.png" alt="请求路由示意：Request N+1 路由到 Worker A 可命中已有的 KV-cache，路由到 Worker B 则未命中" />
	<figcaption>将相同前缀的后续请求路由到持有对应 KV-cache 的 Worker，提高缓存命中率。</figcaption>
</figure>

除了将请求路由到持有缓存的实例，推理服务还可以构建**分布式 KV-cache**（Distributed KV Cache），实现跨实例的缓存共享与传输。比如，Request N 在实例 A 上生成的 KV-cache，可以被写入多个实例能够访问的存储。当 Request N+1 被分配到实例 B 时，B 便有机会加载已有前缀的 KV-cache，再对未命中的部分执行 Prefill。这样，即使执行请求的实例发生变化，也仍然可能复用此前的计算结果。

比如，SGLang 的 [HiCache](https://docs.sglang.io/docs/advanced_features/hicache_design) 在 GPU 显存、主机内存和外部存储之间分层管理 KV-cache，并可通过共享存储后端支持跨实例复用。而用于 Kimi 推理服务的 [Mooncake](https://kvcache-ai.github.io/Mooncake/) 采用以 KV-cache 为中心的分离式架构（Disaggregated Architecture），并利用集群中的内存与 SSD 等资源组织分布式 KV-cache 池，支持跨实例复用。这些机制扩大了缓存容量与共享范围，同时也带来了**额外的缓存管理和数据传输开销**。

<figure>
	<img src="/prompt-caching-in-agent-harnesses/request-cache-sharing.png" alt="跨实例缓存共享示意：Worker A 将 KV-cache 写入共享存储，Worker B 加载后复用，并对新增 tokens 执行 Prefill" />
	<figcaption>通过共享 KV-cache，后续请求即使被路由到不同的 Worker，也有机会复用已有前缀的计算结果。</figcaption>
</figure>

### 缓存生命周期

无论 KV-cache 保存在实例本地还是共享存储中，都需要占用相应的存储资源。推理服务可以通过**生存时间**（Time to Live，TTL）来约定缓存的保留时长。超过这一期限后，缓存可能被清理，后续请求也就可能需要重新计算此前的前缀。

当然，不同服务的 TTL 策略也有所不同。比如说，[Claude Code](https://code.claude.com/docs/en/prompt-caching#which-ttl-each-request-gets) 在未手动配置时，会为订阅额度内的主会话默认申请 **1 小时 TTL**，使用 API Key 或云平台等按量计费方式时则默认申请 **5 分钟 TTL**。[OpenAI API](https://developers.openai.com/api/docs/guides/prompt-caching#cache-lifetime) 的 GPT-5.6 及后续模型默认提供至少 **30 分钟 TTL**，并在缓存被再次复用时刷新这一期限。

这意味着，即使仍在同一个会话中，睡一觉第二天继续、中途吃顿饭、临时开个会、甚至离开工位接杯水，缓存也可能已经过期。会话记录明明还在，但接着对话时，推理服务又得把历史前缀重新算一遍，带来额外的等待和计算成本。

另外，除了保留时间，缓存的可用性也可能受到存储容量的限制。比如，[vLLM](https://docs.vllm.ai/en/latest/design/prefix_caching/#eviction-lru) 会在需要分配空间时，按照最近最少使用（LRU）的顺序回收可淘汰的缓存块。

## API 中的缓存配置

### 自动缓存与显式缓存

部分模型服务默认会自动选择缓存边界，无需调用方显式标记，这种方式通常称为**自动缓存**（Automatic Caching）或**隐式缓存**（Implicit Caching）。比如，[OpenAI](https://developers.openai.com/api/docs/guides/prompt-caching#how-caching-works) 的 GPT-5.6 及后续模型默认采用隐式模式，在最后一条符合条件的用户消息或工具消息末尾放置缓存断点。

但有些时候，自动缓存的边界未必正好落在我们希望复用的内容末尾。为此，部分模型 API 还允许调用方显式标记缓存断点，更精确地控制哪些前缀被写入缓存，这便是**显式缓存**（Explicit Caching）。以 OpenAI API 为例，可以通过在内容块上设置 `prompt_cache_breakpoint` 来标记断点：

```ts {13}
import OpenAI from "openai";

const client = new OpenAI();
const response = await client.responses.create({
  model: "gpt-5.6",
  input: [
    {
      role: "developer",
      content: [{
        type: "input_text",
		// 此处省略具体内容，实际前缀需满足最低可缓存长度要求
        text: "固定的项目背景与开发规范...[system prompt]",
        prompt_cache_breakpoint: { mode: "explicit" },
      }],
    },
    { role: "user", content: "请检查这段代码是否符合项目规范..." },
  ],
  prompt_cache_options: { mode: "implicit" },
  // 其他配置已省略，如 reasoning、tools 等
});
```

上面的请求在固定的系统提示词末尾标记了缓存断点。首次请求会将符合条件的前缀写入缓存，后续请求即使更换了用户问题，只要此前的固定内容保持一致，且缓存仍然可用，就有机会复用这部分计算结果。

其中，`prompt_cache_breakpoint` 指定缓存前缀的结束位置，`prompt_cache_options.mode: "implicit"` 表示在保留显式断点的同时，服务端仍会在最后一条符合条件的消息末尾自动放置一个断点。如果改为 `explicit`，则表示只使用调用方标记的断点。

类似地，[Claude API](https://platform.claude.com/docs/en/build-with-claude/prompt-caching#explicit-cache-breakpoints) 也支持在内容块上添加 cache_control，显式标记可复用前缀的结束位置。最后需要注意的是，缓存前缀一般还需要满足所用模型的最低可缓存长度要求，具体阈值因厂商和模型而异。

### 响应中的缓存字段

我们可以通过 API 响应中的 `usage` 字段了解本次请求复用了多少缓存（cache read），以及产生了多少新的缓存写入（cache write）。

还是以 OpenAI 的 GPT-5.6 模型为例，假设首次请求包含 12,000 tokens，且没有匹配的缓存，其输入相关的 `usage` 摘录如下：

```json
{
  "usage": {
    "input_tokens": 12000,
    "input_tokens_details": {
      "cached_tokens": 0,
      "cache_write_tokens": 12000
    }
  }
}
```

第二次请求在保留原有前缀的基础上追加输入了 3,000 tokens。若两次请求的自动断点覆盖全部输入，且第二次请求成功命中原有前缀，则有：

| 字段                               | 含义       | 第一次请求 | 第二次请求 |
| ---------------------------------- | ---------- | ---------: | ---------: |
| `input_tokens`                     | 输入总量   |     12,000 |     15,000 |
| `cached_tokens` (cache read)       | 缓存读取量 |          0 |     12,000 |
| `cache_write_tokens` (cache write) | 缓存写入量 |     12,000 |      3,000 |

需要注意，新增输入不一定都会计入缓存写入量。普通输入量可以根据以下关系计算：

```
普通输入量 = input_tokens - cached_tokens - cache_write_tokens
```

计费时，普通输入、缓存读取、缓存写入和输出通常也是分别计算，比如以下两款 GPT 模型在标准处理模式下的[官方价格](https://developers.openai.com/api/docs/pricing)如下（美元／1M tokens）：

| 计费项目                | GPT-5.6 Sol | GPT-6 Astra |
| ----------------------- | ----------: | ----------: |
| 普通输入                |       $4.00 |      $10.00 |
| 缓存读取（Cache Read）  |       $0.40 |       $1.00 |
| 缓存写入（Cache Write） |       $5.00 |      $12.50 |
| 输出                    |      $20.00 |      $50.00 |

这两款模型的缓存读取单价均为普通输入的 **0.1** 倍，缓存写入单价均为普通输入的 **1.25** 倍。缓存写入除了处理输入，还需要保留并管理供后续请求复用的 KV 状态，涉及额外的存储和管理开销。因此，缓存的收益主要来自后续复用。随着 Agent 上下文不断增长，缓存是否命中对单次请求费用的影响也会更加明显。

## Harness 最佳实践

缓存的复用情况，也逐渐成为 Agent Harness 向用户展示的运行指标。如下图所示，[Pi](https://pi.dev/) 和 [DSH](https://www.deepseek.com/harness/) 的界面都展示了缓存命中率，让用户在对话过程中直观地了解缓存的利用情况。

Pi 默认底部状态栏的 `CH` 采用单次请求口径，如下图所示，计算**最近一次模型请求**的缓存读取 tokens 占完整输入 tokens 的比例。需要注意，旁边的输入、输出和缓存读写 token 数是会话累计值，`CH` 却只反映最近一次请求。

<figure>
	<img src="/prompt-caching-in-agent-harnesses/cache-hit-in-pi.png" alt="Pi 状态栏展示最近一次主对话请求的 CH 缓存命中率，以及会话累计的输入、输出和缓存 token 用量" />
	<figcaption>Pi 状态栏中的缓存命中率</figcaption>
</figure>

DSH 提供了两种展示口径。一种是单轮回复消息下方的详情面板（下图中的 Turn Usage），只累计本轮（turn）用户对话中的请求，一轮对话可能包含多次模型请求，例如模型调用工具、获取结果后继续推理。计算公式是：

```
Turn Cache hit = 本轮请求的缓存读取 tokens 之和 / 本轮请求的完整输入 tokens 之和
```

对应到下面截图中：`84,352 / (5,710 + 84,352) ≈ 93.7%`。

另一种则是底部状态栏的 Cache hit 按**整个会话**累计，计算方式是：

```
Session Cache hit = 所有请求的缓存读取 tokens 之和 / 所有请求的完整输入 tokens 之和
```

<figure>
	<img src="/prompt-caching-in-agent-harnesses/cache-hit-in-dsh.png" alt="DSH 的 Turn Usage 面板显示本轮缓存命中率为 93.7%，底部状态栏显示会话累计缓存命中率为 83%" />
	<figcaption>DeepSeek Harness 消息底部和会话状态栏中会展示不同口径的缓存命中率</figcaption>
</figure>

理解这些统计口径后，我们便可以观察上下文变化对缓存复用的影响。接下来，我们一起看看 Harness 在优化 Prompt Caching 时的一些实践经验，其中有些做法可能并不符合直觉。

### 前缀稳定的 System Prompt

- 举例 运行时动态的 context
- Tool 与 Skill 加载

openclaw 时间设计 https://docs.openclaw.ai/zh-CN/concepts/system-prompt#%E6%97%B6%E9%97%B4%E5%A4%84%E7%90%86

比如，在会话过程中，不要中途切换 Model 或者思考程度/推理强度。也不要在会话中途新增或者删除 Tool 或 Skill。因为这些操作会导致上下文的前缀发生变化，从而影响缓存的命中率。

### Append-only Context

Append-only 是指上下文**仅追加**。 也就是说，Agent 在运行时尽量不会直接修改已有的上下文内容，而是将新的信息追加到现有上下文的末尾。这样做的好处是可以保持上下文的完整性和一致性，避免因删除或修改导致 prefix 不一致。

有时，您输入到提示中的信息可能会过时，比如涉及时间或用户修改了文件的情况。您可能会想直接更新提示，但这会导致缓存未命中，最终可能会让用户付出高昂的代价。

请考虑是否可以在代理的下一轮对话中通过消息传递这些信息。在 Claude Code 中，我们会在下一条用户消息或工具结果中添加一个 `<system-reminder>` 标签，为模型提供更新后的信息，这有助于保持缓存。

### Compaction 压缩与缓存

压缩其实是件很 tricky 的工作，完全可以单开一篇文章来讲，如果大家感兴趣的话。

## Pi Agent 中的 Prompt Caching

### 缓存统计与展示

### Cache Miss 提醒

### Pi 能观察到什么

## 常见失效场景

- Tool 与 Skill 变化
- 切换 Model 或 Provider
- 长时间闲置
- Branching 与 Rewind
- Context Compaction
