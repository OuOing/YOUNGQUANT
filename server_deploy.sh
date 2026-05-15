#!/bin/bash
# 在服务器上直接运行此脚本
# 用法: bash server_deploy.sh

set -e

echo "🚀 开始部署 YoungQuant..."
echo ""

# 1. 拉取最新代码
echo "📥 [1/4] 拉取最新代码..."
cd /root/youngquant
git pull
echo "✅ 代码更新完成"
echo ""

# 2. 修复数据库
echo "🔧 [2/4] 修复数据库..."
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
\echo '修复结果:'
SELECT user_id, cash, initial_cash FROM portfolios;
EOF
echo "✅ 数据库修复完成"
echo ""

# 3. 重新构建
echo "🔨 [3/4] 重新构建应用..."
docker compose build youngquant
echo "✅ 构建完成"
echo ""

# 4. 重启服务
echo "🔄 [4/4] 重启服务..."
docker compose up -d youngquant
sleep 3
echo "✅ 服务重启完成"
echo ""

# 验证
echo "📊 服务状态:"
docker compose ps youngquant
echo ""

echo "🎉 部署完成！"
echo ""
echo "请访问 http://youngquant.top:8080 或 http://14.103.10.193:8080 验证"
echo ""
echo "如需查看日志，运行: docker compose logs -f youngquant"
