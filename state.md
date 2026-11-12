# 静心寺 · 运行与部署状态

更新时间：2026-11-12 19:20（Asia/Shanghai）

## 本轮（round 8）

- 庭院各大殿正面改为朱红柱 + 敞开格扇门，从外面可以看见殿内点亮的金身主尊；去掉封死门洞的白墙。
- 删除客户端装饰打坐僧（`addWorshippers`）。殿内蒲团只会出现真实在线并已打坐的玩家。线上核查时各殿服务端玩家列表为空（除观察者自己），坐着的人是本地装饰网格，不是残留会话。
- 服务端关闭断线重连，WebSocket 心跳 4 秒 / 最多 3 次失败后移除；`GET /presence` 可查各房人数。同步测试结束时必定 leave。
- 《大悲咒》未换到真实唱诵：Wikimedia Commons、Internet Archive（含 CC/公有领域过滤）、Openverse 等均无许可明确的汉传《大悲咒》录音。仍使用原创合成音轨，首次交互后循环；详见 `docs/LICENSES.md`。标识：`<html data-version="round8-20261112">`。

## 本地服务

- `http://localhost:2567`（`PORT=2567 TUNNEL=0 bash scripts/start.sh`）
- 健康检查：`GET /health`；人数：`GET /presence`

## 公网

https://jingxin-temple.onrender.com （Render 免费 Web Service。推送 `main` 后用 Deploy Hook 触发部署。）

## 仓库

`https://github.com/madengk/jingxin-temple`
