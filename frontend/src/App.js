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

// Feature Pages
import MerchantCoupons from "./pages/merchant/MerchantCoupons";
import MerchantLoyalty from "./pages/merchant/MerchantLoyalty";
import MerchantGiftCards from "./pages/merchant/MerchantGiftCards";
import MerchantFlashSales from "./pages/merchant/MerchantFlashSales";
import MerchantAdvancedAnalytics from "./pages/merchant/MerchantAdvancedAnalytics";
import MerchantSuppliers from "./pages/merchant/MerchantSuppliers";
import MerchantBundles from "./pages/merchant/MerchantBundles";
import MerchantEmailMarketing from "./pages/merchant/MerchantEmailMarketing";
import MerchantCustomerGroups from "./pages/merchant/MerchantCustomerGroups";
import MerchantBlog from "./pages/merchant/MerchantBlog";
import MerchantWarehouses from "./pages/merchant/MerchantWarehouses";
import MerchantReturns from "./pages/merchant/MerchantReturns";
import MerchantNotifications from "./pages/merchant/MerchantNotifications";
import MerchantActivityLog from "./pages/merchant/MerchantActivityLog";
import MerchantTaxManagement from "./pages/merchant/MerchantTaxManagement";
import MerchantImportExport from "./pages/merchant/MerchantImportExport";
import MerchantCustomFields from "./pages/merchant/MerchantCustomFields";
import MerchantTemplateTags from "./pages/merchant/MerchantTemplateTags";

// Platform Pages (Shopify-style Hosting Frontend)
import PlatformHome from "./pages/platform/PlatformHome";
import PlatformSignup from "./pages/platform/PlatformSignup";
import PlatformLogin from "./pages/platform/PlatformLogin";
import PlatformDashboard from "./pages/platform/PlatformDashboard";
import PlatformBilling from "./pages/platform/PlatformBilling";

// Live Storefront (Theme-rendered customer store)
import LiveThemeStorefront from "./pages/store/LiveThemeStorefront";

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* ============================================
                PLATFORM ROUTES (Shopify-style Hosting)
                Main landing page and store management
            ============================================ */}
            <Route path="/" element={<PlatformHome />} />
            <Route path="/signup" element={<PlatformSignup />} />
            <Route path="/login" element={<PlatformLogin />} />
            <Route path="/dashboard" element={<PlatformDashboard />} />
            <Route path="/billing" element={<PlatformBilling />} />
            
            {/* Legacy /platform routes redirect to new paths */}
            <Route path="/platform" element={<Navigate to="/" replace />} />
            <Route path="/platform/signup" element={<Navigate to="/signup" replace />} />
            <Route path="/platform/login" element={<Navigate to="/login" replace />} />
            <Route path="/platform/dashboard" element={<Navigate to="/dashboard" replace />} />

            {/* ============================================
                MERCHANT DASHBOARD
                Store owners manage their stores here
            ============================================ */}
            <Route path="/merchant/login" element={<MerchantLogin />} />
            <Route path="/_cpanel/login" element={<MerchantLogin />} />
            <Route path="/_cpanel/*" element={<Navigate to="/merchant" replace />} />
            <Route path="/_cpanel" element={
              <ProtectedRoute>
                <MerchantLayout />
              </ProtectedRoute>
            }>
              <Route index element={<MerchantDashboard />} />
              <Route path="orders" element={<MerchantOrders />} />
              <Route path="products" element={<MerchantProducts />} />
              <Route path="theme-editor" element={<MerchantThemeEditor />} />
              <Route path="*" element={<Navigate to="/_cpanel" replace />} />
            </Route>
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
              
              {/* Feature Routes */}
              <Route path="coupons" element={<MerchantCoupons />} />
              <Route path="loyalty" element={<MerchantLoyalty />} />
              <Route path="gift-cards" element={<MerchantGiftCards />} />
              <Route path="flash-sales" element={<MerchantFlashSales />} />
              <Route path="advanced-analytics" element={<MerchantAdvancedAnalytics />} />
              <Route path="suppliers" element={<MerchantSuppliers />} />
              <Route path="bundles" element={<MerchantBundles />} />
              <Route path="email-marketing" element={<MerchantEmailMarketing />} />
              <Route path="customer-groups" element={<MerchantCustomerGroups />} />
              <Route path="blog" element={<MerchantBlog />} />
              <Route path="warehouses" element={<MerchantWarehouses />} />
              <Route path="returns" element={<MerchantReturns />} />
              <Route path="notifications" element={<MerchantNotifications />} />
              <Route path="activity-log" element={<MerchantActivityLog />} />
              <Route path="tax" element={<MerchantTaxManagement />} />
              <Route path="import-export" element={<MerchantImportExport />} />
              <Route path="custom-fields" element={<MerchantCustomFields />} />
              <Route path="template-tags" element={<MerchantTemplateTags />} />
            </Route>

            {/* ============================================
                ADMIN DASHBOARD
                Platform admin for managing all stores
            ============================================ */}
            <Route path="/admin/login" element={<AdminLogin />} />
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

            {/* ============================================
                LIVE STOREFRONT
                Customer-facing store (theme-rendered)
            ============================================ */}
            <Route path="/store" element={<LiveThemeStorefront />} />
            <Route path="/store/*" element={<LiveThemeStorefront />} />
            
            {/* Legacy /live routes redirect to /store */}
            <Route path="/live" element={<Navigate to="/store" replace />} />
            <Route path="/live/*" element={<Navigate to="/store" replace />} />

            {/* Catch all - redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
