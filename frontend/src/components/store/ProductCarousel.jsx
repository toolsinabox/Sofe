import React, { useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Star, ShoppingCart } from 'lucide-react';
import { Button } from '../ui/button';

const ProductCarousel = ({ title, products = [], showViewAll = true, viewAllLink = '/store/products', onAddToCart }) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: 'start',
    slidesToScroll: 1,
    breakpoints: {
      '(min-width: 768px)': { slidesToScroll: 2 },
      '(min-width: 1024px)': { slidesToScroll: 3 },
    }
  });

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  if (products.length === 0) return null;

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{title}</h2>
        <div className="flex items-center gap-3">
          {showViewAll && (
            <Link to={viewAllLink} className="text-orange-500 hover:text-orange-600 font-semibold text-sm hidden md:block">
              VIEW ALL
            </Link>
          )}
          <div className="flex gap-2">
            <button
              onClick={scrollPrev}
              className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-orange-500 hover:text-orange-500 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={scrollNext}
              className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-orange-500 hover:text-orange-500 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Carousel */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-4">
          {products.map((product) => (
            <div
              key={product.id}
              className="flex-[0_0_calc(50%-8px)] md:flex-[0_0_calc(33.333%-11px)] lg:flex-[0_0_calc(25%-12px)] min-w-0"
            >
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden group hover:shadow-xl transition-all duration-300">
                {/* Image */}
                <div className="relative aspect-square overflow-hidden bg-gray-100">
                  <Link to={`/store/product/${product.id}`}>
                    <img
                      src={product.images?.[0] || 'https://via.placeholder.com/400'}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </Link>
                  {product.compare_price && product.compare_price > product.price && (
                    <span className="absolute top-3 left-3 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">
                      ON SALE
                    </span>
                  )}
                  {product.stock > 0 && product.stock <= 10 && (
                    <span className="absolute top-3 right-3 px-2 py-1 bg-orange-500 text-white text-xs font-bold rounded">
                      LOW STOCK
                    </span>
                  )}
                  {product.stock === 0 && (
                    <span className="absolute top-3 right-3 px-2 py-1 bg-gray-500 text-white text-xs font-bold rounded">
                      OUT OF STOCK
                    </span>
                  )}
                  {/* Quick Add Button */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      onClick={() => onAddToCart && onAddToCart(product)}
                      disabled={product.stock === 0}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white text-sm"
                    >
                      <ShoppingCart size={16} className="mr-2" />
                      Add to Cart
                    </Button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  {/* Dimensions/SKU */}
                  <p className="text-xs text-gray-500 mb-1">{product.sku}</p>
                  
                  {/* Title */}
                  <Link to={`/store/product/${product.id}`}>
                    <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 hover:text-orange-500 transition-colors mb-2">
                      {product.name}
                    </h3>
                  </Link>

                  {/* Price */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold text-gray-900">
                      {formatCurrency(product.price)}
                    </span>
                    {product.compare_price && product.compare_price > product.price && (
                      <span className="text-sm text-gray-400 line-through">
                        RRP {formatCurrency(product.compare_price)}
                      </span>
                    )}
                  </div>

                  {/* Stock Status */}
                  {product.stock > 0 ? (
                    <div className="flex items-center gap-1 mt-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      <span className="text-xs text-green-600 font-medium">IN STOCK</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 mt-2">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      <span className="text-xs text-red-600 font-medium">OUT OF STOCK</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductCarousel;
