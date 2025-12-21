import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Star, Minus, Plus, Heart, Share2, Truck, Shield, RotateCcw, ShoppingCart } from 'lucide-react';
import { Button } from '../../components/ui/button';
import ProductCarousel from '../../components/store/ProductCarousel';
import { useCart } from './StoreLayout';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ProductDetail = () => {
  const { id } = useParams();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/products/${id}`);
      setProduct(response.data);
      
      // Fetch related products
      if (response.data.category_id) {
        const relatedRes = await axios.get(`${API}/products?category_id=${response.data.category_id}&limit=4`);
        setRelatedProducts(relatedRes.data.filter(p => p.id !== id));
      }
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const handleAddToCart = () => {
    if (product) {
      addToCart(product, quantity);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="aspect-square bg-gray-200 rounded-lg" />
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 rounded w-3/4" />
              <div className="h-6 bg-gray-200 rounded w-1/4" />
              <div className="h-20 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Product not found</h1>
        <Link to="/store/products" className="text-orange-500 hover:text-orange-600">
          Back to products
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-8">
        <Link to="/store" className="hover:text-orange-500">Home</Link>
        <span>/</span>
        <Link to="/store/products" className="hover:text-orange-500">Products</Link>
        <span>/</span>
        <span className="text-gray-900">{product.name}</span>
      </div>

      {/* Product Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
        {/* Images */}
        <div className="space-y-4">
          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
            <img
              src={product.images?.[selectedImage] || 'https://via.placeholder.com/600'}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
          {product.images && product.images.length > 1 && (
            <div className="flex gap-4">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                    selectedImage === index ? 'border-orange-500' : 'border-gray-200'
                  }`}
                >
                  <img src={image} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <p className="text-sm text-gray-500 mb-2">SKU: {product.sku}</p>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.name}</h1>
          
          {/* Price */}
          <div className="flex items-baseline gap-3 mb-6">
            <span className="text-3xl font-bold text-gray-900">{formatCurrency(product.price)}</span>
            {product.compare_price && product.compare_price > product.price && (
              <>
                <span className="text-xl text-gray-400 line-through">RRP {formatCurrency(product.compare_price)}</span>
                <span className="px-2 py-1 bg-red-500 text-white text-sm font-bold rounded">
                  SAVE {Math.round((1 - product.price / product.compare_price) * 100)}%
                </span>
              </>
            )}
          </div>

          {/* Stock Status */}
          <div className="mb-6">
            {product.stock > 0 ? (
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                <span className="text-green-600 font-semibold">IN STOCK</span>
                <span className="text-gray-500">({product.stock} available)</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                <span className="text-red-600 font-semibold">OUT OF STOCK</span>
              </div>
            )}
          </div>

          <p className="text-gray-600 mb-8 leading-relaxed">{product.description}</p>

          {/* Quantity */}
          <div className="flex items-center gap-4 mb-6">
            <span className="text-gray-700 font-medium">Quantity:</span>
            <div className="flex items-center border border-gray-300 rounded-lg">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="p-3 hover:bg-gray-100 transition-colors"
              >
                <Minus size={18} />
              </button>
              <span className="w-12 text-center font-medium">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="p-3 hover:bg-gray-100 transition-colors"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 mb-8">
            <Button
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-6 text-lg"
            >
              <ShoppingCart size={20} className="mr-2" />
              Add to Cart
            </Button>
            <Button variant="outline" className="p-4 border-gray-300">
              <Heart size={22} />
            </Button>
            <Button variant="outline" className="p-4 border-gray-300">
              <Share2 size={22} />
            </Button>
          </div>

          {/* Features */}
          <div className="border-t border-gray-200 pt-6 space-y-4">
            <div className="flex items-center gap-3">
              <Truck size={20} className="text-orange-500" />
              <span className="text-gray-600">Free shipping on orders over $50</span>
            </div>
            <div className="flex items-center gap-3">
              <Shield size={20} className="text-orange-500" />
              <span className="text-gray-600">1 year warranty included</span>
            </div>
            <div className="flex items-center gap-3">
              <RotateCcw size={20} className="text-orange-500" />
              <span className="text-gray-600">30-day money back guarantee</span>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="py-8 border-t border-gray-200">
          <ProductCarousel
            title="YOU MAY ALSO LIKE"
            products={relatedProducts}
            showViewAll={false}
            onAddToCart={addToCart}
          />
        </section>
      )}
    </div>
  );
};

export default ProductDetail;
