# 品牌更名：HandPick（信手拈来）

Status: accepted

本分支从 [ADR 0013](./0013-fork-identity-and-update-channel.md) 起就以自己的名义发布，但名字一直是「eSearch-paste」——程序名、安装标识、数据目录都还挂着上游的 eSearch。本 ADR 记录整体更名的决定：**项目名 HandPick-信手拈来，软件名 HandPick**。0013 里「保 appId 换升级兼容」的权衡随 productName 变更一并失效（数据目录反正要搬家，保留旧 appId 的唯一理由消失了），由本 ADR 取代。

## 改了什么

- `package.json`：`name` → `handpick`，`productName` → `HandPick`，`description` → 「HandPick · 信手拈来 —— 识屏 · 剪贴板历史 · 翻译」，`homepage` → `baichuanjiang2-cell/HandPick`。
- `electron-builder.config.js`：`appId` → `com.handpick.app`，`executableName` → `handpick`，`artifactName` 前缀 → `handpick-`。更新面板拼资产名的那一份（`setting.ts` 的 `baseName`）同步改，两处必须一致。
- 数据目录：默认从 `%APPDATA%\eSearch` 变为 `%APPDATA%\HandPick`。首次启动时若新目录还没有 `config.json` 且旧目录仍有 `config.json`，整体搬迁旧数据（`main.ts` 启动期迁移），配置、剪贴板历史、加密密钥照旧继承。迁移是复制不是移动，旧目录原样保留。
- 界面与文案：窗口标题前缀、剪贴板历史侧栏品牌字、关于区（「HandPick（信手拈来）基于 eSearch（xushengfeng）修改」）、默认保存前缀 `HandPick-`、导出文件名、SVG 元数据、启动日志、反馈/文档/更新链接全部切到新名与新仓库。
- 图标：以仓库 `assets/icon.svg`（1024×1024 矢量源）为唯一标准，`script/gen_icons.py` 一键生成全套——PNG 16~1024、`icon.ico`、`icon.icns`、托盘单色黑白与 macOS 模板、界面内 `logo.svg`。托盘单色取的是「去蓝底的图形轮廓」，不是整块圆角方。
- Linux 自启动：`assets/e-search.desktop` → `assets/handpick.desktop`，读写路径同步改。
- 内部标识（不影响用户数据格式）：临时目录、`/dev/shm` 临时文件、`HANDPICK_DEV` 环境变量、拖拽 MIME `handpick/sortable`、构建缓存目录、测试配置目录。

## 故意不改

- `author` 字段、`© xushengfeng` 许可行、关于区的上游署名 —— GPL 惯例 + [ADR 0013](./0013-fork-identity-and-update-channel.md) 的既定安排。
- npm 依赖名 `esearch-ocr` / `esearch-seg` / `@xushengfeng/fasttext_wasm`、OCR 与分割模型的 `xushengfeng/*` 下载地址 —— 那是上游的包与资源，不是本项目的身份。
- 「改进翻译」「生词本」等指向上游的**功能入口**。
- `docs/adr/` 里 0001~0015 的历史正文 —— ADR 是决策记录，不改写历史；冲突由本 ADR 声明取代关系。

## Considered Options

- **只改显示名，appId/executableName 保持上游** —— 放弃：0013 保留它们的唯一理由是安装记录与升级兼容，productName 一改数据目录就搬，兼容前提已经不存在；留着 `com.esearch.app` 反而让两个软件在 Windows 里共享安装身份。
- **数据目录跟随新名，不做迁移** —— 放弃：剪贴板历史与加密密钥都在旧目录，断了就是「升级即清空」，README 承诺过的继承会变成谎言；迁移只是首启一次 `cpSync`，成本极低。
- **迁移用移动而不是复制** —— 放弃：复制保留旧目录作后备，万一迁移有遗漏，旧数据还能找回；移动失败一半的状态没法回滚。
- **保留 eSearch-paste 作为仓库名，只改软件名** —— 放弃：GitHub 仓库已改名 Handpick，「项目名」与「软件名」不一致只会持续制造困惑；一次到位。

## Consequences

- 装过旧 `esearch_paste-*` 构建的机器需要**手动卸载旧版再装新版**（appId 不同，Windows 视为两个软件）；旧数据无需备份，首启自动迁移。
- 旧 `%APPDATA%\eSearch` 目录迁移后**不删除**，磁盘上会多留一份旧数据；确认新版正常后可手动清理。
- 上游官方版与 HandPick 现在是两个独立软件，可分别安装/卸载；但**不要同时运行**——全局快捷键与剪贴板监听仍会互相抢占。
- 发布 release 时资产名是 `handpick-<版本>-平台-架构`，版本号照旧从 `tag_name` 剥取（0013 的机制不变，只是前缀变了）。
- Linux 用户如果用过旧版的自启动，`~/.config/autostart/e-search.desktop` 不会自动清掉，需要在设置里关一次再开。
- 图标今后改动只改 `assets/icon.svg` 再跑 `python script/gen_icons.py`（依赖 `resvg-py` 与 `pillow`）。
