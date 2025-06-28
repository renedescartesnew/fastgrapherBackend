
#!/bin/bash

set -e

echo "🔧 Setting up Hetzner Cloud server for FastGrapher deployment..."

# Configuration
HETZNER_SERVER_IP="${HETZNER_SERVER_IP}"
HETZNER_USER="${HETZNER_USER:-root}"

# Check if server IP is provided
if [ -z "$HETZNER_SERVER_IP" ]; then
    echo "❌ Please set HETZNER_SERVER_IP environment variable"
    echo "   Example: export HETZNER_SERVER_IP=your.server.ip"
    exit 1
fi

echo "🔍 Setting up server: $HETZNER_SERVER_IP"

# Execute setup commands on server
ssh $HETZNER_USER@$HETZNER_SERVER_IP << 'EOF'
echo "🔄 Updating system packages..."
apt-get update && apt-get upgrade -y

echo "📦 Installing essential packages..."
apt-get install -y curl wget git htop nano ufw fail2ban

echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
fi

echo "🐳 Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    LATEST_COMPOSE=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep tag_name | cut -d '"' -f 4)
    curl -L "https://github.com/docker/compose/releases/download/${LATEST_COMPOSE}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

echo "🔒 Setting up firewall..."
ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp

echo "🛡️ Configuring fail2ban..."
systemctl enable fail2ban
systemctl start fail2ban

echo "📁 Creating application directories..."
mkdir -p /opt/fastgrapher
mkdir -p /opt/fastgrapher/uploads
mkdir -p /opt/fastgrapher/logs

echo "🔧 Optimizing for CX21 instance..."
# Set swappiness for better memory management
echo 'vm.swappiness=10' >> /etc/sysctl.conf

# Create swap file if not exists
if [ ! -f /swapfile ]; then
    echo "💾 Creating swap file..."
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "📊 System Information:"
echo "CPU: $(nproc) cores"
echo "RAM: $(free -h | awk '/^Mem:/ {print $2}') total"
echo "Disk: $(df -h / | awk 'NR==2 {print $4}') available"
echo "Docker: $(docker --version)"
echo "Docker Compose: $(docker-compose --version)"

echo "✅ Hetzner Cloud server setup completed!"
echo "🚀 You can now run the deployment script."
EOF

echo "🎉 Server setup completed!"
echo "📝 Next step: Run './deploy-hetzner.sh' to deploy your application"
