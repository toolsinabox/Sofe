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

### Performance Improvements
- Updated theme templates to use direct `/api/maropost/` links instead of `/store/` 
- Eliminates "Loading storefront..." delay on navigation
- Applied to all themes: toolsinabox, skeletal, mytheme

### Routing Updates
- Added `/_cpanel` route for subdomain backend access
- Nginx configured for wildcard subdomains
- Custom domain support via catch-all server block

### Code Changes Applied
1. Theme templates: `/store/` → `/api/maropost/`
2. App.js: Added `/_cpanel` routes
3. Nginx: Subdomain and custom domain routing

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
