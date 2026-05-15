#!/bin/bash

# 修复远程部署中 portfolios 表缺少 initial_cash 字段的问题

echo "🔧 开始修复 initial_cash 字段问题..."

# 1. 为 portfolios 表添加 initial_cash 字段
echo "📝 添加 initial_cash 字段..."
docker compose exec -T postgres psql -U youngquant youngquant <<EOF
-- 添加 initial_cash 字段（如果不存在）
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS initial_cash DOUBLE PRECISION DEFAULT 100000.0;

-- 为已存在的用户设置 initial_cash
-- 如果 initial_cash 为 NULL 或 0，则设置为当前 cash 值
UPDATE portfolios 
SET initial_cash = CASE 
    WHEN initial_cash IS NULL OR initial_cash = 0 THEN cash 
    ELSE initial_cash 
END;

-- 验证修复结果
SELECT user_id, cash, initial_cash FROM portfolios LIMIT 5;
EOF

echo "✅ 修复完成！"
echo ""
echo "📊 当前 portfolios 表结构："
docker compose exec -T postgres psql -U youngquant youngquant -c "\d portfolios"

echo ""
echo "🔄 重启应用以应用更改..."
docker compose restart youngquant

echo ""
echo "✅ 所有操作完成！请刷新网页查看效果。"
