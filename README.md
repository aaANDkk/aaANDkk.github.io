# aaANDkk Site Portal & Qure Gallery

[站点入口](https://aaANDkk.github.io/) · [Qure 官网](https://aaANDkk.github.io/qure/) · [图标仓库](https://github.com/aaANDkk/Qure_Style_SVG)

## 目录结构

- `/`（[index.html](index.html)、[hub.css](hub.css)、[hub.js](hub.js)）：个人项目总入口，可在 `hub.js` 的 `PROJECTS` 数组中轻松新增子项目入口卡片。
- `/qure/`（[qure/index.html](qure/index.html)）：Qure 风格 SVG 图标的在线展示与搭配工具。

## Qure Gallery 功能

- **图标库**：按名称搜索、分类筛选与排序，支持中文索引。
- **细节预览**：拖动平移、滚轮或双指缩放，可切换纸色、白色、深色与透明网格背景。
- **获取图标**：复制直链、SVG 源码或策略组 `icon` 配置片段，也可下载原始 SVG。
- **搭配实验室**：添加、重命名、排序策略组，更换图标，并在深浅两种主题中预览。
- **保存搭配**：自动保存到当前浏览器，刷新后可继续调整。
- **桌面与移动端**：适配不同屏幕，支持键盘操作与系统减少动态效果设置。

搭配实验室仅用于图标与策略组的界面预览，不提供代理连接或延迟测试。在客户端使用图标时，请复制图标链接或配置片段。

## 图标来源

图标从 [aaANDkk/Qure_Style_SVG](https://github.com/aaANDkk/Qure_Style_SVG) 在线读取，本仓库不存放 SVG 素材副本。

页面会定期检查源仓库更新；GitHub API 不可用时，尝试使用源仓库的订阅清单。图标加载需要网络连接，更新速度受 GitHub 接口与 CDN 缓存影响。

## 本地运行

项目使用原生 HTML、CSS 和 JavaScript，无需安装前端依赖或构建。

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

然后打开 [http://127.0.0.1:4173](http://127.0.0.1:4173)。

## 部署

可部署到 GitHub Pages 或其他静态网站托管服务。

使用 GitHub Pages 时，在仓库 **Settings → Pages** 中选择 **Deploy from a branch**，分支设为 `main`，目录设为 `/ (root)` 即可。

## 开发检查

安装 Node.js 后运行：

```powershell
node qure/scripts/check.cjs
node qure/scripts/ui-check.cjs
node qure/scripts/carousel-check.cjs
node qure/scripts/motion-check.cjs
node qure/scripts/i18n-check.cjs
```

## 许可与素材说明

本仓库代码许可见 [LICENSE](LICENSE)。图标素材的授权与第三方商标说明，请参阅源仓库的 [许可文件](https://github.com/aaANDkk/Qure_Style_SVG) 与 [THIRD_PARTY_NOTICES.md](https://github.com/aaANDkk/Qure_Style_SVG/blob/main/THIRD_PARTY_NOTICES.md)。
