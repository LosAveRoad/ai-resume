# 林晓然
> 后端工程师 · 可靠异步系统方向

+86 138 0000 0000 | xiaoran@example.com | 上海 | github.com/xiaoran-lin

## 求职概述
关注 **类型安全 API、异步任务与故障恢复**，能够从接口幂等、任务生命周期、重试语义和可观测性角度设计长时间运行服务。本稿为开源项目研究与复现示例。

## 核心能力
- **语言与框架：** Python、TypeScript、FastAPI、Pydantic、asyncio
- **分布式任务：** Temporal、Workflow / Activity、Task Queue、event history、replay
- **服务工程：** PostgreSQL、Redis、OpenAPI、OAuth、OpenTelemetry、Docker

## 项目经历
### 可靠异步任务平台研究与复现 | 后端架构与实现 | 2026.02 - 2026.06
- 使用 **FastAPI + Pydantic** 设计任务创建、状态查询、取消和结果下载 API，统一请求校验与错误响应。
- 参考 **Temporal Python SDK** 将长任务拆为确定性 Workflow 和外部 I/O Activity，配置超时、重试与幂等键。
- 使用事件历史 replay 检查工作流升级兼容性，并规划 API、队列和 Activity 的追踪上下文。

### MCP 工具服务研究与复现 | TypeScript 后端 | 2026.01 - 2026.04
- 基于 **MCP TypeScript SDK** 实现 tools、resources 和 prompts，使用 JSON Schema 约束调用参数。
- 提供 stdio 与 Streamable HTTP 双传输，分层处理协议错误、业务错误和外部依赖错误。
- 研究 OAuth 与中间件边界，为远程工具调用设计最小权限和可审计日志。

### AI Resume 本地导出服务 | 核心开发者 | 2025.11 - 至今
- 构建本地优先的 Markdown 简历工作台，支持 A4 分页、JSON / MD 导入导出和浏览器自动保存。
- 使用 Playwright 生成确定性 PDF，并通过页面渲染与文本提取检查中文字体、页数和内容裁切。

## 教育背景
### 同济大学 | 软件工程 · 工学学士 | 2020.09 - 2024.06 | 上海

