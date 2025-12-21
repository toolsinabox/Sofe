import React, { useEffect, useState } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * LiveThemeStorefront - Renders the full live storefront using active theme templates
 * This is the WYSIWYG storefront that changes when you edit theme templates
 */
const LiveThemeStorefront = () => {
  const location = useLocation();
  const params = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Determine page type from URL
  const getPageInfo = () => {
    const path = location.pathname;
    
    if (path === '/live' || path === '/live/') return { type: 'home' };
    if (path.startsWith('/live/category/')) return { type: 'category', id: params.categoryId };
    if (path.startsWith('/live/product/')) return { type: 'product', id: params.productId };
    if (path === '/live/cart') return { type: 'cart' };
    if (path === '/live/search') return { type: 'search' };
    
    const match = path.match(/\/live\/(.+)/);
    return { type: match ? match[1] : 'home' };
  };

  useEffect(() => {
    const { type, id } = getPageInfo();
    
    // Build the URL for the full page render
    let url = `${BACKEND_URL}/api/render/full-page/${type}`;
    if (type === 'category' && id) url += `?category_id=${id}`;
    if (type === 'product' && id) url += `?product_id=${id}`;
    
    // Redirect to the backend to render the full page
    // This loads the complete HTML from the theme templates
    window.location.href = url;
  }, [location.pathname, params]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Loading theme storefront...</p>
      </div>
    </div>
  );
};

export default LiveThemeStorefront;
