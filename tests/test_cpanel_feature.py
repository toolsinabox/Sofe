"""
Test CPanel Feature - Subdomain and Custom Domain Access
Tests for /cpanel access on both subdomains (storename.getcelora.com/cpanel) 
and custom domains (customdomain.com/cpanel)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
MERCHANT_EMAIL = "eddie@toolsinabox.com.au"
MERCHANT_PASSWORD = "Yealink1991%"
VERIFIED_SUBDOMAIN = "toolsinabox"
VERIFIED_CUSTOM_DOMAIN = "www.toolsinabox.com.au"
EXPECTED_STORE_NAME = "Tools In A Box"


class TestCPanelStoreInfoBySubdomain:
    """Test /api/cpanel/store-info/{subdomain} endpoint"""
    
    def test_get_store_info_valid_subdomain(self):
        """Test getting store info with valid subdomain"""
        response = requests.get(f"{BASE_URL}/api/cpanel/store-info/{VERIFIED_SUBDOMAIN}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain store id"
        assert "store_name" in data, "Response should contain store_name"
        assert "subdomain" in data, "Response should contain subdomain"
        assert data["store_name"] == EXPECTED_STORE_NAME, f"Expected store name '{EXPECTED_STORE_NAME}', got '{data['store_name']}'"
        assert data["subdomain"] == VERIFIED_SUBDOMAIN, f"Expected subdomain '{VERIFIED_SUBDOMAIN}', got '{data['subdomain']}'"
        print(f"✓ Store info retrieved: {data['store_name']}")
    
    def test_get_store_info_nonexistent_subdomain(self):
        """Test getting store info with non-existent subdomain returns 404"""
        response = requests.get(f"{BASE_URL}/api/cpanel/store-info/nonexistentstore123")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data, "Response should contain error detail"
        assert "not found" in data["detail"].lower(), f"Error message should mention 'not found': {data['detail']}"
        print("✓ Non-existent subdomain returns 404")
    
    def test_get_store_info_case_insensitive(self):
        """Test subdomain lookup is case insensitive"""
        response = requests.get(f"{BASE_URL}/api/cpanel/store-info/{VERIFIED_SUBDOMAIN.upper()}")
        assert response.status_code == 200, f"Expected 200 for uppercase subdomain, got {response.status_code}"
        
        data = response.json()
        assert data["store_name"] == EXPECTED_STORE_NAME
        print("✓ Subdomain lookup is case insensitive")


class TestCPanelStoreInfoByDomain:
    """Test /api/cpanel/store-info-by-domain endpoint"""
    
    def test_get_store_info_valid_custom_domain(self):
        """Test getting store info with valid custom domain"""
        response = requests.get(f"{BASE_URL}/api/cpanel/store-info-by-domain", params={"domain": VERIFIED_CUSTOM_DOMAIN})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain store id"
        assert "store_name" in data, "Response should contain store_name"
        assert "custom_domain" in data, "Response should contain custom_domain"
        assert data["store_name"] == EXPECTED_STORE_NAME, f"Expected store name '{EXPECTED_STORE_NAME}', got '{data['store_name']}'"
        assert data["custom_domain"] == VERIFIED_CUSTOM_DOMAIN, f"Expected custom_domain '{VERIFIED_CUSTOM_DOMAIN}', got '{data['custom_domain']}'"
        print(f"✓ Store info by domain retrieved: {data['store_name']}")
    
    def test_get_store_info_nonexistent_domain(self):
        """Test getting store info with non-existent domain returns 404"""
        response = requests.get(f"{BASE_URL}/api/cpanel/store-info-by-domain", params={"domain": "nonexistent-domain.com"})
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data, "Response should contain error detail"
        assert "not found" in data["detail"].lower(), f"Error message should mention 'not found': {data['detail']}"
        print("✓ Non-existent domain returns 404")
    
    def test_get_store_info_domain_with_protocol(self):
        """Test domain lookup strips protocol"""
        response = requests.get(f"{BASE_URL}/api/cpanel/store-info-by-domain", params={"domain": f"https://{VERIFIED_CUSTOM_DOMAIN}"})
        assert response.status_code == 200, f"Expected 200 for domain with protocol, got {response.status_code}"
        
        data = response.json()
        assert data["store_name"] == EXPECTED_STORE_NAME
        print("✓ Domain lookup strips protocol correctly")


class TestCPanelLogin:
    """Test /api/cpanel/login endpoint"""
    
    def test_login_with_subdomain_context(self):
        """Test login with subdomain context"""
        response = requests.post(f"{BASE_URL}/api/cpanel/login", json={
            "email": MERCHANT_EMAIL,
            "password": MERCHANT_PASSWORD,
            "subdomain": VERIFIED_SUBDOMAIN
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Response should contain access_token"
        assert "user" in data, "Response should contain user object"
        assert data["user"]["email"] == MERCHANT_EMAIL, f"Expected email '{MERCHANT_EMAIL}', got '{data['user']['email']}'"
        assert "store_id" in data["user"], "User should have store_id"
        print(f"✓ Login with subdomain successful: {data['user']['name']}")
    
    def test_login_with_custom_domain_context(self):
        """Test login with custom domain context"""
        response = requests.post(f"{BASE_URL}/api/cpanel/login", json={
            "email": MERCHANT_EMAIL,
            "password": MERCHANT_PASSWORD,
            "custom_domain": VERIFIED_CUSTOM_DOMAIN
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Response should contain access_token"
        assert "user" in data, "Response should contain user object"
        assert data["user"]["email"] == MERCHANT_EMAIL, f"Expected email '{MERCHANT_EMAIL}', got '{data['user']['email']}'"
        assert "store_id" in data["user"], "User should have store_id"
        print(f"✓ Login with custom domain successful: {data['user']['name']}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials returns 401"""
        response = requests.post(f"{BASE_URL}/api/cpanel/login", json={
            "email": "wrong@email.com",
            "password": "wrongpassword",
            "subdomain": VERIFIED_SUBDOMAIN
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data, "Response should contain error detail"
        print("✓ Invalid credentials returns 401")
    
    def test_login_missing_email(self):
        """Test login without email returns 400"""
        response = requests.post(f"{BASE_URL}/api/cpanel/login", json={
            "password": MERCHANT_PASSWORD,
            "subdomain": VERIFIED_SUBDOMAIN
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Missing email returns 400")
    
    def test_login_missing_password(self):
        """Test login without password returns 400"""
        response = requests.post(f"{BASE_URL}/api/cpanel/login", json={
            "email": MERCHANT_EMAIL,
            "subdomain": VERIFIED_SUBDOMAIN
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Missing password returns 400")
    
    def test_login_without_store_context(self):
        """Test login without subdomain or custom_domain context"""
        response = requests.post(f"{BASE_URL}/api/cpanel/login", json={
            "email": MERCHANT_EMAIL,
            "password": MERCHANT_PASSWORD
        })
        # Should still work - user's default store will be used
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Response should contain access_token"
        print("✓ Login without store context uses default store")


class TestCPanelTokenValidation:
    """Test that CPanel login tokens work for merchant APIs"""
    
    def test_token_works_for_merchant_api(self):
        """Test that token from CPanel login works for merchant dashboard APIs"""
        # First login
        login_response = requests.post(f"{BASE_URL}/api/cpanel/login", json={
            "email": MERCHANT_EMAIL,
            "password": MERCHANT_PASSWORD,
            "subdomain": VERIFIED_SUBDOMAIN
        })
        assert login_response.status_code == 200
        
        token = login_response.json()["access_token"]
        
        # Try to access a merchant API
        headers = {"Authorization": f"Bearer {token}"}
        dashboard_response = requests.get(f"{BASE_URL}/api/merchant/dashboard", headers=headers)
        
        # Should be able to access merchant dashboard
        assert dashboard_response.status_code == 200, f"Expected 200, got {dashboard_response.status_code}: {dashboard_response.text}"
        print("✓ CPanel token works for merchant APIs")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
