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
2. System generates unique TXT verification token: `celora-site={subdomain}.getcelora.com:{unique_hex}`
   - Example: `celora-site=toolsinabox.getcelora.com:abc123def456`
   - This makes it OBVIOUS which store the domain will connect to
3. Store owner adds TXT record to their DNS
4. Store owner adds A record pointing to server IP (45.77.239.247)
5. System verifies BOTH TXT (ownership) and A record (routing)
6. Domain marked as verified only when both pass
7. Once verified, `/cpanel` on the custom domain serves the merchant dashboard

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

## Utility Files

### Platform Detection (`/app/frontend/src/utils/platformDetect.js`)
Auto-detects which environment/platform the app is running on:
- **EMERGENT**: Emergent preview environment (preview.emergentagent.com)
- **SUBDOMAIN**: Store subdomain (store.getcelora.com)
- **CUSTOM_DOMAIN**: Merchant's custom domain (www.mystore.com)
- **MAIN_PLATFORM**: Main Celora site (getcelora.com)

**Functions:**
- `detectPlatform()` - Returns platform type, hostname, subdomain info
- `getStoreUrl(storeData)` - Returns correct store URL based on platform
- `getCPanelUrl(storeData)` - Returns correct CPanel URL based on platform
- `isPreviewEnvironment()` - Checks if in preview/dev mode

---


### January 3, 2026 - Comprehensive Admin Panel (COMPLETED)
**New Admin Features Built:**
1. **Exclusive Admin Access** - Only eddie@toolsinabox.com.au has super_admin access
2. **Admin Analytics** (`/admin/analytics`) - Platform-wide metrics, revenue trends, top stores
3. **Admin Settings** (`/admin/settings`) - Four tabs:
   - **General**: Platform name, support email, currency, subscription settings
   - **Feature Flags**: Toggle platform features on/off
   - **Announcements**: Create/edit/delete platform-wide announcements  
   - **Security**: Shows exclusive access confirmation, security features
4. **Admin Activity Log** (`/admin/activity`) - Track all admin actions and login history
5. **Enhanced Store Management** - Full CRUD on any store's products, orders, customers
6. **Impersonation** - Login as any store owner for support
7. **Password Reset** - Reset any merchant's password

**Login Credentials:**
| Role | Email | Password | Access Level |
|------|-------|----------|--------------|
| **Super Admin** | eddie@toolsinabox.com.au | Yealink1991% | Full platform access |
| ~~Blocked~~ | admin@celora.com | test123 | No admin access |

**Files Created:**
- `/app/frontend/src/pages/admin/AdminAnalytics.jsx`
- `/app/frontend/src/pages/admin/AdminSettings.jsx`
- `/app/frontend/src/pages/admin/AdminActivityLog.jsx`
- `/app/backend/routes/admin.py` - Comprehensive admin API routes

**Files Modified:**
- `/app/frontend/src/App.js` - Added new admin routes
- `/app/frontend/src/components/layout/AdminSidebar.jsx` - Updated navigation
- `/app/frontend/src/context/AuthContext.jsx` - Support super_admin role
- `/app/backend/server.py` - Enhanced admin auth to support bcrypt

**Test Results:** 13/13 backend tests passed (iteration_9.json)

### January 3, 2026 - System Cleanup & Dead Code Removal (COMPLETED)
**Cleanup Performed:**
1. **Removed PlatformDashboard.jsx** - Multi-store dashboard no longer needed with "one email, one store" model
2. **Removed Orphaned Shipping Files:**
   - `ShippingServices.jsx` - Never imported anywhere
   - `ShippingSettings.jsx` - Never imported anywhere  
   - `ShippingZones.jsx` - Never imported anywhere
3. **User Flow Simplified:** All `/dashboard` routes now redirect directly to `/merchant`
4. **Created admin@celora.com** - Dedicated admin account with bcrypt password

**Test Results:** 100% pass rate - 10/10 backend tests, all UI flows working (iteration_8.json)

**Login Credentials:**
| Role | Email | Password | Login URL | Redirects To |
|------|-------|----------|-----------|--------------|
| Admin | admin@celora.com | test123 | /admin/login | /admin |
| Merchant (Eddie) | eddie@toolsinabox.com.au | Yealink1991% | /merchant/login | /merchant |
| Merchant (Test) | test@test.com | test123 | /merchant/login | /merchant |
| CPanel | (any merchant) | (password) | /cpanel?subdomain=xxx | /merchant |

**Files Removed:**
- `/app/frontend/src/pages/platform/PlatformDashboard.jsx`
- `/app/frontend/src/pages/merchant/ShippingServices.jsx`
- `/app/frontend/src/pages/merchant/ShippingSettings.jsx`
- `/app/frontend/src/pages/merchant/ShippingZones.jsx`

**Files Modified:**
- `/app/frontend/src/App.js` - Removed PlatformDashboard import

### January 3, 2026 - Full System Audit & Authentication Fixes (COMPLETED)
**Critical Fixes Applied:**
1. **Database Configuration:** DB_NAME set to `test_database` (user's original database)
2. **Password Hashes:** System supports both bcrypt (new users) and SHA256 (legacy users)
3. **Merchant Login:** `/api/platform/auth/login` generates JWT tokens
4. **MerchantLogin.jsx:** Uses platform auth endpoint

**Files Modified:**
- `/app/backend/.env` - DB_NAME=test_database
- `/app/backend/routes/platform.py` - JWT token generation
- `/app/frontend/src/pages/merchant/MerchantLogin.jsx` - Use platform auth endpoint

### January 3, 2026 - Comprehensive UI Audit (COMPLETED)
**Full merchant dashboard UI audit:**
- **Domain Settings Page** - Fixed white-on-white text issue, converted to light mode
- **URL Redirects Page** - Full rewrite from dark to light mode styling
- **Custom Scripts Page** - Converted from dark to light mode styling
- **Product Editor Template Tags** - Made ALL 30+ template tags BLUE and CLICKABLE

**New Components Created:**
- `/app/frontend/src/components/ui/TemplateTag.jsx` - Blue clickable tag component for template variables
- Updated `/app/frontend/src/components/ui/CopyTag.jsx` - Light mode color variants

**Files Modified:**
- `/app/frontend/src/pages/merchant/MerchantDomains.jsx` - Light mode styling
- `/app/frontend/src/pages/merchant/MerchantRedirects.jsx` - Full rewrite to light mode
- `/app/frontend/src/pages/merchant/MerchantCustomScripts.jsx` - Light mode styling
- `/app/frontend/src/pages/merchant/MerchantProducts.jsx` - Imported TemplateTag, converted 30+ template tags

**Template Tags Now Blue & Clickable:**
- Product: [@product_name@], [@product_sku@], [@product_price@], [@product_description@], etc.
- All tags have copy-to-clipboard functionality
- Tags use blue styling: `bg-blue-50 text-blue-700 border-blue-200`

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
| **Super Admin** | `/admin/login` | eddie@toolsinabox.com.au | Yealink1991% |
| Platform Owner | `/login` | eddie@toolsinabox.com.au | Yealink1991% |
| Merchant | `/merchant/login` | eddie@toolsinabox.com.au | Yealink1991% |
| Test Merchant | `/merchant/login` | test@test.com | test123 |

**Note:** Only eddie@toolsinabox.com.au has admin access. All other admin accounts have been removed.

## Pending/Future Tasks

### P0 - Immediate (Deploy to VPS)
- [x] Self-service custom domain feature (COMPLETED)
- [x] URL Redirects feature (COMPLETED)
- [x] Custom Scripts feature (COMPLETED)
- [x] CPanel access on custom domains (COMPLETED)
- [x] Fix Domain Settings page UI styling (COMPLETED - January 3, 2026)
- [x] Comprehensive UI Audit - light mode & blue clickable tags (COMPLETED - January 3, 2026)
- [ ] Push changes to GitHub
- [ ] Deploy to VPS with updated nginx config (see `/app/nginx_vps_cpanel.conf`)

### P1 - High Priority
- [ ] SSL Certificate setup (Certbot) - waiting for DNS propagation
- [ ] Email API key configuration (Resend) - user needs to provide API key
- [ ] Stripe production keys (test keys currently in use)

### P2 - Medium Priority
- [ ] eBay integration fix (credential issue - user needs to verify on eBay dev portal)
- [ ] Refactor server.py into smaller route files (api/routes/*.py)
- [ ] **IMPORTANT:** Unify user models - `platform_owners` and `users` tables have different schemas and password hashing (bcrypt vs SHA256). This caused login bugs and should be merged.
- [ ] Fix ESLint warnings (`react-hooks/exhaustive-deps`) in MerchantReviews, MerchantThemeEditor, PlatformSignup

### P3 - Backlog
- [ ] Auto-deployment from GitHub (CI/CD)
- [ ] Full API scoping audit

## Nginx Configuration (for VPS)

**IMPORTANT:** Replace `/etc/nginx/sites-available/celora` with `/app/nginx_vps_cpanel.conf`

Key features in new config:
- `/cpanel` route on subdomains serves React app
- `/cpanel` route on custom domains serves React app (white-label!)
- X-Subdomain header for subdomain requests
- X-Custom-Domain header for custom domain requests
- Error handling for non-existent stores

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
