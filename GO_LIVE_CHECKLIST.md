# 🚀 Celora Go-Live Checklist

## Pre-Deployment: Download Files from Emergent

**Download these files from Emergent before starting:**
1. `db_export.tar.gz` - Database with all your data
2. `nginx_vps_cpanel.conf` - Nginx configuration for custom domains

---

## Step 1: SSH into VPS

```bash
ssh root@45.77.239.247
```

---

## Step 2: Upload & Import Database

### On your LOCAL machine:
```bash
# Upload database export to VPS
scp db_export.tar.gz root@45.77.239.247:/root/
```

### On VPS:
```bash
cd /root
tar -xzvf db_export.tar.gz

# Import to MongoDB (use 'celora' as the database name)
mongorestore --db celora --drop db_export/test_database/

# Verify import
mongo celora --eval "db.platform_stores.find({}, {store_name:1, subdomain:1}).pretty()"
```

---

## Step 3: Pull Latest Code from GitHub

```bash
cd /var/www/celora

# Save GitHub, then pull
git pull origin main
```

---

## Step 4: Install Dependencies

### Backend:
```bash
cd /var/www/celora/backend
source venv/bin/activate
pip install -r requirements.txt
pip install dnspython  # Required for domain verification
deactivate
```

### Frontend:
```bash
cd /var/www/celora/frontend
yarn install
yarn build
```

---

## Step 5: Update Nginx Configuration

```bash
# Backup existing config
sudo cp /etc/nginx/sites-available/celora /etc/nginx/sites-available/celora.backup

# Upload new config (from your local machine)
# scp nginx_vps_cpanel.conf root@45.77.239.247:/etc/nginx/sites-available/celora

# Or manually edit on VPS:
sudo nano /etc/nginx/sites-available/celora
# Paste content from nginx_vps_cpanel.conf

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

---

## Step 6: Update Environment Variables

```bash
# Edit backend .env
nano /var/www/celora/backend/.env
```

**Required variables:**
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=celora
SECRET_KEY=your-secure-secret-key-change-this
RESEND_API_KEY=re_xxxxx  # Get from resend.com
```

---

## Step 7: Restart Services

```bash
pm2 restart celora-backend
pm2 status

# Check logs for any errors
pm2 logs celora-backend --lines 50
```

---

## Step 8: Verify Deployment

```bash
# Test backend health
curl http://localhost:8001/api/health

# Test store API
curl http://localhost:8001/api/maropost/home -H "Host: toolsinabox.getcelora.com"
```

---

## Step 9: SSL Setup (Certbot)

```bash
# Install certbot if not installed
sudo apt install certbot python3-certbot-nginx

# Get SSL for main domain
sudo certbot --nginx -d getcelora.com -d www.getcelora.com

# For wildcard (requires DNS challenge)
sudo certbot certonly --manual --preferred-challenges dns -d "*.getcelora.com"

# Follow prompts to add TXT record to DNS
```

---

## Current Data Summary

| Item | Count |
|------|-------|
| Stores | 5 |
| Products | 8 |
| Orders | 5 |
| Customers | 4 |
| Categories | 9 |
| Shipping Zones | 1,153 |
| Postcodes | 18,519 |

### Stores:
| Store Name | Subdomain | Status | Custom Domain |
|------------|-----------|--------|---------------|
| Tools In A Box | toolsinabox | trial | www.toolsinabox.com.au (pending) |
| Demo Fashion Store | demofashion | active | - |
| Fashion Hub | fashionhub | trial | - |
| Tech Gadgets Pro | techgadgetspro | trial | - |
| Test Store | teststore | active | - |

### Login Credentials:
| Role | URL | Email | Password |
|------|-----|-------|----------|
| **Platform Admin** | /admin/login | admin@celora.com | test123 |
| **Tools In A Box** | /merchant/login | eddie@toolsinabox.com.au | Yealink1991% |
| **Test Store** | /merchant/login | test@test.com | test123 |

---

## Post-Deployment: Custom Domain Setup

To connect **www.toolsinabox.com.au**:

### 1. Add TXT Record to DNS:
```
Type: TXT
Host: @ (or toolsinabox.com.au)
Value: celora-site=toolsinabox.getcelora.com:cb32965d1387
```

### 2. Update A Record:
```
Type: A
Host: www
Value: 45.77.239.247
```

### 3. Verify in Celora:
- Login to merchant dashboard
- Go to Settings → Domains
- Click "Verify Domain"

---

## Troubleshooting

### Backend not starting:
```bash
pm2 logs celora-backend --lines 100
```

### Nginx errors:
```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

### MongoDB issues:
```bash
sudo systemctl status mongod
mongo celora --eval "db.stats()"
```

---

## What's Working

✅ Multi-tenant store management  
✅ Product, order, customer management  
✅ Custom domain verification (TXT record)  
✅ CPanel on custom domains (`mystore.com/cpanel`)  
✅ Platform admin dashboard  
✅ URL redirects & custom scripts  
✅ Shipping zones & rates  
✅ POS system  
✅ Theme management  

## What Needs Setup

⚠️ **Resend API Key** - For email functionality  
⚠️ **Stripe Live Keys** - Currently using test keys  
⚠️ **SSL Certificates** - For HTTPS  
⚠️ **DNS Records** - For custom domains  
