# 静心寺 · 运行与部署状态

更新时间：2026-11-12 21:23（Asia/Shanghai）

## 本轮（round 10）— 未上线

- 全场玩家模型改为造型四程序小和尚：棕色僧衣、宽袖、木念珠、六颗戒疤（两排各三）、半垂眼与浅笑。无随机换装。
- 几何与材质全员共用，适合一殿约 50 人。走跑（腿摆/起伏）与蒲团打坐姿势保留；名牌上移到 1.38。
- 顺手修了进殿时 Colyseus `onAdd` 可能重复挂本地角色、造成双头叠影的问题。
- 未用 fal（$0）。未推 `main`，未部署。
- 截图：`screenshots/round10-monk-closeup.png`、`round10-monk-walking.png`、`round10-monk-meditating.png`、`round10-monk-vs-concept.png`
- 标识：`<html data-version="round10-monk-20261112">`

## 本地服务

- `http://localhost:2567`（`PORT=2567 TUNNEL=0 bash scripts/start.sh`）
- 健康检查：`GET /health`；人数：`GET /presence`

## 公网

https://jingxin-temple.onrender.com （当前仍为上一版；本轮未部署。）

## 仓库

`https://github.com/madengk/jingxin-temple`  分支 `round10-monk`（仅本地）
