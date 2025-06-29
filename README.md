
# FastGrapher Backend - Hetzner Deployment

Simple deployment setup for FastGrapher backend on Hetzner Cloud.

## Quick Start

1. **Set up your server:**
   ```bash
   chmod +x setup-server.sh
   ./setup-server.sh
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   nano .env
   ```

3. **Deploy:**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

## Environment Variables

Required variables in `.env`:
- `MONGO_URI` - Your MongoDB connection string
- `JWT_SECRET` - Secret for JWT token signing
- `MAIL_USER` - Email username for sending emails
- `MAIL_PASS` - Email password/app password
- `FRONTEND_URL` - Your frontend URL for CORS

## Commands

- **Deploy/Update:** `./deploy.sh`
- **View logs:** `docker-compose logs -f`
- **Stop:** `docker-compose down`
- **Restart:** `docker-compose restart`

## Health Check

Your backend will be available at: `http://your-server-ip:8080`
Health check endpoint: `http://your-server-ip:8080/api/health`
