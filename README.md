<p align="center">
  <a href="https://marcus-ai4ss.github.io/HELM/">
    <img src="site/assets/helm-icon.png" alt="HELM logo" width="112" />
  </a>
</p>

<h1 align="center">HELM</h1>

<p align="center">
  本地项目看板：把项目状态、证据准备、已有文件、环境健康和给 Codex 的说明放在一个清楚的桌面视图里。
</p>

<p align="center">
  <a href="https://github.com/Marcus-AI4SS/HELM/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/Marcus-AI4SS/HELM/actions/workflows/ci.yml/badge.svg" /></a>
  <a href="https://github.com/Marcus-AI4SS/HELM/actions/workflows/pages.yml"><img alt="Pages" src="https://github.com/Marcus-AI4SS/HELM/actions/workflows/pages.yml/badge.svg" /></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-MIT-2563eb" /></a>
</p>

<p align="center">
  <a href="https://marcus-ai4ss.github.io/HELM/">公开站点</a>
  ·
  <a href="site/install.html">安装</a>
  ·
  <a href="site/tutorial.html">零基础教程</a>
  ·
  <a href="PRIVACY.md">隐私</a>
</p>

## HELM 是什么

HELM 是本地项目看板。它读取你电脑上的项目状态，并把当前阶段、阻塞点、材料、证据准备度、已有文件、环境健康和给 Codex 的说明集中展示出来。

研究推进仍回到 Codex。HELM 不提供聊天、写作、创建项目、一键研究、隐藏任务调度、引用核验或投稿自动化。它只帮助你看清“现在项目处在哪里”和“接下来该把什么交给 Codex”。

## 零基础怎么用

第一次打开 HELM，可以按这个顺序走：

1. 打开 HELM。
2. 如果没有项目，进入 **项目** 页面，复制接入说明。
3. 把接入说明交给 Codex，让 Codex 连接你的项目文件夹并准备本地上下文。
4. 回到 HELM，刷新页面。
5. 依次查看 **项目**、**证据**、**交给 Codex**、**文件**、**本机** 五个页面。
6. 在 **交给 Codex** 页面复制说明，回到 Codex 继续推进研究。

你不需要在 HELM 里创建项目。Codex 负责准备项目上下文；HELM 负责本地读取和展示。

## HELM 与 VELA

HELM 和 VELA 是职责分开的工具，可以协同使用。

| 工具 | 作用 | 边界 |
| --- | --- | --- |
| **VELA** | 提供本地工作上下文 | 生成项目事实、证据痕迹、校验结果和运行状态。 |
| **HELM** | 展示本地项目看板 | 读取并展示状态，帮助复制给 Codex 的说明。 |

VELA 可以提供本地工作上下文，HELM 读取并展示；研究动作仍在 Codex 中继续。没有 VELA 时，HELM 也可以显示空状态或公开安全的示例状态。

## 五个页面

- **项目**：看项目是否已接入、当前阶段、阻塞点、材料和最近活动。
- **证据**：看证据来源层级和准备情况，不把“读到文件”误说成“已经证明”。
- **交给 Codex**：复制给 Codex 的继续说明。
- **文件**：查看已有文件索引。
- **本机**：检查本机状态、本地检查结果和设置。

## 从源码运行

```powershell
cd apps/desktop
npm install
npm run build
npm run tauri dev
```

只做构建检查时可以运行：

```powershell
cd apps/desktop
npm run build
cd src-tauri
cargo check
```

从仓库根目录运行公开检查：

```powershell
powershell -ExecutionPolicy Bypass -File release/check-public-release.ps1
```

## 构建本地安装包

构建脚本会记录签名状态和校验和。没有签名证书时，它可以生成未签名的本地包。

```powershell
powershell -ExecutionPolicy Bypass -File release/build-public-artifacts.ps1
```

生成文件写入 `release/artifacts/`，不会提交到仓库。

## 隐私边界

HELM 优先使用本地数据。本仓库没有遥测服务、托管后端、分析 SDK 或云同步层。公开发布内容不得包含个人研究材料、文献管理数据库、笔记库、浏览器资料、凭据或本地绝对路径。

See [PRIVACY.md](PRIVACY.md).

## 仓库结构

```text
apps/desktop/        桌面应用
skills/              HELM 使用的公开安全运行资源
release/             发布检查、构建脚本、隐私扫描
site/                GitHub Pages 公开站点
.github/workflows/   CI、Pages 和构建流程
```

## 发布状态

当前仓库处于公开候选状态。正式标签发布仍需要安装包、校验和、发布说明，以及 Windows/macOS 首次使用测试记录。
