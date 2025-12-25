import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import { ArrowLeft, Star, Minus, Plus, Heart, Share2, Truck, Shield, RotateCcw, ShoppingCart, MapPin, Loader2, MessageSquare, ThumbsUp, Camera, X, User, Check } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
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

  // Shipping calculator state
  const [shippingPostcode, setShippingPostcode] = useState('');
  const [shippingSuburb, setShippingSuburb] = useState('');
  const [suburbs, setSuburbs] = useState([]);
  const [loadingSuburbs, setLoadingSuburbs] = useState(false);
  const [shippingOptions, setShippingOptions] = useState([]);
  const [calculatingShipping, setCalculatingShipping] = useState(false);
  const [shippingCalculated, setShippingCalculated] = useState(false);

  // Reviews state
  const [reviewsData, setReviewsData] = useState({ reviews: [], count: 0, average_rating: 0, rating_distribution: {} });
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    customer_name: '',
    customer_email: '',
    rating: 5,
    title: '',
    content: '',
    images: []
  });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [reviewFilter, setReviewFilter] = useState('all');
  const [expandedReview, setExpandedReview] = useState(null);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  // Fetch suburbs when postcode changes
  useEffect(() => {
    const fetchSuburbs = async () => {
      if (shippingPostcode.length >= 4) {
        setLoadingSuburbs(true);
        try {
          const response = await axios.get(`${API}/shipping/suburbs?postcode=${shippingPostcode}`);
          setSuburbs(response.data.suburbs || []);
          if (response.data.suburbs?.length === 1) {
            setShippingSuburb(response.data.suburbs[0].suburb);
          } else {
            setShippingSuburb('');
          }
          setShippingCalculated(false);
        } catch (error) {
          console.error('Error fetching suburbs:', error);
          setSuburbs([]);
        } finally {
          setLoadingSuburbs(false);
        }
      } else {
        setSuburbs([]);
        setShippingSuburb('');
        setShippingCalculated(false);
      }
    };
    
    const debounceTimer = setTimeout(fetchSuburbs, 300);
    return () => clearTimeout(debounceTimer);
  }, [shippingPostcode]);

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
      
      // Fetch reviews
      fetchReviews();
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await axios.get(`${API}/reviews/product/${id}`);
      setReviewsData(response.data);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  // Review image upload
  const onDropReviewImages = useCallback(async (acceptedFiles) => {
    setUploadingImages(true);
    const newImages = [];
    
    for (const file of acceptedFiles) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const response = await axios.post(`${API}/reviews/upload-image`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        // Prepend BACKEND_URL if the URL is relative
        const imageUrl = response.data.url.startsWith('http') 
          ? response.data.url 
          : `${BACKEND_URL}${response.data.url}`;
        newImages.push(imageUrl);
      } catch (error) {
        console.error('Error uploading image:', error);
        alert('Failed to upload image. Please try again.');
      }
    }
    
    setReviewForm(prev => ({ ...prev, images: [...prev.images, ...newImages] }));
    setUploadingImages(false);
  }, []);

  const { getRootProps: getReviewDropProps, getInputProps: getReviewInputProps, isDragActive: isReviewDragActive } = useDropzone({
    onDrop: onDropReviewImages,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 5
  });

  const removeReviewImage = (index) => {
    setReviewForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setSubmittingReview(true);
    
    try {
      await axios.post(`${API}/reviews`, {
        product_id: id,
        ...reviewForm,
        status: 'pending'
      });
      setReviewSubmitted(true);
      setShowReviewForm(false);
      setReviewForm({
        customer_name: '',
        customer_email: '',
        rating: 5,
        title: '',
        content: '',
        images: []
      });
      fetchReviews();
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const markReviewHelpful = async (reviewId) => {
    try {
      await axios.post(`${API}/reviews/${reviewId}/helpful`);
      fetchReviews();
    } catch (error) {
      console.error('Error marking helpful:', error);
    }
  };

  const renderStars = (rating, size = 16, interactive = false, onChange = null) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={`${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} ${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
          onClick={interactive && onChange ? () => onChange(star) : undefined}
        />
      ))}
    </div>
  );

  const filteredReviews = reviewsData.reviews.filter(r => {
    if (reviewFilter === 'all') return true;
    return r.rating === parseInt(reviewFilter);
  });

  const calculateShipping = async () => {
    if (!shippingPostcode || !product) return;
    
    setCalculatingShipping(true);
    try {
      const itemData = {
        weight: product.weight || 0.5,
        quantity: quantity
      };
      
      // Add shipping dimensions if available
      if (product.shipping_length && product.shipping_width && product.shipping_height) {
        itemData.shipping_length = product.shipping_length;
        itemData.shipping_width = product.shipping_width;
        itemData.shipping_height = product.shipping_height;
      } else if (product.length && product.width && product.height) {
        itemData.shipping_length = product.length;
        itemData.shipping_width = product.width;
        itemData.shipping_height = product.height;
      }

      const response = await axios.post(`${API}/shipping/calculate`, {
        postcode: shippingPostcode,
        suburb: shippingSuburb || null,
        country: 'AU',
        items: [itemData],
        cart_total: product.price * quantity
      });
      
      setShippingOptions(response.data.options || []);
      setShippingCalculated(true);
    } catch (error) {
      console.error('Error calculating shipping:', error);
      setShippingOptions([]);
    } finally {
      setCalculatingShipping(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
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

          {/* Shipping Calculator */}
          <div className="border border-gray-200 rounded-lg p-4 mb-6 bg-gray-50">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Truck size={18} className="text-orange-500" />
              Calculate Shipping
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-gray-600 text-sm">Postcode</Label>
                <Input
                  placeholder="e.g., 2000"
                  value={shippingPostcode}
                  onChange={(e) => setShippingPostcode(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-600 text-sm flex items-center gap-1">
                  Suburb
                  {loadingSuburbs && <Loader2 className="w-3 h-3 animate-spin" />}
                </Label>
                <Select 
                  value={shippingSuburb} 
                  onValueChange={setShippingSuburb}
                  disabled={suburbs.length === 0}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={suburbs.length === 0 ? "Enter postcode" : "Select suburb"} />
                  </SelectTrigger>
                  <SelectContent>
                    {suburbs.map((s, idx) => (
                      <SelectItem key={idx} value={s.suburb}>
                        {s.suburb} ({s.state})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={calculateShipping}
                  disabled={!shippingPostcode || calculatingShipping}
                  className="w-full bg-gray-800 hover:bg-gray-900 text-white"
                >
                  {calculatingShipping ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Calculate'
                  )}
                </Button>
              </div>
            </div>

            {/* Shipping Results */}
            {shippingCalculated && shippingOptions.length > 0 && (
              <div className="mt-4 space-y-2">
                {shippingOptions.map((option, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                    <div>
                      <p className="font-medium text-gray-900">{option.name}</p>
                      <p className="text-sm text-gray-500">{option.description}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${option.price === 0 ? 'text-green-600' : 'text-gray-900'}`}>
                        {option.price === 0 ? 'FREE' : formatCurrency(option.price)}
                      </p>
                      {option.price > 0 && option.gst_amount > 0 && (
                        <p className="text-xs text-gray-500">
                          {option.tax_inclusive ? `incl. GST ${formatCurrency(option.gst_amount)}` : `+ GST`}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {shippingCalculated && shippingOptions.length === 0 && (
              <p className="mt-4 text-sm text-gray-500">No shipping options available for this location.</p>
            )}
          </div>

          {/* Features */}
          <div className="border-t border-gray-200 pt-6 space-y-4">
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

      {/* Reviews Section */}
      <section className="py-8 border-t border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Customer Reviews</h2>
            <div className="flex items-center gap-3 mt-2">
              {renderStars(Math.round(reviewsData.average_rating), 20)}
              <span className="text-lg font-semibold">{reviewsData.average_rating}</span>
              <span className="text-gray-500">({reviewsData.count} reviews)</span>
            </div>
          </div>
          <Button 
            onClick={() => setShowReviewForm(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Write a Review
          </Button>
        </div>

        {/* Rating Breakdown */}
        {reviewsData.count > 0 && (
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Rating Breakdown</h3>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map(rating => {
                const count = reviewsData.rating_distribution?.[rating] || 0;
                const percentage = reviewsData.count > 0 ? (count / reviewsData.count) * 100 : 0;
                return (
                  <div key={rating} className="flex items-center gap-3">
                    <button
                      onClick={() => setReviewFilter(reviewFilter === String(rating) ? 'all' : String(rating))}
                      className={`flex items-center gap-1 w-14 text-sm ${reviewFilter === String(rating) ? 'text-orange-600 font-medium' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                      {rating} <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    </button>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-yellow-400 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-500 w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
            {reviewFilter !== 'all' && (
              <button
                onClick={() => setReviewFilter('all')}
                className="text-sm text-orange-600 hover:underline mt-2"
              >
                Show all reviews
              </button>
            )}
          </div>
        )}

        {/* Review Success Message */}
        {reviewSubmitted && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <Check className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium text-green-800">Thank you for your review!</p>
              <p className="text-sm text-green-600">Your review has been submitted and is pending approval.</p>
            </div>
          </div>
        )}

        {/* Review Form */}
        {showReviewForm && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Write Your Review</h3>
              <button onClick={() => setShowReviewForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmitReview} className="space-y-4">
              {/* Rating */}
              <div>
                <Label>Your Rating *</Label>
                <div className="mt-2">
                  {renderStars(reviewForm.rating, 28, true, (rating) => setReviewForm(prev => ({ ...prev, rating })))}
                </div>
              </div>

              {/* Name & Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Your Name *</Label>
                  <Input
                    value={reviewForm.customer_name}
                    onChange={(e) => setReviewForm(prev => ({ ...prev, customer_name: e.target.value }))}
                    placeholder="John Doe"
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={reviewForm.customer_email}
                    onChange={(e) => setReviewForm(prev => ({ ...prev, customer_email: e.target.value }))}
                    placeholder="john@example.com"
                    required
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Title */}
              <div>
                <Label>Review Title *</Label>
                <Input
                  value={reviewForm.title}
                  onChange={(e) => setReviewForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Summarize your experience"
                  required
                  className="mt-1"
                />
              </div>

              {/* Content */}
              <div>
                <Label>Your Review *</Label>
                <Textarea
                  value={reviewForm.content}
                  onChange={(e) => setReviewForm(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Share your experience with this product..."
                  rows={4}
                  required
                  className="mt-1"
                />
              </div>

              {/* Image Upload */}
              <div>
                <Label>Add Photos (optional)</Label>
                <div
                  {...getReviewDropProps()}
                  className={`mt-2 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                    isReviewDragActive ? 'border-orange-500 bg-orange-50' : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input {...getReviewInputProps()} />
                  {uploadingImages ? (
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                  ) : (
                    <>
                      <Camera className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">Drag photos here or click to upload</p>
                      <p className="text-xs text-gray-400 mt-1">Up to 5 images</p>
                    </>
                  )}
                </div>
                {reviewForm.images.length > 0 && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {reviewForm.images.map((img, idx) => (
                      <div key={idx} className="relative group">
                        <img src={img} alt="" className="w-20 h-20 object-cover rounded-lg" />
                        <button
                          type="button"
                          onClick={() => removeReviewImage(idx)}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowReviewForm(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={submittingReview}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {submittingReview && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Submit Review
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Reviews List */}
        {filteredReviews.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No reviews yet. Be the first to review this product!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredReviews.map((review) => (
              <div key={review.id} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      {renderStars(review.rating)}
                      {review.verified_purchase && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3" /> Verified Purchase
                        </span>
                      )}
                    </div>
                    <h4 className="font-semibold text-gray-900">{review.title}</h4>
                  </div>
                  <span className="text-sm text-gray-400">
                    {new Date(review.created_at).toLocaleDateString('en-AU', {
                      year: 'numeric', month: 'short', day: 'numeric'
                    })}
                  </span>
                </div>

                <p className="text-gray-600 mt-3 whitespace-pre-wrap">
                  {expandedReview === review.id ? review.content : review.content.slice(0, 300)}
                  {review.content.length > 300 && expandedReview !== review.id && (
                    <button 
                      onClick={() => setExpandedReview(review.id)}
                      className="text-orange-600 hover:underline ml-1"
                    >
                      Read more
                    </button>
                  )}
                </p>

                {/* Review Images */}
                {review.images?.length > 0 && (
                  <div className="flex gap-2 mt-4 flex-wrap">
                    {review.images.map((img, idx) => (
                      <a 
                        key={idx}
                        href={img}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-20 h-20 rounded-lg overflow-hidden border border-gray-200 hover:border-gray-400 transition-colors"
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                )}

                {/* Admin Reply */}
                {review.admin_reply && (
                  <div className="mt-4 ml-4 pl-4 border-l-2 border-orange-200 bg-orange-50 p-3 rounded-r-lg">
                    <p className="text-sm font-medium text-orange-800 mb-1">Store Response</p>
                    <p className="text-sm text-orange-700">{review.admin_reply}</p>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <User className="w-4 h-4" />
                    {review.customer_name}
                  </div>
                  <button
                    onClick={() => markReviewHelpful(review.id)}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-orange-600 transition-colors ml-auto"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    Helpful ({review.helpful_votes || 0})
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default ProductDetail;
