# Celora - Multi-Tenant E-Commerce Hosting Platform

## Overview
Celora is a Shopify-like multi-tenant e-commerce platform that allows customers to sign up and manage their own stores. The platform operates under the `getcelora.com` domain.

## Core Features

### Platform Features
- **Multi-Tenancy:** Single codebase serves multiple stores with data isolation via `store_id`
- **Subdomain Routing:** Each store gets `storename.getcelora.com`
- **Custom Domain Support:** Stores can connect their own domains
- **Platform Admin Dashboard:** `/admin` for managing all stores and users
- **Merchant Dashboard:** `/merchant` for store owners to manage products, orders, etc.

### Store Features
- Product management with categories
- Order management
- Customer management
- Theme Editor for customizing storefront
- Shipping options
- Payment integration (Stripe)
- Reviews and ratings

## Technical Architecture

### Stack
- **Frontend:** React with Tailwind CSS
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
| `*.getcelora.com/_cpanel` | Store backend access |

### Key Files
- `/app/backend/server.py` - Main API routes
- `/app/backend/maropost_engine.py` - Storefront template rendering
- `/app/backend/themes/` - Store themes (toolsinabox, skeletal, mytheme)
- `/app/frontend/src/App.js` - React routes
- `/app/frontend/src/pages/merchant/` - Merchant dashboard pages
- `/app/frontend/src/pages/admin/` - Admin dashboard pages

## VPS Deployment (Vultr)

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

### P1 - High Priority
- [ ] SSL Certificate setup (Certbot)
- [ ] Self-service custom domain connection (Shopify-style)
- [ ] Email integration for transactional emails

### P2 - Medium Priority
- [ ] Stripe production keys
- [ ] eBay integration fix (credential issue)
- [ ] Full API scoping audit

### P3 - Backlog
- [ ] Auto-deployment from GitHub
- [ ] CI/CD pipeline
