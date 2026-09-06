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

“如果我必须选择一个指标，我认为 KV-cache 命中率是生产阶段 Agent 最重要的单一指标。” —— Manus 联合创始人兼首席科学家季逸超在 2025 年的[一篇博客](https://manus.im/zh-cn/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus)中如是写道。

而 Prompt Caching，正是 Agent 提升 KV-cache 命中率的关键机制。从 Chatbot 到如今各种 Agent Harness，例如 Codex、Claude Code、Manus、Pi、DSH 等，Prompt Caching 俨然成为了 Agent 内部设计的一等公民，影响着上下文管理、模型推理成本、响应速度等关键环节。

## 从 KV Cache 说起

通常在一次 [Transformer](https://arxiv.org/abs/1706.03762) 模型的推理请求中，输入的所有 tokens 会经过一次前向计算，这个过程叫做 **Prefill**。之后，它会根据前序的计算结果逐步输出新的 token，这个过程叫做 **Decode**。

为了避免在 Decode 阶段重复计算前面已经处理过的 tokens，模型会将 Prefill 阶段产生的 Key(K) / Value(V) 中间状态缓存下来，这就是 [KV-cache](https://medium.com/@joaolages/kv-caching-explained-276520203249)。在后续生成过程中，Decode 会持续复用已有的 KV-cache，并将新生成 token 对应的 K/V 追加到其中。

在 Agent 中，随着用户对话轮次增加，输入上下文也会不断增长，Prefill 的计算量随之增大，首个 token 生成时间（TTFT）也会变长，直接影响用户体验。尤其是在 Coding Agent 中，输入上下文通常远大于单次生成的输出。[TraceLab](https://syfi.cs.washington.edu/blog/2026-06-25-tracelab/) 基于 Claude Code 和 Codex 真实使用数据的研究显示，输入与输出的 token 的比例高达约 **294:1**，使得 Prefill 和缓存复用的效率尤为重要。

这正是 Prompt Caching 要解决的问题，它的核心是利用推理系统的 **Prefix Caching** 机制：对于具有相同前缀的请求，推理系统可以复用此前已经计算并缓存的 KV-cache，只对未命中缓存的增量 tokens 执行 Prefill。这样既减少了重复计算，也能显著降低 TTFT 和推理成本。

<figure>
	<img src="/prompt-caching-in-agent-harnesses/request-cache-prefix.png" alt="缓存请求前缀" />
	<figcaption>Request N+1 复用已缓存的前缀，仅需对新增 tokens 进行 Prefill 计算</figcaption>
</figure>

## 多实例部署下的推理服务

上一节中，Request N+1 可以命中 Request N 留下的 KV-cache，其中隐含了一个前提：处理新请求时，推理服务仍然能访问这些缓存。在实际的多实例部署中，请求可能被分配到不同的推理服务实例上，而且缓存也有相应的生命周期策略。因此，即使当前请求包含此前已经缓存过的前缀，也可能会出现 Cache Miss。要理解这一点，就需要我们进一步看推理服务中请求如何被路由，以及缓存如何被管理。

### 请求路由与缓存管理

对于保留在实例本地的 KV-cache，推理服务可以通过负载均衡器（Load Balancer）或请求网关，实施不同的请求路由策略来提高复用率。常见策略包括**会话亲和性（Session Affinity）**和**缓存感知路由（Cache-Aware Routing）**。前者一般根据会话 ID 等标识，将同一会话中的后续请求尽量路由回同一推理实例（Worker）。后者则根据请求前缀与各实例缓存的实际或估计匹配情况，并结合负载选择目标实例，这样共享相同前缀的请求即使来自不同会话，也更有机会复用缓存。

比如 SGLang 的 [Cache-Aware 路由策略](https://docs.sglang.io/docs/advanced_features/sgl_model_gateway#load-balancing-policies)结合了缓存感知与负载均衡。vLLM Production Stack 也提供了 [Cache-Aware 路由](https://docs.vllm.ai/projects/production-stack/en/latest/use_cases/kv-cache-aware-routing.html)。再比如，OpenAI 的缓存复用同样依赖请求到达持有匹配缓存的机器，其请求 API 提供可选参数 [`prompt_cache_key`](https://developers.openai.com/api/docs/guides/prompt-caching#cache-location)，用于辅助服务端对请求进行路由分组，让共享相同前缀的请求更有机会复用缓存。

<figure>
	<img src="/prompt-caching-in-agent-harnesses/request-cache-prefix.png" alt="缓存请求前缀" />
	<figcaption>相同前缀的后续请求被路由到持有对应 KV-cache 的 Worker，从而提高 Prefix Cache 命中率</figcaption>
</figure>

除了将请求路由到持有缓存的实例，推理服务还可以构建**分布式 KV-cache（Distributed KV Cache）**，实现跨实例的缓存共享与传输。例如，Request N 在实例 A 上生成的 KV-cache，可以被写入多个实例能够访问的存储。当 Request N+1 被分配到实例 B 时，B 便有机会加载已有前缀的 KV-cache，再对未命中的部分执行 Prefill。这样，即使执行请求的实例发生变化，也仍然可能复用此前的计算结果。

比如，SGLang 的 [HiCache](https://docs.sglang.io/docs/advanced_features/hicache_design) 在 GPU 显存、主机内存和外部存储之间分层管理 KV-cache，并可通过共享存储后端支持跨实例复用。而用于 Kimi 推理服务的 [Mooncake](https://kvcache-ai.github.io/Mooncake/) 采用以 KV-cache 为中心的分离式架构（Disaggregated Architecture），并利用集群中的内存与 SSD 等资源组织分布式 KV-cache 池，支持跨实例复用。这些机制扩大了缓存容量与共享范围，同时也带来了**额外的缓存管理和数据传输开销**。

### 缓存生命周期

## API 中的缓存配置

### 显式缓存与自动缓存

### Cache Read、Write 与 Miss

### Cache Miss 的成本

## Harness 设计的最佳实践

### 前缀稳定的 System Prompt

- 举例 运行时动态的 context
- Tool 与 Skill 加载

openclaw 时间设计 https://docs.openclaw.ai/zh-CN/concepts/system-prompt#%E6%97%B6%E9%97%B4%E5%A4%84%E7%90%86

### 上下文仅追加 Append-only

消息递增，举例一些 prune tool result 的工具，看起来优化了 tokens，但实际上也破坏了 prompt cache

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
