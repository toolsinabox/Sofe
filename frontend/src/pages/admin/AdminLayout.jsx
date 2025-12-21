import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AdminSidebar from '../../components/layout/AdminSidebar';
import AdminHeader from '../../components/layout/AdminHeader';

const AdminLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/admin') return 'Dashboard';
    if (path.includes('/merchants')) return 'Merchants';
    if (path.includes('/users')) return 'Users';
    if (path.includes('/billing')) return 'Billing';
    if (path.includes('/analytics')) return 'Analytics';
    if (path.includes('/settings')) return 'Settings';
    return 'Admin';
  };

  return (
    <div className="min-h-screen bg-[#0a0e14]">
      <AdminSidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
      <div className={`transition-all duration-300 ${
        sidebarCollapsed ? 'ml-[70px]' : 'ml-[260px]'
      }`}>
        <AdminHeader title={getPageTitle()} />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
