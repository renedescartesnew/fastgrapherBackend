
#!/bin/bash

set -e

echo "🔄 Restarting FastGrapher Backend..."

# SSH to server and restart the application
ssh root@37.27.2.53 << 'EOF'
cd /opt/fastgrapher

echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.hetzner.yml down || true

echo "🧹 Cleaning up any remaining containers..."
docker container prune -f || true

echo "🚀 Starting backend on port 8080..."
docker-compose -f docker-compose.hetzner.yml up -d

echo "⏳ Waiting for backend to start..."
sleep 30

echo "📊 Container status:"
docker-compose -f docker-compose.hetzner.yml ps

echo "🔍 Testing backend directly..."
curl -f http://127.0.0.1:8080/api/health && echo "✅ Backend is running!" || echo "❌ Backend failed to start"

echo "🔍 Testing nginx proxy..."
curl -f http://api.fastgrapher.com/api/health && echo "✅ Nginx proxy working!" || echo "❌ Nginx proxy failed"

echo "🔍 Testing HTTPS..."
curl -f https://api.fastgrapher.com/api/health && echo "✅ HTTPS working!" || echo "❌ HTTPS failed"

echo "🎉 Backend restart completed!"

exit
EOF

echo "✅ Backend restart script completed!"
