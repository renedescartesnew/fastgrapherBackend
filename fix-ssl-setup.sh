
#!/bin/bash

set -e

echo "🔧 Fixing SSL Certificate setup for api.fastgrapher.com..."

# Test DNS first
echo "🧪 Testing DNS resolution..."
if ! nslookup api.fastgrapher.com | grep -q "37.27.2.53"; then
    echo "❌ DNS not yet propagated. Please wait a few more minutes."
    exit 1
fi

echo "✅ DNS is working!"

# SSH to server and fix SSL setup
ssh root@37.27.2.53 << 'EOF'
echo "🛑 Stopping nginx first..."
systemctl stop nginx || true

echo "🔧 Creating corrected nginx configuration..."
cat > /etc/nginx/sites-available/fastgrapher << 'NGINX_CONFIG'
# HTTP server block for Let's Encrypt validation and redirect
server {
    listen 80;
    server_name api.fastgrapher.com;
    
    # Allow Let's Encrypt validation
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # API proxy for HTTP (temporary until HTTPS is working)
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
        add_header Access-Control-Allow-Origin "https://www.fastgrapher.com, https://fastgrapher.com, https://id-preview--14c7fd51-7c95-478e-91be-63f3152c2810.lovable.app" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;
        add_header Access-Control-Allow-Credentials "true" always;
        
        # Handle preflight requests
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "https://www.fastgrapher.com, https://fastgrapher.com, https://id-preview--14c7fd51-7c95-478e-91be-63f3152c2810.lovable.app" always;
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
systemctl start nginx
systemctl enable nginx

echo "🧪 Testing HTTP first..."
curl -f http://api.fastgrapher.com/api/health && echo "✅ HTTP is working!" || echo "⚠️ HTTP test failed"

echo "🔐 Now requesting SSL certificate..."
certbot --nginx -d api.fastgrapher.com --non-interactive --agree-tos --email admin@fastgrapher.com

echo "🔄 Reloading nginx with new certificate..."
systemctl reload nginx

echo "🧪 Testing HTTPS..."
sleep 5
curl -f https://api.fastgrapher.com/api/health && echo "✅ HTTPS is working!" || echo "⚠️ HTTPS test failed, but certificate should be installed"

echo "🎉 SSL Certificate setup completed!"

exit
EOF

echo "🎉 SSL setup completed!"
echo "🧪 Testing the API endpoint..."
sleep 10
curl -f https://api.fastgrapher.com/api/health && echo "✅ API is working!" || echo "⚠️ API test failed"

echo "📝 Your API should now be available at: https://api.fastgrapher.com/api"
