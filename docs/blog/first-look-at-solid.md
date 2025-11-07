---
title: Solid 初探：启发 Vue Vapor 的极致框架
date: 2025-11-6
lang: zh
duration: 13 min
description: 响应式 + 无虚拟 DOM = 未来？
tag: Solid
place: 北京
outline: [2,4]
---

# Solid 初探：启发 Vue Vapor 的极致框架

<br/>

> **✨ AI 摘要**
>
> 本文从示例入手拆解 Solid 的编译期模板转换与运行时信号机制，展示如何以细粒度依赖直达真实 DOM，绕过虚拟 DOM 构造与 Diff。结合 template/insert/全局事件委托等实现，解释其稳定的更新常数与可预测性，并讨论内存与调试取舍。

## 前言

坦白讲，在准备写这篇文章之前，我其实完全没看过一点 Solid 源码，也完全没有过使用经验。学习的契机其实是源于 Vue 3.6 即将引入的 Vue Vapor 无虚拟 DOM 设计 ———— 正是受 Solid 启发。

> Vue 3.6 另一大更新亮点 —— 基于 Alien Signals 的响应式性能重构 —— 可以移步[《Vue Signals 进化论（v3.6）：Alien Signals 终局之战？》](https://soonwang.me/blog/vue-reactivity-3.6-alien-signals)。

## 初见 Solid

让我们先看一个基础的示例，展示了 Solid 如何实现响应式计数器组件。

**示例代码**

`Counter` 组件会渲染一个 button，点击 button 后文本内容会递增。

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

- **React** 设计哲学是「**不可变数据**」+「**声明式 UI**」。状态更新后，重新执行组件渲染函数来生成新的虚拟 DOM 树，最后通过虚拟 DOM Diff 更新真实 DOM —— 这一过程也称为协调（Reconciliation）。为了兼顾渲染性能与一致性，React 后来还引入了 Fiber 架构，实现了可中断的“协调”过程。

- **Vue（\<3.6）** 设计哲学是「**响应式系统**」+「**声明式模板**」。编译阶段将模板编译成 render 函数（组件层级 effect 包装）。运行时状态更新后，通过响应式自动追踪依赖，仅重新执行受影响的组件 render 函数，生成新的虚拟 VNode，最后通过虚拟 DOM Diff 更新真实 DOM。
  
  _相比 React，Vue 实现了更精确地“按需”更新，DOM Diff 范围和复杂度也小很多，而且还引入了静态提升等编译时优化手段。这也是为什么同样都是虚拟 DOM，但 Vue 不需要 React Fiber 架构。_

- **Solid** 设计哲学是「**细粒度响应式**」+「**无虚拟 DOM**」。在编译阶段就建立了更精确的依赖/信号与视图节点之间的依赖关系（DOM 层级 effect 包装）。运行时状态更新后，Solid 不会重新执行整个组件函数，也不会（重新）生成虚拟 DOM 树，而是通过响应式直接更新真实 DOM。

  _相比 Vue 组件层级响应式，Solid 精确到最细粒度的 DOM 层级，实现更极致的性能。_

## 编译时转换模板

下图是 Solid 函数式组件（`Counter`）编译前后的代码 Diff：

<figure>
	<img src="/solid/solid-sourcemap-visual.png" alt="Solid 组件编译前后代码 Diff 可视化" />
	<figcaption>Solid 组件编译前后代码 Diff</figcaption>
</figure>

核心的变化有如下三点。

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

React 组件返回的是虚拟 DOM（`React.createElement`），而且每次状态更新都会重新创建虚拟 DOM，最终通过 VDOM Diff 算法更新真实 DOM。Solid 组件只执行一次，直接返回真实 DOM（`_tmpl$()`），即使多次渲染组件实例也会通过克隆模板复用。

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
- 配合：插入 `delegateEvents(["click"])` 实现事件委托。
- 优势：避免每个元素单独绑定事件，减少内存占用。

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

可见，`delegateEvents(eventNames)` 会在 `document` 层级为每个 `eventNames` 中的事件类型调用 `addEventListener`，这样全局只会注册**一个**统一的事件处理器 `eventHandler`。相比为每个元素单独绑定事件处理器，大幅减少了监听器数量和内存开销。

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

`insert` 方法实现如下，运行时内部会为这个 `signal`（`accessor`）创建一个响应式的 `effect`，自动追踪依赖并更新。

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

## 运行时原理

### Solid Signals

Solid 的 `signal` 和 `effect` 实现原理其实和 Vue 等其他框架差不多，在 API 设计风格以及实现细节上有所差异。比如 Solid 的 `createSignal()` API 设计强调了读/写隔离。信号通过一个只读的 getter 和另一个单独的 setter 暴露，通过函数调用而非 `Proxy` 实现读取拦截。

```js
import { createSignal } from "solid-js"

const [count, setCount] = createSignal(0)

count() // 访问值
setCount(1) // 更新值
```

正如 Vue 官方文档所述，Vue 同样可以复刻类似 API：

```js
import { shallowRef, triggerRef } from 'vue'

export function createSignal(value, options) {
  const r = shallowRef(value)
  const get = () => r.value
  const set = (v) => {
    r.value = typeof v === 'function' ? v(r.value) : v
    if (options?.equals === false) triggerRef(r)
  }
  return [get, set]
}
```

关于更多实现细节，感兴趣可直接看源码或者之前发过的博客，这里不展开赘述。

### 细粒度响应式 Fine-Grained Reactivity

前面我们提到在编译时模板的动态内容 `count()` 会被转换成 `insert(_el$, count)`。在运行时，`insert` 方法会为这个 `signal` 创建一个响应式的 `effect`，自动追踪依赖并更新。

```js
<button type="button">
  {count()}
</button>

// ⬇
insert(_el$, count);

// ⬇
function insert(parent, count) {
  createRenderEffect(current => insertExpression(parent, count(), current))
}
```

当点击 button 后，`count` 的 setter（`setCount`）方法被调用时，Solid 会触发 `effect` 重新执行 `insertExpression`。

#### insertExpression()

`insertExpression` 源码其实比较复杂，需要满足现实可能的各种渲染场景，这里为方便理解，针对 `Counter` 组件渲染场景简化后的代码如下：

```js
function insertExpression(parent, value, current) {
  if (value === current) {
    // 相等性检查
    return current
  }

  const t = typeof value
  if (t === "string" || t === "number") {
    if (t === "number") {
      value = value.toString()
      if (value === current) return current
    }
    if (current !== "" && typeof current === "string") {
      // 点击更新
      current = parent.firstChild.data = value
    } else {
      // 初次渲染
      current = parent.textContent = value
    }
  }
  // ..

  return current
}
```

#### 初次渲染

初次渲染时，`current` 为空，执行 `parent.textContent = value`，button 内创建一个文本节点，内容为 `"1"`。没有重建任何外层 DOM，只是设置节点 `textContent`。并且在 `effect` 内部会将 `current` 更新为字符串 `"1"`。

#### 点击更新

点击 button 后，`setCount` 被调用，`count()` 变为 `2`，触发 `effect` 重新执行 `insertExpression`。此时 `current` 已经是字符串 `"1"`，执行 `parent.firstChild.data = value`，直接将 button 内部文本节点的内容更新为 `"2"`。没有替换节点和 diff，也不需要重新渲染 `Counter` 函数。

## 一点思考

在我看来 Solid 真正“独领风骚”的地方并不在于它引入了响应式，因为 Vue、Preact、Svelte 等等也都有，而且 Solid 响应式性能也并不是最好的那一档。真正出色的其实是“细粒度响应式”中前半部分的“**细粒度**”三字。

响应式固然重要，但只有结合无虚拟 DOM 的设计和模板编译转换，才能够实现 DOM 级别的细粒度更新。前者更偏通用技术的实现，而后者更多是框架层面的设计哲学。这种能站在架构层面的优化设计是更加难能可贵的。

## Vue 3.6+

受 Solid 启发的，Vue 其实很早就开始探索一种类似的编译策略 —— [_Vapor Mode_](https://github.com/vuejs/vue-vapor) —— 不依赖于虚拟 DOM 而是更多地利用 Vue 的内置响应性系统，即将在 Vue 3.6 中落地。引入 Vapor Mode 之后，Vue 并没有完全摒弃虚拟 DOM，而是提供了用户可选的渲染模式，“双引擎”模式也更具灵活性。

目前已经可以在 Vue Playground 中尝试 Vapor 模式（选择 Vue 3.6-alpha 版本），在 script setup 中使用 `vapor` 语法糖开启 Vapor Mode。同样一个简单的计数器组件示例代码如下所示：

```vue {1}
<script setup vapor>
import { ref } from 'vue'

const count = ref(0)
</script>

<template>
  <button @click="count++">
    {{ count }}
  </button>
</template>
```

### VDOM Mode

这段代码如果不加 `vapor` 语法糖，也就是常规的虚拟 DOM 渲染模式，编译输出的代码会是这样的：

```js
function render(_ctx, _cache, $props, $setup, $data, $options) {
  return (
    _openBlock(),
    _createElementBlock(
      "button",
      {
        onClick: _cache[0] || (_cache[0] = ($event) => $setup.count++),
      },
      _toDisplayString($setup.count),
      1 /* TEXT */
    )
  );
}
```

`_createElementBlock` 函数会创建一个 `VNode`（虚拟节点）。

### Vapor Mode

而如果加上 `vapor` 语法糖，编译输出的代码会是这样的：

```js
import {
  txt as _txt,
  toDisplayString as _toDisplayString,
  setText as _setText,
  renderEffect as _renderEffect,
  delegateEvents as _delegateEvents,
  template as _template,
} from "vue";

const t0 = _template("<button> </button>", true);
_delegateEvents("click");

function render(_ctx, $props, $emit, $attrs, $slots) {
  const n0 = t0();
  const x0 = _txt(n0);
  n0.$evtclick = () => _ctx.count++;
  _renderEffect(() => _setText(x0, _toDisplayString(_ctx.count)));
  return n0;
}
```

[在 Vue 演练场中尝试一下](https://play.vuejs.org/#eNp9Uc1OAjEQfpVJL2rAhQTjgSzGn3DQgxr12MSsywAL3bZppyvJZt/daVeQg+HUznw//WbaijtrsyagmIrcl66yBB4pWGgKa9yN1FXNJ0ELDpfQwdKZGs5YcCa11KXRnqA0QRPMIuN8fCF1PuqdWM0FYW1VQcgVQP4ViIyG21JV5XYmRdIOBlIkGKBtf+26LvFHvYDRfHTkJIaCPL++rFbZxhvN8dvIj4a1rRS6F0sVp5NiCgmJWKGU+X5KPXIBh/t+ucZy+09/43exJ8WrQ4+uQSkOGBVuhdTD8/dn3PH9ANZmERSzT4Bv6I0KMWNPuw96wbGPeCntY1p/pVcffr4j1H4/VAwamV3iS8Ff8nBi9L+4k+wq6aTueIufDbroyQucZNfZ+LJQdl1kE9H9AJ82seM=)

Vapor Mode 编译结果和 Solid 十分相似，同样是引入 `template` 函数创建真实 DOM 节点，新增事件委托 `delegateEvents` 方法，并且通过 `renderEffect` 创建细粒度的响应式更新。后面有机会我们再研究 Vue Vapor 源码（~~挖坑~~）。

## 结语

近期有一款全新的前端框架面世 —— [_Ripple_](https://www.ripplejs.com/) —— 主打融合 React + Solid + Svelte，老外评论也纷纷表示“学不动了”（_"Why are we still here? Just to suffer?"_）。从前端框架的宏观趋势来看，响应式基本成为标配，重心慢慢从“运行时”向“编译时”倾斜。

作为前端开发者，我对于前端框架还是喜闻乐见的。但在 AI 时代，React 凭借生态累积几乎成为“事实标准”。未来前端框架又将何去何从呢？我不知道。

## 参考

- [*Thinking Granular: How is SolidJS so Performant?*](https://dev.to/ryansolid/thinking-granular-how-is-solidjs-so-performant-4g37)