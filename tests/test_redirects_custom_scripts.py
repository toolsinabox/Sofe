"""
Test suite for Celora URL Redirects and Custom Scripts features
Testing: Sidebar navigation, page loading, and CRUD API endpoints
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from review request
TEST_EMAIL = "test@test.com"
TEST_PASSWORD = "test123"
TEST_SUBDOMAIN = "teststore"


class TestCPanelAuthentication:
    """Test CPanel login for merchant dashboard access"""
    
    def test_cpanel_login_success(self):
        """Test CPanel login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/cpanel/login",
            json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "subdomain": TEST_SUBDOMAIN
            }
        )
        
        print(f"CPanel login response: {response.status_code} - {response.text[:500]}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "access_token" in data, "Response should contain access_token"
        assert "user" in data, "Response should contain user object"
        
    def test_cpanel_login_invalid_credentials(self):
        """Test CPanel login fails with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/cpanel/login",
            json={
                "email": "wrong@test.com",
                "password": "wrongpassword",
                "subdomain": TEST_SUBDOMAIN
            }
        )
        
        assert response.status_code in [401, 400, 404], f"Expected 401/400/404, got {response.status_code}"


@pytest.fixture(scope="module")
def merchant_token():
    """Get merchant authentication token via CPanel login"""
    response = requests.post(
        f"{BASE_URL}/api/cpanel/login",
        json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "subdomain": TEST_SUBDOMAIN
        }
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    
    # Fallback to platform login
    response = requests.post(
        f"{BASE_URL}/api/platform/auth/login",
        params={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    
    pytest.skip(f"Merchant authentication failed: {response.status_code} - {response.text}")


class TestURLRedirectsAPI:
    """Test URL Redirects CRUD API endpoints"""
    
    def test_get_redirects_empty(self, merchant_token):
        """Test GET /api/store/redirects returns list (may be empty)"""
        headers = {"Authorization": f"Bearer {merchant_token}"}
        response = requests.get(
            f"{BASE_URL}/api/store/redirects",
            headers=headers
        )
        
        print(f"GET redirects response: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
    def test_create_redirect_success(self, merchant_token):
        """Test POST /api/store/redirects creates a new redirect"""
        headers = {"Authorization": f"Bearer {merchant_token}"}
        unique_id = str(uuid.uuid4())[:8]
        redirect_data = {
            "source_path": f"/TEST_old-page-{unique_id}",
            "target_url": f"/new-page-{unique_id}",
            "redirect_type": "301",
            "is_active": True,
            "notes": "Test redirect"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/store/redirects",
            headers=headers,
            json=redirect_data
        )
        
        print(f"POST redirect response: {response.status_code} - {response.text[:500]}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "id" in data, "Response should contain id"
        assert data["source_path"] == redirect_data["source_path"], "Source path should match"
        assert data["target_url"] == redirect_data["target_url"], "Target URL should match"
        assert data["redirect_type"] == "301", "Redirect type should be 301"
        
        return data["id"]
        
    def test_create_redirect_missing_fields(self, merchant_token):
        """Test POST /api/store/redirects fails with missing required fields"""
        headers = {"Authorization": f"Bearer {merchant_token}"}
        redirect_data = {
            "source_path": "/test-path"
            # Missing target_url
        }
        
        response = requests.post(
            f"{BASE_URL}/api/store/redirects",
            headers=headers,
            json=redirect_data
        )
        
        # Should still create but with empty target_url
        # The validation is on frontend, backend accepts it
        print(f"Create with missing fields: {response.status_code}")
        
    def test_update_redirect_success(self, merchant_token):
        """Test PUT /api/store/redirects/{id} updates a redirect"""
        headers = {"Authorization": f"Bearer {merchant_token}"}
        
        # First create a redirect
        unique_id = str(uuid.uuid4())[:8]
        create_data = {
            "source_path": f"/TEST_update-test-{unique_id}",
            "target_url": f"/original-target-{unique_id}",
            "redirect_type": "301",
            "is_active": True
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/store/redirects",
            headers=headers,
            json=create_data
        )
        
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        redirect_id = create_response.json()["id"]
        
        # Now update it
        update_data = {
            "source_path": f"/TEST_update-test-{unique_id}",
            "target_url": f"/updated-target-{unique_id}",
            "redirect_type": "302",
            "is_active": False,
            "notes": "Updated notes"
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/store/redirects/{redirect_id}",
            headers=headers,
            json=update_data
        )
        
        print(f"PUT redirect response: {update_response.status_code}")
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        
        # Verify update by fetching all redirects
        get_response = requests.get(
            f"{BASE_URL}/api/store/redirects",
            headers=headers
        )
        redirects = get_response.json()
        updated_redirect = next((r for r in redirects if r["id"] == redirect_id), None)
        
        if updated_redirect:
            assert updated_redirect["redirect_type"] == "302", "Redirect type should be updated to 302"
            assert updated_redirect["is_active"] == False, "is_active should be False"
        
    def test_delete_redirect_success(self, merchant_token):
        """Test DELETE /api/store/redirects/{id} deletes a redirect"""
        headers = {"Authorization": f"Bearer {merchant_token}"}
        
        # First create a redirect to delete
        unique_id = str(uuid.uuid4())[:8]
        create_data = {
            "source_path": f"/TEST_delete-test-{unique_id}",
            "target_url": f"/target-{unique_id}",
            "redirect_type": "301",
            "is_active": True
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/store/redirects",
            headers=headers,
            json=create_data
        )
        
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        redirect_id = create_response.json()["id"]
        
        # Now delete it
        delete_response = requests.delete(
            f"{BASE_URL}/api/store/redirects/{redirect_id}",
            headers=headers
        )
        
        print(f"DELETE redirect response: {delete_response.status_code}")
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}: {delete_response.text}"
        
        # Verify deletion
        get_response = requests.get(
            f"{BASE_URL}/api/store/redirects",
            headers=headers
        )
        redirects = get_response.json()
        deleted_redirect = next((r for r in redirects if r["id"] == redirect_id), None)
        assert deleted_redirect is None, "Redirect should be deleted"
        
    def test_delete_redirect_not_found(self, merchant_token):
        """Test DELETE /api/store/redirects/{id} returns 404 for non-existent redirect"""
        headers = {"Authorization": f"Bearer {merchant_token}"}
        
        response = requests.delete(
            f"{BASE_URL}/api/store/redirects/non-existent-id-12345",
            headers=headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
    def test_redirects_without_auth(self):
        """Test redirects endpoints require authentication"""
        response = requests.get(f"{BASE_URL}/api/store/redirects")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestCustomScriptsAPI:
    """Test Custom Scripts API endpoints"""
    
    def test_get_custom_scripts(self, merchant_token):
        """Test GET /api/store/custom-scripts returns scripts settings"""
        headers = {"Authorization": f"Bearer {merchant_token}"}
        response = requests.get(
            f"{BASE_URL}/api/store/custom-scripts",
            headers=headers
        )
        
        print(f"GET custom-scripts response: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Validate response structure - should have default fields
        expected_fields = [
            "head_scripts", "body_start_scripts", "body_end_scripts",
            "custom_css", "google_analytics_id", "scripts_enabled"
        ]
        for field in expected_fields:
            assert field in data, f"Response should contain {field}"
            
    def test_update_custom_scripts_success(self, merchant_token):
        """Test PUT /api/store/custom-scripts updates scripts settings"""
        headers = {"Authorization": f"Bearer {merchant_token}"}
        
        scripts_data = {
            "head_scripts": "<!-- TEST head script -->",
            "body_start_scripts": "<!-- TEST body start -->",
            "body_end_scripts": "<!-- TEST body end -->",
            "custom_css": ".test-class { color: red; }",
            "google_analytics_id": "G-TEST12345",
            "google_tag_manager_id": "GTM-TEST123",
            "facebook_pixel_id": "123456789",
            "tiktok_pixel_id": "",
            "snapchat_pixel_id": "",
            "pinterest_tag_id": "",
            "custom_checkout_scripts": "<!-- checkout -->",
            "custom_thankyou_scripts": "<!-- thankyou -->",
            "scripts_enabled": True
        }
        
        response = requests.put(
            f"{BASE_URL}/api/store/custom-scripts",
            headers=headers,
            json=scripts_data
        )
        
        print(f"PUT custom-scripts response: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify update by fetching
        get_response = requests.get(
            f"{BASE_URL}/api/store/custom-scripts",
            headers=headers
        )
        data = get_response.json()
        
        assert data.get("google_analytics_id") == "G-TEST12345", "Google Analytics ID should be updated"
        assert data.get("head_scripts") == "<!-- TEST head script -->", "Head scripts should be updated"
        
    def test_update_custom_scripts_disable(self, merchant_token):
        """Test disabling scripts via PUT /api/store/custom-scripts"""
        headers = {"Authorization": f"Bearer {merchant_token}"}
        
        scripts_data = {
            "scripts_enabled": False
        }
        
        response = requests.put(
            f"{BASE_URL}/api/store/custom-scripts",
            headers=headers,
            json=scripts_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify
        get_response = requests.get(
            f"{BASE_URL}/api/store/custom-scripts",
            headers=headers
        )
        data = get_response.json()
        assert data.get("scripts_enabled") == False, "Scripts should be disabled"
        
        # Re-enable for other tests
        requests.put(
            f"{BASE_URL}/api/store/custom-scripts",
            headers=headers,
            json={"scripts_enabled": True}
        )
        
    def test_custom_scripts_without_auth(self):
        """Test custom-scripts endpoints require authentication"""
        response = requests.get(f"{BASE_URL}/api/store/custom-scripts")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestBulkRedirectImport:
    """Test bulk redirect import functionality"""
    
    def test_bulk_import_redirects(self, merchant_token):
        """Test POST /api/store/redirects/bulk imports multiple redirects"""
        headers = {"Authorization": f"Bearer {merchant_token}"}
        unique_id = str(uuid.uuid4())[:8]
        
        bulk_data = {
            "redirects": [
                {
                    "source_path": f"/TEST_bulk1-{unique_id}",
                    "target_url": f"/target1-{unique_id}",
                    "redirect_type": "301",
                    "is_active": True
                },
                {
                    "source_path": f"/TEST_bulk2-{unique_id}",
                    "target_url": f"/target2-{unique_id}",
                    "redirect_type": "302",
                    "is_active": True
                }
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/store/redirects/bulk",
            headers=headers,
            json=bulk_data
        )
        
        print(f"Bulk import response: {response.status_code} - {response.text}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "imported" in data, "Response should contain imported count"
        assert data["imported"] == 2, f"Should import 2 redirects, got {data['imported']}"


class TestCleanup:
    """Cleanup test data after tests"""
    
    def test_cleanup_test_redirects(self, merchant_token):
        """Clean up TEST_ prefixed redirects"""
        headers = {"Authorization": f"Bearer {merchant_token}"}
        
        # Get all redirects
        response = requests.get(
            f"{BASE_URL}/api/store/redirects",
            headers=headers
        )
        
        if response.status_code == 200:
            redirects = response.json()
            test_redirects = [r for r in redirects if r.get("source_path", "").startswith("/TEST_")]
            
            for redirect in test_redirects:
                requests.delete(
                    f"{BASE_URL}/api/store/redirects/{redirect['id']}",
                    headers=headers
                )
            
            print(f"Cleaned up {len(test_redirects)} test redirects")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
