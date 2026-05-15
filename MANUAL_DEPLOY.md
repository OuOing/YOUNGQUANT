# 手动部署修复指南

如果自动脚本无法使用，请按照以下步骤手动部署：

## 步骤 1: 提交并推送代码

在本地执行：

```bash
cd /Users/bytedance/youngquant

# 提交更改
git add server/database.go
git commit -m "fix: 添加 PostgreSQL portfolios 表的 initial_cash 字段"

# 推送到远程仓库
git push origin main
# 或者
git push origin master
```

## 步骤 2: SSH 连接到远程服务器

```bash
ssh root@youngquant.top
# 或者使用你的实际服务器地址
```

## 步骤 3: 拉取最新代码

在远程服务器上执行：

```bash
cd /root/youngquant  # 或你的实际项目目录
git pull
```

## 步骤 4: 修复数据库

在远程服务器上执行：

```bash
# 方法 A: 使用一行命令
docker compose exec -T postgres psql -U youngquant youngquant -c "ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS initial_cash DOUBLE PRECISION DEFAULT 100000.0; UPDATE portfolios SET initial_cash = CASE WHEN initial_cash IS NULL OR initial_cash = 0 THEN CASE WHEN cash > 0 THEN cash ELSE 100000.0 END ELSE initial_cash END;"

# 方法 B: 交互式修复（推荐，可以看到执行过程）
docker compose exec postgres psql -U youngquant youngquant
```

如果使用方法 B，在 PostgreSQL 提示符下执行：

```sql
-- 添加字段
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS initial_cash DOUBLE PRECISION DEFAULT 100000.0;

-- 为已存在的用户设置初始资金
UPDATE portfolios 
SET initial_cash = CASE 
    WHEN initial_cash IS NULL OR initial_cash = 0 THEN 
        CASE 
            WHEN cash > 0 THEN cash 
            ELSE 100000.0 
        END
    ELSE initial_cash 
END;

-- 查看修复结果
SELECT user_id, cash, initial_cash FROM portfolios;

-- 退出
\q
```

## 步骤 5: 重新构建并部署

在远程服务器上执行：

```bash
# 重新构建镜像
docker compose build youngquant

# 重启服务
docker compose up -d youngquant

# 查看启动日志
docker compose logs -f youngquant
```

按 `Ctrl+C` 退出日志查看。

## 步骤 6: 验证修复

### 6.1 检查服务状态

```bash
docker compose ps
```

应该看到 `youngquant` 服务状态为 `Up`。

### 6.2 检查数据库表结构

```bash
docker compose exec postgres psql -U youngquant youngquant -c "\d portfolios"
```

应该能看到 `initial_cash` 字段。

### 6.3 检查用户数据

```bash
docker compose exec postgres psql -U youngquant youngquant -c "SELECT user_id, cash, initial_cash FROM portfolios;"
```

应该看到所有用户都有 `initial_cash` 值（默认 100000）。

### 6.4 访问网站验证

打开浏览器访问：
- http://youngquant.top:8080

登录或注册账户，进入个人中心，确认总资产显示正确。

## 常见问题排查

### 问题 1: 服务无法启动

```bash
# 查看详细日志
docker compose logs youngquant

# 检查端口占用
netstat -tlnp | grep 8080

# 重启所有服务
docker compose restart
```

### 问题 2: 数据库连接失败

```bash
# 检查 PostgreSQL 状态
docker compose ps postgres

# 查看 PostgreSQL 日志
docker compose logs postgres

# 重启 PostgreSQL
docker compose restart postgres
```

### 问题 3: 仍然显示 0 元

```bash
# 检查数据库中的实际数据
docker compose exec postgres psql -U youngquant youngquant -c "SELECT * FROM portfolios WHERE user_id = 1;"

# 检查应用日志中是否有错误
docker compose logs youngquant | grep -i error

# 清除浏览器缓存并刷新页面
```

### 问题 4: Git pull 失败

```bash
# 查看当前状态
git status

# 如果有本地修改，先暂存
git stash

# 拉取最新代码
git pull

# 恢复暂存的修改
git stash pop
```

## 回滚方案

如果部署后出现问题，可以回滚到之前的版本：

```bash
# 查看提交历史
git log --oneline -5

# 回滚到上一个版本
git reset --hard HEAD~1

# 重新构建并部署
docker compose build youngquant
docker compose up -d youngquant
```

## 需要帮助？

如果以上步骤无法解决问题，请提供以下信息：

1. 服务日志：
   ```bash
   docker compose logs youngquant > logs.txt
   ```

2. 数据库表结构：
   ```bash
   docker compose exec postgres psql -U youngquant youngquant -c "\d portfolios" > schema.txt
   ```

3. 用户数据示例：
   ```bash
   docker compose exec postgres psql -U youngquant youngquant -c "SELECT * FROM portfolios LIMIT 1;" > data.txt
   ```

将这些文件发送给技术支持。
