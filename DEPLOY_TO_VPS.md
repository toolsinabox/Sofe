# Celora VPS Deployment Guide

## Prerequisites
- SSH access to your VPS (45.77.239.247)
- GitHub repo updated with latest code

---

## Step 1: Upload Database Export

First, download `db_export.tar.gz` from Emergent and upload to your VPS:

```bash
# From your local machine
scp db_export.tar.gz root@45.77.239.247:/root/
```

---

## Step 2: SSH into VPS and Deploy

```bash
ssh root@45.77.239.247
```

Then run these commands:

```bash
# Navigate to app directory
cd /var/www/celora

# Pull latest code from GitHub
git pull origin main

# Install any new backend dependencies
cd backend
source venv/bin/activate
pip install -r requirements.txt
pip install dnspython  # New dependency for domain verification
deactivate

# Build frontend
cd ../frontend
yarn install
yarn build

# Import database (OPTIONAL - only if you want sample data)
cd /root
tar -xzvf db_export.tar.gz
mongorestore --db celora db_export/test_database/

# Restart services
pm2 restart celora-backend
pm2 status
```

---

## Step 3: Verify Deployment

```bash
# Check backend is running
curl http://localhost:8001/api/health

# Check logs if issues
pm2 logs celora-backend --lines 50
```

---

## New Features Deployed

1. **URL Redirects** - `/merchant/redirects`
   - Create 301/302 redirects
   - Bulk import via CSV
   - Export redirects

2. **Custom Scripts** - `/merchant/custom-scripts`  
   - Google Analytics, GTM, Facebook Pixel
   - TikTok, Snapchat, Pinterest pixels
   - Custom head/body scripts
   - Custom CSS

3. **Secure Custom Domain Verification**
   - TXT record verification (proves ownership)
   - A record verification (proves routing)
   - Unique token per store: `celora-verify=<store_id>-<random>`

---

## Environment Variables (.env)

Make sure backend/.env has:
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=celora
SECRET_KEY=your-secret-key
RESEND_API_KEY=re_xxxxx  # Get from resend.com (free tier available)
```

---

## Test Credentials

| Role | URL | Email | Password |
|------|-----|-------|----------|
| Platform Login | /login | test@test.com | test123 |
| Merchant | /merchant | test@test.com | test123 |

