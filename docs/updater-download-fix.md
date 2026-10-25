# 自动更新下载失败修复

## 现象与原因

用户可以检测到新版本，但点击下载后失败。

`tauri-action@v1` 生成的 `latest.json` 使用 GitHub REST API 附件 URL。客户端没有 GitHub 凭据，匿名 API 配额耗尽时，该 URL 返回 HTTP 403，而对应的公开 Release 下载地址仍可正常下载。

排查中复现了清单请求 HTTP 200、API 附件请求 HTTP 403、公开安装包请求 HTTP 200。应用内置公钥验证 EXE、MSI 的签名均通过，故本次确认的阻断点是下载地址。

## 修复

`scripts/finalize-updater.mjs` 在发布动作完成后执行：

1. 将所有平台的安装包 URL 转换为对应附件的 `browser_download_url`，保留版本、说明和签名。
2. 不带 GitHub 登录凭据下载每个安装包和签名文件，核对 HTTP 状态、大小、GitHub SHA-256 摘要及签名文件与清单的一致性。
3. 先上传并验证临时清单，再备份原清单、切换线上文件名。切换失败时尝试恢复原文件名。
4. 再次匿名读取线上清单并核对其内容。

GitHub 凭据仅用于维护 Release 元数据，不会写入清单，也不会用于模拟客户端下载。

已有的 v0.2.4 清单已修复，无需重建安装包。原清单保留为 Release 中的 `latest.api-urls-669003653.json`。已运行的旧客户端需完全退出后重新打开，以清除内存中保存的旧下载 URL。

## 验证

```powershell
node --test scripts/finalize-updater.test.mjs
```

发布前可使用 `--dry-run` 验证公开下载而不修改 Release。该检查需要维护 Release 的 `GITHUB_TOKEN`，但安装包和签名的验证请求明确不携带该凭据。

之前的人工发布校验使用了认证请求下载 API 附件，未覆盖普通客户端的匿名访问条件；新流程补充了这一检查。
