---
title: TS 番外篇1｜小心 const enum 常量枚举“陷阱” & 工程实践
date: 2024-4-27
lang: zh
duration: 15 min
description: const enum 使用时可能遇到的“陷阱”，以及在不同编译器中的工程实践
tag: TypeScript
place: 北京
---

# TS 番外篇1｜小心 const enum 常量枚举“陷阱” & 工程实践

<br/>

> **✨ AI 摘要**
> 
> 文章讨论了 `TypeScript` 中的 `const enum` 在不同编译器和配置下可能遇到的“陷阱”。通过详细介绍常量枚举的特性和局限性，以及不同编译器处理枚举的方式，文章旨在帮助开发者理解这些细节，以便在实际工程实践中做出更好的决策。
> 

## 背景知识

Ps：枚举“老司机”可以跳过这 part，直接跳进“陷阱”～

### 枚举 `Enum`

[枚举 Enum](https://www.typescriptlang.org/docs/handbook/enums.html) 可以说是 `TypeScript` 中相当特别的特性之一，它结合了类型系统的优点和数据结构的实用性，为开发者提供了一个表达固定集合值的高效方式。

- 作为一种 **“类型”**，枚举能够定义一组命名的常量，增强了代码的可读性和可维护性，防止将无效或不相关的值赋给变量，从而提高代码的健壮性。
- 作为一种 **“数据结构”**，枚举允许将一组相关的值组织在一起，每个成员可以有一个关联的值。而且数字枚举还支持反向映射，即可以通过枚举的值找到对应的名称，这为某些特定的使用场景如序列化和反序列化提供了便利。

TS 枚举可以分为三类：**数字枚举**（`Numeric enums`）、**字符串枚举**（`String enums`）、**异构枚举**（`Heterogeneous enums`, 前二者混合使用）。枚举在编译后的 JS 中生成一个 **枚举对象**，其中包含枚举值到枚举名的映射，以及**反向映射**（**`Reverse mappings`**, 数字枚举专属），如下所示。

```tsx
// ts
enum MyEnums {
  No = 0,
  Yes,
  Red = 'red',
  Blue = 'blue'
}
console.log(MyEnums.No)
console.log(MyEnums.Yes)
console.log(MyEnums.Red)
console.log(MyEnums.Blue)

// js
var MyEnums;
(function (MyEnums) {
    MyEnums[MyEnums["No"] = 0] = "No";
    MyEnums[MyEnums["Yes"] = 1] = "Yes";
    MyEnums["Red"] = "red";
    MyEnums["Blue"] = "blue";
})(MyEnums || (MyEnums = {}));
console.log(MyEnums.No);
console.log(MyEnums.Yes);
console.log(MyEnums.Red);
console.log(MyEnums.Blue);
```

特别地，编译后 `MyEnums["No"] = 0，MyEnums[0] = “No”`，不仅能 `key` 映射 `value`，也能从 `value` 映射 `key`，这就是数字枚举支持反向映射的原理。

### 常量枚举 `const enum`

常量枚举 `const enum` 与普通的 `enum` 的主要区别在于它们在 TS 编译到 JS 时的行为不同。正常来说它会在编译时不会生成对象，而是被完全**内联**，这意味着在生成的 JS 代码中，枚举的使用处会直接被替换为具体的字面量值。

```tsx
// ts
const enum MyConstEnums {
  No = 0,
  Yes,
  Red = 'red',
  Blue = 'blue'
}
console.log(MyConstEnums.No)
console.log(MyConstEnums.Yes)
console.log(MyConstEnums.Red)
console.log(MyConstEnums.Blue)

// js
console.log(0 /* MyConstEnums.No */);
console.log(1 /* MyConstEnums.Yes */);
console.log("red" /* MyConstEnums.Red */);
console.log("blue" /* MyConstEnums.Blue */);
```

这种在编译时的优化好处是：

1. **减少代码体积**：由于不需要生成枚举对象，因此减少了代码的总体积。
2. **提高性能**：内联替换不用运行时查找枚举对象，提高代码执行效率，减少运行时内存影响。

> *多数情况内联可以减少体积，但如果常量枚举值是特别长的字符串且引用多次，那么编译后代码体积反而可能会劣化，具体情况具体分析。*
> 

当然，常量枚举也有其局限性：

1. 不能在运行时动态使用，因为编译后不存在运行时的枚举“对象”。
2. 不支持反向映射，常量枚举的 key 只能是字符串。

> 以上的编译结果可以在 [ts-playground](https://www.typescriptlang.org/play?#code/KYOwrgtgBAsgngUXBAzlA3gKClAcgeygF4oAGAGmygE1gVKcAlYAE2KgHIAnVjhqAEIAbMMHYcARiOAdMAX0wBjfCBT4hwAHRD8AcwAU8JJBQBtUgF0AlEpVqN2vYcTIUm2ihvLV6rToNGrprMLF52vo4BLiaawqI2tqoALlCgkLBwAMJ2ScaoGFQE7BRUHvwh4jwsfFRxYiSS0rIK3vZ+TvDZyXlmlmE+Dv7OXSi5QR79bZHDOT3BrJMRQ52zQXU2QA) 中自由玩耍~
> 

## 何谓枚举“陷阱”？—— 溯源 TS

TS 默认配置下编译结果如前文所说，一切正常，但如果使用不同的 TS 编译配置甚至使用不同的 TS 编译器（比如 `ts-loader`,`babel`,`ebsuild` 等等），那么 `const enum` 的编译结果也会有差异，这就是所谓的枚举“陷阱”。

### `isolatedModules` 选项

TS 编译选项 [isolatedModules](https://www.typescriptlang.org/zh/tsconfig/#isolatedModules) 字面意思是 “独立模块”，不懂没关系，它其实是用来形容某些 `file-by-file` 编译器的编译行为的。等等，`file-by-file` 又是什么鬼，客官别急。如果不是使用官方 `tsc` 而是使用 TS 暴露的 `ts.transpileModule` API ，或者底层使用此 API 的编译器，比如开启 `transpileOnly` 的 `ts-loader` ，他们的编译模式都是一次编译一个文件，这就叫 `file-by-file` 编译模式。

因为编译 ts 文件时会“忽视”类型相关代码，比如全局声明文件 `global.d.ts` 以及引用的 `mport type` 在编译时都会被“擦除”，所以编译也更快，性能更好，但随之而来的缺点是因为缺少类型推断，导致编译结果也会出现差异甚至出现运行时错误。那我们怎么能够模拟 `file-by-file` 编译器并及时检查代码呢？这时候就是 `isolatedModules` 选项出现的意义了，它能让我们编写的 TS 代码能够更安全地被此类编译器编译，及时发现潜在问题。

历史发展来看，后起的支持 TS 的编译器，比如 [babel](https://babeljs.io/), [esbuild](https://esbuild.github.io/) 等等，也都是遵循 `isolatedModules` 模式，或者往和 `isolatedModules` 对齐的方向发展的。

`const enum` 的内联特性依赖于 TS 编译器能够查看到整个项目的类型信息，从而确定这些枚举在哪里被使用，并将它们替换为具体的值。当 `isolatedModules` 开启时，编译器只能看到单个文件，没有足够的信息来确认是否所有对 `const enum` 的使用都是安全的，即不需要保留枚举对象，所以 TS 选择将 `const enum` 当作普通的 `enum` 处理，以确保在不同文件间的引用不会因为缺失实际的枚举对象而导致运行时错误。实际上，不仅是 `export const enum`，单文件中的 `const enum` 也会降级为 `enum`，说一句“粗暴”应该不过分吧。

开启 `isolatedModules` 后的编译结果如下所示（[TS-playground](https://www.typescriptlang.org/play/?isolatedModules=true#code/KYOwrgtgBAsgngUXBAzlA3gKClAcgeygF4oAGAGmygE1gVKcAlYAE2KgHIAnVjhqAEIAbMMHYcARiOAdMAX0wBjfCBT4hwAHRD8AcwAU8JJBQBtUgF0AlEpVqN2vYcTIUm2ihvLV6rToNGrprMLF52vo4BLiaawqI2tqoALlCgkLBwAMJ2ScaoGFQE7BRUHvwh4jwsfFRxYiSS0rIK3vZ+TvDZyXluBGE+Dv7OXSi5QR79bZHDOT3BrJMRQ52zQXU2QA)）：

```tsx
// ts
const enum MyConstEnums {
  No = 0,
  Yes,
  Red = 'red',
  Blue = 'blue'
}
console.log(MyConstEnums.No)
console.log(MyConstEnums.Yes)
console.log(MyConstEnums.Red)
console.log(MyConstEnums.Blue)

// js
var MyConstEnums;
(function (MyConstEnums) {
    MyConstEnums[MyConstEnums["No"] = 0] = "No";
    MyConstEnums[MyConstEnums["Yes"] = 1] = "Yes";
    MyConstEnums["Red"] = "red";
    MyConstEnums["Blue"] = "blue";
})(MyConstEnums || (MyConstEnums = {}));
console.log(MyConstEnums.No);
console.log(MyConstEnums.Yes);
console.log(MyConstEnums.Red);
console.log(MyConstEnums.Blue);
```

#### 实践建议

1. 如果你项目中采用 file-by-file 编译器（比如 `babel`/`babel-loader`, `esbuild` 等等，除 `tsc` 之外基本都是，还有开启 `transpileOnly` 的 `ts-loader`），那么强烈建议开启 `isolatedModules` ，因为开启后在 CI 类型检查（安全起见最好有此环节）环节可以更及时地发现潜在问题。
2. 如果采用 `tsc` 或者 `ts-loader`（关闭 `transpileOnly` 选项），那么可以不开启 `isolatedModules`。

### `preserveConstEnums` 选项

顾名思义，TS 编译选项 [preserveConstEnums](https://www.typescriptlang.org/tsconfig/#preserveConstEnums) 是保留常量枚举的意思，设置会 `true` 后，`const enum` 编译后不会被”擦除”而是和 `enum` 一样编译为枚举对象，但不会存在运行时追踪，因为内联特性依然保留。

默认情况下该选项是 `false`，但是如果开启 `isolatedModules` 时，该选项默认为 `true` 。

开启 `preserveConstEnums` 后的编译结果如下所示（[TS-playground](https://www.typescriptlang.org/play?preserveConstEnums=true#code/KYOwrgtgBAsgngUXBAzlA3gKClAcgeygF4oAGAGmygE1gVKcAlYAE2KgHIAnVjhqAEIAbMMHYcARiOAdMAX0wBjfCBT4hwAHRD8AcwAU8JJBQBtUgF0AlEpVqN2vYcTIUm2ihvLV6rToNGrprMLF52vo4BLiaawqI2tqoALlCgkLBwAMJ2ScaoGFQE7BRUHvwh4jwsfFRxYiSS0rIK3vZ+TvDZyXluBGE+Dv7OXSi5QR79bZHDOT3BrJMRQ52zQXU2QA)）：

```tsx
// ts
const enum MyConstEnums {
  No = 0,
  Yes,
  Red = 'red',
  Blue = 'blue'
}
console.log(MyConstEnums.No)
console.log(MyConstEnums.Yes)
console.log(MyConstEnums.Red)
console.log(MyConstEnums.Blue)

// js
var MyConstEnums;
(function (MyConstEnums) {
    MyConstEnums[MyConstEnums["No"] = 0] = "No";
    MyConstEnums[MyConstEnums["Yes"] = 1] = "Yes";
    MyConstEnums["Red"] = "red";
    MyConstEnums["Blue"] = "blue";
})(MyConstEnums || (MyConstEnums = {}));
console.log(0 /* MyConstEnums.No */);
console.log(1 /* MyConstEnums.Yes */);
console.log("red" /* MyConstEnums.Red */);
console.log("blue" /* MyConstEnums.Blue */);
```

这个选项仅仅保留了枚举对象源码，看起来似乎有点“多余”，我想到的可能主要有两种适用场景：

1. 可能是让 `const enum` 拥有了和 `enum` 一样的运行时特性，这样就可以使用数字枚举的反向映射以及在运行时动态使用枚举值（*运行时没问题但 IDE 和编译时类型检查可能会报错常量枚举的索引值只能是 `string` 字面量*）。
2. 如果你编写的 `library` 最终想要导出 `const enum` 供其他库的使用者调用，那么编译后也需要保留枚举对象，这样在其他项目中就能够正常引入 `library` 中导出的枚举了。*(Vue3遇到过此类困境，下面会细说）*

### `declare const enum`

1. 正常情况下（关闭 `isolatedModules` ），在 `.d.ts` 声明文件中使用 `decalre const enum` 时，因为编译时会完全内联，没有问题。当然如果你是单独编译某个文件，你需要确保 `.ts` 文件正确引用了 `.d.ts` 文件，比如：
    
    ```tsx
    // global.d.ts
    declare const enum Color {
      Red,
      Green,
      Blue,
    }
    
    // index.ts
    /// <reference path="global.d.ts" /> // tsc 编译单文件时需要额外引用 .d.ts
    console.log(2 /* Color12.Green */);
    ```
    
2. 但开启 `isolatedModules` 时，当在 `.d.ts` 声明文件中使用 `decalre enum` 时，由于每个文件被视为独立模块，且编译器不执行跨文件的全局类型分析，它不能保证在所有使用处，`const enum` 的成员都能被正确替换为具体的值。因此，使用 `declare const enum` 会导致编译错误，因为编译器不能确保其安全性和正确性。即使执行编译后的代码也会导致运行时错误，因为不存在运行时枚举对象。
    
    ```tsx
    // global.d.ts
    declare const enum Color {
      Red,
      Green,
      Blue,
    }
    
    // index.ts
    console.log(Color.Green) // ❌ 类型检查报错
    // ❌        ^ 
    // ❌ Cannot access ambient const enums when 'isolatedModules' is enabled.ts(2748)
    
    // index.js
    console.log(Color.Green); // ❌ 运行时报错
    // ❌        ^
    // ❌ ReferenceError: Color is not defined
    ```
    

另外， `declare enum` 区别于 `declare const enum`，当你使用 `declare enum`，你是在告诉 `TypeScript` 这里有一个枚举类型存在，但是它的实现细节可能在别处定义。因此，`declare enum` 被视为有一个实际的枚举对象会在运行时存在，即使在 `isolatedModules` 模式下，即使你从未实际定义这个枚举，`TypeScript` 编译器也不会在编译时报错，但实践中需要注意确保所有 `declare enum` 在运行时有对应的实现。

### “陷阱”总结

总的来说，TS 的常量枚举编译后导致的“陷阱”可能是：

1. 开启 `preserveConstEnums` 或者 `isolatedModules` 时，`const enum` 编译后并不会被“擦除”而是和 `enum` 一样编译成了枚举对象。
2. 通常情况下（没有开启 `isolatedModules` ），使用 `.d.ts` 声明文件中 `enum` 会导致运行时报错（因为类型文件编译后会被“擦除”），但 `const enum` 正常（因为编译时会被内联，运行时也不需要了）。
3. 开启 `isolatedModules` 时，使用 `.d.ts` 声明文件中 `const enum` 仍然和 `enum` 一样会出现运行时报错（因为此时 `const enum` 和 `enum` 一样编译成了对象）。

## 常见的 TS 编译器工程实践

上面，我们理解了“官方” `tsc` 编译器是如何处理（常量）枚举的。接下来我们看看常见的一些主流编译打包工具又是如何处理枚举的。

### ts-loader —— 请留意 `transpileOnly`

[ts-loader](https://github.com/TypeStrong/ts-loader) 是一个 TypeScript 的 webpack loader，它负责在 webpack 构建过程中处理 TypeScript 文件。`ts-loader` 提供了多种配置选项，其中 [transpileOnly](https://github.com/TypeStrong/ts-loader?tab=readme-ov-file#transpileonly) 是一个重要的选项，它指示 loader 仅进行语法转换而不执行类型检查（用法如下）。众所周知，在规模较大的项目中如果不开启 `transpileOnly` ， 编译耗时将惨不忍睹。

```jsx
module.exports = {
  ...
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true
            }
          }
        ]
      }
    ]
  }
}
```

#### `transpileOnly` 带来的“陷阱“

正如前面提到过的，启用 `transpileOnly` ，ts-loader 将变为 `file-by-file` 编译模式，和开启 `isolatedModules` 模式表现一致。因此需要注意前文所说的 `isolatedModules` 模式下的“陷阱”，比如 `const enum` 并不会被内联替换，而是降级为 `enum` 一样编译为枚举对象。

> ts-loader 中这个 [issue](https://github.com/TypeStrong/ts-loader/issues/331#issuecomment-647171138) 有人反馈过开启 `transpileOnly` 时的疑惑，这位老哥回答的很棒～
> 

#### 实践建议

虽然开启 `transpileOnly` 可以大幅提升编译速度，特别是在大型项目中，但是对于使用 `const enum` 的项目，这可能会导致性能损失和代码体积增加。因此，在实际开发中，我们建议根据项目的具体需求来权衡：

- **对于依赖 `const enum` 的项目**：建议可以关闭 `transpileOnly` 以保持 `const enum` 的优势，尤其是在关键性能需求较高的项目中。
- **对于不太依赖 `const enum` 或对编译速度有更高要求的项目**：可以考虑启用 `transpileOnly`，特别是在初期开发阶段或者进行快速迭代时，同时建议在 tsconfig 中同步开启 `isolatedModules` 以配合进行更安全的类型检查。

### babel —— 可选优化的“保守派”

babel 在 [v7.15.0](https://babeljs.io/blog/2021/07/26/7.15.0#new-typescript-features-13324-13528) 版本开始支持 `const enum` 语法，默认编译结果和开启 `—-isolatedModules` 选项的 TS 对齐，无须多言。惊喜的是，它还带来了一个优化选项 `optimizeConstEnums`。

> 源码实现：https://github.com/babel/babel/pull/13324
> 

#### `optimizeConstEnums` 优化选项

plugin 和 preset 7.15.0 新增了优化选项 `optimizeConstEnums`（默认关闭），开启后针对**当前文件内部使用**的 `const enum` 会在编译时进行内联替换，和默认（关闭 `isolatedModules` 选项）的 `tsc` 输出表现一致。

```jsx
// Input
const enum Animals {
  Fish
}
console.log(Animals.Fish);

// Default output
var Animals;
(function (Animals) {
  Animals[Animals["Fish"] = 0] = "Fish";
})(Animals || (Animals = {}));
console.log(Animals.Fish); // 😟

// `optimizeConstEnums` output
console.log(0); // 🙂
```

但请注意，**导出**的 `export const enum` 会编译成普通对象。因为 `babel` 终究还是 `file-by-file` 编译，不能跨文件检查类型。

```jsx
// Input
export const enum Animals {
  Fish,
}

// `optimizeConstEnums` output
export var Animals = {
  Fish: 0,
};
```

### esbuild —— 默认优化的“激进派”

esbuild 和 babel 一样是遵循 `isolatedModules` 模式。上面提到 babel 创新的 `optimizeConstEnums` 优化选项可以内联非导出的 `const enum` ，但此优化选项默认是关闭的，“保守派”了属于是。相比而言，`esbuild` 可以称之为“激进派”，因为它默认会优化，而且力度更大！`esbuild` 对于 `const enum` 和 `enum` 的处理没有区别都会进行优化，都会在单文件中进行内联，甚至可以进行 `cross-modules` 级别跨文件内联（仅限 `ESM` 导入导出和 `bundling` 打包阶段）。what? 搞这么帅是吧？！

> 更多细节可以参考 [issue](https://github.com/evanw/esbuild/issues/128#issuecomment-1002341244)
> 

esbuild 编译结果如下所示（[esbuild-playground](https://hyrious.me/esbuild-repl/?version=0.20.2&t=const+enum+MyConstEnums+%7B%0A++No+%3D+0%2C%0A++Yes%2C%0A++Red+%3D+%27red%27%2C%0A++Blue+%3D+%27blue%27%0A%7D%0Aconsole.log%28MyConstEnums.No%29%0Aconsole.log%28MyConstEnums.Yes%29%0Aconsole.log%28MyConstEnums.Red%29%0Aconsole.log%28MyConstEnums.Blue%29&o=--loader%3Dts+%22--tsconfig-raw%3D%7B%5C%22compilerOptions%5C%22%3A%7B%5C%22useDefineForClassFields%5C%22%3Afalse%2C%5C%22experimentalDecorators%5C%22%3Atrue%2C%5C%22verbatimModuleSyntax%5C%22%3Atrue%7D%7D%22)）：

```tsx
// ts
const enum MyConstEnums {
  No = 0,
  Yes,
  Red = 'red',
  Blue = 'blue'
}
console.log(MyConstEnums.No)
console.log(MyConstEnums.Yes)
console.log(MyConstEnums.Red)
console.log(MyConstEnums.Blue)

// js
var MyConstEnums = /* @__PURE__ */ ((MyConstEnums2) => {
  MyConstEnums2[MyConstEnums2["No"] = 0] = "No";
  MyConstEnums2[MyConstEnums2["Yes"] = 1] = "Yes";
  MyConstEnums2["Red"] = "red";
  MyConstEnums2["Blue"] = "blue";
  return MyConstEnums2;
})(MyConstEnums || {});
console.log(0 /* No */);
console.log(1 /* Yes */);
console.log("red" /* Red */);
console.log("blue" /* Blue */);
```

#### 结合 `tree-shaking` 优化

诶，上面的编译结果怎么还保留了枚举对象捏？看起来岂不是和前文中的 `preserveConstEnums` 表现一致？🤔

其实不然，有个细微区别在于 枚举对象中的 `/* @__PURE__ */` 关键注释！[Pure  标记](https://esbuild.github.io/api/#pure) 是一种常见的 JS 工具和压缩工具约定的一种特殊注释，可以帮助代码打包时更好地进行 `tree-shaking` 。这里标记 `IIFE` 为 `Pure` 后，如果枚举对象如果没有被使用，`esbuild --bundle` 打包时或着压缩工具（比如 `Terser` ）自然会 drop 掉枚举对象从而减少代码体积。

### Vue3 源码中的工程实践

一切可以从 Vue3 中 2021 年的一个枚举相关 [issue](https://github.com/vuejs/core/issues/1228) 说起，当时有用户反馈 Vue3 中 `.d.ts` 中的 `const enum` 在开启 `isolatedModules` 时，类型检查会报错（前文提到的），之后也陆续其他用户反馈相关问题，常量枚举的困扰直到 2023 年 Vue3 才完全落实修复。最终的 [修复 PR](https://github.com/vuejs/core/pull/9261) 中的方案还是挺有意思的，主要改动：

1. 将所有 `const enum` 改为 `enum`。
2. 通过自定义插件 `inline-enum` （[源码](https://github.com/vuejs/core/blob/main/scripts/inline-enums.js)）将 `enum` 编译为 **const 对象** 而非 **枚举对象**，这是因为前者更有利于编译工具进行 `tree-shaking` 以及实现和内联替换相似效果。

> 关于第 2 点在 `terser` 中的对比验证如下：
> 

```tsx
// before
// 枚举对象
var MyConstEnums1 = /* @__PURE__ */ ((MyConstEnums2) => {
  MyConstEnums2[MyConstEnums2["No"] = 0] = "No";
  MyConstEnums2[MyConstEnums2["Yes"] = 1] = "Yes";
  MyConstEnums2["Red"] = "red";
  MyConstEnums2["Blue"] = "blue";
  return MyConstEnums2;
})(MyConstEnums || {});
console.log(MyConstEnums1.No);
// const 对象
var MyConstEnums2 = {
  No: 0,
  Yes: 1,
  Red : "red",
  Blue : "blue",
  0: "No",
  1: "Yes"
}
console.log(MyConstEnums2.Yes);

// after terser
// 枚举对象全量存在
var o=(o=>(o[o.No=0]="No",o[o.Yes=1]="Yes",o.Red="red",o.Blue="blue",o))(MyConstEnums||{});
console.log(o.No);
// const 对象成功 tree-shaking 并且达到内联替换效果
console.log(1);
```

又学到了一个 `tree-shaking` 小技巧有木有🤪～

这也为我们在编写 library 时带来了最佳实践启示，通过 `tree-shaking` 主要可以避免 `library` 使用方项目体积劣化，否则如果引入了一个体积超大的枚举对象，虽然仅仅使用了枚举中的一个值，但打包后也会引入全量的枚举对象代码，导致体积劣化。

## 后记

总的来说，所谓的常量枚举‘陷阱’源于不同编译器和配置下编译方式的差异。理解底层编译原理和根本原因之后，我们就能更好地将理论应用于实践，根据不同的编译环境优化代码，并选择最适合的编译配置。