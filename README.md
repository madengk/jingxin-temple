# 静心寺

线上寺庙网页游戏（第一版可玩原型）。低多边形 3D，多人同在大雄宝殿上香、敲木鱼、打坐。无聊天、无付费。

技术栈：Vite + TypeScript + Three.js 前端；Node.js + Colyseus 实时房间。同一进程既提供静态页面，也提供 WebSocket。客户端始终连**当前页面的同源**（`https` 下自动用 `wss`）。

素材与许可见 [docs/LICENSES.md](./docs/LICENSES.md)。

## 本地运行

需要 Node.js 20+。

```bash
npm ci
npm run build
npm start
# 默认 http://localhost:2567
# 平台会注入 PORT，也可手动指定：
PORT=10000 npm start
```

打开浏览器访问上述地址，取一个法号（2–12 字），入寺。

开发分端（可选）：`npm run dev:server` 与 `npm run dev:client`（Vite 在 :5173，接口代理到 :2567）。

双人同步自测：`npm run test:sync`（需先 `npm start`）。

## 一键部署到 Render（推荐，免费）

Render 免费 Web Service（2026）**支持 WebSockets、无需信用卡**。每月 750 实例小时；闲置约 15 分钟会休眠，下次访问大约 1 分钟冷启动。有人在线、持续有 WebSocket 消息时不会被休眠。新加坡区域对国内访问相对更近。

1. 把本仓库推到 GitHub（公开即可），例如 `madengk/jingxin-temple`。
2. 打开 [Render](https://render.com/)，用 GitHub 账号注册 / 登录（免费档不必绑卡）。
3. **New → Blueprint**，选中该仓库；或 **New → Web Service**，连接仓库后确认：
   - Runtime: Node
   - Region: **Singapore**（推荐）
   - Branch: `main`
   - Build command: `npm ci --include=dev && npm run build`
   - Start command: `npm start`
   - Plan: **Free**
   - 健康检查路径：`/health`
   - `NODE_VERSION=22`（本仓库已有 `.node-version` 与 `render.yaml`）
4. 部署完成后打开 `https://<服务名>.onrender.com`，取法号入寺。把这个地址发给别人即可一起上线。第一次（或休眠后）打开请多等一会儿。

`render.yaml` 已写好上述配置，用 Blueprint 可直接套用。

### 其它平台（备用）

仓库含 `Dockerfile`，监听 `process.env.PORT`（镜像默认 10000）。

- **Koyeb**：WebSocket 可用，但 2026 年起新用户免费档已关闭，需信用卡并订 Pro（约 $29/月）。不推荐作为免费方案。
- **Hugging Face Spaces（Docker）**：把 `sdk: docker` 和 `app_port` 写进 README 前置 YAML 即可用本 Dockerfile；但 2026 年新建 Docker Space 通常需要付费 PRO。免费静态 Space 跑不了 Colyseus。

国内访问：Render 的 `*.onrender.com` 一般可以打开（不像部分谷歌云域名会被拦），速度因线路而异，选 Singapore 更稳妥。loca.lt / trycloudflare.com 临时隧道从国内不稳定，不要再依赖。

## 环境变量

| 变量 | 说明 |
| --- | --- |
| `PORT` | 监听端口，默认 `2567`。Render / Docker / HF 会自动注入。 |
| `NODE_ENV` | 生产环境设为 `production`。 |

无需数据库、无需其它密钥。
