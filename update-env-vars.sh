
#!/bin/bash

set -e

echo "🔧 Updating environment variables on Hetzner server..."

# SSH to server and update environment variables
ssh root@37.27.2.53 << 'EOF'
cd /opt/fastgrapher

echo "📝 Backing up current .env file..."
cp .env .env.backup.$(date +%Y%m%d_%H%M%S) || true

echo "🔧 Updating environment variables..."
cat > .env << 'ENVEOF'
# Application
PORT=8080
NODE_ENV=production
HOST=0.0.0.0

# MongoDB Connection
MONGO_URI="mongodb+srv://renedescartesnew:FHUwCVuj5y6SL8nW@breakroomcupcluster.uudts.mongodb.net/?retryWrites=true&w=majority&appName=breakRoomCupCluster"

# JWT Configuration
JWT_SECRET=fastgrapher-super-secure-jwt-secret-key-2024-production-ready

# Email Configuration (Gmail example)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-password
MAIL_FROM=noreply@fastgrapher.com

# Frontend URLs for CORS
FRONTEND_URL=https://www.fastgrapher.com/,https://francemed-df379.web.app/,http://localhost:8080
ENVEOF

echo "✅ Environment variables updated successfully!"
echo ""
echo "📋 Current .env configuration:"
cat .env

echo ""
echo "🛑 Stopping any existing containers..."
docker-compose -f docker-compose.hetzner.yml down || true

echo "🧹 Cleaning up containers and networks..."
docker container prune -f || true
docker network prune -f || true

echo "🚀 Starting backend with new configuration..."
docker-compose -f docker-compose.hetzner.yml up -d

echo "⏳ Waiting for backend to start..."
sleep 20

echo "📊 Container status:"
docker-compose -f docker-compose.hetzner.yml ps

echo "📋 Container logs:"
docker-compose -f docker-compose.hetzner.yml logs --tail=30

echo "🧪 Testing backend health..."
sleep 5
if curl -f http://localhost:8080/api/health 2>/dev/null; then
    echo "✅ Backend is running successfully!"
else
    echo "⚠️ Backend health check failed, but container might still be starting..."
    echo "📋 Recent logs:"
    docker-compose -f docker-compose.hetzner.yml logs --tail=10
fi

exit
EOF

echo "🎉 Environment update completed!"
echo ""
echo "🧪 Testing external connectivity..."
sleep 5

echo "Testing HTTP connection..."
if curl -f http://api.fastgrapher.com/api/health 2>/dev/null; then
    echo "✅ HTTP connection working!"
else
    echo "⚠️ HTTP connection failed"
fi

echo "Testing HTTPS connection..."
if curl -f https://api.fastgrapher.com/api/health 2>/dev/null; then
    echo "✅ HTTPS connection working!"
else
    echo "⚠️ HTTPS connection failed"
fi

echo ""
echo "📝 Next steps:"
echo "1. Your backend should now be running with the correct MongoDB connection"
echo "2. Test your frontend applications with the new backend"
echo "3. If you need email functionality, update the MAIL_USER and MAIL_PASS variables"
