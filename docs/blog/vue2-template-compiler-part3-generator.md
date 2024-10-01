---
title: Vue2 模板编译三部曲（三）｜生成器 Generator
date: 2024-9-30
lang: zh
duration: 10 min
description: 源码解析 Vue2 模板编译的生成器部分的实现原理
tag: Vue
place: 北京
---

# Vue2 模板编译三部曲（三）｜生成器 Generator

> **✨ AI 摘要**
> 
> 本文探讨了 Vue2 模板编译中的生成器（`Generator`），详细介绍了它如何将优化后的 `AST`  转换为渲染函数 JS 代码。生成器的核心任务是生成渲染函数，以便根据数据状态更新 `DOM`。本文列举了 `v-if`  和 `v-for`  的例子，展示了生成渲染函数的整体流程和实现细节，包括条件判断和节点转换的具体实现，另外还强调了静态节点的处理与优化。

## 什么是 Generator

前面两章我们探索了模板是如何通过解析器（`Parser`）解析成 `AST` 以及优化器（`Optimizer`）如何寻找标记 `AST` 中的静态节点，本章我们将探索三部曲的最后一曲——生成器（`Generator`）。

生成器的主要任务是将优化后的 `AST` 转换为可执行的 `JS` 代码。这个过程涉及到将抽象语法树的各个节点转换为相应的 `JS` 表达式和语句。生成器的输出通常是一个渲染函数，它能够根据数据状态创建或更新 `DOM` 结构。

举个 🌰，我们现在有这样一段模板：

```html
<div v-if="isShow">
  <li v-for="item in items">{{item}}</li>
</div>

```

编译成 `AST` 后最终经过生成器（`Generator`）生成的渲染函数字符串如下所示：

```js
with(this) {
  return (isShow) ? _c('div', _l((items), function (item) {
    return _c('li', [_v(_s(item))])
  }), 0) : _e()
}
```

这里的 `_c`*、`_*l`、`_v`、`_s`、`_e` 方法是 Vue 运行时的内置方法，比如 `_c` 其实对应的是 `Vue` 内部创建虚拟 `DOM` 的方法 `createElement`，这部分内容属于运行时，所以不在本文赘述。

感兴趣地小伙伴可以在 [template-explorer](https://v2.template-explorer.vuejs.org/#%3Cdiv%20v-if%3D%22isShow%22%3E%0A%20%20%3Cli%20v-for%3D%22item%20in%20items%22%3E%7B%7Bitem%7D%7D%3C%2Fli%3E%0A%3C%2Fdiv%3E%0A) 网站中自由探索 Vue2 模板编译后产生的最终渲染函数，如下图所示（*不用在意标题的 Vue 版本 3.5.10，实际效果还是 Vue2*）：

![网站 template-explorer 演示示例](/vue2-template-compiler-part3-generator/vue2-template-explorer.png)

## 源码解析

> Tip：由于本章源码比较冗杂，包含了很多特判之类的细节处理，不利于我们从整体去梳理脉络，所以源码部分我会尽量简化以清晰其核心流程。
> 

### generate 入口方法

```ts
export function generate(
  ast: ASTElement | void,
  options: CompilerOptions
): CodegenResult {
  // 1. 创建 CodegenState 实例
  const state = new CodegenState(options)

  // 2. 如果 ast 存在，并且 ast 的 tag 是 script，则将 code 设置为 'null'，
  // 否则调用 genElement 生成 code
  // 如果 ast 不存在，则将 code 设置为 '_c("div")'
  const code = ast
    ? ast.tag === 'script'
      ? 'null'
      : genElement(ast, state)
    : '_c("div")'

  // 3. 返回一个对象，包含渲染函数和静态渲染函数数组
  return {
    render: `with(this){return ${code}}`, // 渲染函数
    staticRenderFns: state.staticRenderFns // 静态渲染函数数组
  }
}
```

从入口方法来看，核心是通过 `genElement` 方法将 `AST` 转为 `code` 字符串，最后返回时通过 [with](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Statements/with) 语句包装后作为 `render` 渲染函数字符串。

返回对象还包括 `staticRenderFns`，用于保存静态渲染函数字符串数组的。

这里的 `CodegenState` 实例可以先不用关注，可以理解成它保存了转换过程中会用到的各个信息和状态，是个辅助类。

举个🌰，如下模板：

```html
<div v-if="isShow">
  <li v-for="item in items">{{ item }}</li>
  <div><span>hello</span></div>
</div>
```

`generate` 方法最终的返回对象如下：

```ts
{
  render: "with(this){return (isShow)?_c('div',[_l((items),function(item){return _c('li',[_v(_s(item))])}),_m(0)],2):_e()}",
  staticRenderFns: [ `with(this){return _c('div',[_c('span',[_v("hello")])])}` ]
}
```

### genElement：递归转换节点为渲染函数

为方便理解核心流程，`genElement` 方法简化后代码如下：

```ts
export function genElement(el: ASTElement, state: CodegenState): string {
  if (el.parent) {
    el.pre = el.pre || el.parent.pre
  }
  if (el.staticRoot && !el.staticProcessed) {
    return genStatic(el, state)
  } else if (el.once && !el.onceProcessed) {
    return genOnce(el, state)
  } else if (el.for && !el.forProcessed) {
    return genFor(el, state)
  } else if (el.if && !el.ifProcessed) {
    return genIf(el, state)
  } else if (el.tag === 'template' && !el.slotTarget && !state.pre) {
    return genChildren(el, state) || 'void 0'
  } else if (el.tag === 'slot') {
    return genSlot(el, state)
  } else {
    let code
    let tag = `'${el.tag}'`
    const children = genChildren(el, state, true)
    code = `_c(${tag}${
      data ? `,${data}` : '' // data
    }${
      children ? `,${children}` : '' // children
    })`
    // module transforms
    for (let i = 0; i < state.transforms.length; i++) {
      code = state.transforms[i](el, code)
    }
    return code
  }
}
```

该方法首先进行了很多 `if-else` 判断，比如遇到对应的内置指令（`directive`）后，会进行专门的分支处理。由于指令分支较多，我会在下文通过比较典型的 `v-if` 和 `v-for` 指令为例，一起探索完整的渲染函数生成过程。

判断完之后针对子节点会调用 `genChildren` 方法来生成子节点代码。最后返回根据 `_c(..)` 形式拼接而成的渲染函数字符串。

### v-if 处理

拿前面示例模板中的条件节点为例：

```ts
<div v-if="isShow">
  // ..
</div>
```

这里的 div 节点使用了 v-if 指令，经过 genElement 方法时会执行到如下位置：

```ts
else if (el.if && !el.ifProcessed) {
  return genIf(el, state)
} 
```

此时，`el` 是改节点的 `AST`，如下：

```json
{
  "type": 1,
  "tag": "div",
  "attrsList": [],
  "attrsMap": {
    "v-if": "isShow"
  },
  "rawAttrsMap": {},
  "parent": null,
  "children": [ .. ],
  "if": "isShow",
  "ifConditions": [
    {
      "exp": "isShow",
      "block": [Circular *1]
    }
  ],
  "plain": true,
  "static": false,
  "staticRoot": false
}
```

接下来调用 `genIf` 函数。

### genIf

```ts
export function genIf(
  el: any, // 当前的 AST 元素
  state: CodegenState, // 状态
  altGen?: Function, // 备用生成函数
  altEmpty?: string, // 备用空字符串
): string {
  // 1. 将 el.ifProcessed 设置为 true，递归 genElement 时，不再进入 genIf 函数
  el.ifProcessed = true
  // 2. 生成 v-if 的代码
  return genIfConditions(el.ifConditions.slice(), state, altGen, altEmpty)
}
```

这里修改了递归状态，然后调用 `genIfConditions` 方法生成代码，注意这里传入的参数是 `el.ifConditions.slice()`，`el.ifConditions` 是节点中的条件指令数组，如下所示。而 `slice()` 在这里的作用其实是浅拷贝，避免后续处理影响原来的 `el` 节点属性。

```json
"ifConditions": [
  {
    "exp": "isShow",
    "block": [Circular *1]
  }
]
```

`el.ifConditions` 中的 `exp` 属性表示 `v-if` 使用的变量，`block` 属性则是对当前 `AST` 节点的引用，方便后续使用。接下来继续看 `genIfCondition` 方法。

#### genIfCondition

```ts
function genIfConditions(
  conditions: ASTIfConditions, // 条件数组
  state: CodegenState, // 状态
  altGen?: Function,
  altEmpty?: string,
): string {
  // 1. 如果条件数组为空，返回备用空节点字符串或者默认空节点 _e()
  if (!conditions.length) {
    return altEmpty || '_e()'
  }

  const condition = conditions.shift()!
  // 2. 如果条件不为空，返回三元表达式
  if (condition.exp) {
    return `(${condition.exp})?${genTernaryExp(
      condition.block,
    )}:${genIfConditions(conditions, state, altGen, altEmpty)}`
  }
  else {
    // 3. 如果条件为空，直接返回 genTernaryExp(condition.block)
    return `${genTernaryExp(condition.block)}`
  }

  // 递归调用 genElement 生成节点代码
  function genTernaryExp(el: ASTElement) {
    return altGen
      ? altGen(el, state)
      : el.once
        ? genOnce(el, state)
        : genElement(el, state)
  }
}
```

这里的 `conditions` 是个条件数组，如果同时使用了 v-if、v-else-if、v-else 那么条件数组则依次对应每个条件值，比如：

```ts
<div>
  <p v-if="condition1">条件1为真</p>
  <p v-else-if="condition2">条件2为真</p>
  <p v-else>所有条件都不满足</p>
</div>
```

其中三个 `<p>` 节点其实对应同一个 `AST` 节点，如下：

```json
{
  "type": 1,
  "tag": "p",
  "attrsList": [],
  "attrsMap": {},
  "rawAttrsMap": {},
  "parent": null,
  "children": [],
  "if": "condition1",
  "ifConditions": [
    {
      "exp": "condition1", // v-if="condition1"
      "block": [Circular *1]
    },
    {
      "exp": "condition2", // v-else-if="condition2"
      "block": [Circular *1]
    },
    {
      "exp": null, // v-else
      "block": [Circular *1]
    }
  ],
  "plain": true,
  "static": false,
  "staticRoot": false
}
```

可见，其 `ifConditions` 条件数组有三个数组。
理解完 `ifConditions` 后，再回头看源码中的 `const condition = conditions.shift()!` 和后续条件分支，就可以很清楚地知道：如果 `condition.exp` （条件值）存在，那么会生成一个三元表达式，否则（比如 `v-else`）直接生成一个节点表达式。

最终会返回如下形式的三元表达式：

```ts
return `(isShow)
	?${genTernaryExp(condition.block,)}
	:${genIfConditions(conditions, state, altGen, altEmpty)}`
```

- **真值部分**：调用 `genTernaryExp` 生成节点表达式
- **假值部分**：调用 `genIfConditions` 递归地生成三元表达式，这里的参数 `conditions` 由于经过前面 `conditions.shift()` 出栈后刚好可以递归使用。

最后，我们再看下内部定义的 `genTernaryExp` 方法。

#### genTernaryExp

```ts
function genTernaryExp(el: ASTElement) {
  return altGen
    ? altGen(el, state)
    : el.once
      ? genOnce(el, state)
      : genElement(el, state)
}
```

这里可以忽略一些兜底处理，重要的是最后调用了 `genElement(el, state)`，我们前面是从 `genElement` 方法中的 v-if 分支判断中进来的，怎么最后又回到了 `genElement` 呢？

我们可以将 `genIf`  这种分支处理理解成是在外部搭建了一个三元表达式的**包装结构**，而三元表达式中真假值部分的具体表达式内容还是得靠 `genElement` 产生。

另外，回到 `genElement(el, state)` 后之所以不会再次进入 `genIf` 导致死循环，是因为前面说过的，在 `genIf` 函数中将 `el.ifProcessed` 设置为了 `true`，锁体递归 `genElement` 时，不再进入 `genIf` 函数。

前面示例中的 `<div v-if="isShow"></div>` 最终产生代码的转换过程如下：

```ts
<div v-if="isShow"></div>
// ⬇︎
(condition.exp) ? genElement(el, state) : _e()
// ⬇︎
(isShow) ? _c('div') : _e()
```

### v-for 处理

#### genFor

```ts
export function genFor(
  el: any, // 当前的 AST 元素
  state: CodegenState,
  altGen?: Function,
  altHelper?: string,
): string {
  const exp = el.for
  const alias = el.alias
  const iterator1 = el.iterator1 ? `,${el.iterator1}` : ''
  const iterator2 = el.iterator2 ? `,${el.iterator2}` : ''

  // 将 el.forProcessed 设置为 true，递归 genElement 时，不再进入 genFor 函数
  el.forProcessed = true

  return (
    `${altHelper || '_l'}((${exp}),`
    + `function(${alias}${iterator1}${iterator2}){`
    + `return ${(altGen || genElement)(el, state)}`
    + '})'
  )
}
```

相比 `v-if`，`v-for` 逻辑相对简单的多。结合如下的例子来看这个方法中的逻辑：

```html
<div v-for="(value, name, index) in object"></div>
```

转换为 `AST` 节点如下：

```json
{
  "type": 1,
  "tag": "div",
  "attrsList": [],
  "attrsMap": {
    "v-for": "(value, name, index) in object"
  },
  "rawAttrsMap": {},
  "parent": null,
  "children": [],
  "for": "object",
  "alias": "value",
  "iterator1": "name",
  "iterator2": "index",
  "plain": true,
  "static": false,
  "staticRoot": false
}
```

这里使用了 `v-for` 最多接受的三个参数： `value`、`name`、`index` ，分别对应 `AST` 节点的 `el.alias`、`el.iterator1`、`el.iterator2`  属性，`object` 对应了 `el.for` 属性。

`genFor` 方法转换过程如下：

```ts
<div v-for="(value, name, index) in object"></div>
// ⬇︎
_l((object), function(${alias}${iterator1}${iterator2}){
  return ${(genElement)(el, state)}
})
// ⬇︎
_l((object), function(value,name,index){
  return _c('div')
})
```

#### genChildren

`genChildren` 方法在 `genElement` 方法中被调用来生成子节点代码，简化后源码如下：

```ts
export function genChildren(
  el: ASTElement, // 当前的 AST 元素
  state: CodegenState,
): string | void {
  const children = el.children
  // 如果 children 数组不为空，则生成子节点代码
  if (children.length) {
    const el: any = children[0]
    // 如果 children 数组中只有一个元素，并且该元素是 v-for 指令，则直接返回该元素的代码
    if (
      children.length === 1
      && el.for
      && el.tag !== 'template'
      && el.tag !== 'slot'
    ) {
      return `${(genElement)(el, state)}`
    }
    // 循环生成子节点代码
    return `[${children.map(c => genNode(c, state)).join(',')}]`
  }
}
```

我们主要关心这里最后对子节点循环调用的 `genNode` 方法。

#### genNode

```ts
function genNode(node: ASTNode, state: CodegenState): string {
  // 如果 node 是 ASTElement 元素节点，则递归调用 genElement 生成元素节点代码
  if (node.type === 1) {
    return genElement(node, state)
  }
  // 如果 node 是 ASTText 文本节点并且是注释节点，则调用 genComment 生成注释节点代码
  else if (node.type === 3 && node.isComment) {
    return genComment(node)
  }
  else {
    // 如果 node 是 ASTText 文本节点并且不是注释节点，则调用 genText 生成文本节点代码
    return genText(node)
  }
}
```

这里根据 `AST` 节点类型分别调用对应方法生成具体代码。

比如注释语句的 `AST` 节点生成的代码形如 `_e(..)` ，如下所示:

```ts
export function genComment(comment: ASTText): string {
  return `_e(${JSON.stringify(comment.text)})`
}
```

### 静态节点处理

静态节点处理比较特殊，所以单独拎出来。对于在上一章中介绍的优化器（`Optimizer`）中标记为静态根节点（`staticRoot: true`）的 `AST` 节点，会经过 `genStatic` 方法处理。

```ts
export function genElement(el: ASTElement, state: CodegenState): string {
	// ..
  if (el.staticRoot && !el.staticProcessed) {
	  return genStatic(el, state)
  }
  // ..
}
```

#### genStatic

```ts
// 将静态子树提升到外部
function genStatic(el: ASTElement, state: CodegenState): string {
  // 将 el.staticProcessed 设置为 true，递归 genElement 时，不再进入 genStatic 函数
  el.staticProcessed = true
  const originalPreState = state.pre
  if (el.pre) {
    state.pre = el.pre
  }

  // 转换后的静态子树保存到 staticRenderFns 数组中
  state.staticRenderFns.push(`with(this){return ${genElement(el, state)}}`)
  state.pre = originalPreState

  // 返回 _m 函数，参数是静态子树在 staticRenderFns 数组中的索引下标
  return `_m(${state.staticRenderFns.length - 1}${el.staticInFor ? ',true' : ''
    })`
}
```

`genStatic` 方法核心逻辑主要有两步：

1. 通过 `genElement`  产生的代码通过  `with(this){)}}`  包装后并没有直接返回，而是另外保存到了数组 `staticRenderFns` ，表示静态根节点对应的渲染函数代码，模板中可能有多个静态根节点，所以 `staticRenderFns` 是个数组。
2. 最终的返回形如 `_m(0)` ，其中参数是当前静态根节点在 `staticRenderFns` 数组中对应的索引下标。

静态根节点渲染函数的转换过程如下：

```ts
<div><span>hello</span></div>
// ⬇︎ 
// Parser + Optimizer: AST 节点
{
  "type": 1,
  "tag": "div",
  // ..
  "children": [
    {
      "type": 1,
      "tag": "span",
      // ..
      "children": [
        {
          "type": 3,
          "text": "hello",
          "static": true
        }
      ],
      "plain": true,
      "static": true
    }
  ],
  "plain": true,
  "static": true,
  "staticInFor": false,
  "staticRoot": true
}
// ⬇︎ generate
{
  render: 'with(this){return _m(0)}',
  staticRenderFns: [ `with(this){return _c('div',[_c('span',[_v("hello")])])}` ]
}
```

## 架构流程

将上述生成器源码整体串起来后的架构流程大概如下图所示：

![Vue2 模板编译器中生成器（Genrator）的源码架构流程示意图](/vue2-template-compiler-part3-generator/vue2-generator-architecture.png)

## 尾声

到此，我们已经探索了生成器（`Generator`）的完整流程以及部分指令（`v-if`、`v-for`）和静态节点的详细处理逻辑。由于生成器的源码确实繁杂的让人头大，包含了大量细节以及本文省略的其他内置指令（比如 `v-once`）处理，但相信通过本文的梳理，大家根据兴趣去探索其他细节时能够更加得心应手、事半功倍。

通过解析器（`Parser`）、优化器（`Optimizer`）和生成器（`Generator`）这三个核心步骤，我们深入了解了 Vue2 如何将模板转换为高效的渲染函数。到此，我们 Vue2 模板编译三部曲也终于画上了句号，希望此系列对大家有所裨益！