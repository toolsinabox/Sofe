// Tools In A Box Theme JavaScript
// Shopping Cart with Backend Integration, Mini Cart, and Modal

const API_BASE = window.location.origin + '/api';

// ================================
// BANNER CAROUSEL
// ================================
let currentSlide = 0;
let visibleSlides = [];
let autoSlideInterval = null;

function getDeviceType() {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
}

function getVisibleSlides() {
    const device = getDeviceType();
    const allSlides = document.querySelectorAll('#heroSlides .hero-slide');
    const visible = [];
    
    allSlides.forEach((slide, index) => {
        const showDesktop = slide.dataset.showDesktop !== 'n';
        const showTablet = slide.dataset.showTablet !== 'n';
        const showMobile = slide.dataset.showMobile !== 'n';
        
        let shouldShow = true;
        if (device === 'mobile' && !showMobile) shouldShow = false;
        if (device === 'tablet' && !showTablet) shouldShow = false;
        if (device === 'desktop' && !showDesktop) shouldShow = false;
        
        // Mark slide visibility with inline style
        if (shouldShow) {
            slide.style.display = 'block';
            slide.style.order = visible.length; // Reorder in flex
            visible.push({ element: slide, index: visible.length });
        } else {
            slide.style.display = 'none';
        }
    });
    
    return visible;
}

function initCarousel() {
    const slidesContainer = document.getElementById('heroSlides');
    const dotsContainer = document.getElementById('carouselDots');
    
    if (!slidesContainer) return;
    
    // Get visible slides based on device (this also reorders them)
    visibleSlides = getVisibleSlides();
    
    // If no visible slides, show a placeholder or hide carousel
    if (visibleSlides.length === 0) {
        document.querySelector('.hero-section').style.display = 'none';
        return;
    } else {
        document.querySelector('.hero-section').style.display = 'block';
    }
    
    if (visibleSlides.length <= 1) {
        // Hide navigation if only one slide
        document.querySelectorAll('.carousel-nav, .carousel-dots').forEach(el => {
            el.style.display = 'none';
        });
        if (visibleSlides.length === 1) {
            goToSlide(0);
        }
        return;
    }
    
    // Show navigation
    document.querySelectorAll('.carousel-nav').forEach(el => {
        el.style.display = 'flex';
    });
    
    // Create dots for visible slides only
    if (dotsContainer) {
        dotsContainer.innerHTML = '';
        dotsContainer.style.display = 'flex';
        for (let i = 0; i < visibleSlides.length; i++) {
            const dot = document.createElement('button');
            dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
            dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
            dot.onclick = () => goToSlide(i);
            dotsContainer.appendChild(dot);
        }
    }
    
    // Start at first visible slide
    currentSlide = 0;
    goToSlide(0);
    
    // Start auto-slide
    startAutoSlide();
    
    // Pause on hover
    const carousel = document.querySelector('.hero-carousel');
    if (carousel) {
        carousel.addEventListener('mouseenter', stopAutoSlide);
        carousel.addEventListener('mouseleave', startAutoSlide);
    }
}

function goToSlide(visibleIndex) {
    const slidesContainer = document.getElementById('heroSlides');
    const dots = document.querySelectorAll('.carousel-dot');
    
    if (!slidesContainer || visibleSlides.length === 0) return;
    
    // Wrap around
    if (visibleIndex >= visibleSlides.length) visibleIndex = 0;
    if (visibleIndex < 0) visibleIndex = visibleSlides.length - 1;
    
    currentSlide = visibleIndex;
    
    // Transform based on visible slide index (not original DOM index)
    slidesContainer.style.transform = `translateX(-${currentSlide * 100}%)`;
    
    // Update dots
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === currentSlide);
    });
}
    
    if (!slidesContainer || visibleSlides.length === 0) return;
    
    // Wrap around
    if (visibleIndex >= visibleSlides.length) visibleIndex = 0;
    if (visibleIndex < 0) visibleIndex = visibleSlides.length - 1;
    
    currentSlide = visibleIndex;
    
    // Get the actual index in the DOM
    const actualIndex = visibleSlides[visibleIndex].index;
    
    // Transform to show the correct slide
    slidesContainer.style.transform = `translateX(-${actualIndex * 100}%)`;
    
    // Update dots
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === currentSlide);
    });
}

function changeSlide(direction) {
    goToSlide(currentSlide + direction);
    // Reset auto-slide timer when manually changing
    stopAutoSlide();
    startAutoSlide();
}

function startAutoSlide() {
    if (autoSlideInterval) clearInterval(autoSlideInterval);
    if (visibleSlides.length <= 1) return;
    
    autoSlideInterval = setInterval(() => {
        goToSlide(currentSlide + 1);
    }, 5000); // Change slide every 5 seconds
}

function stopAutoSlide() {
    if (autoSlideInterval) {
        clearInterval(autoSlideInterval);
        autoSlideInterval = null;
    }
}

// Re-initialize carousel on window resize (device type might change)
let resizeTimeout;
window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function() {
        stopAutoSlide();
        initCarousel();
    }, 250);
});

document.addEventListener('DOMContentLoaded', function() {
    console.log('Theme loaded: Tools In A Box');
    
    // Initialize carousel
    initCarousel();
    
    // Initialize cart
    initCart();
    
    // Initialize quantity buttons on product pages
    initQuantityButtons();
});

// Get or create cart ID (stored in localStorage for session persistence)
function getCartId() {
    let cartId = localStorage.getItem('tiab_cart_id');
    if (!cartId) {
        cartId = 'cart_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('tiab_cart_id', cartId);
    }
    return cartId;
}

// Cart state - synced with backend
let tiabCart = { items: [], subtotal: 0, total: 0, item_count: 0 };

// Initialize cart - fetch from backend
async function initCart() {
    try {
        const cartId = getCartId();
        const response = await fetch(`${API_BASE}/cart/${cartId}`);
        if (response.ok) {
            tiabCart = await response.json();
            updateCartUI();
        }
    } catch (error) {
        console.error('Error initializing cart:', error);
        // Fallback to localStorage if backend fails
        tiabCart = JSON.parse(localStorage.getItem('tiab_cart_backup')) || { items: [], subtotal: 0, total: 0, item_count: 0 };
        updateCartUI();
    }
}

// Add to Cart Function - called via onclick
async function addToCart(button) {
    const productId = button.dataset.productId;
    const productName = button.dataset.productName;
    const productPrice = button.dataset.productPrice;
    const productImage = button.dataset.productImage;
    
    if (!productId) {
        console.error('No product ID provided');
        return;
    }
    
    // Show loading state
    const originalText = button.textContent;
    button.textContent = 'Adding...';
    button.disabled = true;
    
    try {
        const cartId = getCartId();
        const response = await fetch(`${API_BASE}/cart/${cartId}/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                product_id: productId,
                quantity: 1
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            tiabCart = data.cart;
            
            // Backup to localStorage
            localStorage.setItem('tiab_cart_backup', JSON.stringify(tiabCart));
            
            // Update UI
            updateCartUI();
            
            // Show modal with added item info
            const addedItem = data.added_item;
            showCartModal(
                addedItem.name || productName,
                '$' + (addedItem.price || 0).toFixed(2),
                addedItem.image || productImage
            );
            
            // Success feedback
            button.textContent = 'Added!';
            button.style.backgroundColor = '#22c55e';
        } else {
            throw new Error('Failed to add to cart');
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        
        // Fallback to local cart
        addToCartLocal(productId, productName, productPrice, productImage);
        showCartModal(productName, productPrice, productImage);
        
        button.textContent = 'Added!';
        button.style.backgroundColor = '#22c55e';
    }
    
    // Reset button after delay
    setTimeout(() => {
        button.textContent = originalText;
        button.style.backgroundColor = '';
        button.disabled = false;
    }, 2000);
}

// Fallback local cart add
function addToCartLocal(productId, productName, productPrice, productImage) {
    const priceNum = parseFloat(productPrice.replace(/[^0-9.]/g, '')) || 0;
    
    const existingItem = tiabCart.items.find(item => item.product_id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
        existingItem.line_total = existingItem.quantity * existingItem.price;
    } else {
        tiabCart.items.push({
            product_id: productId,
            name: productName,
            price: priceNum,
            image: productImage,
            quantity: 1,
            line_total: priceNum
        });
    }
    
    tiabCart.subtotal = tiabCart.items.reduce((sum, item) => sum + item.line_total, 0);
    tiabCart.total = tiabCart.subtotal;
    tiabCart.item_count = tiabCart.items.reduce((sum, item) => sum + item.quantity, 0);
    
    localStorage.setItem('tiab_cart_backup', JSON.stringify(tiabCart));
    updateCartUI();
}

// Update Cart UI (mini cart and badge)
function updateCartUI() {
    const itemCount = tiabCart.item_count || tiabCart.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const total = tiabCart.total || tiabCart.subtotal || 0;
    
    // Update badge
    const cartBadge = document.getElementById('cart-count');
    if (cartBadge) {
        cartBadge.textContent = itemCount;
    }
    
    // Update mini cart item count
    const miniCartItemCount = document.getElementById('mini-cart-item-count');
    if (miniCartItemCount) {
        miniCartItemCount.textContent = itemCount + ' item' + (itemCount !== 1 ? 's' : '');
    }
    
    // Update mini cart total
    const miniCartTotal = document.getElementById('mini-cart-total');
    if (miniCartTotal) {
        miniCartTotal.textContent = '$' + total.toFixed(2);
    }
    
    // Update mini cart items list
    const itemsContainer = document.getElementById('mini-cart-items');
    if (itemsContainer) {
        if (tiabCart.items.length === 0) {
            itemsContainer.innerHTML = '<div class="mini-cart-empty"><p>Your cart is empty</p></div>';
        } else {
            itemsContainer.innerHTML = tiabCart.items.map(item => `
                <div class="mini-cart-item">
                    <img src="${item.image}" alt="${item.name}" onerror="this.src='https://placehold.co/60x60?text=Product'">
                    <div class="mini-cart-item-info">
                        <p class="mini-cart-item-name">${item.name}</p>
                        <p class="mini-cart-item-price">$${(item.price || 0).toFixed(2)}</p>
                        <p class="mini-cart-item-qty">Qty: ${item.quantity}</p>
                    </div>
                    <button class="mini-cart-item-remove" onclick="removeFromCart('${item.product_id}')">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
            `).join('');
        }
    }
}

// Remove item from cart
async function removeFromCart(productId) {
    try {
        const cartId = getCartId();
        const response = await fetch(`${API_BASE}/cart/${cartId}/remove/${productId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            const data = await response.json();
            tiabCart = data.cart;
            localStorage.setItem('tiab_cart_backup', JSON.stringify(tiabCart));
            updateCartUI();
        } else {
            throw new Error('Failed to remove from cart');
        }
    } catch (error) {
        console.error('Error removing from cart:', error);
        // Fallback to local removal
        tiabCart.items = tiabCart.items.filter(item => item.product_id !== productId);
        tiabCart.subtotal = tiabCart.items.reduce((sum, item) => sum + item.line_total, 0);
        tiabCart.total = tiabCart.subtotal;
        tiabCart.item_count = tiabCart.items.reduce((sum, item) => sum + item.quantity, 0);
        localStorage.setItem('tiab_cart_backup', JSON.stringify(tiabCart));
        updateCartUI();
    }
}

// Update item quantity
async function updateCartItemQty(productId, quantity) {
    try {
        const cartId = getCartId();
        const response = await fetch(`${API_BASE}/cart/${cartId}/update`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                product_id: productId,
                quantity: quantity
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            tiabCart = data.cart;
            localStorage.setItem('tiab_cart_backup', JSON.stringify(tiabCart));
            updateCartUI();
        }
    } catch (error) {
        console.error('Error updating cart:', error);
    }
}

// Show the "Added to Cart" modal
function showCartModal(name, price, image) {
    const overlay = document.getElementById('cart-modal-overlay');
    if (!overlay) {
        console.error('Modal overlay not found');
        return;
    }
    
    // Set product info in modal
    const modalProductName = document.getElementById('modal-product-name');
    const modalProductPrice = document.getElementById('modal-product-price');
    const modalProductImage = document.getElementById('modal-product-image');
    const modalCartTotal = document.getElementById('modal-cart-total');
    
    if (modalProductName) modalProductName.textContent = name;
    if (modalProductPrice) modalProductPrice.textContent = price;
    if (modalProductImage) {
        modalProductImage.src = image;
        modalProductImage.onerror = function() { this.src = 'https://placehold.co/80x80?text=Product'; };
    }
    if (modalCartTotal) modalCartTotal.textContent = '$' + (tiabCart.total || 0).toFixed(2);
    
    // Show modal
    overlay.classList.add('show');
}

// Close the cart modal
function closeCartModal() {
    const overlay = document.getElementById('cart-modal-overlay');
    if (overlay) {
        overlay.classList.remove('show');
    }
}

// Close modal when clicking overlay background
document.addEventListener('click', function(e) {
    if (e.target && e.target.id === 'cart-modal-overlay') {
        closeCartModal();
    }
});

// Quantity buttons for product pages
function initQuantityButtons() {
    document.querySelectorAll('.qty-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const action = this.dataset.action;
            const input = document.getElementById('product-qty');
            if (!input) return;
            
            let value = parseInt(input.value) || 1;
            
            if (action === 'increase') {
                value++;
            } else if (action === 'decrease' && value > 1) {
                value--;
            }
            
            input.value = value;
        });
    });
}

// Clear cart (for testing/checkout completion)
async function clearCart() {
    try {
        const cartId = getCartId();
        const response = await fetch(`${API_BASE}/cart/${cartId}/clear`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            const data = await response.json();
            tiabCart = data.cart;
        }
    } catch (error) {
        console.error('Error clearing cart:', error);
    }
    
    tiabCart = { items: [], subtotal: 0, total: 0, item_count: 0 };
    localStorage.setItem('tiab_cart_backup', JSON.stringify(tiabCart));
    updateCartUI();
}

// Get current cart state (for checkout)
function getCart() {
    return tiabCart;
}
