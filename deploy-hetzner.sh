
#!/bin/bash

set -e

echo "🚀 Deploying FastGrapher Backend to Hetzner Cloud..."

# Configuration
PROJECT_NAME="fastgrapher"
HETZNER_SERVER_IP="${HETZNER_SERVER_IP}"
HETZNER_USER="${HETZNER_USER:-root}"

# Check if server IP is provided
if [ -z "$HETZNER_SERVER_IP" ]; then
    echo "❌ Please set HETZNER_SERVER_IP environment variable"
    echo "   Example: export HETZNER_SERVER_IP=your.server.ip"
    exit 1
fi

echo "🔍 Deploying to server: $HETZNER_SERVER_IP"

# Create deployment directory on server
echo "📁 Creating deployment directory..."
ssh $HETZNER_USER@$HETZNER_SERVER_IP "mkdir -p /opt/$PROJECT_NAME"

# Copy files to server
echo "📤 Uploading files..."
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude 'dist' \
    --exclude '.git' \
    --exclude 'uploads' \
    --exclude 'logs' \
    ./ $HETZNER_USER@$HETZNER_SERVER_IP:/opt/$PROJECT_NAME/

# Copy environment file
if [ -f ".env" ]; then
    echo "📋 Uploading environment variables..."
    scp .env $HETZNER_USER@$HETZNER_SERVER_IP:/opt/$PROJECT_NAME/.env
else
    echo "⚠️  No .env file found. Make sure to create one on the server."
fi

# Execute deployment commands on server
echo "🔧 Setting up application on server..."
ssh $HETZNER_USER@$HETZNER_SERVER_IP << 'EOF'
cd /opt/fastgrapher

# Update system packages
apt-get update && apt-get upgrade -y

# Install Docker and Docker Compose if not already installed
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl enable docker
    systemctl start docker
fi

if ! command -v docker-compose &> /dev/null; then
    echo "🐳 Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Set up UFW firewall
ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp

# Stop existing containers
docker-compose -f docker-compose.hetzner.yml down || true

# Build and start new containers
docker-compose -f docker-compose.hetzner.yml build --no-cache
docker-compose -f docker-compose.hetzner.yml up -d

# Show container status
docker-compose -f docker-compose.hetzner.yml ps

echo "✅ Deployment completed!"
echo "🌐 Your app should be available at: http://$(curl -s ifconfig.me)"
echo "🔍 Health check: http://$(curl -s ifconfig.me)/api/health"
EOF

echo "🎉 Deployment to Hetzner Cloud completed!"
echo "📝 Next steps:"
echo "   1. Set up SSL certificate (optional)"
echo "   2. Configure domain name (optional)"
echo "   3. Set up monitoring (optional)"
