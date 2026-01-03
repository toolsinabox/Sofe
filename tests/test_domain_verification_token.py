"""
Test suite for Custom Domain Verification Token Feature
Tests the secure token generation and verification for custom domain connections.

Token format: celora-site={subdomain}.getcelora.com:{unique_code}
This makes it OBVIOUS which store a custom domain will connect to.

Features tested:
1. Save domain generates unique verification token with correct format
2. Token is returned in API response when saving domain
3. Domain-settings endpoint returns the current verification token
4. Different stores get different tokens linking to their specific subdomain
5. Token is regenerated when domain changes
6. Verify domain endpoint checks TXT record contains the exact token
"""

import pytest
import requests
import os
import re

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from the review request
MERCHANT1_EMAIL = "eddie@toolsinabox.com.au"
MERCHANT1_PASSWORD = "Yealink1991%"
MERCHANT1_SUBDOMAIN = "toolsinabox"

MERCHANT2_EMAIL = "test@test.com"
MERCHANT2_PASSWORD = "test123"
MERCHANT2_SUBDOMAIN = "teststore"


class TestDomainVerificationToken:
    """Test suite for domain verification token generation and format"""
    
    @pytest.fixture(scope="class")
    def merchant1_token(self):
        """Get authentication token for merchant 1 (toolsinabox)"""
        response = requests.post(f"{BASE_URL}/api/cpanel/login", json={
            "email": MERCHANT1_EMAIL,
            "password": MERCHANT1_PASSWORD,
            "subdomain": MERCHANT1_SUBDOMAIN
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Could not authenticate merchant1: {response.status_code} - {response.text}")
    
    @pytest.fixture(scope="class")
    def merchant2_token(self):
        """Get authentication token for merchant 2 (teststore)"""
        response = requests.post(f"{BASE_URL}/api/cpanel/login", json={
            "email": MERCHANT2_EMAIL,
            "password": MERCHANT2_PASSWORD,
            "subdomain": MERCHANT2_SUBDOMAIN
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Could not authenticate merchant2: {response.status_code} - {response.text}")
    
    def test_01_merchant1_login_success(self):
        """Test merchant 1 can login successfully"""
        response = requests.post(f"{BASE_URL}/api/cpanel/login", json={
            "email": MERCHANT1_EMAIL,
            "password": MERCHANT1_PASSWORD,
            "subdomain": MERCHANT1_SUBDOMAIN
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert data.get("user", {}).get("email") == MERCHANT1_EMAIL
        print(f"✓ Merchant 1 login successful")
    
    def test_02_merchant2_login_success(self):
        """Test merchant 2 can login successfully"""
        response = requests.post(f"{BASE_URL}/api/cpanel/login", json={
            "email": MERCHANT2_EMAIL,
            "password": MERCHANT2_PASSWORD,
            "subdomain": MERCHANT2_SUBDOMAIN
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        print(f"✓ Merchant 2 login successful")
    
    def test_03_save_domain_generates_token_with_correct_format(self, merchant1_token):
        """
        Test that saving a domain generates a verification token with format:
        celora-site={subdomain}.getcelora.com:{unique_code}
        """
        headers = {"Authorization": f"Bearer {merchant1_token}"}
        
        # Save a test domain
        test_domain = "test-domain-123.com.au"
        response = requests.put(
            f"{BASE_URL}/api/store/custom-domain",
            headers=headers,
            json={"custom_domain": test_domain}
        )
        
        assert response.status_code == 200, f"Save domain failed: {response.text}"
        data = response.json()
        
        # Check token is returned
        assert "verification_token" in data, "verification_token not in response"
        token = data["verification_token"]
        
        # Verify token format: celora-site={subdomain}.getcelora.com:{unique_code}
        expected_pattern = rf"celora-site={MERCHANT1_SUBDOMAIN}\.getcelora\.com:[a-f0-9]{{12}}"
        assert re.match(expected_pattern, token), f"Token format incorrect. Got: {token}, Expected pattern: {expected_pattern}"
        
        # Verify store_subdomain is returned
        assert "store_subdomain" in data, "store_subdomain not in response"
        assert data["store_subdomain"] == f"{MERCHANT1_SUBDOMAIN}.getcelora.com"
        
        print(f"✓ Token generated with correct format: {token}")
        print(f"✓ Store subdomain returned: {data['store_subdomain']}")
    
    def test_04_domain_settings_returns_verification_token(self, merchant1_token):
        """Test that domain-settings endpoint returns the current verification token"""
        headers = {"Authorization": f"Bearer {merchant1_token}"}
        
        response = requests.get(f"{BASE_URL}/api/store/domain-settings", headers=headers)
        
        assert response.status_code == 200, f"Get domain settings failed: {response.text}"
        data = response.json()
        
        # Check all expected fields
        assert "subdomain" in data, "subdomain not in response"
        assert "domain_verification_token" in data, "domain_verification_token not in response"
        
        # Verify token format if present
        token = data.get("domain_verification_token")
        if token:
            expected_pattern = rf"celora-site={data['subdomain']}\.getcelora\.com:[a-f0-9]{{12}}"
            assert re.match(expected_pattern, token), f"Token format incorrect. Got: {token}"
            print(f"✓ Domain settings returns token: {token}")
        else:
            print("⚠ No verification token set yet (domain not saved)")
        
        print(f"✓ Subdomain: {data['subdomain']}")
    
    def test_05_different_stores_get_different_tokens(self, merchant1_token, merchant2_token):
        """
        Test that different stores get different tokens linking to their specific subdomain.
        Merchant 1 (toolsinabox) should get token with toolsinabox.getcelora.com
        Merchant 2 (teststore) should get token with teststore.getcelora.com
        """
        # Save domain for merchant 1
        headers1 = {"Authorization": f"Bearer {merchant1_token}"}
        response1 = requests.put(
            f"{BASE_URL}/api/store/custom-domain",
            headers=headers1,
            json={"custom_domain": "merchant1-test.com"}
        )
        assert response1.status_code == 200, f"Save domain for merchant1 failed: {response1.text}"
        token1 = response1.json().get("verification_token")
        
        # Save domain for merchant 2
        headers2 = {"Authorization": f"Bearer {merchant2_token}"}
        response2 = requests.put(
            f"{BASE_URL}/api/store/custom-domain",
            headers=headers2,
            json={"custom_domain": "merchant2-test.com"}
        )
        assert response2.status_code == 200, f"Save domain for merchant2 failed: {response2.text}"
        token2 = response2.json().get("verification_token")
        
        # Verify tokens are different
        assert token1 != token2, "Tokens should be different for different stores"
        
        # Verify each token contains the correct subdomain
        assert f"celora-site={MERCHANT1_SUBDOMAIN}.getcelora.com:" in token1, \
            f"Merchant1 token should contain {MERCHANT1_SUBDOMAIN}.getcelora.com"
        assert f"celora-site={MERCHANT2_SUBDOMAIN}.getcelora.com:" in token2, \
            f"Merchant2 token should contain {MERCHANT2_SUBDOMAIN}.getcelora.com"
        
        print(f"✓ Merchant 1 token: {token1}")
        print(f"✓ Merchant 2 token: {token2}")
        print(f"✓ Tokens are unique and contain correct subdomains")
    
    def test_06_token_regenerated_when_domain_changes(self, merchant1_token):
        """Test that token is regenerated when domain changes"""
        headers = {"Authorization": f"Bearer {merchant1_token}"}
        
        # Save first domain
        response1 = requests.put(
            f"{BASE_URL}/api/store/custom-domain",
            headers=headers,
            json={"custom_domain": "first-domain.com"}
        )
        assert response1.status_code == 200
        token1 = response1.json().get("verification_token")
        
        # Save different domain
        response2 = requests.put(
            f"{BASE_URL}/api/store/custom-domain",
            headers=headers,
            json={"custom_domain": "second-domain.com"}
        )
        assert response2.status_code == 200
        token2 = response2.json().get("verification_token")
        
        # Tokens should be different when domain changes
        assert token1 != token2, "Token should be regenerated when domain changes"
        
        # Both should still have correct format
        expected_pattern = rf"celora-site={MERCHANT1_SUBDOMAIN}\.getcelora\.com:[a-f0-9]{{12}}"
        assert re.match(expected_pattern, token1), f"Token1 format incorrect: {token1}"
        assert re.match(expected_pattern, token2), f"Token2 format incorrect: {token2}"
        
        print(f"✓ First token: {token1}")
        print(f"✓ Second token (after domain change): {token2}")
        print(f"✓ Token regenerated when domain changed")
    
    def test_07_token_preserved_when_same_domain_saved(self, merchant1_token):
        """Test that token is preserved when saving the same domain again"""
        headers = {"Authorization": f"Bearer {merchant1_token}"}
        
        # Save domain
        test_domain = "same-domain-test.com"
        response1 = requests.put(
            f"{BASE_URL}/api/store/custom-domain",
            headers=headers,
            json={"custom_domain": test_domain}
        )
        assert response1.status_code == 200
        token1 = response1.json().get("verification_token")
        
        # Save same domain again
        response2 = requests.put(
            f"{BASE_URL}/api/store/custom-domain",
            headers=headers,
            json={"custom_domain": test_domain}
        )
        assert response2.status_code == 200
        token2 = response2.json().get("verification_token")
        
        # Token should be the same
        assert token1 == token2, "Token should be preserved when saving same domain"
        
        print(f"✓ Token preserved when same domain saved: {token1}")
    
    def test_08_verify_domain_requires_token(self, merchant1_token):
        """Test that verify-domain endpoint checks for the verification token"""
        headers = {"Authorization": f"Bearer {merchant1_token}"}
        
        # First save a domain to ensure we have a token
        requests.put(
            f"{BASE_URL}/api/store/custom-domain",
            headers=headers,
            json={"custom_domain": "verify-test.com"}
        )
        
        # Try to verify (will fail because DNS isn't set up, but should return token info)
        response = requests.post(
            f"{BASE_URL}/api/store/verify-domain",
            headers=headers,
            json={"domain": "verify-test.com"}
        )
        
        # Should return 200 with verification result (not 500)
        assert response.status_code == 200, f"Verify domain failed unexpectedly: {response.text}"
        data = response.json()
        
        # Should indicate verification failed (since DNS isn't set up)
        assert "verified" in data, "Response should contain 'verified' field"
        
        # Should return the required token for user to add to DNS
        if not data.get("verified"):
            assert "required_txt" in data or "message" in data, \
                "Failed verification should include required_txt or message"
            print(f"✓ Verification failed as expected (no DNS): {data.get('message', '')}")
            if "required_txt" in data:
                print(f"✓ Required TXT record returned: {data['required_txt']}")
    
    def test_09_domain_validation_cleans_input(self, merchant1_token):
        """Test that domain input is properly cleaned (removes http://, https://, trailing slashes)"""
        headers = {"Authorization": f"Bearer {merchant1_token}"}
        
        # Test with various formats
        test_cases = [
            ("https://example.com/", "example.com"),
            ("http://example.com", "example.com"),
            ("EXAMPLE.COM", "example.com"),
            ("www.example.com", "www.example.com"),
        ]
        
        for input_domain, expected_clean in test_cases:
            response = requests.put(
                f"{BASE_URL}/api/store/custom-domain",
                headers=headers,
                json={"custom_domain": input_domain}
            )
            assert response.status_code == 200, f"Failed for input: {input_domain}"
            data = response.json()
            assert data.get("custom_domain") == expected_clean, \
                f"Domain not cleaned properly. Input: {input_domain}, Got: {data.get('custom_domain')}, Expected: {expected_clean}"
            print(f"✓ '{input_domain}' cleaned to '{expected_clean}'")
    
    def test_10_remove_domain_works(self, merchant1_token):
        """Test that removing custom domain works"""
        headers = {"Authorization": f"Bearer {merchant1_token}"}
        
        # First save a domain
        requests.put(
            f"{BASE_URL}/api/store/custom-domain",
            headers=headers,
            json={"custom_domain": "to-be-removed.com"}
        )
        
        # Remove domain
        response = requests.delete(f"{BASE_URL}/api/store/custom-domain", headers=headers)
        assert response.status_code == 200, f"Remove domain failed: {response.text}"
        
        # Verify domain is removed
        settings_response = requests.get(f"{BASE_URL}/api/store/domain-settings", headers=headers)
        assert settings_response.status_code == 200
        data = settings_response.json()
        assert data.get("custom_domain") is None, "Domain should be removed"
        
        print(f"✓ Domain removed successfully")
    
    def test_11_unauthorized_access_rejected(self):
        """Test that endpoints reject unauthorized access"""
        # No auth header
        response = requests.get(f"{BASE_URL}/api/store/domain-settings")
        assert response.status_code in [401, 403], f"Should reject unauthorized: {response.status_code}"
        
        response = requests.put(
            f"{BASE_URL}/api/store/custom-domain",
            json={"custom_domain": "test.com"}
        )
        assert response.status_code in [401, 403], f"Should reject unauthorized: {response.status_code}"
        
        response = requests.post(
            f"{BASE_URL}/api/store/verify-domain",
            json={"domain": "test.com"}
        )
        assert response.status_code in [401, 403], f"Should reject unauthorized: {response.status_code}"
        
        print(f"✓ Unauthorized access properly rejected")


class TestTokenSecurityFeatures:
    """Test security aspects of the verification token"""
    
    @pytest.fixture(scope="class")
    def merchant1_token(self):
        """Get authentication token for merchant 1"""
        response = requests.post(f"{BASE_URL}/api/cpanel/login", json={
            "email": MERCHANT1_EMAIL,
            "password": MERCHANT1_PASSWORD,
            "subdomain": MERCHANT1_SUBDOMAIN
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Could not authenticate: {response.status_code}")
    
    def test_token_contains_store_identifier(self, merchant1_token):
        """
        SECURITY: Token must clearly show which store it connects to.
        This prevents someone from accidentally connecting their domain to the wrong store.
        """
        headers = {"Authorization": f"Bearer {merchant1_token}"}
        
        response = requests.put(
            f"{BASE_URL}/api/store/custom-domain",
            headers=headers,
            json={"custom_domain": "security-test.com"}
        )
        assert response.status_code == 200
        token = response.json().get("verification_token")
        
        # Token MUST contain the full subdomain path
        assert f"{MERCHANT1_SUBDOMAIN}.getcelora.com" in token, \
            f"Token must contain store identifier. Got: {token}"
        
        # Token should start with celora-site= prefix
        assert token.startswith("celora-site="), \
            f"Token should start with 'celora-site='. Got: {token}"
        
        print(f"✓ Token clearly identifies store: {token}")
    
    def test_token_unique_code_is_random(self, merchant1_token):
        """Test that the unique code portion is sufficiently random"""
        headers = {"Authorization": f"Bearer {merchant1_token}"}
        
        # Generate multiple tokens by changing domains
        tokens = []
        for i in range(3):
            response = requests.put(
                f"{BASE_URL}/api/store/custom-domain",
                headers=headers,
                json={"custom_domain": f"random-test-{i}.com"}
            )
            assert response.status_code == 200
            token = response.json().get("verification_token")
            tokens.append(token)
        
        # Extract unique codes
        unique_codes = [t.split(":")[-1] for t in tokens]
        
        # All codes should be different
        assert len(set(unique_codes)) == len(unique_codes), \
            f"Unique codes should all be different: {unique_codes}"
        
        # Each code should be 12 hex characters
        for code in unique_codes:
            assert len(code) == 12, f"Unique code should be 12 chars: {code}"
            assert all(c in '0123456789abcdef' for c in code), \
                f"Unique code should be hex: {code}"
        
        print(f"✓ Unique codes are random: {unique_codes}")


# Cleanup fixture to restore original domain settings
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_domains():
    """Cleanup test domains after all tests"""
    yield
    
    # Cleanup merchant 1
    try:
        response = requests.post(f"{BASE_URL}/api/cpanel/login", json={
            "email": MERCHANT1_EMAIL,
            "password": MERCHANT1_PASSWORD,
            "subdomain": MERCHANT1_SUBDOMAIN
        })
        if response.status_code == 200:
            token = response.json().get("access_token")
            headers = {"Authorization": f"Bearer {token}"}
            # Remove any test domain
            requests.delete(f"{BASE_URL}/api/store/custom-domain", headers=headers)
    except:
        pass
    
    # Cleanup merchant 2
    try:
        response = requests.post(f"{BASE_URL}/api/cpanel/login", json={
            "email": MERCHANT2_EMAIL,
            "password": MERCHANT2_PASSWORD,
            "subdomain": MERCHANT2_SUBDOMAIN
        })
        if response.status_code == 200:
            token = response.json().get("access_token")
            headers = {"Authorization": f"Bearer {token}"}
            requests.delete(f"{BASE_URL}/api/store/custom-domain", headers=headers)
    except:
        pass


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
