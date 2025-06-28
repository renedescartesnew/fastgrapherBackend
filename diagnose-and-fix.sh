
#!/bin/bash

set -e

echo "🔍 Diagnosing FastGrapher Backend Issues..."

# SSH to server and diagnose the problem
ssh root@37.27.2.53 << 'EOF'
cd /opt/fastgrapher

echo "=== CURRENT SYSTEM STATUS ==="
echo "🔍 Checking what's running on ports..."
netstat -tulpn | grep -E ':80|:8080|:443' || echo "No services on these ports"

echo ""
echo "🐳 Docker container status:"
docker ps -a

echo ""
echo "🐳 Docker compose status:"
docker-compose -f docker-compose.hetzner.yml ps

echo ""
echo "📋 Docker logs (last 20 lines):"
docker-compose -f docker-compose.hetzner.yml logs --tail=20 || echo "No logs available"

echo ""
echo "=== FIXING BACKEND ==="
echo "🛑 Stopping all containers..."
docker-compose -f docker-compose.hetzner.yml down || true

echo "🧹 Cleaning up stopped containers..."
docker container prune -f

echo "🔧 Checking Docker Compose file..."
if [ -f docker-compose.hetzner.yml ]; then
    echo "✅ Docker Compose file exists"
    echo "📋 Port configuration:"
    grep -A 5 -B 5 "ports:" docker-compose.hetzner.yml || echo "No ports section found"
else
    echo "❌ Docker Compose file missing!"
    exit 1
fi

echo ""
echo "🚀 Starting backend with detailed logging..."
docker-compose -f docker-compose.hetzner.yml up -d

echo "⏳ Waiting 15 seconds for container to start..."
sleep 15

echo ""
echo "📊 Container status after restart:"
docker-compose -f docker-compose.hetzner.yml ps

echo ""
echo "📋 Fresh container logs:"
docker-compose -f docker-compose.hetzner.yml logs --tail=30

echo ""
echo "🧪 Testing direct backend connection..."
curl -v http://127.0.0.1:8080/api/health 2>&1 || echo "Direct connection failed"

echo ""
echo "🧪 Testing through nginx..."
curl -v http://api.fastgrapher.com/api/health 2>&1 || echo "Nginx proxy failed"

echo ""
echo "🔍 Nginx error logs (if any):"
tail -20 /var/log/nginx/error.log 2>/dev/null || echo "No nginx error logs"

echo ""
echo "=== ENVIRONMENT VARIABLES CHECK ==="
echo "Checking if .env file exists..."
if [ -f .env ]; then
    echo "✅ .env file exists"
    echo "📋 Environment variables set:"
    grep -E "^[A-Z]" .env | head -5 | sed 's/=.*/=***/' || echo "No env vars visible"
else
    echo "❌ .env file missing - this is likely the problem!"
    echo "Creating minimal .env file..."
    cat > .env << 'ENVEOF'
NODE_ENV=production
PORT=8080
HOST=0.0.0.0
MONGO_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/fastgrapher
JWT_SECRET=your-super-secure-jwt-secret-here
ENVEOF
    echo "✅ Created minimal .env file - you need to update MongoDB URI and JWT secret"
fi

exit
EOF

echo "🎉 Diagnosis completed!"
echo ""
echo "📋 Next steps based on the output above:"
echo "1. If .env file was missing, update it with your MongoDB credentials"
echo "2. If container won't start, check the Docker logs for errors" 
echo "3. If everything looks good, test your login again"

