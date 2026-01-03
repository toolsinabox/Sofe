#!/bin/bash
# ============================================
# CELORA VPS DEPLOYMENT SCRIPT
# Run these commands on your Vultr VPS
# ============================================

echo "🚀 Starting deployment of admin features and subdomain cpanel..."

# 1. Create the SubdomainCPanel component
cat > /var/www/celora/frontend/src/pages/merchant/SubdomainCPanel.jsx << 'ENDFILE'
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Store, Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useAuth } from '../../context/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SubdomainCPanel = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  
  const [storeInfo, setStoreInfo] = useState(null);
  const [loadingStore, setLoadingStore] = useState(true);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getSubdomain = () => {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return null;
    if (hostname.endsWith('.getcelora.com')) {
      const subdomain = hostname.replace('.getcelora.com', '');
      if (subdomain !== 'www' && subdomain !== 'api') return subdomain;
    }
    return null;
  };

  const subdomain = getSubdomain();

  useEffect(() => {
    const fetchStoreInfo = async () => {
      if (!subdomain) { setLoadingStore(false); return; }
      try {
        const response = await axios.get(`${API}/cpanel/store-info/${subdomain}`);
        setStoreInfo(response.data);
      } catch (err) { console.error('Failed to fetch store info:', err); setError('Store not found'); }
      finally { setLoadingStore(false); }
    };
    fetchStoreInfo();
  }, [subdomain]);

  useEffect(() => {
    if (isAuthenticated && !location.pathname.includes('/login')) navigate('/merchant');
  }, [isAuthenticated, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await axios.post(`${API}/cpanel/login`, { ...formData, subdomain: subdomain });
      login(response.data.access_token, response.data.user);
      navigate('/merchant');
    } catch (err) { setError(err.response?.data?.detail || 'Invalid email or password'); }
    finally { setLoading(false); }
  };

  if (!subdomain && !loadingStore) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="text-center">
          <Store className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Access your CPanel</h1>
          <p className="text-gray-400 mb-6">Please access your store&apos;s control panel via your subdomain:</p>
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <code className="text-cyan-400">yourstore.getcelora.com/cpanel</code>
          </div>
          <Button onClick={() => navigate('/login')} className="mt-6 bg-cyan-500 hover:bg-cyan-600">Go to Platform Login</Button>
        </div>
      </div>
    );
  }

  if (loadingStore) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {storeInfo?.logo ? (
            <img src={storeInfo.logo.startsWith('/api') ? `${API.replace('/api', '')}${storeInfo.logo}` : storeInfo.logo} alt={storeInfo?.store_name} className="w-20 h-20 mx-auto rounded-2xl object-cover mb-4 border-2 border-cyan-500/30" />
          ) : (
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 mb-4 shadow-lg shadow-cyan-500/25">
              <Store className="w-10 h-10 text-white" />
            </div>
          )}
          <h1 className="text-2xl font-bold text-white">{storeInfo?.store_name || subdomain}</h1>
          <p className="text-gray-400 mt-2">Merchant Control Panel</p>
          <p className="text-sm text-cyan-400 mt-1">{subdomain}.getcelora.com</p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" data-testid="cpanel-login-form">
            <div>
              <Label className="text-gray-300 font-medium">Email Address</Label>
              <div className="relative mt-2">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <Input type="email" value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} placeholder="you@example.com" required data-testid="cpanel-email-input" className="pl-10 h-11 bg-slate-900/50 border-slate-600 text-white placeholder-gray-500 focus:border-cyan-500 focus:ring-cyan-500/20" />
              </div>
            </div>

            <div>
              <Label className="text-gray-300 font-medium">Password</Label>
              <div className="relative mt-2">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <Input type={showPassword ? 'text' : 'password'} value={formData.password} onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))} placeholder="••••••••" required data-testid="cpanel-password-input" className="pl-10 pr-10 h-11 bg-slate-900/50 border-slate-600 text-white placeholder-gray-500 focus:border-cyan-500 focus:ring-cyan-500/20" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                <input type="checkbox" className="rounded border-slate-600 bg-slate-900 text-cyan-500 focus:ring-cyan-500/20" />
                Remember me
              </label>
              <a href="#" className="text-sm text-cyan-400 hover:text-cyan-300 font-medium">Forgot password?</a>
            </div>

            <Button type="submit" disabled={loading} data-testid="cpanel-login-button" className="w-full h-11 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-medium shadow-lg shadow-cyan-500/25">
              {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in...</>) : ('Sign In to Dashboard')}
            </Button>
          </form>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          <a href={`http://${subdomain}.getcelora.com`} className="hover:text-gray-300">← Back to Storefront</a>
        </div>
      </div>
    </div>
  );
};

export default SubdomainCPanel;
ENDFILE

echo "✅ SubdomainCPanel.jsx created!"

# 2. Update App.js to add cpanel routes
sed -i 's|import MerchantTemplateTags from "./pages/merchant/MerchantTemplateTags";|import MerchantTemplateTags from "./pages/merchant/MerchantTemplateTags";\nimport SubdomainCPanel from "./pages/merchant/SubdomainCPanel";|' /var/www/celora/frontend/src/App.js

sed -i 's|<Route path="/merchant/login" element={<MerchantLogin />} />|<Route path="/merchant/login" element={<MerchantLogin />} />\n            <Route path="/cpanel" element={<SubdomainCPanel />} />\n            <Route path="/cpanel/login" element={<SubdomainCPanel />} />|' /var/www/celora/frontend/src/App.js

echo "✅ App.js updated with cpanel routes!"

# 3. Rebuild frontend
cd /var/www/celora/frontend && yarn build
echo "✅ Frontend rebuilt!"

# 4. Add backend endpoints for CPanel and Admin features
cat >> /var/www/celora/backend/server.py << 'ENDPOINTS'

# ==================== ADMIN PASSWORD RESET ====================

@api_router.post("/admin/users/{user_id}/reset-password")
async def admin_reset_user_password(user_id: str, password_data: dict, admin: dict = Depends(get_admin_user)):
    """Admin can reset any user's password"""
    new_password = password_data.get("new_password")
    if not new_password or len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    hashed = get_password_hash(new_password)
    await db.users.update_one({"id": user_id}, {"$set": {"hashed_password": hashed, "updated_at": datetime.now(timezone.utc).isoformat()}})
    return {"message": f"Password reset successfully for {user.get('email')}"}

@api_router.post("/admin/users/{user_id}/impersonate")
async def admin_impersonate_user(user_id: str, admin: dict = Depends(get_admin_user)):
    """Admin can generate a login token to access any user's account"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    access_token = create_access_token(data={"sub": user["id"], "impersonated_by": admin["id"]})
    return {"access_token": access_token, "token_type": "bearer", "user": {"id": user["id"], "email": user["email"], "name": user["name"], "role": user["role"], "store_id": user.get("store_id")}, "impersonated_by": admin["email"], "message": f"You are now logged in as {user.get('email')}"}

@api_router.post("/admin/stores/{store_id}/impersonate")
async def admin_impersonate_store_owner(store_id: str, admin: dict = Depends(get_admin_user)):
    """Admin can login as a store owner to access their merchant dashboard"""
    store = await db.platform_stores.find_one({"id": store_id})
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    owner = await db.platform_owners.find_one({"id": store.get("owner_id")})
    if not owner:
        user = await db.users.find_one({"store_id": store_id})
        if user:
            access_token = create_access_token(data={"sub": user["id"], "impersonated_by": admin["id"]})
            return {"access_token": access_token, "token_type": "bearer", "user": {"id": user["id"], "email": user["email"], "name": user["name"], "role": user.get("role", "merchant"), "store_id": store_id}, "store": {"id": store["id"], "store_name": store.get("store_name"), "subdomain": store.get("subdomain")}, "impersonated_by": admin["email"]}
        raise HTTPException(status_code=404, detail="Store owner not found")
    user = await db.users.find_one({"email": owner["email"]})
    if not user:
        user = {"id": owner["id"], "email": owner["email"], "name": owner["name"], "role": "merchant", "store_id": store_id}
    access_token = create_access_token(data={"sub": owner["id"], "impersonated_by": admin["id"], "store_id": store_id})
    return {"access_token": access_token, "token_type": "bearer", "user": {"id": owner["id"], "email": owner["email"], "name": owner["name"], "role": "merchant", "store_id": store_id}, "store": {"id": store["id"], "store_name": store.get("store_name"), "subdomain": store.get("subdomain")}, "impersonated_by": admin["email"]}

@api_router.post("/admin/stores/{store_id}/reset-owner-password")
async def admin_reset_store_owner_password(store_id: str, password_data: dict, admin: dict = Depends(get_admin_user)):
    """Admin can reset a store owner's password"""
    import hashlib
    new_password = password_data.get("new_password")
    if not new_password or len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    store = await db.platform_stores.find_one({"id": store_id})
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    owner_id = store.get("owner_id")
    if not owner_id:
        raise HTTPException(status_code=404, detail="Store owner not found")
    sha256_hash = hashlib.sha256(new_password.encode()).hexdigest()
    await db.platform_owners.update_one({"id": owner_id}, {"$set": {"hashed_password": sha256_hash, "updated_at": datetime.now(timezone.utc).isoformat()}})
    owner = await db.platform_owners.find_one({"id": owner_id})
    if owner:
        bcrypt_hash = get_password_hash(new_password)
        await db.users.update_one({"email": owner["email"]}, {"$set": {"hashed_password": bcrypt_hash, "updated_at": datetime.now(timezone.utc).isoformat()}})
    return {"message": f"Password reset successfully for store owner"}

# ==================== SUBDOMAIN CPANEL ENDPOINTS ====================

@api_router.get("/cpanel/store-info/{subdomain}")
async def get_cpanel_store_info(subdomain: str):
    """Get store info for CPanel login page branding"""
    store = await db.platform_stores.find_one({"subdomain": subdomain.lower()}, {"_id": 0, "id": 1, "store_name": 1, "subdomain": 1, "logo": 1, "status": 1})
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    if store.get("status") == "suspended":
        raise HTTPException(status_code=403, detail="This store has been suspended")
    return store

@api_router.post("/cpanel/login")
async def cpanel_login(login_data: dict):
    """Login to merchant CPanel with subdomain context"""
    import hashlib
    email = login_data.get("email", "").lower()
    password = login_data.get("password", "")
    subdomain = login_data.get("subdomain", "").lower()
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password required")
    store = None
    if subdomain:
        store = await db.platform_stores.find_one({"subdomain": subdomain})
        if not store:
            raise HTTPException(status_code=404, detail="Store not found")
        if store.get("status") == "suspended":
            raise HTTPException(status_code=403, detail="This store has been suspended")
    user = await db.users.find_one({"email": email})
    if user:
        if not verify_password(password, user.get("hashed_password", "")):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        if store and user.get("store_id") and user.get("store_id") != store["id"]:
            raise HTTPException(status_code=403, detail="You don't have access to this store")
        access_token = create_access_token(data={"sub": user["id"], "store_id": store["id"] if store else user.get("store_id")})
        return {"access_token": access_token, "token_type": "bearer", "user": {"id": user["id"], "email": user["email"], "name": user.get("name", ""), "role": user.get("role", "merchant"), "store_id": store["id"] if store else user.get("store_id")}}
    owner = await db.platform_owners.find_one({"email": email})
    if owner:
        sha256_hash = hashlib.sha256(password.encode()).hexdigest()
        if owner.get("hashed_password") != sha256_hash:
            if not verify_password(password, owner.get("hashed_password", "")):
                raise HTTPException(status_code=401, detail="Invalid email or password")
        if store and store["id"] not in owner.get("stores", []):
            raise HTTPException(status_code=403, detail="You don't have access to this store")
        target_store_id = store["id"] if store else (owner.get("stores", [None])[0])
        access_token = create_access_token(data={"sub": owner["id"], "store_id": target_store_id})
        return {"access_token": access_token, "token_type": "bearer", "user": {"id": owner["id"], "email": owner["email"], "name": owner.get("name", ""), "role": "merchant", "store_id": target_store_id}}
    raise HTTPException(status_code=401, detail="Invalid email or password")
ENDPOINTS

echo "✅ Backend endpoints added!"

# 5. Restart backend
pm2 restart celora-backend
echo "✅ Backend restarted!"

# 6. Update Nginx to handle /cpanel on subdomains
cat > /etc/nginx/sites-available/celora << 'NGINX'
# Main domain - serves React app
server {
    listen 80;
    server_name getcelora.com www.getcelora.com;

    location / {
        root /var/www/celora/frontend/build;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Wildcard subdomains - handles *.getcelora.com
server {
    listen 80;
    server_name *.getcelora.com;

    # CPanel route - serves React app for merchant login
    location /cpanel {
        root /var/www/celora/frontend/build;
        try_files $uri $uri/ /index.html;
    }

    # API routes
    location /api {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Store-Subdomain $host;
    }

    # Storefront routes - served by backend
    location / {
        proxy_pass http://127.0.0.1:8001/api/maropost/home;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Custom-Domain $host;
    }

    location ~ ^/(?!api|cpanel)(.+)$ {
        proxy_pass http://127.0.0.1:8001/api/maropost/$1$is_args$args;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Custom-Domain $host;
    }
}

# Catch-all for custom domains
server {
    listen 80 default_server;
    server_name _;

    location /_cpanel {
        return 301 http://www.getcelora.com/merchant;
    }

    location /cpanel {
        root /var/www/celora/frontend/build;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:8001/api/maropost/home;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Custom-Domain $host;
    }

    location ~ ^/(?!api|_cpanel|cpanel)(.+)$ {
        proxy_pass http://127.0.0.1:8001/api/maropost/$1$is_args$args;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Custom-Domain $host;
    }
}
NGINX

# Test and reload nginx
nginx -t && systemctl reload nginx
echo "✅ Nginx configuration updated!"

echo ""
echo "🎉 DEPLOYMENT COMPLETE!"
echo ""
echo "New features available:"
echo "  1. Admin → Merchants: 'Login As Owner' and 'Reset Password' options"
echo "  2. Admin → Users: 'Login As' and 'Reset Password' options"
echo "  3. Subdomain CPanel: toolsinabox.getcelora.com/cpanel"
echo ""
echo "Test the new CPanel:"
echo "  http://toolsinabox.getcelora.com/cpanel"
