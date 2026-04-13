# ---- Stage 1: Frontend dist (pre-built locally) ----
FROM alpine:3.19 AS frontend-builder
WORKDIR /app/frontend
COPY frontend/dist ./dist

# ---- Stage 2: Go binary (pre-built locally for linux/amd64) ----
FROM alpine:3.19 AS backend-builder
WORKDIR /app
COPY youngquant_server_linux ./youngquant_server

# ---- Stage 3: Final image (Debian for Python scientific packages) ----
FROM python:3.11-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates tzdata && \
    rm -rf /var/lib/apt/lists/*
ENV TZ=Asia/Shanghai

WORKDIR /app

# Install Python deps
RUN pip install --no-cache-dir -i https://pypi.tuna.tsinghua.edu.cn/simple \
    requests openai akshare pandas numpy scikit-learn xgboost

# Copy backend binary
COPY --from=backend-builder /app/youngquant_server .

# Copy frontend dist
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Copy data directory (stock CSVs)
COPY data/ ./data/

# Copy AI module
COPY ai/ ./ai/
COPY backtest.py .
COPY fetch_data.py .
COPY prepare_features.py .
COPY train_model.py .
COPY predict.py .

EXPOSE 8080

ENV GIN_MODE=release
ENV PROJECT_DIR=/app

CMD ["./youngquant_server"]
