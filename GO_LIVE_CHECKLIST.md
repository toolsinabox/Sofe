# 🚀 Celora Go-Live Deployment Guide

## Quick Summary
This will deploy Celora with sample data to your Vultr VPS at 45.77.239.247

---

## STEP 1: Push Code to GitHub (Do this in Emergent)

1. In the Emergent chat, look for the **"Save to Github"** button
2. Click it to push all latest changes to your GitHub repository
3. Wait for the push to complete

---

## STEP 2: SSH into your VPS

```bash
ssh root@45.77.239.247
```

---

## STEP 3: Download Database Export

On your VPS, download the database export from this Emergent session:

```bash
# Navigate to home
cd /root

# Download the database export (you'll need to download db_export.tar.gz from Emergent files first)
# Or if you have the file locally, upload it:
# scp db_export.tar.gz root@45.77.239.247:/root/
```

---

## STEP 4: Pull Latest Code from GitHub

```bash
cd /var/www/celora

# Stash any local changes
git stash

# Pull latest from GitHub
git pull origin main

# Check for updates
git log --oneline -5
```

---

## STEP 5: Import Database

```bash
cd /root

# Extract the database export
tar -xzvf db_export.tar.gz

# Import to MongoDB (this will REPLACE existing data)
mongorestore --db celora --drop celora_export/celora/

# Verify import
mongosh celora --eval "
  print('Stores: ' + db.platform_stores.countDocuments());
  print('Products: ' + db.products.countDocuments());
  print('Orders: ' + db.orders.countDocuments());
  print('Users: ' + db.users.countDocuments());
"
```

---

## STEP 6: Install Dependencies

### Backend:
```bash
cd /var/www/celora/backend
source venv/bin/activate
pip install -r requirements.txt
pip install dnspython bcrypt python-jose passlib
deactivate
```

### Frontend:
```bash
cd /var/www/celora/frontend
yarn install
yarn build
```

---

## STEP 7: Update Backend .env

```bash
nano /var/www/celora/backend/.env
```

Make sure it contains:
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=celora
JWT_SECRET_KEY=your-secure-secret-key-at-least-32-characters-long
RESEND_API_KEY=re_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
```

---

## STEP 8: Update Nginx Config

```bash
# Backup existing config
sudo cp /etc/nginx/sites-available/celora /etc/nginx/sites-available/celora.backup

# Edit Nginx config
sudo nano /etc/nginx/sites-available/celora
```

Use this config (supports custom domains + /cpanel):

```nginx
# Main Celora API & Frontend
server {
    listen 80;
    server_name getcelora.com www.getcelora.com;
    
    # Frontend
    location / {
        root /var/www/celora/frontend/build;
        try_files $uri $uri/ /index.html;
    }
    
    # API
    location /api {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Wildcard for subdomains (*.getcelora.com)
server {
    listen 80;
    server_name ~^(?<subdomain>.+)\.getcelora\.com$;
    
    # Frontend (serves stores and /cpanel)
    location / {
        root /var/www/celora/frontend/build;
        try_files $uri $uri/ /index.html;
    }
    
    # API
    location /api {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Custom domains (merchants' own domains)
server {
    listen 80 default_server;
    server_name _;
    
    # Frontend (serves stores and /cpanel on custom domains)
    location / {
        root /var/www/celora/frontend/build;
        try_files $uri $uri/ /index.html;
    }
    
    # API
    location /api {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Test and reload:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## STEP 9: Restart Backend

```bash
pm2 restart celora-backend
pm2 status
pm2 logs celora-backend --lines 20
```

---

## STEP 10: Verify Deployment

```bash
# Test health endpoint
curl http://localhost:8001/api/health

# Test store API
curl http://localhost:8001/api/maropost/home -H "Host: toolsinabox.getcelora.com"

# Test from outside (replace with your domain)
curl https://getcelora.com/api/health
```

---

## Sample Data Included

### Stores:
| Store | Subdomain | Email | Password |
|-------|-----------|-------|----------|
| Tools In A Box | toolsinabox | eddie@toolsinabox.com.au | Yealink1991% |
| Test Store | teststore | test@test.com | test123 |
| Fashion Hub | fashionhub | demo@fashionhub.com | test123 |

### Platform Admin:
| URL | Email | Password |
|-----|-------|----------|
| /admin/login | admin@celora.com | test123 |

### Data Counts:
- **Stores**: 3
- **Products**: 8 (tools, electronics)
- **Categories**: 7
- **Customers**: 3
- **Orders**: 3
- **Reviews**: 2

---

## Post-Deployment: SSL Setup

```bash
# Install certbot if needed
sudo apt install certbot python3-certbot-nginx

# Get SSL for main domain
sudo certbot --nginx -d getcelora.com -d www.getcelora.com

# For wildcard subdomains (requires DNS challenge)
sudo certbot certonly --manual --preferred-challenges dns -d "*.getcelora.com"
# Follow prompts to add TXT record
```

---

## Custom Domain Setup (for toolsinabox.com.au)

### DNS Records to Add:
```
Type: TXT
Host: @
Value: celora-site=toolsinabox.getcelora.com:cb32965d1387

Type: A
Host: @
Value: 45.77.239.247

Type: A  
Host: www
Value: 45.77.239.247
```

### Then verify in Celora:
1. Login at toolsinabox.getcelora.com/cpanel
2. Go to Settings → Domains
3. Click "Verify Domain"

---

## Troubleshooting

### Backend not starting:
```bash
pm2 logs celora-backend --lines 100
```

### Check MongoDB:
```bash
mongosh celora --eval "db.platform_stores.find({}).pretty()"
```

### Nginx issues:
```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

---

## ✅ What's Working

- Multi-tenant store management
- Product, order, customer CRUD
- Custom domain verification
- CPanel on custom domains (/cpanel)
- Platform admin dashboard
- URL redirects & custom scripts
- Theme management
- POS system
- Light mode UI throughout

## ⚠️ Needs Setup

- **Resend API Key** - For email notifications
- **Stripe Live Keys** - Currently using test keys
- **SSL Certificates** - For HTTPS
- **DNS Records** - For custom domains
