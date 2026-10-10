# 给 Claude 的说明

## 沟通方式

- 一律用**简体中文**回复。
- 用户不是工程师。讲到 Git、GitHub、设定、指令时，用白话说明"这一步在做什么、为什么要做"，少用术语；非用不可就顺便解释。
- 需要用户自己在网页上点的设定，写清楚在哪个页面、点哪里。

## 这个仓库是什么

Jack 的 Claude 技能库兼云端工作区。用这个仓库开的 Claude Code 云端 session 会自动带上：

1. **项目技能**：`.claude/skills/` 里的 15 个 superpowers 技能（brainstorming、writing-plans、systematic-debugging 等），加上设计/动画技能 `motion-graphic-video`、`frontend-design`，清单见 `README.md`。
2. **账号技能**：用户在 claude.ai 设置里启用的技能（例如 holiday-activity-book、question-reveal、y1-answer-check、youyouspellingbeehomework、docx、pptx、pdf、xlsx、learn）。这些由账号自动同步，**不要**复制进这个仓库。
3. **内置技能**：Claude Code 自带的（code-review、dataviz 等）。

开场脚本 `.claude/hooks/session-start.sh` 会在云端 session 开始时装好做 Word / PPT / PDF / Excel 要用的套件，不用再手动安装。

## 文件放哪里

- 新技能：`.claude/skills/<技能名>/SKILL.md`（一个技能一个文件夹），并在 `README.md` 的表格里补一行。
- brainstorming 产出的设计：`docs/superpowers/specs/`
- writing-plans 产出的计划：`docs/superpowers/plans/`
- 给用户看的设定说明：`docs/云端设定指南.md`

## 设计参考（动画、配色、排版、Motion Graphic）

用户要求：以后做**任何**动画、配色、排版、影片、Motion Graphic，一律先参考以下网站的风格：

- https://21st.dev/ （现代 UI 动效组件：文字模糊淡入、逐字出现、光晕背景）
- https://motion.so/ （AI 影片工具；账号目前 0 点数，用之前先问用户要不要付费）
- http://www.dribbble.com （配色与排版灵感）
- http://www.awwwards.com/ （得奖网站的动态排版、大字、遮罩转场）
- http://www.pinterest.com/ （情绪板、整体氛围）
- https://prompt-motion.com （用户指定的动效参考）

动效基本要求：**非常流畅**——影片用 60fps 输出；动作用缓出曲线（ease-out，例如 expo/quart），不要直线匀速；元素依次错开出场；转场要连贯，不要硬切。

**不要有 AI 的味道，要像真人做的。** 做影片/动画一律照项目技能 `motion-graphic-video`（参考网站研究方法、风格系统、配乐和音效流程、逐帧录制工具）。

已确认的偏好（2026-10，用户亲自选的，越下面越新）：
- 一开始选过「瑞士色块」（整面饱和色块＋超大粗黑体＋裁切标记／时间码）。之后用户说**还是喜欢剪纸版《舒適圈》的风格和动画**；方格笔记本那版被退回。
- **要有吉祥物来演示内容**（会走动、有表情、会讲话、会跳）。吉祥物定案：**天蓝色果冻史莱姆，Slime Rancher 那种风格**：
  - 软糖形（上圆下宽），外面一圈浅色描边（像贴纸），果冻渐层＋左上大高光＋身体里的小泡泡。**没有耳朵、没有手脚**。
  - 眼睛是小小的深色椭圆点，带一颗小白点反光。
  - 表情要**可爱**：^ ^ 笑眼、ω 猫嘴、眨眼时嘴巴歪一边、脸颊红晕。**开心的嘴巴＝一个大圆被另一个圆从上面咬掉一小口**，底部有粉红舌头。
  - 讲话：嘴巴跟着声音一张一合，配**可爱的叽里咕噜声**（真人录音加速，听不懂的小动物声），旁边跳出对话框文字。
  - 角色动画照项目技能 `squash-stretch-mastery`、`anticipation-mastery`、`follow-through-overlapping`、`character-appeal`、`playfulness-fun`。
- 声音：Mixkit 的真实背景音乐＋少量真实音效，动作对齐音乐拍点；**不要用代码合成的音效**（用户觉得难听），不要旁白。
- 新方向先做风格样张让用户挑，再正式做。用户希望**先问清楚再做**（一次问一个问题，给选项）。
- ⚠️ 回复一律用**简体华文**，就算前面在读英文资料也一样（用户看到英文回复会直接说「华文」）。

注意：用户已在云端环境设定里放行这些网站（awwwards.com 目前仍回「upstream request failed」）。换了新环境若又打不开，要跟用户说是哪个网站被挡，并照 `docs/云端设定指南.md` 请用户放行，不要假装看过。看网站的方法见技能 `motion-graphic-video`。

## 规则

- ⚠️ 这个仓库目前是**公开**的：不要提交 API 密钥、密码、登录资料，也不要提交学生资料或个人资料。
- 从 obra/superpowers 复制来的技能，互相引用时写 `技能名`，不要写 `superpowers:技能名`（项目技能没有插件前缀）。
