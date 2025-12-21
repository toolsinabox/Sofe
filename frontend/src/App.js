import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Admin Pages
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminMerchants from "./pages/admin/AdminMerchants";

// Merchant Pages
import MerchantLayout from "./pages/merchant/MerchantLayout";
import MerchantDashboard from "./pages/merchant/MerchantDashboard";
import MerchantOrders from "./pages/merchant/MerchantOrders";
import MerchantProducts from "./pages/merchant/MerchantProducts";
import MerchantInventory from "./pages/merchant/MerchantInventory";
import MerchantCustomers from "./pages/merchant/MerchantCustomers";
import MerchantCategories from "./pages/merchant/MerchantCategories";
import MerchantBanners from "./pages/merchant/MerchantBanners";
import MerchantThemeEditor from "./pages/merchant/MerchantThemeEditor";
import MerchantStoreSettings from "./pages/merchant/MerchantStoreSettings";

// Store Pages
import StoreLayout from "./pages/store/StoreLayout";
import StoreFront from "./pages/store/StoreFront";
import ProductListing from "./pages/store/ProductListing";
import ProductDetail from "./pages/store/ProductDetail";
import Cart from "./pages/store/Cart";
import Checkout from "./pages/store/Checkout";

// Landing Page Component
const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-gray-900/80 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <span className="text-xl font-bold text-white">Maropost</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-400 hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="text-gray-400 hover:text-white transition-colors">Pricing</a>
            <a href="#about" className="text-gray-400 hover:text-white transition-colors">About</a>
          </nav>
          <div className="flex items-center gap-4">
            <a href="/admin" className="text-gray-400 hover:text-white transition-colors hidden sm:block">Admin Login</a>
            <a href="/merchant" className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-medium hover:from-cyan-600 hover:to-blue-700 transition-all">
              Merchant Login
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-full mb-8">
            <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></span>
            <span className="text-cyan-400 text-sm font-medium">The #1 E-commerce Platform</span>
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            Build Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">E-commerce Empire</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-10">
            All-in-one commerce platform to build, manage, and scale your online business. 
            From storefront to fulfillment, we've got you covered.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="/merchant" className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-semibold text-lg hover:from-cyan-600 hover:to-blue-700 transition-all shadow-lg shadow-cyan-500/25">
              Start Free Trial
            </a>
            <a href="/store" className="w-full sm:w-auto px-8 py-4 bg-gray-800 text-white rounded-xl font-semibold text-lg hover:bg-gray-700 transition-all border border-gray-700">
              View Demo Store
            </a>
          </div>
          <p className="text-gray-500 text-sm mt-6">No credit card required • 14-day free trial</p>
        </div>
      </section>

      {/* Demo Links */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Admin Dashboard */}
            <a href="/admin" className="group p-8 bg-gradient-to-br from-gray-800 to-gray-800/50 rounded-2xl border border-gray-700 hover:border-cyan-500/50 transition-all">
              <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Admin Dashboard</h3>
              <p className="text-gray-400">Platform overview for managing all merchants, users, and analytics.</p>
              <span className="inline-flex items-center gap-2 text-cyan-400 mt-4 font-medium">
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
              <p className="text-gray-400">Full store management with orders, products, inventory, and analytics.</p>
              <span className="inline-flex items-center gap-2 text-emerald-400 mt-4 font-medium">
                Access Merchant →
              </span>
            </a>

            {/* Demo Store */}
            <a href="/store" className="group p-8 bg-gradient-to-br from-gray-800 to-gray-800/50 rounded-2xl border border-gray-700 hover:border-purple-500/50 transition-all">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Demo Store</h3>
              <p className="text-gray-400">Customer-facing storefront with products, cart, and checkout.</p>
              <span className="inline-flex items-center gap-2 text-purple-400 mt-4 font-medium">
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
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Everything You Need to Succeed</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Powerful tools and features to help you build, manage, and grow your online store.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { title: "Multi-Store Management", desc: "Manage multiple stores from a single dashboard with ease." },
              { title: "Real-time Analytics", desc: "Track sales, orders, and customer behavior in real-time." },
              { title: "Inventory Management", desc: "Keep track of stock levels and automate reordering." },
              { title: "Order Fulfillment", desc: "Streamline your shipping and fulfillment process." },
              { title: "Customer Management", desc: "Build relationships with detailed customer profiles." },
              { title: "Marketing Tools", desc: "Grow your business with built-in marketing features." },
            ].map((feature, i) => (
              <div key={i} className="p-6 bg-gray-800/50 rounded-xl border border-gray-700">
                <div className="w-12 h-12 bg-cyan-500/10 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-cyan-400 text-xl">✓</span>
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
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <span className="text-lg font-bold text-white">Maropost</span>
          </div>
          <p className="text-gray-500 text-sm">
            © 2025 Maropost Clone. Built with React and FastAPI.
          </p>
        </div>
      </footer>
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          {/* Landing Page */}
          <Route path="/" element={<LandingPage />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="merchants" element={<AdminMerchants />} />
            <Route path="users" element={<AdminDashboard />} />
            <Route path="billing" element={<AdminDashboard />} />
            <Route path="analytics" element={<AdminDashboard />} />
            <Route path="settings" element={<AdminDashboard />} />
          </Route>

          {/* Merchant Routes */}
          <Route path="/merchant" element={<MerchantLayout />}>
            <Route index element={<MerchantDashboard />} />
            <Route path="orders" element={<MerchantOrders />} />
            <Route path="products" element={<MerchantProducts />} />
            <Route path="categories" element={<MerchantCategories />} />
            <Route path="inventory" element={<MerchantInventory />} />
            <Route path="customers" element={<MerchantCustomers />} />
            <Route path="banners" element={<MerchantBanners />} />
            <Route path="theme-editor" element={<MerchantThemeEditor />} />
            <Route path="store-settings" element={<MerchantStoreSettings />} />
            <Route path="discounts" element={<MerchantDashboard />} />
            <Route path="analytics" element={<MerchantDashboard />} />
            <Route path="payments" element={<MerchantDashboard />} />
            <Route path="settings" element={<MerchantDashboard />} />
          </Route>

          {/* Store Routes */}
          <Route path="/store" element={<StoreLayout />}>
            <Route index element={<StoreFront />} />
            <Route path="products" element={<ProductListing />} />
            <Route path="product/:id" element={<ProductDetail />} />
            <Route path="category/:id" element={<ProductListing />} />
            <Route path="cart" element={<Cart />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="new-arrivals" element={<ProductListing />} />
            <Route path="sale" element={<ProductListing />} />
          </Route>

          {/* Catch all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
