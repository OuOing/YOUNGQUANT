-- 为 PostgreSQL 添加 initial_cash 字段（如果不存在）
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS initial_cash DOUBLE PRECISION DEFAULT 100000.0;

-- 为已存在的记录设置 initial_cash = cash（假设他们还没有交易）
UPDATE portfolios SET initial_cash = cash WHERE initial_cash IS NULL OR initial_cash = 0;
