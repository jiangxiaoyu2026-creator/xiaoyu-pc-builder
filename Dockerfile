# Stage 1: Build Frontend
FROM docker.1ms.run/node:20.18-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Build Backend & Final Image
FROM docker.1ms.run/python:3.12-slim
WORKDIR /app

RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources \
    && sed -i 's/security.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY server_py/requirements.txt ./
#RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir -i https://mirrors.aliyun.com/pypi/simple/ --trusted-host mirrors.aliyun.com -r requirements.txt
# Copy frontend build from stage 1
COPY --from=frontend-builder /app/dist ./dist

# Copy backend code
COPY server_py/ ./server_py/

# Create data directory for SQLite
RUN mkdir -p /app/data

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=8000
ENV RELOAD=false

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Start server
CMD ["python", "-m", "uvicorn", "server_py.main:app", "--host", "0.0.0.0", "--port", "8000"]
