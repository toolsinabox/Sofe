"""
Celora Multi-Tenant E-Commerce Platform - Full Audit Tests
Tests: Authentication, Dashboard Data, Products, Orders, CPanel, Store Frontend
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://celora-ecom-1.preview.emergentagent.com')

# Test credentials
MERCHANT_EMAIL = "eddie@toolsinabox.com.au"
MERCHANT_PASSWORD = "Yealink1991%"
STORE_SUBDOMAIN = "toolsinabox"

# Expected data from original database
EXPECTED_PRODUCTS = 8
EXPECTED_ORDERS = 5
EXPECTED_CUSTOMERS = 4
EXPECTED_REVENUE = 1006.44


class TestMerchantAuthentication:
    """Test merchant login with original password"""
    
    def test_platform_login_with_original_password(self):
        """Test login at /api/platform/auth/login with original password Yealink1991%"""
        response = requests.post(
            f"{BASE_URL}/api/platform/auth/login",
            params={"email": MERCHANT_EMAIL, "password": MERCHANT_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "No token in response"
        assert "owner" in data, "No owner info in response"
        assert data["owner"]["email"] == MERCHANT_EMAIL
        assert data["owner"]["name"] == "Eddie"
        assert "stores" in data, "No stores in response"
        assert len(data["stores"]) > 0, "No stores found for merchant"
        
        # Verify store info
        store = data["stores"][0]
        assert store["subdomain"] == STORE_SUBDOMAIN
        assert store["store_name"] == "Tools In A Box"
        print(f"✓ Platform login successful for {MERCHANT_EMAIL}")
    
    def test_cpanel_login_with_subdomain(self):
        """Test CPanel login at /api/cpanel/login with subdomain context"""
        response = requests.post(
            f"{BASE_URL}/api/cpanel/login",
            json={
                "email": MERCHANT_EMAIL,
                "password": MERCHANT_PASSWORD,
                "subdomain": STORE_SUBDOMAIN
            }
        )
        assert response.status_code == 200, f"CPanel login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert "user" in data, "No user info in response"
        assert data["user"]["email"] == MERCHANT_EMAIL
        print(f"✓ CPanel login successful for {MERCHANT_EMAIL}")
    
    def test_invalid_password_rejected(self):
        """Test that wrong password is rejected"""
        response = requests.post(
            f"{BASE_URL}/api/platform/auth/login",
            params={"email": MERCHANT_EMAIL, "password": "wrongpassword"}
        )
        assert response.status_code == 401, "Invalid password should return 401"
        print("✓ Invalid password correctly rejected")


class TestDashboardData:
    """Test dashboard shows original data"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/platform/auth/login",
            params={"email": MERCHANT_EMAIL, "password": MERCHANT_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_dashboard_stats(self, auth_token):
        """Test dashboard shows correct stats: 5 orders, 8 products, 4 customers, $1006 revenue"""
        response = requests.get(
            f"{BASE_URL}/api/stats/dashboard",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Dashboard stats failed: {response.text}"
        
        data = response.json()
        assert data["total_products"] == EXPECTED_PRODUCTS, f"Expected {EXPECTED_PRODUCTS} products, got {data['total_products']}"
        assert data["total_orders"] == EXPECTED_ORDERS, f"Expected {EXPECTED_ORDERS} orders, got {data['total_orders']}"
        assert data["total_customers"] == EXPECTED_CUSTOMERS, f"Expected {EXPECTED_CUSTOMERS} customers, got {data['total_customers']}"
        assert abs(data["total_revenue"] - EXPECTED_REVENUE) < 1, f"Expected ~${EXPECTED_REVENUE} revenue, got ${data['total_revenue']}"
        
        print(f"✓ Dashboard stats correct: {EXPECTED_PRODUCTS} products, {EXPECTED_ORDERS} orders, {EXPECTED_CUSTOMERS} customers, ${EXPECTED_REVENUE} revenue")


class TestProductsPage:
    """Test products page shows 8 products"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/platform/auth/login",
            params={"email": MERCHANT_EMAIL, "password": MERCHANT_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_products_count(self, auth_token):
        """Test products endpoint returns 8 products"""
        response = requests.get(
            f"{BASE_URL}/api/products",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Products fetch failed: {response.text}"
        
        data = response.json()
        products = data.get("products", data) if isinstance(data, dict) else data
        assert len(products) == EXPECTED_PRODUCTS, f"Expected {EXPECTED_PRODUCTS} products, got {len(products)}"
        
        print(f"✓ Products page shows {EXPECTED_PRODUCTS} products")


class TestOrdersPage:
    """Test orders page shows 5 orders"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/platform/auth/login",
            params={"email": MERCHANT_EMAIL, "password": MERCHANT_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_orders_count(self, auth_token):
        """Test orders endpoint returns 5 orders"""
        response = requests.get(
            f"{BASE_URL}/api/orders",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Orders fetch failed: {response.text}"
        
        data = response.json()
        orders = data.get("orders", data) if isinstance(data, dict) else data
        assert len(orders) == EXPECTED_ORDERS, f"Expected {EXPECTED_ORDERS} orders, got {len(orders)}"
        
        print(f"✓ Orders page shows {EXPECTED_ORDERS} orders")


class TestDomainSettings:
    """Test domain settings page"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/platform/auth/login",
            params={"email": MERCHANT_EMAIL, "password": MERCHANT_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_domain_settings_accessible(self, auth_token):
        """Test domain settings endpoint is accessible"""
        response = requests.get(
            f"{BASE_URL}/api/store/domain-settings",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Domain settings failed: {response.text}"
        
        data = response.json()
        assert "subdomain" in data or "custom_domain" in data, "No domain info in response"
        print("✓ Domain settings page accessible")


class TestCPanelStoreInfo:
    """Test CPanel store info endpoint"""
    
    def test_store_info_by_subdomain(self):
        """Test /api/cpanel/store-info/{subdomain} returns store info"""
        response = requests.get(f"{BASE_URL}/api/cpanel/store-info/{STORE_SUBDOMAIN}")
        assert response.status_code == 200, f"Store info failed: {response.text}"
        
        data = response.json()
        assert data["subdomain"] == STORE_SUBDOMAIN
        assert data["store_name"] == "Tools In A Box"
        print(f"✓ CPanel store info returns correct data for {STORE_SUBDOMAIN}")


class TestStoreFrontend:
    """Test store frontend at toolsinabox subdomain"""
    
    def test_store_frontend_renders(self):
        """Test store frontend renders with correct theme"""
        response = requests.get(f"{BASE_URL}/api/maropost/?subdomain={STORE_SUBDOMAIN}")
        assert response.status_code == 200, f"Store frontend failed: {response.text}"
        
        content = response.text
        assert "TOOLS IN A BOX" in content, "Store name not found in frontend"
        assert "toolsinabox" in content.lower(), "Subdomain reference not found"
        print("✓ Store frontend renders correctly with Tools In A Box theme")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
