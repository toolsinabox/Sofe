"""
Pydantic models/schemas for the e-commerce platform
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone


# ==================== CATEGORY MODELS ====================

class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = ""
    image: Optional[str] = ""
    parent_id: Optional[str] = None
    is_active: bool = True
    sort_order: int = 0

class CategoryCreate(CategoryBase):
    pass

class Category(CategoryBase):
    id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ==================== PRODUCT MODELS ====================

class ProductBase(BaseModel):
    # === BASIC INFO ===
    name: str
    sku: str = ""
    barcode: Optional[str] = ""
    description: Optional[str] = ""
    short_description: Optional[str] = ""
    
    # === PRICING ===
    price: float = 0
    compare_price: Optional[float] = None
    cost_price: Optional[float] = None
    
    # === INVENTORY ===
    stock: int = 0
    low_stock_threshold: int = 5
    track_inventory: bool = True
    allow_backorder: bool = False
    
    # === CATEGORIZATION ===
    category_id: Optional[str] = None
    categories: List[str] = []
    tags: List[str] = []
    brand: Optional[str] = ""
    
    # === MEDIA ===
    images: List[str] = []
    thumbnail: Optional[str] = ""
    
    # === DIMENSIONS & WEIGHT ===
    weight: Optional[float] = None
    weight_unit: str = "kg"
    dimensions: Optional[Dict[str, float]] = None
    
    # === STATUS FLAGS ===
    is_active: bool = True
    is_featured: bool = False
    on_sale: bool = False
    is_new: bool = False
    
    # === SEO ===
    meta_title: Optional[str] = ""
    meta_description: Optional[str] = ""
    slug: Optional[str] = ""
    
    # === VARIANTS ===
    has_variants: bool = False
    variants: List[Dict] = []
    options: List[Dict] = []
    
    # === PRE-ORDER ===
    allow_preorder: bool = False
    preorder_message: Optional[str] = ""
    preorder_date: Optional[str] = None

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    compare_price: Optional[float] = None
    stock: Optional[int] = None
    category_id: Optional[str] = None
    categories: Optional[List[str]] = None
    images: Optional[List[str]] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None
    on_sale: Optional[bool] = None
    tags: Optional[List[str]] = None
    brand: Optional[str] = None
    weight: Optional[float] = None
    has_variants: Optional[bool] = None
    variants: Optional[List[Dict]] = None
    options: Optional[List[Dict]] = None
    allow_preorder: Optional[bool] = None
    preorder_message: Optional[str] = None
    preorder_date: Optional[str] = None

class Product(ProductBase):
    id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ==================== ORDER MODELS ====================

class OrderItemBase(BaseModel):
    product_id: str
    name: str
    sku: Optional[str] = ""
    price: float
    quantity: int
    image: Optional[str] = ""

class OrderBase(BaseModel):
    customer_name: str
    customer_email: str
    customer_phone: Optional[str] = ""
    shipping_address: Optional[Dict[str, str]] = None
    billing_address: Optional[Dict[str, str]] = None
    items: List[OrderItemBase]
    subtotal: float
    shipping: float = 0
    tax: float = 0
    total: float
    status: str = "pending"
    payment_status: str = "pending"
    notes: Optional[str] = ""

class OrderCreate(OrderBase):
    pass

class Order(OrderBase):
    id: str
    order_number: str
    fulfillment_status: str = "unfulfilled"
    tracking_carrier: Optional[str] = None
    tracking_number: Optional[str] = None
    email_history: List[Dict] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ==================== QUOTE MODELS ====================

class QuoteBase(BaseModel):
    customer_name: str
    customer_email: str
    customer_phone: Optional[str] = ""
    customer_company: Optional[str] = ""
    customer_po: Optional[str] = ""
    shipping_address: Optional[Dict[str, str]] = None
    items: List[OrderItemBase]
    subtotal: float
    tax: float = 0
    total: float
    status: str = "pending"
    notes: Optional[str] = ""
    internal_notes: Optional[str] = ""
    valid_days: int = 30

class QuoteCreate(QuoteBase):
    pass

class Quote(QuoteBase):
    id: str
    quote_number: str
    valid_until: datetime = None
    converted_order_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class QuoteUpdate(BaseModel):
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_company: Optional[str] = None
    items: Optional[List[OrderItemBase]] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    internal_notes: Optional[str] = None


# ==================== CUSTOMER MODELS ====================

class CustomerBase(BaseModel):
    email: str
    first_name: str = ""
    last_name: str = ""
    phone: Optional[str] = ""
    company: Optional[str] = ""
    address: Optional[Dict[str, str]] = None
    notes: Optional[str] = ""
    tags: List[str] = []
    is_active: bool = True

class CustomerCreate(CustomerBase):
    password: Optional[str] = None

class CustomerUpdate(BaseModel):
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    address: Optional[Dict[str, str]] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    is_active: Optional[bool] = None

class Customer(CustomerBase):
    id: str
    total_orders: int = 0
    total_spent: float = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ==================== BANNER MODELS ====================

class HeroBanner(BaseModel):
    id: str = ""
    name: str = ""
    title: str = ""
    subtitle: Optional[str] = ""
    image: str = ""
    image_desktop: Optional[str] = ""
    image_tablet: Optional[str] = ""
    image_mobile: Optional[str] = ""
    show_on_mobile: bool = True
    link: Optional[str] = ""
    button_text: Optional[str] = ""
    show_button: bool = True
    overlay_opacity: float = 0.3
    text_position: str = "center"
    text_color: str = "#ffffff"
    is_active: bool = True
    sort_order: int = 0
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BannerUpdate(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    subtitle: Optional[str] = None
    image: Optional[str] = None
    image_desktop: Optional[str] = None
    image_tablet: Optional[str] = None
    image_mobile: Optional[str] = None
    show_on_mobile: Optional[bool] = None
    link: Optional[str] = None
    button_text: Optional[str] = None
    show_button: Optional[bool] = None
    overlay_opacity: Optional[float] = None
    text_position: Optional[str] = None
    text_color: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


# ==================== CONTENT ZONE MODELS ====================

class ContentBlockType:
    TEXT = "text"
    IMAGE = "image"
    VIDEO = "video"
    HTML = "html"
    PRODUCT_GRID = "product_grid"
    CATEGORY_GRID = "category_grid"
    BANNER = "banner"

class ContentBlock(BaseModel):
    id: str = ""
    type: str = ContentBlockType.TEXT
    title: Optional[str] = ""
    content: Optional[str] = ""
    image: Optional[str] = ""
    link: Optional[str] = ""
    settings: Dict[str, Any] = {}
    sort_order: int = 0
    is_active: bool = True

class ContentZone(BaseModel):
    id: str = ""
    name: str
    identifier: str
    description: Optional[str] = ""
    blocks: List[ContentBlock] = []
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ContentZoneCreate(BaseModel):
    name: str
    identifier: str
    description: Optional[str] = ""
    blocks: List[ContentBlock] = []
    is_active: bool = True

class ContentZoneUpdate(BaseModel):
    name: Optional[str] = None
    identifier: Optional[str] = None
    description: Optional[str] = None
    blocks: Optional[List[ContentBlock]] = None
    is_active: Optional[bool] = None


# ==================== STORE SETTINGS MODELS ====================

class StoreSettings(BaseModel):
    id: str = "store_settings"
    store_name: str = "My Store"
    store_logo: Optional[str] = ""
    store_favicon: Optional[str] = ""
    homepage_title: str = "Welcome to My Store"
    store_url: Optional[str] = ""
    store_email: Optional[str] = ""
    store_phone: Optional[str] = ""
    store_address: Optional[str] = ""
    currency: str = "AUD"
    currency_symbol: str = "$"
    tax_rate: float = 10.0
    tax_included: bool = True
    google_analytics_id: Optional[str] = None
    facebook_pixel_id: Optional[str] = None
    social_links: Dict[str, str] = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StoreSettingsUpdate(BaseModel):
    store_name: Optional[str] = None
    store_logo: Optional[str] = None
    store_favicon: Optional[str] = None
    homepage_title: Optional[str] = None
    store_url: Optional[str] = None
    store_email: Optional[str] = None
    store_phone: Optional[str] = None
    store_address: Optional[str] = None
    currency: Optional[str] = None
    currency_symbol: Optional[str] = None
    tax_rate: Optional[float] = None
    tax_included: Optional[bool] = None
    google_analytics_id: Optional[str] = None
    facebook_pixel_id: Optional[str] = None
    social_links: Optional[Dict[str, str]] = None


# ==================== USER/AUTH MODELS ====================

class UserBase(BaseModel):
    email: str
    name: str = ""
    role: str = "merchant"

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class User(UserBase):
    id: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User

class UserUpdate(BaseModel):
    email: Optional[str] = None
    name: Optional[str] = None
    password: Optional[str] = None


# ==================== REVIEW MODELS ====================

class ProductReview(BaseModel):
    id: str = ""
    product_id: str
    customer_id: Optional[str] = None
    customer_name: str
    customer_email: str
    rating: int
    title: Optional[str] = ""
    content: str
    is_verified: bool = False
    is_approved: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductReviewCreate(BaseModel):
    product_id: str
    customer_name: str
    customer_email: str
    rating: int
    title: Optional[str] = ""
    content: str

class ProductReviewUpdate(BaseModel):
    rating: Optional[int] = None
    title: Optional[str] = None
    content: Optional[str] = None
    is_approved: Optional[bool] = None


# ==================== SHIPPING MODELS ====================

class ShippingRate(BaseModel):
    id: str = ""
    name: str
    description: Optional[str] = ""
    price: float
    min_weight: Optional[float] = None
    max_weight: Optional[float] = None
    min_order: Optional[float] = None
    max_order: Optional[float] = None
    is_active: bool = True

class ShippingZone(BaseModel):
    id: str = ""
    name: str
    countries: List[str] = []
    states: List[str] = []
    postcodes: List[str] = []
    rates: List[ShippingRate] = []
    is_active: bool = True

class ShippingZoneCreate(BaseModel):
    name: str
    countries: List[str] = []
    states: List[str] = []
    postcodes: List[str] = []
    rates: List[ShippingRate] = []

class ShippingZoneUpdate(BaseModel):
    name: Optional[str] = None
    countries: Optional[List[str]] = None
    states: Optional[List[str]] = None
    postcodes: Optional[List[str]] = None
    rates: Optional[List[ShippingRate]] = None
    is_active: Optional[bool] = None


# ==================== ABANDONED CART MODELS ====================

class AbandonedCart(BaseModel):
    id: str = ""
    customer_email: str
    customer_name: Optional[str] = ""
    items: List[Dict] = []
    subtotal: float = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    recovery_emails_sent: int = 0
    last_email_sent: Optional[datetime] = None
    is_recovered: bool = False
    recovered_order_id: Optional[str] = None

class AbandonedCartRecoveryEmail(BaseModel):
    email_type: str = "reminder"
    subject: Optional[str] = None
    discount_code: Optional[str] = None


# ==================== SEO MODELS ====================

class SEOSettings(BaseModel):
    id: str = ""
    page_type: str
    page_id: Optional[str] = None
    meta_title: str = ""
    meta_description: str = ""
    meta_keywords: List[str] = []
    og_title: Optional[str] = ""
    og_description: Optional[str] = ""
    og_image: Optional[str] = ""
    canonical_url: Optional[str] = ""
    robots: str = "index, follow"
    schema_markup: Optional[Dict] = None

class SEOSettingsUpdate(BaseModel):
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    meta_keywords: Optional[List[str]] = None
    og_title: Optional[str] = None
    og_description: Optional[str] = None
    og_image: Optional[str] = None
    canonical_url: Optional[str] = None
    robots: Optional[str] = None
    schema_markup: Optional[Dict] = None

class GlobalSEOSettings(BaseModel):
    id: str = "global_seo"
    default_title_suffix: str = ""
    default_meta_description: str = ""
    google_site_verification: Optional[str] = None
    bing_site_verification: Optional[str] = None
    robots_txt: str = "User-agent: *\nAllow: /"
    sitemap_enabled: bool = True


# ==================== CMS PAGE MODELS ====================

class CMSPage(BaseModel):
    id: str = ""
    title: str
    slug: str
    content: str = ""
    template: str = "default"
    meta_title: Optional[str] = ""
    meta_description: Optional[str] = ""
    is_published: bool = True
    show_in_navigation: bool = False
    navigation_order: int = 0
    parent_id: Optional[str] = None
    featured_image: Optional[str] = ""
    custom_css: Optional[str] = ""
    custom_js: Optional[str] = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CMSPageCreate(BaseModel):
    title: str
    slug: str
    content: str = ""
    template: str = "default"
    meta_title: Optional[str] = ""
    meta_description: Optional[str] = ""
    is_published: bool = True
    show_in_navigation: bool = False
    navigation_order: int = 0
    parent_id: Optional[str] = None
    featured_image: Optional[str] = ""
    custom_css: Optional[str] = ""
    custom_js: Optional[str] = ""

class CMSPageUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    content: Optional[str] = None
    template: Optional[str] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    is_published: Optional[bool] = None
    show_in_navigation: Optional[bool] = None
    navigation_order: Optional[int] = None
    parent_id: Optional[str] = None
    featured_image: Optional[str] = None
    custom_css: Optional[str] = None
    custom_js: Optional[str] = None


# ==================== MEGA MENU MODELS ====================

class MegaMenuItem(BaseModel):
    id: str = ""
    label: str
    link: str = ""
    image: Optional[str] = ""
    description: Optional[str] = ""

class MegaMenuColumn(BaseModel):
    title: str = ""
    items: List[MegaMenuItem] = []
    width: int = 1

class MegaMenu(BaseModel):
    id: str = ""
    name: str
    label: str
    link: str = ""
    columns: List[MegaMenuColumn] = []
    featured_image: Optional[str] = ""
    featured_title: Optional[str] = ""
    featured_link: Optional[str] = ""
    is_active: bool = True
    sort_order: int = 0

class MegaMenuUpdate(BaseModel):
    name: Optional[str] = None
    label: Optional[str] = None
    link: Optional[str] = None
    columns: Optional[List[MegaMenuColumn]] = None
    featured_image: Optional[str] = None
    featured_title: Optional[str] = None
    featured_link: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


# ==================== DISCOUNT MODELS ====================

class Discount(BaseModel):
    id: str = ""
    code: str
    type: str = "percentage"  # percentage, fixed, free_shipping
    value: float = 0
    min_purchase: float = 0
    max_uses: Optional[int] = None
    uses: int = 0
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_active: bool = True
    applies_to: str = "all"  # all, products, categories
    product_ids: List[str] = []
    category_ids: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DiscountCreate(BaseModel):
    code: str
    type: str = "percentage"
    value: float = 0
    min_purchase: float = 0
    max_uses: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    applies_to: str = "all"
    product_ids: List[str] = []
    category_ids: List[str] = []

class DiscountUpdate(BaseModel):
    code: Optional[str] = None
    type: Optional[str] = None
    value: Optional[float] = None
    min_purchase: Optional[float] = None
    max_uses: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_active: Optional[bool] = None
    applies_to: Optional[str] = None
    product_ids: Optional[List[str]] = None
    category_ids: Optional[List[str]] = None
