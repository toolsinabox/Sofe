import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * LiveThemeStorefront - Redirects to the Maropost template engine backend
 * The backend serves fully rendered HTML pages with the theme applied
 */
const LiveThemeStorefront = () => {
  const location = useLocation();

  useEffect(() => {
    // Determine page path from URL
    const getPagePath = () => {
      const path = location.pathname;
      
      // Handle /store paths
      if (path === '/store' || path === '/store/') return 'home';
      const storeMatch = path.match(/\/store\/(.+)/);
      if (storeMatch) return storeMatch[1];
      
      // Handle /live paths (legacy)
      if (path === '/live' || path === '/live/') return 'home';
      const liveMatch = path.match(/\/live\/(.+)/);
      if (liveMatch) return liveMatch[1];
      
      return 'home';
    };

    const pagePath = getPagePath();
    const searchParams = new URLSearchParams(location.search);
    
    // Build the URL for the Maropost engine render
    let url = `${BACKEND_URL}/api/maropost/${pagePath}`;
    
    // Pass through query params
    const queryParams = [];
    if (searchParams.has('print')) queryParams.push('print=true');
    if (searchParams.has('embed')) queryParams.push('embed=true');
    if (searchParams.has('debug')) queryParams.push('debug=true');
    if (searchParams.has('q')) queryParams.push(`q=${encodeURIComponent(searchParams.get('q'))}`);
    if (queryParams.length > 0) url += '?' + queryParams.join('&');
    
    // Redirect to the backend rendered page
    window.location.replace(url);
  }, [location]);

  // Show brief loading while redirecting
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#1a1a1a',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '3px solid #333',
          borderTop: '3px solid #dc2626',
          borderRadius: '50%',
          margin: '0 auto 16px',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ color: '#888', margin: 0 }}>Loading storefront...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default LiveThemeStorefront;
