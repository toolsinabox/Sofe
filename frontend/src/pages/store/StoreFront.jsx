import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Truck, Shield, RotateCcw, Star, ChevronRight } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { products, categories } from '../../data/mock';
import { useCart } from './StoreLayout';

const StoreFront = () => {
  const { addToCart } = useCart();

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const featuredProducts = products.slice(0, 4);
  const saleProducts = products.filter(p => p.comparePrice);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1920')] bg-cover bg-center" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 py-20 md:py-32">
          <div className="max-w-2xl">
            <span className="inline-block px-4 py-1.5 bg-emerald-500/20 text-emerald-400 text-sm font-medium rounded-full mb-6">
              New Collection 2025
            </span>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Discover Your <span className="text-emerald-400">Perfect Style</span>
            </h1>
            <p className="text-lg text-gray-300 mb-8">
              Shop the latest trends in fashion and lifestyle. Premium quality products at unbeatable prices.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/store/products">
                <Button className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-6 text-lg">
                  Shop Now <ArrowRight className="ml-2" size={20} />
                </Button>
              </Link>
              <Link to="/store/new-arrivals">
                <Button variant="outline" className="border-white text-white hover:bg-white hover:text-gray-900 px-8 py-6 text-lg">
                  New Arrivals
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-6">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-4 p-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                <Truck className="text-emerald-600" size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Free Shipping</h3>
                <p className="text-gray-500 text-sm">On orders over $50</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                <Shield className="text-emerald-600" size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Secure Payment</h3>
                <p className="text-gray-500 text-sm">100% secure checkout</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                <RotateCcw className="text-emerald-600" size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Easy Returns</h3>
                <p className="text-gray-500 text-sm">30-day return policy</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Shop by Category</h2>
            <Link to="/store/products" className="text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
              View All <ChevronRight size={18} />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/store/category/${category.id}`}
                className="group p-6 bg-gray-50 rounded-2xl hover:bg-emerald-50 transition-all duration-300 text-center"
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-white rounded-xl shadow-sm flex items-center justify-center group-hover:shadow-md group-hover:scale-110 transition-all duration-300">
                  <span className="text-2xl">📦</span>
                </div>
                <h3 className="font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">
                  {category.name}
                </h3>
                <p className="text-gray-500 text-sm mt-1">{category.count} items</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Featured Products</h2>
            <Link to="/store/products" className="text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
              View All <ChevronRight size={18} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <div key={product.id} className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300">
                <div className="relative aspect-square overflow-hidden bg-gray-100">
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  {product.comparePrice && (
                    <span className="absolute top-3 left-3 px-2 py-1 bg-red-500 text-white text-xs font-medium rounded">
                      Sale
                    </span>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                  <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Button 
                      className="w-full bg-white text-gray-900 hover:bg-emerald-500 hover:text-white"
                      onClick={() => addToCart(product)}
                    >
                      Add to Cart
                    </Button>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        className={i < Math.floor(product.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                      />
                    ))}
                    <span className="text-gray-500 text-sm ml-1">({product.reviews})</span>
                  </div>
                  <Link to={`/store/product/${product.id}`}>
                    <h3 className="font-semibold text-gray-900 hover:text-emerald-600 transition-colors line-clamp-2">
                      {product.name}
                    </h3>
                  </Link>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-lg font-bold text-emerald-600">{formatCurrency(product.price)}</span>
                    {product.comparePrice && (
                      <span className="text-gray-400 text-sm line-through">{formatCurrency(product.comparePrice)}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sale Banner */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="relative bg-gradient-to-r from-red-500 to-orange-500 rounded-3xl overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1607082349566-187342175e2f?w=1920')] bg-cover bg-center" />
            </div>
            <div className="relative px-8 py-16 md:py-20 text-center">
              <span className="inline-block px-4 py-1.5 bg-white/20 text-white text-sm font-medium rounded-full mb-4">
                Limited Time Offer
              </span>
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Summer Sale Up to 50% Off</h2>
              <p className="text-white/80 text-lg mb-8 max-w-2xl mx-auto">
                Don't miss out on our biggest sale of the season. Shop now and save big on your favorite items.
              </p>
              <Link to="/store/sale">
                <Button className="bg-white text-red-500 hover:bg-gray-100 px-8 py-6 text-lg font-semibold">
                  Shop Sale <ArrowRight className="ml-2" size={20} />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* On Sale Products */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">On Sale Now</h2>
            <Link to="/store/sale" className="text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
              View All <ChevronRight size={18} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {saleProducts.map((product) => (
              <div key={product.id} className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300">
                <div className="relative aspect-square overflow-hidden bg-gray-100">
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 px-2 py-1 bg-red-500 text-white text-xs font-medium rounded">
                    -{Math.round((1 - product.price / product.comparePrice) * 100)}%
                  </span>
                  <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Button 
                      className="w-full bg-white text-gray-900 hover:bg-emerald-500 hover:text-white"
                      onClick={() => addToCart(product)}
                    >
                      Add to Cart
                    </Button>
                  </div>
                </div>
                <div className="p-4">
                  <Link to={`/store/product/${product.id}`}>
                    <h3 className="font-semibold text-gray-900 hover:text-emerald-600 transition-colors line-clamp-2">
                      {product.name}
                    </h3>
                  </Link>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-lg font-bold text-red-500">{formatCurrency(product.price)}</span>
                    <span className="text-gray-400 text-sm line-through">{formatCurrency(product.comparePrice)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default StoreFront;
