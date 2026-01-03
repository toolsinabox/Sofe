/**
 * Platform Detection Utility
 * Auto-detects which platform/environment the app is running on:
 * 1. Emergent Preview - preview.emergentagent.com
 * 2. Subdomain - store.getcelora.com
 * 3. Custom Domain - merchant's own domain (e.g., www.mystore.com)
 * 4. Main Platform - getcelora.com or www.getcelora.com
 */

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

/**
 * Platform types enum
 */
export const PLATFORM = {
  EMERGENT: 'emergent',
  SUBDOMAIN: 'subdomain', 
  CUSTOM_DOMAIN: 'custom_domain',
  MAIN_PLATFORM: 'main_platform'
};

/**
 * Detects the current platform based on hostname and backend URL
 * @returns {Object} { platform: string, hostname: string, subdomain: string|null }
 */
export const detectPlatform = () => {
  const hostname = window.location.hostname;
  
  // 1. Emergent Preview Environment
  if (hostname.includes('preview.emergentagent.com') || 
      BACKEND_URL?.includes('preview.emergentagent.com')) {
    return {
      platform: PLATFORM.EMERGENT,
      hostname,
      subdomain: null,
      isPreview: true
    };
  }
  
  // 2. Main Celora Platform (getcelora.com or www.getcelora.com)
  if (hostname === 'getcelora.com' || hostname === 'www.getcelora.com') {
    return {
      platform: PLATFORM.MAIN_PLATFORM,
      hostname,
      subdomain: null,
      isPreview: false
    };
  }
  
  // 3. Subdomain (*.getcelora.com)
  if (hostname.endsWith('.getcelora.com')) {
    const subdomain = hostname.replace('.getcelora.com', '');
    // Exclude common subdomains that aren't stores
    if (!['www', 'api', 'app', 'admin', 'mail'].includes(subdomain)) {
      return {
        platform: PLATFORM.SUBDOMAIN,
        hostname,
        subdomain,
        isPreview: false
      };
    }
  }
  
  // 4. Custom Domain (any other domain)
  // This includes localhost for development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return {
      platform: PLATFORM.EMERGENT, // Treat localhost as Emergent/dev
      hostname,
      subdomain: null,
      isPreview: true
    };
  }
  
  // Any other domain is a custom domain
  return {
    platform: PLATFORM.CUSTOM_DOMAIN,
    hostname,
    subdomain: null,
    customDomain: hostname,
    isPreview: false
  };
};

/**
 * Gets the appropriate store URL based on platform and store data
 * @param {Object} storeData - Store data with subdomain, custom_domain, custom_domain_verified
 * @returns {string} The URL to view the store
 */
export const getStoreUrl = (storeData) => {
  if (!storeData) return '#';
  
  const { platform } = detectPlatform();
  const subdomain = storeData.subdomain;
  const customDomain = storeData.custom_domain;
  const customDomainVerified = storeData.custom_domain_verified;
  
  // Priority 1: If on a custom domain that's verified, use it
  if (platform === PLATFORM.CUSTOM_DOMAIN && customDomainVerified && customDomain) {
    return `https://${customDomain}`;
  }
  
  // Priority 2: If custom domain is verified, prefer it (professional URL)
  if (customDomainVerified && customDomain) {
    return `https://${customDomain}`;
  }
  
  // Priority 3: Based on current platform
  switch (platform) {
    case PLATFORM.EMERGENT:
      // In Emergent preview, use the API endpoint with subdomain simulation
      return `${BACKEND_URL}/api/maropost/home?subdomain=${subdomain}`;
      
    case PLATFORM.SUBDOMAIN:
      // Already on subdomain, use relative or same domain
      return `https://${subdomain}.getcelora.com`;
      
    case PLATFORM.CUSTOM_DOMAIN:
      // On custom domain but not verified, fallback to subdomain
      return `https://${subdomain}.getcelora.com`;
      
    case PLATFORM.MAIN_PLATFORM:
    default:
      // On main platform, link to subdomain
      return `https://${subdomain}.getcelora.com`;
  }
};

/**
 * Gets the appropriate CPanel URL based on platform
 * @param {Object} storeData - Store data with subdomain, custom_domain, custom_domain_verified
 * @returns {string} The URL to access the CPanel
 */
export const getCPanelUrl = (storeData) => {
  if (!storeData) return '/merchant';
  
  const { platform } = detectPlatform();
  const subdomain = storeData.subdomain;
  const customDomain = storeData.custom_domain;
  const customDomainVerified = storeData.custom_domain_verified;
  
  // If custom domain is verified, can use it for cpanel
  if (customDomainVerified && customDomain) {
    return `https://${customDomain}/cpanel`;
  }
  
  switch (platform) {
    case PLATFORM.EMERGENT:
      // In Emergent, use query param simulation
      return `/cpanel?subdomain=${subdomain}`;
      
    case PLATFORM.SUBDOMAIN:
    case PLATFORM.CUSTOM_DOMAIN:
    case PLATFORM.MAIN_PLATFORM:
    default:
      return `https://${subdomain}.getcelora.com/cpanel`;
  }
};

/**
 * Gets display-friendly platform name
 * @returns {string} Human readable platform name
 */
export const getPlatformDisplayName = () => {
  const { platform } = detectPlatform();
  
  switch (platform) {
    case PLATFORM.EMERGENT:
      return 'Preview Environment';
    case PLATFORM.SUBDOMAIN:
      return 'Celora Subdomain';
    case PLATFORM.CUSTOM_DOMAIN:
      return 'Custom Domain';
    case PLATFORM.MAIN_PLATFORM:
      return 'Celora Platform';
    default:
      return 'Unknown';
  }
};

/**
 * Checks if currently in a preview/development environment
 * @returns {boolean}
 */
export const isPreviewEnvironment = () => {
  const { isPreview } = detectPlatform();
  return isPreview;
};

export default {
  PLATFORM,
  detectPlatform,
  getStoreUrl,
  getCPanelUrl,
  getPlatformDisplayName,
  isPreviewEnvironment
};
