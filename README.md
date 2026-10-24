# StudyFlow

一个面向大学生的学习与生活工作台。把课程笔记、学习讨论、计划确认和专注记录放在同一个空间，并加入校园场景、林连理常驻伙伴与「羁遇故事」。

## 已有功能

- 本地账号、HttpOnly 会话和按用户隔离的数据。
- 学习计划、按日期的待办、成长路线与专注计时；暂停、恢复、刷新和实际时长打卡。
- 文字资料库，支持粘贴文字与 UTF-8 TXT/Markdown；检索保留资料名和段落位置。
- 学习与生活 Agent：持久化会话、有用户原话依据的待验证学习观察、有预算的工具循环。
- 模型提出计划或任务调整，用户检查并确认后才写入；保护重复确认、跨账号操作与版本冲突。
- 校园场景、Q版常驻伙伴和可回看、续读的本地剧情。

这是可在本机运行的项目。公开服务器部署尚在规划中；PDF/OCR、精确钟点课表、冲突检测、后台通知及教学效果评测尚未完成。当前网站伙伴使用图片和界面动画，未接入 Live2D。

## 本地运行

需要 Node.js 24 LTS。默认使用 SQLite，无需云模型也能手动规划、计时和查看记录。

```powershell
npm ci
npm run db:setup
npm run build
npm start
```

打开 http://localhost:3000 。首次 `db:setup` 会从 `.env.example` 创建本地 `.env`。默认只监听本机。

## 模型配置

在 `.env` 设置可信的 OpenAI 兼容服务，然后重启：

```dotenv
MODEL_BASE_URL="https://your-model-service.example/v1"
MODEL_NAME="your-tool-calling-model"
MODEL_API_KEY="your-private-key"
```

服务需要支持工具调用。当前实现曾使用 DeepSeek 完成真实接口和页面验收；这不代表接入了官方 LearnBuddy API。

发送消息时，输入、必要的学习概况和最近会话会发送给所配置的模型服务；勾选资料许可后，相关资料片段也可能被发送。云模型可能收费。密钥仅配置在服务端，不要提交 `.env`、数据库或登录状态。

## 检查

```powershell
npm test
npm run typecheck
npm run build
```

服务运行后可执行 `npm run test:api`。它会创建并清理专用验收账号；务必显式把 `DATABASE_URL` 指向同一实例的数据库。单元/服务测试使用受控模型，不能作为真实云模型验收证据。

## 目录

- `src/modules/`：账号、规划、专注、统计、模型、资料和学习 Agent。
- `src/app/api/`：鉴权、同源检查与 API。
- `src/components/`：工作台、伙伴和剧情界面。
- `prisma/`：SQLite/PostgreSQL schema 与 PostgreSQL 迁移。
- `deploy/`、`Dockerfile`、`compose.yaml`：部署准备，尚未完成 Docker/PostgreSQL 实机验收。

## 素材与许可

原创应用代码按 [MIT](LICENSE) 开源。角色、校园插画和品牌素材不自动适用代码的 MIT 许可，详见 [素材说明](ASSET-NOTICE.md)。第三方依赖保留各自许可。

公开源码包不包含原始课件、个人记录、第三方背景音乐、Live2D SDK、参赛录屏或本地工作历史。开源版默认关闭剧情音乐；如有已获授权的音乐，可通过 `NEXT_PUBLIC_STORY_MUSIC_URL` 和 `NEXT_PUBLIC_STORY_MUSIC_TITLE` 配置，修改后重新构建。

## 后续方向

继续完善资料格式与学习反馈，拓展工作台的更多可能性；补齐部署、安全、备份和多人使用验证后，通过云端服务器上线。
