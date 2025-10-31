---
title: Solid 初探：启发 Vue Vapor 的极致框架
date: 2025-10
lang: zh
duration: 15 min
description: 响应式 + 无虚拟 DOM = 未来？
tag: Solid
place: 北京
outline: [2,4]
---

# Solid 初探：启发 Vue Vapor 的极致框架

<br/>

> **✨ AI 摘要**
>
> TODO

## 前言

坦白讲，再准备写这篇文章之前，我其实完全没看过一点 Solid 源码，也完全没有过使用经验。学习的契机其实是源于 Vue 3.6 即将引入的 Vue Vapor 无虚拟 DOM 设计 ———— 正是受 Solid 启发。

> Vue 3.6 另一大更新亮点 —— 基于 Alien Signals 的响应式性能重构 —— 可以移步[《Vue Signals 进化论（v3.6）：Alien Signals 终局之战？》](https://soonwang.me/blog/vue-reactivity-3.6-alien-signals)。

## 初见 Solid

让我们先看一个基础的示例，展示了 Solid 如何实现响应式计数器组件。

**示例代码**

```jsx
import { render } from "solid-js/web"
import { createSignal } from "solid-js"

function Counter() {
  const [count, setCount] = createSignal(1)
  const increment = () => setCount((count) => count + 1)

  return (
    <button type="button" onClick={increment}>
      {count()}
    </button>
  )
}

render(() => <Counter />, document.getElementById("app"))
```

**编译输出**

```js
import { template as _$template } from "solid-js/web";
import { delegateEvents as _$delegateEvents } from "solid-js/web";
import { createComponent as _$createComponent } from "solid-js/web";
import { insert as _$insert } from "solid-js/web";
import { createSignal } from "solid-js";
import { render } from "solid-js/web";

var _tmpl$ = /*#__PURE__*/_$template(`<button type=button>`);

function Counter() {
  const [count, setCount] = createSignal(1);
  const increment = () => setCount(count => count + 1);
  return (() => {
    var _el$ = _tmpl$();
    _el$.$$click = increment;
    _$insert(_el$, count);
    return _el$;
  })();
}
render(() => _$createComponent(Counter, {}), document.getElementById("app"));
_$delegateEvents(["click"]);
```

**渲染效果**

<script setup>
import { ref } from 'vue'
const count = ref(1)
</script>
<div class="demo">
  <button @click="count++">
    {{ count }}
  </button>
</div>

[在 Solid 演练场中尝试一下](https://playground.solidjs.com/anonymous/fc0f522c-7a33-4f80-8c3e-d3f757bb3f2f)

上面的示例展示了 Solid 的两个核心功能：

- **细粒度响应**：状态变化时，Solid 不会重新执行 `Counter` 函数，而是直接更新依赖 `count` 的 DOM 节点。

- **无虚拟 DOM**：Solid 没有类似 React/Vue 中的虚拟 DOM 机制，而是通过「编译时转换模板」+「运行时响应式绑定」，直接将状态变化映射到真实 DOM。

## 框架设计哲学

- **React** 设计哲学是「不可变数据」+「声明式 UI」。状态更新后，重新执行组件渲染函数来生成新的虚拟 DOM 树，最后通过虚拟 DOM Diff 更新真实 DOM —— 这一过程也称为协调（Reconciliation）。为了兼顾渲染性能与一致性，React 还引入了 Fiber 架构，实现了可中断的“协调”过程。

- **Vue（\<3.6）** 设计哲学是「响应式系统」+「声明式模板」。编译阶段将模板编译成 render 函数（组件层级 effect 包装）。运行时状态更新后，通过响应式自动追踪依赖，仅重新执行受影响的组件 render 函数，生成新的虚拟 VNode，最后通过虚拟 DOM Diff 更新真实 DOM。相比 React，Vue 实现了更精确地“按需”更新，DOM Diff 范围和复杂度也小很多，而且还引入了静态提升等编译时优化手段。这也是为什么同样都是虚拟 DOM，但 Vue 不需要 React Fiber 架构。

- **Solid** 设计哲学是「细粒度响应式」+「无虚拟 DOM」。在编译阶段就建立了更精确的依赖/信号与视图节点之间的依赖关系（DOM 层级 effect 包装）。运行时状态更新后，Solid 不会重新执行整个组件函数，也不会（重新）生成虚拟 DOM 树，而是通过响应式直接更新真实 DOM。相比 Vue 组件层级响应式，Solid 精确到最细粒度的 DOM 层级，实现更极致的性能。

## 编译时转换模板

下图是 Solid 编译前后的代码 Diff 可视化：

<figure>
	<img src="/solid/solid-sourcemap-visual.png" alt="Solid 组件编译前后代码 Diff 可视化" />
	<figcaption>Solid 组件编译前后代码 Diff 可视化</figcaption>
</figure>
```

### 静态模板提取与复用

```jsx
// [!code ++] [!code focus]
import { template } from "solid-js/web";

// [!code ++] [!code focus]
var _tmpl$ = /*#__PURE__*/template(`<button type=button>`);
function Counter() {
  const [count, setCount] = createSignal(1);
  const increment = () => setCount(count => count + 1);
  // [!code --]
  return (
    // [!code --] [!code focus]
    <button type="button" onClick={increment}>
      // [!code --]
      {count()}
    // [!code --] [!code focus]
    </button>
  // [!code --]
  )
  // [!code ++]
  return (() => {
    // [!code ++] [!code focus]
    var _el$ = _tmpl$();
    // [!code ++]
    _el$.$$click = increment;
    // [!code ++]
    insert(_el$, count);
    // [!code ++] [!code focus]
    return _el$;
  // [!code ++]
  })();
}
```

#### template() 函数

template 函数源码简化如下：

```js
function template(html) {
  let node;
  const create = () => {
    const t = document.createElement("template");
    t.innerHTML = html;
    return t.content.firstChild;
  };
  const fn = () => (node || (node = create())).cloneNode(true);
  fn.cloneNode = fn;
  return fn;
}
```

**懒加载 + 单例模式**

- 首次调用：执行 `create()` 创建模板。
- 后续调用：直接使用缓存的 `node`，通过 `cloneNode(true)` 克隆。

**首次：高效解析 HTML**

- `<template>` 是浏览器原生的惰性容器，解析 HTML 但不渲染，比 `innerHTML` 直接插入 DOM 更高效。

**后续：高效克隆复用模板**

- 多次渲染某个组件实例时，通过浏览器原生 API `cloneNode(true)` 深度克隆，比重新创建或者重新解析 HTML 性能更快。

#### 返回真实 DOM

```jsx {4,11}
// React（Virtual DOM）
function Counter() {
  // 每次重新创建 VDOM → diff → 更新真实 DOM
  return React.createElement('button', { type: 'button' }, ...);
}

// Solid（Non-Virtual DOM）
var _tmpl$ = template(`<button type=button>`);
function Counter() {
  // 直接克隆真实 DOM，无中间层，无 diff
  return _el$ = _tmpl$();
}
```

### 事件处理

```jsx
// [!code ++] [!code focus]
import { delegateEvents } from "solid-js/web";

function Counter() {
  const [count, setCount] = createSignal(1);
  const increment = () => setCount(count => count + 1);
  // [!code --]
  return (
    // [!code --] [!code focus]
    <button type="button" onClick={increment}>
      // [!code --]
      {count()}
    // [!code --]
    </button>
  // [!code --]
  )
  // [!code ++]
  return (() => {
    // [!code ++]
    var _el$ = _tmpl$();
    // [!code ++] [!code focus]
    _el$.$$click = increment;
    // [!code ++]
    insert(_el$, count);
    // [!code ++]
    return _el$;
  // [!code ++]
  })();
}

// [!code ++] [!code focus]
delegateEvents(["click"]);
```

- 编译前：JSX 风格的事件绑定 `onClick={increment}`。
- 编译后：直接通过属性赋值 `_el$.$$click = increment`。
- 配合: 插入 `delegateEvents(["click"])` 实现事件委托。
- 优势: 避免每个元素单独绑定事件，减少内存占用。

#### 全局事件委托

编译后顶层多了一行 `delegateEvents(["click"])`。我们先看看 `delegateEvents` 函数源码：

```js {7}
function delegateEvents(eventNames, document = window.document) {
  const e = document[$$EVENTS] || (document[$$EVENTS] = new Set());
  for (let i = 0, l = eventNames.length; i < l; i++) {
    const name = eventNames[i];
    if (!e.has(name)) {
      e.add(name);
      document.addEventListener(name, eventHandler);
    }
  }
}
```

可见，`delegateEvents(eventNames)` 会在 `document` 层级为每个 `eventNames` 中的事件类型调用 `addEventListener`，这样全局只会注册**一个**统一的事件处理器 `eventHandler`。相比为每个元素单独绑定事件处理器，大幅减少了监听器数量和内存开销。。

`eventHandler` 函数源码简化如下。

```js {3,6,8,11}
function eventHandler(e) {
  let node = e.target;
  const key = `$$${e.type}`;
  // 重写事件对象的 e.currentTarget 属性，指向当前处理事件的节点
  Object.defineProperty(e, "currentTarget", { get() { return node || document; }, configurable: true });
  while (node) {
    // 绑定事件处理器的属性
    const handler = node[key];
    if (handler && !node.disabled) {
      // 绑定事件处理器自定义参数的属性
      const data = node[`${key}Data`];
      data !== undefined ? handler.call(node, data, e) : handler.call(node, e);
      if (e.cancelBubble) return; // stopPropagation 效果
    }
    // 向上遍历
    node = node._$host || node.parentNode || node.host;
  }
}
```

核心思想：通过事件冒泡机制，从事件目标节点开始，沿着 DOM 树向上遍历查找绑定了对应事件处理器属性（例如 `.$$click`）的节点并执行。

#### 事件处理器绑定

事件处理器会直接绑定到 DOM 属性上，这样在前面的 `eventHandler` 中就能通过 `node[key]` 访问到。

```js
_el$.$$click = increment;
// 如果有自定义参数，会绑定到 `.$$clickData` 属性
_el$.$$clickData = data;
```

通过「事件处理器绑定」+「全局事件委托」，Solid 实现了高效的事件处理机制，减少运行时监听器和开销。

### 响应式内容插入

```jsx
// [!code ++] [!code focus]
import { insert } from "solid-js/web";

function Counter() {
  const [count, setCount] = createSignal(1);
  const increment = () => setCount(count => count + 1);
  // [!code --]
  return (
    // [!code --]
    <button type="button" onClick={increment}>
      // [!code --] [!code focus]
      {count()}
    // [!code --]
    </button>
  // [!code --]
  )
  // [!code ++]
  return (() => {
    // [!code ++]
    var _el$ = _tmpl$();
    // [!code ++]
    _el$.$$click = increment;
    // [!code ++] [!code focus]
    insert(_el$, count);
    // [!code ++]
    return _el$;
  // [!code ++]
  })();
}
```

#### insert() 函数

如上所示新增了 `insert` 方法，并且传入的 `count` 是通过 `createSignal(1)` 创建的 `signal`（getter 函数），而不是调用结果。

```js
import { createSignal } from "solid-js";

const [count, setCount] = createSignal(1);
//       ^ getter  ^ setter

console.log(count()); // prints "1"

setCount(0); // changes count to 0

console.log(count()); // prints "0"
```

`insert` 方法实现如下，内部会为这个 `signal`（`accessor`）创建一个响应式的 `effect`，自动追踪依赖并更新。

```js {7-10}
function insert(parent, accessor, marker, initial) {
  if (marker !== undefined && !initial) initial = [];
  if (typeof accessor !== "function") {
    return insertExpression(parent, accessor, initial, marker);
  }
  // 关键：为函数类型的 accessor 创建响应式 effect
  createRenderEffect(
    current => insertExpression(parent, accessor(), current, marker), 
    initial
  );
}
```

## 细粒度响应式 Fine-Grained Reactivity

关于 `signal` 和 `effect` 具体实现原理，其实和 Vue 等其他框架都差不多。感兴趣可直接查看源码或者之前 [Signal 博客](https://soonwang.me/blog/vue-reactivity-3.6-alien-signals)，这里不展开赘述。

我这里真正想说的是，在我看来 Solid 真正“独领风骚”的地方并不在于它引入了响应式，因为 Vue、Preact、Svelte 等等也都有，而且 Solid 响应式性能也并不算特别出众。真正出色的其实是“细粒度响应式”中前半部分的“**细粒度**”。

响应式固然重要，但只有结合无虚拟 DOM 的设计和模板编译转换，才能够实现 DOM 级别的细粒度更新。在我看来前者是更偏技术实现，而后者更多是框架层面的设计哲学，画龙点睛。响应式屡见不鲜，但二者结合才是 Solid 的独特之处。

## Vue 3.6+

## 结语

## 参考

- [*Thinking Granular: How is SolidJS so Performant?*](https://dev.to/ryansolid/thinking-granular-how-is-solidjs-so-performant-4g37)