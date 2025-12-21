import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, Truck, Shield, RotateCcw, ThumbsUp } from 'lucide-react';
import { ThemeHero, ThemeProducts } from '../../components/store/ThemeRenderer';
import ProductCarousel from '../../components/store/ProductCarousel';
import { useCart } from './StoreLayout';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const StoreFront = () => {
  const { addToCart, categories } = useCart();
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [saleProducts, setSaleProducts] = useState([]);
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [featuredRes, saleRes, bannersRes] = await Promise.all([
        axios.get(`${API}/products/featured?limit=8`),
        axios.get(`${API}/products/sale?limit=8`),
        axios.get(`${API}/banners`)
      ]);
      setFeaturedProducts(featuredRes.data);
      setSaleProducts(saleRes.data);
      setBanners(bannersRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Hero Carousel */}
      <HeroCarousel banners={banners} />

      {/* Feature Bar */}
      <section className="bg-white py-6 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="flex flex-col items-center gap-2">
              <ThumbsUp className="text-orange-500" size={28} />
              <span className="text-sm font-semibold text-gray-900">100% Satisfaction</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Truck className="text-orange-500" size={28} />
              <span className="text-sm font-semibold text-gray-900">Fast Delivery</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <RotateCcw className="text-orange-500" size={28} />
              <span className="text-sm font-semibold text-gray-900">30-Day Returns</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Shield className="text-orange-500" size={28} />
              <span className="text-sm font-semibold text-gray-900">Secure Payment</span>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Categories */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 text-center">POPULAR CATEGORIES</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/store/category/${category.id}`}
                className="group bg-gray-50 rounded-lg p-4 text-center hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-orange-500"
              >
                <div className="w-20 h-20 mx-auto mb-3 rounded-lg overflow-hidden bg-white shadow-sm">
                  {category.image ? (
                    <img
                      src={category.image}
                      alt={category.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-orange-100">
                      <span className="text-2xl">📦</span>
                    </div>
                  )}
                </div>
                <h3 className="font-semibold text-gray-900 text-sm group-hover:text-orange-500 transition-colors">
                  {category.name}
                </h3>
                {category.product_count > 0 && (
                  <p className="text-xs text-gray-500 mt-1">{category.product_count} products</p>
                )}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products Carousel */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <ProductCarousel
            title="FEATURED PRODUCTS"
            products={featuredProducts}
            viewAllLink="/store/products"
            onAddToCart={addToCart}
          />
        </div>
      </section>

      {/* Sale Banner */}
      <section className="py-12 bg-gradient-to-r from-red-500 to-orange-500">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">ON SALE NOW!</h2>
          <p className="text-white/90 text-lg mb-6">Limited time offers - Don't miss out on these amazing deals</p>
          <Link
            to="/store/sale"
            className="inline-flex items-center gap-2 px-8 py-3 bg-white text-red-500 font-bold rounded-lg hover:bg-gray-100 transition-colors"
          >
            SHOP SALE <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* Sale Products Carousel */}
      {saleProducts.length > 0 && (
        <section className="py-12 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <ProductCarousel
              title="ON SALE"
              products={saleProducts}
              viewAllLink="/store/sale"
              onAddToCart={addToCart}
            />
          </div>
        </section>
      )}

      {/* About Section */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Your Ultimate Shopping Destination</h2>
              <p className="text-gray-300 mb-6">
                Welcome to Fashion Hub, where quality meets style. We're committed to providing you with the best
                products at competitive prices, backed by exceptional customer service.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm">✓</span>
                  <span>Premium Quality Products</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm">✓</span>
                  <span>Fast & Reliable Shipping</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm">✓</span>
                  <span>30-Day Money Back Guarantee</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm">✓</span>
                  <span>24/7 Customer Support</span>
                </li>
              </ul>
            </div>
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600"
                alt="Shopping"
                className="rounded-lg shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default StoreFront;
