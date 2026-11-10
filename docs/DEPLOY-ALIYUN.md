# StudyFlow 阿里云上线交付 · 2026-10-25

2026-11-10 复查：HTTPS 首页返回 200、证书校验通过，`/api/health` 返回 `{"status":"ok"}`。下方完整部署和写入验收记录来自 2026-10-25。

- 线上地址：https://8.146.229.235/ （HTTP 自动跳转 HTTPS）
- 阿里云轻量应用服务器：乌兰察布，Ubuntu 24.04，2 核 2GB，已加 3GB swap。
- 服务：Node.js 24 / Next.js standalone / PostgreSQL / Nginx / systemd。
- 应用目录：`/opt/studyflow`；配置：`/etc/studyflow.env`，权限 600。
- 应用和数据库仅监听本机；公网使用 80/443。
- 证书：Let’s Encrypt IP 证书，`studyflow-cert-renew.timer` 每六小时检查续期并 reload Nginx。用户已明确同意申请与自动续期。
- 应用、Nginx、PostgreSQL 和证书续期 timer 均为 active/enabled。

## 使用

首次注册自己的账号。本地 SQLite 账号与学习记录没有迁移到线上 PostgreSQL。

在「空间设置 → 连接你自己的 AI」选择 DeepSeek/OpenAI，填写支持工具调用的模型名称及自己的 API Key。密钥按账号使用 AES-256-GCM 加密保存，可替换、移除，不回显，也不包含在数据导出中。保存配置不代表验证连接；实际发送消息时才调用模型。

未上传作者本地 DeepSeek 密钥。浏览器验收账号中的已知假密钥已精确移除；用户在该账号的会话保留。新注册账号默认没有模型配置。

## 验收证据

- 本地 13 项测试、TypeScript 检查及生产构建通过。
- 服务器 Linux standalone 构建和三次 PostgreSQL 版本迁移通过。
- HTTPS 公网基础 API 验收 19 项通过（注册登录、用户隔离、计划任务、专注与持久化、退出）。
- HTTPS 个人密钥 API 验收 8 项通过（鉴权、同源、禁止自定义内网地址、加密、不回显、账号隔离、移除生效）。
- 浏览器实际完成 HTTPS 访问、注册、进入工作台、保存个人配置；保存后密码输入框清空。
- `/api/health` 返回 `{"status":"ok"}`。
- 个人密钥功能使用假密钥和受控模型验收，未代表用户真实云模型调用成功，未使用作者额度。
- 服务器验收日志：`/var/log/studyflow-acceptance.log`；构建日志：`/var/log/studyflow-deploy.log`；证书日志：`/var/log/studyflow-publish.log`。

## 运维

```bash
systemctl status studyflow nginx postgresql
journalctl -u studyflow --since '30 minutes ago'
systemctl restart studyflow
systemctl list-timers studyflow-cert-renew.timer
/opt/certbot/bin/certbot renew --dry-run
curl -fsS https://8.146.229.235/api/health
```

备份需要同时保留 PostgreSQL 数据和 `/etc/studyflow.env` 中的加密密钥。当前没有配置自动数据库备份。

```bash
umask 077
mkdir -p /var/backups/studyflow
runuser -u postgres -- pg_dump studyflow | gzip > /var/backups/studyflow/database-$(date +%F-%H%M%S).sql.gz
cp -p /etc/studyflow.env /var/backups/studyflow/studyflow.env
```

部署脚本为 `deploy/aliyun-native.sh`，个人密钥功能及对应数据库迁移已同步到公开源码。

该脚本是现有 Ubuntu 24.04 部署环境的执行脚本，不包含完整的服务器初始化：需先安装 Node.js 24（脚本使用 `/usr/local/bin/node`）、PostgreSQL、Nginx、OpenSSL 和 `/opt/certbot/bin/certbot`，创建 `studyflow` 系统用户，并把源码放到 `/opt/studyflow`。执行时需使用 root 权限并设置 `PUBLIC_IP`。脚本会配置数据库、申请证书、运行迁移与构建，并写入 Nginx 和 systemd 配置。

原生部署和 Docker Compose 是两条独立路线；上述实际验收结果不代表已完成 Docker 容器验收。
