---
name: motion-graphic-video
description: Use when the user asks for any animation, motion graphic, explainer video, animated version of a PPT/book note, or "做影片/做动画/Motion Graphic". Builds the video yourself as an HTML + GSAP page in the style of the user's reference sites, syncs it to a real music track's beat grid, adds a few real sound effects, and records it frame-by-frame to a smooth 60fps MP4.
---

# Motion Graphic 影片（自己做，逐帧录 60fps）

用户（Jack）的要求，每一次都适用：

1. **非常流畅**：60fps、缓动曲线、转场踩在音乐拍点上。
2. **不要有 AI 味，要像真人设计师做的。** 对 Jack 来说，这指的是**参考网站那种专业 motion reel 的质感**。不是「刻意做得很手工」，也不是一张张投影片淡入。
3. **一定要先看参考网站**：21st.dev、motion.so、dribbble.com、awwwards.com、pinterest.com、prompt-motion.com。打不开时要告诉用户是哪个网站被挡，请他照 `docs/云端设定指南.md` 放行，**不要假装看过**。
4. 回复一律简体中文、白话。

## 已知偏好（2026-10 用户亲自选过，越下面越新）

- **最新：要有吉祥物演示内容**：天蓝色果冻史莱姆（Slime Rancher 风格），做法见下面「吉祥物」一节。用户也说过**喜欢剪纸版《舒適圈》的风格和动画**（`tools/pen.js` 那套手绘方格笔记本被退回）。
- 回复一律简体华文；用户希望先问清楚再做（一次一个问题、给选项）。

以下是更早选过的瑞士色块风格，仍可当作「没有吉祥物」时的备选：

- **风格：A「瑞士色块」**。
  - 整面饱和色块随小节切换：橘红 `#FF4A1C`、电光蓝 `#2E3BEA`、黄 `#FFC83A`、黑 `#111111`、米白 `#F1EEE6`。
  - 超大超粗黑体（Noto Sans SC/TC 900）塞满画面，Archivo 900 用于数字。
  - 小标签用 JetBrains Mono，英文点缀用 Instrument Serif 斜体。
  - 画面四角有裁切标记，上方放系列名和「01 / 15」，下方放段落名、BPM、时间码，加一条进度条。
  - 有一个贯穿全片的图形（例如「关注点」的黑点、舒适圈的三色圆）。
- **用户不喜欢的**：
  - 方格笔记本、剪纸这类「刻意手工感」的方向（第一版被退回）。
  - 用代码合成的音效（「很难听」）。
- **声音**：要背景音乐＋少量真实音效，不要旁白。

新题材就照这个风格做。如果题材差很多，先做样张让用户挑。

## 流程

### 0. 先问清楚（AskUserQuestion，一次问完）
- 根据哪份资料（多份就问：各做一支还是合成一支）、比例（16:9 / 9:16）。
- 资料是简体还是繁体：**照原资料的字**。

### 1. 研究参考（每次都做，不要凭记忆）
```bash
node tools/snap.mjs refs https://prompt-motion.com https://21st.dev https://motion.so   # 截图＋页面文字
```
- **prompt-motion.com 最有用**，里面全是用 Claude 做的动态影片：
  - 首页 HTML 的 `self.__next_f` 资料可以解析出所有作品（slug、标题、分类，其中 kinetic-type 类最相关）。
  - 作品页有完整提示词。
  - 影片在 `media.prompt-motion.com/<slug>/video.*.mp4`，下载后用 `ffmpeg -vf fps=…,tile=4x2` 抽帧来看。
- 它们的共同点：
  - 超大粗体字、整面色块切换、裁切标记和时间码这类仪表板元素。
  - 文字跑马灯、形状变形、残影、粒子、3D 方块阵列。
  - 每 1.5–2 秒一个新点子。
- awwwards.com 目前回「upstream request failed」，看不到。Pinterest 要登入，只看得到第一屏。

### 2. 风格样张（正式做之前一定要给用户挑）
- 用真实内容做 2–3 个方向、每个方向 1–2 张静态画面（写在一个 HTML 里，每张一个 `<section id>`）：
  `node tools/shots.mjs styles.html shots/` → 拼成一张图 → SendUserFile → AskUserQuestion 让用户选。
- 这一步省掉的是「录 1 小时才发现方向错」。

### 3. 选音乐、抓拍点、选音效
- 音乐用 **Mixkit**（`mixkit.co/free-stock-music/<genre>/`，免费商用、不用标注；mp3 在 `assets.mixkit.co/music/<id>/<id>.mp3`）。
- 我听不到声音，所以用数据挑：
  ```bash
  pip install librosa
  python3 -I tools/analyze_music.py music/*.mp3   # BPM、节拍稳定度、每 10 秒响度、有没有安静空洞、低频比例
  ```
  - 挑：节拍稳（irregularity < 0.03）、整首响度平均、低音不要超过一半，长度 ≥ 影片长度（或刚好）。
  - 再看 Mixkit 的标签（Positive、Lively、Futuristic…）挑情绪。
  - 拍点和小节用 librosa 算出来，写成 `grid<id>.js`：`{beats, phase, beat}`，其中 phase 是重拍在 beats 里的起始位置。
- 音效也用 **Mixkit**（`mixkit.co/free-sound-effects/<whoosh|transition|click|pop|swoosh|interface>/`，档案在 `assets.mixkit.co/active_storage/sfx/<id>/<id>-preview.mp3`）。
  - 用过、效果好的：168 Fast air sweep（转场）、3115 Fast transitions swoosh、3005 Explainer pop、2356/2357 Dry/Bubble pop、2568 Cool interface click、1120 Modern click box check、1106 Page turn chime、3120 Tech transition slide。
  - 避开太尖的（声音重心在 9kHz 以上的点击声）。
  - **音效要少**：只放在转场和重点动作上，不要每一笔都响。

### 4. 写页面（HTML + GSAP + 瑞士风格系统）
工作目录放 scratchpad（不要放进仓库）：
```bash
W=<scratchpad>/mg && mkdir -p $W/v3 && cp -r .claude/skills/motion-graphic-video/tools $W/ && cp .claude/skills/motion-graphic-video/styles/swiss.js $W/v3/
cd $W && npm init -y && npm install gsap@3.15.0
python3 -I tools/fetch_fonts.py v3/fonts "Noto Sans SC:wght@500;700;900" "Noto Sans TC:wght@500;700;900" "JetBrains Mono:wght@400;600" "Instrument Serif:ital@0;1" "Archivo:wght@800;900"
```
- 页面依次引入 `gsap.min.js` → `../tools/lib.js` → `grid<id>.js` → `swiss.js`，然后写 `window.build = function (MG) {…}`。
- `styles/swiss.js` 提供：
  - `SW.T(小节, 拍)`：拍点时间，所有动作都用它定时。
  - `SW.scene(sel, 时间, 'wipeL|wipeR|wipeU|wipeD|iris|shutter|cut', {hud, label, n})`：换场景，同时换 HUD 颜色、更新段落名和计数。
  - `SW.rise / smear（横向速度模糊进场）/ pop / fade / type / strike（实心删除线）/ count / marquee / draw / svg`，以及 HUD（时间码、进度条）。
- `tools/lib.js` 提供 `MG.tl`（唯一的暂停时间轴）、`MG.sfx(kind, t)`（记录音效点）、`MG.onFrame`、`MG.split`、`MG.countUp`。

**必守规则**（违反会闪烁、元素消失、并行录制画面不一致）：
- 所有动画挂在 `MG.tl` 上、**一律 `fromTo()`**。进场用 `immediateRender: true`，之后同一个属性的 tween 用 `false`。
- 贯穿全片的元素（例如黑点）放在场景外层，z-index 比场景高。要压在它上面的文字也要放到同一层（不然会被盖住）。
- 旋转、跑马灯这类持续动作，用 `MG.onFrame(t => …)` 由时间算出来。
- 每个场景至少两个视觉焦点、三个层次（背景色块／主文字／小标签或图形）。进场方向和缓动要轮流换。

### 5. 截图检查（一定要做）
```bash
node tools/render.mjs v3/v1.html --stills 1,4,10,19,… --out st   # 每个场景挑中间一个时间点
```
拼接触表逐张看：
- 文字有没有重叠或被裁掉。
- 删除线有没有超出文字。
- 全局元素有没有盖住文字。
- 结尾的图形有没有超出画面、压到 HUD。

### 6. 正式录制＋声音
```bash
node tools/render.mjs v3/v1.html out/v1.mp4 --workers 3          # run_in_background；纯色块画面比较快
node tools/events.mjs v3/v1.html audio/v1-events.json             # 导出音效点
python3 -I tools/mix_real.py audio/v1-events.json music/<id>.mp3 sfx audio/v1.wav --fade 4
bash tools/finalize.sh out/v1.mp4 audio/v1.wav deliver/影片名.mp4   # 合并＋压缩＋响度 -16 LUFS
```
- `mix_real.py`：配乐压在 -21 dBFS，转场时自动让配乐小 3dB，同一种音效轮流用两个样本。用最大声／中位数检查：音效不要超过配乐的 2–3 倍。
- `tools/sound.py`（代码合成音效）**不要再用**，用户觉得难听。
- **不要用 `pkill -f "<含路径的字串>"`**，会把自己的 shell 一起杀掉。要用的话写成 `"[r]ender.mjs"` 这种形式。

### 7. 交付
- 用 SendUserFile 发 MP4（放 scratchpad，**不要提交进仓库**：影片很大，内容也可能含个人资料）。
- **上限 30MB**：超过就用两遍编码压到约 1.2Mbps，保持 60fps，画质仍清楚：
  `ffmpeg -i in.mp4 -c:v libx264 -preset slow -tune animation -b:v 1220k -pass 1 -an -f null /dev/null && ffmpeg -i in.mp4 -c:v libx264 -preset slow -tune animation -b:v 1220k -maxrate 3000k -bufsize 4000k -pass 2 -c:a aac -b:a 128k -movflags +faststart out.mp4`
- 告诉用户用了哪首音乐（Mixkit 曲名／作者）、可以再调哪里。

## 吉祥物：果冻史莱姆（2026-10 定案）

用户要一个「会动、会讲话、会跳」的吉祥物来演示内容。定案是**天蓝色果冻史莱姆，Slime Rancher 风格**：

- 身体：软糖形（上圆下宽），一圈浅色描边（贴纸感），果冻渐层，左上大高光，身体里几颗小泡泡。**没有耳朵、没有手脚**。
- 眼睛：小小的深色椭圆点，带一颗小白点反光。
- 表情要可爱：^ ^ 笑眼、ω 猫嘴、眨眼时嘴巴歪一边、脸颊红晕。**开心的嘴巴＝一个大圆被另一个圆从上面咬掉一小口**，底部有粉红舌头（`bite()` 函数算出来的）。
- 动画原理照项目技能 `squash-stretch-mastery`（落地压扁、起跳拉长、体积不变）、`anticipation-mastery`（跳前先蹲）、`follow-through-overlapping`（脸比身体慢半拍）、`character-appeal`、`playfulness-fun`。

### 角色程序 `characters/jelly.js`
```js
const r = Jelly.make(svgGroup);        // 页面要有 <filter id="jshadow">
Jelly.pose(r, 'neutral');              // 直接设定表情
Jelly.face(tl, r, 'neutral', 'happy', t);   // 在时间轴上换表情（旧的缩掉、新的弹出）
Jelly.blink(tl, r, t);
MG.onFrame(t => Jelly.apply(r, S, t)); // 每帧：S = {hop, amt, sx, sy, lift, rot, look, dir}
```
- 表情：neutral、happy、excited、wink、content（ω）、playful、curious、shy、nervous、scared、surprised、sad、lazy、strain（> <）、determined、proud、love（爱心眼）、dizzy、lookL、lookR、talk。
- 一蹦一跳：`S.hop` 从 0 补间到 N（N 跳），`S.amt` 0→1 开启；每跳自带「蹲→拉长起跳→空中→落地压扁→果冻抖」。落地在每跳的 0.78 处，要对拍点就从 `拍点 - 0.78×拍长` 开始。
- 大动作（掉下来、大跳、吓一跳、融化）：直接补间 `S.lift / sx / sy / rot`，落地一定要「压扁 → elastic 弹回」。
- 讲话：`r.fs.talk.on`（0→1 补间）＋每帧把 `r.fs.talk.v` 设成声音的音量包络，嘴巴就跟着声音开合。

### 讲话的声音（用户选 B：可爱的叽里咕噜声）
```bash
python3 -I tools/babble.py sfx/2260.mp3 voice/talk1.wav voice/talk1.json --speed 1.28   # Mixkit 2260「Little boy gibberish talk」
python3 -I tools/voicecheck.py voice/talk1.wav    # 看音高、音节数
```
- 原理：真人乱讲话的录音像录音带一样加速（音高跟着变高，不会有机器人味），再算出每帧的嘴巴张开量＋音节时间点。
- 把 json 包成 `window.TALK = {talk1: …}` 给页面用；对话框的字在音节时间点一个个弹出。
- 2259 也是乱讲话（短，适合「拜拜～」）。

### 史莱姆用的真实音效（Mixkit，`mix_real.py --preset slime`）
掉落 168、大跳 166、落地 3056「Cartoon quick splat」、弹起 2895「Boing hit sound」、小跳 3000／1317（水泡声）、对话框 2357、好奇 2356、害羞笑 419「Cartoon giggle」、吓一跳 2208「Little cartoon creature hiccup」、得意 2985、爱心 2192「Little cute kiss」、融化 1884「Soap dispenser press squish」。讲话时配乐自动降 6dB。

### 范例：`examples/mascot-showcase.html`（30 秒角色展示）
掉下来弹两下 → 左看右看、好奇 → 一蹦一跳到中间 → 讲话「嗨！你好呀～」 → 害羞 → 吓一跳 → 得意 → 好喜欢 → 转圈大跳 → 融化又弹回 → 「拜拜～」。背景是「果冻天空」（亮蓝天、旋转光芒、飘的云和泡泡、绿色果冻山丘）。
它期待的目录：`$W/<页面目录>/{mascot-showcase.html, jelly.js, grid.js, talk.js}`，`$W/tools/lib.js`，`$W/node_modules/gsap`，`$W/fonts/fonts.css`（Huninn 粉圆字体：`python3 -I tools/fetch_fonts.py fonts "Huninn"`）。配乐用 Mixkit 8「Jumping Around」（112 BPM），拍点用 `tools/beatgrid.py` 算。

## 其他参考
- `references/motion-principles.md`（HeyGen hyperframes，Apache-2.0）：缓动、节奏、构图规则。
- `.claude/skills/frontend-design/SKILL.md`（Anthropic，Apache-2.0）：配色、字体的思考方法。但**用户指定的参考风格优先于它的「AI 味清单」**。
- 旧工具 `tools/pen.js`（手绘笔触）、`tools/sound.py`（合成音效）还留着，但不是用户喜欢的方向。
