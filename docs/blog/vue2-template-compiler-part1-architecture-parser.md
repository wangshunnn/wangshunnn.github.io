---
title: Vue2 模板编译三部曲（一）｜架构设计 & 解析器 Parser
date: 2024-7-29
lang: zh
duration: 15 min
description: 源码解析 Vue2 模板编译的架构设计和解析器部分的实现原理
tag: Vue
place: 西安
---

# Vue2 模板编译三部曲（一）｜架构设计 & 解析器 Parser

> **✨ AI 摘要**
> 
> 文章详细介绍了 Vue2 模板编译的架构设计和解析器部分的实现原理。解析器主要包括 `parse` 方法和 `parseHTML` 方法的实现机制。`parse` 方法通过 `parseHTML` 方法提供的 `start`、`end`、`chars` 和 `comment` 钩子函数，将 `HTML` 结构转换为 AST。`parseHTML` 方法则通过正则匹配和栈结构，从左到右遍历 `HTML` 字符串，解析其标签和内容，最终生成 `AST` 树。本文档还深入分析了各个钩子的作用及其在解析过程中的触发时机，并简要讨论了解析过程的复杂度。

## 前言

写这篇文章最初的契机是 Vue3.4 针对 Parser 解析器性能进行了显著优化，其中解析速度提高了一倍左右，如此惊艳的效果让我很是好奇，所以想写一篇对比分析 Vue3.4 和 Vue2.7 解析器实现差异的文章。

写着写着发现，既然都写了解析器，干脆把编译器都串起来吧，对 Vue 模板编译原理的认知也能更体系化，于是乎，有了《Vue 模版编译三部曲》 系列篇的想法。

写着写着又发现，Vue2 和 Vue3 在架构和具体实现上都有很大不同，遂为了方便阅读，也为了方便写作控制章节篇幅，于是乎，有了 Vue2 和 Vue3 两个系列。当然可能的话，系列最后会总结对比分析，如同登山一样，最后站在顶上登高望远，站在更高层级上总结对比。~~果然坑是越挖越多。~~

“以史为鉴，可以知兴替”，让我们从 Vue2 源码开始开启本系列吧！

> *本系列相关核心代码已经整理到了 [Github](https://github.com/wangshunnn/vue-compiler-starter)，欢迎收藏享用～*
> 

## 何谓编译三部曲

熟悉前端编译原理的小伙伴们都知道，前端的编译原理基本可分为三步走：

- 解析 `Parser` ：*Code → AST*
- 转换 `Transformer` ：*AST → AST*
- 生成 `Generator` ：*AST → Code*

典型的应用工具就是大家熟知的 Babel ，它的主要任务是将现代 JS 代码转换成兼容性更好的旧版 JS 代码。那么 Vue 模板编译的目的是什么？Vue 官网文档在[《渲染机制》](https://vuejs.org/guide/extras/rendering-mechanism#render-pipeline)章节中描述了如下的渲染流程图：

![Vue 渲染机制流程](/vue2-template-compiler-part1-architecture-parser/vue2-render-pipeline.png)

Vue 渲染机制流程

如上图所示，Vue 为了提高性能，在运行时使用虚拟 DOM 来代替真实 DOM 的直接操作，它允许 Vue 在内存中进行高效的更新和计算，然后将这些变化一次性批量应用到真实 DOM 中，从而减少不必要的重绘和重排，提高渲染性能。

那么具体如何（高效地）操作虚拟 DOM 呢？为此 Vue 引入了渲染函数（`render function`）的概念，它可以使用 JS 来定义组件的结构和内容，不再局限于模板语法。特别是在需要复杂逻辑或动态内容的场景下，可以提供强大灵活性。此外，渲染函数可以与 JSX 结合使用，使得 Vue 开发体验更加接近 React。

那么问题来了，渲染函数怎么来的呢？

终于回归正题，这就是 Vue 模板编译的目的：**将模板字符串（`Template`）转换为渲染函数（`render function code`）**。和 Babel 工作原理类似，模板编译也可以分为三个阶段：

- 解析 `Parser`：*将模板字符串转换为抽象语法树（AST），以便后续处理。*
- 转换 `Transformer`：*对生成的AST进行变换和优化，提升渲染效率。*
- 生成 `Generator`：*将优化后的AST转换为最终的渲染函数代码，供浏览器执行。*

此谓之 Vue 模板编译“三部曲” 也！

## 编译器架构设计

> 在分析 Parser 源码之前，我们还是先整体看下编译器源码的架构和模块设计。
> 

模板编译相关的代码放在 `src/compiler` 文件夹下，其中 `index.ts` 入口文件如下所示。从代码逻辑可以清晰地看见前面所说三个阶段。

```ts
// src/compiler/index.ts*

import { parse } from './parser/index'
import { optimize } from './optimizer'
import { generate } from './codegen/index'
import { createCompilerCreator } from './create-compiler'
import { CompilerOptions, CompiledResult } from 'types/compiler'

export const createCompiler = createCompilerCreator(function baseCompile(
  template: string,
  options: CompilerOptions
): CompiledResult {

	// 1. 解析
  const ast = parse(template.trim(), options)
  
  // 2. 转换/优化
  if (options.optimize !== false) {
    optimize(ast, options)
  }
  
  // 3. 生成
  const code = generate(ast, options)
  
  return {
    ast,
    render: code.render,
    staticRenderFns: code.staticRenderFns
  }
})

```

关于三阶段的具体实现，我们会按章节分别介绍。这里可以稍微看一下入口文件实现，`createCompiler` 作用是传入模板字符串和配置 `options` 创建一个定制化的编译器“实例”。这里用了一个高阶函数技巧，通过 `createCompilerCreator` 函数传入 `baseCompile` 函数创建最终需要的编译器实例。`createCompilerCreator` 简化后核心代码如下：

```ts
// src/compiler/create-compiler.ts

import { createCompileToFunctionFn } from './to-function'

export function createCompilerCreator(baseCompile: Function): Function {
  return function createCompiler(baseOptions: CompilerOptions) {
    function compile(
      template: string,
      options?: CompilerOptions
    ): CompiledResult {
      const finalOptions = Object.create(baseOptions)
      // ..
      
      // 使用传入的 baseCompile 来真正编译模板
      const compiled = baseCompile(template.trim(), finalOptions)
      
      // ..
      return compiled
    }
    
    return {
      compile,
      compileToFunctions: createCompileToFunctionFn(compile)
    }
  }
}
```

这里返回的 `createCompiler` 函数的运行结果就是一个编译器“实例”，包含 `compile` 和 `compileToFunctions` 两个方法属性：

- `compile` ：负责模板字符串的编译，返回的结果其实是前面传入的 `baseCompile` 的返回结果，即一个包含 `AST`、`render` 渲染函数和 `staticRenderFns` 静态渲染函数的对象。
- `compileToFunctions` ：将 `compile` 转化为可执行的渲染函数，应用场景是在浏览器中直接使用模板字符串而不是预编译的模板，以便在 Vue 运行时执行。这里又用了一个高阶函数 `createCompileToFunctionFn`，其核心逻辑如下。

```ts
export function createCompileToFunctionFn(compile: Function): Function {
  const cache = Object.create(null)

  return function compileToFunctions(
    template: string,
    options?: CompilerOptions,
  ): CompiledFunctionResult {    
    // ..

    // 缓存，避免重复编译
    if (cache[key]) {
      return cache[key]
    }

    // 真正的编译逻辑，使用传入的 compile 方法
    const compiled = compile(template, options)

    const res: any = {}
    // 将编译得到的 render 代码转换为函数
    res.render = createFunction(compiled.render, fnGenErrors)
    // 静态渲染函数，用于渲染静态节点，可以提高渲染性能
    res.staticRenderFns = compiled.staticRenderFns.map(code => {
      return createFunction(code, fnGenErrors)
    })

		// 更新缓存
    return (cache[key] = res)
  }
}
```

从这两个高阶函数的应用来看，Vue 在编译器入口的实现和导出上，蕴含了“策略模式”、“依赖注入”等优秀的设计模式思想。在 *`src/compiler/index.ts`* 中传入的 `baseCompile` 是真正的核心“业务”逻辑，它实现了核心的编译逻辑，而背后的高阶函数 `createCompilerCreator` 和 `createCompileToFunctionFn` 则是底层通用的配置处理逻辑和“胶水”代码，比如编译配置的合并、错误警告处理等等”。

通过这种设计模式，`createCompilerCreator` 返回的 `createCompiler` 函数在内部封装了编译逻辑，为外部调用者传入的 `baseCompile` 核心编译实现提供了必要的环境和上下文，最后对外暴露较为简洁的 `compile`，`compileToFunctions` 核心接口，而调用者并不需要关心内部的复杂实现。

上述编译源码的逻辑流程图如下所示：

![Vue2 模板编译源码流程](/vue2-template-compiler-part1-architecture-parser/vue2-template-compiler-architecture.png)

Vue2 模板编译源码流程

## 什么是 Parser

Vue parser 的主要作用是将 `<template>` 模板字符串转换成 `AST`（抽象语法树，可以理解成具有特殊格式的描述对象），比如 `<template>` 中的源码如下：

```html
<div>
	<h1>hello</h1>
	<text>{{name}}</text>
</div>
```

解析后的 `AST` 后如下：

```json
{
  "type": 1,
  "tag": "div",
  "attrsList": [],
  "attrsMap": {},
  "rawAttrsMap": {},
  "children": [
    {
      "type": 1,
      "tag": "h1",
      "attrsList": [],
      "attrsMap": {},
      "rawAttrsMap": {},
      "parent": [Circular * 1],
      "children": [
        {
          "type": 3,
          "text": "hello"
        }
      ],
      "plain": true
    },
    {
      "type": 1,
      "tag": "text",
      "attrsList": [],
      "attrsMap": {},
      "rawAttrsMap": {},
      "parent": [Circular * 1],
      "children": [
        {
          "type": 2,
          "expression": "_s(name)",
          "tokens": [
            {
              "@binding": "name"
            }
          ],
          "text": "{{name}}"
        }
      ],
      "plain": true
    }
  ],
  "plain": true
}
```

## parse：入口方法

对外导出的 `parse` 方法在文件 `*src/compiler/parser/index.ts`* 中，源码简化如下：

```ts
// src/compiler/parser/index.ts
/**
 * Convert HTML string to AST.
 */
export function parse(template: string, options: CompilerOptions): ASTElement {
  let root: ASTElement
  // ..
  
  parseHTML(template, {
    // 省略其他配置项
		start(tag, attrs, unary, _start, _end) { /** .. */ }
		end(_tag, _start, _end) { /** .. */ }
	  chars(text: string, _start?: number, _end?: number) { /** .. */ }
	  comment(text: string, _start, _end) { /** .. */ }
  }
  
  // 最终返回的 AST 树的根结点
  return root
}
```

- 可见，`parse` 方法核心是通过 `parseHTML` 方法并结合其提供的 `start`, `end`, `chars`, `commont` 等 hooks 回调钩子来实现将 HTML 结构转换成 AST。

## parseHTML：真正的主角

### parse hooks 解析钩子

我们可以先看下 parseHTML 方法的参数：

1. `html`: string 类型，即我们传入的模板字符串内容，符合 HTML 格式
2. `options`: 解析选项参数，类型如下，主要是提供了 `start`, `end`, `chars`, `commont` 四个解析生命周期中的回调钩子，我们暂且称之为 `parse hooks`，方便外部在解析过程中实现自定义逻辑。那具体什么时候触发这些 `hooks` 呢？
    
    ```ts
    export interface HTMLParserOptions extends CompilerOptions {
      start?: (
        tag: string,
        attrs: ASTAttr[],
        unary: boolean,
        start: number,
        end: number
      ) => void
      end?: (tag: string, start: number, end: number) => void
      chars?: (text: string, start?: number, end?: number) => void
      comment?: (content: string, start: number, end: number) => void
    }
    ```
    

举个例子，下面这段 HTML 的解析过程如下所示：

```html
 <div><h1>hello</h1><text>{{name}}</text></div>
```

解析过程示意图如下所示：

![parseHTML 解析过程中触发对应的 hooks 钩子函数示意图](/vue2-template-compiler-part1-architecture-parser/vue2-parseHTML-hooks-demo.png)

parseHTML 解析过程中触发对应的 hooks 钩子函数示意图

可见 `parseHTML` 的解析顺序是从左往右顺序进行的，相当于从左往右遍历，遍历到对应位置就触发对应的 `hooks`。

`parse` 方法其实就是通过 `parseHTML` 对应的 `hooks` 和参数来创建对应的 `AST` 节点，最终形成我们需要的 `AST` 树。我们先不用关心 `parseHTML` 具体怎么遍历解析的，这部分我们下文会专门分析，我们可以先看看 `parse` 方法怎么在 `hooks` 中创建 `AST` 的。

#### start 钩子

`start hook` 在遇到开始标签（`Opening Tag`）时触发，对应参数如下：

```ts
start?: (
  /** 标签名，比如 div, text, .. */
  tag: string,
  /** 标签属性 */
  attrs: ASTAttr[],
  /** true 表示是自闭合标签，比如 <img/> */
  unary: boolean,
  /** 开始位置索引 */
  start: number,
  /** 结束位置索引 */
  end: number
) => void
```

`start hook` 代码简化如下：

```ts
/** start 回调 */
start(tag, attrs, unary, _start, _end) {
	// ..
	
	// 创新新的 AST 节点
  let element: ASTElement = createASTElement(tag, attrs, currentParent)
  
  // ..

  // 处理结构体指令 v-for v-if v-once
  if (!element.processed) {
    processFor(element)
    processIf(element)
    processOnce(element)
  }

	// 根结点赋值
  if (!root) {
    root = element
  }

	// 如果不是自闭合便签，压入栈
  if (!unary) {
    // 更新父节点
    currentParent = element
    // 入栈
    stack.push(element)
  }
  // 是自闭合标签
  else {
	  // 按结束标签流程再处理下
    closeElement(element)
  }
}
```

这里通过 `createASTElement` 创建了一个 `type = 1` 的元素类型 AST 节点：

```ts
export function createASTElement(
  tag: string,
  attrs: Array<ASTAttr>,
  parent: ASTElement | void,
): ASTElement {
  return {
    type: 1,
    tag,
    attrsList: attrs,
    attrsMap: makeAttrsMap(attrs),
    rawAttrsMap: {},
    parent,
    children: [],
  }
}
```

每次遇到开始标签时都会将元素入栈 `stach` ，这样等遇到对应的结束标签时，此时栈顶的元素就是当前结束标签对应的开始标签。另外，自闭合标签也是触发的 `start hook`，但不会入栈。

#### end 钩子

`end hook` 在遇到结束标签（`Closing Tag`）时触发，对应参数如下：

```ts
end?: (
  /** */
  tag: string,
  /** 开始位置索引 */
  start: number,
  /** 结束位置索引 */
  end: number
) => void
```

`end hook` 代码简化如下：

```ts
end(_tag, _start, _end) {
  const element = stack[stack.length - 1]
  stack.length -= 1
  currentParent = stack[stack.length - 1]
  closeElement(element)
}
```

这里主要对 `stack` 的管理，将当前结束标签对应的开始标签（即栈顶元素）出栈。

#### chars 钩子

`chars hook` 在遇到元素内容（`Content`）时触发，对应参数如下：

```ts
chars?: (
  /** 文本内容 */
  text: string,
  /** 开始位置索引 */
  start?: number,
  /** 结束位置索引 */
  end?: number
) => void
```

`chars hook` 主要处理元素内容的文本部分，代码简化如下：

```ts
chars(text: string, _start?: number, _end?: number) {
  // 文本节点只能是子节点，不可能是其他节点的父节点，
  // 所以直接作为子节点挂载到当前父节点上
  const children = currentParent.children

  // ..
 
  if (text) {
    let res
    let child: ASTNode | undefined
    // 如果是表达式文本, 创建 type=2 文本节点
    if (!inVPre && text !== ' ' && (res = parseText(text, delimiters))) {
      child = {
        type: 2,
        expression: res.expression,
        tokens: res.tokens,
        text,
      }
    }
    // 如果是普通文本, 创建 type=3 文本节点
    else if (
      text !== ' '
      || !children.length
      || children[children.length - 1].text !== ' '
    ) {
      child = {
        type: 3,
        text,
      }
    }
    if (child) {
	    // 通过引用赋值，挂载到当前父节点上
      children.push(child)
    }
  }
}
```

这里通过判断文本类型，创建一个 `type = 2` 的表达式文本类型节点 `ASTNode`，或者  `type = 3` 的普通文本类型节点 `ASTNode`，并添加到父节点的最后一个子节点位置。

值得注意的是，这里的 `parseText` 方法使用来判断是否包含变量文本，如果包含的话该方法内部会对变量文本进行二次解析处理，`{{xx}}` 包裹的变量会变成如下所示的 `_s(xx)`  形式。可见，对于文本中特殊变量的处理并不是在 `parseHTML`  内部处理的，而是在 `chars` 钩子中交给外部自行处理的。

```ts
// 解析前的 text
'hi {{name}}'

// parseText 解析后返回对象
{
  expression: '"hi "+_s(name)',
  tokens: [ 'hi ', { '@binding': 'name' } ]
}
```

#### comment 钩子

```ts
comment?: (
  /** 注释内容 */
  content: string,
  /** 开始位置索引 */
  start: number,
  /** 结束位置索引 */
  end: number
) => void
```

`comment hook` 主要处理注释部分，代码如下：

```ts
comment(text: string, _start, _end) {
  if (currentParent) {
    const child: ASTText = {
      type: 3,
      text,
      isComment: true,
    }
    currentParent.children.push(child)
  }
}
```

`comment hook` 同样创建了 `type = 3` 的普通文本节点 `ASTText`，但拥有 `isComment: true` 特别属性。

#### parse hooks 小结

`parse` 方法实现从模板到 `AST` 的转换，核心是通过 `parseHTML` 方法暴露的 `start`, `end`, `chars`, `commont` 四个解析生命周期中的回调钩子 `parse hooks` ，针对各个标签创建对应的 `AST` 节点，最终连接起来形成一个 `AST` 节点树。

### parseHTML 解析原理

从源码中的注释可以看出，核心的 `parseHTML` 方法是参考开源的 `htmlparser` 方法。

```ts
// src/compiler/parser/html-parser.ts
/*!
 * HTML Parser By John Resig (ejohn.org)
 * Modified by Juriy "kangax" Zaytsev
 * Original code by Erik Arvidsson (MPL-1.1 OR Apache-2.0 OR GPL-2.0-or-later)
 * http://erik.eae.net/simplehtmlparser/simplehtmlparser.js
 */
```

`parseHTML` 源码实现有 270 行左右，简化后如下，具体源码注释可参考 *[Github](https://github.com/wangshunnn/vue-compiler-starter)。*

```ts
export function parseHTML(html: string, options: HTMLParserOptions) {
	const stack: any[] = []
	let index: number = 0
  let last: string, lastTag: string
	
	// 从左到右遍历 html
  while (html) {
    last = html

    /** 根元素标签或者非 script/style 标签下内容 */
    if (!lastTag! || !isPlainTextElement(lastTag)) {
      let textEnd = html.indexOf('<')

      /** 1. `<` 打头 */
      if (textEnd === 0) {
        /** 1.1 Comment: 普通注释, `<!--` 打头 */
        if (comment.test(html)) {
          // 直接截取步进
        }

        /** 1.2 Conditional Comment: 条件注释, `<![` 打头 */
        if (conditionalComment.test(html)) {
          // 直接截取步进
        }

        /** 1.3 Doctype: <!DOCTYPE> 声明 */
        const doctypeMatch = html.match(doctype)
        if (doctypeMatch) {
          // 直接截取步进
        }

        /** 1.4 End tag: 结束标签 </xxx> */
        const endTagMatch = html.match(endTag)
        if (endTagMatch) {
          // 解析结束标签，触发 end 钩子
        }

        /** 1.5 Start tag: 开始标签 <xxx>, 自闭合标签 <xxx/> */
        const startTagMatch = parseStartTag()
        if (startTagMatch) {
	        // 匹配到标签则触发 start 钩子
          handleStartTag(startTagMatch)
          // ..
        }
      }

      /** 2. 特判场景: 处理普通文本中的 < 符号 */
      if (textEnd >= 0) {
	      // 截取步进
      }

      /** 3. 没有 < 符号，那么直接视为普通文本 */
      if (textEnd < 0) {
        // 截取步进
      }

      if (options.chars && text) {
        // 触发 chars 钩子
      }
    }
    /**
     * 非根元素标签且为 script、style、textarea 标签内容
     * 可以完全看做文本，在本轮循环中和结束标签一起处理，
     * 并且触发 char 钩子
     */
    else {
      // ..
      parseEndTag(stackedTag, index - endTagLength, index)
    }
    
	  // 如果没有需要处理的话，直接当做文本触发 char 钩子，并退出循环遍历
    if (html === last) {
      options.chars?.(html)
      break
    }
  }
}
```

`parseHTML` 的解析逻辑流程图如下所示：

![parseHTML 解析逻辑流程图](/vue2-template-compiler-part1-architecture-parser/vue2-parseHTML.png)

parseHTML 解析逻辑流程图

1. **初始化**
    - 创建一个空的栈 `stack` 用于存储解析过程中遇到的标签。
    - 初始化索引 `index` 为 0，表示当前解析到的位置。
    - 初始化变量 `last` 和 `lastTag` 用于记录上一次解析的 HTML 片段和标签。
2. **循环遍历**
    - `while` 循环遍历 `html` 字符串，每次循环开始时，将当前的 `html` 字符串赋值给 `last`，以便后续检查是否有处理进度
    - 每次循环过程中，根据已经匹配的字符串进行删除（步进），直到`html`为空字符串时，说明整个文本匹配完成。
3. **循环内部正则匹配**：通过正则匹配开始标签（开始符号、标签属性、结束符号）、文本内容（注释、普通文本）、结束标签，主要有以下条件分支：
    - 根元素或者正常元素标签内容
        - 如果当前解析位置为 `<`，则进行如下处理：
            - 普通注释：匹配 `<!--` 注释标签，直接跳过。
            - 条件注释：匹配 `<![` 条件注释标签，直接跳过。
            - `DOCTYPE` 注释：匹配 `<!DOCTYPE>` 声明，直接跳过。
            - 开始标签：匹配 `<xxx>` 或 `<xxx/>` 自闭合标签，调用 `parseStartTag` 解析并处理，并触发 `start` 钩子函数。
            - 结束标签：匹配 `</xxx>` 结束标签，调用 `parseEndTag` 解析并处理，并触发 `end` 钩子函数。
        - 普通文本处理：
            - 如果在普通文本中遇到 `<` 符号，需要进行特判处理。
            - 没有 `<` 符号，直接当做文本处理。
            - 匹配到文本最后会触发 `chars` 钩子。
    - 特殊标签内容：对于 `script`、`style`、`textarea` 等标签，其内容视为普通文本，在本轮循环中一并处理，并触发 `chars` 钩子。
4. **栈维护 `DOM` 层级关系**：通过栈 `stack` 来记录所有正在处理的标签，解析到开始标签就入栈，解析到结束标签就出栈，根据入栈出栈顺序来生成树结构。

### 复杂度分析

- `parseHTML` 方法主要通过栈和 `while` 循环来实现，每次循环都会截取已匹配的内容并且往后面步进，因此循环遍历的时间复杂度为线性  $O(n)$。看似线性的时间复杂度，但实际表现可能会不尽人意，影响性能的瓶颈就是大量的正则匹配和前瞻搜索（比如向前搜索 < 符号以及闭合标签位置等等），这些都可能导致时间复杂度在最坏情况下逼近  $O(n^2)$。
- `parser` 中使用的正则包括但不限于以下这些，复杂正则匹配的时间复杂度可能随待匹配长度呈指数级增长，导致影响性能。

```ts
export const unicodeRegExp
  = /a-zA-Z\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u200C-\u200D\u203F-\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD/
const attribute
  = /^\s*([^\s"'<>/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/
const dynamicArgAttribute
  = /^\s*((?:v-[\w-]+:|[@:#])\[[^=]+?\][^\s"'<>/=]*)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/
const ncname = `[a-zA-Z_][\\-\\.0-9_a-zA-Z${unicodeRegExp.source}]*`
const qnameCapture = `((?:${ncname}\\:)?${ncname})`
const startTagOpen = new RegExp(`^<${qnameCapture}`)
const startTagClose = /^\s*(\/?)>/
const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`)
const doctype = /^<!DOCTYPE [^>]+>/i
const comment = /^<!--/
const conditionalComment = /^<!\[/
const reStackedTag = reCache[stackedTag] || (reCache[stackedTag] = new RegExp(`([\\s\\S]*?)(</${stackedTag}[^>]*>)`,'i',))
text = text.replace(/<!--([\s\S]*?)-->/g, '$1').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
```

- Vue3.4 对于解析器进行了重写将解析器速度提高了近 1 倍，正如其 [issue](https://github.com/vuejs/core/pull/9674) 所介绍的，新版本重构主要是解决旧版本大量正则匹配和前瞻搜索的性能瓶颈。

## 最后

作为本系列的开篇，先介绍了模板编译整体的“三部曲”架构，然后才是第一步解析器的详细介绍。解析器源码实现其实可以分为两部分：

-   `parseHTML` ：**词法分析器**，扫描模板字符串并将其转换为一系列标记（tokens），并且提供了处理不同类型标记的 hooks。
-   `parse` ：**语法分析器**，根据 `parseHTML` 提供的 tokens 和 hooks 进一步构建 AST。

其中比较复杂难理解的是核心的 `parseHTML` 方法，其实现原理是一个[递归下降解析器](https://zh.wikipedia.org/wiki/%E9%80%92%E5%BD%92%E4%B8%8B%E9%99%8D%E8%A7%A3%E6%9E%90%E5%99%A8)，当然其使用到的大量正则匹配和前瞻搜索也是主要的性能瓶颈，未来我们可以具体看看 Vue3 解析器是如何重构来提高性能的。
