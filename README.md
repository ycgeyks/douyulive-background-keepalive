# 斗鱼后台播放保活

此本地 Chrome 扩展针对已经观察到的故障链：直播切入后台后，Chrome 将视频轨道置为 `unset`，随后音频出现 `DEMUXER_UNDERFLOW / BUFFERING_HAVE_NOTHING`，返回直播页后恢复。

## 工作方式

只在 `https://www.douyu.com/数字房间号` 页面运行。播放器正在有声播放、标签页隐藏时，每秒把一帧视频缩到内存中的 1 × 1 canvas。Chromium 对近期被 `drawImage()` 消费的视频帧设有后台轨道优化豁免。此扩展绕过的是已经观察到的视频轨道停用机制。

canvas 不加入页面，不显示小窗。代码不调用播放、暂停、跳转、刷新，不改变用户主动暂停或静音的决定。

## 访问范围与代价

- 扩展的注入匹配范围只有 `https://www.douyu.com/*`，代码另外限制为数字房间 URL 和直播播放器内部的 video。
- 没有额外 Chrome API 权限、后台服务或外部依赖。
- 不使用 Cookie、账号信息、网络请求、文件写入、录制或上传功能。
- 内存中最多保留一个 1 × 1 像素画布；没有截图保存或像素导出。
- 后台继续视频解码可能增加 CPU 占用和耗电，这是保持完整播放链路的代价。

## 安装与验证

1. 获得用户对安装此未上架本地扩展的确认。
2. 在 `chrome://extensions` 选择“加载未打包的扩展程序”，选中本目录。
3. 刷新或新开一个正在直播的斗鱼房间；安装前已经打开的页面需要刷新。
4. 正常播放后切走 2–3 分钟，检查音频持续、切回无重新拉流。
5. 通过 `chrome://media-internals` 对比后台是否仍发生视频轨道 `unset` 和音频缓冲耗尽。

## 本机实测（2026-10-16）

已按用户确认加载并启用 0.1.0，扩展 ID 为 `ejddmhpmofjkhdpoepfnnfmepembapfi`。原来打开的黑欢喜房间已刷新，使扩展生效。

在 Chrome 155 / macOS 上，新开甜星kitty房间（99900），媒体日志确认使用 H264 + AAC、MSE 播放。让直播标签页完全隐藏超过三分钟，期间未连接页面调试器，也未使用画中画。

- 隐藏期间没有出现 `video_track_selected = unset`；采样时播放器为 `kPlaying`，音频缓冲为 `BUFFERING_HAVE_ENOUGH`。
- 对照安装前同房间日志，曾在约 32 秒出现视频轨道 `unset`；安装后本轮及再次切走的观察中均未出现。
- 本轮仍有短暂 `DEMUXER_UNDERFLOW`，初期三次分别约 0.21、0.95、1.46 秒后自行恢复。切回附近另有一次追赶直播位置的 seek，以及短暂缓冲；播放器没有重建。这不能视为所有卡顿均已消除。
- 原黑欢喜房间走 MediaStream 路径，测试期间继续在后台播放。该路径之前也较稳定，不能用它单独证明修复效果。

测试支持此扩展避开后台视频轨道停用，但不保证任意线路、网络状态或后续网页版本都无卡顿。边界检查已覆盖前台不绘制、尊重暂停/静音、加载状态、播放器替换及页面离开清理。

本地加载依赖此目录，请保留 `manifest.json` 与 `keepalive.js` 的路径。后续新开的斗鱼直播页会自动生效。

## 撤销

在 Chrome 扩展管理页关闭或移除此扩展，再刷新斗鱼直播页。其他网站和 Chrome 全局设置不受影响。

## 依据

- Chromium `ShouldDisableVideoWhenHidden()`：排除 `IsVideoBeingCaptured()` 的播放器。
  https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/renderer/platform/media/web_media_player_impl.cc
- Chromium `WebMediaPlayer::IsVideoBeingCaptured()` 注释明确列出 `canvas.drawImage()` 与 `captureStream()`。
  https://chromium.googlesource.com/chromium/src/+/HEAD/third_party/blink/public/platform/web_media_player.h
