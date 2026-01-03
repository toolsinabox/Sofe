"""
Test suite for Celora Multi-tenant E-commerce Platform
Testing: Admin impersonate, reset password, CPanel store-info, subdomain validation
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "eddie@toolsinabox.com.au"
ADMIN_PASSWORD = "Yealink1991%"
VALID_STORE_ID = "675b5810-f110-42f0-9cac-00cf353f04a5"
VALID_SUBDOMAIN = "toolsinabox"
INVALID_SUBDOMAIN = "FAKEACCOUNT"


class TestAdminAuthentication:
    """Test admin login functionality"""
    
    def test_admin_login_success(self):
        """Test admin can login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "access_token" in data, "Response should contain access_token"
        assert "user" in data, "Response should contain user object"
        assert data["user"]["email"] == ADMIN_EMAIL, "User email should match"
        
    def test_admin_login_invalid_credentials(self):
        """Test admin login fails with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": "wrongpassword"}
        )
        
        assert response.status_code in [401, 400], f"Expected 401/400, got {response.status_code}"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token - shared across all tests"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Admin authentication failed")


class TestAdminImpersonation:
    """Test admin impersonate store owner functionality"""
    
    def test_impersonate_store_owner_success(self, admin_token):
        """Test admin can impersonate a store owner"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.post(
            f"{BASE_URL}/api/admin/stores/{VALID_STORE_ID}/impersonate",
            headers=headers,
            json={}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "access_token" in data, "Response should contain access_token"
        assert "user" in data, "Response should contain user object"
        assert "impersonated_by" in data, "Response should contain impersonated_by field"
        
    def test_impersonate_invalid_store(self, admin_token):
        """Test impersonate fails for non-existent store"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.post(
            f"{BASE_URL}/api/admin/stores/invalid-store-id-12345/impersonate",
            headers=headers,
            json={}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
    def test_impersonate_without_auth(self):
        """Test impersonate fails without authentication"""
        response = requests.post(
            f"{BASE_URL}/api/admin/stores/{VALID_STORE_ID}/impersonate",
            json={}
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestAdminResetPassword:
    """Test admin reset store owner password functionality"""
    
    def test_reset_password_success(self, admin_token):
        """Test admin can reset store owner password"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.post(
            f"{BASE_URL}/api/admin/stores/{VALID_STORE_ID}/reset-owner-password",
            headers=headers,
            json={"new_password": "TestPassword123!"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data, "Response should contain message"
        
    def test_reset_password_short_password(self, admin_token):
        """Test reset password fails with short password"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.post(
            f"{BASE_URL}/api/admin/stores/{VALID_STORE_ID}/reset-owner-password",
            headers=headers,
            json={"new_password": "123"}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        
    def test_reset_password_invalid_store(self, admin_token):
        """Test reset password fails for non-existent store"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.post(
            f"{BASE_URL}/api/admin/stores/invalid-store-id-12345/reset-owner-password",
            headers=headers,
            json={"new_password": "TestPassword123!"}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
    def test_reset_password_without_auth(self):
        """Test reset password fails without authentication"""
        response = requests.post(
            f"{BASE_URL}/api/admin/stores/{VALID_STORE_ID}/reset-owner-password",
            json={"new_password": "TestPassword123!"}
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestCPanelStoreInfo:
    """Test CPanel store info endpoint for subdomain validation"""
    
    def test_valid_subdomain_returns_store_info(self):
        """Test valid subdomain returns store information"""
        response = requests.get(f"{BASE_URL}/api/cpanel/store-info/{VALID_SUBDOMAIN}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "id" in data, "Response should contain store id"
        assert "store_name" in data, "Response should contain store_name"
        assert "subdomain" in data, "Response should contain subdomain"
        assert data["subdomain"].lower() == VALID_SUBDOMAIN.lower(), "Subdomain should match"
        
    def test_invalid_subdomain_returns_404(self):
        """Test invalid subdomain returns 404 error"""
        response = requests.get(f"{BASE_URL}/api/cpanel/store-info/{INVALID_SUBDOMAIN}")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data, "Response should contain error detail"
        
    def test_nonexistent_subdomain_returns_404(self):
        """Test completely non-existent subdomain returns 404"""
        response = requests.get(f"{BASE_URL}/api/cpanel/store-info/nonexistent12345xyz")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


class TestPlatformStoresEndpoint:
    """Test platform stores endpoint used by AdminMerchants page"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin authentication failed")
    
    def test_get_platform_stores(self, admin_token):
        """Test admin can fetch platform stores list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(
            f"{BASE_URL}/api/admin/platform-stores",
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Should return a list
        assert isinstance(data, list), "Response should be a list"
        
        # If stores exist, validate structure
        if len(data) > 0:
            store = data[0]
            assert "id" in store, "Store should have id"
            # Check for expected fields
            expected_fields = ["id", "store_name", "subdomain", "status"]
            for field in expected_fields:
                if field not in store:
                    print(f"Warning: Field '{field}' not found in store object")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
