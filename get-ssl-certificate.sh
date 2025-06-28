
#!/bin/bash

set -e

echo "🔐 Getting SSL Certificate for api.fastgrapher.com..."

# Test DNS first
echo "🧪 Testing DNS resolution..."
if ! nslookup api.fastgrapher.com | grep -q "37.27.2.53"; then
    echo "❌ DNS not yet propagated. Please wait a few more minutes."
    echo "💡 You can test with: nslookup api.fastgrapher.com"
    exit 1
fi

echo "✅ DNS is working!"

# SSH to server and get certificate
ssh root@37.27.2.53 << 'EOF'
echo "🔐 Requesting SSL certificate..."
certbot --nginx -d api.fastgrapher.com --non-interactive --agree-tos --email admin@fastgrapher.com

echo "🔄 Restarting nginx..."
systemctl reload nginx

echo "🧪 Testing HTTPS..."
curl -f https://api.fastgrapher.com/api/health && echo "✅ HTTPS is working!"

echo "🎉 SSL Certificate installed successfully!"
echo "🌐 Your API is now available at: https://api.fastgrapher.com/api"

exit
EOF

echo "🎉 SSL setup completed!"
echo "📝 Next step: Update your frontend configuration"
