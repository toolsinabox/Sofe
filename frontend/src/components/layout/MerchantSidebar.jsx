import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
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
  ExternalLink,
  FolderOpen,
  Image,
  Code,
  Store,
  LayoutGrid
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const MerchantSidebar = ({ collapsed, setCollapsed }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/merchant/login');
  };
  const navItems = [
    { path: '/merchant', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    { path: '/merchant/orders', icon: ShoppingCart, label: 'Orders' },
    { path: '/merchant/products', icon: Package, label: 'Products' },
    { path: '/merchant/categories', icon: FolderOpen, label: 'Categories' },
    { path: '/merchant/inventory', icon: Boxes, label: 'Inventory' },
    { path: '/merchant/customers', icon: Users, label: 'Customers' },
    { path: '/merchant/banners', icon: Image, label: 'Banners' },
    { path: '/merchant/content-zones', icon: LayoutGrid, label: 'Content Zones' },
    { path: '/merchant/theme-editor', icon: Code, label: 'Theme Editor' },
    { path: '/merchant/store-settings', icon: Store, label: 'Store Settings' },
    { path: '/merchant/discounts', icon: Tag, label: 'Discounts' },
    { path: '/merchant/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/merchant/payments', icon: CreditCard, label: 'Payments' },
    { path: '/merchant/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-[#0d1117] border-r border-gray-800 transition-all duration-300 z-50 flex flex-col ${
        collapsed ? 'w-[70px]' : 'w-[260px]'
      }`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-800">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">FH</span>
            </div>
            <span className="text-white font-semibold text-lg">Fashion Hub</span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center mx-auto">
            <span className="text-white font-bold text-sm">FH</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors absolute right-2"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.exact}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-500/20 to-teal-600/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`
            }
          >
            <item.icon size={20} className="flex-shrink-0" />
            {!collapsed && (
              <span className="font-medium text-sm">{item.label}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* View Store Button */}
      {!collapsed && (
        <div className="px-3 pb-2">
          <NavLink
            to="/store"
            target="_blank"
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg text-white font-medium text-sm hover:from-emerald-600 hover:to-teal-700 transition-all"
          >
            <ExternalLink size={16} />
            View Store
          </NavLink>
        </div>
      )}

      {/* Bottom Section */}
      <div className="p-3 border-t border-gray-800 space-y-1">
        <NavLink
          to="/merchant/help"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all"
        >
          <HelpCircle size={20} />
          {!collapsed && <span className="font-medium text-sm">Help & Support</span>}
        </NavLink>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut size={20} />
          {!collapsed && <span className="font-medium text-sm">Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default MerchantSidebar;
