"""
Maropost-Style Template Rendering Engine

This module implements a server-side HTML rendering system that assembles pages
from layout wrappers, page templates, and partial includes, following the
Maropost (formerly Neto) template rendering pattern.

File Structure:
- template.html: Main site layout wrapper
- headers/template.html: Visible site header
- headers/includes/head.template.html: Global <head> partial
- footers/template.html: Site footer
- products/template.html: Product page body
- checkout.template.html: Checkout wrapper (alternate)
- empty.template.html: Minimal wrapper
- print.template.html: Print wrapper
- sendemail.template.html: Email wrapper
"""

import os
import re
import time
import hashlib
import logging
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timezone
from enum import Enum
import aiofiles

logger = logging.getLogger(__name__)


class PageType(Enum):
    """Supported page types for routing"""
    HOME = "home"
    PRODUCT = "product"
    CATEGORY = "category"
    CMS = "cms"
    SEARCH = "search"
    CART = "cart"
    CHECKOUT = "checkout"
    ACCOUNT = "account"
    STOCKISTS = "stockists"
    ERROR_404 = "404"
    CONTACT = "contact"
    ABOUT = "about"


class WrapperContext(Enum):
    """Context for selecting layout wrapper"""
    DEFAULT = "default"
    CHECKOUT = "checkout"
    PRINT = "print"
    EMPTY = "empty"
    EMAIL = "email"


class TemplateCache:
    """Cache for compiled templates"""
    
    def __init__(self, max_size: int = 100):
        self._cache: Dict[str, Tuple[str, float, str]] = {}  # path -> (content, mtime, hash)
        self._max_size = max_size
    
    async def get(self, file_path: Path) -> Optional[str]:
        """Get cached template if still valid"""
        key = str(file_path)
        if key not in self._cache:
            return None
        
        content, cached_mtime, _ = self._cache[key]
        
        # Check if file has been modified
        try:
            current_mtime = file_path.stat().st_mtime
            if current_mtime > cached_mtime:
                del self._cache[key]
                return None
        except OSError:
            del self._cache[key]
            return None
        
        return content
    
    async def set(self, file_path: Path, content: str) -> None:
        """Cache a template"""
        # Evict oldest entries if cache is full
        if len(self._cache) >= self._max_size:
            oldest_key = min(self._cache.keys(), key=lambda k: self._cache[k][1])
            del self._cache[oldest_key]
        
        key = str(file_path)
        mtime = file_path.stat().st_mtime
        content_hash = hashlib.md5(content.encode()).hexdigest()
        self._cache[key] = (content, mtime, content_hash)
    
    def invalidate(self, file_path: Optional[Path] = None) -> None:
        """Invalidate cache for a specific file or all files"""
        if file_path:
            key = str(file_path)
            if key in self._cache:
                del self._cache[key]
        else:
            self._cache.clear()


class RenderOutputCache:
    """Cache for rendered page output"""
    
    def __init__(self, max_size: int = 50, ttl_seconds: int = 300):
        self._cache: Dict[str, Tuple[str, float]] = {}  # key -> (html, timestamp)
        self._max_size = max_size
        self._ttl = ttl_seconds
    
    def _generate_key(self, page_type: str, url: str, context_hash: str) -> str:
        """Generate cache key from page parameters"""
        return f"{page_type}:{url}:{context_hash}"
    
    def get(self, page_type: str, url: str, context_hash: str) -> Optional[str]:
        """Get cached render output"""
        key = self._generate_key(page_type, url, context_hash)
        if key not in self._cache:
            return None
        
        html, timestamp = self._cache[key]
        
        # Check TTL
        if time.time() - timestamp > self._ttl:
            del self._cache[key]
            return None
        
        return html
    
    def set(self, page_type: str, url: str, context_hash: str, html: str) -> None:
        """Cache rendered output"""
        # Evict oldest entries if cache is full
        if len(self._cache) >= self._max_size:
            oldest_key = min(self._cache.keys(), key=lambda k: self._cache[k][1])
            del self._cache[oldest_key]
        
        key = self._generate_key(page_type, url, context_hash)
        self._cache[key] = (html, time.time())
    
    def invalidate(self) -> None:
        """Clear all cached outputs"""
        self._cache.clear()


class IncludeStack:
    """Track include stack to prevent infinite recursion"""
    
    def __init__(self, max_depth: int = 20):
        self._stack: List[str] = []
        self._max_depth = max_depth
    
    def push(self, path: str) -> bool:
        """Push a path onto the stack, returns False if would cause recursion"""
        if path in self._stack:
            logger.warning(f"Circular include detected: {path} in {self._stack}")
            return False
        if len(self._stack) >= self._max_depth:
            logger.warning(f"Max include depth reached: {self._max_depth}")
            return False
        self._stack.append(path)
        return True
    
    def pop(self) -> Optional[str]:
        """Pop from the stack"""
        if self._stack:
            return self._stack.pop()
        return None
    
    def clear(self) -> None:
        """Clear the stack"""
        self._stack.clear()
    
    @property
    def depth(self) -> int:
        return len(self._stack)
    
    @property
    def stack(self) -> List[str]:
        return self._stack.copy()


class DebugInfo:
    """Collect debug information during rendering"""
    
    def __init__(self):
        self.wrapper_file: str = ""
        self.page_template_file: str = ""
        self.includes: List[str] = []
        self.start_time: float = 0
        self.end_time: float = 0
        self.cache_hits: int = 0
        self.cache_misses: int = 0
    
    @property
    def render_time_ms(self) -> float:
        return (self.end_time - self.start_time) * 1000
    
    def to_headers(self) -> Dict[str, str]:
        """Convert debug info to HTTP headers"""
        return {
            "X-Template-Wrapper": self.wrapper_file,
            "X-Template-Page": self.page_template_file,
            "X-Template-Includes": ", ".join(self.includes),
            "X-Template-Render-Time-Ms": f"{self.render_time_ms:.2f}",
            "X-Template-Cache-Hits": str(self.cache_hits),
            "X-Template-Cache-Misses": str(self.cache_misses),
        }


class MaropostTemplateEngine:
    """
    Main template engine implementing Maropost-style rendering.
    
    Template Composition Order:
    1. Select layout wrapper (template.html or context-specific)
    2. Inside wrapper:
       - Include headers/includes/head.template.html in <head>
       - Include headers/template.html at top of <body>
       - Inject page body template into content slot
       - Include footers/template.html at bottom of <body>
    """
    
    # Include directive patterns
    INCLUDE_PATTERN = re.compile(
        r'\[%load_template\s+file:[\'"]([^\'"]+)[\'"]\s*/?%\]|'
        r'\{\{\s*include\([\'"]([^\'"]+)[\'"]\)\s*\}\}'
    )
    
    # Content slot marker
    CONTENT_SLOT = '[%content%]'
    CONTENT_SLOT_PATTERN = re.compile(r'\[%content%\]')
    
    # Head slot for injecting head partial
    HEAD_SLOT = '[%head_includes%]'
    HEAD_SLOT_PATTERN = re.compile(r'\[%head_includes%\]|</head>')
    
    # Data tag patterns
    DATA_TAG_PATTERN = re.compile(r'\[@(\w+)@\]')
    
    # Loop tag patterns
    LOOP_PATTERN = re.compile(
        r'\[%(\w+)(?:\s+([^%]+))?%\](.*?)\[%/\1%\]',
        re.DOTALL
    )
    
    # Conditional patterns
    IF_PATTERN = re.compile(
        r'\[%if\s+([^%]+)%\](.*?)(?:\[%else%\](.*?))?\[%/if%\]',
        re.DOTALL
    )
    
    def __init__(self, theme_root: Path, db_instance, debug_mode: bool = False):
        """
        Initialize the template engine.
        
        Args:
            theme_root: Path to the theme directory
            db_instance: Database instance for fetching data
            debug_mode: Enable debug output
        """
        self.theme_root = Path(theme_root)
        self.db = db_instance
        self.debug_mode = debug_mode
        self.template_cache = TemplateCache()
        self.render_cache = RenderOutputCache()
        self._debug_info: Optional[DebugInfo] = None
    
    # ==================== ROUTING ====================
    
    def resolve_page_type(self, url: str, request_data: Optional[Dict] = None) -> Tuple[PageType, Dict[str, Any]]:
        """
        Resolve URL to page type and extract model data.
        
        Args:
            url: Request URL path
            request_data: Additional request data
        
        Returns:
            Tuple of (PageType, model_data)
        """
        url = url.strip('/')
        model_data = {}
        
        # Home page
        if not url or url == 'home':
            return PageType.HOME, model_data
        
        # Product page: /product/{id} or /products/{id}
        if url.startswith('product/') or url.startswith('products/'):
            parts = url.split('/')
            if len(parts) >= 2:
                model_data['product_id'] = parts[1]
            return PageType.PRODUCT, model_data
        
        # Category page: /category/{id} or /collection/{id}
        if url.startswith('category/') or url.startswith('collection/'):
            parts = url.split('/')
            if len(parts) >= 2:
                model_data['category_id'] = parts[1]
            return PageType.CATEGORY, model_data
        
        # Search
        if url.startswith('search'):
            model_data['query'] = request_data.get('q', '') if request_data else ''
            return PageType.SEARCH, model_data
        
        # Cart
        if url == 'cart' or url.startswith('cart/'):
            return PageType.CART, model_data
        
        # Checkout
        if url.startswith('checkout'):
            return PageType.CHECKOUT, model_data
        
        # Account pages
        if url.startswith('account') or url.startswith('login') or url.startswith('register'):
            return PageType.ACCOUNT, model_data
        
        # Stockists
        if url == 'stockists' or url.startswith('stockists/'):
            return PageType.STOCKISTS, model_data
        
        # Contact
        if url == 'contact':
            return PageType.CONTACT, model_data
        
        # About
        if url == 'about':
            return PageType.ABOUT, model_data
        
        # Default to CMS page
        model_data['page_slug'] = url
        return PageType.CMS, model_data
    
    # ==================== TEMPLATE SELECTION ====================
    
    def select_wrapper(self, context: WrapperContext) -> Path:
        """
        Select the layout wrapper based on context.
        
        Args:
            context: The rendering context (checkout, print, empty, email, default)
        
        Returns:
            Path to the wrapper template
        """
        wrapper_map = {
            WrapperContext.CHECKOUT: 'checkout.template.html',
            WrapperContext.PRINT: 'print.template.html',
            WrapperContext.EMPTY: 'empty.template.html',
            WrapperContext.EMAIL: 'sendemail.template.html',
        }
        
        if context in wrapper_map:
            specific_wrapper = self.theme_root / wrapper_map[context]
            if specific_wrapper.exists():
                return specific_wrapper
        
        # Fallback to default wrapper
        default_wrapper = self.theme_root / 'template.html'
        if default_wrapper.exists():
            return default_wrapper
        
        # Ultimate fallback - look in templates folder
        templates_wrapper = self.theme_root / 'templates' / 'template.html'
        if templates_wrapper.exists():
            return templates_wrapper
        
        raise FileNotFoundError(f"No wrapper template found in {self.theme_root}")
    
    def select_page_template(self, page_type: PageType, model_data: Dict) -> Path:
        """
        Select the page body template based on page type.
        
        Args:
            page_type: The resolved page type
            model_data: Additional model data
        
        Returns:
            Path to the page template
        """
        template_map = {
            PageType.HOME: 'cms/home.template.html',
            PageType.PRODUCT: 'products/template.html',
            PageType.CATEGORY: 'cms/category.template.html',
            PageType.SEARCH: 'cms/search.template.html',
            PageType.CART: 'cart/shopping_cart.template.html',
            PageType.CHECKOUT: 'checkout/template.html',
            PageType.ACCOUNT: 'account/template.html',
            PageType.STOCKISTS: 'stockists/template.html',
            PageType.ERROR_404: 'cms/404.template.html',
            PageType.CONTACT: 'cms/contact.template.html',
            PageType.ABOUT: 'cms/about.template.html',
        }
        
        # Get template path for page type
        template_path = template_map.get(page_type, 'cms/default.template.html')
        
        # For CMS pages, try slug-specific template first
        if page_type == PageType.CMS and 'page_slug' in model_data:
            slug_template = self.theme_root / 'templates' / 'cms' / f"{model_data['page_slug']}.template.html"
            if slug_template.exists():
                return slug_template
        
        # Check in templates folder
        template_file = self.theme_root / 'templates' / template_path
        if template_file.exists():
            return template_file
        
        # Fallback to default
        default_template = self.theme_root / 'templates' / 'cms' / 'default.template.html'
        if default_template.exists():
            return default_template
        
        # Create a minimal template if nothing exists
        return None
    
    def determine_wrapper_context(self, page_type: PageType, request_params: Optional[Dict] = None) -> WrapperContext:
        """
        Determine which wrapper context to use.
        
        Args:
            page_type: The page type being rendered
            request_params: URL parameters or request data
        
        Returns:
            The appropriate WrapperContext
        """
        request_params = request_params or {}
        
        # Check for explicit context in params
        if request_params.get('print') or request_params.get('_print'):
            return WrapperContext.PRINT
        
        if request_params.get('embed') or request_params.get('_embed'):
            return WrapperContext.EMPTY
        
        # Checkout pages use checkout wrapper
        if page_type == PageType.CHECKOUT:
            return WrapperContext.CHECKOUT
        
        return WrapperContext.DEFAULT
    
    # ==================== FILE READING ====================
    
    async def read_template(self, file_path: Path) -> str:
        """
        Read a template file with caching.
        
        Args:
            file_path: Path to the template file
        
        Returns:
            Template content as string
        """
        # Try cache first
        cached = await self.template_cache.get(file_path)
        if cached is not None:
            if self._debug_info:
                self._debug_info.cache_hits += 1
            return cached
        
        if self._debug_info:
            self._debug_info.cache_misses += 1
        
        if not file_path.exists():
            if self.debug_mode:
                logger.error(f"Template file not found: {file_path}")
                return f"<!-- Template not found: {file_path} -->"
            return ""
        
        async with aiofiles.open(file_path, 'r', encoding='utf-8') as f:
            content = await f.read()
        
        # Cache the content
        await self.template_cache.set(file_path, content)
        
        return content
    
    # ==================== INCLUDE PROCESSING ====================
    
    async def process_includes(
        self, 
        content: str, 
        base_path: Optional[Path] = None,
        include_stack: Optional[IncludeStack] = None
    ) -> str:
        """
        Process include directives recursively.
        
        Supports:
        - [%load_template file:'path/to/file.html'%]
        - {{ include("path/to/file.html") }}
        
        Args:
            content: Template content
            base_path: Base path for relative includes
            include_stack: Stack to track includes and prevent recursion
        
        Returns:
            Content with all includes resolved
        """
        if include_stack is None:
            include_stack = IncludeStack()
        
        if base_path is None:
            base_path = self.theme_root
        
        def replace_include(match):
            # Get the path from either capture group
            include_path = match.group(1) or match.group(2)
            return f"__INCLUDE__{include_path}__INCLUDE__"
        
        # Mark all includes
        marked_content = self.INCLUDE_PATTERN.sub(replace_include, content)
        
        # Process each include
        include_marker_pattern = re.compile(r'__INCLUDE__(.+?)__INCLUDE__')
        
        async def resolve_include(include_path: str) -> str:
            # Resolve the include path
            if include_path.startswith('/'):
                full_path = self.theme_root / include_path.lstrip('/')
            else:
                # Try templates folder first
                full_path = self.theme_root / 'templates' / include_path
                if not full_path.exists():
                    full_path = self.theme_root / include_path
            
            # Check for recursion
            path_str = str(full_path)
            if not include_stack.push(path_str):
                return f"<!-- Circular include prevented: {include_path} -->"
            
            try:
                # Track include for debugging
                if self._debug_info:
                    self._debug_info.includes.append(include_path)
                
                # Read the include file
                include_content = await self.read_template(full_path)
                
                # Recursively process includes in the included content
                processed = await self.process_includes(
                    include_content, 
                    full_path.parent,
                    include_stack
                )
                
                return processed
            finally:
                include_stack.pop()
        
        # Process all includes
        result = marked_content
        matches = list(include_marker_pattern.finditer(marked_content))
        
        for match in reversed(matches):  # Process in reverse to maintain positions
            include_path = match.group(1)
            replacement = await resolve_include(include_path)
            result = result[:match.start()] + replacement + result[match.end():]
        
        return result
    
    # ==================== DATA BINDING ====================
    
    async def build_global_context(self) -> Dict[str, Any]:
        """Build global context available to all templates."""
        # Get store settings
        store_settings = await self.db.store_settings.find_one({"id": "store_settings"})
        if not store_settings:
            store_settings = {
                "store_name": "Tools In A Box",
                "store_email": "support@toolsinabox.com.au",
                "store_phone": "1800 123 456",
                "currency": "AUD",
                "currency_symbol": "$",
            }
        
        # Get categories
        categories = await self.db.categories.find({}, {"_id": 0}).to_list(100)
        
        return {
            "shop": store_settings,
            "store": store_settings,
            "customer": None,  # Will be set if user is logged in
            "cart": {"items": [], "item_count": 0, "total": 0},
            "settings": store_settings,
            "categories": categories,
            "current_year": str(datetime.now(timezone.utc).year),
            "current_date": datetime.now(timezone.utc).strftime('%Y-%m-%d'),
        }
    
    async def build_page_context(
        self, 
        page_type: PageType, 
        model_data: Dict,
        global_context: Dict
    ) -> Dict[str, Any]:
        """
        Build page-specific context.
        
        Args:
            page_type: The page type
            model_data: Model data from routing
            global_context: The global context
        
        Returns:
            Combined context for rendering
        """
        context = global_context.copy()
        
        if page_type == PageType.PRODUCT:
            product_id = model_data.get('product_id')
            if product_id:
                product = await self.db.products.find_one({"id": product_id}, {"_id": 0})
                if product:
                    context['product'] = product
                    context['variants'] = product.get('variants', [])
                    context['images'] = product.get('images', [])
                    context['pricing'] = {
                        'price': product.get('price', 0),
                        'compare_price': product.get('compare_price'),
                        'on_sale': product.get('compare_price', 0) > product.get('price', 0)
                    }
                    context['availability'] = {
                        'in_stock': product.get('stock', 0) > 0,
                        'stock': product.get('stock', 0)
                    }
        
        elif page_type == PageType.CATEGORY:
            category_id = model_data.get('category_id')
            if category_id:
                category = await self.db.categories.find_one({"id": category_id}, {"_id": 0})
                if category:
                    context['category'] = category
                    # Get products in category
                    products = await self.db.products.find(
                        {"category_id": category_id}, 
                        {"_id": 0}
                    ).to_list(100)
                    context['products'] = products
                    context['filters'] = {}
                    context['pagination'] = {
                        'page': 1,
                        'per_page': 20,
                        'total': len(products)
                    }
        
        elif page_type == PageType.HOME:
            # Get featured products
            products = await self.db.products.find({}, {"_id": 0}).limit(20).to_list(20)
            context['products'] = products
            context['featured_products'] = products[:8]
            
            # Get banners
            banners = await self.db.banners.find({}, {"_id": 0}).to_list(20)
            context['banners'] = banners
        
        elif page_type == PageType.SEARCH:
            query = model_data.get('query', '')
            if query:
                products = await self.db.products.find(
                    {"$text": {"$search": query}},
                    {"_id": 0}
                ).to_list(100)
                context['products'] = products
                context['search_query'] = query
        
        elif page_type == PageType.CMS:
            page_slug = model_data.get('page_slug')
            if page_slug:
                page = await self.db.pages.find_one({"slug": page_slug}, {"_id": 0})
                if page:
                    context['page'] = page
                    context['content_blocks'] = page.get('content_blocks', [])
        
        return context
    
    # ==================== TAG PROCESSING ====================
    
    async def process_data_tags(self, content: str, context: Dict) -> str:
        """
        Process [@tag@] data tags.
        
        Args:
            content: Template content
            context: Rendering context
        
        Returns:
            Content with data tags replaced
        """
        store = context.get('store', {})
        product = context.get('product', {})
        category = context.get('category', {})
        customer = context.get('customer', {})
        cart = context.get('cart', {})
        page = context.get('page', {})
        
        # Build replacements map
        replacements = {
            # Store tags
            'store_name': store.get('store_name', ''),
            'store_email': store.get('store_email', ''),
            'store_phone': store.get('store_phone', ''),
            'store_url': store.get('store_url', ''),
            'store_logo': store.get('store_logo', ''),
            'currency': store.get('currency', 'USD'),
            'currency_symbol': store.get('currency_symbol', '$'),
            'store_facebook': store.get('store_facebook', ''),
            'store_instagram': store.get('store_instagram', ''),
            'store_twitter': store.get('store_twitter', ''),
            'store_address': store.get('store_address', ''),
            
            # Date tags
            'current_date': context.get('current_date', ''),
            'current_year': context.get('current_year', ''),
            
            # Product tags (if in product context)
            'SKU': product.get('sku', ''),
            'name': product.get('name', page.get('title', '')),
            'description': product.get('description', page.get('description', '')),
            'price': f"{product.get('price', 0):.2f}" if product else '',
            'price_formatted': f"{store.get('currency_symbol', '$')}{product.get('price', 0):.2f}" if product else '',
            'rrp': f"{product.get('compare_price', 0):.2f}" if product.get('compare_price') else '',
            'rrp_formatted': f"{store.get('currency_symbol', '$')}{product.get('compare_price', 0):.2f}" if product.get('compare_price') else '',
            'image': product.get('images', [''])[0] if product.get('images') else '',
            'qty': str(product.get('stock', 0)),
            'in_stock': 'y' if product.get('stock', 0) > 0 else 'n',
            'on_sale': 'y' if product.get('compare_price', 0) > product.get('price', 0) else 'n',
            'id': product.get('id', page.get('id', '')),
            'url': f"/live/product/{product.get('id', '')}" if product else f"/live/{page.get('slug', '')}",
            
            # Category tags
            'content_name': category.get('name', page.get('title', '')),
            'content_id': category.get('id', page.get('id', '')),
            'content_description': category.get('description', page.get('description', '')),
            'content_image': category.get('image', ''),
            
            # Customer tags
            'customer_id': customer.get('id', '') if customer else '',
            'customer_email': customer.get('email', '') if customer else '',
            'customer_first_name': customer.get('first_name', '') if customer else '',
            'customer_last_name': customer.get('last_name', '') if customer else '',
            'customer_logged_in': 'y' if customer else 'n',
            
            # Cart tags
            'cart_total': f"{store.get('currency_symbol', '$')}{cart.get('total', 0):.2f}",
            'cart_item_count': str(cart.get('item_count', 0)),
            'mini_cart_count': str(cart.get('item_count', 0)),
        }
        
        def replace_tag(match):
            tag_name = match.group(1)
            return str(replacements.get(tag_name, f'[@{tag_name}@]'))
        
        return self.DATA_TAG_PATTERN.sub(replace_tag, content)
    
    async def process_loop_tags(self, content: str, context: Dict) -> str:
        """
        Process [%tag%]...[%/tag%] loop tags.
        
        Args:
            content: Template content
            context: Rendering context
        
        Returns:
            Content with loop tags processed
        """
        def process_loop(match):
            tag_name = match.group(1)
            params_str = match.group(2) or ''
            inner_content = match.group(3)
            
            # Parse parameters
            params = {}
            if params_str:
                for param in params_str.split():
                    if ':' in param:
                        key, value = param.split(':', 1)
                        params[key.strip()] = value.strip().strip("'\"")
            
            # Get items based on tag name
            items = []
            
            if tag_name == 'product_list' or tag_name == 'products':
                items = context.get('products', [])
                limit = int(params.get('limit', 20))
                items = items[:limit]
            
            elif tag_name == 'category_list' or tag_name == 'categories':
                items = context.get('categories', [])
                limit = int(params.get('limit', 10))
                items = items[:limit]
            
            elif tag_name == 'banner_list' or tag_name == 'banners':
                items = context.get('banners', [])
                limit = int(params.get('limit', 5))
                items = items[:limit]
            
            elif tag_name == 'cart_items':
                cart = context.get('cart', {})
                items = cart.get('items', [])
            
            # Render each item
            output = []
            for i, item in enumerate(items):
                item_content = inner_content
                
                # Replace item-specific tags
                if tag_name in ['product_list', 'products']:
                    item_content = self._replace_product_item_tags(item_content, item, context.get('store', {}))
                elif tag_name in ['category_list', 'categories']:
                    item_content = self._replace_category_item_tags(item_content, item)
                elif tag_name in ['banner_list', 'banners']:
                    item_content = self._replace_banner_item_tags(item_content, item)
                
                # Replace index tags
                item_content = item_content.replace('[@index@]', str(i))
                item_content = item_content.replace('[@index1@]', str(i + 1))
                
                # Process inline conditionals within the item
                # Simple pattern: [%if value%]content[%/if%] or [%if value%]content[%else%]other[%/if%]
                item_content = self._process_inline_conditionals(item_content, item)
                
                output.append(item_content)
            
            return ''.join(output)
        
        # Process all loop tags
        result = content
        max_iterations = 10  # Prevent infinite loops
        
        for _ in range(max_iterations):
            new_result = self.LOOP_PATTERN.sub(process_loop, result)
            if new_result == result:
                break
            result = new_result
        
        return result
    
    def _process_inline_conditionals(self, content: str, item: Dict) -> str:
        """Process inline conditionals within loop items."""
        # Pattern for [%if value%]content[%/if%] or [%if value%]content[%else%]other[%/if%]
        pattern = re.compile(
            r'\[%if\s+([^\]%]+)%\](.*?)(?:\[%else%\](.*?))?\[%/if%\]',
            re.DOTALL
        )
        
        def evaluate_and_replace(match):
            condition = match.group(1).strip()
            true_content = match.group(2)
            false_content = match.group(3) or ''
            
            # Check if condition is a direct value check (already replaced)
            # If the condition was a tag like [@product_compare_price@] and it's now empty or a value
            if condition.startswith('[@') and condition.endswith('@]'):
                # Tag wasn't replaced - treat as falsy
                return false_content
            
            # Check if it's a simple value (after tag replacement)
            # Truthy: non-empty string that's not just whitespace
            if condition and condition.strip():
                # Check for equality
                if '==' in condition:
                    left, right = condition.split('==', 1)
                    return true_content if left.strip() == right.strip().strip("'\"") else false_content
                if '!=' in condition:
                    left, right = condition.split('!=', 1)
                    return true_content if left.strip() != right.strip().strip("'\"") else false_content
                
                # Simple truthy check - non-empty, non-zero
                if condition.lower() in ('y', 'yes', 'true', '1'):
                    return true_content
                if condition.lower() in ('n', 'no', 'false', '0', ''):
                    return false_content
                # Non-empty string is truthy
                return true_content
            
            return false_content
        
        return pattern.sub(evaluate_and_replace, content)
    
    def _replace_product_item_tags(self, content: str, product: Dict, store: Dict) -> str:
        """Replace product item tags within a loop."""
        currency = store.get('currency_symbol', '$')
        price = product.get('price', 0)
        compare_price = product.get('compare_price', 0) or 0
        
        replacements = {
            '[@product_id@]': product.get('id', ''),
            '[@product_name@]': product.get('name', ''),
            '[@product_description@]': product.get('description', ''),
            '[@product_price@]': f"{price:.2f}",
            '[@product_price_formatted@]': f"{currency}{price:.2f}",
            '[@product_compare_price@]': f"{compare_price:.2f}" if compare_price else '',
            '[@product_compare_price_formatted@]': f"{currency}{compare_price:.2f}" if compare_price else '',
            '[@product_image@]': product.get('images', [''])[0] if product.get('images') else '',
            '[@product_url@]': f"/live/product/{product.get('id', '')}",
            '[@product_category@]': product.get('category_name', ''),
            '[@product_sku@]': product.get('sku', ''),
            '[@product_stock@]': str(product.get('stock', 0)),
            '[@product_sale@]': 'y' if compare_price > price else 'n',
        }
        
        for tag, value in replacements.items():
            content = content.replace(tag, str(value))
        
        return content
    
    def _replace_category_item_tags(self, content: str, category: Dict) -> str:
        """Replace category item tags within a loop."""
        replacements = {
            '[@category_id@]': category.get('id', ''),
            '[@category_name@]': category.get('name', ''),
            '[@category_description@]': category.get('description', ''),
            '[@category_image@]': category.get('image', ''),
            '[@category_url@]': f"/live/category/{category.get('id', '')}",
            '[@category_product_count@]': str(category.get('product_count', 0)),
        }
        
        for tag, value in replacements.items():
            content = content.replace(tag, str(value))
        
        return content
    
    def _replace_banner_item_tags(self, content: str, banner: Dict) -> str:
        """Replace banner item tags within a loop."""
        replacements = {
            '[@banner_id@]': banner.get('id', ''),
            '[@banner_title@]': banner.get('title', banner.get('name', '')),
            '[@banner_subtitle@]': banner.get('subtitle', ''),
            '[@banner_image@]': banner.get('image', banner.get('image_desktop', '')),
            '[@banner_image_desktop@]': banner.get('image_desktop', banner.get('image', '')),
            '[@banner_image_mobile@]': banner.get('image_mobile', banner.get('image', '')),
            '[@banner_link@]': banner.get('link', '#'),
            '[@banner_button_text@]': banner.get('button_text', 'Shop Now'),
        }
        
        for tag, value in replacements.items():
            content = content.replace(tag, str(value))
        
        return content
    
    async def process_conditionals(self, content: str, context: Dict) -> str:
        """
        Process [%if condition%]...[%else%]...[%/if%] tags.
        
        Args:
            content: Template content
            context: Rendering context
        
        Returns:
            Content with conditionals processed
        """
        def evaluate_condition(condition: str) -> bool:
            condition = condition.strip()
            
            # Simple equality check
            if '==' in condition:
                left, right = condition.split('==', 1)
                left_val = self._resolve_value(left.strip(), context)
                right_val = right.strip().strip("'\"")
                return str(left_val) == right_val
            
            # Inequality
            if '!=' in condition:
                left, right = condition.split('!=', 1)
                left_val = self._resolve_value(left.strip(), context)
                right_val = right.strip().strip("'\"")
                return str(left_val) != right_val
            
            # Truthy check
            value = self._resolve_value(condition, context)
            if isinstance(value, bool):
                return value
            if isinstance(value, str):
                return value.lower() in ('y', 'yes', 'true', '1') and value != ''
            if isinstance(value, (int, float)):
                return value > 0
            return bool(value)
        
        def process_if(match):
            condition = match.group(1)
            true_content = match.group(2)
            false_content = match.group(3) or ''
            
            if evaluate_condition(condition):
                return true_content
            return false_content
        
        # Process all conditionals
        result = content
        max_iterations = 10
        
        for _ in range(max_iterations):
            new_result = self.IF_PATTERN.sub(process_if, result)
            if new_result == result:
                break
            result = new_result
        
        return result
    
    def _resolve_value(self, path: str, context: Dict) -> Any:
        """Resolve a dotted path to a value in context."""
        # Handle [@tag@] format
        match = re.match(r'\[@(\w+)@\]', path)
        if match:
            path = match.group(1)
        
        parts = path.split('.')
        value = context
        
        for part in parts:
            if isinstance(value, dict):
                value = value.get(part, '')
            else:
                return ''
        
        return value
    
    # ==================== MAIN RENDERING ====================
    
    async def render_page(
        self,
        url: str,
        request_params: Optional[Dict] = None,
        customer: Optional[Dict] = None,
        cart: Optional[Dict] = None
    ) -> Tuple[str, Optional[DebugInfo]]:
        """
        Render a complete page.
        
        Args:
            url: Request URL
            request_params: Query parameters
            customer: Logged-in customer data
            cart: Current cart data
        
        Returns:
            Tuple of (rendered HTML, debug info if debug mode)
        """
        if self.debug_mode:
            self._debug_info = DebugInfo()
            self._debug_info.start_time = time.time()
        
        try:
            # 1. Route URL to page type
            page_type, model_data = self.resolve_page_type(url, request_params)
            
            # 2. Determine wrapper context
            wrapper_context = self.determine_wrapper_context(page_type, request_params)
            
            # 3. Select templates
            wrapper_path = self.select_wrapper(wrapper_context)
            page_template_path = self.select_page_template(page_type, model_data)
            
            if self._debug_info:
                self._debug_info.wrapper_file = str(wrapper_path.relative_to(self.theme_root))
                if page_template_path:
                    self._debug_info.page_template_file = str(page_template_path.relative_to(self.theme_root))
            
            # 4. Build context
            global_context = await self.build_global_context()
            if customer:
                global_context['customer'] = customer
            if cart:
                global_context['cart'] = cart
            
            context = await self.build_page_context(page_type, model_data, global_context)
            
            # 5. Read and process templates
            wrapper_content = await self.read_template(wrapper_path)
            
            page_content = ""
            if page_template_path and page_template_path.exists():
                page_content = await self.read_template(page_template_path)
            
            # 6. Assemble the page
            html = await self.assemble_page(
                wrapper_content,
                page_content,
                context
            )
            
            # 7. Process all tags
            html = await self.process_includes(html)
            html = await self.process_loop_tags(html, context)
            html = await self.process_conditionals(html, context)
            html = await self.process_data_tags(html, context)
            
            # 8. Fix asset paths
            html = self.fix_asset_paths(html)
            
            return html, self._debug_info
        
        finally:
            if self._debug_info:
                self._debug_info.end_time = time.time()
    
    async def assemble_page(
        self,
        wrapper: str,
        page_content: str,
        context: Dict
    ) -> str:
        """
        Assemble the final page from wrapper and components.
        
        Composition order:
        1. Wrapper shell
        2. Head includes in <head>
        3. Header at top of <body>
        4. Page content in content slot
        5. Footer at bottom of <body>
        
        Args:
            wrapper: Wrapper template content
            page_content: Page body template content
            context: Rendering context
        
        Returns:
            Assembled HTML
        """
        # Read component templates
        head_partial_path = self.theme_root / 'templates' / 'headers' / 'includes' / 'head.template.html'
        header_path = self.theme_root / 'templates' / 'headers' / 'template.html'
        footer_path = self.theme_root / 'templates' / 'footers' / 'template.html'
        
        head_partial = await self.read_template(head_partial_path) if head_partial_path.exists() else ""
        header_content = await self.read_template(header_path) if header_path.exists() else ""
        footer_content = await self.read_template(footer_path) if footer_path.exists() else ""
        
        result = wrapper
        
        # Replace [%head_includes%] with head partial, or inject before </head>
        if '[%head_includes%]' in result:
            result = result.replace('[%head_includes%]', head_partial)
        elif head_partial:
            result = re.sub(r'</head>', f'{head_partial}</head>', result, count=1)
        
        # Replace [%header%] with header content
        if '[%header%]' in result:
            result = result.replace('[%header%]', header_content)
        
        # Replace [%footer%] with footer content
        if '[%footer%]' in result:
            result = result.replace('[%footer%]', footer_content)
        
        # Check if wrapper has content slot [%content%]
        if self.CONTENT_SLOT in result:
            # Replace content slot with page content
            result = result.replace(self.CONTENT_SLOT, page_content)
        elif '[%page_content%]' in result:
            result = result.replace('[%page_content%]', page_content)
        else:
            # No content slot - try injecting before </main> or at end of body
            if '</main>' in result:
                result = result.replace('</main>', f'{page_content}</main>')
            elif '</body>' in result:
                result = result.replace('</body>', f'{page_content}</body>')
        
        return result
    
    def fix_asset_paths(self, html: str) -> str:
        """Fix relative asset paths to use theme asset URL."""
        theme_name = self.theme_root.name
        asset_base = f"/api/themes/{theme_name}/assets"
        
        # Fix various relative path formats
        replacements = [
            (r'href="css/', f'href="{asset_base}/css/'),
            (r"href='css/", f"href='{asset_base}/css/"),
            (r'href="js/', f'href="{asset_base}/js/'),
            (r"href='js/", f"href='{asset_base}/js/"),
            (r'src="js/', f'src="{asset_base}/js/'),
            (r"src='js/", f"src='{asset_base}/js/"),
            (r'src="images/', f'src="{asset_base}/images/'),
            (r"src='images/", f"src='{asset_base}/images/"),
            (r'src="img/', f'src="{asset_base}/img/'),
            (r"src='img/", f"src='{asset_base}/img/"),
            (r'src="fonts/', f'src="{asset_base}/fonts/'),
            (r"src='fonts/", f"src='{asset_base}/fonts/"),
            (r'url\(css/', f'url({asset_base}/css/'),
            (r'url\(images/', f'url({asset_base}/images/'),
            (r'url\(fonts/', f'url({asset_base}/fonts/'),
            # Maropost-style asset tags
            (r'\[%ntheme_asset%\]', f'{asset_base}/'),
            (r'\[%/ntheme_asset%\]', ''),
        ]
        
        for pattern, replacement in replacements:
            html = re.sub(pattern, replacement, html)
        
        return html
    
    def invalidate_cache(self, file_path: Optional[Path] = None) -> None:
        """
        Invalidate template cache.
        
        Args:
            file_path: Specific file to invalidate, or None for all
        """
        self.template_cache.invalidate(file_path)
        self.render_cache.invalidate()


# ==================== FACTORY FUNCTION ====================

def create_engine(theme_path: Path, db_instance, debug: bool = False) -> MaropostTemplateEngine:
    """
    Factory function to create a template engine instance.
    
    Args:
        theme_path: Path to the theme directory
        db_instance: Database instance
        debug: Enable debug mode
    
    Returns:
        Configured MaropostTemplateEngine instance
    """
    return MaropostTemplateEngine(theme_path, db_instance, debug_mode=debug)
