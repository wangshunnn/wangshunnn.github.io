---
title: Vue Signals 进化论（v3.6）：Alien Signals 终局之战？
date: 2025-4-10
lang: zh
duration: 17 min
description: Vue 3.6 响应式重构的背后是 Alien Signals 的推拉哲学
tag: Vue, Signals
place: 北京
outline: [2,3]
---

# Vue Signals 进化论（v3.6）：Alien Signals 终局之战？

<br/>

> **✨ AI 摘要**
>
> Vue 3.6 响应式系统将引入 Alien Signals 进一步优化性能。文章深入分析了响应式传播算法模型（Push、Pull、Push-pull），对比了 Preact Signals（Vue 3.5）与 Alien Signals 的实现差异。Alien Signals 延续优化的双向链表结构，实现了类似 Reactively 的 push-pull-push 混合模型。这种设计大幅提升了性能，使其在信号框架性能测试中登顶榜首，为 Vue 响应式系统带来新的突破。

## 序言

书接上回 ——《 [Vue Signals 进化论（v3.5）：Preact 重构启示录](https://soonwang.me/blog/vue-reactivity-3.5-preact-signals) 》。

从目前 Vue 3.6 版本（[**minor**](https://github.com/vuejs/core/tree/minor) 分支）已合并的 [**PR**](https://github.com/vuejs/core/pull/12570) 来看，将引入 [Alien Signals](https://github.com/stackblitz/alien-signals) 来进一步优化响应式系统性能。

## 性能测试 Benchmark

下图是当前各个信号框架的 [性能对比示意图](https://github.com/transitive-bullshit/js-reactivity-benchmark)：

<figure>
	<img src="/vue-reactivity-3.5-preact-signals/benchmark.png" alt="前端 Signals 框架性能对比" />
	<figcaption>前端 Signals 框架性能对比</figcaption>
</figure>

虽然登顶榜首，Alien Signals 仍在不断[超越自我](https://github.com/stackblitz/alien-signals/releases/tag/v1.0.0)：

<figure>
	<img src="/vue-reactivity-3.6-alien-signals/alien-signals-benchmark.png" alt="Alien Signals 各版本性能对比" />
	<figcaption>Alien Signals 各版本性能对比</figcaption>
</figure>

## 响应式传播算法模型（Propagation Algorithm Model）

在介绍 Alien Signals 之前，我想先介绍一下响应式中的更新转播算法模型。在上一篇我们讲到，Signals 信号库大致可以分为两类：Lazy（惰性）和 Eager（即时性）。

- Lazy（惰性）：结果被访问时计算，延迟执行，按需的思想，减少冗余计算。
- Eager（即时性）：数据变化时立即计算，实时响应，但可能会出现频繁计算问题。

比如 MobX 属于即时性，而 Preact Signals 和 Vue 等大多数框架都是都属于惰性。

这里我们再认识一种新的模型分类方法，在响应式编程中，根据[更新传播算法](https://en.wikipedia.org/wiki/Reactive_programming#Change_propagation_algorithms)的实现方案通常可以分为三类：**Push**、**Pull**、**Push-pull**。

### Push-based

`Push-based Model`（推送模型）相当于 Eager（即时性）模型，依赖项发生变化时，立即推送变化给下游的订阅者。推送的消息一般是自包含的，也就是依赖项自身变化后的值以及其他下游订阅者需要的必要信息，下游订阅者不再需要反向查询其他信息。可以理解成类似服务端向客户端单向推送的 [SSE](https://developer.mozilla.org/zh-CN/docs/Web/API/Server-sent_events/Using_server-sent_events) 通信机制。

### Pull-based

`Pull-based Model`（拉取模型）相当于 Lazy（惰性）模型，是按需计算的思想。比如在渲染阶段读取 computed 时才会去拉取其依赖项的变化，从而获取自身正确更新后的值。可以理解成类似客户端向服务端轮询的通信机制。

### Push-pull hybrid

`Push-pull Model`（推拉模型）是结合了 `Push-based Model` 和 `Pull-based Model` 的一种混合模型。

- `Push` 推送阶段：对于依赖项来说，自身变化后会推送一部分信息，比如脏标记，通知下游的订阅者们他们的依赖项变化了，但不包含自身变化后的具体值。
- `Pull` 拉取阶段：对于接收到更新推动的订阅者来说，还需要额外拉取一部分必要信息，比如依赖项变化后的值。

## 回顾 Preact Signals（Vue 3.5）

在上一篇文章中，我们详细分析了 Preact Signals 源码是如何依靠“版本计数”来解决相等性问题，可以发现其实它也符合 `Push-pull Model` 混合模型的说法：

比如在如下示例中：

```ts
const A = signal(0)
const B = computed(() => A.value + 1)
const C = computed(() => A.value * 0) // always 0
const D = computed(() => B.value + C.value)
const E = computed(() => C.value + 1)
effect(() => {
	console.log('effect', D.value + E.value)
})

A.value++
```

从 `push-pull` 视角来重新审视其内部的变化传播算法流程，如下图所示：

<figure>
	<img src="/vue-reactivity-3.6-alien-signals/preact-signals-push-pull.png" alt="Preact Signals 的 push-pull 原理示意图" />
	<figcaption>Preact Signals 的 push-pull 原理示意图</figcaption>
</figure>


### Push 阶段

`Push` 是自顶向下的 *Top-down*。左侧图中，当 `A.value++` 变化时，会 `push` 推送变更通知，会遍历订阅者链表递归的 `push` （notify）下游订阅者，此时 `B、C、D、E` 全都被标记为 `OUTDATED` 。这一点和 Vue 2 暴力地派发 `dirty` 脏标记其实差不多的。

### Pull 阶段

`Pull` 是自底向上的 *Bottom-up*。右侧图中需要读取 `computed signal` 时，`D、E、B、C` 都需要 `pull` 拉取上游的依赖项和中间节点的版本号和变更值等必要信息，依据 `_flags` 标记位和“版本计数”来判断是否真正需要重新计算。

**小结**

这里虽然有 `push`，但是 `push` 的信息相对简单粗暴，被通知过的节点需要在 `pull` 阶段进行向上递归的“版本计数”对比之后才能真正判断是否需要重新计算。所以我们可以说 Preact Signals 本质还是一个偏 `Pull-based Model`。

## Alien Signals

### 双向链表（doubly-linked list）

Alien Signals 延续使用 Preact Signals（Vue 3.5）中的双向链表结构设计，简化了节点内属性，命名也更贴合 Vue 设计。如下图所示：

<figure>
	<img src="/vue-reactivity-3.6-alien-signals/alien-signals-linked-list.png" alt="Alien Signals 双向链表结构示意图" />
	<figcaption>Alien Signals 双向链表结构示意图</figcaption>
</figure>

### Push + Pull + Push!

*Push or Pull？时间还是空间？To be or not to be？这是个问题！*

从源码来看，Alien Signals 严格说应该是 [push-pull-push](https://github.com/stackblitz/alien-signals/pull/19) 实现，具体来说：

- `Push` 推送：`signal` 变更后将 `Dirty/PendingComputed` 脏标志推送给下游订阅者。
- `Pull` 拉取：`computed` 被读取时，向上游依赖项进行 `pull` 拉取，检查是否需要重计算。
- `Push` 再推送：在上一步的 `pull` 阶段中，如果有节点的值发生了更新，则将 `Dirty` 脏标记再 `push` 推送给浅层订阅者。

接下来我们从源码角度来细品下。

### Propagate（push）

`Signal` 的值变化后，会触发 `propagate` 方法，进行变更传播，也就是第一次 `Push` 阶段。

```ts {8}
function signalGetterSetter<T>(this: Signal<T>, ...value: [T]): T | void {
	if (value.length) {
		if (this.currentValue !== (this.currentValue = value[0])) {
			// subs 指向订阅者链表的首节点
			const subs = this.subs;
			if (subs !== undefined) {
				// 变更传播方法
				propagate(subs);
				// ..
			}
		}
	}
}
```

源码中信号的内部 `flags` 属性存储了当前节点的脏标记以及 `computed/effect` 身份标识等其他信息，方便在不同判断场景中复用。`flags` 类型设计如下：

```ts {7-8}
export const enum SubscriberFlags {
	Computed = 1 << 0,			// 标记为 computed
	Effect = 1 << 1,			// 标记为 effect
	Tracking = 1 << 2,			// 依赖收集中
	Notified = 1 << 3,			// 已经被 push 通知过了
	Recursed = 1 << 4, 			// 临时标记，已被递归处理过，防止循环
	Dirty = 1 << 5, 			// 确定需要重新计算更新结果
	PendingComputed = 1 << 6,	// 可能需要重新计算的 computed
	PendingEffect = 1 << 7,		// 可能需要重新计算的 effect
	Propagated = Dirty | PendingComputed | PendingEffect, // 方便条件判断的组合标记
}
```

`propagate` 方法如下所示，由于源码比较长 80 行左右，我们先简化看下整体框架：

- 整体向下递归 `push` 传播变更，通过 `do-while` + 单向链表 模拟实现 DFS 递归调用栈，代替传统的函数递归。可以关注如下代码中的 3 处 `continue` 来把握整体 DFS 结构。源码实现是先标记再入栈递归，相当于树的前序遍历。
- 向下递归的过程中给每个节点（订阅者）打上脏标记，判断是 `PendingComputed`（可能变化）还是 `Dirty`（肯定变化）。

总结一句话就是：向下递归地 `push` 脏标记。

```ts
// current: 当前 signal 的订阅者链表的首节点
function propagate(current: Link): void {
	let next = current.nextSub;
	// 模拟调用栈
	let branchs: OneWayLink<Link | undefined> | undefined;
	// 记录模拟调用栈深度
	let branchDepth = 0;
	// 临时记录遍历过程中当前节点应该打上的脏标记
	let targetFlag = SubscriberFlags.Dirty;

	top: do {
		const sub = current.sub;
		const subFlags = sub.flags;
		let shouldNotify = false;

		// part-1：if-else 判断是否需要向下 push，并且给当前 sub.flags 打标记
		if (!(subFlags & (SubscriberFlags.Tracking | SubscriberFlags.Recursed | SubscriberFlags.Propagated))) {
			sub.flags = subFlags | targetFlag | SubscriberFlags.Notified;
			shouldNotify = true;
		} else if (..) {
			// ..
		}

		// part-2：需要向下 push，模拟递归调用入栈
		if (shouldNotify) {
			const subSubs = sub.subs;
			if (subSubs !== undefined) {
				// 深度递归遍历 DFS
				current = subSubs;
				if (subSubs.nextSub !== undefined) {
					// 模拟递归调用入栈
					branchs = { target: next, linked: branchs };
					++branchDepth;
					next = current.nextSub;
					targetFlag = SubscriberFlags.PendingComputed;
				}
				// ① 深度递归执行
				continue;
			}
		} else if (..) {
			// ..
		}

		// part-3：同层级在广度上向订阅者链表的下一个节点移动（树的兄弟节点）
		if ((current = next!) !== undefined) {
			next = current.nextSub;
			// 浅层标记 Dirty，深层标记 PendingComputed
			targetFlag = branchDepth ? SubscriberFlags.PendingComputed : SubscriberFlags.Dirty;
			// ② 切换遍历节点后跳到新的循环
			continue;
		}

		// part-4：模拟递归回溯出栈
		while (branchDepth--) {
			current = branchs!.target!;
			branchs = branchs!.linked;
			if (current !== undefined) {
				next = current.nextSub;
				targetFlag = branchDepth ? SubscriberFlags.PendingComputed : SubscriberFlags.Dirty;
				// ③ 回溯执行
				continue top;
			}
		}

		break; // 终止循环
	} while (true);
}
```

简化后的源码看着还是比较复杂，下面我用函数递归的形式复写一版上面的核心逻辑，帮助大家更容易理解。

```ts {7,17}
// 函数递归版本（伪代码）
class Dep {
	set(value) {
		if (value !== this._value) {
			for (let link = this.subs; link !== undefined; link = link.nextSub) {
				// 浅层订阅者 push Dirty
				link.sub.propagete(Dirty);
			}
			this._value = value;
		}
	}
	propagete(flag) {
		if (!(this.flags & Dirty)) {
			this.flags = flag;
			for (let link = this.subs; link !== undefined; link = link.nextSub) {
				// 深层订阅者递归地 push PendingComputed
				link.sub.propagete(PendingComputed);
			}
		}
	}
}
```

### checkDirty（pull）

接下来，再看看 `pull` 阶段源码实现。在读取 `computed` 时，如果脏标记为可能发生了变化（`SubscriberFlags.Dirty | SubscriberFlags.PendingComputed`），会触发 `processComputedUpdate` 方法。

然后，如果是 `Dirty` 直接进行重新计算，这个好理解。这里的 `updateComputed` 方法就是进行了重新计算的逻辑，如果计算结果变化，返回 `true`，否则返回 `false` 。如果重计算后结果变化，那么可以再次进行 `push`。这里的 `push` 指的就是 `shallowPropagate` 方法。顾名思义，大家可能已经猜到它的作用了，具体我们后面再分析。

```ts {5,17,19,24,36,40}
function computedGetter<T>(this: Computed<T>): T {
	const flags = this.flags;
	if (flags & (SubscriberFlags.Dirty | SubscriberFlags.PendingComputed)) {
		// 结果可能变化，需要进一步处理
		processComputedUpdate(this, flags);
	}
	// 依赖收集
	if (activeSub !== undefined) {
		link(this, activeSub);
	} else if (activeScope !== undefined) {
		link(this, activeScope);
	}
	return this.currentValue!;
}

function processComputedUpdate(computed: Dependency & Subscriber, flags: SubscriberFlags): void {
	if (flags & SubscriberFlags.Dirty || checkDirty(computed.deps!)) {
		// 需要重新计算
		if (updateComputed(computed)) {
			// 计算结果有变化，可以再次 push
			const subs = computed.subs;
			if (subs !== undefined) {
				// 浅层传播 push
				shallowPropagate(subs);
			}
		}
	} else {
		computed.flags = flags & ~SubscriberFlags.PendingComputed;
	}
}

updateComputed(computed: Computed): boolean {
	// ..
	try {
		const oldValue = computed.currentValue;
		const newValue = computed.getter(oldValue);
		if (oldValue !== newValue) {
			computed.currentValue = newValue;
			// 计算结果变化，返回 true
			return true;
		}
		// 计算结果没变化，返回 false
		return false;
	}
	// ..
}
```

说句题外话，这里的 `processComputedUpdate` 其实能看出 Vue 3.4 中 `computed.get` 逻辑的影子，毕竟是同一个作者，感兴趣的话可以自行对比看看。

回到正题，`processComputedUpdate` 方法中比较麻烦的是，如果标记为 `PendingComputed`，也就是可能发生了变化，那么需要进一步进行 `checkDirty` 脏值检查，也就是 `pull` 阶段。

`checkDirty` 源码 70 行左右，我们可以整体分析下：

- 整体向上递归 `pull` 拉取变更，和 `propagate` 一样通过 `do-while` + 单向链表 模拟实现 DFS 递归调用栈来代替传统函数递归。可以关注如下代码中的 3 处 `continue` 来把握整体 DFS 结构。
- 向上递归过程中，遇到标记为 `Dirty` 的 `computed` 节点，直接触发该节点的重计算 `updateComputed` ，如果结果有更新，则触发 `shallowPropagate` 方法进行浅层 `push` 。
- 向上递归过程中，遇到标记为 `PendingComputed` 的 `computed` 节点，则先入栈继续向上递归，直到遇到标记为 `Dirty` 的 `computed` 节点，重复上一步。
- 向上递归的回溯阶段，也就是“归”的阶段，需要重新检查脏标记，因为在“递”阶段的浅层 `push` 中可能会遍历修正节点的脏标记。如果被修正为了 `Dirty`，那么和之前一样，触发重计算和浅层 `push`。

前面的 `push` 阶段从树的角度是前序遍历，那这里的 `pull` 阶段可以理解为树的后序遍历，叶子节点遍历完再检查根节点最终的脏标记。

```ts
// current: 当前 computed 的依赖项链表的首节点
function checkDirty(current: Link): boolean {
		// 模拟调用栈
		let prevLinks: OneWayLink<Link> | undefined;
		// 记录模拟调用栈深度
		let checkDepth = 0;
		// 临时记录遍历过程中当前节点的脏标记检查结果
		let dirty: boolean;

		top: do {
			dirty = false;
			const dep = current.dep;

			// // part-1：向上 pull，模拟递归调用入栈
			if (current.sub.flags & SubscriberFlags.Dirty) {
				dirty = true;
			} else if ('flags' in dep) {
				const depFlags = dep.flags;
				if ((depFlags & (SubscriberFlags.Computed | SubscriberFlags.Dirty)) === (SubscriberFlags.Computed | SubscriberFlags.Dirty)) {
					// 标记为 Dirty
					if (updateComputed(dep)) {
						const subs = dep.subs!;
						if (subs.nextSub !== undefined) {
							// 结果变更，浅层 push
							shallowPropagate(subs);
						}
						dirty = true;
					}
				} else if ((depFlags & (SubscriberFlags.Computed | SubscriberFlags.PendingComputed)) === (SubscriberFlags.Computed | SubscriberFlags.PendingComputed)) {
					// 标记为 PendingComputed
					if (current.nextSub !== undefined || current.prevSub !== undefined) {
						// 模拟递归调用入栈
						prevLinks = { target: current, linked: prevLinks };
					}
					current = dep.deps!;
					++checkDepth;
					// ① 深度递归执行
					continue;
				}
			}

			// part-2：同层级广度上向依赖项链表的下一个节点移动（树的兄弟节点）
			if (!dirty && current.nextDep !== undefined) {
				current = current.nextDep;
				// ② 切换遍历节点后跳到新的循环
				continue;
			}

			// part-3：模拟递归回溯出栈
			while (checkDepth) {
				--checkDepth;
				// ..
				// 回溯阶段需要再次检查脏标记，关键！
				if (dirty) {
					// 如果是 dirty，更新当前节点
					if (updateComputed(sub)) {
						// 如果更新后结果变化，触发浅层 push，将子节点修正为 Dirty
						if (firstSub.nextSub !== undefined) {
							current = prevLinks!.target;
							prevLinks = prevLinks!.linked;
							shallowPropagate(firstSub);
						}
						continue; // 内层循环
					}
				} else {
					// 如果不是 dirty，确定不需要重新计算，去掉 PendingComputed 标记
					sub.flags &= ~SubscriberFlags.PendingComputed;
				}
				if (firstSub.nextSub !== undefined) {
					current = prevLinks!.target;
					prevLinks = prevLinks!.linked;
				} else {
					current = firstSub;
				}
				if (current.nextDep !== undefined) {
					current = current.nextDep;
					// ③ 外层循环回溯执行
					continue top;
				}
				dirty = false;
			}

			return dirty; // 返回最终 dirty 结果
		} while (true);
	}
```

同样的，可以用函数递归的形式复写一版上面的核心逻辑。

```ts {5,13}
// 函数递归版本（伪代码）
function checkDirty(sub: Dependency & Subscriber) {
	if (sub.flags & PendingComputed) {
		for (let link = sub.deps; link !== undefined; link = link.nextDep) {
			checkDirty(link.dep); // 递归检查依赖项
			if (sub.flags & Dirty) {
				break; // 遇到 Dirty 节点停止递归
			}
		}
	}
	if (sub.flags & Dirty) {
		if (updateComputed(sub)) { // 如果标记为 Dirty ，重计算更新
			shallowPropagate(sub); // 结果有更新，触发浅层传播
		}
	}
	sub.flags &= ~(Dirty | PendingComputed); // 清除脏标记
}
```

### shallowPropagate（浅层 push）

`shallowPropagate` 工作相对就简单多了，只需要一次遍历当前节点的订阅者链表，将标记为 `PendingComputed` 的订阅者节点修正为 `Dirty` 。因为只需要遍历直接与当前节点关联的订阅者链表，而不需要向下递归深入，所以叫做“浅层”传播。

```ts
// link: 订阅者链表的首节点点
function shallowPropagate(link: Link): void {
	do {
		const sub = link.sub;
		const subFlags = sub.flags;
		if ((subFlags & (SubscriberFlags.PendingComputed | SubscriberFlags.Dirty)) === SubscriberFlags.PendingComputed) {
			// 将标记为 PendingComputed 的订阅者节点修正为 Dirty
			sub.flags = subFlags | SubscriberFlags.Dirty | SubscriberFlags.Notified;
			// ..
		}
		link = link.nextSub!;
	} while (link !== undefined);
}
```

可以发现在 `checkDirty` 向上递归的过程中就会触发 `shallowPropagate` ，具体地说，在“递”和“归”的时候都可能会触发 `shallowPropagate`，也就是说在 `pull` 阶段的同时也可能会发生浅层 `push`。所以说 Alien Signals 严格说可以叫 `push-pull-push Model` 。

*代码可能看的比较抽象，下面我们会画图来帮助更好地理解。*

### Reactively 图着色算法

[Reactively](https://github.com/milomg/reactively) 是前面 Benchmark 测试榜上终于被挤下榜首的“探花郎”。上一篇文章我们有提到它采用[图着色算法](https://milomg.dev/2022-12-01/reactivity)来解决相等性问题，这里刚好可以展开探索，因为它和 Alien Signals 其实有异曲同工之妙，都实现了类似的 push-pull 机制。

前面两个函数递归形式实现的伪代码，其实已经非常接近 Reactively 的源码实现了。除了递归实现的差异，还有一大区别是 Reactively 内部还是基于数组而不是双向链表结构。

图着色算法原理如下图所示，这里也是想借此图帮大家更好地理解 Alien Signals 的实现原理。

<figure>
	<img src="/vue-reactivity-3.6-alien-signals/reactivity-graph-coloring.png" alt="Reactively 图着色原理演示图" />
	<figcaption>Reactively 图着色原理演示图</figcaption>
</figure>

- `push` 阶段：如果源信号 `A` 变更，直接将子节点 `B`、`C` 染成“红色”（表示需要重新计算），然后递归向下将深层的后代节点染成“绿色”（表示可能需要重新计算）。*备注：严格说只有后代节点之前是无色才会染为绿色，因为本身绿色也不用染，红色更不用染了。*
- `pull` 阶段（混合浅层 `push`）：读取 `computed` 时，比如图中的节点 `F`，如果当前节点“无色”，那就直接换回缓存值。如果“红色”就重新计算。如果是“绿色”就向上递归，直到遇到“红色”节点 `B`，则更新 `B`，更新后染成“无色”，然后开始回溯向下，如果结果变化则浅层 `push` 将子节点 `D` 也染成“红色”，然后继续回溯回到 `F`。最后再根据 `F` 的染色（只会是红色 or 无色）判断是否需要重新计算。

备注：上面演示图中最右侧 `F` 染成红色后表示需要重新计算，然后计算过程中在读取 `E` 时候，会再次触发节点 `E` 的 `pull` 阶段，重复上述逻辑。

图着色只是一种优雅的解释理论，实际源码实现也是通过枚举的标记位来实现”着色“的。

```ts
export const CacheClean = 0; // 不需要重新计算，对应“无色”
export const CacheCheck = 1; // 可能需要重新计算，对应“绿色”
export const CacheDirty = 2; // 需要重新计算，对应“红色”
```

### 相等性问题

在上一篇我们介绍过 Vue 3.4 开始解决了“相等性”问题的历史包袱，在 Alien Signals 中解决自然也是顺手的事儿。上面我们介绍的 `updateComputed` 方法内部针对重计算的结果进行了相等性检查，如果结果没有变化，就不会触发进一步的 `shallowPropagate`，下游的订阅者们自然就不再受影响了。

如下示例中，`A` 变更后 `B` 会重新计算但结果不变，`C` 不会触发重计算。

```ts
import { computed, signal } from 'alien-signals'

const A = signal(1);
const B = computed(() => A() * 0); // always 0
const C = computed(() => B() + 1); // no re-computed

console.log(A(), B(), C())
A(2);
console.log(A(), B(), C())
```

### 设计特点

#### 核心算法与 API 解耦

Alien Signals 将 `propagate` 等核心算法封装在 `system.ts`，而对外的 `Signal`、`Computed` 等 API 设计则在 `index.ts` 。这样做是因为 Alien Signals 只关心核心算法实现，不关注表层 API 设计，用户可以基于核心算法自行封装需要的表层 API，`index.ts` 其实也只是一个参考性的 API 设计，而且出于对开发体验的考虑，也是默认设计的函数式 API。对此，作者还专门实现了一版兼容 TC39 polyfill 标准的 [API 设计](https://github.com/proposal-signals/signal-polyfill/pull/44)。这一个设计一大优点就是可以成本较低的移植到 Vue 3.6 等等其他框架中，不破坏框架面向用户层面的 API 设计。

#### 性能至上

Alien SIgnals 源码其实相对可读性没那么高，比如 `propagate`、`checkDirty` 核心方法内部都是自行模拟了一套 Stack Mechanism 递归调用栈，还有 if 条件里的位运算设计和赋值比较合并操作，甚至内部变量和属性也都是尽可能“节约”地使用，可以说是基于“性能”编程，甚至有点“变态”。_~~我都怀疑作者是对着火焰图掐着表优化的 :P。~~_

## Vue 3.6 响应式重构

Vue 3.6 （[minor](https://github.com/vuejs/core/tree/minor) 分支）并没有直接 import npm 包，而是直接将核心实现移植过去进行了适配，核心文件在：[*https://github.com/vuejs/core/blob/minor/packages/reactivity/src/system.ts*](https://github.com/vuejs/core/blob/minor/packages/reactivity/src/system.ts)。

前面我们也介绍过，Alien Signals 内部的核心实现和 API 设计是解耦的，所以移植到 Vue 3.6 中后可以继续保持 Vue 的 `ref`、`computed`、`effect` 等等外层 API 设计，移植成本也相对较低。

## 结语 —— 终局之战？

横向来看，从 Preact Signals 的双向链表和版本计数，到 Reactively 的图着色算法，再到 Alien SIgnals 的 push-pull 传播哲学。华山论剑，谁能问鼎中原？

纵向来看，从 Vue 3.4 的传播算法探索，到 Vue 3.5 的 Preact Signals 重构，再到 Vue 3.6 的 Alien Signals 重构，可谓一版一重构。登顶榜首，已成终局之战？      

高处不胜寒，在 Signals 潮流之下，终局之战或许为时尚早。而且其实大家也是各取所长，每一次创新和探索也会化为巨人的肩膀，让后来者站的更高。

最后，借用丘吉尔在二战转折点的一句名言：*这不是结束，甚至不是结束的开始，但或许是开始的结束。*

## 参考

- [*https://en.wikipedia.org/wiki/Reactive_programming*](https://en.wikipedia.org/wiki/Reactive_programming)
- [*https://github.com/stackblitz/alien-signals/issues/17*](https://github.com/stackblitz/alien-signals/issues/17)
- [*https://milomg.dev/2022-12-01/reactivity/*](https://milomg.dev/2022-12-01/reactivity/)