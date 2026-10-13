# API 参考：会话

会话（Session）是一块画布上的**持久执行上下文**，给「一步一步往上加」的场景用：分步讲课、逐段搭建。从 [`surface.createSession()`](/api/surface) 创建；同一块画布同时至多一个活会话，开新的会先收旧的。

与 [`surface.run()`](/api/surface) 的区别：`run` 每次都是独立的一段，变量不跨次保留；会话把命名空间、桥与画布全程复用（**形态口径**：`run` / `createPlayback` 收完整 Manim 文件或裸 construct 体，分段这种形态只属于会话——见[行为契约](/guide/contracts)）——第 2 段直接引用第 1 段建的 `circle`，`self` 绑定常驻场景，顶层 `play` / `wait` 自动补 await。

```
surface.createSession()   → Promise<Session>
Session
├─ check(code)            → Promise<SessionVerdict>   干跑预检，不碰画布
├─ append(code)           → Promise<SessionAppend>    追加一段：预检 → 执行 → 成功入档
├─ count                  → number                    已提交段数（属性）
├─ source()               → string                    已提交段的文件投影
└─ dispose()              → void
```

段提交协议：`append` 先干跑预检（带已提交段的名字表）→ 过了才上画布执行 → **成功才入档**并给步号；失败**自动回滚**——新命名空间 + 清场 + 在**同一块桥**上极速重演已提交段，画面回到上一步的干净态。失败不占步号。

会话已销毁（`dispose()` 之后）时所有操作作废：回 `cancelled: true`。

## session.check(code)

干跑预检一段：带**已提交段的名字表**（按种类造存根：函数可调用、数存原值、算术退化 0），不碰画布、毫秒级。

```ts
check(code: string): Promise<SessionVerdict>

interface SessionVerdict {
  ok: boolean
  error?: string       // ok:false 时的原因（带还原后的行号）
  cancelled?: boolean  // 会话已销毁等「不是错误」的作废：调用方不应显示任何内容
}
```

**参数** `code`：一段源码。写**顶层语句**即可，不需要 `from manim import *`（会话开始时已注入）；要沿用上一步的变量就直接引用。

**返回** `SessionVerdict`。预检不通过是一个**结论**不是故障：`ok:false` 加 `error`，不抛。

**例子**

```ts
const verdict = await session.check('c.move_to(RIGHT * 2)')
if (!verdict.ok) console.log('这段过不了：', verdict.error)
```

**注意**

- 名字表按**种类**造存根：已提交段里是函数就能调用、是数就参与算术。所以个别形状错（如函数返回值当对象用）要到 `append` 真执行才报错——预检便宜就得容忍这类边角。
- 预检会真跑一遍代码（干跑），print 是有的，但被丢弃（不接到调用方输出上）。

## session.append(code)

追加执行一段：先预检，过了才上画布；成功入档并给步号，失败自动回滚到干净态。

```ts
append(code: string): Promise<SessionAppend>

interface SessionAppend extends SessionVerdict {
  step?: number   // 成功提交后的步号（从 1 计；失败不占号）
}
```

**参数** `code`：与 `check` 同款。段必须是**语法完整**的顶层语句序列（不能是一半的 `if`）。

**返回** `SessionAppend`。`ok:true` 时 `step` 是本步步号；失败时 `error` 给原因，画面已回到上一步的干净态。

**例子**

```ts
const result = await session.append('c = Circle(radius=1.2)\nself.play(Create(c))')
if (result.ok) console.log('第', result.step, '步入档')
else console.log('这一段没上板：', result.error)
```

**注意**

- 回滚是**重演**不是撤销：新命名空间 + 清场 + 把已提交段在同一块桥上极速再跑一遍（动画时长压到 0）。段的**终态**与原来一致；段里对画布之外的副作用（例如写文件）不会收回。
- 一段里的动画按顺序播完才算这一步完成：`append` resolve 时画面停在本段终态。
- 跨段的对象一直可用；要改一个已提交的对象，改在**新段**里（追加即修改）。

## session.count / session.source()

`count` 是已提交段数（属性，步号 = 段序）；`source()` 是已提交段的**文件投影**——段与段之间用空行相接，直接就是一个完整的 Python 文件。

**注意**

- `count` 只数**成功**的段。
- `source()` 是「重放这场讲解」的最小材料：可交给本机 CLI 导出 mp4（见[导出](/api/export)），也可存档重跑。

## session.dispose()

结束会话：释放命名空间；之后的操作全部作废（`cancelled: true`）。

**注意**

- 同一块画布上再开新会话会先自动收掉旧的；[`surface.dispose()`](/api/surface) 会级联销毁会话。
- 会话复用一块画布与一块桥（不闪、不换 canvas 元素）——失败能「极速重演」而不是重建画布，靠的就是这一点。

## 边界

会话只管**执行上下文**（命名空间、提交、回滚、步号）。旁白、停顿节奏、步预览快照、文稿 manifest 这类领域概念不在这里——它们归调用方（壳），判据是「换一个消费者还成立吗」。
