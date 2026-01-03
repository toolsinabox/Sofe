"""
Test Authentication Flows for Celora Multi-Tenant E-commerce Platform
Tests admin login, merchant login, and cpanel login endpoints
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://celora-ecom-1.preview.emergentagent.com').rstrip('/')


class TestAdminLogin:
    """Admin authentication endpoint tests"""
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            params={"email": "admin@celora.com", "password": "test123"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "admin" in data, "Response should contain admin info"
        assert data["admin"]["email"] == "admin@celora.com"
        assert data["admin"]["role"] in ["admin", "super_admin"]
        print(f"Admin login successful: {data['admin']['email']}")
    
    def test_admin_login_invalid_password(self):
        """Test admin login with invalid password"""
        response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            params={"email": "admin@celora.com", "password": "wrongpassword"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Admin login correctly rejected invalid password")
    
    def test_admin_login_invalid_email(self):
        """Test admin login with non-existent email"""
        response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            params={"email": "nonexistent@celora.com", "password": "test123"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Admin login correctly rejected non-existent email")


class TestMerchantLogin:
    """Merchant authentication endpoint tests via platform auth"""
    
    def test_merchant_login_eddie(self):
        """Test merchant login for Eddie (Tools In A Box)"""
        response = requests.post(
            f"{BASE_URL}/api/platform/auth/login",
            params={"email": "eddie@toolsinabox.com.au", "password": "Yealink1991%"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "owner" in data, "Response should contain owner info"
        assert "stores" in data, "Response should contain stores"
        assert data["owner"]["email"] == "eddie@toolsinabox.com.au"
        assert len(data["stores"]) > 0, "Should have at least one store"
        assert data["stores"][0]["store_name"] == "Tools In A Box"
        print(f"Merchant login successful: {data['owner']['email']} - Store: {data['stores'][0]['store_name']}")
    
    def test_merchant_login_test_user(self):
        """Test merchant login for test user"""
        response = requests.post(
            f"{BASE_URL}/api/platform/auth/login",
            params={"email": "test@test.com", "password": "test123"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "owner" in data, "Response should contain owner info"
        assert data["owner"]["email"] == "test@test.com"
        print(f"Test merchant login successful: {data['owner']['email']}")
    
    def test_merchant_login_invalid_credentials(self):
        """Test merchant login with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/platform/auth/login",
            params={"email": "eddie@toolsinabox.com.au", "password": "wrongpassword"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Merchant login correctly rejected invalid credentials")


class TestCPanelLogin:
    """CPanel store-specific login tests"""
    
    def test_cpanel_store_info_by_subdomain(self):
        """Test getting store info by subdomain"""
        response = requests.get(f"{BASE_URL}/api/cpanel/store-info/toolsinabox")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "store_name" in data or "name" in data, "Response should contain store name"
        store_name = data.get("store_name") or data.get("name")
        assert "Tools" in store_name or "toolsinabox" in store_name.lower(), f"Store name should be Tools In A Box, got {store_name}"
        print(f"CPanel store info retrieved: {store_name}")
    
    def test_cpanel_store_info_nonexistent(self):
        """Test getting store info for non-existent subdomain"""
        response = requests.get(f"{BASE_URL}/api/cpanel/store-info/nonexistentstore123")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("CPanel correctly returned 404 for non-existent store")
    
    def test_cpanel_login_with_subdomain(self):
        """Test CPanel login with subdomain context"""
        response = requests.post(
            f"{BASE_URL}/api/cpanel/login",
            json={
                "email": "eddie@toolsinabox.com.au",
                "password": "Yealink1991%",
                "subdomain": "toolsinabox"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Response should contain access_token"
        assert "user" in data, "Response should contain user info"
        print(f"CPanel login successful for subdomain context")


class TestAuthEndpoints:
    """General auth endpoint tests"""
    
    def test_auth_login_endpoint_exists(self):
        """Test that /api/auth/login endpoint exists"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@test.com", "password": "test123"}
        )
        # Should return 401 (invalid) or 200 (valid), not 404
        assert response.status_code in [200, 401], f"Expected 200 or 401, got {response.status_code}"
        print(f"Auth login endpoint exists, returned {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
