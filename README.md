<div align="center">
<h1>Opah</h1>

<p>An opinionated Typescript runtime optimized for developer experience.</p>
</div>

## Installation

opah is distributed as a docker image, so to run it just use the following alias:

```
alias opah='docker run --rm -v $PWD:/workdir -w /workdir netanelgilad/opah'
```

<hr />

## Features

### Running functions, not files

At the base of `opah` there is a magnificent and simple concept: the function. And so, the runtime runs a function, not a file (the function just happens to be written in a file). This is intended to drive developers to expose programmatic apis for everything, and avoid creating CLIs with complex parsing logics which you then need to generate complex strings, when all you want is to call a function.

And the interface between the human and the code is also through a function, and so when you run the `opah` cli, you provide the path to the container of your function (http or local file) and optionally the name fo the function to run. When no function name is provided, the default export is run.

### Staticly Analyzable Module Scope

Instead of having the module scope a part of the "runtime", with `opah` that scope is fully static. That means you can only
declare and/or export definitions at the module scope and no other statement is allowed. The totally analyzable module scope
provides the runtime a lot of visibility into the structure of the codebase and unlocks some superpowers:

- Functions can be serialized. The whole closure of functions in the module scope is analyzable and can be bundled into the definitions that are needed to create the function.
- There is a full dependency tree of all those definitions, that could be used for understanding the impact of a change in the codebase. This gives tooling the best insights into performing the minimal needed work on changes.
- More to come...

### Minimal Configuration

Working with typescript code should be an easy and boilerplate-free experience. That means no configuration is needed to get started and there is minimal configuration to support different use cases, by avoiding providing multiple configurations to do the same thing.

For now, that means:

- No `tsconfig.json`. All Typescript compiler options are handled by the runtime and are not configurable. The runtime will determine an opionated set of compiler options.

### Decoupling type checking and runtime

To have the best feedback loop during development with `opah`, type checking is not a prerequisite for running code. That means that you can still run your code even if it doesn't pass a type check. You can get feedback from your tests or run your code directly during a type refactor or just before getting all the types right.

For that, `opah` provides a separate `type-check` command that can be run to validate your code. Think of it as a smart linter that just focused on validating types :smiley:

### Integrated testing framework

Testing is an integral part of the development process, and so testing is a first class citizen in `opah`. To reduce the amount of fragmentation in the ecosystem and allow every `opah` developer to enter a new `opah` codebase and be able to run and write tests, the testing framework is integrated into the tool.

`opah` provides a `test` command to run tests that requires zero configuration to start writing tests.

### No package manager

`opah` follows in `deno`'s footsteps and removes the need for a package manager. The ECMAScript spec already provides a code dependency management solution with ES6 modules and so a package manager only provides more friction. And that same spec supports the dominant way of delivering code today, the HTTP protocol. So no need to re-invent the wheel here.

In `opah` there is no module resolution logic similar to `node.js`, but rather is lets you use HTTP for your dependencies. Publishing becomes as easy as uploading your code to a CDN, and consuming code requires nothing more than defining it in your `import` statements.

### Macros

Macros are a powerful language feature currently missing from the Typescript ecosystem. With `opah`, you can easily hook into the compilation process and extend the language as you see fit.

Macros should not be complicated, and should not be any different from authoring any other code. In `opah` macros are just functions alongside the code that it manipulates.
