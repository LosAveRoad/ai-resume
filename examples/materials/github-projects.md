# 开源项目简历素材库

> 用途：验证 AI Resume 从长 Markdown 素材中，为不同岗位生成一页简历的能力。
>
> 重要说明：以下内容来自公开仓库调研，是“开源项目研究与工程化复现”的演示素材，不代表候选人是这些项目的作者或维护者。真实投递前必须替换为本人做过、能够解释并能提供证据的经历。

- 调研日期：2026-08-17
- 目标方向：AI Agent 工程师、后端工程师
- 选择标准：社区成熟度、技术代表性、文档和示例完整度、能否同时覆盖 Agent 与生产后端能力

## 1. LangGraph

- 官方仓库：[langchain-ai/langgraph](https://github.com/langchain-ai/langgraph)
- 定位：面向长时间运行、有状态 Agent 的底层编排框架。
- 关键能力：持久化执行、失败恢复、人工介入、短期与长期记忆、状态图、分支与子图、流式输出、运行轨迹观测。
- 技术关键词：Python、状态机、图执行、checkpoint、durable execution、human-in-the-loop、memory、trace。

### 可用素材

1. 阅读状态图、节点、边与条件路由的核心抽象，能够解释 Agent 为什么不能只依赖单轮 prompt。
2. 复现“规划 - 调用工具 - 检查结果 - 继续执行”的状态循环，并为失败节点增加重试和恢复入口。
3. 将对话状态和工具结果写入 checkpoint，让进程重启后可以从上一次状态继续。
4. 为高风险工具增加人工确认节点，允许操作人员检查和修改状态后再恢复执行。
5. 对 Agent 轨迹记录节点耗时、工具参数、错误类型和最终结果，便于离线评测。

### 适合 Agent 岗的表达

- 设计基于状态图的多步 Agent，将规划、工具调用、结果校验和人工确认拆成可观测节点。
- 使用 checkpoint 保存运行状态，使长任务在进程异常后可以恢复，而不是从头执行。
- 建立轨迹级评测数据，定位模型推理、工具选择和外部系统错误。

### 适合后端岗的表达

- 将长任务建模为显式状态机，统一处理超时、重试、幂等和状态恢复。
- 把执行状态和业务 API 解耦，为异步任务提供可查询的生命周期。

### 证据边界

- 可以陈述“完成了复现、设计或测试”。
- 不应陈述“参与 LangGraph 核心开发”或使用其商业客户作为个人成果。

## 2. Browser Use

- 官方仓库：[browser-use/browser-use](https://github.com/browser-use/browser-use)
- 定位：让 AI Agent 通过真实浏览器完成网页任务。
- 关键能力：浏览器状态理解、动作工具、恢复循环、持久浏览器会话、自定义工具、CLI 与云端浏览器。
- 技术关键词：Python、Rust core、Chromium、CDP、browser harness、tool calling、session、recovery loop。

### 可用素材

1. 理解网页 Agent 的闭环：观察当前页面、生成下一步动作、执行动作、读取新状态、判断是否完成。
2. 对点击、输入、滚动、导航和截图等动作定义结构化参数，减少模型输出的歧义。
3. 使用允许域名、超时和最大步骤限制约束 Agent，避免无限循环和越界导航。
4. 将登录状态、标签页和任务上下文保存在浏览器会话中，避免每一步重新初始化。
5. 为元素失效、页面跳转和网络错误设计恢复策略，而不是盲目重复点击。

### 可用验证任务

- 在公开站点完成信息查询、筛选和多页汇总。
- 对相同任务记录成功率、平均步骤数、耗时和失败类型。
- 比较纯 DOM、截图视觉和混合观察方式在复杂页面上的差异。

### 适合 Agent 岗的表达

- 构建“观察 - 决策 - 动作 - 校验”浏览器 Agent 回路，为动作定义类型化 schema。
- 增加域名白名单、步骤预算和失败恢复，降低不可控导航与重复操作。
- 记录页面状态和动作轨迹，用回放数据分析失败步骤。

### 适合后端岗的表达

- 抽象浏览器会话生命周期，统一管理任务、标签页、超时和资源释放。
- 为长时间网页任务设计队列、状态查询和结果持久化接口。

### 证据边界

- 仓库公开了基于真实网页任务的 benchmark 思路，可以借鉴测试方法。
- 不应把仓库自己的 benchmark 成绩写成个人系统成绩；个人数据必须来自本人测试。

## 3. Model Context Protocol TypeScript SDK

- 官方仓库：[modelcontextprotocol/typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk)
- 定位：Model Context Protocol 的 TypeScript SDK，覆盖 MCP 客户端、服务端和常见传输方式。
- 关键能力：tools、resources、prompts、stdio、Streamable HTTP、OAuth 辅助能力、客户端发现与调用、服务端请求。
- 运行环境：Node.js、Bun、Deno；并提供 Express、Hono、Node HTTP 等适配层。
- 技术关键词：TypeScript、protocol、JSON-RPC、tool schema、resource、transport、OAuth、middleware。

### 可用素材

1. 实现一个本地 MCP Server，向 Coding Agent 暴露简历读取、保存、预览和导出工具。
2. 使用 JSON Schema 描述工具输入，避免 Agent 直接修改任意文件或传入不可验证参数。
3. 同时提供 stdio 和 Streamable HTTP 两种传输，分别支持本地 CLI 与常驻服务。
4. 将资源读取与工具执行分离：素材库作为 resource，生成和导出作为 tool。
5. 对协议错误、业务错误和外部服务错误分层编码，向模型返回可恢复的信息。
6. 为 HTTP 形态研究授权、token 校验和最小权限，避免把本地工具无保护地暴露到网络。

### 适合 Agent 岗的表达

- 基于 MCP TypeScript SDK 设计简历工具协议，将素材读取、内容修改和 PDF 导出暴露为类型安全工具。
- 用 resource 提供只读上下文，用 tool 执行受控变更，减少模型直接操作文件的风险。

### 适合后端岗的表达

- 实现 stdio 与 Streamable HTTP 双传输服务，统一校验 schema、错误码和日志上下文。
- 设计 OAuth 和中间件边界，为远程工具调用提供最小权限访问。

### 版本注意

- 调研时仓库主分支正在推进 v2 与新规范；生产示例必须锁定稳定版本，不应把 beta API 当成长期承诺。

## 4. FastAPI

- 官方仓库：[fastapi/fastapi](https://github.com/fastapi/fastapi)
- 定位：基于 Python 类型提示构建高性能 API 的 Web 框架。
- 关键能力：类型驱动参数校验、依赖注入、异步接口、OpenAPI、交互式文档、Pydantic 数据模型。
- 技术关键词：Python、ASGI、Starlette、Pydantic、async、dependency injection、OpenAPI。

### 可用素材

1. 为 Agent 或简历服务设计任务创建、状态查询、取消和结果下载 API。
2. 使用 Pydantic 为请求与响应定义类型边界，减少手写校验和接口文档漂移。
3. 通过依赖注入统一认证、数据库会话、追踪 ID 和限流逻辑。
4. 区分同步 CPU 工作与异步 I/O，避免在事件循环中执行阻塞任务。
5. 利用 OpenAPI 生成可验证的接口说明，并用于客户端或工具 schema 生成。
6. 为异常建立统一响应结构，包含稳定错误码、可读信息和追踪 ID。

### 适合 Agent 岗的表达

- 使用 FastAPI 暴露 Agent 运行、流式事件、人工确认和轨迹查询接口。
- 通过 Pydantic 对模型输出与工具参数进行二次校验，阻止无效调用进入业务层。

### 适合后端岗的表达

- 设计类型驱动的异步 API，统一依赖注入、错误处理和 OpenAPI 文档。
- 将耗时任务放入后台工作流，API 层只负责幂等接入与状态查询。

### 证据边界

- FastAPI 官方页面给出的开发效率和缺陷减少数字来自其引用材料，不应直接写成个人项目指标。

## 5. Temporal Python SDK

- 官方仓库：[temporalio/sdk-python](https://github.com/temporalio/sdk-python)
- 定位：用 Python 编写可持久、可恢复的长时间工作流和活动。
- 关键能力：durable execution、workflow/activity、重试、定时器、信号、子工作流、测试时跳、历史回放、sandbox、OpenTelemetry。
- 技术关键词：Python、asyncio、event history、determinism、worker、task queue、retry、replay、observability。

### 可用素材

1. 把长任务拆成确定性的 Workflow 和执行外部 I/O 的 Activity，避免恢复时重复副作用。
2. 使用事件历史重放恢复状态，在进程或网络失败后继续执行。
3. 为 Activity 设置超时、重试和幂等键，区分临时错误与永久错误。
4. 用 Signal 和 Update 处理人工确认、取消或运行中参数调整。
5. 用子工作流拆分复杂流程，例如“读取素材 - 生成草稿 - 视觉检查 - 导出 PDF”。
6. 通过 history replay 测试代码升级是否破坏已有工作流的确定性。
7. 接入 OpenTelemetry，记录 workflow、activity、queue 和失败类型。

### 适合 Agent 岗的表达

- 将长时间 Agent 运行包装为 durable workflow，使模型调用或工具失败后可以从历史状态恢复。
- 用 Signal 实现人工确认和运行时修订，用 replay 测试工作流升级兼容性。

### 适合后端岗的表达

- 基于 Workflow、Activity 和 Task Queue 构建可恢复异步任务，统一超时、重试和幂等策略。
- 使用事件历史与回放验证版本升级，降低长流程发布风险。

### 证据边界

- 可以描述对 Temporal 模型的复现和在示例系统中的落地。
- 不应把 Temporal 平台的可靠性或规模直接转化为个人系统的 SLA。

## 跨项目组合素材

### 组合 A：生产级 Agent 执行平台

- LangGraph：Agent 内部状态图和工具循环。
- MCP SDK：Agent 与外部工具的标准协议。
- Browser Use：真实网页动作与恢复循环。
- Temporal：跨分钟或跨小时任务的持久执行和失败恢复。
- FastAPI：任务接入、状态查询、人工确认和轨迹 API。

可验证架构：`FastAPI -> Temporal Workflow -> LangGraph Agent -> MCP Tools / Browser Session`。

### 组合 B：可靠异步后端

- FastAPI 接收幂等请求并返回任务 ID。
- Temporal 负责状态、超时、重试、取消和恢复。
- MCP Streamable HTTP 作为受控工具服务边界。
- OpenTelemetry 贯穿 API、Workflow、Activity 和工具调用。

### 组合 C：本地 AI Resume 工具链

- Markdown 素材库作为唯一可编辑事实来源。
- Agent 读取素材并针对岗位生成一页 Markdown 草稿。
- 本地编辑器实时渲染 A4 页面，由视觉检查决定删减内容或调整字号、行距和页边距。
- Playwright 导出 PDF；MCP/CLI 只提供读取、写入、预览和导出原子能力，不提供黑盒 `fit 1` 命令。

## 生成一页简历时的约束

1. 只使用本素材库出现的技术主题，不虚构开源贡献、用户规模、线上 SLA 或个人 benchmark 成绩。
2. 项目标题必须带“研究”“复现”“原型”或“示例”，表明不是上游项目作者经历。
3. Agent 岗优先保留：状态图、工具协议、浏览器动作、轨迹评测、人工确认、持久执行。
4. 后端岗优先保留：异步 API、类型校验、任务队列、幂等、超时重试、事件历史、可观测性。
5. 每份简历最多 3 个项目，每个项目最多 3 个要点。
6. 不通过自动缩小到不可读字号来强塞一页；先删低相关内容，再微调版式。

## 后续替换清单

- 将示例姓名、联系方式和教育信息替换为用户数据。
- 对每条经历补充本人角色、时间范围、代码或演示链接。
- 只有在有日志、测试报告或线上数据时才加入数字指标。
- 面试前确保能解释状态恢复、幂等、MCP 传输、浏览器动作安全和异步任务边界。
