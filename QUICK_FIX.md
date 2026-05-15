# 快速修复命令（复制粘贴即可）

## 如果你能 SSH 到服务器

### 一键修复命令（推荐）

复制以下整个代码块，粘贴到你的远程服务器终端：

```bash
cd /root/youngquant && \
git pull && \
docker compose exec -T postgres psql -U youngquant youngquant << 'EOF'
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS initial_cash DOUBLE PRECISION DEFAULT 100000.0;
UPDATE portfolios SET initial_cash = CASE WHEN initial_cash IS NULL OR initial_cash = 0 THEN CASE WHEN cash > 0 THEN cash ELSE 100000.0 END ELSE initial_cash END;
SELECT user_id, cash, initial_cash FROM portfolios;
EOF
docker compose build youngquant && \
docker compose up -d youngquant && \
echo "✅ 修复完成！请刷新网页查看效果。"
```

### 分步执行（如果一键命令失败）

#### 1. 进入项目目录并拉取代码
```bash
cd /root/youngquant
git pull
```

#### 2. 修复数据库
```bash
docker compose exec -T postgres psql -U youngquant youngquant -c "ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS initial_cash DOUBLE PRECISION DEFAULT 100000.0;"
docker compose exec -T postgres psql -U youngquant youngquant -c "UPDATE portfolios SET initial_cash = CASE WHEN initial_cash IS NULL OR initial_cash = 0 THEN CASE WHEN cash > 0 THEN cash ELSE 100000.0 END ELSE initial_cash END;"
```

#### 3. 重新部署
```bash
docker compose build youngquant
docker compose up -d youngquant
```

#### 4. 验证
```bash
docker compose exec postgres psql -U youngquant youngquant -c "SELECT user_id, cash, initial_cash FROM portfolios;"
```

## 如果你在本地（Mac）

### 使用自动部署脚本

```bash
cd /Users/bytedance/youngquant

# 先提交代码
git add server/database.go
git commit -m "fix: 添加 initial_cash 字段"
git push

# 然后运行部署脚本（需要替换为你的服务器地址）
./deploy_fix.sh root@youngquant.top
```

### 或者手动 SSH 执行

```bash
# 1. 提交并推送代码
cd /Users/bytedance/youngquant
git add server/database.go
git commit -m "fix: 添加 initial_cash 字段"
git push

# 2. SSH 到服务器并执行修复
ssh root@youngquant.top 'cd /root/youngquant && git pull && docker compose exec -T postgres psql -U youngquant youngquant -c "ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS initial_cash DOUBLE PRECISION DEFAULT 100000.0; UPDATE portfolios SET initial_cash = CASE WHEN initial_cash IS NULL OR initial_cash = 0 THEN CASE WHEN cash > 0 THEN cash ELSE 100000.0 END ELSE initial_cash END;" && docker compose build youngquant && docker compose up -d youngquant'
```

## 验证修复是否成功

访问你的网站：http://youngquant.top:8080

1. 登录或注册账户
2. 进入个人中心
3. 查看总资产是否显示正确（应该是 ¥100,000 或你设置的金额）

## 如果还是 0 元

执行以下命令检查：

```bash
# 在远程服务器上执行
docker compose exec postgres psql -U youngquant youngquant -c "SELECT user_id, email, cash, initial_cash FROM portfolios JOIN users ON portfolios.user_id = users.id;"
```

如果 `initial_cash` 仍然是 0 或 NULL，手动设置：

```bash
docker compose exec postgres psql -U youngquant youngquant -c "UPDATE portfolios SET initial_cash = 100000.0, cash = 100000.0 WHERE initial_cash IS NULL OR initial_cash = 0;"
```

然后重启服务：

```bash
docker compose restart youngquant
```

## 紧急联系

如果以上所有方法都不行，可能需要：

1. 检查 Git 仓库是否已推送最新代码
2. 检查服务器上的代码版本是否是最新的
3. 查看完整的错误日志：`docker compose logs youngquant`
