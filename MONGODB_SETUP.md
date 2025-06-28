
# MongoDB Setup for FastGrapher

## Option 1: MongoDB Atlas (Recommended - Free Tier Available)

1. **Create MongoDB Atlas Account**
   - Go to [https://www.mongodb.com/atlas](https://www.mongodb.com/atlas)
   - Sign up for a free account

2. **Create a Cluster**
   - Choose "Build a Database"
   - Select "Shared" (Free tier)
   - Choose a cloud provider and region close to Helsinki, Finland
   - Name your cluster (e.g., "fastgrapher-cluster")

3. **Create Database User**
   - Go to "Database Access"
   - Click "Add New Database User"
   - Create username and password
   - Grant "Read and write to any database" permission

4. **Configure Network Access**
   - Go to "Network Access"
   - Click "Add IP Address"
   - Add your Hetzner server IP: `37.27.2.53`
   - Also add `0.0.0.0/0` for development (less secure but easier)

5. **Get Connection String**
   - Go to "Clusters"
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password
   - Replace `<dbname>` with `fastgrapher`

Your connection string should look like:
```
mongodb+srv://username:password@cluster-name.xxxxx.mongodb.net/fastgrapher?retryWrites=true&w=majority
```

## Option 2: Self-hosted MongoDB on Hetzner

If you prefer to host MongoDB on your own server:

```bash
# SSH to your Hetzner server
ssh root@37.27.2.53

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
apt-get update
apt-get install -y mongodb-org

# Start MongoDB
systemctl start mongod
systemctl enable mongod

# Create database and user
mongosh
use fastgrapher
db.createUser({
  user: "fastgrapher",
  pwd: "your-secure-password",
  roles: [{ role: "readWrite", db: "fastgrapher" }]
})
exit
```

Your connection string would be:
```
mongodb://fastgrapher:your-secure-password@localhost:27017/fastgrapher
```

## Update Environment File

After setting up MongoDB, update your `/opt/fastgrapher/.env` file:

```bash
MONGO_URI=your-mongodb-connection-string-here
```

## Testing Connection

Test your MongoDB connection:

```bash
# From your server
cd /opt/fastgrapher
docker-compose -f docker-compose.hetzner.yml exec fastgrapher-backend node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log('✅ MongoDB connected successfully');
  process.exit(0);
}).catch(err => {
  console.error('❌ MongoDB connection failed:', err);
  process.exit(1);
});
"
```
