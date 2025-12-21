import React, { useState, useEffect, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const HeroCarousel = ({ banners = [] }) => {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true },
    [Autoplay({ delay: 5000, stopOnInteraction: false })]
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [deviceType, setDeviceType] = useState('desktop');

  // Detect device type based on screen width
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setDeviceType('mobile');
      } else if (width < 1024) {
        setDeviceType('tablet');
      } else {
        setDeviceType('desktop');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
  }, [emblaApi, onSelect]);

  // Filter banners based on device visibility
  const filterBannersForDevice = (bannerList) => {
    return bannerList.filter(banner => {
      if (deviceType === 'mobile' && banner.show_on_mobile === false) return false;
      if (deviceType === 'tablet' && banner.show_on_tablet === false) return false;
      if (deviceType === 'desktop' && banner.show_on_desktop === false) return false;
      return true;
    });
  };

  // Get the appropriate image for the current device
  const getBannerImage = (banner) => {
    if (deviceType === 'mobile' && banner.image_mobile) {
      return banner.image_mobile;
    }
    if (deviceType === 'tablet' && banner.image_tablet) {
      return banner.image_tablet;
    }
    if (deviceType === 'desktop' && banner.image_desktop) {
      return banner.image_desktop;
    }
    return banner.image_desktop || banner.image_tablet || banner.image_mobile || banner.image;
  };

  // Get button style classes
  const getButtonClasses = (style) => {
    switch (style) {
      case 'secondary':
        return 'bg-white text-gray-900 hover:bg-gray-100';
      case 'outline':
        return 'bg-transparent border-2 border-white text-white hover:bg-white/10';
      default: // primary
        return 'bg-orange-500 text-white hover:bg-orange-600';
    }
  };

  // Get text alignment classes
  const getTextAlignClasses = (position) => {
    switch (position) {
      case 'center':
        return 'text-center items-center mx-auto';
      case 'right':
        return 'text-right items-end ml-auto';
      default: // left
        return 'text-left items-start';
    }
  };

  // Default banners if none provided
  const defaultBanners = [
    {
      id: '1',
      name: 'New Collection Banner',
      title: 'New Collection 2025',
      subtitle: 'Discover the latest trends in fashion',
      image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1920',
      show_on_desktop: true,
      show_on_tablet: true,
      show_on_mobile: true,
      show_title: true,
      show_subtitle: true,
      show_button: true,
      button_text: 'Shop Now',
      button_style: 'primary',
      link: '/store/products',
      overlay_enabled: true,
      overlay_color: 'rgba(0,0,0,0.3)',
      text_color: '#FFFFFF',
      text_position: 'left'
    }
  ];

  const displayBanners = filterBannersForDevice(banners.length > 0 ? banners : defaultBanners);

  if (displayBanners.length === 0) {
    return null;
  }

  return (
    <div className="relative group">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {displayBanners.map((banner) => {
            const hasContent = (banner.show_title !== false && banner.title) || 
                             (banner.show_subtitle !== false && banner.subtitle) || 
                             (banner.show_button && banner.button_text);
            
            return (
              <div
                key={banner.id}
                className="flex-[0_0_100%] min-w-0 relative"
              >
                <div className="relative h-[300px] md:h-[450px] lg:h-[500px]">
                  {/* Responsive image with srcset */}
                  <picture>
                    {banner.image_mobile && (
                      <source media="(max-width: 639px)" srcSet={banner.image_mobile} />
                    )}
                    {banner.image_tablet && (
                      <source media="(max-width: 1023px)" srcSet={banner.image_tablet} />
                    )}
                    <img
                      src={getBannerImage(banner)}
                      alt={banner.name || banner.title || 'Banner'}
                      className="w-full h-full object-cover"
                    />
                  </picture>
                  
                  {/* Overlay */}
                  {banner.overlay_enabled !== false && (
                    <div 
                      className="absolute inset-0"
                      style={{ backgroundColor: banner.overlay_color || 'rgba(0,0,0,0.3)' }}
                    />
                  )}
                  
                  {/* Content (only if there's something to show) */}
                  {hasContent && (
                    <div className="absolute inset-0 flex items-center">
                      <div className="max-w-7xl mx-auto px-4 w-full">
                        <div className={`max-w-xl flex flex-col ${getTextAlignClasses(banner.text_position)}`}>
                          {banner.show_title !== false && banner.title && (
                            <h2 
                              className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight"
                              style={{ color: banner.text_color || '#FFFFFF' }}
                            >
                              {banner.title}
                            </h2>
                          )}
                          {banner.show_subtitle !== false && banner.subtitle && (
                            <p 
                              className="text-lg md:text-xl mb-6 opacity-90"
                              style={{ color: banner.text_color || '#FFFFFF' }}
                            >
                              {banner.subtitle}
                            </p>
                          )}
                          {banner.show_button && banner.button_text && banner.link && (
                            <a
                              href={banner.link}
                              className={`inline-block px-8 py-3 font-semibold rounded-lg transition-colors ${getButtonClasses(banner.button_style)}`}
                            >
                              {banner.button_text}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Clickable area for image-only banners */}
                  {!hasContent && banner.link && (
                    <a href={banner.link} className="absolute inset-0" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation Arrows */}
      {displayBanners.length > 1 && (
        <>
          <button
            onClick={scrollPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={scrollNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}

      {/* Dots */}
      {displayBanners.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
          {displayBanners.map((_, index) => (
            <button
              key={index}
              onClick={() => emblaApi && emblaApi.scrollTo(index)}
              className={`w-3 h-3 rounded-full transition-colors ${
                index === selectedIndex ? 'bg-orange-500' : 'bg-white/50 hover:bg-white/80'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HeroCarousel;
