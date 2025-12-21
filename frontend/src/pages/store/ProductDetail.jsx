import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Star, Minus, Plus, Heart, Share2, Truck, Shield, RotateCcw } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { products } from '../../data/mock';
import { useCart } from './StoreLayout';

const ProductDetail = () => {
  const { id } = useParams();
  const { addToCart } = useCart();
  const [quantity, setQuantity] = React.useState(1);
  const [selectedImage, setSelectedImage] = React.useState(0);

  const product = products.find(p => p.id === id) || products[0];

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const handleAddToCart = () => {
    addToCart(product, quantity);
  };

  const relatedProducts = products.filter(p => p.category === product.category && p.id !== product.id).slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-8">
        <Link to="/store" className="hover:text-emerald-600">Home</Link>
        <span>/</span>
        <Link to="/store/products" className="hover:text-emerald-600">Products</Link>
        <span>/</span>
        <span className="text-gray-900">{product.name}</span>
      </div>

      {/* Product Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
        {/* Images */}
        <div className="space-y-4">
          <div className="aspect-square bg-gray-100 rounded-2xl overflow-hidden">
            <img
              src={product.images[selectedImage]}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-4">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                    selectedImage === index ? 'border-emerald-500' : 'border-transparent'
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
          <div className="mb-4">
            <span className="text-sm text-emerald-600 font-medium">{product.category}</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.name}</h1>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={18}
                  className={i < Math.floor(product.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                />
              ))}
            </div>
            <span className="text-gray-500">{product.rating} ({product.reviews} reviews)</span>
          </div>

          <div className="flex items-baseline gap-3 mb-6">
            <span className="text-3xl font-bold text-emerald-600">{formatCurrency(product.price)}</span>
            {product.comparePrice && (
              <>
                <span className="text-xl text-gray-400 line-through">{formatCurrency(product.comparePrice)}</span>
                <span className="px-2 py-1 bg-red-100 text-red-600 text-sm font-medium rounded">
                  Save {Math.round((1 - product.price / product.comparePrice) * 100)}%
                </span>
              </>
            )}
          </div>

          <p className="text-gray-600 mb-8 leading-relaxed">{product.description}</p>

          {/* Stock Status */}
          <div className="mb-6">
            {product.stock > 0 ? (
              <span className="text-emerald-600 font-medium">✓ In Stock ({product.stock} available)</span>
            ) : (
              <span className="text-red-500 font-medium">Out of Stock</span>
            )}
          </div>

          {/* Quantity */}
          <div className="flex items-center gap-4 mb-6">
            <span className="text-gray-700 font-medium">Quantity:</span>
            <div className="flex items-center border border-gray-200 rounded-lg">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="p-3 hover:bg-gray-50 transition-colors"
              >
                <Minus size={18} />
              </button>
              <span className="w-12 text-center font-medium">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="p-3 hover:bg-gray-50 transition-colors"
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
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-6 text-lg"
            >
              Add to Cart
            </Button>
            <Button variant="outline" className="p-4 border-gray-200">
              <Heart size={22} />
            </Button>
            <Button variant="outline" className="p-4 border-gray-200">
              <Share2 size={22} />
            </Button>
          </div>

          {/* Features */}
          <div className="border-t border-gray-100 pt-6 space-y-4">
            <div className="flex items-center gap-3">
              <Truck size={20} className="text-emerald-600" />
              <span className="text-gray-600">Free shipping on orders over $50</span>
            </div>
            <div className="flex items-center gap-3">
              <Shield size={20} className="text-emerald-600" />
              <span className="text-gray-600">1 year warranty</span>
            </div>
            <div className="flex items-center gap-3">
              <RotateCcw size={20} className="text-emerald-600" />
              <span className="text-gray-600">30-day return policy</span>
            </div>
          </div>

          {/* SKU */}
          <div className="mt-6 text-sm text-gray-500">
            SKU: {product.sku}
          </div>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-8">You May Also Like</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((product) => (
              <Link key={product.id} to={`/store/product/${product.id}`} className="group">
                <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300">
                  <div className="relative aspect-square overflow-hidden bg-gray-100">
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors line-clamp-2">
                      {product.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-lg font-bold text-emerald-600">{formatCurrency(product.price)}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ProductDetail;
