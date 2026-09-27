# 给 Claude 的说明

## 沟通方式

- 一律用**简体中文**回复。
- 用户不是工程师。讲到 Git、GitHub、设定、指令时，用白话说明"这一步在做什么、为什么要做"，少用术语；非用不可就顺便解释。
- 需要用户自己在网页上点的设定，写清楚在哪个页面、点哪里。

## 这个仓库是什么

Jack 的 Claude 技能库兼云端工作区。用这个仓库开的 Claude Code 云端 session 会自动带上：

1. **项目技能**：`.claude/skills/` 里的 15 个 superpowers 技能（brainstorming、writing-plans、systematic-debugging 等），清单见 `README.md`。
2. **账号技能**：用户在 claude.ai 设置里启用的技能（例如 holiday-activity-book、question-reveal、y1-answer-check、youyouspellingbeehomework、docx、pptx、pdf、xlsx、learn）。这些由账号自动同步，**不要**复制进这个仓库。
3. **内置技能**：Claude Code 自带的（code-review、dataviz 等）。

开场脚本 `.claude/hooks/session-start.sh` 会在云端 session 开始时装好做 Word / PPT / PDF / Excel 要用的套件，不用再手动安装。

## 文件放哪里

- 新技能：`.claude/skills/<技能名>/SKILL.md`（一个技能一个文件夹），并在 `README.md` 的表格里补一行。
- brainstorming 产出的设计：`docs/superpowers/specs/`
- writing-plans 产出的计划：`docs/superpowers/plans/`
- 给用户看的设定说明：`docs/云端设定指南.md`

## 规则

- ⚠️ 这个仓库目前是**公开**的：不要提交 API 密钥、密码、登录资料，也不要提交学生资料或个人资料。
- 从 obra/superpowers 复制来的技能，互相引用时写 `技能名`，不要写 `superpowers:技能名`（项目技能没有插件前缀）。
