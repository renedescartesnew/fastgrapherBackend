
#!/bin/bash

set -e

echo "🔐 Setting up SSL Certificate for FastGrapher Backend..."

# SSH to server and set up SSL
ssh root@37.27.2.53 << 'EOF'
cd /opt/fastgrapher

echo "📦 Installing nginx and certbot..."
apt-get update
apt-get install -y nginx certbot python3-certbot-nginx

echo "🔧 Configuring nginx for FastGrapher..."
cat > /etc/nginx/sites-available/fastgrapher << 'NGINX_CONFIG'
server {
    listen 80;
    server_name api.fastgrapher.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.fastgrapher.com;
    
    # SSL configuration will be added by certbot
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # API proxy
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
        add_header Access-Control-Allow-Origin "https://www.fastgrapher.com, https://fastgrapher.com" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;
        add_header Access-Control-Allow-Credentials "true" always;
        
        # Handle preflight requests
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "https://www.fastgrapher.com, https://fastgrapher.com" always;
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

echo "🧪 Testing nginx configuration..."
nginx -t

echo "🔄 Starting nginx..."
systemctl enable nginx
systemctl restart nginx

echo "✅ Nginx configured successfully!"
echo "🌐 Now you need to:"
echo "1. Create a DNS A record: api.fastgrapher.com -> 37.27.2.53"
echo "2. Wait for DNS propagation (5-10 minutes)"
echo "3. Run the SSL certificate command"

exit
EOF

echo "🎉 SSL setup phase 1 completed!"
echo ""
echo "📋 IMPORTANT: Before continuing, you need to:"
echo "1. Go to your domain registrar (where you bought fastgrapher.com)"
echo "2. Add a DNS A record:"
echo "   - Name: api"
echo "   - Type: A"
echo "   - Value: 37.27.2.53"
echo "   - TTL: 300 (5 minutes)"
echo ""
echo "3. Test DNS propagation:"
echo "   nslookup api.fastgrapher.com"
echo ""
echo "4. Once DNS is working, run:"
echo "   ./get-ssl-certificate.sh"
