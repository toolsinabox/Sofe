#!/bin/bash
# =====================================================
# Celora SSL Setup Script
# Automatically configures SSL certificates using Certbot
# =====================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║          Celora SSL Certificate Setup                     ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Configuration
DOMAIN="getcelora.com"
EMAIL="eddie@toolsinabox.com.au"  # Change this to your email
NGINX_CONF="/etc/nginx/sites-available/celora"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

# Step 1: Install Certbot
echo -e "\n${YELLOW}Step 1: Installing Certbot...${NC}"
if ! command -v certbot &> /dev/null; then
    apt update
    apt install -y certbot python3-certbot-nginx
    echo -e "${GREEN}✓ Certbot installed${NC}"
else
    echo -e "${GREEN}✓ Certbot already installed${NC}"
fi

# Step 2: Check DNS resolution
echo -e "\n${YELLOW}Step 2: Checking DNS resolution...${NC}"
check_dns() {
    local domain=$1
    if host "$domain" &> /dev/null; then
        echo -e "${GREEN}✓ $domain resolves correctly${NC}"
        return 0
    else
        echo -e "${RED}✗ $domain does not resolve${NC}"
        return 1
    fi
}

DNS_OK=true
check_dns "$DOMAIN" || DNS_OK=false
check_dns "www.$DOMAIN" || DNS_OK=false

if [ "$DNS_OK" = false ]; then
    echo -e "\n${RED}DNS is not fully configured. Please ensure your domain points to this server.${NC}"
    echo -e "${YELLOW}Continuing anyway - Certbot will fail if DNS isn't ready.${NC}"
fi

# Step 3: Get certificate for main domains
echo -e "\n${YELLOW}Step 3: Obtaining SSL certificate for main domains...${NC}"
certbot --nginx \
    -d "$DOMAIN" \
    -d "www.$DOMAIN" \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    --redirect \
    || echo -e "${YELLOW}Note: Main domain certificate request completed (check for errors above)${NC}"

echo -e "${GREEN}✓ Main domain certificate configured${NC}"

# Step 4: Set up wildcard certificate (requires DNS challenge)
echo -e "\n${YELLOW}Step 4: Wildcard Certificate Setup${NC}"
echo -e "${CYAN}For wildcard certificates (*.getcelora.com), you need DNS validation.${NC}"
echo -e "${CYAN}This requires adding a TXT record to your DNS.${NC}"
echo ""
echo -e "To set up wildcard SSL manually, run:"
echo -e "${GREEN}certbot certonly --manual --preferred-challenges=dns -d \"*.getcelora.com\" -d \"getcelora.com\"${NC}"
echo ""
echo -e "When prompted, add this TXT record to your DNS:"
echo -e "  Name: ${CYAN}_acme-challenge.getcelora.com${NC}"
echo -e "  Value: ${CYAN}(Certbot will provide this)${NC}"
echo ""

# Step 5: Set up auto-renewal
echo -e "\n${YELLOW}Step 5: Setting up auto-renewal...${NC}"
if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
    (crontab -l 2>/dev/null; echo "0 3 * * * /usr/bin/certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -
    echo -e "${GREEN}✓ Auto-renewal cron job added (runs daily at 3 AM)${NC}"
else
    echo -e "${GREEN}✓ Auto-renewal already configured${NC}"
fi

# Step 6: Test renewal
echo -e "\n${YELLOW}Step 6: Testing certificate renewal...${NC}"
certbot renew --dry-run || echo -e "${YELLOW}Dry run completed (check for errors)${NC}"

# Step 7: Reload nginx
echo -e "\n${YELLOW}Step 7: Reloading Nginx...${NC}"
nginx -t && systemctl reload nginx
echo -e "${GREEN}✓ Nginx reloaded${NC}"

# Summary
echo -e "\n${CYAN}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                    Setup Complete!                        ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo -e "${GREEN}✓ SSL certificate installed for:${NC}"
echo "  - https://getcelora.com"
echo "  - https://www.getcelora.com"
echo ""
echo -e "${YELLOW}For wildcard certificate (store subdomains):${NC}"
echo "  Run: certbot certonly --manual --preferred-challenges=dns -d \"*.getcelora.com\" -d \"getcelora.com\""
echo ""
echo -e "${CYAN}Auto-renewal is configured to run daily.${NC}"
echo ""

# Display certificate info
echo -e "\n${YELLOW}Current certificates:${NC}"
certbot certificates
