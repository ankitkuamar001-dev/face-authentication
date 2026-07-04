FROM node:20-slim

WORKDIR /app

# Copy everything including pre-installed node_modules from host
COPY . .

EXPOSE 3000

CMD ["./node_modules/.bin/vite", "--host", "0.0.0.0", "--port", "3000"]
