# 平台规格与合规要点

> 更新于 2026-11-26。商店规范会变化，正式提交前请再核对官方页面。此文档用于选尺寸和自查，不构成法律或审核保证。

## App Store（iOS / iPadOS）

### 数量与格式

- 每个设备尺寸 **1–10 张** 截图。
- 格式：`.png`、`.jpg`、`.jpeg`。
- 不允许 alpha 通道/透明背景。
- 单张文件上限约 **8 MB**。
- 截图必须是真实 App 界面；不要包含其他平台 logo、误导性 UI、虚假评分。
- 可以给截图加营销文案和设备框，但不要伪造系统界面或功能。

### 2026 年必需尺寸

Apple 当前帮助页面的“Required device sizes”写明：

- **iPhone**：至少一张 **iPhone with Dynamic Island (medium display)**，即：
  - `1206 × 2622`（1206×2622）
  - `1179 × 2556`
- **iPad（如果 App 支持 iPad）**：至少一张 **iPad 13-inch**：
  - `2064 × 2752`
  - `2048 × 2732`

由于 App Store Connect 会在缺失时自动缩放，实践中建议同时上传 **6.9" 和 6.3"**，避免被要求补图或缩放后变糊。iPad 支持时上传 13" 主图。

### 接受尺寸（竖屏；横屏交换宽高）

| 设备类别 | 尺寸 |
| --- | --- |
| iPhone Dynamic Island large | 1320×2868、1290×2796、1260×2736 |
| iPhone Face ID large | 1284×2778、1242×2688 |
| iPhone Dynamic Island medium（必填） | 1206×2622、1179×2556 |
| iPhone Face ID medium | 1170×2532、1125×2436、1080×2340 |
| iPhone Home button large | 1242×2208 |
| iPhone 4.7" | 750×1334 |
| iPhone 4" | 640×1136（带状态栏） |
| iPhone 3.5" | 640×960（带状态栏） |
| iPad 13" | 2064×2752、2048×2732 |
| iPad 11" | 1488×2266、1512×2316、1668×2420、1668×2388、1640×2360 |
| iPad 10.5" | 1668×2224 |
| iPad 9.7" | 1536×2048、768×1024 |
| Mac | 16:10：1280×800、1440×900、2560×1600、2880×1800 |

### iPhone Duo

Apple 的截图规格页面单独列出了 iPhone Duo：

| 显示 | 竖屏 | 横屏 |
| --- | --- | --- |
| 外屏（outer） | 1398×2034 | 2034×1398 |
| 内屏（inner） | 2007×2853 | 2853×2007 |

- 预设：`iphone-duo-outer`、`iphone-duo-inner`；横屏加 `"orientation": "landscape"`。
- 从 2027 年 4 月起，使用 iOS 27.1 SDK 的应用需要提供 iPhone Duo 截图；提交后商品页会显示 “Made for iPhone Duo” 徽章（以 Apple 当前说明为准）。
- 内屏预设会加一条很淡的折叠折痕；这是排版效果，不是伪造系统 UI。
- iPhone Duo 的 **App Preview** 使用 886×1920（竖屏）/ 1920×886（横屏）视频，不是截图尺寸；详见下文。

对应预设：`iphone-6.9`、`iphone-6.3`、`iphone-6.5`、`iphone-5.5`、`ipad-13`、`ipad-11`。横屏加 `"orientation": "landscape"`。

### iPhone Duo 预设速查

| 预设 | 尺寸 | 用途 |
| --- | --- | --- |
| `iphone-duo-outer` | 1398×2034 | iPhone Duo 外屏截图 |
| `iphone-duo-inner` | 2007×2853 | iPhone Duo 内屏截图（带折痕） |
| `iphone-duo-preview` | 886×1920 | App Preview 竖屏首帧海报（视频须另行转码） |
| `iphone-duo-preview-landscape` | 1920×886 | App Preview 横屏首帧海报（视频须另行转码） |


### 设计注意

- 第一张决定点击率；把最强利益点放在第一张。
- 前两张不要放“设置页”“登录页”等低信息密度界面。
- 商店列表会以很小尺寸显示，标题至少保证在缩略图下能读。
- 使用通用 CSS 设备框；不要直接使用 Apple 官方产品图/商标做自有素材。
- 状态栏来自真实截图即可；不要伪造运营商、时间、电量来暗示不存在的功能。

---

## App Preview（iPhone / iPhone Duo）

App Preview 是**视频**，不是截图。App Store Connect 的 App preview specifications（2026）列出：

- 每个设备尺寸/语言最多 3 个 App Preview。
- iPhone（含 iPhone Duo）接受分辨率：
  - **886×1920**（竖屏，9:19.5）
  - **1920×886**（横屏，19.5:9）
- 格式：`.mov`、`.m4v`、`.mp4`；H.264，最高 High Profile Level 4.0；最高 30 fps；无外部引用。
- 音频：立体声，AAC 256 kbps / 44.1 或 48 kHz（或 PCM）。
- 时长：通常 15–30 秒（以 App Store Connect 当前提示为准；不要只做静态幻灯片）。
- 尺寸是 App Preview 的**视频分辨率**，与设备物理分辨率无关；886×1920 也是其他 iPhone 的通用预览分辨率。

本 skill 的 `iphone-duo-preview` / `iphone-duo-preview-landscape` 只生成 **886×1920 / 1920×886 的静帧海报/首帧 PNG**，用于封面、预览图或视频首帧参考，**不能直接上传到 App Preview 视频槽位**。真正的 App Preview 需要从真实操作录屏转码，并保持与 App 实际功能一致。

---

## Google Play（Android）

### 数量与格式

- 每种设备类型 **2–8 张** 截图。
- 边长 **320–3840 px**。
- 宽高比在 **1:2 到 2:1** 之间（含）。
- 文件 ≤ **8 MB**，PNG/JPEG。
- 不允许 alpha；建议 24-bit RGB。
- 手机截图必须提供；平板/折叠屏按设备支持情况提供。
- 截图必须展示 App 实际 UI；不要只放标题图或无关图片。

### 推荐尺寸

| 类型 | 预设 | 尺寸 |
| --- | --- | --- |
| 手机 9:16 | `play-phone` | 1080×1920 |
| 手机高清 16:9 | `play-phone-hd` | 1440×2560 |
| 10" 平板 | `play-tablet` | 1600×2560 |
| 7" 平板 | `play-tablet-7` | 1200×1920 |

横屏：`"orientation": "landscape"`，例如 1920×1080、2560×1600。

### 其他素材（本工具可自定义尺寸生成）

- Feature graphic：**1024×500**，PNG/JPEG，无 alpha。
- App icon：**512×512**，32-bit PNG。
- Google Play 的 feature graphic 是宣传图，不是截图；官方对是否出现设备图/截图有具体限制，提交前核对 Play Console 的当前规范。不要用本工具的 `hero` 图直接当 feature graphic。

---

## AppGallery（Huawei / HarmonyOS）

> AppGallery / AGC 的素材要求会按应用类型、设备类型和审核地区变化；以下为常见手机/平板截图规格，**提交前以 AGC 上传页面的实时提示为准**。

### 常见要求

- 手机截图推荐 **1080×1920**（9:16），常见范围 720×1280 起。
- 平板截图常见 **1600×2560** 或 **2560×1600**。
- 通常需要 **3–5 张**（不同品类可能不同）。
- 格式 JPG/PNG；单张常见上限 **5 MB**。
- 不允许 alpha；不要使用与 App 无关的图片。
- 截图需体现 HarmonyOS / 鸿蒙设备的真实体验；如果是 Android 兼容包，不要把 Android 截图伪装成 HarmonyOS 原生特性。

对应预设：`harmony-phone`（1080×1920）、`harmony-tablet`（1600×2560）。横屏加 `orientation: "landscape"`。

### HarmonyOS 特别提示

- HarmonyOS NEXT / 鸿蒙原生应用的素材入口、尺寸和数量可能与传统 Android 包不同；以 AGC 的“应用信息 / 素材”页面为准。
- 如果同时发布 Android 与 HarmonyOS 版本，建议分别使用原生截图，不要一套图混用。
- 不要在截图中使用 HUAWEI 商标、官方设备渲染图或“官方推荐”字样来暗示背书。

---

## 通用检查清单

- [ ] 尺寸与预设完全一致（`--verify` 会检查）。
- [ ] PNG 无 alpha 通道。
- [ ] 每个平台的数量在限制内。
- [ ] 首图在 200px 宽缩略图下仍能读出核心利益点。
- [ ] 文案与截图内容一致，没有截图里看不到的功能。
- [ ] 评分/下载量/奖项徽章真实、可验证。
- [ ] 多语言版本的文案已人工校对，不是机器直译。
- [ ] 没有其他平台 logo、系统 UI 伪造、竞品商标。
- [ ] 横屏 UI 使用了横屏素材/尺寸，没有被强行拉伸。
- [ ] 提交前再次核对官方规范（尤其 App Store 的必填尺寸与 AppGallery 的品类要求）。

## 官方链接

- App Store Connect 截图规范：<https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/>
- App Store 素材最佳实践：<https://developer.apple.com/app-store/asset-best-practices/>
- Google Play 图片资源要求：<https://support.google.com/googleplay/android-developer/answer/9866151>
- AppGallery Connect 文档：<https://developer.huawei.com/consumer/en/doc/app/agc-help-releaseharmony-app-0000001914263174>
