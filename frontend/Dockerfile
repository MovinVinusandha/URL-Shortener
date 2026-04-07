# Stage 1: Build the Vite application
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# Stage 2: Serve the application with Nginx (Non-Root)
FROM nginxinc/nginx-unprivileged:alpine AS runner

# Copy the build artifacts
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy secure nginx config
COPY nginx/templates /etc/nginx/templates

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]