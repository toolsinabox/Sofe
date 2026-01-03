#!/bin/bash
# =============================================================================
# Celora VPS Deployment Script
# Run on VPS after pulling from GitHub
# =============================================================================

echo "=== Celora Deployment Script ==="
echo ""

# Navigate to project
cd /var/www/celora

# Pull latest code
echo "1. Pulling latest code..."
git pull origin main

# Install backend dependencies
echo ""
echo "2. Installing backend dependencies..."
cd /var/www/celora/backend
source venv/bin/activate
pip install -r requirements.txt
deactivate

# Install frontend dependencies and build
echo ""
echo "3. Building frontend..."
cd /var/www/celora/frontend
yarn install
yarn build

# Copy nginx config
echo ""
echo "4. Updating nginx config..."
sudo cp /var/www/celora/nginx_vps_config.conf /etc/nginx/sites-available/celora
sudo nginx -t
if [ $? -eq 0 ]; then
    sudo systemctl reload nginx
    echo "Nginx reloaded successfully"
else
    echo "ERROR: Nginx config has errors!"
    exit 1
fi

# Restart backend
echo ""
echo "5. Restarting backend..."
pm2 restart celora-backend

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Your site is now live at:"
echo "  - Platform: https://getcelora.com"
echo "  - Store: https://toolsinabox.getcelora.com"
echo "  - CPanel: https://toolsinabox.getcelora.com/cpanel"
echo ""
echo "Login credentials:"
echo "  - Eddie: eddie@toolsinabox.com.au / Yealink1991%"
echo "  - Test: test@test.com / (your original password)"
echo ""
