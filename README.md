<div align="center">
<h1>Depno</h1>

<p>An opinionated Typescript runtime optimized for developer experience.</p>
</div>

## Installation

depno is distributed as a docker image, so to run it just use the following alias:

```
alias depno="docker run --rm -v $PWD:/workdir -w /workdir netanelgilad/depno"
```

<hr />

## Features

### Minimal Configuration

Working with typescript code should be an easy and boilerplate-free experience. That means no configuration is needed to get started and there is minimal configuration to support different use cases, by avoiding providing multiple configurations to do the same thing.

For now, that means:

- No `tsconfig.json`. All Typescript compiler options are handled by the runtime and are not configurable. The runtime will determine an opionated set of compiler options.

### Decoupling type checking and runtime

To have the best feedback loop during development with `depno`, type checking is not a prerequisite for running code. That means that you can still run your code even if it doesn't pass a type check. You can get feedback from your tests or run your code directly during a type refactor or just before getting all the types right.

For that, `depno` provides a separate `type-check` command that can be run to validate your code. Think of it as a smart linter that just focused on validating types :smiley:

### Integrated testing framework

Testing is an integral part of the development process, and so testing is a first class citizen in `depno`. To reduce the amount of fragmentation in the ecosystem and allow every `depno` developer to enter a new `depno` codebase and be able to run and write tests, the testing framework is integrated into the tool.

`depno` provides a `test` command to run tests that requires zero configuration to start writing tests.

### No package manager

`depno` follows in `deno`'s footsteps and removes the need for a package manager. The ECMAScript spec already provides a code dependency management solution with ES6 modules and so a package manager only provides more friction. And that same spec supports the dominant way of delivering code today, the HTTP protocol. So no need to re-invent the wheel here.

In `depno` there is no module resolution logic similar to `node.js`, but rather is lets you use HTTP for your dependencies. Publishing becomes as easy as uploading your code to a CDN, and consuming code requires nothing more than defining it in your `import` statements.

### Macros

Macros are a powerful language feature currently missing from the Typescript ecosystem. With `depno`, you can easily hook into the compilation process and extend the language as you see fit.

Macros should not be complicated, and should not be any different from authoring any other code. In `depno` macros are just functions alongside the code that it manipulates.
