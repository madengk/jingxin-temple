# 静心寺 · 运行与部署状态

更新时间：2026-11-12 15:00（Asia/Shanghai）

## 本地服务

- `http://localhost:2567`（若已用 `npm start` 或旧进程在跑）
- 健康检查：`GET /health`
- 监听 `process.env.PORT`（默认 2567），绑定 `0.0.0.0`；客户端同源连接，HTTPS 下用 `wss`。

已验证：`npm ci && npm run build && PORT=10000 npm start`，健康检查、首页与双客户端同步测试全部通过。

## 公网

loca.lt / cloudflared 临时隧道已放弃（国内不稳定、会失效）。请按 [README.md](./README.md) 部署到 **Render 免费 Web Service**，获得稳定的 `https://<服务>.onrender.com`。

## 仓库

本地已 `git init` 并提交。目标 GitHub 仓库：`madengk/jingxin-temple`（公开即可）。若 `gh` 未登录，需要 Henry 在本机或 GitHub 授权后再推送。

## 启停（本地）

```bash
cd /workspace/jingxin-temple
npm ci && npm run build
PORT=2567 npm start
# 停止：Ctrl+C，或 ./scripts/stop.sh
```
