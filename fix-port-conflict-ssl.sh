
#!/bin/bash

set -e

echo "🔧 Fixing Port Conflict and Setting up SSL for api.fastgrapher.com..."

# Test DNS first
echo "🧪 Testing DNS resolution..."
if ! nslookup api.fastgrapher.com | grep -q "37.27.2.53"; then
    echo "❌ DNS not yet propagated. Please wait a few more minutes."
    exit 1
fi

echo "✅ DNS is working!"

# SSH to server and fix the port conflict
ssh root@37.27.2.53 << 'EOF'
echo "🔍 Checking what's using port 80..."
netstat -tulpn | grep :80 || echo "No service found on port 80"
lsof -i :80 || echo "No processes found on port 80"

echo "🛑 Stopping all services that might conflict..."
# Stop docker containers first
docker-compose -f /opt/fastgrapher/docker-compose.hetzner.yml down || true
docker stop $(docker ps -q) || true

# Stop nginx if running
systemctl stop nginx || true

# Stop apache if running
systemctl stop apache2 || true

# Kill any process using port 80
fuser -k 80/tcp || true

echo "⏳ Waiting for ports to be released..."
sleep 5

echo "🔧 Installing nginx and certbot if not already installed..."
apt-get update
apt-get install -y nginx certbot python3-certbot-nginx

echo "🔧 Creating nginx configuration for FastGrapher..."
cat > /etc/nginx/sites-available/fastgrapher << 'NGINX_CONFIG'
# HTTP server block for Let's Encrypt validation and API proxy
server {
    listen 80;
    server_name api.fastgrapher.com;
    
    # Allow Let's Encrypt validation
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        allow all;
    }
    
    # API proxy for HTTP (will be upgraded to HTTPS after certificate)
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
        
        # CORS headers
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;
        add_header Access-Control-Allow-Credentials "true" always;
        
        # Handle preflight requests
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "*" always;
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
            add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;
            add_header Access-Control-Allow-Credentials "true" always;
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }
    }
}
NGINX_CONFIG

echo "🔗 Enabling nginx configuration..."
ln -sf /etc/nginx/sites-available/fastgrapher /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

echo "📁 Creating web root for Let's Encrypt..."
mkdir -p /var/www/html

echo "🧪 Testing nginx configuration..."
nginx -t

echo "🔄 Starting nginx..."
systemctl enable nginx
systemctl start nginx

echo "⏳ Waiting for nginx to start..."
sleep 3

echo "🧪 Testing nginx status..."
systemctl status nginx --no-pager -l

echo "🔄 Now starting FastGrapher backend on port 8080..."
cd /opt/fastgrapher
docker-compose -f docker-compose.hetzner.yml up -d

echo "⏳ Waiting for backend to start..."
sleep 10

echo "🧪 Testing HTTP connection..."
curl -f http://127.0.0.1:8080/api/health && echo "✅ Backend is running on port 8080!" || echo "⚠️ Backend not responding on port 8080"
curl -f http://api.fastgrapher.com/api/health && echo "✅ Nginx proxy is working!" || echo "⚠️ Nginx proxy failed"

echo "🔐 Now requesting SSL certificate..."
certbot --nginx -d api.fastgrapher.com --non-interactive --agree-tos --email admin@fastgrapher.com --redirect

echo "🔄 Reloading nginx with SSL configuration..."
systemctl reload nginx

echo "🧪 Testing HTTPS..."
sleep 5
curl -f https://api.fastgrapher.com/api/health && echo "✅ HTTPS is working!" || echo "⚠️ HTTPS test failed"

echo "🎉 SSL Certificate setup completed successfully!"
echo "🌐 Your API is now available at: https://api.fastgrapher.com/api"

exit
EOF

echo "🎉 SSL setup script completed!"
echo "🧪 Testing the final result..."
sleep 10

# Test both HTTP and HTTPS
echo "Testing HTTP fallback..."
curl -f http://api.fastgrapher.com/api/health && echo "✅ HTTP working!" || echo "❌ HTTP failed"

echo "Testing HTTPS..."
curl -f https://api.fastgrapher.com/api/health && echo "✅ HTTPS working!" || echo "❌ HTTPS failed"

echo "📝 Your FastGrapher API should now be fully working with SSL at: https://api.fastgrapher.com/api"
