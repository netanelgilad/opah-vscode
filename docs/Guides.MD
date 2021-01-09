# Guides

## How to access stdin/stdout

In `opah` there is no global object you acess that will allow you to interact with `stdin/stdout`. Instead, when calling a `opah` function
from the command line, you can pass _Magic Markers_ that `opah` will interpret and will pass the relevant streams to the called function.

For example, given the following function:

```ts
// echo.ts
export default function (stdin: Readable, stdout: Writeable) {
  stdin.pipe(stdout);
}
```

You'd be able to call it like so:

```sh
$ opah ./echo.ts {stdin} {stdout}
```
