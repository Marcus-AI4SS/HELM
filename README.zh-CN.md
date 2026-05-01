<p align="center">
  <a href="https://marcus-ai4ss.github.io/HELM/">
    <img src="https://raw.githubusercontent.com/Marcus-AI4SS/HELM/main/site/assets/helm-icon.png" alt="HELM logo" width="112" />
  </a>
</p>

<h1 align="center">HELM</h1>

<p align="center">
  <strong>Hub for Evidence, Logs &amp; Monitoring</strong><br>
  本地项目看板：把项目状态、证据准备、已有文件、本机状态和给 Codex 的说明放在一个清楚的桌面视图里。
</p>

<p align="center">
  <a href="README.md">English</a>
  ·
  <a href="https://marcus-ai4ss.github.io/HELM/">公开站点</a>
  ·
  <a href="docs/tutorial.html">零基础教程</a>
  ·
  <a href="docs/install.html">安装</a>
  ·
  <a href="docs/imports/vela-helm-interface.md">VELA 接口</a>
  ·
  <a href="https://github.com/Marcus-AI4SS/VELA">VELA</a>
  ·
  <a href="PRIVACY.md">隐私</a>
</p>

## HELM 是什么

HELM = **Hub for Evidence, Logs & Monitoring**。它是本地项目看板，读取你电脑上的项目状态，并把当前阶段、阻塞点、材料、证据准备度、已有文件、本机状态和给 Codex 的说明集中展示出来。

研究推进仍回到 Codex。HELM 不提供聊天、写作、创建项目、一键研究、隐藏任务调度、引用核验或投稿自动化。它只帮助你看清“现在项目处在哪里”和“接下来该把什么交给 Codex”。

## 零基础怎么用

第一次打开 HELM，可以按这个顺序走：

1. 打开 HELM。
2. 如果没有项目，进入 **项目** 页面，复制接入说明。
3. 把接入说明交给 Codex，让 Codex 连接你的项目文件夹并准备本地上下文。
4. 回到 HELM，刷新页面。
5. 依次查看 **项目**、**证据**、**给 Codex 的说明**、**文件**、**本机** 五个页面。
6. 在 **给 Codex 的说明** 页面复制说明，回到 Codex 继续推进研究。

你不需要在 HELM 里创建项目。Codex 负责准备项目上下文；HELM 负责本地读取和展示。

## HELM 与 VELA

HELM 和 VELA 是职责分开的工具，可以协同使用，也可以分别独立使用。

| 工具 | 作用 | 能否单独使用 |
| --- | --- | --- |
| **VELA** = Versatile Experiment Lab & Automation | 为 Codex 准备可携带的项目结构、规则、交接模板和本地上下文 | 可以 |
| **HELM** = Hub for Evidence, Logs & Monitoring | 读取并展示本地项目状态、证据、文件、本机状态和给 Codex 的说明 | 可以 |

没有 VELA 时，HELM 可以显示空状态、公开安全示例或已配置项目状态。启用 VELA 时，HELM 可以读取 VELA 生成的项目上下文。两者共享产品语言，但不共享隐藏内存、云同步或后台任务。

两者共享两个公开接口方向：

- `vela.project.context.v1`：HELM 读取 VELA 项目状态。
- `helm.codex.handoff.v1`：HELM 准备给 Codex 的继续说明；VELA 只有在用户显式保存或导出时才应写入项目。

接口说明见 [VELA and HELM import interface](docs/imports/vela-helm-interface.md)。

## 五个页面

- **项目**：看项目是否已接入、当前阶段、阻塞点、材料和最近活动。
- **证据**：看证据来源层级和准备情况，不把“读到文件”误说成“已经证明”。
- **给 Codex 的说明**：复制给 Codex 的继续说明。
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

安装和构建说明见 [安装](docs/install.html)。

## 隐私边界

HELM 优先使用本地数据。本仓库没有遥测服务、托管后端、分析 SDK 或云同步层。公开发布内容不得包含个人研究材料、文献管理数据库、笔记库、浏览器资料、凭据或本地绝对路径。

见 [PRIVACY.md](PRIVACY.md)。

## 仓库结构

| 路径 | 用途 |
| --- | --- |
| `apps/desktop/` | React 和 Tauri 桌面应用 |
| `docs/` | GitHub Pages 公开站点、接口说明和同步记录 |
| `docs/imports/` | VELA 与 HELM 的导入接口 |
| `docs/sync-log/` | 本地跨仓同步记录 |
| `skills/` | HELM 使用的公开安全运行资源 |
| `site/` | 旧 Pages 源目录，保留用于兼容 |

## 发布状态

当前仓库处于公开源码候选状态。正式标签发布仍需要签名安装包、校验和、发布说明，以及 Windows/macOS 首次使用测试记录。
