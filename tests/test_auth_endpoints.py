"""
Backend API Tests for Celora E-commerce Platform
Tests authentication endpoints for admin and merchant login
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://celora-ecom.preview.emergentagent.com').rstrip('/')


class TestAdminAuth:
    """Admin authentication endpoint tests"""
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@celora.com", "password": "test123"},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Response should contain access_token"
        assert "user" in data, "Response should contain user info"
        assert data["user"]["role"] == "admin", "User role should be admin"
        assert data["user"]["email"] == "admin@celora.com", "Email should match"
    
    def test_admin_login_invalid_password(self):
        """Test admin login with invalid password"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@celora.com", "password": "wrongpassword"},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_admin_login_invalid_email(self):
        """Test admin login with non-existent email"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "nonexistent@celora.com", "password": "test123"},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


class TestMerchantAuth:
    """Merchant authentication endpoint tests"""
    
    def test_merchant_login_eddie_success(self):
        """Test merchant login with eddie@toolsinabox.com.au"""
        response = requests.post(
            f"{BASE_URL}/api/platform/auth/login",
            params={"email": "eddie@toolsinabox.com.au", "password": "test123"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "owner" in data, "Response should contain owner info"
        assert "stores" in data, "Response should contain stores"
        assert data["owner"]["email"] == "eddie@toolsinabox.com.au", "Email should match"
        assert len(data["stores"]) > 0, "Should have at least one store"
    
    def test_merchant_login_test_user_success(self):
        """Test merchant login with test@test.com"""
        response = requests.post(
            f"{BASE_URL}/api/platform/auth/login",
            params={"email": "test@test.com", "password": "test123"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "owner" in data, "Response should contain owner info"
        assert data["owner"]["email"] == "test@test.com", "Email should match"
    
    def test_merchant_login_invalid_password(self):
        """Test merchant login with invalid password"""
        response = requests.post(
            f"{BASE_URL}/api/platform/auth/login",
            params={"email": "eddie@toolsinabox.com.au", "password": "wrongpassword"}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_merchant_login_invalid_email(self):
        """Test merchant login with non-existent email"""
        response = requests.post(
            f"{BASE_URL}/api/platform/auth/login",
            params={"email": "nonexistent@test.com", "password": "test123"}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


class TestMerchantDomainSettings:
    """Merchant domain settings endpoint tests"""
    
    @pytest.fixture
    def merchant_token(self):
        """Get merchant authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/platform/auth/login",
            params={"email": "eddie@toolsinabox.com.au", "password": "test123"}
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Merchant authentication failed")
    
    def test_get_domain_settings(self, merchant_token):
        """Test getting domain settings with valid token"""
        response = requests.get(
            f"{BASE_URL}/api/store/domain-settings",
            headers={"Authorization": f"Bearer {merchant_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "store_id" in data, "Response should contain store_id"
        assert "subdomain" in data, "Response should contain subdomain"
        assert data["subdomain"] == "toolsinabox", "Subdomain should be toolsinabox"
    
    def test_get_domain_settings_no_auth(self):
        """Test getting domain settings without authentication"""
        response = requests.get(f"{BASE_URL}/api/store/domain-settings")
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestMerchantProducts:
    """Merchant products endpoint tests"""
    
    @pytest.fixture
    def merchant_token(self):
        """Get merchant authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/platform/auth/login",
            params={"email": "eddie@toolsinabox.com.au", "password": "test123"}
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Merchant authentication failed")
    
    def test_get_products(self, merchant_token):
        """Test getting products list"""
        response = requests.get(
            f"{BASE_URL}/api/products",
            headers={"Authorization": f"Bearer {merchant_token}"}
        )
        
        # Products endpoint may or may not require auth
        assert response.status_code in [200, 401], f"Expected 200 or 401, got {response.status_code}"


class TestMerchantOrders:
    """Merchant orders endpoint tests"""
    
    @pytest.fixture
    def merchant_token(self):
        """Get merchant authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/platform/auth/login",
            params={"email": "eddie@toolsinabox.com.au", "password": "test123"}
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Merchant authentication failed")
    
    def test_get_orders(self, merchant_token):
        """Test getting orders list"""
        response = requests.get(
            f"{BASE_URL}/api/orders",
            headers={"Authorization": f"Bearer {merchant_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"


class TestMerchantRedirects:
    """Merchant URL redirects endpoint tests"""
    
    @pytest.fixture
    def merchant_token(self):
        """Get merchant authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/platform/auth/login",
            params={"email": "eddie@toolsinabox.com.au", "password": "test123"}
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Merchant authentication failed")
    
    def test_get_redirects(self, merchant_token):
        """Test getting redirects list"""
        response = requests.get(
            f"{BASE_URL}/api/store/redirects",
            headers={"Authorization": f"Bearer {merchant_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
