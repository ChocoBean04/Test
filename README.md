# Jack 的 Claude 技能库

这个仓库用来存放 Claude 技能（skills）。用这个仓库开的 Claude Code 云端 session，会自动加载 `.claude/skills/` 里的所有技能，不需要开着电脑。

## 目前收录的技能

### superpowers（来自 [obra/superpowers](https://github.com/obra/superpowers)）

| 技能 | 用途 |
|---|---|
| `brainstorming` | 动手之前，先把想法、需求和设计讨论清楚 |
| `writing-plans` | 把需求拆成一步一步的执行计划 |
| `executing-plans` | 按计划分批执行，并在检查点停下来确认 |
| `subagent-driven-development` | 让多个子代理分工完成计划里的任务 |
| `dispatching-parallel-agents` | 同时派出多个代理处理互不相关的任务 |
| `test-driven-development` | 先写测试，再写代码 |
| `systematic-debugging` | 按步骤找出 bug 的根本原因 |
| `verification-before-completion` | 说“完成了”之前先实际验证 |
| `requesting-code-review` | 完成后请人审查代码 |
| `receiving-code-review` | 认真核实并处理审查意见 |
| `using-git-worktrees` | 用独立的工作区隔开不同任务 |
| `finishing-a-development-branch` | 收尾：合并、开 PR 或清理分支 |
| `writing-skills` | 编写和测试新的技能 |
| `using-superpowers` | 说明什么时候该用哪个技能 |
| `diagnosing-superpowers` | 排查 superpowers 技能没有按预期工作的原因 |

来源版本：`obra/superpowers@5bf4e78`（MIT 许可证，见 `licenses/superpowers-LICENSE`）。
复制时把技能之间的引用从 `superpowers:技能名` 改成了 `技能名`，因为作为项目技能加载时没有插件前缀。

### 设计与动画

| 技能 | 用途 |
|---|---|
| `motion-graphic-video` | 自己做 Motion Graphic 影片：网页动画逐帧录成 60fps MP4，要求流畅、不要 AI 味（本仓库自写，含 `tools/` 录制工具） |
| `frontend-design` | 做设计时避开「AI 模板感」，先定配色、字体、版面再动手（来自 [anthropics/skills](https://github.com/anthropics/skills)，Apache-2.0，见 `licenses/anthropics-skills-frontend-design-LICENSE.txt`） |

`motion-graphic-video/references/motion-principles.md` 来自 [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes)（Apache-2.0，见 `licenses/hyperframes-LICENSE`）。

### 账号技能（自动同步，不在这个仓库里）

你在 claude.ai 设置里启用的技能（例如 `holiday-activity-book`、`question-reveal`、`y1-answer-check`、`youyouspellingbeehomework`、`docx`、`pptx`）会自动出现在每个云端 session，不需要复制到这里。

## 其他设定

- `CLAUDE.md`：给 Claude 的项目说明（用简体中文、文件放哪里等），每次开 session 自动读取。
- `.claude/hooks/session-start.sh`：云端 session 开场时自动安装做 Word / PPT / PDF / Excel 要用的套件。
- 还能怎么设定、在哪里改：见 [`docs/云端设定指南.md`](docs/云端设定指南.md)。

## 新增技能

每个技能放一个文件夹：`.claude/skills/<技能名>/SKILL.md`。

⚠️ 这个仓库目前是**公开**的，技能里不要写 API 密钥、密码或个人资料。
