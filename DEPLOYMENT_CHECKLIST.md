
# FastGrapher Hetzner Deployment Checklist

## Pre-Deployment Setup

### 1. MongoDB Configuration
- [ ] Set up MongoDB Atlas account OR install MongoDB on server
- [ ] Create `fastgrapher` database
- [ ] Configure network access for IP `37.27.2.53`
- [ ] Get connection string
- [ ] Test connection

### 2. Email Configuration
- [ ] Set up email service (Gmail, SendGrid, etc.)
- [ ] Get SMTP credentials
- [ ] For Gmail: Enable 2FA and create App Password

### 3. Environment Variables
- [ ] Update `server/.env` with actual values:
  - [ ] `MONGO_URI` - Your MongoDB connection string
  - [ ] `JWT_SECRET` - A secure random string (32+ characters)
  - [ ] `MAIL_HOST` - Your SMTP host
  - [ ] `MAIL_USER` - Your email username
  - [ ] `MAIL_PASS` - Your email password/app password
  - [ ] `FRONTEND_URL` - Your frontend URL

## Deployment Steps

### 1. Make deployment script executable
```bash
cd server
chmod +x deploy-complete.sh
```

### 2. Run complete deployment
```bash
./deploy-complete.sh
```

### 3. Verify deployment
- [ ] Health check: `curl http://37.27.2.53/api/health`
- [ ] Check logs: `ssh root@37.27.2.53 "cd /opt/fastgrapher && docker-compose -f docker-compose.hetzner.yml logs"`
- [ ] Test API endpoints

## Post-Deployment

### 1. Frontend Configuration
- [ ] Update frontend to use production API URL
- [ ] Deploy frontend to your hosting service
- [ ] Test end-to-end functionality

### 2. Security Hardening
- [ ] Change default SSH port (optional)
- [ ] Set up SSL certificate with Let's Encrypt
- [ ] Configure fail2ban rules
- [ ] Set up log rotation

### 3. Monitoring & Maintenance
- [ ] Set up uptime monitoring
- [ ] Configure automated backups
- [ ] Set up log monitoring
- [ ] Create update/maintenance procedures

## Common Issues & Solutions

### MongoDB Connection Issues
- Check firewall rules
- Verify connection string format
- Test from server: `telnet your-mongo-host 27017`

### Docker Issues
- Check container logs: `docker-compose logs`
- Restart containers: `docker-compose restart`
- Rebuild: `docker-compose build --no-cache`

### Email Issues
- Test SMTP connection
- Check App Password for Gmail
- Verify firewall allows SMTP ports

### Memory Issues (CX21 has 4GB RAM)
- Monitor with: `free -h`
- Check swap usage: `swapon -s`
- Optimize container memory limits if needed

## Useful Commands

```bash
# SSH to server
ssh root@37.27.2.53

# Check application status
cd /opt/fastgrapher
docker-compose -f docker-compose.hetzner.yml ps

# View logs
docker-compose -f docker-compose.hetzner.yml logs -f

# Restart application
docker-compose -f docker-compose.hetzner.yml restart

# Update application
./deploy-complete.sh

# Check system resources
htop
df -h
free -h
```

## Support

If you encounter issues:
1. Check the application logs
2. Verify all environment variables are set correctly
3. Ensure MongoDB is accessible
4. Check firewall settings
5. Verify Docker containers are running

Server IP: `37.27.2.53`
SSH Access: `ssh root@37.27.2.53`
