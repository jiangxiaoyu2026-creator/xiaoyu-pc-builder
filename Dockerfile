# Stage 1: Build Frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Build Backend & Final Image
FROM python:3.9-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY server_py/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy frontend build from stage 1
COPY --from=frontend-builder /app/dist ./dist

# Copy backend code
COPY server_py/ ./server_py/
COPY .env ./

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Expose port
EXPOSE 8000

# Start server
CMD ["python", "-m", "uvicorn", "server_py.main:app", "--host", "0.0.0.0", "--port", "8000"]
