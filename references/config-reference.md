# 配置参考

配置文件是 UTF-8 JSON。所有相对路径相对于**配置文件所在目录**解析（`--out` 除外，它相对当前工作目录）。

## 最小示例

```json
{
  "app": "我的 App",
  "outDir": "./store-shots",
  "sets": [
    {
      "device": "iphone-6.9",
      "shots": [
        { "image": "./screens/01.png", "title": "一句话卖点", "subtitle": "补充说明" }
      ]
    }
  ]
}
```

## 顶层字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `app` | string \| locale object | App 名称。对象形式会按当前语言取品牌名，如 `{ "default": "Pomo", "zh-CN": "番茄专注" }` |
| `outDir` | string | 输出目录，默认 `./store-screenshots` |
| `locales` | string[] | 多语言列表，如 `["zh-CN", "en-US", "ja-JP"]`。存在时输出到 `<outDir>/<locale>/` |
| `sets` | array | 设备/尺寸分组，见下 |
| `theme` | string \| object | 默认主题，见主题列表 |
| `layout` | string | 默认版式：`hero` / `split` / `minimal` / `detail` |
| `frame` | string | 设备框：`bezel`（默认）/ `flat` / `none` |
| `colors` | object | 覆盖主题颜色，见颜色键 |
| `logo` | string | 品牌 logo 路径（PNG/JPEG/SVG/WebP） |
| `showBrand` | boolean | 是否显示左上角 logo + App 名；默认有 logo 时为 true |
| `font` | string | `system` / `serif` / `rounded`，或任意 CSS font-family 字符串 |
| `deviceScale` | number | 设备宽度倍率，默认 1；`0.9` 缩小，`1.1` 放大 |
| `badge` | string \| locale object | 默认徽章，如 `4.9 ★ · 10万+ 好评` |
| `eyebrow` | string \| locale object | 默认小标题（标题上方） |
| `backgroundImage` | string | 背景照片/纹理路径；会加暗角/遮罩保证文字可读 |
| `orientation` | `portrait` \| `landscape` | 默认方向；也可在每个 set 中设置 |
| `detailZoom` | number | `detail` 版式的特写放大倍率，默认 1.8 |
| `detailFocus` | [number, number] | `detail` 特写中心，0–1，默认 `[0.5, 0.5]` |
| `imageOrientation` | `any` \| `portrait` \| `landscape` | 是否对源图方向不匹配发出警告，默认 `any` |
| `island` | boolean | 给缺少灵动岛的 iPhone 源图叠加黑色胶囊，默认 false |
| `crease` | boolean | `device-fold` 是否显示折痕，默认 true |

> 顶层也可以不写 `sets`，直接写 `device` / `size` + `shots`，等价于单组配置。

## sets 数组

每个 set 生成一组尺寸相同的截图。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `name` | string | 输出文件名前缀/分组名；默认使用预设 ID。中文会被清理，建议用英文 |
| `file` | string | 可选，固定输出文件名（仅单 shot set），如 `flightmemo-duo-01.png` |
| `device` / `preset` | string | 预设 ID，见 `--list-presets` |
| `size` | [number, number] | 自定义尺寸，如 `[1080, 1920]`；与 `device` 二选一 |
| `width` / `height` | number | 自定义尺寸的另一种写法 |
| `deviceType` | `phone` \| `tablet` | 自定义尺寸时的设备框类型；默认根据宽高比推断 |
| `orientation` | `portrait` \| `landscape` | 交换预设宽高；自定义尺寸时原样使用 |
| `locales` | string[] | 覆盖顶层 locales |
| `shots` | array | 截图列表，至少 1 个 |
| `theme` / `layout` / `frame` / `colors` / `logo` / `showBrand` / `font` / `backgroundImage` / `badge` / `eyebrow` / `deviceScale` / `detailZoom` / `detailFocus` / `island` | — | 对该组生效的默认值 |

单个 set 也可以只写 `image` + 文案（没有 `shots` 数组），此时视为一张截图。

## shots 数组

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `image` | string \| locale object | 原始截图路径，必填。支持 PNG/JPEG/WebP；也可按语言给不同截图，如 `{ "en-US": "./en/future.png", "ja": "./ja/future.png" }` |
| `title` | string \| locale object | 主标题；支持 `\n` 和 `{强调文字}` |
| `subtitle` | string \| locale object | 副标题 |
| `eyebrow` | string \| locale object | 小标题/类别标签 |
| `badge` | string \| locale object | 徽章，如评分、奖项、下载量 |
| `theme` | string \| object | 覆盖主题 |
| `layout` | string | 覆盖版式 |
| `frame` | string | 覆盖设备框 |
| `colors` | object | 覆盖颜色 |
| `logo` | string \| false | 覆盖 logo；`false` 关闭品牌区 |
| `showBrand` | boolean | 覆盖是否显示品牌区 |
| `backgroundImage` | string | 覆盖背景图 |
| `deviceScale` | number | 覆盖设备宽度倍率 |
| `font` | string | 覆盖字体 |
| `detailZoom` | number | 覆盖特写倍率 |
| `detailFocus` | [number, number] | 覆盖特写中心 |
| `imageOrientation` | string | 覆盖方向警告策略 |
| `island` | boolean | 给缺少灵动岛的 iPhone 源图叠加一个纯黑胶囊；默认 false。真实截图自带灵动岛时不要开启 |

### 文案中的特殊语法

- `\n`：强制换行。
- `{文字}`：渲染为主题渐变色（`accent` → `accent2`）。大括号不支持转义；如需字面量大括号，请避免使用。
- 标题建议 2 行以内；生成器会自动缩小字号以避免与设备重叠，但缩得太小会影响可读性。

### 多语言

```json
{
  "locales": ["zh-CN", "en-US"],
  "app": { "default": "Pomo", "zh-CN": "番茄专注", "en-US": "Pomo Focus" },
  "sets": [{
    "device": "iphone-6.9",
    "shots": [{
      "image": "./screens/01.png",
      "title": {
        "zh-CN": "把注意力\n留给{重要的事}",
        "en-US": "Give your focus\nto what {matters}"
      },
      "subtitle": {
        "zh-CN": "极简番茄钟。",
        "en-US": "A minimal Pomodoro timer."
      }
    }]
  }]
}
```

- 对象里没有当前 locale 时，依次回退 `default` → 第一个值。
- 如果某个字段是字符串，则所有语言共用该字符串。
- locale 代码允许字母、数字、`-`、`_`，建议 BCP 47，如 `zh-CN`、`en-US`、`pt-BR`。
- 输出目录：`out/zh-CN/…`、`out/en-US/…`；manifest 中 `file` 字段包含相对路径。
- 阿拉伯语/希伯来语会自动加 `dir=rtl` 布局（文字右对齐、品牌区镜像）；波斯语/乌尔都语同理。复杂脚本排版请逐张人工检查。

## 版式

| 版式 | 适合 | 特征 |
| --- | --- | --- |
| `hero` | 首图、主推功能 | 标题在左上，设备从底部升起并适度裁切 |
| `split` | 关键流程、深色模式 | 标题在左，设备带轻微旋转从右侧进入；更有动感 |
| `minimal` | 简洁工具、单一功能 | 标题居中，设备完整居中，留白多 |
| `detail` | 强调某一控件/数据细节 | 在 `hero` 基础上增加一个左下角特写卡片；用 `detailFocus` 定位 |

`detail` 版式：

- `detailZoom` 是**源图像素倍率**：`1` 表示 1 源像素 → 1 屏幕像素；`1.8` 表示放大 180%。不是相对卡片的百分比。
- `detailFocus: [x, y]` 是特写中心在原图中的归一化坐标，`[0, 0]` 左上，`[1, 1]` 右下。
- 示例：特写计时圆环中心 `[0.5, 0.65]`；特写顶部导航 `[0.5, 0.12]`；特写右下图例 `[0.75, 0.8]`。
- 特写卡片默认在左下角，会覆盖主截图的一部分；如果主图关键内容在左下角，换 `hero` 或调整 `detailFocus`。

横屏下所有版式会自动把文字放到左侧、设备放到右侧；`detail` 的特写卡片移到右下角。

## 主题

内置主题：

| ID | 模式 | 气质 |
| --- | --- | --- |
| `aurora` | 深色 | 深蓝紫 + 青/粉光晕，科技感 |
| `midnight` | 深色 | 近黑 + 蓝色点缀，克制 |
| `sunset` | 深色 | 酒红/珊瑚/橙，温暖、有情绪 |
| `ocean` | 深色 | 深青 + 湖蓝，清爽 |
| `mono` | 深色 | 黑白灰，极简 |
| `paper` | 浅色 | 米白/沙色/陶土，编辑感 |
| `mint` | 浅色 | 薄荷绿/奶油，轻盈 |
| `lilac` | 浅色 | 淡紫/粉/天蓝，柔和 |

`theme` 也可以直接传对象（未提供的键从 `aurora` 继承）：

```json
{
  "theme": {
    "mode": "dark",
    "bg1": "#08111F",
    "bg2": "#16294A",
    "orb1": "#2563EB",
    "orb2": "#22D3EE",
    "orb3": "#A78BFA",
    "ink": "#FFFFFF",
    "muted": "rgba(255,255,255,.68)",
    "accent": "#93C5FD",
    "accent2": "#67E8F9",
    "frame": "#05080F",
    "glow": "rgba(37,99,235,.4)",
    "scrim": "rgba(4,10,20,.5)"
  }
}
```

颜色键可用 `colors` 覆盖：`mode, bg1, bg2, orb1, orb2, orb3, ink, muted, accent, accent2, frame, glow, scrim`。

## 设备框

| 值 | 效果 |
| --- | --- |
| `bezel` | 默认，深色细边框 + 大圆角，像真实手机/平板 |
| `flat` | 无边框内缩，屏幕直接带圆角 + 阴影 |
| `none` | 无设备框，仅圆角裁切 + 柔和阴影 |

`deviceType`（预设自带，或自定义时指定）决定手机/平板的边框比例。设备框是通用 CSS 造型，不使用厂商受版权保护的素材。

## 方向与自定义尺寸

```json
{
  "sets": [
    {
      "device": "ipad-13",
      "orientation": "landscape",
      "shots": [{ "image": "./screens/ipad.png" }]
    },
    {
      "size": [2560, 1600],
      "deviceType": "tablet",
      "name": "ipad-landscape",
      "shots": [{ "image": "./screens/ipad.png" }]
    }
  ]
}
```

- `orientation: "landscape"` 会把预设的宽高互换（如 2064×2752 → 2752×2064）。
- 自定义 `size` 不会自动交换；直接写目标尺寸即可。
- 源图方向与画布不一致时会给出警告；确认无误可用 `imageOrientation: "any"` 关闭。

## iPhone Duo

| 预设 | 尺寸 | 说明 |
| --- | --- | --- |
| `iphone-duo-outer` | 1398×2034 | 外屏截图；横屏用 `orientation: "landscape"` 得到 2034×1398 |
| `iphone-duo-inner` | 2007×2853 | 内屏截图，带轻微折痕；横屏得到 2853×2007 |
| `iphone-duo-preview` | 886×1920 | **App Preview 视频**的竖屏首帧/封面静帧海报；`kind: app-preview-poster` |
| `iphone-duo-preview-landscape` | 1920×886 | App Preview 横屏首帧/封面静帧海报；同样不能直接当视频上传 |

**重要：886×1920 / 1920×886 是 App Preview 视频分辨率，不是截图尺寸。** `iphone-duo-preview` 生成的是静帧 PNG，不能直接上传到 App Preview 视频槽位；真正的 App Preview 需要 .mov/.m4v/.mp4 视频。预设的 `kind` 为 `app-preview-poster`，manifest 中会体现。

示例：

```json
[
  {
    "name": "duo-inner",
    "device": "iphone-duo-inner",
    "shots": [
      { "image": "./duo-inner.png", "title": "展开，\n就是{专注空间}" }
    ]
  },
  {
    "name": "duo-preview",
    "device": "iphone-duo-preview",
    "orientation": "landscape",
    "shots": [{ "image": "./home.png", "title": "横屏预览" }]
  }
]
```

内屏使用 `deviceType: "fold"`，设备框会加一条很淡的折痕；外屏使用普通手机框。

## 背景图与 logo

```json
{
  "logo": "./brand/logo.svg",
  "backgroundImage": "./brand/texture.jpg",
  "showBrand": true
}
```

- `logo` 支持 PNG/JPEG/SVG/WebP；SVG 会按 `width/height` 或 `viewBox` 读取尺寸。
- 背景图会 `cover` 铺满，并叠加主题遮罩；适合纹理/摄影背景，不要把 UI 截图当背景。
- 有 `logo` 时默认显示品牌区；`showBrand: false` 可隐藏。没有 logo 但 `showBrand: true` 时会用 App 名首字母生成一个渐变方块。
- 品牌区会占据标题上方空间，标题可用高度会自动减少。

## 字体

- 默认使用系统中文字体栈（PingFang SC / HarmonyOS Sans / Noto Sans SC 等），并补充日文、韩文、阿拉伯文、泰文、天城文回退。
- `font: "serif"`：宋体/衬线，适合生活方式、阅读类。
- `font: "rounded"`：SF Pro Rounded（macOS），更亲和。
- 也可以传任意 CSS family 字符串，例如 `"Avenir Next, PingFang SC, sans-serif"`。
- 字体缺失可能导致方框；`--doctor` 会提示安装 Noto Sans SC 等。

## 输出

```text
out/
├── zh-CN/
│   ├── iphone-6-9-01.png
│   └── iphone-6-9-02.png
├── en-US/
│   └── …
├── ipad-13-01.png
├── play-phone-01.png
├── manifest.json
└── preview.html
```

命名：`<set.name 或 preset ID>-<两位序号>.png`。同名文件在同一次运行内会自动加 `-2`；再次运行会覆盖旧文件。

`manifest.json` 包含：

- App 名称、生成时间。
- 每个 set 的 store、locale、kind（`screenshot` / `app-preview-poster`）、尺寸、数量限制、单张大小上限。
- 每个文件的相对路径、标题、宽高、字节数、SHA-256、源图文件名和源图 SHA-256。

`preview.html` 是本地缩略图预览，可直接在浏览器打开检查。

使用 `--only` 或 `--locale` 做局部重跑时，脚本会与已有 `manifest.json` **合并**：保留未重新生成的组，只替换本次生成的组，并重建完整预览。这样改一张图不需要重跑全部尺寸。

## CLI

```bash
node scripts/generate.mjs <config.json>
  --out <dir>       覆盖 outDir（相对当前目录）
  --only <text>     只生成 name/device/preset 包含该文本的组
  --locale <tag>    只生成指定语言
  --dry-run         校验配置/图片路径并打印计划，不渲染
  --keep-html       保留渲染 HTML 到 <out>/.debug-html
  --quiet           关闭警告
  --doctor          检查 Node/浏览器/预设，并做一次测试渲染
  --list-presets    列出所有预设
  --verify <dir>    校验输出目录中的 manifest 和文件
  --version         打印版本
  --help            打印帮助
```

环境变量：

- `CHROME_PATH`：指定 Chromium 系浏览器可执行文件。
- `CHROME_NO_SANDBOX=1`：在容器/CI 中以 root 运行时加上 `--no-sandbox`（仅在你信任的环境使用）。
- `DEBUG=1`：打印错误堆栈。

## 常见配置错误

| 错误 | 处理 |
| --- | --- |
| `Unknown device preset` | 运行 `--list-presets`，检查拼写 |
| `Missing screenshot` / `not found` | 检查图片路径；相对路径是相对配置文件 |
| `Unknown theme` | 使用内置 ID 或对象形式 |
| `Unknown layout` | 仅支持 `hero/split/minimal/detail` |
| `Could not read ... dimensions` | HEIC/AVIF 等先转 PNG/JPEG；或检查文件是否损坏 |
| `title` 太长 | 缩短文案，或换 `minimal`；生成器会自动缩小但有限 |
| 输出尺寸不对 | 升级浏览器；运行 `--doctor`；确认使用 `--force-device-scale-factor=1`（脚本已内置） |

## 参考配置

- `examples/demo/demo.config.json`：可直接运行的完整演示（合成素材，含多语言、iPhone/iPad/Play）。
- `examples/template.config.json`：复制后改成自己项目的多平台模板。
- `schema/config.schema.json`：给编辑器用的 JSON Schema；在配置里加 `"$schema"` 即可获得补全。
