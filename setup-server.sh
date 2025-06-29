
#!/bin/bash

set -e

echo "🔧 Setting up server for FastGrapher deployment..."

# Update system
echo "📦 Updating system packages..."
apt-get update && apt-get upgrade -y

# Install essential packages
echo "📦 Installing essential packages..."
apt-get install -y curl wget git nano ufw fail2ban

# Install Docker
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
fi

# Install Docker Compose
echo "🐳 Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    LATEST_COMPOSE=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep tag_name | cut -d '"' -f 4)
    curl -L "https://github.com/docker/compose/releases/download/${LATEST_COMPOSE}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Set up firewall
echo "🔒 Setting up firewall..."
ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 8080/tcp

# Configure fail2ban
echo "🛡️ Configuring fail2ban..."
systemctl enable fail2ban
systemctl start fail2ban

# Create application directory
echo "📁 Creating application directory..."
mkdir -p /opt/fastgrapher
cd /opt/fastgrapher

echo "✅ Server setup completed!"
echo "📝 Next steps:"
echo "1. Upload your application files to /opt/fastgrapher"
echo "2. Create .env file with your configuration"
echo "3. Run ./deploy.sh to start the application"
