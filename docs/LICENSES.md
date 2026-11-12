# 静心寺 · 素材与许可说明

本项目素材均为原创、开放许可或权利人提供。背景音乐《大悲咒》由项目所有者提供并确认授权。


## 第三轮：真实佛像照片（CC0 / 公有领域）

主殿造像改为开放获取的**真实中国佛像照片**立牌（去背透明 WebP），置于原神位。每张均已核验许可为 **CC0 1.0**（Wikimedia Commons 分类 `CC-Zero`，UsageTerms = Creative Commons Zero, Public Domain Dedication，许可证 URL `https://creativecommons.org/publicdomain/zero/1.0/`）。**未使用** CC BY / CC BY-SA 寺院照片，也未使用受版权保护的商业摄影或专有模型。

照片版权由拍摄者通过 CC0 放弃。造像本身为传统寺院彩绘泥塑/木雕或馆藏文物。

### 主殿采用

| 神位 | 对象 | 拍摄者 | 许可 | 来源页 |
|------|------|--------|------|--------|
| 释迦牟尼佛 / 如来佛祖 | 广州**光孝寺**大雄宝殿中央金身释迦（结跏趺坐，施说法印，火焰背光）。文件 *Gautama Buddha, Guangzhou Guangxiao Temple.jpg* | [Huangdan2060](https://commons.wikimedia.org/wiki/User:Huangdan2060) | CC0 1.0 | https://commons.wikimedia.org/wiki/File:Gautama_Buddha,_Guangzhou_Guangxiao_Temple.jpg |
| 东方持国天王（琵琶） | 广州**海幢寺**天王殿持国天王。*Dhṛtarāṣṭra of Haichuang Temple.jpg* | Huangdan2060 | CC0 1.0 | https://commons.wikimedia.org/wiki/File:Dh%E1%B9%9Btar%C4%81%E1%B9%A3%E1%B9%ADra_of_Haichuang_Temple.jpg |
| 南方增长天王（宝剑） | 广州**海幢寺**增长天王。*Virūḍhaka of Haichuang Temple.jpg* | Huangdan2060 | CC0 1.0 | https://commons.wikimedia.org/wiki/File:Vir%C5%AB%E1%B8%8Dhaka_of_Haichuang_Temple.jpg |
| 西方广目天王（龙） | 广州**海幢寺**广目天王（手持绿龙）。*Virūpākṣa of Haichuang Temple.jpg* | Huangdan2060 | CC0 1.0 | https://commons.wikimedia.org/wiki/File:Vir%C5%ABp%C4%81k%E1%B9%A3a_of_Haichuang_Temple.jpg |
| 北方多闻天王（宝伞） | 湖南衡山**南台寺**多闻天王（持宝伞）。*The northern Vaiśravaṇa, Nantai Temple.jpg* | Huangdan2060 | CC0 1.0 | https://commons.wikimedia.org/wiki/File:The_northern_Vai%C5%9Brava%E1%B9%87a,_Nantai_Temple.jpg |
| 韦陀菩萨（降魔杵） | **明代韦驮立像**（双手扶降魔杵，金彩盔甲）。*Ming Guardian Figure of Skanda.jpg* | [Gary Todd](https://commons.wikimedia.org/wiki/User:Gary_Todd) | CC0 1.0 | https://commons.wikimedia.org/wiki/File:Ming_Guardian_Figure_of_Skanda.jpg |

处理：下载后裁切、`rembg`（U²-Net / ISNet）去背，保存为 `<800KB` 的透明 WebP，置于 `client/public/statues/`。程序几何造像仅在图片加载失败时回退。神位牌改挂在台座正面、佛像脚下，不再遮挡造像。

第四轮：各造像由同一 CC0 照片经 Depth-Anything V2 Small（ONNX）估计深度，生成带真实厚度的浮雕网格（正面按深度位移、侧面挤出、背面深金），以 glTF（`.glb`）入殿。不改变照片来源与许可。

照片立牌只有一正面。韦陀面向进殿方向（−Z），以便瞻仰时看到未经镜像的造像；传统立体韦陀则面朝佛祖。四大天王面向殿内，释迦面向南（进殿者）。

另核验过、本轮未用作主殿主图的开放获取雕塑（备查）：
- 大都会艺术博物馆 *Seated Buddha, probably Shakyamuni*，金朝木雕，acc. 32.148，Object 61656，`isPublicDomain=true`。https://www.metmuseum.org/art/collection/search/61656
- 大都会 *Guardian Protector of the East (Dongfang chiguo tianwang)*，大理国鎏金青铜，acc. 2001.77，Object 58453，PD。https://www.metmuseum.org/art/collection/search/58453
- 大都会 *Skanda (Chinese Weituo)*，明鎏金铜，acc. 2002.254，Object 64897；及 *Bodhisattva Skanda* 明漆金木，acc. 47.74，Object 61701。均为 PD。
- 克利夫兰美术馆 *Seated Buddha*，明鎏金铜，1970.149.1 / 1970.149.2，CC0。https://www.clevelandart.org/art/1970.149.1
- 克利夫兰 *Seated Buddha*，唐鎏金铜，1961.18，CC0。
- 海幢寺亦有完整四天王与韦陀 CC0 套图；多闻一尊为保留宝伞完整，改用南台寺同许可照片。

### 侧殿候选（本轮仅搜集，未装入游戏）

均为 Huangdan2060 拍摄、Wikimedia Commons **CC0 1.0**（已核验 CC-Zero 分类），供后续侧殿使用：

| 神祇 | 文件 | 来源页 |
|------|------|--------|
| 观音 | *Statue of Guanyin, Nantai Temple.jpg* | https://commons.wikimedia.org/wiki/File:Statue_of_Guanyin,_Nantai_Temple.jpg |
| 观音（另） | *Sitting Statue of Guanyin at Mount Guanyin, in Dongguan3.jpg* | https://commons.wikimedia.org/wiki/File:Sitting_Statue_of_Guanyin_at_Mount_Guanyin,_in_Dongguan3.jpg |
| 观音（馆藏） | 克利夫兰 *Seated Guanyin*，宋金木雕彩绘，1984.70，CC0 | https://www.clevelandart.org/art/1984.70 |
| 文殊 | *Statue of Manjusri in Tongxi Temple of Changsha.jpg* | https://commons.wikimedia.org/wiki/File:Statue_of_Manjusri_in_Tongxi_Temple_of_Changsha.jpg |
| 文殊（馆藏） | 克利夫兰 *Manjusri Riding on a Lion*，辽，1974.90，CC0 | https://www.clevelandart.org/art/1974.90 |
| 普贤 | *Statue of Samantabhadra in Tongxi Temple of Changsha.jpg* | https://commons.wikimedia.org/wiki/File:Statue_of_Samantabhadra_in_Tongxi_Temple_of_Changsha.jpg |
| 地藏 | *Statue of Kṣitigarbha, Nantai Temple.jpg* | https://commons.wikimedia.org/wiki/File:Statue_of_K%E1%B9%A3itigarbha,_Nantai_Temple.jpg |
| 药师佛 | 光孝/灵圣等寺三世佛左侧，或 Met 元代壁画 *Buddha of Medicine Bhaishajyaguru* 65.29.2，PD（壁画非圆雕） | https://www.metmuseum.org/art/collection/search/42716 |
| 弥勒佛 | *Maitreya, Haichuang Temple.jpg* | https://commons.wikimedia.org/wiki/File:Maitreya,_Haichuang_Temple.jpg |
| 伽蓝 / 关公 | 未找到清晰的 CC0 立像照片（多数寺庙关公图为 CC BY 3.0，故未采用）。Met *Guan Yu* 清绢本 2001.442 为公有领域绘画，非造像。 | https://www.metmuseum.org/art/collection/search/62002 |
| 文昌帝君、财神、月老 | 本轮未找到符合 CC0/PD 的清晰中国造像照片，待后续。 | — |


## 代码与程序几何（回退用，第二轮）

- 游戏代码为静心寺项目原创。
- **第二轮造像**：如来佛祖、四大天王、韦陀菩萨及殿宇、香炉、木鱼、蒲团、小和尚等，均由 Three.js 几何体与程序绘制的彩绘贴图现场生成，依据汉传佛教寺院传统造像仪轨（形象、持物、印相），**并非**某一座实体寺庙或受版权保护照片/扫描的一比一复制。
  - 释迦牟尼佛 / 如来佛祖：结跏趺坐于莲台，施禅定印，螺发、白毫、肉髻、长耳、火焰背光，金身彩绘。
  - 东方持国天王：持琵琶。
  - 南方增长天王：持宝剑。
  - 西方广目天王：持龙/蛇。
  - 北方多闻天王：持宝伞。
  - 韦陀菩萨：双手横担降魔杵，面朝佛祖。
  - 每尊像前立朱红漆地、描金楷书神位牌。
- 曾考虑采用史密森尼 / Freer Gallery 开放获取的北齐「Cosmic Buddha」（F1923.15，CC0）三维扫描，但其为立像卢舍那/法界人中像，与本殿结跏趺坐释迦仪轨不符，故未采用，以免误标。
- 本轮未能使用 Sketchfab CC0/CC-BY 扫描或 fal.ai 图像转三维（Hunyuan3D / Trellis 等）：fal 账户额度已用尽，故主殿造像以原创程序几何完成。侧殿十尊尚未制作，留待后续。
- 未采用 Quaternius、Kenney 或其他专有/限制性模型库。

## 音频

- **背景音乐《大悲咒》**（全称：千手千眼观世音菩萨广大圆满无碍大悲心陀罗尼）
  - **经文**：唐代伽梵达摩译八十四句音写，属公有领域。
  - **录音**：《大悲咒（经典版）》，约 31 分钟，由项目所有者 Henry 提供；Henry 于 2026-11-12 确认该录音为其本人制作，授权本项目在网站及 App 中使用。
  - 入寺点击后开始播放；打坐时继续播放《大悲咒》（音量略降），不以其他诵经替换。保留静音与音量控制。
- **木鱼**：真实敲击录音。来源为 Freesound 用户 [jonopodmore](https://freesound.org/people/jonopodmore/) 的 [Mokugyo.wav](https://freesound.org/people/jonopodmore/sounds/607215/)，在日本高野山以原配布包槌击打小型木鱼，AKG 414 录制；许可为 [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)，可商用、无需另行授权或署名。原 WAV 下载需 Freesound 登录，本项目采用同一条目可公开获取的 HQ 预览（MP3），裁切为单次敲击并峰值规范到约 −3 dBFS，收入 `client/public/audio/muyu.ogg` 与 `muyu.m4a`。预览源文件存于 `docs/sources/audio/mokugyo-jonopodmore-607215-hq.mp3`。
- **佛珠**：浏览器 WebAudio 程序合成的短促敲击，原创，可商用。
- 若《大悲咒》音频文件加载失败，会回退到原创的低频持续音与稀疏琴笛（同样为原创合成）。

未使用 Microsoft edge-tts 或其他使用条款不明确的语音服务来制作发行音频。

## 字体

登录页、界面与神位牌优先使用 [Noto Serif SC](https://fonts.google.com/noto/specimen/Noto+Serif+SC)（SIL Open Font License 1.1，Google Fonts），并回退到系统已安装的 Noto Serif CJK SC / 思源宋体 / 宋体。

## 角色设定

所有可操作与在线角色均为小和尚，仅袈裟颜色与细节饰物（念珠、挂袋、头巾、袈裟贴块等）不同，没有其他角色类型。

## 游戏内署名

大厅左下角有一行署名，指向本文件所载的《大悲咒》录音来源、木鱼 CC0 录音与造像许可。

## Round 5 — 金身程序造像、壁画与音声（2026-11-12）

本轮殿内主尊、胁侍、天王、韦陀以及十座配殿主尊，均为 **本寺原创的程序化三维网格**（Three.js 生成），施以金身 PBR 材质，**不是** 对在世作者作品或受版权保护模型的翻制，也未使用需署名的 CC-BY 扫描件。民间神祇（关公、文昌、财神、月老）为可识别的传统图像志原创网格，关公赤面绿袍、月老红绳等为传统配色，其余佛教尊像为金身。

殿壁 **佛教壁画** 为原创画布绘制（圆形光背、坐立圣像、莲花与云气，青绿与金红 Palettes），师法敦煌及汉地寺院壁画的公有领域传统语汇，不复制任何在世画家或受版权保护的特定画作。

背景音乐 **大悲咒**：经文本身为公有领域。Round 5 当时所用音轨为前轮原创合成；**现已替换** 为项目所有者 Henry 提供并确认由其本人制作的《大悲咒（经典版）》录音（见上文「音频」节，2026-11-12）。木鱼敲击音现为真实录音（见上文）；佛珠敲击音仍为原创程序合成。

香炉线香：**仅存于服务器内存**，每炷自放置起精确燃烧 10 分钟后由服务器删除；不写 JSON / SQLite，无倒计时 UI。Render 免费磁盘本就易失，此设计亦避免依赖磁盘。

先前 Round 3–4 收录的 Wikimedia Commons CC0 造像照片（光孝寺、海幢寺、南台寺、Gary Todd 明代韦驮）仍保留在 `client/public/statues/` 与上文许可表中，本轮主场景不再使用那些照片浮雕。


## Round 6 — 馆藏开放获取三维扫描（CC0）作金身造像（2026-11-12）

本轮将部分殿内主尊与大雄宝殿胁侍，改为**克利夫兰美术馆（Cleveland Museum of Art）开放获取三维扫描**。馆方通过 Open Access 将版权放弃为 **CC0 1.0**，允许复制、修改与商业使用，无需另行许可。扫描件经减面与贴图压缩后收入 `client/public/statues/gilt/`，运行时套用本寺金身 PBR 材质（保留法线与适度的原色贴图，使五官与衣纹可读）。**不是**对商业游戏/App 模型的翻制。

模型由 Artheon Museum 镜像的 Sketchfab CC0 资源直接下载（与馆方 Sketchfab 账号同一批开放扫描）。来源页以克利夫兰馆藏记录为准。

| 用途 | 藏品 | 作者 / 收藏 | 许可 | 来源页 |
|------|------|-------------|------|--------|
| 大雄宝殿主尊 释迦牟尼佛 | *Seated Buddha*（如来坐像），日本平安时代 12 世纪，金漆木雕。仅造像部分，acc. **1973.85.a** | Cleveland Museum of Art | CC0 1.0 | https://www.clevelandart.org/art/1973.85 |
| 主殿胁侍（阿难位） | *Standing Bodhisattva*，朝鲜王朝 16 世纪，漆金木雕，acc. **1997.11** | Cleveland Museum of Art | CC0 1.0 | https://www.clevelandart.org/art/1997.11 |
| 主殿胁侍（迦叶位） | *Sun Bodhisattva (Nikkō Bosatsu)*，日本平安时代，带金彩木雕，acc. **1961.48** | Cleveland Museum of Art | CC0 1.0 | https://www.clevelandart.org/art/1961.48 |
| 观音殿主尊 | *Eleven-Headed Guanyin*，中国北宋末至金，彩绘洒金木雕，acc. **1981.53** | Cleveland Museum of Art | CC0 1.0 | https://www.clevelandart.org/art/1981.53 |
| 观音殿备选（未作默认） | *Potalaka Guanyin*，中国五代，檀香木，acc. **1965.556** | Cleveland Museum of Art | CC0 1.0 | https://www.clevelandart.org/art/1965.556 |
| 弥勒殿主尊 | *Buddha of the Future (Miroku Bosatsu)*，日本飞鸟时代，鎏金铜，acc. **1950.86.a** | Cleveland Museum of Art | CC0 1.0 | https://www.clevelandart.org/art/1950.86 |
| 药师殿（已试、未采用） | *Buddha with Hands in Gesture of Teaching*，泰国 Mon-Dvaravati 立像青铜（acc. **1958.334**）形体过瘦且带榫杆，不适合作为殿内主尊，故药师殿仍用程序造像。扫描仍保留在 `statues/gilt/teaching-buddha.glb` 备查。 | Cleveland Museum of Art | CC0 1.0 | https://www.clevelandart.org/art/1958.334 |

大厅左下角署已改为注明上述 CC0 扫描与原创《大悲咒》。本轮**仍为程序造像**的殿：药师殿、文殊殿、普贤殿、地藏殿、伽蓝殿（关公）、文昌殿、财神殿、月老殿；以及主殿四大天王与韦陀。这些尚未找到姿态与仪轨都合适、且可直接下载的 CC0/CC-BY 三维模型。

未采用需登录才能下载的 Sketchfab 模型（例如韩国文化遗产厅 CC-BY 鎏金铜坐佛），也未抓取任何商业游戏或手机 App 的模型。史密森尼 Cosmic Buddha（Freer F1923.15，CC0，立像卢舍那）仍因仪轨不符主殿结跏趺坐释迦而未用作主尊。


### 概念图（本轮未入殿）

为了让主尊的「精修金身」效果可对比，本轮用 Codex 图像生成做了释迦牟尼佛正/侧/背面及观音、弥勒、药师、胁侍菩萨的**原创概念图**（浅灰棚拍背景），保存在 `docs/sources/generated/`。这些是新绘制的图像，不是对某一商业 App 或受版权保护照片的翻制，仅作预览与后续图像转三维的输入。

曾尝试用免费的 Hugging Face Space `microsoft/TRELLIS.2` 把主佛正面图转成 GLB，但该 Space 的 ZeroGPU 配额已满，需要 Hugging Face token 才能继续。因此本轮**没有**把生成图做成可入殿的三维模型。主殿实际采用的是上表 CC0 馆藏扫描。若后续要再试图像转三维，需要一个 Hugging Face 账号/token，或给 fal 充值。


## Round 7 — fal 图像转三维试做主尊（未并入 main）

本轮用 Henry 充值后的 fal 账户，把 Round 6 的原创释迦牟尼佛概念图（`docs/sources/generated/shakyamuni-front.png` 及侧/背面）转成三维模型，放进大雄宝殿主尊的须弥座与莲台。概念图为项目原创，不是对商业 App 模型的翻制。

试了两个端点（各一次，不再加试）：

| 端点 | 设置 | 标价（fal 模型页） | 请求 ID | 压缩后体积 |
|------|------|-------------------|---------|-----------|
| `fal-ai/hunyuan-3d/v3.1/pro/image-to-3d` | 正/侧/背多视图 + PBR，face_count=80000 | 基础 $0.375 + PBR $0.15 + 多视图 $0.15 + 自定义面数 $0.15 ≈ **$0.825** | `01a1cf57-0204-7ac0-92ac-f04bbb1169bc` | `client/public/statues/fal/hunyuan-shakyamuni.glb`（约 1.59 MB） |
| `fal-ai/trellis-2` | resolution=1024，texture_size=1024，decimation_target=50000 | 1024p **$0.30** / 次 | `01a1cf57-0706-7762-988d-c699f3d0649c` | `client/public/statues/fal/trellis2-shakyamuni.glb`（约 2.06 MB） |

入殿默认采用 **Hunyuan 3D Pro**（衣纹、背光褶、螺髻与禅定印都更完整），复制为 `client/public/statues/fal/shakyamuni.glb`，并保留其金身反照率与 PBR 贴图（不再套用纯色金身材质）。馆藏扫描仍可通过 `?gilt=scan` 对照。原始未压缩 GLB 不进 Git（见 `.gitignore`）。

本轮代码在分支 `round7-fal`，**未推送 main，也未要求 Render 部署**。

## Round 8 — 殿门开敞、去掉装饰僧、大悲咒音源核查

### 殿门与装饰僧

庭院里各大殿正面改为朱红柱与敞开的格扇门，门洞不再被白墙封死，从外面可以看见殿内点亮的金身主尊与壁画。殿内不再放置任何装饰用的打坐小和尚；蒲团上只会出现真实在线、并且已经打坐的玩家。服务端不为断线会话保留重连，WebSocket 心跳约 4 秒一次，连续三次无响应即移除该玩家。

### 背景音乐《大悲咒》

本轮按「真实唱诵、且许可明确可商用」的标准检索了 Wikimedia Commons、Internet Archive（含 licenseurl 为 Creative Commons / Public Domain 的条目）、Openverse，并核对 Freesound / FMA 检索结果。当时 **没有找到**符合要求的汉传寺院或居士唱诵《大悲咒》（Nīlakaṇṭha Dhāraṇī / Great Compassion Mantra）录音，故 Round 8 **尚未替换** 合成音轨。其后（2026-11-12）项目所有者 Henry 提供并确认由其本人制作的《大悲咒（经典版）》录音，已替换 `client/public/audio/dabei-zhou.ogg` / `.m4a`（见上文「音频」节）。客户端仍依次尝试 `.ogg` / `.m4a` / `.mp3`，便于 iOS Safari 回退。

核查过、但**不能采用**的候选：

| 候选 | 地址 | 不采用原因 |
|------|------|------------|
| Wikimedia Commons 佛教唱诵音频分类 | https://commons.wikimedia.org/wiki/Category:Audio_files_of_Buddhist_chants | 有汉传《心经》居士诵（CC0），**没有**《大悲咒》音频 |
| Internet Archive 条目 *buddhamantra* 中的「大悲咒」 | https://archive.org/details/buddhamantra | 无 licenseurl，上传者标为 monks，无法确认权利 |
| Tinna Tinh「Chú Đại Bi / 大悲咒」冥想音乐（两份相同条目） | https://archive.org/details/nhac-thien-meditation-music-chu-dai-bi-1-hour-tinna-tinh | 无 licenseurl，权利不明 |
| siddham.org 悉昙古音《大悲咒》偈诵 | https://www.siddham.org/download/mantra_download.html | 仅有「欢迎自制 CD、广传流布」的流通说明，不是 CC0 / CC-BY / CC-BY-SA |
| 平安抄经「大悲咒梵音及粤语读诵」 | https://peacewriting.com/licenses.html | 站点写明该授权仅限该站使用，**禁止另行转载** |
| 黄慧音、海涛法师、各寺院课诵等商业或未授权转载 | 各流媒体与佛学资料站 | 版权录音，不可嵌入网站或即将上架的 App |
| 宣化上人相关 CC-BY-SA 音频（Internet Archive） | 例如 https://archive.org/details/Shurangama_Mantra_000_Lines_001-9_Refuge_Buddhism | 许可可用，但是《楞严咒》讲解/唱诵，**不是**《大悲咒》 |

上述公开检索的限制仍作记录。背景音乐现已改用项目所有者提供并书面确认的录音，界面致谢已同步更新。


## Round 10 — 玩家小和尚改为 fal Hunyuan 3D Pro（未并入 main）

用造型四概念图 `docs/sources/generated/monk-option-4.png`，以及 Codex 按同一角色生成的打坐正面/侧面/背面图（`monk-seated-front.png` 等），经 `fal-ai/hunyuan-3d/v3.1/pro/image-to-3d`（PBR，face_count=80000）转成两套玩家模型。概念图与打坐图均为项目原创。

| 模型 | 视图 | 标价（同 Round 7 价目） | 请求 ID | 压缩后体积 |
|------|------|-------------------------|---------|-----------|
| 站立/行走 | 单张正面概念图 + PBR + face_count=80000 | 基础 $0.375 + PBR $0.15 + 自定义面数 $0.15 ≈ **$0.675** | `01a1cff0-5a8a-79d1-ae72-3a907b9ce06a` | `client/public/statues/fal/monk-stand.glb`（约 1.06 MB） |
| 打坐 | 正/侧/背多视图 + PBR + face_count=80000 | 基础 $0.375 + PBR $0.15 + 多视图 $0.15 + 自定义面数 $0.15 ≈ **$0.825** | `01a1cff3-9a62-7573-95db-97498c92b194` | `client/public/statues/fal/monk-sit.glb`（约 1.07 MB） |

两套合计约 **$1.50**，均一次成功、未重试。原始未压缩 GLB 不进 Git。玩家之间 clone 共用几何与材质。行走为起伏/摆动/微前倾，无骨骼；打坐时切换打坐网格。

## Round 12 — 木鱼改为真实敲击录音（2026-11-13）

将原先 WebAudio 程序合成的木鱼声，替换为 Freesound 用户 jonopodmore 在日本高野山录制的真实木鱼敲击（[Mokugyo.wav](https://freesound.org/people/jonopodmore/sounds/607215/)，[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)）。裁切为单次干净敲击（约 0.55 秒，峰值约 −3 dBFS），以 `muyu.ogg` / `muyu.m4a` 加载；连续敲击时各次叠放，并带轻微音高与音量抖动。佛珠敲击仍为原创合成。若录音文件未能加载，客户端回退到原先的合成木鱼。
