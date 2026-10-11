<!-- 本文件由 scripts/gen-examples-docs.mjs 生成，不要手改：改语料或翻译表后重跑脚本。 -->

# Syntax (offline)

Comprehensions, unpacking, closures, generators, dataclasses, decorators, exceptions and context managers — manim plus the standard library only, runnable offline.

This page lists 6 examples. The code is imported from `corpus/examples/syntax/`; the screenshots are end states rendered on real machines.

## Syntax: comprehensions, unpacking and generator expressions building a scene

The mobjects built by comprehensions, unpacking and generator expressions match the source logic in count and layout (the print assertions are authoritative).

::: code-group

<div class="vp-block active" data-title="Rendered">
<img src="../../../corpus/shots/syntax/01-comprehensions.png" alt="Syntax: comprehensions, unpacking and generator expressions building a scene" />
</div>

<<< @/../corpus/examples/syntax/01-comprehensions.py[Code]

:::

## Syntax: closures, generator functions and itertools chains

Closures, generator functions and itertools chains build their mobjects normally, with counts matching the itertools output.

::: code-group

<div class="vp-block active" data-title="Rendered">
<img src="../../../corpus/shots/syntax/02-closures-itertools.png" alt="Syntax: closures, generator functions and itertools chains" />
</div>

<<< @/../corpus/examples/syntax/02-closures-itertools.py[Code]

:::

## Syntax: dataclass, decorators and class attributes together

dataclass, decorators and class attributes run through; the mobjects built match the data.

::: code-group

<div class="vp-block active" data-title="Rendered">
<img src="../../../corpus/shots/syntax/03-dataclass-decorator.png" alt="Syntax: dataclass, decorators and class attributes together" />
</div>

<<< @/../corpus/examples/syntax/03-dataclass-decorator.py[Code]

:::

## Syntax: exception handling, context managers and custom exceptions

The exception is caught and the context manager enters and exits normally (the print assertions are authoritative); the picture renders normally.

::: code-group

<div class="vp-block active" data-title="Rendered">
<img src="../../../corpus/shots/syntax/04-try-context.png" alt="Syntax: exception handling, context managers and custom exceptions" />
</div>

<<< @/../corpus/examples/syntax/04-try-context.py[Code]

:::

## Syntax: unpacking, formatting, slicing and sorting

Unpacking, formatting and slice/sort results are correct (the print assertions are authoritative).

::: code-group

<div class="vp-block active" data-title="Rendered">
<img src="../../../corpus/shots/syntax/05-unpack-format.png" alt="Syntax: unpacking, formatting, slicing and sorting" />
</div>

<<< @/../corpus/examples/syntax/05-unpack-format.py[Code]

:::

## Syntax: iterating a VGroup (for, comprehension, out-of-range index)

for over a VGroup terminates normally (it does not iterate forever) and an out-of-range index raises IndexError.

::: code-group

<div class="vp-block active" data-title="Rendered">
<img src="../../../corpus/shots/syntax/06-group-iteration.png" alt="Syntax: iterating a VGroup (for, comprehension, out-of-range index)" />
</div>

<<< @/../corpus/examples/syntax/06-group-iteration.py[Code]

:::
