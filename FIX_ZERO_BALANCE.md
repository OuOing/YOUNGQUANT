# 修复远程部署显示 0 元的问题

## 问题原因

远程部署的 PostgreSQL 数据库中，`portfolios` 表缺少 `initial_cash` 字段，导致：
1. 新注册用户的初始资金无法正确设置
2. 个人中心显示总资产为 0 元
3. 无法进行模拟交易

## 解决方案

### 方法一：使用自动修复脚本（推荐）

在服务器上执行以下命令：

```bash
cd /path/to/youngquant
./fix_initial_cash.sh
```

这个脚本会：
1. 为 `portfolios` 表添加 `initial_cash` 字段
2. 为已存在的用户设置合理的初始资金
3. 重启应用以应用更改

### 方法二：手动修复

如果自动脚本无法运行，可以手动执行以下步骤：

#### 1. 连接到 PostgreSQL 数据库

```bash
docker compose exec postgres psql -U youngquant youngquant
```

#### 2. 添加 initial_cash 字段

```sql
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS initial_cash DOUBLE PRECISION DEFAULT 100000.0;
```

#### 3. 为已存在的用户设置初始资金

```sql
-- 为所有用户设置 initial_cash = cash（假设他们还没有交易）
UPDATE portfolios 
SET initial_cash = CASE 
    WHEN initial_cash IS NULL OR initial_cash = 0 THEN cash 
    ELSE initial_cash 
END;
```

#### 4. 验证修复结果

```sql
SELECT user_id, cash, initial_cash FROM portfolios;
```

#### 5. 退出数据库并重启应用

```sql
\q
```

```bash
docker compose restart youngquant
```

## 验证修复

1. 访问你的网站
2. 登录已有账户或注册新账户
3. 进入个人中心
4. 确认总资产显示正确（默认应该是 ¥100,000）

## 预防措施

为了避免将来出现类似问题，已经更新了代码：

1. **database.go**: PostgreSQL schema 中已添加 `initial_cash` 字段
2. **handlers.go**: 注册时会正确设置 `initial_cash`

下次部署时，新用户将自动获得正确的初始资金。

## 如果问题仍然存在

如果修复后问题仍然存在，请检查：

1. **数据库连接**: 确认应用连接的是正确的数据库
   ```bash
   docker compose logs youngquant | grep -i "connected to"
   ```

2. **环境变量**: 确认 `DATABASE_URL` 设置正确
   ```bash
   docker compose exec youngquant env | grep DATABASE_URL
   ```

3. **表结构**: 确认字段已添加
   ```bash
   docker compose exec postgres psql -U youngquant youngquant -c "\d portfolios"
   ```

4. **用户数据**: 查看具体用户的数据
   ```sql
   SELECT * FROM portfolios WHERE user_id = 1;
   ```

## 联系支持

如果以上方法都无法解决问题，请提供以下信息：
- 错误日志：`docker compose logs youngquant`
- 数据库表结构：`\d portfolios`
- 用户数据示例：`SELECT * FROM portfolios LIMIT 1;`
