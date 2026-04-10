# YoungQuant 部署指南

## 前置条件

- 服务器：Ubuntu 22.04，2核4G 以上（推荐 4核8G）
- 域名：已购买，DNS 解析到服务器 IP
- 本地：已安装 Git

---

## 一、服务器初始化

```bash
# 1. 更新系统
sudo apt update && sudo apt upgrade -y

# 2. 安装 Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# 3. 安装 Docker Compose
sudo apt install docker-compose-plugin -y

# 4. 安装 Nginx + Certbot（SSL）
sudo apt install nginx certbot python3-certbot-nginx -y
```

---

## 二、部署应用

```bash
# 1. 克隆代码
git clone https://github.com/your-repo/youngquant.git
cd youngquant

# 2. 配置环境变量
cp .env.example .env
nano .env
# 填写以下内容：
# DEEPSEEK_API_KEY=sk-your-key
# JWT_SECRET=$(openssl rand -hex 32)
# POSTGRES_PASSWORD=your-strong-password

# 3. 启动服务
docker compose up -d

# 4. 查看日志
docker compose logs -f youngquant
```

---

## 三、配置 HTTPS

```bash
# 1. 申请 SSL 证书（替换 your-domain.com）
sudo certbot --nginx -d your-domain.com

# 2. 配置 Nginx 反向代理
sudo tee /etc/nginx/sites-available/youngquant > /dev/null <<'EOF'
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # 前端静态文件
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API 接口
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 60s;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/youngquant /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## 四、环境变量说明

| 变量 | 说明 | 示例 |
|------|------|------|
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥（必填） | `sk-xxx` |
| `JWT_SECRET` | JWT 签名密钥，随机32位字符串（必填） | `openssl rand -hex 32` |
| `POSTGRES_PASSWORD` | 数据库密码（必填） | 自定义强密码 |
| `DATABASE_URL` | 自动由 docker-compose 设置 | 无需手动填写 |

---

## 五、关于验证码（内测阶段建议方案）

内测阶段不需要复杂的短信验证码，推荐以下两种方式：

### 方案 A：邀请码注册（推荐，最简单）

在 `.env` 中添加：
```
INVITE_CODE=your-secret-invite-code-2026
```

后端 `handleRegister` 中增加校验：
```go
// 在 handlers.go handleRegister 函数中添加
inviteCode := os.Getenv("INVITE_CODE")
if inviteCode != "" && req.InviteCode != inviteCode {
    c.JSON(http.StatusBadRequest, gin.H{"error": "邀请码错误，内测期间需要邀请码注册"})
    return
}
```

前端 `AuthModal.jsx` 注册表单中添加邀请码输入框。

把邀请码发给内测用户即可，简单有效。

### 方案 B：Cloudflare Turnstile（免费，无需手机号）

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com) → Turnstile → 添加站点
2. 获取 Site Key 和 Secret Key
3. 前端注册表单引入 Turnstile widget：
   ```html
   <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
   <div class="cf-turnstile" data-sitekey="YOUR_SITE_KEY"></div>
   ```
4. 后端注册时验证 token：
   ```go
   // 调用 Cloudflare API 验证
   resp, _ := http.PostForm("https://challenges.cloudflare.com/turnstile/v0/siteverify",
       url.Values{"secret": {secretKey}, "response": {cfToken}})
   ```

### 方案 C：邮箱验证（需要 SMTP）

如果你有邮箱服务（如 Resend.com 免费额度 3000封/月）：
1. 注册 [Resend](https://resend.com) 获取 API Key
2. 注册时发送 6 位验证码到邮箱
3. 验证码存 Redis 或内存 Map，5分钟过期

**内测阶段推荐方案 A（邀请码）**，零成本，完全可控。

---

## 六、更新部署

```bash
git pull
docker compose build youngquant
docker compose up -d youngquant
```

---

## 七、数据备份

```bash
# 备份 PostgreSQL 数据
docker compose exec postgres pg_dump -U youngquant youngquant > backup_$(date +%Y%m%d).sql

# 恢复
docker compose exec -T postgres psql -U youngquant youngquant < backup_20240101.sql
```

---

## 八、监控与日志

```bash
# 查看实时日志
docker compose logs -f youngquant

# 查看资源使用
docker stats

# 检查服务状态
docker compose ps
```

---

## 九、常见问题

**Q: 访问 502 Bad Gateway**
```bash
docker compose ps          # 检查容器状态
docker compose logs youngquant  # 查看错误日志
```

**Q: AI 功能不可用**
- 检查 `.env` 中 `DEEPSEEK_API_KEY` 是否正确
- 确认服务器能访问 `api.deepseek.com`（国内服务器可能需要代理）

**Q: K 线图没有数据**
- 首次部署后需要运行数据初始化：
```bash
docker compose exec youngquant python3 fetch_data.py --symbol 601899 --period daily
docker compose exec youngquant python3 prepare_features.py --symbol 601899 --period daily
```

**Q: SSL 证书过期**
```bash
sudo certbot renew  # 手动续期（certbot 会自动续期）
```

---

## 十、上线前检查清单

- [ ] `.env` 中所有必填变量已配置
- [ ] `JWT_SECRET` 已更换为随机字符串（不要用默认值）
- [ ] HTTPS 已配置并生效
- [ ] 数据库已初始化并有股票数据
- [ ] AI 功能测试通过（发送一条消息）
- [ ] 模拟交易测试通过（完成一笔买入）
- [ ] 邀请码或验证码机制已配置
- [ ] 备份策略已设置
