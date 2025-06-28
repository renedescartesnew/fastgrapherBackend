
#!/bin/bash

echo "🔧 Updating backend CORS configuration for production domains..."

# SSH to server and update environment
ssh root@37.27.2.53 << 'EOF'
cd /opt/fastgrapher

# Backup current .env
cp .env .env.backup

# Update FRONTEND_URL to include your production domains
if grep -q "FRONTEND_URL=" .env; then
    sed -i 's|FRONTEND_URL=.*|FRONTEND_URL=https://www.fastgrapher.com,https://fastgrapher.com|' .env
else
    echo "FRONTEND_URL=https://www.fastgrapher.com,https://fastgrapher.com" >> .env
fi

echo "✅ Updated .env file:"
cat .env

echo "🔄 Restarting backend containers..."
docker-compose -f docker-compose.hetzner.yml restart

echo "⏳ Waiting for backend to start..."
sleep 15

echo "🧪 Testing backend health..."
curl -f http://localhost:8080/api/health && echo "✅ Backend is healthy!"

echo "🌐 Your backend is now configured for:"
echo "  - https://www.fastgrapher.com"
echo "  - https://fastgrapher.com"

exit
EOF

echo "🎉 Backend CORS configuration updated!"
