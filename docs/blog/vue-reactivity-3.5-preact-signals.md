---
title: Vue Signals 进化论（v3.5）：Preact 重构启示录
date: 2025-3-7
lang: zh
duration: 15 min
description: Vue 3.5 响应式重构的背后是 Preact Signals 带来的基因突变
tag: Vue, Signals
place: 北京
---

# Vue Signals 进化论（v3.5）：Preact 重构启示录

<br/>

> **✨ AI 摘要**
> 
> Vue 3.5 的响应式系统通过借鉴 Preact Signals 的双向链表结构与版本计数机制实现突破性重构。新架构以 Link 节点为桥梁，解耦订阅者（Sub）与依赖项（Dep），通过双向链表实现高效依赖收集与触发，内存占用减少 56%。版本计数机制优化计算属性（computed）的惰性计算与缓存策略，仅在依赖变更时重新计算。此次重构还引入惰性订阅特性，计算属性仅在首次被引用时建立依赖关系，减少冗余性能消耗。Vue 3.5 的革新不仅延续了 Preact 的“信号哲学”，更为未来 Alien Signals 的深度优化奠定基础。

## 序言

Signals 主题浩瀚，非鄙人可书。我将以 Vue 的响应式演进为轴心，探索前端 Signals 发展潮流。旨在学习探索 Signals 技术和 Vue 响应式原理。

## Signals 概念

Signals（信号）可谓是当下前端框架和响应式编程界的“潮流”，主要应用和流行于响应式状态管理框架中，比如代表性的 [Preact](https://preactjs.com/), [Qwik](https://qwik.dev/), [Solid](https://www.solidjs.com/)，甚至老牌的 [Angular](https://angular.dev/guide/signals) 也在新版本支持了 Signals。另外像 [Vue](https://vuejs.org/)、[MobX](https://mobx.js.org/) 虽然没有直接命名 Signals，但其内部的响应式设计哲学也是和 Signals 概念一脉相承。

考虑到不同框架中关于信号实现各有不同，TC39 提出了关于框架无关的 Signals 标准化实现的提案，目前已经进入 Stage1 阶段，或许在未来我们能在不同前端框架中看见基于统一 Signals 标准的响应式实现。更多提案细节以及历史背景请移步 [tc39/proposal-signals](https://github.com/tc39/proposal-signals)。

关于 Signals（信号）这一抽象概念的解释，个人认为 Preact 官方文档中的定义特别合适（如下图所示）：“[*Signals are reactive primitives for managing application state.*](https://preactjs.com/guide/v10/signals)”。官网翻译是，信号是用于管理应用程序状态的响应原始概念。个人更倾向将 “primitives” 一词翻译为”原语“，即响应式中的基础组件、最小单元。

<figure>
	<img src="/vue-reactivity-3.5-preact-signals/preact-signals-introduce.png" alt="Preact 官方文档 Signals 介绍" />
	<figcaption>Preact 官方文档 Signals 介绍</figcaption>
</figure>

## 框架对比 Benchmark

下图是当前各个信号框架的 [性能对比示意图](https://github.com/transitive-bullshit/js-reactivity-benchmark)，不看图都不知道原来这么多 Signals 框架，可谓百家争鸣。

<figure>
	<img src="/vue-reactivity-3.5-preact-signals/benchmark.png" alt="前端 Signals 框架性能对比" />
	<figcaption>前端 Signals 框架性能对比</figcaption>
</figure>

## 1. Preact Signals

本文动机其实就是缘于 [Preact signals](https://github.com/preactjs/signals)，理由如下：

- 性能优异，文档详实。
- Preact 封装了框架无关的 signals 基础库 [@preact/signals-core](https://github.com/preactjs/signals/blob/main/packages/core/src/index.ts)，源代码简洁优雅高聚合，和 Vue 源码的复杂脉络相比，对读者也更加友好。
- 它的“版本计数”和“双向链表结构”的设计直接启发了 [Vue3.5 响应式重构](https://github.com/vuejs/core/pull/10397)，看完它再去看 Vue3.5 自然一点就通。

另外，如果你去看 Preact [官方博客](https://preactjs.com/blog/signal-boosting)，会发现有两个高频词汇 dependency  和 dependent ，二者看着相似其实相反：

- `Dependent` ：指的是依赖某个（些）信号的 `computed/effect` ，相当于 Vue 里所说的 `Subs`（订阅者）。
- `Dependency` ：指的是被当前 `computed/effect` 依赖的各个 `signal`，相当于 Vue 里所说的 `Deps`（依赖项）。

### API 用法

Preact 信号 API 用法如下：

```ts twoslash
import { signal, computed, effect } from "@preact/signals-core";

const count = signal(1);
const double = computed(() => count.value * 2);
const quadruple = computed(() => double.value * 2);

// Console: quadruple = 4
effect(() => {
  console.log("quadruple =", quadruple.value);
});

// Console: quadruple = 80
count.value = 20;
```

这里 `signal` 用法和 Vue 里的 [`ref`](https://vuejs.org/api/reactivity-core.html#ref) 特别相似，其实严格来说和 [`shallowRef`](https://vuejs.org/api/reactivity-advanced.html#shallowref) 更为贴近，因为同样都是只有对 `.value` 的访问是响应式的，如果 value 是个对象并不会深层递归地转为响应式对象。

```ts
import { shallowRef } from 'vue'

const signal = (initialValue) => shallowRef(initialValue)
```

其他框架信号 API 和 Vue 的差异和关联可以参考 [Vue 官方文档](https://cn.vuejs.org/guide/extras/reactivity-in-depth.html#connection-to-signals)。无论是不同框架的 `signal` 还是 Vue 的 `ref`，API 风格其实是主观的，本质上都是相同的响应式基础。

### 设计原则

Preact Signals 遵循以下设计原则：

1. **依赖跟踪（`Automatic Dependency Tracking`）**：自动跟踪使用的信号（普通或 `computed` 信号），即使依赖关系可能会动态更改。不像 React hooks 那样手动指定依赖数组。
2. **缓存（`Memoization/Caching`）**：`computed` 信号只会在它的依赖项可能已经改变时才重新计算。
3. **惰性/延迟执行（`Laziness`）：**`computed` 信号只会按需计算。如果没有使用这个 `computed` 信号，那么永远不会执行，避免性能浪费。
4. **主动性/立即执行（`Eagerness`）**：当 `effect` 的依赖链中的某些内容发生变化时，它应该尽快运行。

这几条设计原则几乎适用于所有信号框架，犹如阿西莫夫的 [机器人三定律](https://en.wikipedia.org/wiki/Three_Laws_of_Robotics)，是构建响应式系统的“道”。

### 双向链表（doubly-linked list）

在 Vue3.5 之前，`Sub`（订阅者） 和 `Dep`（依赖项） 关系是多对多的网状关系，并且两者是直接关联的。而在 Preact Signals 源码中使用了双向链表结构来处理 `signal`（依赖项）和 `computed/effect`（订阅者）之间的联系。依赖和订阅者之间不再直接关联，而是通过中间节点来关联，相当于针对“发布-订阅”模式的一种“中介化”变体升级。

单从源码来理解这个双向链表其实比较抽象，受一篇 [Vue3.5 公众号文章](https://mp.weixin.qq.com/s/_KQyb9cQv-r-tR2gTT0ZCQ) 中“坐标系”启发，我绘制了如下的 Preact Signals 双向链表的原理图。

- 横向来看，即从 `computed/effect` （订阅者）纬度，它指向的双向链表维护着它的**依赖项链表**，每个节点的 `_source` 属性都指向它依赖的一个 `signal`（依赖项），遇到新的依赖项就会在链表队尾新增一个 `node` 节点，然后修改 `computed/effect` 的 `_sources` 属性指向队尾。
- 纵向来看，即从 `signal` （依赖项）纬度，它指向的双向链表维护着依赖它的**订阅者链表**，每个节点的 `_target` 属性都指向一个依赖它的 `computed/effect` （订阅者），遇到新的订阅者就会在链表队尾新增一个 `node` 节点，然后修改 `signal` 的 `_target` 属性指向队尾。
- 一个订阅者和一个依赖项之间存在唯一且固定的一个节点来维系，当一个订阅者遇到一个新的依赖项，比如下图中的 `computed2` 读取到新的依赖 `signal2`：
    - 先进行依赖收集，此阶段会在横向的依赖项链表队尾新增一个节点 `node4`，然后修改订阅者 `computed2` 的 `_sources` 属性指向新的队尾 `node4`。
    - 随后，`node4._source` 指向的 `signal2` 开始更新订阅链表，将 `node4` 添加到纵向链表的队首，修改 `signal2` 的 `_targets` 属性指向新的队首 `node4` 。

<figure>
	<img src="/vue-reactivity-3.5-preact-signals/preact-signals-doubly-linked-list.png" alt="Preact Signals 双向链表结构示意图" />
	<figcaption>Preact Signals 双向链表结构示意图</figcaption>
</figure>

下面是读取信号时进行依赖收集的源码，我们可以配合上图理解，窥一斑而知全豹。

```ts
function addDependency(signal: Signal): Node | undefined {
	if (evalContext === undefined) {
		return undefined;
	}

	let node = signal._node;
	if (node === undefined || node._target !== evalContext) {
		// 新增依赖项，创建新的 node 节点
		node = {
			_version: 0,
			_source: signal,
			_prevSource: evalContext._sources,
			_nextSource: undefined,
			_target: evalContext,
			_prevTarget: undefined,
			_nextTarget: undefined,
			_rollbackNode: node,
		};

		if (evalContext._sources !== undefined) {
			evalContext._sources._nextSource = node;
		}
		evalContext._sources = node;
		signal._node = node;

		if (evalContext._flags & TRACKING) {
			// 更新依赖该 signal 的订阅者链表
			signal._subscribe(node);
		}
		return node;
	} else if (node._version === -1) {
		// 同一个订阅者重复收集同一个依赖时，无需重新创建新的 node 节点，只需修改链表内部节点顺序
		// ..
	}
	return undefined;
}
```

双向链表带来的优点如下：

1. **时间复杂度更低（数据结构优化）**
    - 任意位置插入/移除节点时只需 `O(1)`，对比传统数组依赖管理（`push/splice` 需要 `O(n)` 操作），在频繁的依赖变更场景中性能更优。
2. **内存效率更高（节点引用持久化）**
    - 每一对订阅者/依赖项之间会建立一个固定的 `Node` 节点，依赖关系稳定则节点稳定，高频更新也不会销毁重建而是一直复用。传统的发布-订阅模式可能会频繁创建/销毁 `Watcher` 对象，导致 GC 压力增大。
3. **精准依赖追踪**
    - 每个 `Signal` 信号维护自己的订阅者链表，更新时直接遍历链表通知订阅者，避免了传统响应式系统中"依赖收集-触发更新"的完整树遍历过程。

### 版本计数

这里的“版本”指的是源码实现中引入了一些称之为 `version`（版本）的数字类型变量：

- `globalVersion`：全局维护的一个版本号
- `Signal._globalVersion`：每个信号实例内部维护的一个全局版本号，主要用于和全局版本号进行同步/对比
- `Signal._version`：每个信号实例内部维护的一个内部版本号，主要用于和自身历史版本对比
- `Node._version`：每个中间节点实例内部维护的一个内部版本号，主要用于和自身历史版本对比

“版本计数”设计的最大获益者当属 `computed`，借此实现高效的惰性缓存（Lazy & Cached）特性，大大提升性能。

### Computed 缓存之道

最简单暴力的惰性求值方法就是每次读取 `computed` 就重新计算一次，但这样十分低效，我们需要一个高效的缓存机制。

每次读取 `computed` 就会执行如下代码中的 `this._refresh()` 方法：

```ts {5}
Object.defineProperty(Computed.prototype, "value", {
	get(this: Computed) {
		// ..
		const node = addDependency(this);
		this._refresh();
		// ..
		return this._value;
	},
});
```

缓存逻辑主要集中在这个方法里面，缓存手段可以总结为如下四招：

1. 如果自上次运行以来，没有任何信号的值发生改变，直接返回缓存。
    - 这是通过比较“全局版本号”来实现的，如果 `globalVersion` 没变化，说明没有任何信号改变，不需要重新计算，直接返回即可，
    
    ```ts {3}
    Computed.prototype._refresh = function () {
    	// ..
    	if (this._globalVersion === globalVersion) {
    		return true;
    	}
    	// ..
    }
    ```
    
2. 当前 `computed` 依赖的信号没有变化，则直接返回缓存。
    - 代码使用 `flag` 标志位来表示当前状态，如果当前 `computed` 处于跟踪中 `TRACKING`，但没有过期 `OUTDATED`，说明 `computed` 自身依赖的那些信号都没有改变，所以不需要重新计算，直接返回即可。
    
    ```ts {3}
    Computed.prototype._refresh = function () {
    	// ..
    	if ((this._flags & (OUTDATED | TRACKING)) === TRACKING) {
    		return true;
    	}
    	// ..
    }
    ```
    
3. 按依赖顺序遍历检查他们的版本号。只要有一个依赖的版本号改变就需要重新计算 `computed`。如果版本号都没变化，即使依赖顺序改变，也会直接退出并返回缓存的值。
    
    ```ts {4}
    Computed.prototype._refresh = function () {
    	// ..
    	this._flags |= RUNNING;
    	if (this._version > 0 && !needsToRecompute(this)) {
    		this._flags &= ~RUNNING;
    		return true;
    	}
    	// ..
    }
    
    function needsToRecompute(target: Computed | Effect): boolean {
    	// _sources 表示当前 computed/effect 依赖的信号 signal 头指针
    	// 遍历当前依赖的全部信号
    	for (
    		let node = target._sources;
    		node !== undefined;
    		node = node._nextSource
    	) {
    		if (
    			// 1. 版本号变化：比较信号的当前版本号 (node._source._version) 
    			//    与目标对象记录的版本号 (node._version)。如果不相等，表示信号的值已经变化。
    			node._source._version !== node._version ||
    			// 2. 刷新失败：调用信号的 _refresh() 方法。
    			//    如果刷新失败（返回 false），可能是因为依赖循环或其他阻碍刷新的问题。
    			!node._source._refresh() ||
    			// 3. 刷新之后再次检查版本号：确保在刷新后没有新的变化。
    			node._source._version !== node._version
    		) {
    			return true;
    		}
    	}
    	return false;
    }
    ```
    
4. 前面的缓存条件如果都没命中，那就得重新计算了。当然还留了最后一手，只有当重新计算后的值与之前缓存的值不同时，才会更新缓存返回新值，并且增加计算信号的版本号。
    
    ```ts
    Computed.prototype._refresh = function () {
    	// ..
    	try {
    		// ..
    		const value = this._fn();
    		if (
    			this._flags & HAS_ERROR ||
    			this._value !== value ||
    			this._version === 0
    		) {
    			this._value = value;
    			this._flags &= ~HAS_ERROR;
    			this._version++;
    		}
    	} catch (err) {
    		this._value = err;
    		this._flags |= HAS_ERROR;
    		this._version++;
    	}
    	// ..
    }
    ```
    

### Computed 惰性订阅之道

1. **惰性订阅**
    
    `computed` 订阅方法实现如下：
    
    ```ts
    // 作为 computed signal 被订阅时执行
    Computed.prototype._subscribe = function (node) {
    	// this._targets 为 undefined 说明之前没有被订阅过，所以本次是首次被订阅
    	if (this._targets === undefined) {
    		this._flags |= OUTDATED | TRACKING;
    
    		// 首次被订阅时，遍历并订阅自身的所有依赖项（this._sources）
    		for (
    			let node = this._sources;
    			node !== undefined;
    			node = node._nextSource
    		) {
    			node._source._subscribe(node);
    		}
    	}
    	Signal.prototype._subscribe.call(this, node);
    };
    ```
    
    - 按需订阅：`computed` 仅在自身作为 `signal` 依赖项被其他订阅者**首次**订阅时（如被 `effect` 或模板引用），才会订阅其自身的所有依赖项。相当于延迟执行，按需订阅，减少不必要的性能开销。
    - 内存节省：未被使用的 `computed`（无订阅者）不会建立依赖关系，减少不必要的引用。
2. **自动取消订阅**
    
    `computed` 取消订阅方法实现如下：
    
    ```ts
    Computed.prototype._unsubscribe = function (node) {
    	// 仅当 computed signal 仍有订阅者时执行取消订阅操作
    	if (this._targets !== undefined) {
    	
    		// 调用父类 Signal 的取消订阅逻辑（移除当前订阅者节点）
    		Signal.prototype._unsubscribe.call(this, node);
    		
    		// 当 computed 信号失去最后一个订阅者（this._targets 变为 undefined），
    		// 遍历所有依赖项（this._sources），解除对它们的订阅
    		if (this._targets === undefined) {
    			this._flags &= ~TRACKING;
    
    			for (
    				let node = this._sources;
    				node !== undefined;
    				node = node._nextSource
    			) {
    				node._source._unsubscribe(node);
    			}
    		}
    	}
    };
    ```
    
    - 按需释放：当 `computed signal` 失去所有订阅者时，自动取消对其依赖项的订阅。
    - 内存回收：解除引用后，若这些依赖项不再被其他代码使用，可以被 JS 引擎自动 GC，避免内存泄漏。

从上面订阅/取消订阅的优化细节来看，整体都实现了按需的思想，按需订阅，按需释放。

## 2. Vue 3.5 响应式重构

Vue 3.5 响应式重构受启发于 Preact Signals（[PR](https://github.com/vuejs/core/pull/10397)）：

- 改为双向链表结构，新增中间节点 link，类似 Preact Signals 中的 Node 节点。
- 增加版本计数
- `computed` 惰性订阅/自动取消订阅

可以说这三个主要优化都吸取了 Preact Signals 的精华，正如前文所说，在 Vue3.5 之前，`Sub`（订阅者） 和 `Dep`（依赖项） 关系是多对多，并且两者是直接关联的。而重构之后依赖和订阅者之间不再直接关联，而是通过中间节点来关联。重构后源码其实和前文分析的 Preact Signals 源码大查不查，这里就不一一列举，感兴趣地同学可以自行探索。

## 3. Vue 的未来：Alien Signals

Vue 3.5 左手双向链表，右手版本计数，看似金身已铸，神功已成。但它并未停止前进，从目前的 [PR](https://github.com/vuejs/core/pull/12349) 来看，在未来的版本将引入 [alien-signals](https://github.com/stackblitz/alien-signals) 来进一步优化响应式系统，难道说还有高手？

欲知后事，且听下回分解～🍵

## 参考

- *Preact Signals 博客-介绍：[https://preactjs.com/blog/introducing-signals](https://preactjs.com/blog/introducing-signals)*
- *Preact Signals 博客-性能提升：[https://preactjs.com/blog/signal-boosting](https://preactjs.com/blog/signal-boosting)*
- *React 中引入 Signals 的畅想探索：[https://www.builder.io/blog/usesignal-is-the-future-of-web-frameworks](https://www.builder.io/blog/usesignal-is-the-future-of-web-frameworks)*
- *Vue3.5响应式重构中的双向链表分析：[https://mp.weixin.qq.com/s/_KQyb9cQv-r-tR2gTT0ZCQ](https://mp.weixin.qq.com/s/_KQyb9cQv-r-tR2gTT0ZCQ)*
- *Vue3.5响应式重构中的版本计数分析：[https://mp.weixin.qq.com/s/5wK7FT0RRnLvj92iu2hQWQ](https://mp.weixin.qq.com/s/5wK7FT0RRnLvj92iu2hQWQ)*