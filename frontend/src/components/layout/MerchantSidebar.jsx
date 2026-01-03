import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  Settings,
  Boxes,
  Tag,
  CreditCard,
  HelpCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  FolderOpen,
  Image,
  Store,
  Star,
  Truck,
  ShoppingBag,
  Search,
  Menu,
  FileText,
  Mail,
  X,
  Monitor,
  Palette,
  Globe,
  Puzzle,
  Ticket,
  Gift,
  Zap,
  Bell,
  Users2,
  RotateCcw,
  Percent,
  ArrowRightLeft,
  Code
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getStoreUrl as getStoreUrlUtil } from '../../utils/platformDetect';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Grouped navigation structure - Streamlined
const navGroups = [
  {
    id: 'main',
    items: [
      { path: '/merchant', icon: LayoutDashboard, label: 'Dashboard', exact: true },
      { path: '/merchant/pos', icon: Monitor, label: 'Point of Sale' },
    ]
  },
  {
    id: 'sales',
    label: 'Sales',
    icon: ShoppingCart,
    items: [
      { path: '/merchant/orders', icon: ShoppingCart, label: 'Orders' },
      { path: '/merchant/quotes', icon: FileText, label: 'Quotes' },
      { path: '/merchant/returns', icon: RotateCcw, label: 'Returns & Refunds' },
      { path: '/merchant/abandoned-carts', icon: ShoppingBag, label: 'Abandoned Carts' },
    ]
  },
  {
    id: 'catalog',
    label: 'Catalog',
    icon: Package,
    items: [
      { path: '/merchant/products', icon: Package, label: 'Products' },
      { path: '/merchant/categories', icon: FolderOpen, label: 'Categories' },
      { path: '/merchant/inventory', icon: Boxes, label: 'Inventory' },
      { path: '/merchant/reviews', icon: Star, label: 'Reviews' },
      { path: '/merchant/bundles', icon: Package, label: 'Product Bundles' },
    ]
  },
  {
    id: 'customers',
    label: 'Customers',
    icon: Users,
    items: [
      { path: '/merchant/customers', icon: Users, label: 'All Customers' },
      { path: '/merchant/customer-groups', icon: Users2, label: 'Customer Groups' },
    ]
  },
  {
    id: 'marketing',
    label: 'Marketing',
    icon: Tag,
    items: [
      { path: '/merchant/coupons', icon: Ticket, label: 'Coupons' },
      { path: '/merchant/discounts', icon: Tag, label: 'Discounts' },
      { path: '/merchant/gift-cards', icon: Gift, label: 'Gift Cards' },
      { path: '/merchant/flash-sales', icon: Zap, label: 'Flash Sales' },
      { path: '/merchant/email-marketing', icon: Mail, label: 'Email Marketing' },
      { path: '/merchant/analytics', icon: BarChart3, label: 'Analytics' },
    ]
  },
  {
    id: 'content',
    label: 'Content',
    icon: FileText,
    items: [
      { path: '/merchant/pages', icon: FileText, label: 'Pages' },
      { path: '/merchant/blog', icon: FileText, label: 'Blog' },
      { path: '/merchant/banners', icon: Image, label: 'Banners' },
      { path: '/merchant/mega-menu', icon: Menu, label: 'Navigation' },
    ]
  },
  {
    id: 'storefront',
    label: 'Storefront',
    icon: Store,
    items: [
      { path: '/merchant/domains', icon: Globe, label: 'Domains' },
      { path: '/merchant/theme-editor', icon: Palette, label: 'Theme Editor' },
      { path: '/merchant/seo', icon: Search, label: 'SEO' },
      { path: '/merchant/redirects', icon: ArrowRightLeft, label: 'URL Redirects' },
      { path: '/merchant/custom-scripts', icon: Code, label: 'Custom Scripts' },
    ]
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    items: [
      { path: '/merchant/store-settings', icon: Store, label: 'Store Settings' },
      { path: '/merchant/shipping', icon: Truck, label: 'Shipping' },
      { path: '/merchant/payments', icon: CreditCard, label: 'Payments' },
      { path: '/merchant/tax', icon: Percent, label: 'Tax' },
      { path: '/merchant/notifications', icon: Bell, label: 'Notifications' },
      { path: '/merchant/addons', icon: Puzzle, label: 'Apps & Integrations' },
    ]
  },
];

const MerchantSidebar = ({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) => {
  const { logout, store } = useAuth();
  const navigate = useNavigate();
  const [expandedGroups, setExpandedGroups] = useState(['sales', 'catalog', 'storefront']);
  const [storeSettings, setStoreSettings] = useState({
    store_name: 'My Store',
    store_logo: '',
    subdomain: '',
    custom_domain: '',
    custom_domain_verified: false
  });

  // Load store settings - prioritize platform store data
  useEffect(() => {
    let isMounted = true;
    let intervalId = null;
    
    const checkAndSetPlatformStore = () => {
      // Check localStorage for platform store (set by platform dashboard)
      const platformStore = localStorage.getItem('platform_store');
      if (platformStore) {
        try {
          const storeData = JSON.parse(platformStore);
          // Support both 'name' and 'store_name' fields
          const storeName = storeData.name || storeData.store_name;
          if (storeName && isMounted) {
            setStoreSettings({
              store_name: storeName,
              store_logo: storeData.logo || storeData.store_logo || '',
              subdomain: storeData.subdomain || '',
              custom_domain: storeData.custom_domain || '',
              custom_domain_verified: storeData.custom_domain_verified || false
            });
            return true;
          }
        } catch (e) {
          console.error('Error parsing platform store:', e);
        }
      }
      
      // Check auth context store
      if (store && (store.name || store.store_name) && isMounted) {
        setStoreSettings({
          store_name: store.name || store.store_name,
          store_logo: store.logo || store.store_logo || '',
          subdomain: store.subdomain || '',
          custom_domain: store.custom_domain || '',
          custom_domain_verified: store.custom_domain_verified || false
        });
        return true;
      }
      
      return false;
    };
    
    // Check immediately
    if (!checkAndSetPlatformStore()) {
      // Poll for platform store (in case it's set after navigation)
      intervalId = setInterval(() => {
        if (checkAndSetPlatformStore()) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }, 50); // Check every 50ms
      
      // After 500ms, if still no platform store, fall back to API
      setTimeout(() => {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
        
        // Only fetch from API if no platform store was ever found
        const platformStore = localStorage.getItem('platform_store');
        if (!platformStore && isMounted) {
          // Fetch both store settings and domain settings
          const token = localStorage.getItem('token');
          const headers = token ? { Authorization: `Bearer ${token}` } : {};
          
          Promise.all([
            axios.get(`${BACKEND_URL}/api/store/settings`, { headers }).catch(() => ({ data: {} })),
            axios.get(`${BACKEND_URL}/api/store/domain-settings`, { headers }).catch(() => ({ data: {} }))
          ]).then(([settingsRes, domainRes]) => {
            if (isMounted) {
              // Double-check platform store hasn't been set in the meantime
              const recheck = localStorage.getItem('platform_store');
              if (!recheck) {
                setStoreSettings({
                  store_name: settingsRes.data?.store_name || 'My Store',
                  store_logo: settingsRes.data?.store_logo || '',
                  subdomain: domainRes.data?.subdomain || '',
                  custom_domain: domainRes.data?.custom_domain || '',
                  custom_domain_verified: domainRes.data?.custom_domain_verified || false
                });
              }
            }
          });
        }
      }, 500);
    }
    
    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [store]);

  const getInitials = (name) => {
    if (!name) return 'MS';
    const words = name.split(' ').filter(w => w.length > 0);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleLogout = () => {
    logout();
    navigate('/merchant/login');
  };

  const handleBackToPlatform = () => {
    navigate('/dashboard');
  };

  // Get the store URL using platform detection utility
  const getStoreUrl = () => {
    // Get store data from localStorage or context
    const platformStore = localStorage.getItem('platform_store');
    let storeData = null;
    
    try {
      storeData = platformStore ? JSON.parse(platformStore) : store;
    } catch (e) {
      storeData = store;
    }
    
    // If no store data, try to get subdomain from storeSettings
    if (!storeData && storeSettings?.subdomain) {
      storeData = { subdomain: storeSettings.subdomain };
    }
    
    // Last resort: try to fetch from user context
    if (!storeData && user?.store_id) {
      // Return placeholder, will be updated when store loads
      return '#';
    }
    
    return getStoreUrlUtil(storeData);
  };

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleNavClick = () => {
    if (setMobileOpen) {
      setMobileOpen(false);
    }
  };

  const renderNavItem = (item, isSubItem = false) => (
    <NavLink
      key={item.path}
      to={item.path}
      end={item.exact}
      onClick={handleNavClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 ${
          isSubItem ? 'ml-4 text-sm' : ''
        } ${
          isActive
            ? 'bg-blue-600 text-white font-medium'
            : 'text-slate-300 hover:text-white hover:bg-slate-700'
        }`
      }
    >
      <item.icon size={isSubItem ? 16 : 18} className="flex-shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </NavLink>
  );

  const renderNavGroup = (group) => {
    if (!group.label) {
      // No label means it's a top-level group (Dashboard, POS)
      return (
        <div key={group.id} className="space-y-1">
          {group.items.map(item => renderNavItem(item))}
        </div>
      );
    }

    const isExpanded = expandedGroups.includes(group.id);
    const GroupIcon = group.icon;

    return (
      <div key={group.id} className="space-y-1">
        <button
          onClick={() => !collapsed && toggleGroup(group.id)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 text-slate-300 hover:text-white hover:bg-slate-700 ${
            collapsed ? 'justify-center' : 'justify-between'
          }`}
        >
          <div className="flex items-center gap-3">
            <GroupIcon size={18} className="flex-shrink-0" />
            {!collapsed && <span className="font-medium text-sm">{group.label}</span>}
          </div>
          {!collapsed && (
            <ChevronDown 
              size={16} 
              className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            />
          )}
        </button>
        {!collapsed && isExpanded && (
          <div className="space-y-0.5 mt-1">
            {group.items.map(item => renderNavItem(item, true))}
          </div>
        )}
      </div>
    );
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-slate-700">
        {!collapsed && (
          <div className="flex items-center gap-2">
            {storeSettings.store_logo ? (
              <img 
                src={storeSettings.store_logo} 
                alt={storeSettings.store_name}
                className="w-8 h-8 rounded-lg object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div 
              className={`w-8 h-8 bg-blue-500 rounded-lg items-center justify-center ${storeSettings.store_logo ? 'hidden' : 'flex'}`}
            >
              <span className="text-white font-bold text-sm">{getInitials(storeSettings.store_name)}</span>
            </div>
            <span className="text-white font-semibold truncate max-w-[140px]">{storeSettings.store_name}</span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mx-auto">
            <span className="text-white font-bold text-sm">{getInitials(storeSettings.store_name)}</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-3 space-y-2 overflow-y-auto">
        {navGroups.map(renderNavGroup)}
      </nav>

      {/* View Store Button */}
      {!collapsed && (
        <div className="px-3 py-2 border-t border-slate-700 space-y-2">
          <a
            href={getStoreUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-blue-500 rounded-lg text-white font-medium text-sm hover:bg-blue-600 transition-colors"
          >
            <ExternalLink size={16} />
            View Store
          </a>
          <button
            onClick={handleBackToPlatform}
            className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-slate-700 rounded-lg text-slate-300 font-medium text-sm hover:bg-slate-600 transition-colors"
          >
            <LayoutDashboard size={16} />
            Platform Dashboard
          </button>
        </div>
      )}

      {/* Bottom Section */}
      <div className="px-3 py-2 border-t border-slate-700 space-y-1">
        <NavLink
          to="/merchant/help"
          onClick={handleNavClick}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <HelpCircle size={18} />
          {!collapsed && <span className="text-sm">Help & Support</span>}
        </NavLink>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-300 hover:text-red-400 hover:bg-slate-700 transition-colors"
        >
          <LogOut size={18} />
          {!collapsed && <span className="text-sm">Log Out</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex fixed left-0 top-0 h-screen bg-slate-800 transition-all duration-300 z-50 flex-col ${
          collapsed ? 'w-[60px]' : 'w-[240px]'
        }`}
      >
        {sidebarContent}
        
        {/* Collapse Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-slate-700 border border-slate-600 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-600 shadow-sm"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </aside>

      {/* Mobile Sidebar */}
      <aside
        className={`lg:hidden fixed left-0 top-0 h-screen bg-slate-800 transition-transform duration-300 z-50 flex flex-col w-[280px] ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Close button for mobile */}
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute right-3 top-4 p-1 rounded-lg hover:bg-slate-700 text-slate-400"
        >
          <X size={20} />
        </button>
        {sidebarContent}
      </aside>
    </>
  );
};

export default MerchantSidebar;
