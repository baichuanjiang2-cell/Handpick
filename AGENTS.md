# eSearch 项目指南

## 项目概述

eSearch 是一个基于 Electron 的跨平台桌面应用，提供截屏、OCR、搜索、翻译、贴图、屏幕翻译、以图搜图、滚动截屏、录屏等功能。

## 技术栈

- **框架**: Electron + electron-vite
- **语言**: TypeScript
- **包管理器**: pnpm
- **代码规范**: Biome (lint + format)
- **测试**: Vitest

## 常用命令

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm run dev

# 构建
pnpm run build

# 预览
pnpm run start

# 打包
pnpm run dist
```

## 项目结构

- **src/main/**: Electron 主进程，入口为 main.ts
- **src/renderer/**: 渲染进程，包含多个功能页面：
  - aiVision/ ai识图 作为主页面子页面
  - clip/ - 截屏功能
  - editor/ - **主页面**
  - ding/ - 贴图功能 还有贴图翻译
  - setting/ - 设置
  - photoEditor 高级图片编辑
  - recorder/ - 录屏（旧）
  - recorderTip/ - 录屏覆盖层，如显示倒计时、结束等
  - translate/ - 翻译，展示不同翻译器结果 作为主页面子页面
  - translator/ 屏幕翻译
  - videoEditor/ 超级录屏、普通录屏，包括跟踪鼠标、视频编辑

还有一些库
  - lib/ 杂项 公共功能
  - ocr/ - OCR相关
  - root/ 界面样式定义
  - screenShot/ 截屏库
- **src/ShareTypes.d.ts**: 共享类型定义

## 常用流程

ts修改都需要biome格式化(`pnpm run format`)和ts类型检查(`pnpm run typecheck`)，还要(`pnpm run lint`)

新文件可以`pnpm run fix`进行更强格式化和引入重排

关于注释，非必要不注释，只有不合常规或者代码算法逻辑过于复杂才需要。修改的内容，如以前是什么样，进行了什么行为，完全不用写进注释，diff和commit已经能描述

### 修改界面或者功能

使用dkh-ui创建、修改dom和css，单ts文件覆盖界面绘制

如果修改文本，需要修改翻译

不用测试

### 进程交互

一般是页面和主进程交互

lib/ipc.ts 添加了类型约束，需要在`Message`变量上添加名称、参数和返回值，主进程可以用`mainSend`发送消息给页面，或者`mainOn`监听消息，渲染进程页面通过`renderOn`等待主页面消息，或者`renderSend`发送到主页面，`renderSendSync`用于等待主页面返回

### 添加设置

`src/ShareTypes.d.ts`的`setting`变量添加

用`store.get('a.b.c')`或者`store.set('a.b.c',v)`获取和设置。

见[设置文档](./src/renderer/setting/readme.md)进一步操作

### 翻译

修改、添加、删除文本都需要处理翻译

`lib/translate/source.json`添加`"[原始中文]":""`，执行`node lib/translate/tool.js -u`即可为这个翻译文本创建id。具体翻译流程见[翻译文档](./lib/translate/readme.md)

## 改动说明（收尾怎么汇报）

每次改动收尾，要在**同一条回复**里给两段说明：**先专业版、后通俗版**。

- 用户自述**完全不懂技术**。专业版是给他扫硬信息用的（改了哪个文件、要不要重新打包、数据会不会动），机制类词第一次出现必须配一句人话；通俗版 3~5 行，按完全不懂技术写。
- 「影响」必写：行为变化 / 数据配置会不会动 / **要他做什么**（加粗）；有则写风险与回退、我没验证到的部分；性能只在有实测数字时才写。
- **只在任务收尾写一次**，中途不发文字进度；纯内部改动一句带过（「行为没变」）。
- 没做成的任务照写，且「我没验证到的部分」不许省。

完整规范（格式、小项顺序、纯内部改动的判定清单）见[改动说明规范](./docs/改动说明规范.md)。

## Agent skills

### Issue tracker

任务与规格发布为本地 markdown 文件（`.scratch/<功能>/` 下一票一文件）。See `docs/agents/issue-tracker.md`.

### Triage labels

五个默认分组标签（needs-triage / needs-info / ready-for-agent / ready-for-human / wontfix）。See `docs/agents/triage-labels.md`.

### Domain docs

单上下文：根目录 `CONTEXT.md` + `docs/adr/`。See `docs/agents/domain.md`.
