import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import MerchantSidebar from '../../components/layout/MerchantSidebar';
import MerchantHeader from '../../components/layout/MerchantHeader';

const MerchantLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  
  // Check if on POS page - hide sidebar
  const isPOSPage = location.pathname === '/merchant/pos';

  // Close mobile menu on route change
  useEffect(() => {
    if (mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Close mobile menu on window resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/merchant') return 'Dashboard';
    if (path === '/merchant/pos') return 'Point of Sale';
    if (path.includes('/orders/')) return 'Order Details';
    if (path.includes('/orders')) return 'Orders';
    if (path.includes('/quotes/')) return 'Quote Details';
    if (path.includes('/quotes')) return 'Quotes';
    if (path.includes('/products')) return 'Products';
    if (path.includes('/inventory')) return 'Inventory';
    if (path.includes('/customers')) return 'Customers';
    if (path.includes('/content-zones')) return 'Content Zones';
    if (path.includes('/discounts')) return 'Discounts';
    if (path.includes('/analytics')) return 'Analytics';
    if (path.includes('/payments')) return 'Payments';
    if (path.includes('/settings')) return 'Settings';
    if (path.includes('/emails')) return 'Emails';
    return 'Merchant';
  };

  // For POS page, render without sidebar
  if (isPOSPage) {
    return (
      <div className="min-h-screen bg-[#0a0e14]">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e14]">
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <MerchantSidebar 
        collapsed={sidebarCollapsed} 
        setCollapsed={setSidebarCollapsed}
        mobileOpen={mobileMenuOpen}
        setMobileOpen={setMobileMenuOpen}
      />
      
      {/* Main content */}
      <div className={`transition-all duration-300 lg:${
        sidebarCollapsed ? 'ml-[70px]' : 'ml-[260px]'
      } ml-0`}>
        <MerchantHeader 
          title={getPageTitle()} 
          onMenuClick={() => setMobileMenuOpen(true)}
        />
        <main className="p-3 sm:p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MerchantLayout;
