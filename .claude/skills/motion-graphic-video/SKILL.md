---
name: motion-graphic-video
description: Use when the user asks for any animation, motion graphic, explainer video, animated version of a PPT/book note, or "做影片/做动画/Motion Graphic". Builds the video yourself as an HTML + GSAP page and records it frame-by-frame to a smooth 60fps MP4 — designed to look hand-made, not AI-generated.
---

# Motion Graphic 影片（自己做，逐帧录 60fps）

用户（Jack）的要求，每一次都适用：

1. **非常流畅**：60fps、缓动曲线、转场连贯。
2. **不要有 AI 味，要像真人设计师做的。**
3. **一定要参考**这些网站的风格：21st.dev、motion.so、dribbble.com、awwwards.com、pinterest.com、prompt-motion.com。云端网络打不开时，直接告诉用户是哪个网站被挡，请他照 `docs/云端设定指南.md` 放行，**不要假装看过**。
   - 用浏览器截图来看（多数网站要跑 JS 才有内容）：`node tools/snap.mjs refs <网址...>`，会存 3 张往下卷的截图和页面文字。awwwards.com 目前会回「upstream request failed」。
   - **prompt-motion.com 最有用**：它收集用 Claude 做的动态影片，每支都有提示词（首页 HTML 里的 `self.__next_f` 资料可以解析出全部作品的 slug、标题、分类；作品页有完整提示词；影片在 `media.prompt-motion.com/.../video.*.mp4`，可下载后抽帧比较）。
   - 从这些作品学到的重点：**每个动作都配音效**、有轻配乐；每 1.5–2 秒一个新点子；明暗突然切换制造节奏；真实物理（挤压回弹、跟随、残影）；不要出现时间码/进度条之类的界面装饰。
   - Pinterest/Dribbble 的剪纸作品：层次多、每层纸看得出厚度和阴影。
4. 回复一律简体中文、白话。

motion.so（Motion MCP）要付费点数，账号原本是 0 点；要用之前先问用户。默认用本技能免费自己做。

## 流程

### 0. 先问清楚（用 AskUserQuestion，一次问完）
- 根据哪份资料？（多份就问：各做一支还是合成一支）
- 比例：16:9（投影/YouTube）还是 9:16（Reels/小红书）
- 资料用简体还是繁体：**照原资料的字**，不要擅自转换。

### 1. 设计方案（先想，再写代码）
读 `.claude/skills/frontend-design/SKILL.md`（Anthropic 官方，Apache-2.0）和 `references/motion-principles.md`（HeyGen hyperframes，Apache-2.0）。然后写下：

- **概念**：从主题本身找比喻，不要通用模板。例：
  - 《关注点》读书笔记 → 方格笔记本：印刷体书摘＋黄色荧光笔＋红笔圈画批注＋便利贴，镜头在一大张笔记上移动，最后拉远看到整本笔记放在桌上。
  - 舒適圈 → 剪纸拼贴：三层彩色纸圈（有毛边和阴影），纸做的小人想「跳出去」被弹回，绿圈慢慢变大；「缩小」时凹成一个坑。
- **配色** 4–6 个 hex；**字体** 1–2 套（下表）；**版面**：靠边对齐、分区，不要每页都置中。
- 对照下面「AI 味清单」检查，有中的就改，并说明改了什么。

### 2. AI 味清单（避开）
- 米白底＋衬线大字＋砖红/陶土色点缀（AI 设计最常见的样子，就算用户 PPT 是这样也要换方向，除非用户指定）
- 近黑底＋单一亮绿/朱红点缀；报纸式细线排版；同一种圆角卡片＋同一种灰阴影排满版
- 全大写小标题、`A · B · C` 中点串、每段前都加 01/02/03（只有真的是步骤才编号）
- 每个元素都「淡入＋往上滑」、全部同一种缓动、同一种速度、同一个方向进场
- emoji 当图示；为装饰而加的线条、色条
- 真人感来自：手绘的不完美（抖动、没闭合的圈、斜一点的荧光笔）、真实材质（纸纹、阴影、胶带）、像真人拿相机的微晃、有呼吸的节奏（动 → 停 → 收）

### 3. 写页面（HTML + GSAP）
工作目录放在 scratchpad，不要放进仓库：

```bash
W=<scratchpad>/mg && mkdir -p $W && cp -r .claude/skills/motion-graphic-video/tools $W/ && cd $W && npm init -y && npm install gsap@3.15.0
python3 -I tools/fetch_fonts.py v1/fonts "Noto Serif SC:wght@500;700;900" "LXGW WenKai TC:wght@400;700"
```

页面骨架：`<html data-fonts='900 40px "Noto Serif SC"|400 40px "LXGW WenKai TC"'>`，引入 `../node_modules/gsap/dist/gsap.min.js`、`../tools/lib.js`（需要手绘再加 `../tools/pen.js`），定义 `window.build = function (MG) { ... }`。

`tools/lib.js` 提供：`MG.tl`（唯一的暂停时间轴）、`rise`（遮罩上升）、`typeset`（逐字排出）、`write`（手写擦出）、`fadeIn`、`tweenObj`、`countUp`、`split`、`cam`（解析式镜头，可算速度做运动模糊）、`onFrame`（每帧回调）。`tools/pen.js`：`line / circle（不闭合）/ box / arrow / tick / cross / strike / underline / hatch（排线）/ zheng（正字计数）/ star / marker（荧光笔）`，用 `Pen.draw(layer, d, at, {color,width,speed})` 画出。

**必守规则**（违反就会出现闪烁、元素消失、并行录制画面不一致）：
- 所有动画都挂在 `MG.tl` 上，**一律 `fromTo()`**；进场 `immediateRender: true`，后续同属性的 tween 用 `false`。
- 要量元素位置（画圈、荧光笔），**在加任何 tween 之前**一次量好存起来（`fromTo` 会立刻改 transform）。
- 环境动态（晃动、轮盘转）用 `MG.onFrame(t => ...)` 由时间算出来，不要用 `gsap.to` 独立跑。
- 需要模糊的画面容器要比画面大一圈（例如四边各多 64px），否则模糊时边缘会露出暗边。
- 中文字体用 Google Fonts，`data-fonts` 列出每个字重，`__ready` 会按全文载入所需字形。

试过、好用的字体：Noto Serif SC（书本内文）、LXGW WenKai TC（工整手写，简繁都能显示）、Ma Shan Zheng（红笔重点）、Huninn 粉圆（圆体，温暖）、Chiron Hei HK（粗黑体）。Long Cang 会把简体字显示成繁体，别用。

### 4. 截图检查（一定要做）
```bash
node tools/render.mjs v1/index.html --stills $(seq -s, 3 5 200) --out v1/stills
```
拼成接触表（每张 12 格）逐张看：文字溢出/重叠、圈画位置、镜头移动时有没有东西没写完、结尾是否有残留元素。修好再看一次改过的地方。

### 5. 正式录制
```bash
node tools/render.mjs v1/index.html out/v1.mp4 --workers 3     # 背景执行
```
- 4 核机器约每秒 6 帧：2.5 分钟的影片约 25–30 分钟。用 `run_in_background`，同时做别的事。
- 录完用 ffprobe 确认 1920×1080、60fps、长度对；再抽几帧拼图检查。
- **不要用 `pkill -f "<含路径的字串>"`**：会把自己正在跑的 shell 一起杀掉。

### 6. 声音（不要省略）
- 页面里的 `Pen.draw`、`MG.write`、`MG.rise`、镜头移动会**自动**记录音效事件；其他动作（贴纸、落地、翻牌、打勾…）在 build 里手动加 `MG.sfx('paper', 时间)`。可用种类见 `tools/sound.py` 里的 `sfx_*`：pen、marker、write、whoosh、swish、paper、drop、thud、pop、lift、jump、buzz、slide、grow、shrink、pit、flip、clack、tick、flick、ring、lamp、tape、ghost。
- 导出事件 → 合成（全部用代码生成，没有版权问题）→ 合并：
```bash
node tools/events.mjs v1/index.html audio/v1-events.json
python3 -I tools/sound.py audio/v1-events.json notebook audio/v1.wav   # notebook = 钢琴 lo-fi；paper = 拇指琴，中段转小调
ffmpeg -i out/v1.mp4 -i audio/v1.wav -c:v copy -c:a aac -b:a 192k -af loudnorm=I=-16:TP=-1.5 -shortest out/v1-final.mp4
```
- 听不到声音时，用 `showspectrumpic` 画频谱图、算响度来检查：音效要清楚、配乐压在下面、没有爆音。需要 `pip install scipy`。

### 7. 交付
- 用 SendUserFile 把 MP4 给用户（放 scratchpad，**不要提交进仓库**：影片很大，内容也可能含个人资料）。
- 原始渲染档很大（2.5 分钟约 100MB），交付前用 `-crf 20` 再压一份方便传送。
- 告诉用户：音效和配乐是代码生成的、没有旁白；哪些地方可以再调。
