# Sử dụng Node.js LTS làm base image
FROM node:20-alpine

# Cài đặt các thư viện cần thiết cho việc generate PDF (nếu cần build native modules)
RUN apk add --no-cache python3 make g++

# Tạo thư mục làm việc
WORKDIR /app

# Copy package files để cài đặt trước (tận dụng Docker caching)
COPY package*.json ./

# Cài đặt dependencies (chỉ production)
RUN npm ci --only=production

# Copy toàn bộ mã nguồn
COPY . .

# Đảm bảo thư mục logs và uploads tồn tại
RUN mkdir -p logs uploads

# Mở cổng 3000
EXPOSE 3000

# Chạy app bằng node trực tiếp (hoặc dùng pm2-runtime nếu thích)
CMD ["node", "server.js"]
