
#!/bin/bash

set -e

echo "🚀 Complete FastGrapher Deployment to Hetzner Cloud..."

# Configuration
PROJECT_NAME="fastgrapher"
HETZNER_SERVER_IP="37.27.2.53"
HETZNER_USER="root"

echo "🔍 Deploying to server: $HETZNER_SERVER_IP"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to execute commands on remote server
execute_remote() {
    ssh $HETZNER_USER@$HETZNER_SERVER_IP "$1"
}

# Step 1: Initial server setup
echo "📋 Step 1: Setting up server environment..."
execute_remote "
    echo '🔄 Updating system packages...'
    apt-get update && apt-get upgrade -y
    
    echo '📦 Installing essential packages...'
    apt-get install -y curl wget git htop nano ufw fail2ban
    
    echo '🐳 Installing Docker...'
    if ! command -v docker &> /dev/null; then
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        rm get-docker.sh
        systemctl enable docker
        systemctl start docker
    fi
    
    echo '🐳 Installing Docker Compose...'
    if ! command -v docker-compose &> /dev/null; then
        LATEST_COMPOSE=\$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep tag_name | cut -d '\"' -f 4)
        curl -L \"https://github.com/docker/compose/releases/download/\${LATEST_COMPOSE}/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
    fi
    
    echo '🔒 Setting up firewall...'
    ufw --force enable
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow ssh
    ufw allow 80/tcp
    ufw allow 443/tcp
    
    echo '🛡️ Configuring fail2ban...'
    systemctl enable fail2ban
    systemctl start fail2ban
    
    echo '📁 Creating application directories...'
    mkdir -p /opt/fastgrapher
    mkdir -p /opt/fastgrapher/uploads
    mkdir -p /opt/fastgrapher/logs
    
    echo '💾 Setting up swap file...'
    if [ ! -f /swapfile ]; then
        fallocate -l 2G /swapfile
        chmod 600 /swapfile
        mkswap /swapfile
        swapon /swapfile
        echo '/swapfile none swap sw 0 0' >> /etc/fstab
    fi
"

# Step 2: Upload application files
echo "📤 Step 2: Uploading application files..."
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude 'dist' \
    --exclude '.git' \
    --exclude 'uploads' \
    --exclude 'logs' \
    --exclude '*.log' \
    ./ $HETZNER_USER@$HETZNER_SERVER_IP:/opt/$PROJECT_NAME/

# Step 3: Deploy application
echo "🔧 Step 3: Building and starting application..."
execute_remote "
    cd /opt/fastgrapher
    
    echo '🛑 Stopping existing containers...'
    docker-compose -f docker-compose.hetzner.yml down || true
    
    echo '🏗️ Building new container...'
    docker-compose -f docker-compose.hetzner.yml build --no-cache
    
    echo '🚀 Starting application...'
    docker-compose -f docker-compose.hetzner.yml up -d
    
    echo '⏳ Waiting for application to start...'
    sleep 30
    
    echo '📊 Container status:'
    docker-compose -f docker-compose.hetzner.yml ps
    
    echo '🔍 Application logs:'
    docker-compose -f docker-compose.hetzner.yml logs --tail=20
"

# Step 4: Health check
echo "🩺 Step 4: Performing health check..."
sleep 10

if curl -f http://$HETZNER_SERVER_IP/api/health; then
    echo "✅ Deployment successful!"
    echo "🌐 Your FastGrapher backend is available at:"
    echo "   - Main URL: http://$HETZNER_SERVER_IP"
    echo "   - Health Check: http://$HETZNER_SERVER_IP/api/health"
    echo "   - API Docs: http://$HETZNER_SERVER_IP/api"
else
    echo "❌ Health check failed. Checking logs..."
    execute_remote "cd /opt/fastgrapher && docker-compose -f docker-compose.hetzner.yml logs"
fi

echo "🎉 Deployment completed!"
echo ""
echo "📝 Next steps:"
echo "1. Update your frontend environment to point to: http://$HETZNER_SERVER_IP/api"
echo "2. Test your application thoroughly"
echo "3. Consider setting up SSL certificate for HTTPS"
echo "4. Set up monitoring and backups"
