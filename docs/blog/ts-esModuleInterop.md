---
title: TypeScript esModuleInterop 原理&实践
date: 2024-1-15
lang: zh
duration: 10 min
description: TypeScript 转译器如何处理 ESM 与 CommonJS 模块之间的交互问题？
tag: TypeScript
place: Beijing
---

# TS esModuleInterop 原理&实践

## 问题背景：ES Modules 和 CommonJS 模块的互操作难题

当我们在 `TypeScript` 文件中导入 `CommonJS` 模块时，也许会遇到一些令人的困惑结果。

如下例子中，`lib.cjs.js` 是一个 `CommonJS` 模块。_(隐藏问题：这里真正导出的是什么？:p)_

```js
// lib.cjs.js
exports.a = 1
module.exports = {
  a: 2,
  b: 3
}
exports.b = 4
```

然后，我们在 `index.ts` 中分别尝试通过 `ESM`（`ES Modules`） 不同的导入规范来导入 `lib.cjs.js` 模块。

```ts
// index.ts
import * as lib_1 from './lib.cjs.js'
import lib_2 from './lib.cjs.js'
import { a } from './lib.cjs.js'

console.log(lib_1.a)
console.log(lib_2.a)
console.log(a)
```

当我们通过 `tsc` 转译代码后，其运行结果也许会出乎意料。如果你对结果没有十足把握，不妨先动手试试。

如果你直接使用 `tsc index.ts` 转译代码然后执行 `index.js`，其运行结果如下所示，你是否会感到疑惑？🤔

```ts
console.log(lib_1.a)  // ✅ work
console.log(lib_2.a)  // ❌ fail
console.log(a)        // ✅ work
```

## tsc 是如何处理的？

<!-- > 插一段题外话，这里将 tsc 写作转译器（`transpiler`），或者 [source-to-source compiler (S2S compiler)](https://en.wikipedia.org/wiki/Source-to-source_compiler)，是因为 TS 到 JS 的转换是相似抽象级别语言之间的转换，而非传统的高级语言到低级语言的编译（`compiler`）。 -->

当我们通过 `tsc --init` 初始化生成 `tsconfig.json` 配置文件时，会发现有一个默认开启的配置选项 `esModuleInterop`。_（环境：node v18 & typescript@5.3.3 ）_

```json
// tsconfig.json
{
  "esModuleInterop": true
  /* Emit additional JavaScript to ease support for importing CommonJS modules. This enables 'allowSyntheticDefaultImports' for type compatibility. */
}
```

根据官方解释，这个选项是用来处理 `ESM` 和 `CommonJS` 模块之间的交互问题，开启该选项后 `tsc` 会产生额外代码来帮助我们“更轻松”地导入 `CommonJS` 模块。让我们动手实践看下启用前后的区别。

### esModuleInterop 工作原理

#### 设置 `{ esModuleInterop: false }`

关闭 `esModuleInterop` 选项，`tsc` 转译后代码如下所示：

```js
'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
var lib_1 = require('./lib.cjs.js')
var lib_cjs_js_1 = require('./lib.cjs.js')
var lib_cjs_js_2 = require('./lib.cjs.js')
console.log(lib_1.a)                // ✅ work
console.log(lib_cjs_js_1.default.a) // ❌ fail
console.log(lib_cjs_js_2.a)         // ✅ work
```

可以发现三种不同的导入方式对应的转换规则如下：

1. 命名空间导入（Namespace import）

   ```js
   import * as lib from './lib.cjs.js'
   // 等效于
   var lib = require('./lib.cjs.js')
   ```

2. 默认导入（Default import）

   ```js
   import lib from './lib.cjs.js'
   // 等效于
   var lib = require('./lib.cjs.js').default
   ```

   对于默认导入方式，由于 `./lib.cjs.js` 其实并没有提供 `default` 导出，因此 `require('./lib.cjs.js').default` 的结果会是 `undefined`，这也解释了开头的示例中为什么会失败。

3. 命名导入（Named import）

   ```js
   import { a } from './lib.cjs.js'
   // 等效于
   var lib = require('./lib.cjs.js')
   var { a } = lib
   ```

#### 设置 `{ esModuleInterop: true }`

开启 `esModuleInterop` 选项，`tsc` 转译后代码如下所示：

```js
'use strict'
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k
        var desc = Object.getOwnPropertyDescriptor(m, k)
        if (
          !desc ||
          ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k]
            }
          }
        }
        Object.defineProperty(o, k2, desc)
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k
        o[k2] = m[k]
      })
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, 'default', { enumerable: true, value: v })
      }
    : function (o, v) {
        o['default'] = v
      })
var __importStar =
  (this && this.__importStar) ||
  function (mod) {
    if (mod && mod.__esModule) return mod
    var result = {}
    if (mod != null)
      for (var k in mod)
        if (k !== 'default' && Object.prototype.hasOwnProperty.call(mod, k))
          __createBinding(result, mod, k)
    __setModuleDefault(result, mod)
    return result
  }
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod }
  }
Object.defineProperty(exports, '__esModule', { value: true })
var lib_1 = __importStar(require('./lib.cjs.js'))
var lib_cjs_js_1 = __importDefault(require('./lib.cjs.js'))
var lib_cjs_js_2 = require('./lib.cjs.js')
console.log(lib_1.a)
console.log(lib_cjs_js_1.default.a)
console.log(lib_cjs_js_2.a)
```

可以发现其转换规则发生了如下变化：

1. 命名空间导入（Namespace import）

   ```js
   import * as lib from './lib.cjs.js'
   // 等效于
   var lib = __importStar(require('./lib.cjs.js'))
   ```

   这里新增了一个 `__importStar` 方法来包裹原来的导出，其作用就是将原有导出对象的所有可枚举属性代理到新的导入对象中。

2. 默认导入（Default import）

   ```js
   import lib from './lib.cjs.js'
   // 等效于
   var lib = __importDefault(require('./lib.cjs.js')).default
   ```

   这里新增了一个 `__importDefault` 方法来包裹原来的导出，其作用是为 `CommonJS` 模块的导出添加了 `default` 默认导出，抹平了和 `ESM` 的差异，这样结果就符合预期了，降低了开发者的心智负担。

3. 命名导入（Named import）

   ```js
   import { a } from './lib.cjs.js'
   // 等效于
   var lib = require('./lib.cjs.js')
   var { a } = lib
   ```

   可以发现，命名导入不受 `esModuleInterop` 影响。

## 其他转译器和构建工具

前面分析了 `tsc` 的处理方案，那其他转译器和构建工具又是怎么处理的？

### Babel

> 实验环境：@babel/cli: 7.23.4, @babelcore: 7.23.7, @babel/plugin-transform-modules-commonjs: @7.23.3

[Babel](https://swc.rs/) 的插件 [@babel/plugin-transform-modules-commonjs](https://www.babeljs.cn/docs/babel-plugin-transform-modules-commonjs) 从 `v7.14.0` 版本开始支持了名为 [importinterop](https://babeljs.io/docs/babel-plugin-transform-modules-commonjs#importinterop) 的编译选项，对应 `tsconfig` 的 `esModuleInterop`，并且提供了三个控制更为精细的可选值。

```json
// .babelrc
{
  "plugins": [
    [
      "@babel/plugin-transform-modules-commonjs",
      {
        "importInterop": "babel" // "babel" (default) | "node" | none"
        // ..
      }
    ]
  ]
  // ..
}
```

转译后的代码如下所示，也是通过新增辅助函数来抹平差异。

```js
'use strict'
var _libCjs = _interopRequireWildcard(require('./lib.cjs.js'))
var lib_1 = _libCjs
function _getRequireWildcardCache(e) {
  if ('function' != typeof WeakMap) return null
  var r = new WeakMap(),
    t = new WeakMap()
  return (_getRequireWildcardCache = function (e) {
    return e ? t : r
  })(e)
}
function _interopRequireWildcard(e, r) {
  if (!r && e && e.__esModule) return e
  if (null === e || ('object' != typeof e && 'function' != typeof e))
    return { default: e }
  var t = _getRequireWildcardCache(r)
  if (t && t.has(e)) return t.get(e)
  var n = { __proto__: null },
    a = Object.defineProperty && Object.getOwnPropertyDescriptor
  for (var u in e)
    if ('default' !== u && Object.prototype.hasOwnProperty.call(e, u)) {
      var i = a ? Object.getOwnPropertyDescriptor(e, u) : null
      i && (i.get || i.set) ? Object.defineProperty(n, u, i) : (n[u] = e[u])
    }
  return (n.default = e), t && t.set(e, n), n
}
console.log(lib_1.a)
console.log(_libCjs.default.a)
console.log(_libCjs.a)
```

### swc

> 实验环境： @swc/cli: v0.1.63, @swc/core: v1.3.103

[swc](https://swc.rs/) 提供了名为 [noIntero](https://www.swc.net.cn/docs/configuration/modules#nointerop) 的编译选项（默认为 false），对应 `tsconfig` 的 `esModuleInterop`，但选项值相反。

```json
// .swcrc
{
  "$schema": "http://json.schemastore.org/swcrc",
  "module": {
    "type": "commonjs",
    // 以下是默认选项值
    "strict": false,
    "strictMode": true,
    "lazy": false,
    "noInterop": false
  }
  // ..
}
```

当配置 `{ noInterop: false }` （默认）后，通过 swc 转译后的代码如下所示，其结果和 `{ esModuleInterop: true }` 效果类似，但其新增的辅助代码和 `babel` 更为接近。

```js
'use strict'
Object.defineProperty(exports, '__esModule', {
  value: true
})
var _libcjs = /*#__PURE__*/ _interop_require_wildcard(require('./lib.cjs.js'))
function _getRequireWildcardCache(nodeInterop) {
  if (typeof WeakMap !== 'function') return null
  var cacheBabelInterop = new WeakMap()
  var cacheNodeInterop = new WeakMap()
  return (_getRequireWildcardCache = function (nodeInterop) {
    return nodeInterop ? cacheNodeInterop : cacheBabelInterop
  })(nodeInterop)
}
function _interop_require_wildcard(obj, nodeInterop) {
  if (!nodeInterop && obj && obj.__esModule) {
    return obj
  }
  if (obj === null || (typeof obj !== 'object' && typeof obj !== 'function')) {
    return {
      default: obj
    }
  }
  var cache = _getRequireWildcardCache(nodeInterop)
  if (cache && cache.has(obj)) {
    return cache.get(obj)
  }
  var newObj = {
    __proto__: null
  }
  var hasPropertyDescriptor =
    Object.defineProperty && Object.getOwnPropertyDescriptor
  for (var key in obj) {
    if (key !== 'default' && Object.prototype.hasOwnProperty.call(obj, key)) {
      var desc = hasPropertyDescriptor
        ? Object.getOwnPropertyDescriptor(obj, key)
        : null
      if (desc && (desc.get || desc.set)) {
        Object.defineProperty(newObj, key, desc)
      } else {
        newObj[key] = obj[key]
      }
    }
  }
  newObj.default = obj
  if (cache) {
    cache.set(obj, newObj)
  }
  return newObj
}
console.log(_libcjs.a)
console.log(_libcjs.default.a)
console.log(_libcjs.a)
```

### tsup

> 实验环境：tsup: v8.0.1

[tsup](https://tsup.egoist.dev/) 是一款基于 [esbuild](https://github.com/evanw/esbuild) 的开箱即用的 TS 编译构建工具，通过默认配置转译后的代码如下所示，其结果和 `{ esModuleInterop: false }` 效果类似。

```shell
tsup index.ts --format cjs
```

`tsup` 构建后的代码如下所示：

```js
'use strict'
var __create = Object.create
var __defProp = Object.defineProperty
var __getOwnPropDesc = Object.getOwnPropertyDescriptor
var __getOwnPropNames = Object.getOwnPropertyNames
var __getProtoOf = Object.getPrototypeOf
var __hasOwnProp = Object.prototype.hasOwnProperty
var __commonJS = (cb, mod) =>
  function __require() {
    return (
      mod ||
        (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod),
      mod.exports
    )
  }
var __copyProps = (to, from, except, desc) => {
  if ((from && typeof from === 'object') || typeof from === 'function') {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, {
          get: () => from[key],
          enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
        })
  }
  return to
}
var __toESM = (mod, isNodeMode, target) => (
  (target = mod != null ? __create(__getProtoOf(mod)) : {}),
  __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule
      ? __defProp(target, 'default', { value: mod, enumerable: true })
      : target,
    mod
  )
)

// lib.cjs.js
var require_lib_cjs = __commonJS({
  'lib.cjs.js'(exports2, module2) {
    'use strict'
    exports2.a = 1
    module2.exports = {
      a: 2,
      b: 3
    }
    exports2.b = 4
  }
})

// index.ts
var lib_1 = __toESM(require_lib_cjs())
var import_lib_cjs = __toESM(require_lib_cjs())
var import_lib_cjs2 = __toESM(require_lib_cjs())
console.log(lib_1.a)
console.log(import_lib_cjs.default.a)
console.log(import_lib_cjs2.a)
```

从上述实验来看，`babel`、`swc`、`tsup` 等主流的 `TS` 转译和构建工具基本都支持并且默认开启了 `tsc` 的 `esModuleInterop` 能力。

## ~~最佳~~实践建议

1. 未开启 `esModulesInterop` 时，使用命名空间导入（`import * as`）更稳妥。
2. 开启 `esModulesInterop` 时，使用默认导入（`import xx from`）更稳妥。**需要注意的是**，对于非对象形式（函数、Class、变量等等）导出的 ComminJS 模块，使用命名空间导入（`import * as`）会导致出错。
3. 不同转译工具（`tsc`, `babel`, `swc`, `tsup` 等等）处理类似 `esModulesInterop` 互操作性问题的默认方式和配置选项有差异，具体情况具体分析。

## 结语

由于 `ESM` 和 `CommonJS` 模块存在模块规范上的差异，在 `ESM` 中导入 `CommonJS` 模块时容易产生歧义，可见有统一规范的重要性。如今全面拥抱 ESM 已是大势所趋，相信未来 JSer/TSer 的开发体验也会越来越好。

## 思考题

如果一个 `CommonJS` 模块本身就导出了 `default` 属性，那么在 `ts` 中导入该模块后，开启和关闭 `esModulesInterop` 对于最终结果又有什么影响？（是否又有了新的困惑？）

```js
// lib.cjs.js
exports.default = {
  a: 1
}

// index.ts
import * as lib_1 from './lib.cjs.js'
import lib_2 from './lib.cjs.js'
console.log(lib_1.default) // 预期结果：{a: 1}
console.log(lib_2.default)
```

> _值得一提的是，在 TS 历史版本中这种 case 甚至会出现意外的运行报错，如果你感兴趣，可以查看官方相关 Issues（[#38540](https://github.com/microsoft/TypeScript/issues/38540), [#38808](https://github.com/microsoft/TypeScript/pull/38808)）。_
