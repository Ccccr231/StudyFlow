# StudyFlow 架构设计（编码前基线）

日期：2026-10-18。目标：内网独立运行，不依赖第三方登录、CDN、云数据库或云模型认证。

## 技术决策与调研

| 参考 | 借鉴 | 不引入 |
| --- | --- | --- |
| https://github.com/vercel/chatbot | Next.js App Router、模型适配、结构化工具调用 | Vercel Gateway、云身份、云存储 |
| https://github.com/ollama/ollama 和 https://docs.ollama.com/api/openai-compatibility | 自托管 OpenAI-compatible `/v1/chat/completions` | 强制云模型、外网账户 |
| https://github.com/rdev/liquid-glass-react | React 19 局部玻璃效果、浏览器降级 | 全屏昂贵的折射滤镜 |
| https://github.com/nextlevelbuilder/ui-ux-pro-max-skill | 本地设计检索、对比度、键盘和响应式规范 | 外部字体、远程图片 |
| https://www.prisma.io/docs/orm/v6/prisma-schema/overview/data-sources | 同一 Prisma 数据模型，明确不同 provider 的部署边界 | 把 SQLite 宣称为 PostgreSQL 验收 |

本地首发：Next.js + TypeScript + Tailwind + shadcn/ui + Recharts + Prisma/SQLite，真实文件持久化。内网多人部署：相同应用 + Prisma/PostgreSQL + Docker Compose + Nginx。选择 SQLite 是因为当前机器没有 Docker/PostgreSQL；这不是正式多人数据库的替代。切换 provider 需重新生成客户端、初始化目标库，已有数据需要显式迁移，不能直接改连接串。

## 模块化单体

浏览器 → 同源 API → 会话鉴权/输入校验/限流 → 业务模块 → Prisma → 数据库。

模块：identity、planning、focus、analytics、agent。业务服务不依赖 React。API 统一返回 `{ data }` 或 `{ error }`。用户身份只从 HttpOnly 会话取得，客户端不传有效 userId。每次读写带所有者条件；所有重要 Agent 写入必须经过预览和确认。

目录：

```text
src/app/                  页面、样式、API 入口
src/components/           迎宾、学习台、番茄钟、图表、伙伴、shadcn 原语
src/modules/identity/     本地注册、scrypt 密码、数据库会话
src/modules/planning/     计划和任务服务
src/modules/focus/        服务端计时状态机
src/modules/analytics/    上海时区的每日/每周聚合
src/modules/agent/        Observe→Analyze→Plan→Execute、模型与工具白名单
src/lib/                  数据库、API 错误、安全边界
prisma/schema.prisma      本地 SQLite 数据模型
prisma/postgresql.prisma  从同一模型生成的 PostgreSQL schema
deploy/                   Nginx 配置
scripts/                  初始化、测试、部署辅助
tests/                    状态机、鉴权、API 和闭环验收
public/                   本地人物原图，无远程依赖
docs/                     架构、路线图、验收证据
```

## 数据库 Schema

详见 `prisma/schema.prisma`。User 关联 Session、Plan、Task、FocusSession、AgentRun。Plan 包含 Task；FocusSession 可关联 Task；AgentRun 保存观测快照、分析、工具提议和审批结果。

- User.revision：业务快照乐观锁，Agent 确认时若数据已变化要求重新分析。
- Session.tokenHash：只保存随机会话令牌的 SHA-256 摘要。
- FocusSession.activeKey：运行/暂停时取 userId，唯一约束保证同一用户只有一个未结束计时器。
- FocusSession.elapsedSeconds/lastResumedAt/version：服务端真实时差计时、暂停恢复、并发保护；刷新不丢失，不信任客户端上报时长。
- AgentRun.proposal：经 Zod 验证的工具参数；确认在事务中执行，重复确认不可重复落库。
- Plan/Task/FocusSession/AgentRun 全部保存 userId；关联任务/计划时必须再次检查 owner。
- 时间戳以 UTC 保存，日统计按 Asia/Shanghai 分桶，跨日专注按实际片段分配。

## Agent 闭环

1. Observe：读取当前用户计划、任务、专注记录和 revision。
2. Analyze：确定性统计实际完成率和时长；无数据明确为空。
3. Plan：将目标与当前快照交给管理员预配的内网模型。只接受 `create_plan` / `update_tasks` 工具调用；没有模型不伪造 AI 提议。
4. Execute：界面展示完整修改；用户确认后，检查所属用户、有效期、revision 和提议状态，在单一事务中执行并更新 UI。拒绝不会修改任务。

浏览器不持有模型密钥、不选择任意服务端 URL。模型端点由环境变量配置，支持 Ollama/vLLM/其他兼容网关；默认无模型。模型输出是外部数据，不能改变白名单或绕过确认。工具调用不允许执行 shell、SQL、文件操作或任意网络请求。

## 安全和内网边界

账号密码本地注册，无邮件/短信/外网 OAuth。scrypt 加盐；随机 32 字节会话；HttpOnly/SameSite Cookie；写入校验 Origin；Zod 输入长度和范围校验；统一错误脱敏；请求体大小限制；登录与模型调用限流。生产需要内网 TLS 和 Secure Cookie，默认 HTTP 仅供本机或受控内网试用。单进程限流的上限和后续 Redis 升级在 README 明示。

运行资源均来自本项目。安装依赖/构建可以在联网开发机完成，内网运行不访问 npm/GitHub。离线 Docker 使用预先构建导出的应用镜像及 Postgres/Nginx 镜像。模型权重须预先导入内网模型服务。

## 扩展边界

保留类型化接口定义：RagRetriever（按用户过滤）、ModelProvider、ChatTransport（后续 WebSocket）、ObjectStorage、WelcomeSceneProvider（后续天气）。当前不实例化无用基础设施，不宣称这些功能已经实现。

## 视觉与素材

大工蓝 + 雾白 + 海蓝辅助色；玻璃仅用于导航、浮层和重点操作。迎宾使用用户图一的校园和人物局部，滑动/键盘/按钮进入；伙伴使用图二的表情局部，以真实任务完成度和计时状态驱动。全部保留原图，CSS 裁切展示，不伪称新增了独立立绘或动画帧。图一校园门口画面为原图局部，精细全身人物校门合成留作独立素材迭代。素材清单配置化，未来可替换场景和表情。

## 开发路线与验收顺序

1. 基础架构：依赖、数据模型、本地身份、同源 API；验收注册登录/退出/未授权/跨用户隔离。
2. 番茄钟：任务关联、自定义、暂停恢复、刷新恢复、提前打卡；验收实际时长、并发、重复打卡。
3. 学习规划：创建计划和任务、今日/周/路线图、完成切换、Recharts 统计；验收持久化、空状态和真实聚合。
4. Agent：内网模型适配、结构化工具、审批、过期冲突；验收无模型提示、白名单/非法参数、幂等审批。真实模型端到端需模型服务后补，测试替身不得算真实模型成功。
5. 交付：生产构建、README、Compose/Nginx、离线说明、功能验收表和当前限制。当前未安装 Docker，不能宣称容器启动和 PostgreSQL 实机验收通过。
