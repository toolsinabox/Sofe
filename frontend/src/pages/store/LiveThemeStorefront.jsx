import React, { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * LiveThemeStorefront - Renders the full live storefront using the Maropost template engine
 * This is the WYSIWYG storefront that changes when you edit theme templates
 * 
 * Supports:
 * - Layout wrapper selection (default, checkout, print, empty)
 * - Page template selection based on URL routing
 * - Include directive processing
 * - Data binding with [@tag@] and [%loop%] tags
 */
const LiveThemeStorefront = () => {
  const location = useLocation();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [html, setHtml] = useState('');
  const [error, setError] = useState(null);

  // Determine page path from URL
  const getPagePath = () => {
    const path = location.pathname;
    
    // Remove /live prefix and return the rest
    if (path === '/live' || path === '/live/') return 'home';
    
    // Extract path after /live/
    const match = path.match(/\/live\/(.+)/);
    return match ? match[1] : 'home';
  };

  useEffect(() => {
    const fetchPage = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const pagePath = getPagePath();
        const searchParams = new URLSearchParams(location.search);
        
        // Build the URL for the Maropost engine render
        let url = `${BACKEND_URL}/api/maropost/${pagePath}`;
        
        // Pass through query params (print, embed, debug)
        const queryParams = [];
        if (searchParams.has('print')) queryParams.push('print=true');
        if (searchParams.has('embed')) queryParams.push('embed=true');
        if (searchParams.has('debug')) queryParams.push('debug=true');
        if (queryParams.length > 0) url += '?' + queryParams.join('&');
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Failed to load page: ${response.status}`);
        }
        
        const htmlContent = await response.text();
        setHtml(htmlContent);
      } catch (err) {
        console.error('Error loading page:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPage();
  }, [location.pathname, location.search]);

  // When we have HTML, render it as a full page replacement
  useEffect(() => {
    if (html && !loading) {
      // Replace the entire document with the rendered HTML
      document.open();
      document.write(html);
      document.close();
    }
  }, [html, loading]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Page Load Error</h1>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Loading theme storefront...</p>
        <p className="text-sm text-gray-400 mt-2">Powered by Maropost Engine</p>
      </div>
    </div>
  );
};

export default LiveThemeStorefront;
