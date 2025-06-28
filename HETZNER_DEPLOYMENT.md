
# FastGrapher Backend - Hetzner Cloud Deployment Guide

This guide will help you deploy your FastGrapher backend to Hetzner Cloud using a CX21 instance (2 vCPU, 4GB RAM, 40GB SSD).

## Prerequisites

1. **Hetzner Cloud Account**: Sign up at [https://www.hetzner.com/cloud](https://www.hetzner.com/cloud)
2. **SSH Key**: Generate and upload your SSH public key to Hetzner Cloud
3. **Local Machine**: Unix-like system with SSH and rsync installed

## Step 1: Create Hetzner Cloud Server

1. Log in to Hetzner Cloud Console
2. Create a new project (e.g., "fastgrapher")
3. Click "Add Server"
4. Choose:
   - **Location**: Choose closest to your users
   - **Image**: Ubuntu 22.04 (recommended)
   - **Type**: CX21 (2 vCPU, 4GB RAM, 40GB SSD)
   - **SSH Key**: Select your uploaded SSH key
   - **Name**: fastgrapher-backend
5. Click "Create & Buy Now"
6. Note down the server IP address

## Step 2: Configure Environment Variables

1. Copy the environment template:
   ```bash
   cp .env.hetzner .env
   ```

2. Edit `.env` with your actual values:
   ```bash
   nano .env
   ```

3. Update these important values:
   - `MONGO_URI`: Your MongoDB connection string
   - `JWT_SECRET`: A secure random string
   - `MAIL_*`: Your email service configuration

## Step 3: Set Up Local Environment

Set your Hetzner server details:

```bash
export HETZNER_SERVER_IP=your.server.ip.address
export HETZNER_USER=root  # or your preferred user
```

## Step 4: Initial Server Setup

Run the server setup script:

```bash
chmod +x setup-hetzner-server.sh
./setup-hetzner-server.sh
```

This will:
- Update the system
- Install Docker and Docker Compose
- Configure firewall (UFW)
- Set up fail2ban for security
- Optimize settings for CX21 instance
- Create swap file for better memory management

## Step 5: Deploy Your Application

Run the deployment script:

```bash
chmod +x deploy-hetzner.sh
./deploy-hetzner.sh
```

This will:
- Upload your code to the server
- Build the Docker container
- Start the application
- Configure reverse proxy

## Step 6: Verify Deployment

1. Check if your app is running:
   ```bash
   curl http://YOUR_SERVER_IP/api/health
   ```

2. You should see a response like:
   ```json
   {
     "status": "ok",
     "timestamp": "2025-01-01T00:00:00.000Z",
     "service": "FastGrapher Backend"
   }
   ```

## Step 7: Configure Domain (Optional)

If you have a domain:

1. Point your domain's A record to your server IP
2. Update FRONTEND_URL in your .env file
3. Set up SSL certificate (see SSL section below)

## SSL Configuration (Optional but Recommended)

To enable HTTPS, you can use Let's Encrypt:

```bash
# On your server
ssh root@YOUR_SERVER_IP

# Install certbot
apt-get install certbot

# Get SSL certificate (replace yourdomain.com)
certbot certonly --standalone -d yourdomain.com

# The certificates will be saved to /etc/letsencrypt/live/yourdomain.com/
```

Then update your docker-compose.hetzner.yml to include SSL configuration.

## Monitoring and Maintenance

### View Application Logs
```bash
ssh root@YOUR_SERVER_IP
cd /opt/fastgrapher
docker-compose -f docker-compose.hetzner.yml logs -f
```

### Restart Application
```bash
ssh root@YOUR_SERVER_IP
cd /opt/fastgrapher
docker-compose -f docker-compose.hetzner.yml restart
```

### Update Application
Simply run the deployment script again:
```bash
./deploy-hetzner.sh
```

## Performance Optimization for CX21

The CX21 instance is well-suited for this application. The setup includes:

- **Memory Management**: 2GB swap file for handling memory spikes
- **Container Limits**: Optimized for 4GB RAM
- **Health Checks**: Automatic container restart on failure
- **Log Rotation**: Prevents disk space issues

## Security Features

- UFW firewall configured (only SSH, HTTP, HTTPS open)
- Fail2ban for brute-force protection
- Non-root user for application
- Container isolation
- Regular security updates

## Cost Estimation

- **CX21 Instance**: ~€4.15/month
- **Bandwidth**: 20TB included (very generous)
- **Total**: ~€4.15/month for the server

## Troubleshooting

### Application Won't Start
```bash
ssh root@YOUR_SERVER_IP
cd /opt/fastgrapher
docker-compose -f docker-compose.hetzner.yml logs
```

### Port Issues
Check if ports are open:
```bash
ss -tlnp | grep 8080
```

### Memory Issues
Check memory usage:
```bash
free -h
docker stats
```

### Database Connection Issues
Test MongoDB connection from server:
```bash
docker run --rm mongo:latest mongosh "YOUR_MONGO_URI" --eval "db.runCommand('ping')"
```

## Support

If you encounter issues:
1. Check the application logs
2. Verify environment variables
3. Ensure MongoDB is accessible from Hetzner Cloud
4. Check firewall settings

The deployment should handle most common scenarios automatically.
