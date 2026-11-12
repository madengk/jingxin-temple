# 静心寺 · 运行与部署状态

更新时间：2026-11-12 15:55（Asia/Shanghai）

## 本轮（round 2）

- 主殿造像按汉传仪轨重做（原创程序几何与彩绘，非某寺实景复制）：如来结跏趺坐禅定印；四大天王持琵琶 / 宝剑 / 龙蛇 / 宝伞；韦陀横担降魔杵。每尊像前有朱红描金神位牌。侧殿十尊未做（fal 额度用尽，本轮不以扫描顶替坐像）。
- 背景音乐为原创合成的《大悲咒》诵念（经文公有领域，录音为项目原创，非商业唱片），入寺点击后循环；打坐时继续播放。见 `docs/LICENSES.md`。
- 键盘 WASD / 方向键为坦克式：A/D 转向（镜头随角色转），W/S 沿面向走；鼠标拖曳仍可绕转；触屏摇杆保留。
- 本地已 `npm run build`、`npm run test:sync`（全部通过），截图在 `screenshots/round2-*.png`。

## 本地服务

- `http://localhost:2567`（`npm start`）
- 健康检查：`GET /health`
- 监听 `process.env.PORT`（默认 2567），绑定 `0.0.0.0`；客户端同源连接，HTTPS 下用 `wss`。

## 公网

https://jingxin-temple.onrender.com （Render 免费 Web Service，推送 `main` 自动部署）。标识：页面 `<html data-version="round2-20261112">`。

## 仓库

`https://github.com/madengk/jingxin-temple`

## 启停（本地）

```bash
cd /workspace/jingxin-temple
npm ci && npm run build
PORT=2567 npm start
```
