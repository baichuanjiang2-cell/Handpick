# 剪贴板监听从全量轮询改为 Win32 序号心跳

Status: accepted

**剪贴板历史** 的采集原来是主进程 `setInterval` 全量轮询（默认 500ms，下限 100ms）：每个 tick 打开系统剪贴板、遍历格式、尝试图片解码、算哈希去重。这是待机 CPU 的第一大来源，也是剪贴板里有大图时最重的路径。

改为两层结构（`src/main/clipboardSeq.ts` + `clipboardHistory.ts`）：

- **Win32 主路径**：通过 koffi（预编译 FFI，无需 node-gyp 工具链）调 `user32.GetClipboardSequenceNumber`，250ms 心跳读一个整数；序号没变直接跳过，序号变了才走完整采集。有效唤醒（真正打开剪贴板）只发生在剪贴板真的变化时。
- **无序号 API 的平台回退**：自适应轮询——基准间隔取设置里的「轮询间隔」，连续空转按 2ⁿ 放宽到最高 5s，一旦有变化立即恢复基准。

系统挂起（`powerMonitor` suspend）时停掉心跳，resume 后立即补采一次，睡眠期间的剪贴板变化不漏。暂停记录期间心跳仍跟踪序号但不采集，恢复时立刻看一眼当前剪贴板（保持旧行为：取消暂停即可见当前内容）。

## Considered Options

- **真·原生事件监听**（`AddClipboardFormatListener` 消息驱动，零定时器）— 放弃：需要 native addon + node-gyp 编译工具链 + 三平台预编译产物维护，成本不成比例；序号心跳的待机开销已是微秒级。
- **纯自适应轮询、不引依赖** — 放弃：空闲放宽会在「复制后等 2~5s 才进历史」的延迟与「常驻 500ms 全量读」之间二选一，两头都不如序号方案。
- **继续 500ms 全量轮询** — 放弃：每 tick 打开剪贴板并尝试解码图片格式，图片进剪贴板时是可感知的 CPU 尖峰。
- **250ms 心跳间隔** — 取舍：比旧默认 500ms 的采集延迟更低，同时单次成本只是读整数；不再让「轮询间隔」设置驱动 Windows 的节奏（该设置在 Windows 上退化为 no-op，仍作用于回退平台）。

## Consequences

- 新增运行时依赖 **koffi**（预编译 N-API 产物，与 Electron ABI 解耦；加载失败时自动回退自适应轮询，不会崩）。
- `tick()` 改为返回「是否有变化」，`readPayload` 只做一次 `clipboard.read()`（原来 files/image 各读一次）。
- **轮询间隔**设置项在 Windows 上不再生效——界面暂未隐藏它，文档以此为准。
