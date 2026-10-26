# JSM Studio 官网

无需框架或构建依赖的静态官网，使用 GitHub Pages 托管，目标地址 https://hotuns.github.io/JSM_Studio/ 。

- `index.html`：产品定位、适用场景、功能、使用流程、社区配置、下载及常见问题。
- `style.css`：响应式布局、通用 SVG 手柄展示、深色与浅色内容分区。
- `app.js`：读取最新正式 Release 安装包；接口不可用时回退至 Releases 最新版页面。读取同站点的社区配置索引，提供搜索和 TXT 文件入口。
- `screenshots/`：v0.2.5 桌面版实际界面截图，包含游戏动作映射、体感调校和社区配置。
- `mark.svg`：无外部资源依赖的站点图标。
- `publish.mjs`：检查官网及社区文件，发布到专用 `gh-pages` 分支，不提交或改动主工作区的应用源码。

在仓库根目录运行 `node website/publish.mjs`，会在忽略目录 `.codex-dev/pages-publish` 准备发布 checkout、校验配置哈希、复制网站和社区目录、提交并推送 `gh-pages`。需要现有 GitHub 写入权限。首次发布还需在仓库 Settings → Pages 选择 Deploy from a branch → `gh-pages` → `/ (root)`。

本地预览先运行 `node website/publish.mjs --prepare-only`，再在 `.codex-dev/pages-publish` 启动静态服务器。纯源码网站预览时，社区目录位于项目根目录，需要使用发布副本才能读取同站点配置。

官网以“用你习惯的手柄，玩好键鼠游戏”为定位，介绍键鼠游戏、体感视角、自定义与分享配置三个使用场景。游戏配置向导、光标切换、社区配置和内置驱动安装程序已随 v0.2.5 正式版提供。
