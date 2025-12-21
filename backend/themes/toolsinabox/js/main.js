// Tools In A Box Theme JavaScript

document.addEventListener('DOMContentLoaded', function() {
    console.log('Theme loaded: Tools In A Box');
    
    // Initialize cart functionality
    initCart();
    
    // Initialize product interactions
    initProductInteractions();
    
    // Initialize quantity buttons
    initQuantityButtons();
});

// Cart state
let cart = JSON.parse(localStorage.getItem('cart') || '[]');

function initCart() {
    updateCartCount();
    
    // Add to cart buttons
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.preventDefault();
            const productId = this.dataset.productId;
            
            if (!productId) return;
            
            try {
                // Fetch product data
                const response = await fetch(`/api/products/${productId}`);
                const product = await response.json();
                
                addToCart(product);
                
                // Visual feedback
                this.textContent = 'Added!';
                this.classList.add('bg-green-600');
                this.classList.remove('bg-blue-600');
                
                setTimeout(() => {
                    this.textContent = 'Add to Cart';
                    this.classList.remove('bg-green-600');
                    this.classList.add('bg-blue-600');
                }, 1500);
            } catch (err) {
                console.error('Error adding to cart:', err);
            }
        });
    });
}

function addToCart(product) {
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.images?.[0] || '',
            quantity: 1
        });
    }
    
    saveCart();
    updateCartCount();
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    updateCartCount();
}

function updateCartItemQuantity(productId, quantity) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity = Math.max(1, quantity);
        saveCart();
        updateCartCount();
    }
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.querySelectorAll('.cart-count').forEach(el => {
        el.textContent = count;
    });
}

function getCartTotal() {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

function initProductInteractions() {
    // Product image thumbnails
    document.querySelectorAll('.product-thumb').forEach(thumb => {
        thumb.addEventListener('click', function() {
            const img = this.querySelector('img');
            const mainImage = document.getElementById('main-product-image');
            if (mainImage && img) {
                mainImage.src = img.src;
            }
            
            // Update active state
            document.querySelectorAll('.product-thumb').forEach(t => {
                t.classList.remove('border-blue-600');
                t.classList.add('border-transparent');
            });
            this.classList.add('border-blue-600');
            this.classList.remove('border-transparent');
        });
    });
}

function initQuantityButtons() {
    // Quantity buttons on product page
    document.querySelectorAll('.qty-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const input = document.getElementById('product-qty');
            if (!input) return;
            
            let value = parseInt(input.value) || 1;
            
            if (this.dataset.action === 'increase') {
                value++;
            } else if (this.dataset.action === 'decrease' && value > 1) {
                value--;
            }
            
            input.value = value;
        });
    });
    
    // Cart quantity buttons
    document.querySelectorAll('.cart-qty-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const input = this.parentElement.querySelector('input');
            const cartItem = this.closest('.cart-item');
            const itemId = cartItem?.dataset.itemId;
            
            if (!input) return;
            
            let value = parseInt(input.value) || 1;
            
            if (this.dataset.action === 'increase') {
                value++;
            } else if (this.dataset.action === 'decrease' && value > 1) {
                value--;
            }
            
            input.value = value;
            
            if (itemId) {
                updateCartItemQuantity(itemId, value);
            }
        });
    });
    
    // Remove from cart
    document.querySelectorAll('.remove-item').forEach(btn => {
        btn.addEventListener('click', function() {
            const itemId = this.dataset.itemId;
            if (itemId) {
                removeFromCart(itemId);
                const cartItem = this.closest('.cart-item');
                if (cartItem) cartItem.remove();
            }
        });
    });
}
