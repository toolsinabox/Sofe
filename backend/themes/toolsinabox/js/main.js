// Tools In A Box Theme JavaScript
// Shopping Cart with Mini Cart and Modal

document.addEventListener('DOMContentLoaded', function() {
    console.log('Theme loaded: Tools In A Box');
    
    // Initialize cart
    initCart();
    
    // Initialize quantity buttons on product pages
    initQuantityButtons();
});

// Cart state - use unique key to avoid conflicts
let tiabCart = JSON.parse(localStorage.getItem('tiab_cart')) || { items: [], total: 0 };

// Initialize cart
function initCart() {
    updateCartUI();
}

// Add to Cart Function - called via onclick
function addToCart(button) {
    const productId = button.dataset.productId;
    const productName = button.dataset.productName;
    const productPrice = button.dataset.productPrice;
    const productImage = button.dataset.productImage;
    
    if (!productId) {
        console.error('No product ID provided');
        return;
    }
    
    // Parse price (remove currency symbol and parse)
    const priceNum = parseFloat(productPrice.replace(/[^0-9.]/g, '')) || 0;
    
    // Check if item already exists in cart
    const existingItem = tiabCart.items.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.qty += 1;
    } else {
        tiabCart.items.push({
            id: productId,
            name: productName,
            price: priceNum,
            priceFormatted: productPrice,
            image: productImage,
            qty: 1
        });
    }
    
    // Update total
    tiabCart.total = tiabCart.items.reduce((sum, item) => sum + (item.price * item.qty), 0);
    
    // Save to localStorage
    localStorage.setItem('tiab_cart', JSON.stringify(tiabCart));
    
    // Update UI
    updateCartUI();
    
    // Show modal
    showCartModal(productName, productPrice, productImage);
    
    // Button feedback
    const originalText = button.textContent;
    button.textContent = 'Added!';
    button.style.backgroundColor = '#22c55e';
    
    setTimeout(() => {
        button.textContent = originalText;
        button.style.backgroundColor = '';
    }, 2000);
}

// Update Cart UI (mini cart and badge)
function updateCartUI() {
    const itemCount = tiabCart.items.reduce((sum, item) => sum + item.qty, 0);
    
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
        miniCartTotal.textContent = '$' + tiabCart.total.toFixed(2);
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
                        <p class="mini-cart-item-price">${item.priceFormatted}</p>
                        <p class="mini-cart-item-qty">Qty: ${item.qty}</p>
                    </div>
                    <button class="mini-cart-item-remove" onclick="removeFromCart('${item.id}')">
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
function removeFromCart(productId) {
    tiabCart.items = tiabCart.items.filter(item => item.id !== productId);
    tiabCart.total = tiabCart.items.reduce((sum, item) => sum + (item.price * item.qty), 0);
    localStorage.setItem('tiab_cart', JSON.stringify(tiabCart));
    updateCartUI();
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
    if (modalCartTotal) modalCartTotal.textContent = '$' + tiabCart.total.toFixed(2);
    
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

// Clear cart (for testing)
function clearCart() {
    tiabCart = { items: [], total: 0 };
    localStorage.setItem('tiab_cart', JSON.stringify(tiabCart));
    updateCartUI();
}
