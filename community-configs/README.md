# JSM Studio 社区配置

此目录保存可直接导入 JSM Studio 的游戏配置，配置内容仍是单个 TXT：`# JSM_STUDIO_GAME` 记录游戏名称和输入模式，`# JSM_STUDIO_ACTION` 记录动作，其余为 JSM 命令。

官网和软件共同读取发布分支 `gh-pages` 中的 `community-configs/index.json`。访问不需要 GitHub 登录或个人令牌。软件只在打开页面、刷新和选择配置时联网，不在输入采样线程中请求网络。

当前配置均为**示例，尚未完成实际游戏验证**。`verified` 只表示维护者记录的测试状态，不代表游戏官方认证。三角洲示例的动作和游戏键位需要用户自行核对。

## 分享配置

1. 在游戏配置页核对游戏名、动作和键位，导出 TXT。不要附带个人目录、凭据或依赖本机的配置文件路径。
2. 将 TXT 放入 `profiles/`，文件名只使用小写字母、数字、`-` 和 `_`。
3. 在 `index.json` 添加条目，提供唯一 `id`、名称、游戏名、作者、说明、适用手柄/连接方式/轴向、输入模式、日期、相对文件路径、标签、使用注意事项及 `verified` 状态。
4. 以 UTF-8 保存文件，计算其原始字节 SHA-256，填入 `sha256`。不要改变文件换行后沿用旧哈希。
5. 运行 `npm run test:community`（目录 `JSM_GUI/jsm_gui_tauri`）。通过 Pull Request 贡献到项目，或由维护者审核后收录。
6. 维护者发布官网时，将此目录同步到 `gh-pages`。索引或配置变更无须重新编译软件。

软件会限制索引和配置大小，验证路径、数据结构、文件哈希和游戏元数据。导入只创建本地副本，重名自动递增，不覆盖已有文件，也不会自动应用配置。社区配置的高级 JSM 命令会保留，应用前请在完整 TXT 预览中检查。

## 索引格式

`version` 目前为 `1`。`mode` 为 `keyboardMouse` 或 `nativeGyro`，与 TXT 元数据保持一致；`game` 必须与 TXT 中的 `gameName` 一致。`file` 为此目录下的相对 `.txt` 路径。

目录源文件维护在项目中；公开发布地址为 https://github.com/hotuns/JSM_Studio/tree/gh-pages/community-configs 。
