# 私人 fork，自由改动上游文件

本仓库是 [xushengfeng/eSearch](https://github.com/xushengfeng/eSearch) 的私人定制分支，目标是叠加「常驻任务栏」与「剪贴板历史」两项能力，而非向上游回贡。

因此决定：不再刻意与上游保持兼容，可直接修改 `src/main/main.ts`、`src/ShareTypes.d.ts`、`lib/ipc.ts` 等公共文件。

理由：两项新需求都要改动主进程的窗口模型与 IPC 类型表，若坚持与上游兼容，需要引入大量特性开关与适配层，成本远高于收益。以后合并上游更新会产生冲突、需手工处理，这是有意接受的代价。

## Considered Options

- **用特性开关 / 独立模块隔离改动，保持可与上游合并** —— 放弃：两个需求都深入主进程窗口模型，隔离成本过高。
- **完全不改上游文件，做成外部插件** —— 放弃：Electron 主进程没有合适的插件机制。

## Consequences

- 后续 `git pull` 上游会产生冲突，需人工解决。
- `package.json` 名称、`electron-builder.config.js` 等发布配置可自由修改。
