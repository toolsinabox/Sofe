import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import MerchantSidebar from '../../components/layout/MerchantSidebar';
import MerchantHeader from '../../components/layout/MerchantHeader';

const MerchantLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/merchant') return 'Dashboard';
    if (path.includes('/orders')) return 'Orders';
    if (path.includes('/products')) return 'Products';
    if (path.includes('/inventory')) return 'Inventory';
    if (path.includes('/customers')) return 'Customers';
    if (path.includes('/discounts')) return 'Discounts';
    if (path.includes('/analytics')) return 'Analytics';
    if (path.includes('/payments')) return 'Payments';
    if (path.includes('/settings')) return 'Settings';
    return 'Merchant';
  };

  return (
    <div className="min-h-screen bg-[#0a0e14]">
      <MerchantSidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
      <div className={`transition-all duration-300 ${
        sidebarCollapsed ? 'ml-[70px]' : 'ml-[260px]'
      }`}>
        <MerchantHeader title={getPageTitle()} />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MerchantLayout;
