# VELA / HELM 双品牌视觉系统

更新日期：2026-04-26

## 品牌架构

**VELA** 是工作流品牌，中文副标题为“科研工作流环境”。英文全称为 **Versioned Evidence Lifecycle Architecture**。它强调版本化材料、证据生命周期、质量 gate 和 Codex 上下文交接，可独立安装到用户自己的 Codex 环境中。

**HELM** 是本地看板品牌，中文副标题为“本地科研看板”。英文全称为 **Handoff Evidence Ledger Monitor**。它强调本地项目状态、证据台账、产物索引、环境健康和交接准备，可作为独立桌面 app 使用。

公开表述必须使用：“可分别使用，组合后更顺手”。禁止写成 HELM 控制 VELA、VELA 依赖 HELM、或两者绑定安装。

## 命名边界

`research-autopilot` 只保留为内部技能、插件和兼容目录 ID，不作为公开产品品牌。公开材料不使用“科研自动化”作为联动对象；后续联动目标是 HELM 本地科研看板。

基础冲突检索不是商标审查。2026-04-26 的公开网页检索显示：`HELM` 与 Kubernetes 包管理器及 App Store Connect 工具存在同名语境；`VELA` 也有软件和行业公司同名结果。当前方案通过副标题、全称和科研工作流语境降低混淆，但正式发布前仍需商标、域名和应用商店检索。

参考：
- Helm 官方站点：https://helm.sh/
- Helm for App Store Connect：https://helm-app.com/
- Vela 广播合规软件：https://www.vela.com/
- Vela 电商工具：https://getvela.com/

## 视觉方向

核心风格：iOS 风格、淡蓝与白色、轻玻璃、低对比线稿、充分留白。2026-04-26 后续视觉以 `vela-helm-design-language-reference.png` 为主参考板。

禁止方向：
- 黑底科技感、霓虹、紫蓝渐变、机器人、聊天气泡、自动化流水线。
- 把 HELM 做成单纯控制台或把 VELA 做成 app 图标。
- 在生成图像里直接放文字。名称和副标题由代码、文档或设计稿排版。

锁定色板：
- Mist `#F5F8FF`：主页面底色、浅层背景。
- Sky `#E6F0FF`：二级背景、轻玻璃层。
- Sail `#BFD9FF`：VELA 帆面、浅蓝渐变中段。
- Ocean `#7FB4FF`：主交互蓝、图标高亮。
- Deep `#2563EB`：少量强调、路径节点、焦点态。
- Navy `#0F1F3D`：标题、反白底、主字色。
- Graphite `#64748B`：辅助文字、线性图标次级色。
- White `#FFFFFF`：主留白、卡片和高光。

字体建议：
- 展示字体：`Playfair Display`，仅用于品牌标题、海报标题和少量大号识别位。
- UI 字体：`Inter`，用于界面标签、正文、表格、按钮和说明文字。
- 中文环境优先使用系统 UI 字体；不要把中文标题做成夸张衬线风格。

图形母题：
- Layered Sail：VELA 的分层帆面，表达轻量包装、材料层、向前推进。
- Evidence Trace：带节点的弧线，表达证据路径、版本节点和检查点。
- Navigation Rings：HELM 的环形导航/状态感知，不表达控制权或执行器。
- Soft Wave Layers：用于背景和分区过渡，表达连续性和低噪声。

图标规范：
- 线性图标为主，圆角矩形容器，线宽保持轻，默认 Ocean/Graphite。
- 可以使用搜索、证据路径、集合、时间线、标签、人员、健康、设置等图标家族。
- 图标不得变成机器人、聊天气泡、魔法棒、火箭或重自动化符号。

## 核心资产

- VELA 工作流主标：`skills/assets/brand/vela-workflow-mark.png`
- HELM 看板图标母版：`skills/assets/brand/helm-local-board-icon-master.png`
- 双品牌同屏品牌板：`skills/assets/brand/vela-helm-brand-board.png`
- 参考板目录：`skills/assets/brand/reference/`
  - `vela-brand-board-reference.png`
  - `helm-brand-board-reference.png`
  - `vela-helm-relationship-board-reference.png`
  - `vela-helm-design-language-reference.png`

生成方式：ChatGPT-image2。图像不含文字，供后续代码和设计稿排版使用。

## 文案校正

参考板中的英文是视觉生成稿，不直接作为最终产品文案。需要保留视觉结构，但校正文案边界：
- `Workflow Environment Package` 可用于 VELA 英文副标题；中文仍为“科研工作流环境”。
- `Desktop Command Dashboard` 应改为 `Local Research Board` 或中文“本地科研看板”。
- `One system. Two roles.` 应改为 `Two independent products. One visual language.`，避免写成单一系统。
- `VELA executes` 和 `HELM directs` 应改为 `VELA structures workflow evidence` 与 `HELM reads local project state`，避免控制/执行依赖叙事。
- `Command center` 可作为视觉语气参考，不作为公开产品定位。

## 实施规则

VELA 侧：
- 第一屏应强调可独立安装、轻量包装、证据路径、步骤引导和交付物生成。
- 不做 app hero，不出现“下载 app 后才能用”的暗示。
- 主标可以使用 Layered Sail + Evidence Trace；小尺寸可只保留帆面和 2-3 个节点。

HELM 侧：
- 第一屏应强调本地项目状态、证据台账、交付物、环境健康和交接单。
- 可以使用 Navigation Rings + Direction Pointer，但语义是“看板导航/状态聚焦”，不是调度器或自动执行器。
- 图标母版保持圆角 app icon；侧栏小尺寸需要验证 16/32/128px 可识别。

## 图像提示词摘要

VELA：白底 iOS 风格、淡蓝半透明证据帆、生命周期路径和少量检查点，表达 Versioned Evidence Lifecycle Architecture。

HELM：白底 iOS 风格、淡蓝圆角 app icon、轻玻璃监测环、证据台账卡片和交接点，表达 Handoff Evidence Ledger Monitor。

双品牌板：16:9 白底，左侧 VELA、右侧 HELM，中间用轻连接手势表达可选互联，底部展示淡蓝白色板与基础形状。
