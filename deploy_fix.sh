#!/bin/bash

# YoungQuant 远程部署修复脚本
# 用法: ./deploy_fix.sh [user@host]
# 示例: ./deploy_fix.sh root@youngquant.top

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查参数
if [ -z "$1" ]; then
    echo -e "${RED}错误: 请提供远程服务器地址${NC}"
    echo "用法: ./deploy_fix.sh user@host"
    echo "示例: ./deploy_fix.sh root@youngquant.top"
    exit 1
fi

REMOTE_HOST="$1"
REMOTE_DIR="/root/youngquant"  # 根据实际情况修改

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}YoungQuant 远程部署修复${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "远程服务器: ${YELLOW}$REMOTE_HOST${NC}"
echo -e "远程目录: ${YELLOW}$REMOTE_DIR${NC}"
echo ""

# 1. 提交本地更改
echo -e "${GREEN}[1/6] 提交本地代码更改...${NC}"
git add server/database.go
git commit -m "fix: 添加 PostgreSQL portfolios 表的 initial_cash 字段" || echo "没有新的更改需要提交"

# 2. 推送到远程仓库
echo -e "${GREEN}[2/6] 推送到 Git 仓库...${NC}"
git push origin main || git push origin master

# 3. 在远程服务器上拉取最新代码
echo -e "${GREEN}[3/6] 在远程服务器拉取最新代码...${NC}"
ssh "$REMOTE_HOST" << 'ENDSSH'
cd /root/youngquant
echo "当前目录: $(pwd)"
git pull
ENDSSH

# 4. 修复数据库
echo -e "${GREEN}[4/6] 修复数据库 initial_cash 字段...${NC}"
ssh "$REMOTE_HOST" << 'ENDSSH'
cd /root/youngquant

echo "添加 initial_cash 字段..."
docker compose exec -T postgres psql -U youngquant youngquant << 'EOF'
-- 添加 initial_cash 字段
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

-- 显示修复结果
SELECT user_id, cash, initial_cash, 
       cash + COALESCE((SELECT SUM(shares * (SELECT close FROM stock_bars WHERE symbol = holdings.symbol AND period = 'daily' ORDER BY date DESC LIMIT 1)) FROM holdings WHERE holdings.user_id = portfolios.user_id), 0) as total_assets
FROM portfolios;
EOF

echo "✅ 数据库修复完成"
ENDSSH

# 5. 重新构建并部署
echo -e "${GREEN}[5/6] 重新构建并部署应用...${NC}"
ssh "$REMOTE_HOST" << 'ENDSSH'
cd /root/youngquant

echo "构建新镜像..."
docker compose build youngquant

echo "重启服务..."
docker compose up -d youngquant

echo "等待服务启动..."
sleep 5

echo "检查服务状态..."
docker compose ps
ENDSSH

# 6. 验证部署
echo -e "${GREEN}[6/6] 验证部署结果...${NC}"
ssh "$REMOTE_HOST" << 'ENDSSH'
cd /root/youngquant

echo ""
echo "=== 服务状态 ==="
docker compose ps youngquant

echo ""
echo "=== 最近日志 ==="
docker compose logs --tail=20 youngquant

echo ""
echo "=== 数据库表结构 ==="
docker compose exec -T postgres psql -U youngquant youngquant -c "\d portfolios" | grep initial_cash || echo "⚠️  initial_cash 字段未找到"

echo ""
echo "=== 用户资产数据示例 ==="
docker compose exec -T postgres psql -U youngquant youngquant -c "SELECT user_id, cash, initial_cash FROM portfolios LIMIT 3;"
ENDSSH

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ 部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "请访问你的网站验证修复效果："
echo -e "${YELLOW}http://youngquant.top:8080${NC}"
echo ""
echo -e "如果问题仍然存在，请运行以下命令查看详细日志："
echo -e "${YELLOW}ssh $REMOTE_HOST 'cd $REMOTE_DIR && docker compose logs youngquant'${NC}"
