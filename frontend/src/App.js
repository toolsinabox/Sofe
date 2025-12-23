import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, ProtectedRoute } from "./context/AuthContext";

// Admin Pages
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminMerchants from "./pages/admin/AdminMerchants";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminLogin from "./pages/admin/AdminLogin";

// Merchant Pages
import MerchantLayout from "./pages/merchant/MerchantLayout";
import MerchantDashboard from "./pages/merchant/MerchantDashboard";
import MerchantOrders from "./pages/merchant/MerchantOrders";
import MerchantProducts from "./pages/merchant/MerchantProducts";
import MerchantInventory from "./pages/merchant/MerchantInventory";
import MerchantCustomers from "./pages/merchant/MerchantCustomers";
import MerchantCategories from "./pages/merchant/MerchantCategories";
import MerchantBanners from "./pages/merchant/MerchantBanners";
import MerchantContentZones from "./pages/merchant/MerchantContentZones";
import MerchantThemeEditor from "./pages/merchant/MerchantThemeEditor";
import MerchantStoreSettings from "./pages/merchant/MerchantStoreSettings";
import MerchantSettings from "./pages/merchant/MerchantSettings";
import MerchantPayments from "./pages/merchant/MerchantPayments";
import MerchantDiscounts from "./pages/merchant/MerchantDiscounts";
import MerchantAnalytics from "./pages/merchant/MerchantAnalytics";
import MerchantReviews from "./pages/merchant/MerchantReviews";
import MerchantShipping from "./pages/merchant/MerchantShipping";
import MerchantAbandonedCarts from "./pages/merchant/MerchantAbandonedCarts";
import MerchantSEO from "./pages/merchant/MerchantSEO";
import MerchantMegaMenu from "./pages/merchant/MerchantMegaMenu";
import MerchantPages from "./pages/merchant/MerchantPages";
import MerchantLogin from "./pages/merchant/MerchantLogin";
import MerchantOrderDetail from "./pages/merchant/MerchantOrderDetail";
import MerchantQuotes from "./pages/merchant/MerchantQuotes";
import MerchantQuoteDetail from "./pages/merchant/MerchantQuoteDetail";
import MerchantInvoiceSettings from "./pages/merchant/MerchantInvoiceSettings";
import MerchantEmails from "./pages/merchant/MerchantEmails";
import MerchantPOS from "./pages/merchant/MerchantPOS";
import MerchantPOSReports from "./pages/merchant/MerchantPOSReports";
import MerchantAddons from "./pages/merchant/MerchantAddons";
import EbayIntegration from "./pages/merchant/EbayIntegration";

// New Feature Pages
import MerchantCoupons from "./pages/merchant/MerchantCoupons";
import MerchantLoyalty from "./pages/merchant/MerchantLoyalty";
import MerchantGiftCards from "./pages/merchant/MerchantGiftCards";
import MerchantFlashSales from "./pages/merchant/MerchantFlashSales";
import MerchantAdvancedAnalytics from "./pages/merchant/MerchantAdvancedAnalytics";
import MerchantSuppliers from "./pages/merchant/MerchantSuppliers";

// Live Storefront (Theme-rendered)
import LiveThemeStorefront from "./pages/store/LiveThemeStorefront";

// Landing Page Component
const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-gray-900/80 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-800 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">T</span>
            </div>
            <span className="text-xl font-bold text-white">Tools In A Box</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-400 hover:text-white transition-colors">Features</a>
            <a href="#about" className="text-gray-400 hover:text-white transition-colors">About</a>
          </nav>
          <div className="flex items-center gap-4">
            <a href="/admin" className="text-gray-400 hover:text-white transition-colors hidden sm:block">Admin</a>
            <a href="/merchant" className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg font-medium hover:from-red-700 hover:to-red-800 transition-all">
              Merchant Login
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-full mb-8">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            <span className="text-red-400 text-sm font-medium">Australia's #1 Toolbox Supplier</span>
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            Premium <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600">Ute Toolboxes</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-10">
            Australia's largest range of quality aluminium toolboxes. Built tough for Aussie conditions.
            Free delivery Australia-wide.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="/live" className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-semibold text-lg hover:from-red-700 hover:to-red-800 transition-all shadow-lg shadow-red-500/25">
              Shop Now
            </a>
            <a href="/merchant" className="w-full sm:w-auto px-8 py-4 bg-gray-800 text-white rounded-xl font-semibold text-lg hover:bg-gray-700 transition-all border border-gray-700">
              Merchant Dashboard
            </a>
          </div>
        </div>
      </section>

      {/* Demo Links */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Admin Dashboard */}
            <a href="/admin" className="group p-8 bg-gradient-to-br from-gray-800 to-gray-800/50 rounded-2xl border border-gray-700 hover:border-red-500/50 transition-all">
              <div className="w-14 h-14 bg-gradient-to-br from-red-600 to-red-800 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Admin Dashboard</h3>
              <p className="text-gray-400">Platform overview for managing all merchants, users, and analytics.</p>
              <span className="inline-flex items-center gap-2 text-red-400 mt-4 font-medium">
                Access Admin →
              </span>
            </a>

            {/* Merchant Dashboard */}
            <a href="/merchant" className="group p-8 bg-gradient-to-br from-gray-800 to-gray-800/50 rounded-2xl border border-gray-700 hover:border-emerald-500/50 transition-all">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Merchant Dashboard</h3>
              <p className="text-gray-400">Full store management with products, inventory, theme editor, and orders.</p>
              <span className="inline-flex items-center gap-2 text-emerald-400 mt-4 font-medium">
                Access Merchant →
              </span>
            </a>

            {/* Live Store */}
            <a href="/live" className="group p-8 bg-gradient-to-br from-gray-800 to-gray-800/50 rounded-2xl border border-gray-700 hover:border-orange-500/50 transition-all">
              <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Live Storefront</h3>
              <p className="text-gray-400">Theme-rendered customer storefront with cart and checkout.</p>
              <span className="inline-flex items-center gap-2 text-orange-400 mt-4 font-medium">
                Visit Store →
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6 bg-gray-800/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Complete E-commerce Platform</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Everything you need to run your toolbox business online.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { title: "Theme Editor", desc: "Customize your storefront with our powerful Maropost-style theme editor." },
              { title: "Inventory Management", desc: "Track stock levels and manage products with ease." },
              { title: "Order Fulfillment", desc: "Process orders and manage shipping efficiently." },
              { title: "Customer Management", desc: "Build relationships with detailed customer profiles." },
              { title: "Backend Cart", desc: "Persistent shopping cart synced with database." },
              { title: "Multi-Wrapper Templates", desc: "Checkout, print, and email templates supported." },
            ].map((feature, i) => (
              <div key={i} className="p-6 bg-gray-800/50 rounded-xl border border-gray-700">
                <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-red-400 text-xl">✓</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-gray-800">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-red-800 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <span className="text-lg font-bold text-white">Tools In A Box</span>
          </div>
          <p className="text-gray-500 text-sm">
            © 2025 Tools In A Box. Australian Owned & Operated.
          </p>
        </div>
      </footer>
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Landing Page */}
            <Route path="/" element={<LandingPage />} />

            {/* Auth Routes */}
            <Route path="/merchant/login" element={<MerchantLogin />} />
            <Route path="/admin/login" element={<AdminLogin />} />

            {/* Admin Routes - Protected */}
            <Route path="/admin" element={
              <ProtectedRoute requiredRole="admin">
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<AdminDashboard />} />
              <Route path="merchants" element={<AdminMerchants />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="billing" element={<AdminDashboard />} />
              <Route path="analytics" element={<AdminDashboard />} />
              <Route path="settings" element={<AdminDashboard />} />
            </Route>

            {/* Merchant Routes - Protected */}
            <Route path="/merchant" element={
              <ProtectedRoute>
                <MerchantLayout />
              </ProtectedRoute>
            }>
              <Route index element={<MerchantDashboard />} />
              <Route path="orders" element={<MerchantOrders />} />
              <Route path="orders/:orderId" element={<MerchantOrderDetail />} />
              <Route path="quotes" element={<MerchantQuotes />} />
              <Route path="quotes/:quoteId" element={<MerchantQuoteDetail />} />
              <Route path="products" element={<MerchantProducts />} />
              <Route path="categories" element={<MerchantCategories />} />
              <Route path="inventory" element={<MerchantInventory />} />
              <Route path="customers" element={<MerchantCustomers />} />
              <Route path="banners" element={<MerchantBanners />} />
              <Route path="theme-editor" element={<MerchantThemeEditor />} />
              <Route path="store-settings" element={<MerchantStoreSettings />} />
              <Route path="content-zones" element={<MerchantContentZones />} />
              <Route path="discounts" element={<MerchantDiscounts />} />
              <Route path="analytics" element={<MerchantAnalytics />} />
              <Route path="payments" element={<MerchantPayments />} />
              <Route path="settings" element={<MerchantSettings />} />
              <Route path="reviews" element={<MerchantReviews />} />
              <Route path="shipping" element={<MerchantShipping />} />
              <Route path="abandoned-carts" element={<MerchantAbandonedCarts />} />
              <Route path="seo" element={<MerchantSEO />} />
              <Route path="invoice-settings" element={<MerchantInvoiceSettings />} />
              <Route path="mega-menu" element={<MerchantMegaMenu />} />
              <Route path="pages" element={<MerchantPages />} />
              <Route path="emails" element={<MerchantEmails />} />
              <Route path="pos" element={<MerchantPOS />} />
              <Route path="pos/reports" element={<MerchantPOSReports />} />
              <Route path="addons" element={<MerchantAddons />} />
              <Route path="integrations/ebay" element={<EbayIntegration />} />
              
              {/* New Feature Routes */}
              <Route path="coupons" element={<MerchantCoupons />} />
              <Route path="loyalty" element={<MerchantLoyalty />} />
              <Route path="gift-cards" element={<MerchantGiftCards />} />
              <Route path="flash-sales" element={<MerchantFlashSales />} />
              <Route path="advanced-analytics" element={<MerchantAdvancedAnalytics />} />
              <Route path="suppliers" element={<MerchantSuppliers />} />
            </Route>

            {/* Live Theme Storefront - Main customer-facing store */}
            <Route path="/live" element={<LiveThemeStorefront />} />
            <Route path="/live/*" element={<LiveThemeStorefront />} />
            
            {/* Redirect old /store routes to /live */}
            <Route path="/store" element={<Navigate to="/live" replace />} />
            <Route path="/store/*" element={<Navigate to="/live" replace />} />

            {/* Catch all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
