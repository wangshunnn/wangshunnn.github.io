---
title: Vue2 模板编译三部曲（二）｜优化器 Optimizer
date: 2024-9-26
lang: zh
duration: 10 min
description: 源码解析 Vue2 模板编译的优化器部分的实现原理
tag: Vue
place: 北京
---

# Vue2 模板编译三部曲（二）｜优化器 Optimizer

<br/>

> **✨ AI 摘要**
> 
> 本文深入探讨了 Vue2 模板编译过程中的优化器（`Optimizer`）。优化器的主要作用是识别并标记抽象语法树（`AST`）中的静态节点，从而在运行时跳过对这些节点的更新操作，提升渲染性能。文章详细解释了静态节点的概念，以及优化器的工作流程，包括标记静态节点和静态根节点的具体实现方法。通过源码分析和实例演示，阐述了如何判断节点的静态性质，以及优化器在编译过程中的重要作用。

## 什么是 Optimizer

上一章我们探索了 `Parser` 解析器部分，其解析得到的 `AST` 会作为输入传递给 `Optimizer` 继续处理，`Optimizer` 是优化器的意思，所以肯定是会对 `AST` 进行优化，那具体要优化什么呢？
这里需要先认识 Vue 模板中的一个重要概念：**“静态节点”**。

### 静态节点

在 Vue 中，**静态节点** 是指在模板中不会随数据变化而改变的内容。例如，纯文本节点或未绑定任何动态属性的元素都属于 **静态节点**。相反，包含数据绑定或动态属性的节点则被称为 **动态节点**。

我们知道 Vue 的核心理念是 **数据驱动** 的视图更新，即视图层会根据数据层的变化自动进行更新，这得益于 Vue **响应式系统**，它能追踪数据变化并更新对应 DOM。然而，对于静态节点来说，其渲染内容并不依赖于数据变化，频繁地检查和更新这些节点实际上是 **不必要且浪费性能** 的。

### 优化目的

`Optimizer` 优化器的目的就是识别并标记出 AST 中的静态节点。这样一来，在运行时 `patch` 阶段，可以跳过对静态节点的虚拟 DOM Diff 对比，避免不必要的计算和 DOM 操作，提升运行时渲染性能。

## Optimizer 的工作流程

`Optimizer` 的核心流程并不复杂，可以简单概括为以下两步：

1. **标记静态节点**：第一次遍历 `AST`，标记当前节点是否为 **静态节点**。
2. **标记静态根节点**：第二次遍历 `AST`，标记当前节点是否为 **静态根节点**。

`Optimizer` 源码架构流程如下图所示：

![优化器 Optimizer 源码流程示意图](/vue2-template-compiler-part2-optimizer/vue2-optimizer-architecture.png)

## 源码解析

### optimize 入口方法

```ts{12,14}
export function optimize(
  root: ASTElement | null | undefined,
  options: CompilerOptions,
) {
  if (!root) return
  // 生成静态 key 的映射函数，用于判断静态节点
  isStaticKey = genStaticKeysCached(options.staticKeys || '')
  // 生成平台保留标签的映射函数，用于判断静态节点
  isPlatformReservedTag = options.isReservedTag || no
  
  // 1. 第一次遍历：标记所有非静态节点
  markStatic(root)
  // 2. 第二次遍历：标记静态根节点
  markStaticRoots(root, false)
}
```

入口方法很简洁，正如前面整体流程中的介绍，其主要包含两个方法 `markStatic` 和 `markStaticRoots`。

### markStatic 标记静态节点

```ts
function markStatic(node: ASTNode) {
  // 首先执行 isStatic 判断一次是否静态节点
  node.static = isStatic(node)
  if (node.type === 1) {
    // 不要将组件插槽内容标记为静态，从而避免:
    // 1. 组件无法更改插槽节点
    // 2. 静态插槽内容在热重载时失败
    if (
      !isPlatformReservedTag(node.tag)
      && node.tag !== 'slot'
      && node.attrsMap['inline-template'] == null
    ) {
      return
    }

    // 递归标记子节点
    // 如果任一子节点不是静态的，则父节点（当前节点）也标记为非静态
    for (let i = 0, l = node.children.length; i < l; i++) {
      const child = node.children[i]
      markStatic(child)
      if (!child.static) {
        node.static = false
      }
    }

    // 递归标记条件块中的所有子节点
    // 如果任一子节点不是静态的，则父节点（当前节点）也标记为非静态
    if (node.ifConditions) {
      for (let i = 1, l = node.ifConditions.length; i < l; i++) {
        const block = node.ifConditions[i].block
        markStatic(block)
        if (!block.static) {
          node.static = false
        }
      }
    }
  }
}
```

`markStatic` 标记方法主要分为三步骤：

1. 通过 `isStatic` 方法判断是否是静态节点（具体判断见下文）
2. 递归标记子节点：如果任一子节点不是静态的，则回溯时候父节点（当前节点）也标记为非静态
3. 递归标记条件块中的所有子节点：如果任一子节点不是静态的，则父节点（当前节点）也标记为非静态

#### isStatic 静态节点判断标准

```ts
function isStatic(node: ASTNode): boolean {
  if (node.type === 2) {
    // expression
    return false
  }
  if (node.type === 3) {
    // text
    return true
  }
  return !!(
    node.pre
    || (!node.hasBindings // no dynamic bindings
    && !node.if
    && !node.for // not v-if or v-for or v-else
    && !isBuiltInTag(node.tag) // not a built-in
    && isPlatformReservedTag(node.tag) // not a component
    && !isDirectChildOfTemplateFor(node)
    && Object.keys(node).every(isStaticKey))
  )
}

/**
 * 判断节点是否是模板 for 的直接子节点
 * 如果一个节点是 v-for 指令的直接子节点，
 * 它的内容可能是动态的，不能被错误地标记为静态节点
 */
function isDirectChildOfTemplateFor(node: ASTElement): boolean {
  while (node.parent) {
    node = node.parent
    if (node.tag !== 'template') {
      return false
    }
    if (node.for) {
      return true
    }
  }
  return false
}
```

可见，判断静态节点主要有以下几个标准：

- 表达式节点（`type === 2`）不是静态节点
- 纯文本节点（`type === 3`）是静态节点
- 对于元素节点（`type === 1`），使用 `v-pre` 指令的节点被视为静态节点
- 对于元素节点（`type === 1`），且满足以下条件才是静态节点：
    - 没有动态绑定（`hasBindings` 为 `false`）
    - 没有 `v-if`、`v-for`、`v-else` 等指令
    - 不是内置标签（如 `slot`、`component`）
    - 是平台保留标签（如 `div`、`span` 等 `HTML` 标签）
    - 不是带有 `v-for` 指令的 `template` 标签的直接子节点
    - 节点的所有属性都属于静态键（`isStaticKey`）

### markStaticRoot 标记静态根节点

```ts
function markStaticRoots(node: ASTNode, isInFor: boolean) {
  // 剪枝：只处理 type === 1 元素类型节点，因为只有元素节点可以有子节点
  if (node.type === 1) {
    if (node.static || node.once) {
      node.staticInFor = isInFor
    }

    // 如果节点没有子节点，或者仅有一个静态文本类型的子节点，
    // 那么不应当标记为静态根节点，因为提取出来的成本将超过收益，反而不如直接渲染
    if (
      node.static
      && node.children.length
      && !(node.children.length === 1 && node.children[0].type === 3)
    ) {
      node.staticRoot = true
      return
    }
    else {
      node.staticRoot = false
    }

    // 递归标记子节点
    if (node.children) {
      for (let i = 0, l = node.children.length; i < l; i++) {
        markStaticRoots(node.children[i], isInFor || !!node.for)
      }
    }

    // 递归标记条件块中的所有节点
    if (node.ifConditions) {
      for (let i = 1, l = node.ifConditions.length; i < l; i++) {
        markStaticRoots(node.ifConditions[i].block, isInFor)
      }
    }
  }
}
```

`markStaticRoot` 标记方法同样可以分为三步：

1. 判断当前节点是否是静态根节点
2. 递归标记子节点，但子节点不会回溯影响父节点
3. 递归标记条件块中的所有子节点，但子节点不会回溯影响父节点

其中，对于 **静态根节点** 的判断标准是同时满足以下三个条件：

- 当前节点是静态节点
- 有至少一个子节点
- 子节点不能只是一个纯文本节点

举个栗子🌰：

- 非静态根节点： `<div>/div>` 、`<div>world</div>` ，因为前者没有子节点，而后者只有一个纯文本子节点，均不满足上述条件
- 属于静态根节点： `<div><span>world</span></div>`，满足上述条件

另外，还有两点值得注意的是：

- `markStaticRoot`  方法开头的 `if (node.type === 1)` 条件判断其实是剪枝优化：只需要处理 `node.type === 1` 元素类型节点，因为只有元素节点可以有子节点，否则不需要标记可以剪枝减少计算。
- `markStaticRoot`  方法除了标记静态根节点，还会标记 `staticInFor` ，判断依据是：
    - 对于已经标记为静态或者包含 `v-once` 指令的节点，`node.staticInFor = isInFor`，其中 `isInFor` 是方法第二个入参。

## 实践

- 现有模板如下，预期只有 `<span>` 和 `word` 两个节点是静态节点，不存在静态根节点。

```html
<div>
  <span>world</span><h1>{{ msg }}</h1>
</div>
```

- 经过 `Optimizer` 优化前的 `AST` （`Parser` 解析输出）如下：

```json
{
	"type": 1,
	"tag": "div",
	"attrsList": [],
	"attrsMap": {},
	"rawAttrsMap": {},
	"parent": undefined,
	"children": [
		{
			"type": 1,
			"tag": "span",
			"attrsList": [],
			"attrsMap": {},
			"rawAttrsMap": {},
			"parent": [Circular *1],
			"children": [
				{
					"type": 3,
					"text": "world",
					"static": true
				}
			],
			"plain": true,
		}
		{
			"type": 1,
			"tag": "h1",
			"attrsList": [],
			"attrsMap": {},
			"rawAttrsMap": {},
			"parent": [Circular *1],
			"children": [
				{
					"type": 2,
					"expression": "_s(msg)",
					"tokens": [],
					"text": "{{ msg }}",
					"static": false
				}
			],
			"plain": true,
		}
	],
	"plain": true,
}
```

- 经过 `Optimizer` 优化后的 `AST`  如下，注意其中添加了 `static`、`staticRoot`、`staticInFor` 属性。

```json
{
	"type": 1,
	"tag": "div",
	// 省略属性 ..
	"children": [
		{
			"type": 1,
			"tag": "span",
			// 省略属性 ..
			"children": [
				{
					"type": 3,
					"text": "world",
					"static": true
				}
			],
			"static": true,
			"staticInFor": false,
			"staticRoot": false
		}
		{
			"type": 1,
			"tag": "h1",
			// 省略属性 ..
			"children": [
				{
					"type": 2,
					"expression": "_s(msg)",
					"tokens": [],
					"text": "{{ msg }}",
					"static": false
				}
			],
			"static": false,
			"staticRoot": false
		}
	],
	"static": false,
  "staticRoot": false
}
```

## 总结

通过对优化器（`Optimizer`）的源码解析，我们了解到 Vue2 是如何在编译阶段识别和标记静态节点的，优化器的工作为后续的代码生成阶段奠定了基础，在下一章的生成器（`Generator`）部分，我们将进一步探讨 Vue2 是如何具体优化这些静态节点的，实现更高效的渲染性能。
