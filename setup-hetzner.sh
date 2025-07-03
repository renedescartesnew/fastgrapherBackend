#!/bin/bash

echo "=== Setting up FastGrapher Backend on Hetzner ==="

# Update system
echo "Updating system packages..."
apt update && apt upgrade -y

# Install Docker
echo "Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh

# Install Docker Compose
echo "Installing Docker Compose..."
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install Git
echo "Installing Git..."
apt install -y git

# Create application directory
echo "Creating application directory..."
mkdir -p /opt/fastgrapher
cd /opt/fastgrapher

# Clone repository (you'll need to add your repo URL)
echo "Clone your repository manually after this script:"
echo "cd /opt/fastgrapher"
echo "git clone YOUR_GITHUB_REPO_URL ."
echo "cp .env.production .env"

# Install nginx for reverse proxy
echo "Installing nginx..."
apt install -y nginx

# Create nginx configuration
cat > /etc/nginx/sites-available/fastgrapher << 'EOF'
server {
    listen 80;
    server_name 37.27.2.53 api.fastgrapher.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        proxy_read_timeout 300;
        
        # DO NOT add CORS headers here - let NestJS handle CORS
        # This prevents duplicate CORS headers
    }
}
EOF

# Enable nginx site
ln -sf /etc/nginx/sites-available/fastgrapher /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
nginx -t

# Restart nginx
systemctl restart nginx
systemctl enable nginx

# Start Docker service
systemctl start docker
systemctl enable docker

echo "=== Setup completed! ==="
echo "Next steps:"
echo "1. Clone your repository: git clone YOUR_REPO_URL /opt/fastgrapher"
echo "2. Copy environment file: cp /opt/fastgrapher/.env.production /opt/fastgrapher/.env"
echo "3. Deploy: cd /opt/fastgrapher && docker-compose -f docker-compose.hetzner.yml up -d --build"
echo "4. Add your SSH key to GitHub secrets as HETZNER_SSH_KEY"