# 林晓然
> AI Agent 工程师 · 开源工程研究与复现示例

+86 138 0000 0000 | xiaoran@example.com | 上海 | github.com/xiaoran-lin

## 求职概述
关注 **Agent 运行时、工具协议与评测**，能够把模型推理、状态管理、工具执行和人工确认拆成可观测、可恢复的工程流程。本稿仅用于端到端测试，不代表上游项目贡献。

## 核心能力
- **Agent：** LangGraph、状态图、checkpoint、human-in-the-loop、轨迹评测
- **工具与交互：** MCP、JSON Schema、Browser Agent、权限边界、失败恢复
- **工程：** Python、TypeScript、FastAPI、Temporal、OpenTelemetry、Playwright

## 项目经历
### 可恢复 Agent 运行时研究与复现 | 独立工程研究 | 2026.02 - 2026.06
- 参考 **LangGraph** 将规划、工具调用、结果校验和人工确认建模为显式状态图。
- 设计 checkpoint 与恢复入口，使长任务在进程异常后可从已完成节点继续。
- 结合 **Temporal** Workflow / Activity 边界，梳理模型调用重试、外部副作用和幂等策略。

### 浏览器 Agent 与安全工具链研究 | 独立工程研究 | 2026.01 - 2026.04
- 参考 **Browser Use** 实现“观察 - 决策 - 动作 - 校验”闭环，为点击、输入和导航定义类型化动作。
- 增加允许域名、步骤预算、超时与错误分类，避免越界访问和无效重复操作。
- 基于 **MCP TypeScript SDK** 拆分只读 resource 与受控 tool，并支持 stdio / HTTP 两种接入方式。

### AI Resume 本地工作台 | 核心开发者 | 2025.11 - 至今
- 构建 Markdown 驱动的 A4 实时预览和 Playwright PDF 导出，内容与版式均保存在本地。
- 设计面向 Coding Agent 的原子能力，让 Agent 通过视觉判断删减内容或调整字号、间距与页边距。

## 教育背景
### 同济大学 | 软件工程 · 工学学士 | 2020.09 - 2024.06 | 上海

