# Celora - Multi-Tenant E-Commerce Hosting Platform

## Overview
Celora is a Shopify/Maropost-style multi-tenant e-commerce platform that allows customers to sign up and manage their own stores. The platform operates under the `getcelora.com` domain.

## Core Features

### Platform Features
- **Multi-Tenancy:** Single codebase serves multiple stores with complete data isolation via `store_id`
- **Subdomain Routing:** Each store gets `storename.getcelora.com`
- **Custom Domain Support:** Stores can connect their own domains with TXT record verification
- **Per-Store Themes:** Each store can have its own unique theme
- **Platform Admin Dashboard:** `/admin` for managing all stores and users
- **Merchant Dashboard:** `/merchant` for store owners to manage products, orders, etc.
- **Admin Impersonation:** Platform admins can log in as any store owner
- **Environment Agnostic:** Works in both Emergent preview and Live production environments

### Store Features
- Product management with categories
- Order management  
- Customer management
- Theme Editor for customizing storefront
- URL Redirects (301/302) management
- Custom Scripts (Google Analytics, GTM, Facebook Pixel, etc.)
- Shipping options
- Payment integration (Stripe)
- Reviews and ratings
- Favicon uploader

### Data Isolation (CRITICAL)
All merchant API endpoints use `get_store_id_for_request()` which prioritizes:
1. JWT token's `store_id` (for authenticated merchant requests)
2. X-Store-ID header
3. Subdomain from host/header
4. Default store (fallback only for public storefront)

### Custom Domain Verification System
1. Store owner enters custom domain (e.g., www.mystore.com)
2. System generates unique TXT verification token: `celora-verify={subdomain_prefix}-{random_hex}`
3. Store owner adds TXT record to their DNS
4. Store owner adds A record pointing to server IP (45.77.239.247)
5. System verifies BOTH TXT (ownership) and A record (routing)
6. Domain marked as verified only when both pass

## Technical Architecture

### Stack
- **Frontend:** React with Tailwind CSS + Shadcn UI
- **Backend:** FastAPI (Python)
- **Database:** MongoDB
- **Server:** Nginx (reverse proxy) + PM2 (process manager)

### URL Structure
| URL | Purpose |
|-----|---------|
| `getcelora.com` | Platform landing page |
| `www.getcelora.com/login` | Store owner login |
| `www.getcelora.com/merchant` | Merchant dashboard |
| `www.getcelora.com/admin/login` | Platform admin login |
| `*.getcelora.com` | Store storefronts |
| `*.getcelora.com/cpanel` | Store backend access |

### Environment Detection
The system works in both Emergent preview and Live environments:
- **Emergent:** Uses `?subdomain=storename` query parameter
- **Live:** Extracts subdomain from Host header or uses X-Subdomain header from Nginx

### Key Files
- `/app/backend/server.py` - Main API routes (8000+ lines)
- `/app/backend/routes/platform.py` - Platform store management
- `/app/backend/themes/` - Store themes (toolsinabox, skeletal, mytheme)
- `/app/frontend/src/App.js` - React routes
- `/app/frontend/src/pages/merchant/` - Merchant dashboard pages
- `/app/frontend/src/pages/admin/` - Admin dashboard pages
- `/app/frontend/src/components/layout/MerchantSidebar.jsx` - Merchant navigation

### Server Details
- **IP:** 45.77.239.247
- **Domain:** getcelora.com
- **OS:** Ubuntu 22.04

### Services
- **Nginx:** Reverse proxy on port 80
- **Backend:** FastAPI on port 8001 (managed by PM2)
- **MongoDB:** Local instance on port 27017

### Nginx Configuration
- Main domain serves React frontend
- Subdomains (`*.getcelora.com`) serve storefront via `/api/maropost/`
- `/_cpanel` redirects to merchant dashboard
- Custom domains supported via `default_server`

### Database: celora
Collections:
- `platform_owners` - Platform/store owners
- `platform_stores` - Store configurations
- `users` - Store staff users
- `products`, `orders`, `customers`, `categories`, etc.

## Recent Changes (January 2026)

### January 3, 2026 - CPanel Access on Custom Domains (COMPLETED)
**New Feature:**
- **CPanel on Custom Domains:** Merchants can now access their control panel via their custom domain
  - Example: `www.toolsinabox.com.au/cpanel` instead of `toolsinabox.getcelora.com/cpanel`
  - Provides a fully white-label merchant experience
  - No redirects - the URL stays on the merchant's custom domain
  - React app auto-detects whether it's on a subdomain or custom domain

**How it works:**
1. When user visits `/cpanel` on a custom domain (e.g., `www.mystore.com/cpanel`)
2. React app detects it's NOT on `*.getcelora.com`
3. Fetches store info using `GET /api/cpanel/store-info-by-domain?domain=www.mystore.com`
4. Displays branded login page with the custom domain
5. Login sends `custom_domain` parameter to authenticate
6. Merchant accesses full dashboard from their own domain

**Backend APIs Added:**
- `GET /api/cpanel/store-info-by-domain?domain=xxx` - Get store info by verified custom domain
- `POST /api/cpanel/login` - Now accepts `custom_domain` parameter (in addition to `subdomain`)

**Files Modified:**
- `SubdomainCPanel.jsx` - Updated to detect and handle custom domains
- `server.py` - Added new store-info-by-domain endpoint, updated cpanel login

**Nginx Configuration:**
- Created `/app/nginx_vps_cpanel.conf` - Complete Nginx config for VPS with /cpanel routing
- Custom domains catch-all server block serves React app at /cpanel
- Subdomains also support /cpanel route

### January 3, 2026 - URL Redirects & Custom Scripts (COMPLETED)
**New Features:**
- **URL Redirects:** Complete CRUD for managing 301/302 redirects
  - Add, edit, delete individual redirects
  - Bulk import via CSV format
  - Export redirects to CSV
  - Toggle active/inactive status
  - Track hit counts
- **Custom Scripts:** Comprehensive script injection management
  - Tracking pixels (Google Analytics, GTM, Facebook, TikTok, Snapchat, Pinterest)
  - Custom head/body scripts with placement control
  - Page-specific scripts (checkout, thank you page)
  - Custom CSS injection
  - Script templates library
  - Global enable/disable toggle

**Files Added:**
- `MerchantRedirects.jsx` - URL Redirects management page
- `MerchantCustomScripts.jsx` - Custom Scripts management page

**Files Modified:**
- `MerchantSidebar.jsx` - Added navigation links under Storefront section
- `App.js` - Added routes for /merchant/redirects and /merchant/custom-scripts
- `server.py` - Added CRUD API endpoints for redirects and custom scripts

**APIs Added:**
- `GET /api/store/redirects` - List all redirects
- `POST /api/store/redirects` - Create redirect
- `PUT /api/store/redirects/{id}` - Update redirect
- `DELETE /api/store/redirects/{id}` - Delete redirect
- `POST /api/store/redirects/bulk` - Bulk import redirects
- `GET /api/store/custom-scripts` - Get script settings
- `PUT /api/store/custom-scripts` - Update script settings

### January 3, 2026 - Favicon Uploader
**New Features:**
- **Favicon Upload:** Store owners can upload custom favicons in Store Settings
- Drag & drop or click to upload (PNG, ICO, SVG supported)
- Favicon immediately updates in browser tab
- `[@store_favicon@]` template tag available for themes

**Files Modified:**
- `MerchantStoreSettings.jsx` - Added favicon upload dropzone
- `server.py` - Added `/api/upload/favicons` endpoint and `/api/store/favicon` dynamic endpoint

### January 3, 2026 - Email Integration & SSL Setup
**New Features:**
- **Email Service (Resend):** Complete email infrastructure with templates for:
  - Welcome emails for new store owners
  - Password reset emails
  - Order confirmation emails
  - Shipping notification emails
  - Domain verification emails
- **Password Reset Flow:** Full forgot/reset password functionality with email verification
- **SSL Setup Script:** Automated Certbot configuration for HTTPS

**Files Added:**
- `email_service.py` - Email templates and send functions
- `ForgotPassword.jsx` - Forgot password page
- `ResetPassword.jsx` - Reset password page with token validation
- `setup_ssl.sh` - SSL auto-setup script for VPS

**APIs Added:**
- `POST /api/auth/forgot-password` - Request password reset email
- `POST /api/auth/reset-password` - Reset password with token
- `GET /api/auth/verify-reset-token/{token}` - Verify reset token validity
- `GET /api/system/email-status` - Check if email is configured

### January 3, 2026 - Admin Features & Subdomain Validation
**New Features:**
- **Admin Impersonation:** Platform admins can now "Login As Owner" for any merchant store
- **Admin Password Reset:** Platform admins can reset merchant passwords directly
- **Subdomain CPanel:** Merchants can access `/cpanel` on their subdomain for branded login
- **Subdomain Validation:** Invalid/non-existent subdomains now return 404 error instead of showing a default store
- **Store Not Found Page:** Custom 404 page for invalid subdomains (`/public/store-not-found.html`)

**Sidebar Cleanup:**
- Streamlined merchant sidebar (removed redundant items)
- Added "Storefront" section with Domains, Theme Editor, SEO
- "Storefront" section expanded by default for visibility

**Files Modified:**
- `server.py` - Added subdomain validation logic, impersonate/reset APIs, cpanel APIs
- `AdminMerchants.jsx` - Added "Login As Owner" and "Reset Password" dropdown options
- `AdminUsers.jsx` - Added "Login As" and "Reset Password" for users
- `MerchantSidebar.jsx` - Cleaned up navigation, added Storefront section
- `SubdomainCPanel.jsx` - Added error page for invalid stores
- `StoreNotFound.jsx` - New component for 404 store pages
- `store-not-found.html` - Static 404 page for nginx fallback

**APIs Added:**
- `POST /api/admin/stores/{store_id}/impersonate` - Generate token to login as store owner
- `POST /api/admin/stores/{store_id}/reset-owner-password` - Reset store owner's password
- `GET /api/cpanel/store-info/{subdomain}` - Get store info for CPanel branding
- `POST /api/cpanel/login` - CPanel login with subdomain context

### Previous Changes
- Updated theme templates to use direct `/api/maropost/` links instead of `/store/` 
- Eliminates "Loading storefront..." delay on navigation
- Applied to all themes: toolsinabox, skeletal, mytheme

### Routing Updates
- Added `/cpanel` route for subdomain backend access
- Nginx configured for wildcard subdomains
- Custom domain support via catch-all server block

### Code Changes Applied
1. Theme templates: `/store/` → `/api/maropost/`
2. App.js: Added `/cpanel` routes
3. Nginx: Subdomain and custom domain routing with X-Subdomain header

## Credentials

| Role | URL | Email | Password |
|------|-----|-------|----------|
| Platform Admin | `/admin/login` | eddie@toolsinabox.com.au | Yealink1991% |
| Store Owner | `/login` | eddie@toolsinabox.com.au | Yealink1991% |
| Merchant | `/merchant` | eddie@toolsinabox.com.au | Yealink1991% |

## Pending/Future Tasks

### P0 - Immediate (Deploy to VPS)
- [x] Self-service custom domain feature (COMPLETED)
- [x] URL Redirects feature (COMPLETED)
- [x] Custom Scripts feature (COMPLETED)
- [ ] Push changes to GitHub
- [ ] Deploy to VPS: `git pull && cd frontend && yarn build && pm2 restart celora-backend`
- [ ] Update nginx config to pass X-Subdomain header

### P1 - High Priority
- [ ] SSL Certificate setup (Certbot) - waiting for DNS propagation
- [ ] Email API key configuration (Resend) - user needs to provide API key
- [ ] Stripe production keys (test keys currently in use)

### P2 - Medium Priority
- [ ] eBay integration fix (credential issue - user needs to verify on eBay dev portal)
- [ ] Refactor server.py into smaller route files (api/routes/*.py)
- [ ] Unify user models (platform_owners vs users with different password hashing)

### P3 - Backlog
- [ ] Auto-deployment from GitHub (CI/CD)
- [ ] Full API scoping audit

## Nginx Configuration (for VPS)

**IMPORTANT:** Update `/etc/nginx/sites-available/celora` to pass subdomain header:

```nginx
# In the *.getcelora.com server block, add:
set $subdomain "";
if ($host ~* ^([^.]+)\.getcelora\.com$) {
    set $subdomain $1;
}

# In location blocks that proxy to backend, add:
proxy_set_header X-Subdomain $subdomain;

# For storefront location /, enable error handling:
proxy_intercept_errors on;
error_page 404 = @store_not_found;

location @store_not_found {
    root /var/www/celora/frontend/build;
    try_files /store-not-found.html /index.html;
}
```
