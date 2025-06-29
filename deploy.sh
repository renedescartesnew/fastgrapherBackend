
#!/bin/bash

set -e

echo "🚀 Deploying FastGrapher Backend..."

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Please create one based on .env.example"
    exit 1
fi

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down || true

# Build and start new containers
echo "🏗️ Building and starting containers..."
docker-compose build --no-cache
docker-compose up -d

# Show container status
echo "📊 Container status:"
docker-compose ps

# Wait for health check
echo "⏳ Waiting for health check..."
sleep 30

# Test health endpoint
echo "🔍 Testing health endpoint..."
if curl -f http://localhost:8080/api/health; then
    echo "✅ Deployment successful!"
    echo "🌐 Backend is running at: http://localhost:8080"
else
    echo "❌ Health check failed. Check logs with: docker-compose logs"
    exit 1
fi
