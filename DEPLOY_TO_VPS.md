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

## Step 3: Update Nginx Configuration (IMPORTANT!)

Replace your Nginx configuration with the new one that supports `/cpanel` on custom domains:

```bash
# Backup existing config
sudo cp /etc/nginx/sites-available/celora /etc/nginx/sites-available/celora.backup

# Download new config from this repo (nginx_vps_cpanel.conf)
# Or manually copy the content from /app/nginx_vps_cpanel.conf

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

**Key Changes in New Nginx Config:**
- `/cpanel` route on subdomains (`storename.getcelora.com/cpanel`) → Serves React app
- `/cpanel` route on custom domains (`www.mystore.com/cpanel`) → Serves React app
- The React app automatically detects whether it's on a subdomain or custom domain

---

## Step 4: Verify Deployment

```bash
# Check backend is running
curl http://localhost:8001/api/health

# Check logs if issues
pm2 logs celora-backend --lines 50

# Test /cpanel route
curl -I http://toolsinabox.getcelora.com/cpanel
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
   - Unique token per store: `celora-site=<subdomain>:<unique_code>`

4. **CPanel Access on Custom Domains** (NEW!)
   - Merchants can now access `/cpanel` on their custom domain
   - Example: `www.toolsinabox.com.au/cpanel`
   - No redirects - fully white-label experience
   - React app automatically detects subdomain vs custom domain

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
| Platform Admin | /admin/login | admin@celora.com | test123 |
| Platform Login | /login | test@test.com | test123 |
| Merchant | /merchant | test@test.com | test123 |
| Subdomain CPanel | toolsinabox.getcelora.com/cpanel | eddie@toolsinabox.com.au | Yealink1991% |
| Custom Domain CPanel | www.toolsinabox.com.au/cpanel | eddie@toolsinabox.com.au | Yealink1991% |

---

## How CPanel Works

### Subdomain Access
1. Merchant visits `storename.getcelora.com/cpanel`
2. React app loads and detects subdomain `storename`
3. App fetches store info from `/api/cpanel/store-info/{subdomain}`
4. Login uses subdomain context to authenticate

### Custom Domain Access (NEW!)
1. Merchant visits `www.customdomain.com/cpanel`
2. React app loads and detects it's NOT on getcelora.com
3. App treats hostname as custom domain
4. Fetches store info from `/api/cpanel/store-info-by-domain?domain=www.customdomain.com`
5. Login uses custom_domain context to authenticate
6. Merchant gets full dashboard access branded with their domain!

