# dsh-page-zoom

DeepSeek Harness Web UI 的「页面缩放」客户端插件，像 PDF 阅读器/浏览器那样缩放整个页面：

- 悬浮缩放栏：`−` `滑杆` `+` `百分比` `重置 100%` `设置`（默认右下角，可拖动、位置记忆）
- 快捷键：`Ctrl+滚轮` 缩放；`Ctrl+=` / `Ctrl+-` 缩放；`Ctrl+0` 恢复 100%（与 Word/浏览器一致）
- 范围 25%–300%，滑杆 1% 步进，按钮/滚轮按「步进」设置（Ctl+滚轮 5%，按钮 10%，可在设置里改为 1/5/10/20%）
- 缩放即时生效，持久化在浏览器 localStorage（按浏览器记忆，刷新/重启保留；卸载时不会残留服务端配置）
- 对全屏对话框做了缩放补偿（`max-height: calc(100vh / zoom)`），放大时弹窗不会超出窗口

## 组成

| 文件 | 作用 |
|---|---|
| `index.js` | host 半：仅提供插件行身份（无 Node 侧逻辑） |
| `client.js` | browser 半：悬浮栏 + 快捷键 + 缩放引擎（lazy-CJS bundle，无需构建） |
| `cordis.patch.yml` | bundle 层补丁：插入 `dsh-page-zoom` 行 |
| `package.json` | `dsh.client.platform: web`，导出 `./client` |

## 安装（其他 DSH 安装）

```powershell
# 从本目录打包后安装到 web profile
dsh plugin --profile web add dsh-page-zoom-0.1.0.tgz
```

在 DSH Desktop 里：包放入 profile 的 `node_modules`，把 `dsh-page-zoom`
加进 profile `package.json` 的 `dsh.profile.bundles`（与 dsh-cost-meter 一致），
重启桌面应用生效。

## 卸载

- 从 `dsh.profile.bundles` 移除 `dsh-page-zoom`，删除
  `<profile>/node_modules/dsh-page-zoom` 与依赖声明，重启。
- 浏览器里删除 `localStorage["dsh-page-zoom:v1"]` 即清除缩放记忆。

## 说明

- 缩放通过 CSS `html{zoom}` 实现，等价于浏览器页面缩放（布局重排）。
- 快捷键在 `window` 捕获阶段拦截，`preventDefault` 阻止浏览器自身
  Ctrl+滚轮缩放叠加。
- 缩放值存于浏览器本地（与 dsh-chat-width 的「按浏览器记忆」一致），
  不写 `settings.yaml`，因此无需任何服务端命名空间补丁。

