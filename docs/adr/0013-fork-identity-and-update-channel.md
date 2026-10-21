# 本分支对外的名义、链接与更新通道

Status: accepted

本仓库是 [ADR 0001](./0001-private-fork-diverging-from-upstream.md) 定义的私人定制分支。界面上原来把人指向**上游**的每一个入口，本版起按"谁的改动以谁的名义出现"重新分配：功能与安装包归**本分支**，代码署名与协作入口归**上游**。

## 以本分支名义

- `package.json` 的 `homepage` → `https://github.com/baichuanjiang2-cell/eSearch-paste/`，关于区的「项目主页」与「为项目点亮星标🌟」都吃这一个值。
- `package.json` 的 `description` → 「识屏 · 录屏 · 剪贴板历史 · 翻译」。它是关于区**标语**与安装包 exe「文件说明」的唯一来源，两处一起变。
- 启动日志的项目地址。
- 三处反馈入口（托盘/截屏报错的「反馈」、设置搜索无结果的「提交新功能」）与 `.github/ISSUE_TEMPLATE/` 两个模板里的提示文案 —— bug 提给改坏它的人，不再塞给原作者。
- 「帮助」按钮与 issue 模板里的文档链接 → 本分支的 `master` 分支。原来的写法是 `blob/${版本}`，而上游根本没有 `15.7.0` 这个 tag，**这两条链接在本版之前就是 404**。
- 检查更新的通道 → 本分支的 releases。

## 检查更新怎么读版本号

上游 release 的**名称**本身就是版本号，所以旧代码直接拿 `name` 比大小、拿它当 `更新.忽略版本` 的键、拿它拼安装包资产前缀 `eSearch-${name}-平台-架构`。本分支的 release 名称是中文标题（「eSearch-paste 15.7.0（纸墨界面）」），照搬会把三件事同时弄坏：比较拿标题比、忽略键存标题、下载按钮一个都不出现。

改成：版本一律从 `tag_name` 剥出来（去掉前导 `v` 与其后的非数字段，`v15.7.0-paste` → `15.7.0`），弹窗显示、大小比较、`更新.忽略版本` 都用这个剥壳值；资产前缀改成 `esearch_paste-`，与 `electron-builder.config.js` 的 `artifactName` 对齐。更新面板每一栏的标题仍显示 release 名称原文（它是人写的发布说明标题，不是版本号）。

面板取 releases 走 `网络.github镜像`，而镜像默认对简体中文开启、且镜像站会整站失效（实测 `ghfile.geekertao.top` 返回 429、`api.kkgithub.com` 连接失败，对上游仓库同样失败），所以 `fetchForkReleases` 在镜像失败或 8 秒超时时退回直连 `api.github.com`：镜像只是加速，不该成为单点。主进程的 `checkUpdate` 一直是硬编码直连，不经镜像，无需同步。

## 故意保留上游

以下几处看着像"忘了改"，其实是改坏功能的，清单与理由一并留档：

- `electron-builder.config.js` 与 `setting.ts` 里下载 OCR 模型、分割模型、ffmpeg、`ctrlc` 的 `xushengfeng/*` releases 地址 —— 这些是**依赖资源**，本分支仓库上没有这些文件，改指自己就是下载 404。
- `package.json` 的 `author`（`xsf / xushengfeng_zg@163.com`）—— 按 GPL 惯例保留原作者，它还会被 electron-builder 写进 exe 的公司/版权元数据。关于区只留一行「本软件基于 eSearch（xushengfeng）修改」，不再有邮箱与年份。
- `README.md` / `README_en.md` 里的 `© xushengfeng` 许可行，以及依赖包名 `@xushengfeng/fasttext_wasm`（那是 npm 包名，不是链接）。
- 「改进翻译」入口 → 上游 `lib/translate`：词条表和翻译工具在上游维护，引到本分支等于把人送到一个没人维护翻译的地方。这一行不是署名，是功能入口。
- 「教程帮助」（生词本）→ 上游 `master`：生词本是上游功能，本分支没改它。
- `lib/readme.md` 里 `kde-open-with`、`win_rect` 等地址：那些是作者另写的独立仓库，代码从那里取，不是本项目的身份链接。

## Considered Options

- **只改关于区，其余列清单待以后** — 放弃：启动日志、issue 模板、更新通道留着上游地址，用户按界面提示去搜 issue、看文档，找到的是没有这些功能的版本，比不改更容易误导。
- **更新通道保持上游** — 放弃：本分支的安装包在自己的 releases 上，继续指向上游等于提示用户去装那份装不出这套界面的版本。
- **切到自己仓库，但要求以后 release 名称写成纯版本号** — 放弃：已经用 `-paste` 后缀发了三个版本，改代码适配现状比给自己以后的发版习惯加一条隐形约束省事。
- **弹窗与忽略键用完整 release 标题** — 放弃：`更新.忽略版本` 里已经存着上游那种纯数字版本值，换成标题会让旧值对不上而一次性失效；标题里的中文括号对单人使用者没有信息量。
- **关于区彻底删掉上游署名** — 放弃：GPL-3.0 不要求在"关于"里署名，但公开 fork 留一行"基于谁"比完全消失更省事也更体面。
- **标语算作正文、或只当一次性例外** — 放弃：见 [ADR 0011](./0011-display-font-extended-to-settings.md)，它被升为**展示文字**的第七类角色「标语」。

## Consequences

- **上游发新版，本界面不再提示**。只看得见自己仓库的版本；跟进上游靠手动 merge（仓库里 `Merge branch 'xushengfeng:master'` 那个 commit 就是既有做法）。
- 版本比较与本分支的 tag 写法绑定。换命名规则要同步改两处 `releaseVersion`（`src/main/main.ts`、`src/renderer/setting/setting.ts`）—— 两个进程各留一份是刻意的，主进程与渲染进程不共享这个 helper。
- 反馈入口指向 fork 的 Issues。fork 是 clone 来的，`has_issues` 默认 `false`，**不开 Issues 这三处就是 404**；上游的自定义标签也不会被 fork 继承。2026-10-21 已在本分支仓库开 Issues 并补建 `新需求` 标签，仓库外的这两项设置不在版本控制里，重建仓库时要重来一遍。
- 「帮助」指 fork `master`，但那份 `docs/use/` 是从上游继承的，**不含控制中心、剪贴板历史、纸墨界面**。链接从 404 变成能打开，内容仍落后于功能，要补的是文档而不是链接。
- `description` 一处改动同时影响界面标语与安装包元数据；这两处分居 renderer 与打包阶段，没有运行时耦合。
- 新增两条文案（标语、基于声明）进入 `lib/translate/source.json`，7 个语言的译文由本轮代写，其中阿拉伯语与世界语没有母语者验证。旧条目一律不动。
