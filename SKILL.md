---
name: Store Screenshots
description: Generate pixel-perfect App Store / Google Play / AppGallery (HarmonyOS) listing screenshots and iPhone Duo assets from real app captures, with layouts, themes, localization, exact platform sizes, App Preview poster frames and RGB/no-alpha validation. Use for 应用商店截图、上架截图、iPhone Duo、iPhone/iPad/Android/HarmonyOS 商店图.
---

# Store Screenshots

从真实 App 截图生成可直接上传的应用商店截图。本地渲染，无需 npm 依赖；需要 Node 18+ 和已安装的 Chrome / Chromium / Edge，以精确像素尺寸输出。

支持：

- **iOS / iPadOS**：iPhone 6.9"、6.3"（2026 必需尺寸）、6.5"、5.5"、iPhone Duo 外屏/内屏、iPad 13"、11"，支持横屏。
- **Android / Google Play**：手机 1080×1920 / 1440×2560，平板 1200×1920 / 1600×2560。
- **HarmonyOS / AppGallery**：手机 1080×1920，平板 1600×2560，支持横屏。
- **iPhone Duo**：外屏 1398×2034，内屏 2007×2853；横屏自动交换。另提供 886×1920 / 1920×886 的 App Preview **首帧海报**预设（注意：App Preview 本身必须上传视频）。
- 任意自定义尺寸，如 1024×500 feature graphic、折叠屏。
- 4 种版式：`hero`、`split`、`minimal`、`detail`（特写卡片）。
- 8 套主题、品牌 logo、评分/徽章、背景图、多语言批量输出。
- 输出 `manifest.json`（含 SHA-256）和 `preview.html`，生成后校验尺寸、alpha、文件大小。

> 设计流程参考了开源项目 NimoteShot 的思路（真实截图、本地渲染、多语言、尺寸校验），代码为独立实现。

## 快速开始

> 以下命令在仓库根目录执行。作为 skill 安装后，把 `scripts/generate.mjs` 换成
> `~/.config/opencode/skills/store-screenshots/scripts/generate.mjs` 的绝对路径。

```bash
# 1. 检查 Node 和浏览器（会做一次 320×480 测试渲染）
node scripts/generate.mjs --doctor

# 2. 先跑内置演示：合成素材，不涉及真实产品
node scripts/generate.mjs examples/demo/demo.config.json --dry-run
node scripts/generate.mjs examples/demo/demo.config.json
node scripts/generate.mjs --verify examples/demo/out

# 3. 复制模板，改成自己的截图路径和文案
cp examples/template.config.json ./my-app.config.json
# 编辑 image 路径后再预览、生成、校验
node scripts/generate.mjs ./my-app.config.json --dry-run
node scripts/generate.mjs ./my-app.config.json
node scripts/generate.mjs --verify ./store-shots
```

查看所有尺寸：

```bash
node scripts/generate.mjs --list-presets
```

`npm run demo` / `npm run verify -- examples/demo/out` 是上面演示命令的快捷方式。
英文说明见 `README.md`，中文说明见 `README.zh-CN.md`。

## 工作流

1. **收集真实截图**
   - 让用户提供模拟器/真机原始截图（PNG/JPEG，不要带外壳、投影或已排版好的商店图）。
   - 至少 3 张：核心界面、关键流程、进度/结果。少于 3 张时用 `minimal` 单图版式，不要硬凑。
   - 分辨率建议不低于 1080px 宽；低清图不要放大，要求重新截图。

2. **读懂每张图**
   - 用 `read` 工具查看每张原始截图，确认画面上真实存在的功能；不要写截图里看不到的能力。
   - 为每张图写一句核心利益点。标题 3–10 个字/2 行以内，副标题一句话。
   - 如果有多个语言版本，使用 `title` / `subtitle` / `eyebrow` / `badge` 的对象写法，避免为每个语言复制整套配置。

3. **选择平台和尺寸**
   - iPhone 至少输出 **6.3"**（2026 App Store 必填的 Dynamic Island medium）；同时输出 6.9" 作为高清主图更稳妥。
   - App 支持 iPad 时必须输出 **iPad 13"**。
   - Google Play 手机至少 2 张，建议 4–8 张；AppGallery 常见 3–5 张。
   - 竖版素材用竖版预设；横版 UI 用 `"orientation": "landscape"` 或横版自定义尺寸。

4. **套版式与主题**
   - 第一张：`hero` 或 `minimal`，最强价值主张。
   - 第二张：`split`，展示关键流程或深色模式。
   - 第三张：`hero` / `detail`，展示结果、数据或细节。
   - 同一套图保持统一主题；不同语言只换文案，不换布局。
   - 参考 `references/design-guide.md`。

5. **生成并逐张检查**
   - 先 `--dry-run`，再生成。
   - 必须逐张用 `read` 查看生成的 PNG，检查：
     - 标题是否被挤压、换行是否自然；
     - 设备裁切是否切掉了关键内容；
     - 文字与背景对比度是否足够；
     - 截图内文字在缩略图尺寸下是否仍可辨认；
     - 品牌 logo/徽章是否清晰。
   - 不满意时只重跑某一组：`--only iphone`，或某一语言：`--locale zh-CN`。

6. **校验并交付**
   - 运行 `--verify <outDir>`，确认尺寸精确、无 alpha、文件不超限。
   - 交付整个输出目录（含 `manifest.json`、`preview.html` 和所有 PNG），不要只发几张。
   - 提醒用户：商店规范会变化，提交前再核对官方尺寸；评分、下载量、奖项等徽章必须真实。

## 配置速览

```json
{
  "app": { "default": "番茄专注", "zh-CN": "番茄专注", "en-US": "Pomo Focus" },
  "outDir": "./out",
  "logo": "./assets/logo.svg",
  "locales": ["zh-CN", "en-US"],
  "theme": "aurora",
  "layout": "hero",
  "sets": [
    {
      "name": "iphone-6.9",
      "device": "iphone-6.9",
      "shots": [
        {
          "image": "./captures/home.png",
          "theme": "aurora",
          "eyebrow": { "zh-CN": "专注计时", "en-US": "FOCUS TIMER" },
          "title": { "zh-CN": "把注意力\n留给{重要的事}", "en-US": "Give your focus\nto what {matters}" },
          "subtitle": {
            "zh-CN": "极简番茄钟，把清醒的时间留给重要的事。",
            "en-US": "A minimal Pomodoro timer for the work that matters."
          },
          "badge": { "zh-CN": "4.9 ★ · 10万+ 好评", "en-US": "4.9 ★ · 100K+ reviews" }
        }
      ]
    }
  ]
}
```

关键规则：

- `{文字}` 会渲染成主题渐变强调色；`\n` 强制换行。
- `image` 也可以是 locale object，按语言切换源截图，例如 `{ "en-US": "./en/01.png", "ja": "./ja/01.png" }`。
- 文本字段可以是字符串（所有语言共用）或对象（按 locale 取值，回退 `default`）。
- 配置优先级：`shot` > `set` > 顶层默认。
- `locales` 存在时，输出到 `<outDir>/<locale>/`；否则直接输出到 `<outDir>/`。
- `orientation: "landscape"` 会交换预设宽高；不需要另找横版预设。
- `detailZoom` 是相对原始截图像素的放大倍率（1 = 原始像素，1.8 = 180%），`detailFocus: [x, y]` 是特写中心（0–1）。
- 不要把 CSS/JS/任意坐标写进配置；版式由模板控制，保证不同尺寸下安全。

完整字段见 `references/config-reference.md`。

## iPhone Duo 与 App Preview

iPhone Duo 有两块显示逻辑：

- **外屏截图**：1398×2034（横屏 2034×1398），预设 `iphone-duo-outer`。
- **内屏截图**：2007×2853（横屏 2853×2007），预设 `iphone-duo-inner`，会加一条很淡的折叠折痕效果。
- 2027 年 4 月起，使用 iOS 27.1 SDK 的应用需要提供 iPhone Duo 截图；提前准备可以避免临时补图。

**App Preview 不是截图**。Apple 接受 886×1920（竖屏）和 1920×886（横屏）的 **视频**，格式为 .mov/.m4v/.mp4，时长等要求见官方 App preview specifications。本 skill 的 `iphone-duo-preview` / `iphone-duo-preview-landscape` 预设只生成**同尺寸的首帧/封面静帧 PNG**，方便做视频封面或预览图；它**不能直接上传到 App Preview 视频槽位**。要生成真正的 App Preview，仍需从真实操作录屏转码。

```json
{
  "name": "iphone-duo-inner",
  "device": "iphone-duo-inner",
  "shots": [{ "image": "./captures/duo-inner.png", "title": "展开，\n就是{专注空间}" }]
}
```

```bash
node scripts/generate.mjs ./store-shots-duo.config.json --only duo
```

（`--only` 匹配 set 的 `name`/`device`/`preset`；把 Duo 组的名字写成包含 `duo` 即可。）

## 平台要点

| 平台 | 关键要求 | 推荐预设 |
| --- | --- | --- |
| App Store iPhone | 1–10 张；PNG/JPEG；无 alpha；2026 必填 Dynamic Island medium | `iphone-6.3` + `iphone-6.9` |
| App Store iPhone Duo | 外屏 1398×2034；内屏 2007×2853；横屏交换 | `iphone-duo-outer` / `iphone-duo-inner` |
| App Preview（视频） | 886×1920 / 1920×886，必须是 .mp4/.mov 视频；本工具只生成静帧海报 | `iphone-duo-preview` / `iphone-duo-preview-landscape` |
| App Store iPad | 支持 iPad 时必须提供 13" | `ipad-13` |
| Google Play | 每种设备 2–8 张；320–3840 px；比例 1:2–2:1；≤8 MB | `play-phone` / `play-tablet` |
| AppGallery | 常见 1080×1920，3–5 张，≤5 MB；以 AGC 当前要求为准 | `harmony-phone` / `harmony-tablet` |

详细尺寸、横屏尺寸和合规注意事项见 `references/platform-specs.md`。

## 常用命令

> 以下命令默认在仓库根目录执行；在其他目录请用 `~/.config/opencode/skills/store-screenshots/scripts/generate.mjs` 的绝对路径。

```bash
# 只跑 iPhone 组
node scripts/generate.mjs config.json --only iphone

# 只跑中文
node scripts/generate.mjs config.json --locale zh-CN

# 保留调试 HTML（可在浏览器打开检查字体/排版）
node scripts/generate.mjs config.json --keep-html

# 覆盖输出目录
node scripts/generate.mjs config.json --out ./dist

# 校验
node scripts/generate.mjs --verify ./dist
```

## 排错

| 现象 | 处理 |
| --- | --- |
| 找不到浏览器 | 安装 Chrome/Edge，或设置 `CHROME_PATH` |
| 中文变成方框 | 安装 Noto Sans SC / PingFang SC；`--doctor` 会提示 |
| 标题太大/溢出 | 缩短文案；或换 `minimal`/`hero`；不要靠极小字号硬塞 |
| 设备被裁切过多 | 换 `minimal`；或减少 `deviceScale`；或改 `hero` |
| detail 特写位置不对 | 调整 `detailFocus`（0–1）和 `detailZoom`（1.2–2） |
| 图片有 alpha | 生成器输出 RGB PNG；若源图有透明通道先转 PNG/JPEG |
| `sandbox initialization failed` / 容器内渲染失败 | 在受信任的容器或 CI 中设置 `CHROME_NO_SANDBOX=1`（不要在日常机器上使用） |
| 文件太大 | 用 `play-phone` 1080×1920 而非 1440×2560；减少背景照片 |
| 颜色偏 | Chrome 已强制 sRGB；检查系统/显示器色彩配置 |
| 字体想换 | `font: "serif"`、`"rounded"` 或自定义 CSS font-family |

## 文件结构

```text
store-screenshots/
├── SKILL.md
├── README.md / README.zh-CN.md   # 英文 / 中文 GitHub 文档
├── package.json                  # CLI 元数据；零运行时依赖
├── presets.json
├── themes.json
├── schema/config.schema.json     # 编辑器补全
├── scripts/
│   ├── generate.mjs              # CLI 入口
│   ├── build-demo-assets.mjs     # 重建合成演示素材
│   ├── check.mjs                 # 仓库卫生检查
│   └── test.mjs                  # 跨平台测试发现
├── src/                          # 配置、渲染、校验、预览模块
├── templates/poster.html         # 版式/主题/设备框
├── references/
│   ├── platform-specs.md
│   ├── config-reference.md
│   └── design-guide.md
├── examples/
│   ├── demo/                     # 可运行演示 + 合成源图
│   └── template.config.json
├── test/                         # node:test 单元/集成测试
└── docs/                         # 架构文档、README 图片
```

## 重要限制

- 这是**排版工具**，不是 AI 生图工具；截图内容必须来自真实产品。
- 不自动伪造评分、下载量、媒体 Logo 或系统 UI。
- **不生成 App Preview 视频**；只支持同尺寸的静帧海报/首帧。
- 不内置 Apple/Huawei 的受版权保护设备素材；使用的是通用 CSS 设备框。
- 商店规范会更新；本 skill 的尺寸表更新于 **2026-11**，提交前仍应核对官方文档。
- AGPL 参考项目的代码未被复制；本 skill 使用独立的 Node/HTML 实现，以 MIT 许可证发布。
