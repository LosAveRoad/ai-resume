# AI Resume

一个本地优先、面向 Coding Agent 的结构化简历工作台。内容与素材保存在普通文件中，Agent 通过 CLI 修改 JSON、渲染 A4 图片并使用自身视觉能力判断删改和版式，最后导出 PDF。

当前支持 Codex、Claude Code 和 DeepSeek Harness。三者复用同一个开放格式 `SKILL.md`，安装器只处理各运行时的发现目录。

## 已实现

- 结构化编辑：基本信息、教育、技能、工作、实习、项目、荣誉、自我评价，以及文本 / 经历类自选模块
- 字段级 Markdown：`1.`、`-`、粗体、斜体、行内代码和链接
- A4 实时分页预览与浏览器本地自动保存
- 正文字号、行距、模块间距和页边距调节
- 三套可切换内置模板：现代编号、经典酒红、校园深蓝；每套独立记忆排版参数
- 两套可快速切换的校招演示案例：同一候选人的 Agent 方向与后端方向简历
- 可选照片上传与位置 / 缩放裁剪；无照片时模板自动重排
- 撤回 / 反撤回、浏览器本地自动保存与确定性 PDF 导出
- 本地素材库与角色定制工作流
- CLI：初始化、校验、结构检查、启动编辑器、PNG 渲染、PDF 导出、Skill 安装
- 标准 Agent Skill：Codex、Claude Code、DeepSeek Harness 共用同一套事实约束和视觉迭代流程

项目刻意不提供 `fit 1` 或自动压缩命令。Agent 必须查看渲染图片，再决定删内容、重写、调字号或改页边距。

## 安装

需要 Node.js 22.13 或更高版本。

```bash
npm install
npm link --workspace @ai-resume/cli
```

开发阶段也可以不做全局 link，使用：

```bash
npm run cli -- --help
```

## 从素材到 PDF

在需要制作简历的仓库中初始化本地文件：

```bash
ai-resume init .
```

生成：

```text
resume/
├── materials.md   # 只放真实、可核验的原始素材
├── resume.json    # 当前结构化简历
└── output/        # PNG / PDF 输出
```

典型的 Agent 工作流：

```bash
ai-resume validate resume/resume.json
ai-resume inspect resume/resume.json
ai-resume render resume/resume.json --out resume/output/preview.png
# Agent 用视觉能力查看 preview.png 并修改内容、模板或当前模板 layout，然后重复 render
ai-resume export resume/resume.json --out resume/output/resume.pdf
```

`render` 与 `export` 会报告每页正文对可用高度的利用率。最后一页低于 90% 时 CLI 会提示内容可能欠填，90%–94% 时提示继续检查留白，95%–100% 为建议目标区间。该诊断只用于辅助视觉判断，不会自动扩写、缩放或修改简历。

`render` 和 `export` 会在需要时临时启动本地编辑器。已有服务时可传 `--url http://localhost:3000`。

## 安装配套 Skill

默认安装到当前 Git 仓库，已有文件不会被覆盖：

```bash
ai-resume install-skill --agent codex --scope project
ai-resume install-skill --agent claude-code --scope project
ai-resume install-skill --agent deepseek-harness --scope project
```

一次安装三套适配：

```bash
ai-resume install-skill --agent all --scope project
```

对应目录：

- Codex：`.agents/skills/ai-resume`
- Claude Code：`.claude/skills/ai-resume`
- DeepSeek Harness：`.dsh/skills/ai-resume`

只有明确希望跨项目使用时才传 `--scope user`。更新已有安装需要显式加 `--force`。

## 编辑器

```bash
ai-resume dev --port 3000
```

打开 <http://localhost:3000>。页面底部是结构化表单；Markdown 只在段落与经历描述内部生效，不作为整份简历的数据结构。

顶部“案例速览”可在 Agent 与后端两种叙事之间一键切换。演示使用虚构候选人信息，项目描述参考 [Dify](https://github.com/langgenius/dify) 与 [Milvus](https://github.com/milvus-io/milvus) 的公开架构；“项目 Owner”为产品演示角色设定，不代表真实项目归属。载入案例属于一次可撤回编辑，不会让原草稿无法恢复。

模板共享同一个语义 DOM，样式分别位于 `apps/web/app/templates/*.css`，注册信息位于 `apps/web/app/templates/index.ts`。需要二次开发时，让 Coding Agent 复制一份作用域 CSS、增加模板 ID 与注册项即可；内容 schema 和分页引擎不需要复制。

## CLI 命令

```text
ai-resume init [directory]
ai-resume validate [resume.json]
ai-resume inspect [resume.json]
ai-resume dev [--port 3000]
ai-resume render [resume.json] [--out preview.png]
ai-resume export [resume.json] [--out resume.pdf]
ai-resume install-skill --agent <agent> --scope <scope>
ai-resume skill-path
```

## 目录

- `apps/web`：本地结构化简历编辑器
- `packages/cli`：面向人和 Coding Agent 的 CLI
- `packages/cli/skill/ai-resume`：随 npm 包发布、三端共用的标准 Skill 源文件
- `examples/materials`：GitHub 开源项目长素材库
- `examples/generated`：Agent 与后端方向的一页素材示例
- `design/reference`：HTML / CSS 还原使用的视觉基准稿
- `spikes/editor-export`：现成方案调研与验证材料
- `output`：本地导出结果，不提交 Git
