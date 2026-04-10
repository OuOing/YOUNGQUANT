# ---- Stage 1: Build frontend ----
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- Stage 2: Build Go backend ----
FROM golang:1.22-alpine AS backend-builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o youngquant_server ./server/...

# ---- Stage 3: Final image ----
FROM alpine:3.19
RUN apk add --no-cache ca-certificates python3 py3-pip tzdata
ENV TZ=Asia/Shanghai

WORKDIR /app

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

# Install Python deps (minimal, no pandas/numpy for now)
RUN pip3 install --no-cache-dir requests 2>/dev/null || true

EXPOSE 8080

ENV GIN_MODE=release
ENV PROJECT_DIR=/app

CMD ["./youngquant_server"]
