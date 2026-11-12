# 静心寺 · 运行与部署状态

更新时间：2026-11-12 21:38（Asia/Shanghai）

## 本轮（round 10）— 未上线

- 玩家模型改为 fal Hunyuan 3D v3.1 Pro（PBR）造型四：站立 `monk-stand.glb`（1.06 MB）、打坐 `monk-sit.glb`（1.07 MB）。全员 clone 共用几何与材质。
- 打坐图由 Codex 按同一角色生成（正/侧/背），再多视图转 3D。行走为起伏/摆动/微前倾（无骨骼），打坐时切换坐姿网格。名牌与进殿双网格修复保留。
- fal 费用约 **$1.50**（站立 $0.675 + 打坐 $0.825），一次成功未重试。未推 `main`，未部署。
- 截图：`screenshots/round10-monk-closeup.png`、`round10-monk-walking.png`、`round10-monk-meditating.png`、`round10-monk-vs-concept.png`
- 标识：`<html data-version="round10-monk-20261112">`

## 本地服务

- `http://localhost:2567`（`PORT=2567 TUNNEL=0 bash scripts/start.sh`）
- 健康检查：`GET /health`；人数：`GET /presence`

## 公网

https://jingxin-temple.onrender.com （当前仍为上一版；本轮未部署。）

## 仓库

`https://github.com/madengk/jingxin-temple`  分支 `round10-monk`（仅本地）
