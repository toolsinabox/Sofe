from fastapi import FastAPI, APIRouter, HTTPException, Query, UploadFile, File, Form, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse, HTMLResponse, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.requests import Request
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import aiofiles
import re
import json
import io
import zipfile
import shutil
import secrets
from jose import JWTError, jwt
from passlib.context import CryptContext
from maropost_engine import MaropostTemplateEngine as NewMaropostEngine, PageType, WrapperContext, create_engine
import stripe

# PDF Generation - imported from utils module
from utils.pdf import PDFGenerator

# Email Service
from email_service import (
    send_welcome_email,
    send_password_reset_email,
    send_order_confirmation_email,
    send_shipping_notification_email,
    send_domain_verified_email,
    is_email_configured
)

# Import route modules
from routes.auth import router as auth_router
from routes.shipping import router as shipping_router
from routes import addons as addons_module
from routes import ebay as ebay_module
from routes import import_export as import_export_module
from routes import marketing as marketing_module
from routes import analytics as analytics_module
from routes import operations as operations_module
from routes import customer_management as customer_management_module
from routes import blog as blog_module
from routes import abandoned_carts as abandoned_carts_module
from routes import custom_fields as custom_fields_module
from routes import template_tags as template_tags_module
from routes import platform as platform_module

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Stripe configuration
stripe.api_key = os.environ.get('STRIPE_API_KEY', '')

# Create uploads directory
UPLOADS_DIR = ROOT_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)
(UPLOADS_DIR / "logos").mkdir(exist_ok=True)
(UPLOADS_DIR / "banners").mkdir(exist_ok=True)
(UPLOADS_DIR / "products").mkdir(exist_ok=True)
(UPLOADS_DIR / "favicons").mkdir(exist_ok=True)

# Create theme directory
THEME_DIR = ROOT_DIR / "theme"
THEME_DIR.mkdir(exist_ok=True)

# Create themes directory for multiple themes
THEMES_DIR = ROOT_DIR / "themes"
THEMES_DIR.mkdir(exist_ok=True)

# JWT Settings
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'maropost-clone-super-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# PDFGenerator is imported from utils.pdf

# ==================== MODELS ====================

class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    image: Optional[str] = None
    parent_id: Optional[str] = None
    is_active: bool = True
    sort_order: int = 0

class CategoryCreate(CategoryBase):
    pass

class Category(CategoryBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductBase(BaseModel):
    # === BASIC INFO ===
    name: str  # [@product_name@]
    subtitle: Optional[str] = None  # [@product_subtitle@]
    description: Optional[str] = None  # [@product_description@]
    short_description: Optional[str] = None  # [@product_short_description@]
    
    # === PRICING ===
    price: float  # [@product_price@], [@product_price_formatted@]
    compare_price: Optional[float] = None  # [@product_compare_price@], [@product_rrp@]
    cost_price: Optional[float] = None  # [@product_cost@]
    tax_class: Optional[str] = "standard"  # [@product_tax_class@]
    
    # === IDENTIFICATION ===
    sku: str  # [@product_sku@]
    barcode: Optional[str] = None  # [@product_barcode@], [@product_upc@]
    mpn: Optional[str] = None  # [@product_mpn@] Manufacturer Part Number
    
    # === CATEGORIZATION ===
    category_id: Optional[str] = None  # [@product_category@] - Primary category (backward compatibility)
    category_ids: List[str] = []  # Multiple categories support
    brand: Optional[str] = None  # [@product_brand@]
    manufacturer: Optional[str] = None  # [@product_manufacturer@]
    tags: List[str] = []  # [@product_tags@]
    
    # === IMAGES ===
    images: List[str] = []  # [@product_image@], [@product_images@]
    thumbnail: Optional[str] = None  # [@product_thumbnail@]
    
    # === INVENTORY ===
    stock: int = 0  # [@product_stock@], [@product_qty@]
    low_stock_threshold: int = 10  # [@product_low_stock@]
    track_inventory: bool = True  # [@product_track_inventory@]
    allow_backorder: bool = False  # [@product_backorder@]
    
    # === PRE-ORDER ===
    preorder_enabled: bool = False  # [@product_preorder@] - Enable pre-order when out of stock
    preorder_qty: int = 0  # [@product_preorder_qty@] - Quantity arriving
    preorder_arrival_date: Optional[str] = None  # [@product_preorder_date@] - Expected arrival date (YYYY-MM-DD)
    preorder_message: Optional[str] = None  # [@product_preorder_message@] - Custom pre-order message
    
    # === SHIPPING ===
    weight: Optional[float] = None  # [@product_weight@] in kg - actual product weight
    length: Optional[float] = None  # [@product_length@] in cm - product dimensions
    width: Optional[float] = None  # [@product_width@] in cm
    height: Optional[float] = None  # [@product_height@] in cm
    # Shipping dimensions (for cubic weight calculation)
    shipping_length: Optional[float] = None  # [@product_shipping_length@] in cm - shipping box length
    shipping_width: Optional[float] = None  # [@product_shipping_width@] in cm - shipping box width
    shipping_height: Optional[float] = None  # [@product_shipping_height@] in cm - shipping box height
    shipping_class: Optional[str] = None  # [@product_shipping_class@]
    requires_shipping: bool = True  # [@product_requires_shipping@]
    
    # === SEO ===
    meta_title: Optional[str] = None  # [@product_meta_title@]
    meta_description: Optional[str] = None  # [@product_meta_description@]
    url_slug: Optional[str] = None  # [@product_url@], [@product_slug@]
    
    # === VISIBILITY ===
    is_active: bool = True  # [@product_active@]
    is_featured: bool = False  # [@product_featured@]
    visibility: str = "visible"  # [@product_visibility@] visible, hidden, search_only
    
    # === REVIEWS ===
    rating: float = 0  # [@product_rating@]
    reviews_count: int = 0  # [@product_reviews_count@]
    
    # === VARIANTS ===
    has_variants: bool = False  # [@product_has_variants@]
    variant_options: List[Dict[str, Any]] = []  # color, size, etc.
    
    # === CUSTOM FIELDS ===
    custom_fields: Dict[str, Any] = {}  # For extensibility

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    subtitle: Optional[str] = None
    description: Optional[str] = None
    short_description: Optional[str] = None
    price: Optional[float] = None
    compare_price: Optional[float] = None
    cost_price: Optional[float] = None
    tax_class: Optional[str] = None
    sku: Optional[str] = None
    barcode: Optional[str] = None
    mpn: Optional[str] = None
    category_id: Optional[str] = None
    category_ids: Optional[List[str]] = None  # Multiple categories support
    brand: Optional[str] = None
    manufacturer: Optional[str] = None
    tags: Optional[List[str]] = None
    images: Optional[List[str]] = None
    thumbnail: Optional[str] = None
    stock: Optional[int] = None
    low_stock_threshold: Optional[int] = None
    track_inventory: Optional[bool] = None
    allow_backorder: Optional[bool] = None
    # Pre-order fields
    preorder_enabled: Optional[bool] = None
    preorder_qty: Optional[int] = None
    preorder_arrival_date: Optional[str] = None
    preorder_message: Optional[str] = None
    # Shipping fields
    weight: Optional[float] = None
    length: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    shipping_length: Optional[float] = None  # Shipping box dimensions for cubic weight
    shipping_width: Optional[float] = None
    shipping_height: Optional[float] = None
    shipping_class: Optional[str] = None
    requires_shipping: Optional[bool] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    url_slug: Optional[str] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None
    visibility: Optional[str] = None
    has_variants: Optional[bool] = None
    variant_options: Optional[List[Dict[str, Any]]] = None
    custom_fields: Optional[Dict[str, Any]] = None

class Product(ProductBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))  # [@product_id@]
    sales_count: int = 0  # [@product_sales@]
    views_count: int = 0  # [@product_views@]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))  # [@product_created@]
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))  # [@product_updated@]

class OrderItemBase(BaseModel):
    product_id: str
    product_name: str
    price: float
    quantity: int
    image: Optional[str] = None

class OrderBase(BaseModel):
    customer_name: str
    customer_email: str
    customer_phone: Optional[str] = None
    shipping_address: str
    items: List[OrderItemBase]
    subtotal: float
    shipping: float
    tax: float
    total: float
    payment_method: str = "card"

class OrderCreate(OrderBase):
    pass

class Order(OrderBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str = Field(default_factory=lambda: f"ORD-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}")
    status: str = "pending"  # pending, processing, shipped, delivered, cancelled
    payment_status: str = "pending"  # pending, paid, refunded
    payment_intent_id: Optional[str] = None  # Stripe payment intent ID
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== RETURNS/REFUNDS ====================

class ReturnItem(BaseModel):
    product_id: str
    product_name: str
    sku: Optional[str] = None
    quantity: int
    price: float
    reason: str  # defective, wrong_item, not_as_described, changed_mind, other

class ReturnRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    return_number: str = Field(default_factory=lambda: f"RET-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}")
    order_id: str
    order_number: str
    customer_id: Optional[str] = None
    customer_name: str
    customer_email: str
    items: List[ReturnItem]
    reason: str  # Main reason for return
    description: Optional[str] = None  # Customer's explanation
    status: str = "pending"  # pending, approved, rejected, received, refunded, closed
    refund_amount: float = 0
    refund_method: str = "original"  # original, store_credit, bank_transfer
    refund_status: str = "pending"  # pending, processing, completed
    shipping_label: Optional[str] = None
    tracking_number: Optional[str] = None
    merchant_notes: Optional[str] = None
    images: List[str] = []  # Customer uploaded images
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    received_at: Optional[datetime] = None
    refunded_at: Optional[datetime] = None

# ==================== QUOTES ====================

class QuoteBase(BaseModel):
    customer_name: str
    customer_email: str
    customer_phone: Optional[str] = None
    company_name: Optional[str] = None
    shipping_address: str
    billing_address: Optional[str] = None
    items: List[OrderItemBase]
    subtotal: float
    shipping: float
    tax: float
    total: float
    notes: Optional[str] = None
    purchase_order: Optional[str] = None  # Customer's PO number

class QuoteCreate(QuoteBase):
    pass

class Quote(QuoteBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    quote_number: str = Field(default_factory=lambda: f"QTE-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}")
    status: str = "pending"  # pending, sent, accepted, rejected, expired, converted
    valid_until: Optional[datetime] = None  # Quote expiry date
    converted_order_id: Optional[str] = None  # If converted to order
    merchant_notes: Optional[str] = None  # Internal notes
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class QuoteUpdate(BaseModel):
    status: Optional[str] = None
    merchant_notes: Optional[str] = None
    valid_until: Optional[str] = None
    items: Optional[List[OrderItemBase]] = None
    subtotal: Optional[float] = None
    shipping: Optional[float] = None
    tax: Optional[float] = None
    total: Optional[float] = None

class CustomerBase(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = "USA"

class CustomerCreate(CustomerBase):
    password: Optional[str] = None

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None
    status: Optional[str] = None

class Customer(CustomerBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    total_orders: int = 0
    total_spent: float = 0
    status: str = "active"  # active, vip, inactive
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class HeroBanner(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    # Internal identification name (optional with fallback to title)
    name: Optional[str] = None
    # Display elements (all optional)
    title: Optional[str] = None
    subtitle: Optional[str] = None
    # Legacy single image field (for backwards compatibility)
    image: Optional[str] = None
    # Device-specific images
    image_desktop: Optional[str] = None
    image_tablet: Optional[str] = None
    image_mobile: Optional[str] = None
    # Device visibility toggles
    show_on_desktop: bool = True
    show_on_tablet: bool = True
    show_on_mobile: bool = True
    # Button/link options (optional)
    link: Optional[str] = None
    button_text: Optional[str] = None
    button_style: Optional[str] = "primary"  # primary, secondary, outline
    show_button: bool = False
    # Text styling
    show_title: bool = True
    show_subtitle: bool = True
    text_color: Optional[str] = "#FFFFFF"
    text_position: Optional[str] = "left"  # left, center, right
    overlay_color: Optional[str] = "rgba(0,0,0,0.3)"
    overlay_enabled: bool = True
    # Status
    is_active: bool = True
    sort_order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BannerUpdate(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    subtitle: Optional[str] = None
    image: Optional[str] = None
    image_desktop: Optional[str] = None
    image_tablet: Optional[str] = None
    image_mobile: Optional[str] = None
    show_on_desktop: Optional[bool] = None
    show_on_tablet: Optional[bool] = None
    show_on_mobile: Optional[bool] = None
    link: Optional[str] = None
    button_text: Optional[str] = None
    button_style: Optional[str] = None
    show_button: Optional[bool] = None
    show_title: Optional[bool] = None
    show_subtitle: Optional[bool] = None
    text_color: Optional[str] = None
    text_position: Optional[str] = None
    overlay_color: Optional[str] = None
    overlay_enabled: Optional[bool] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None

# ==================== CONTENT ZONES ====================

class ContentBlockType:
    """Available content block types"""
    HTML = "html"
    TEXT = "text"
    IMAGE = "image"
    PRODUCT_GRID = "product_grid"
    CATEGORY_GRID = "category_grid"
    BANNER = "banner"
    VIDEO = "video"
    SPACER = "spacer"
    DIVIDER = "divider"
    CUSTOM = "custom"

class ContentBlock(BaseModel):
    """Individual content block within a zone"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # html, text, image, product_grid, category_grid, banner, video, spacer, divider, custom
    title: Optional[str] = None  # Internal label
    content: Optional[str] = None  # HTML/text content
    settings: Dict[str, Any] = {}  # Type-specific settings
    # Settings examples:
    # - product_grid: {"limit": 4, "category_id": "xxx", "show_price": true, "columns": 4}
    # - image: {"src": "url", "alt": "text", "link": "url", "width": "100%"}
    # - video: {"src": "youtube_url", "autoplay": false}
    # - spacer: {"height": "50px"}
    is_active: bool = True
    sort_order: int = 0

class ContentZone(BaseModel):
    """Content zone that can contain multiple content blocks"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str  # Unique identifier used in templates: [%content_zone name:'homepage_main'%]
    label: str  # Display name in admin: "Homepage Main Content"
    description: Optional[str] = None
    page: str = "home"  # Which page this zone belongs to: home, product, category, cart, etc.
    blocks: List[ContentBlock] = []
    is_active: bool = True
    show_on_desktop: bool = True
    show_on_tablet: bool = True
    show_on_mobile: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ContentZoneCreate(BaseModel):
    name: str
    label: str
    description: Optional[str] = None
    page: str = "home"
    blocks: List[ContentBlock] = []
    is_active: bool = True
    show_on_desktop: bool = True
    show_on_tablet: bool = True
    show_on_mobile: bool = True

class ContentZoneUpdate(BaseModel):
    name: Optional[str] = None
    label: Optional[str] = None
    description: Optional[str] = None
    page: Optional[str] = None
    blocks: Optional[List[ContentBlock]] = None
    is_active: Optional[bool] = None
    show_on_desktop: Optional[bool] = None
    show_on_tablet: Optional[bool] = None
    show_on_mobile: Optional[bool] = None

# ==================== STORE SETTINGS ====================

class StoreSettings(BaseModel):
    id: str = "store_settings"
    store_name: str = "Fashion Hub"
    store_email: str = "contact@fashionhub.com"
    store_phone: str = "1800 123 456"
    store_url: str = ""
    store_logo: Optional[str] = None
    store_favicon: Optional[str] = None
    currency: str = "USD"
    currency_symbol: str = "$"
    store_address: Optional[str] = None
    store_city: Optional[str] = None
    store_state: Optional[str] = None
    store_zip: Optional[str] = None
    store_country: str = "USA"
    store_facebook: Optional[str] = None
    store_instagram: Optional[str] = None
    store_twitter: Optional[str] = None
    store_youtube: Optional[str] = None
    store_tiktok: Optional[str] = None
    free_shipping_threshold: float = 50.0
    tax_rate: float = 0.08
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    google_analytics_id: Optional[str] = None
    # Order number settings
    order_prefix: str = "ORD"
    order_number_start: int = 1001
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StoreSettingsUpdate(BaseModel):
    store_name: Optional[str] = None
    store_email: Optional[str] = None
    store_phone: Optional[str] = None
    store_url: Optional[str] = None
    store_logo: Optional[str] = None
    store_favicon: Optional[str] = None
    currency: Optional[str] = None
    currency_symbol: Optional[str] = None
    store_address: Optional[str] = None
    store_city: Optional[str] = None
    store_state: Optional[str] = None
    store_zip: Optional[str] = None
    store_country: Optional[str] = None
    store_facebook: Optional[str] = None
    store_instagram: Optional[str] = None
    store_twitter: Optional[str] = None
    store_youtube: Optional[str] = None
    store_tiktok: Optional[str] = None
    free_shipping_threshold: Optional[float] = None
    tax_rate: Optional[float] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    google_analytics_id: Optional[str] = None
    # Order number settings
    order_prefix: Optional[str] = None
    order_number_start: Optional[int] = None

# ==================== AUTH MODELS ====================

class UserBase(BaseModel):
    email: str
    name: str
    role: str = "merchant"  # admin, merchant

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class User(UserBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    hashed_password: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class UserUpdate(BaseModel):
    email: Optional[str] = None
    name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

# ==================== WEBSITE/MERCHANT MODELS ====================

class WebsiteBase(BaseModel):
    name: str
    url: Optional[str] = None
    email: str
    plan: str = "Starter"  # Starter, Professional, Enterprise
    status: str = "active"  # active, suspended
    owner_id: Optional[str] = None
    logo: Optional[str] = None

class WebsiteCreate(WebsiteBase):
    pass

class WebsiteUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    email: Optional[str] = None
    plan: Optional[str] = None
    status: Optional[str] = None
    owner_id: Optional[str] = None
    logo: Optional[str] = None
    revenue: Optional[float] = None
    orders: Optional[int] = None
    products: Optional[int] = None
    customers: Optional[int] = None

class Website(WebsiteBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    revenue: float = 0.0
    orders: int = 0
    products: int = 0
    customers: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== AUTH HELPERS ====================

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Verify JWT token and return current user"""
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        
        # Check if this is an admin token
        is_admin = payload.get("is_admin", False)
        role = payload.get("role")
        email = payload.get("email")
        store_id = payload.get("store_id")
        
    except JWTError:
        raise credentials_exception
    
    # If admin token, check admins collection
    if is_admin or role == "admin":
        admin = await db.admins.find_one({"id": user_id})
        if admin:
            return {
                "id": admin["id"],
                "email": admin["email"],
                "name": admin.get("name", "Admin"),
                "role": "admin"
            }
    
    # Try users collection
    user = await db.users.find_one({"id": user_id})
    if user:
        return {
            "id": user["id"],
            "email": user["email"],
            "name": user.get("name", ""),
            "role": user.get("role", "user"),
            "store_id": user.get("store_id") or store_id
        }
    
    # Try platform_owners collection
    owner = await db.platform_owners.find_one({"id": user_id})
    if owner:
        return {
            "id": owner["id"],
            "email": owner["email"],
            "name": owner.get("name", ""),
            "role": "merchant",
            "store_id": store_id or owner.get("stores", [None])[0]
        }
    
    raise credentials_exception

async def get_current_active_user(current_user: dict = Depends(get_current_user)) -> dict:
    return current_user

async def get_admin_user(current_user: dict = Depends(get_current_user)) -> dict:
    """Verify user is an admin"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# ==================== MULTI-TENANT STORE CONTEXT ====================

# Default store ID for backward compatibility (Tools In A Box)
DEFAULT_STORE_ID = "675b5810-f110-42f0-9cac-00cf353f04a5"

async def resolve_store_from_request(request: Request) -> str:
    """
    Resolve store_id from multiple sources in priority order:
    1. X-Store-ID header (explicit)
    2. Subdomain from Host header (e.g., toolsinabox.getcelora.com)
    3. Custom domain lookup (e.g., www.mystore.com)
    4. Default store (fallback)
    
    Supported domain patterns for getcelora.com:
    - toolsinabox.getcelora.com -> subdomain = "toolsinabox"
    - www.getcelora.com -> main platform (default store)
    - getcelora.com -> main platform (default store)
    """
    # Priority 1: Explicit header
    store_id = request.headers.get("X-Store-ID")
    if store_id:
        store = await db.platform_stores.find_one({"id": store_id})
        if store:
            return store_id
    
    # Priority 2: Subdomain from Host header
    host = request.headers.get("Host", "").lower()
    if host:
        # Remove port if present (for local development)
        host_without_port = host.split(":")[0]
        
        # Check if this is a getcelora.com subdomain
        if host_without_port.endswith(".getcelora.com"):
            # Extract subdomain (e.g., "toolsinabox" from "toolsinabox.getcelora.com")
            subdomain = host_without_port.replace(".getcelora.com", "")
            # Skip www, api, admin - these are reserved
            if subdomain and subdomain not in ["www", "api", "admin", "store", "app"]:
                store = await db.platform_stores.find_one({"subdomain": subdomain})
                if store:
                    return store["id"]
        
        # Generic subdomain check for other domains (legacy support)
        parts = host_without_port.split(".")
        if len(parts) >= 3 and not host_without_port.endswith(".getcelora.com"):
            subdomain = parts[0]
            if subdomain not in ["www", "api", "admin"]:
                store = await db.platform_stores.find_one({"subdomain": subdomain})
                if store:
                    return store["id"]
        
        # Priority 3: Custom domain lookup (e.g., www.customstore.com)
        store = await db.platform_stores.find_one({
            "custom_domain": host_without_port,
            "custom_domain_verified": True
        })
        if store:
            return store["id"]
    
    # Priority 4: Default store
    return DEFAULT_STORE_ID

async def get_store_id_from_header(request: Request) -> str:
    """
    Extract store_id from X-Store-ID header or resolve from subdomain/domain.
    """
    return await resolve_store_from_request(request)

async def get_store_context(request: Request) -> dict:
    """
    Get the current store context including store_id and store details.
    Used by endpoints that need store-specific data.
    """
    store_id = await get_store_id_from_header(request)
    store = await db.platform_stores.find_one({"id": store_id}, {"_id": 0})
    return {
        "store_id": store_id,
        "store": store
    }

def add_store_filter(query: dict, store_id: str) -> dict:
    """Add store_id filter to a query dict"""
    query["store_id"] = store_id
    return query

# ==================== THEME TEMPLATES ====================

class ThemeTemplate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str  # e.g., "header", "footer", "homepage", "product-page"
    display_name: str
    content: str  # HTML/template content with Maropost-style tags
    is_active: bool = True
    template_type: str = "partial"  # partial, page, layout
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ThemeTemplateUpdate(BaseModel):
    name: Optional[str] = None
    display_name: Optional[str] = None
    content: Optional[str] = None
    is_active: Optional[bool] = None
    template_type: Optional[str] = None

# ==================== PRODUCT REVIEWS ====================

class ProductReview(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_id: str
    product_sku: Optional[str] = None  # Link by SKU for easier admin management
    product_name: Optional[str] = None  # Cached product name
    customer_id: Optional[str] = None
    customer_name: str
    customer_email: str
    rating: int = Field(ge=1, le=5)  # 1-5 stars
    title: str
    content: str
    images: List[str] = []  # Array of image URLs
    status: str = "pending"  # pending, approved, rejected
    verified_purchase: bool = False
    helpful_votes: int = 0
    admin_reply: Optional[str] = None  # Admin response to review
    admin_reply_at: Optional[datetime] = None
    is_featured: bool = False  # Featured reviews shown prominently
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductReviewCreate(BaseModel):
    product_id: Optional[str] = None  # Can use either product_id or sku
    product_sku: Optional[str] = None  # For admin creating via SKU
    customer_name: str
    customer_email: str
    rating: int = Field(ge=1, le=5)
    title: str
    content: str
    images: List[str] = []
    verified_purchase: bool = False
    status: str = "pending"  # Admin can create as approved

class ProductReviewUpdate(BaseModel):
    status: Optional[str] = None
    title: Optional[str] = None
    content: Optional[str] = None
    rating: Optional[int] = None
    images: Optional[List[str]] = None
    admin_reply: Optional[str] = None
    is_featured: Optional[bool] = None
    verified_purchase: Optional[bool] = None

# ==================== STOCK NOTIFICATIONS ====================

class StockNotification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_id: str
    product_name: str
    customer_name: str
    customer_email: str
    customer_phone: Optional[str] = None
    notified: bool = False
    notified_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StockNotificationCreate(BaseModel):
    product_id: str
    customer_name: str
    customer_email: str
    customer_phone: Optional[str] = None

# ==================== SHIPPING ZONES & RATES ====================

class ShippingRate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str  # e.g., "Standard", "Express"
    min_weight: float = 0  # kg
    max_weight: Optional[float] = None  # kg, None = unlimited
    min_order: float = 0  # minimum order value
    max_order: Optional[float] = None
    price: float
    estimated_days: str = "3-5 business days"
    is_active: bool = True

class ShippingZone(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str  # e.g., "Australia", "International"
    countries: List[str] = []  # ISO country codes
    states: List[str] = []  # State/region codes
    postcodes: List[str] = []  # Postcode patterns (e.g., "3000-3999")
    rates: List[ShippingRate] = []
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ShippingZoneCreate(BaseModel):
    name: str
    countries: List[str] = []
    states: List[str] = []
    postcodes: List[str] = []
    rates: List[dict] = []
    is_active: bool = True

class ShippingZoneUpdate(BaseModel):
    name: Optional[str] = None
    countries: Optional[List[str]] = None
    states: Optional[List[str]] = None
    postcodes: Optional[List[str]] = None
    rates: Optional[List[dict]] = None
    is_active: Optional[bool] = None

# ==================== ABANDONED CART ====================

class AbandonedCart(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    cart_id: str
    customer_email: str
    customer_name: Optional[str] = None
    items: List[dict] = []
    subtotal: float = 0
    recovery_emails_sent: int = 0
    last_email_sent: Optional[datetime] = None
    recovered: bool = False
    recovered_order_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_activity: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AbandonedCartRecoveryEmail(BaseModel):
    cart_id: str
    email_type: str = "reminder"  # reminder, discount, final

# ==================== SEO SETTINGS ====================

class SEOSettings(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    entity_type: str  # product, category, page
    entity_id: str
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    meta_keywords: Optional[str] = None
    url_slug: Optional[str] = None
    canonical_url: Optional[str] = None
    og_title: Optional[str] = None
    og_description: Optional[str] = None
    og_image: Optional[str] = None
    robots: str = "index,follow"
    schema_markup: Optional[str] = None  # JSON-LD
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SEOSettingsUpdate(BaseModel):
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    meta_keywords: Optional[str] = None
    url_slug: Optional[str] = None
    canonical_url: Optional[str] = None
    og_title: Optional[str] = None
    og_description: Optional[str] = None
    og_image: Optional[str] = None
    robots: Optional[str] = None
    schema_markup: Optional[str] = None

class GlobalSEOSettings(BaseModel):
    id: str = "global_seo"
    site_title_suffix: str = ""  # Appended to all page titles
    default_meta_description: str = ""
    google_analytics_id: Optional[str] = None
    google_search_console: Optional[str] = None
    facebook_pixel_id: Optional[str] = None
    robots_txt: str = "User-agent: *\nAllow: /"
    sitemap_enabled: bool = True
    structured_data_enabled: bool = True

# ==================== CMS PAGES ====================

class CMSPage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str  # Internal name
    slug: str  # URL slug (e.g., "home", "about", "contact")
    is_homepage: bool = False
    is_system: bool = False  # System pages can't be deleted
    is_active: bool = True
    visible_on_menu: bool = False
    visible_on_sitemap: bool = True
    
    # SEO Settings
    seo_title: str = ""  # Browser tab title
    seo_keywords: str = ""
    seo_description: str = ""
    seo_heading: str = ""  # H1 heading on page
    canonical_url: Optional[str] = None
    
    # Content
    content: str = ""  # HTML content
    template: str = "default"  # Template to use
    
    # Images
    main_image: Optional[str] = None
    alt_image: Optional[str] = None
    
    # Meta
    sort_order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CMSPageCreate(BaseModel):
    name: str
    slug: str
    is_active: bool = True
    visible_on_menu: bool = False
    visible_on_sitemap: bool = True
    seo_title: str = ""
    seo_keywords: str = ""
    seo_description: str = ""
    seo_heading: str = ""
    canonical_url: Optional[str] = None
    content: str = ""
    template: str = "default"
    main_image: Optional[str] = None
    alt_image: Optional[str] = None
    sort_order: int = 0

class CMSPageUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    is_active: Optional[bool] = None
    visible_on_menu: Optional[bool] = None
    visible_on_sitemap: Optional[bool] = None
    seo_title: Optional[str] = None
    seo_keywords: Optional[str] = None
    seo_description: Optional[str] = None
    seo_heading: Optional[str] = None
    canonical_url: Optional[str] = None
    content: Optional[str] = None
    template: Optional[str] = None
    main_image: Optional[str] = None
    alt_image: Optional[str] = None
    sort_order: Optional[int] = None

# ==================== MEGA MENU ====================

class MegaMenuItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    url: str
    image: Optional[str] = None
    type: str = "link"  # link, category, custom

class MegaMenuColumn(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: Optional[str] = None
    items: List[MegaMenuItem] = []
    width: str = "auto"  # auto, 1/4, 1/3, 1/2

class MegaMenu(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    category_id: Optional[str] = None  # If linked to a category
    title: str
    columns: List[MegaMenuColumn] = []
    featured_image: Optional[str] = None
    featured_title: Optional[str] = None
    featured_link: Optional[str] = None
    is_active: bool = True
    sort_order: int = 0

class MegaMenuUpdate(BaseModel):
    title: Optional[str] = None
    columns: Optional[List[dict]] = None
    featured_image: Optional[str] = None
    featured_title: Optional[str] = None
    featured_link: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None

# ==================== MAROPOST TEMPLATE ENGINE ====================

class MaropostTemplateEngine:
    """Template engine that processes Maropost-style tags"""
    
    def __init__(self, db_instance):
        self.db = db_instance
    
    async def get_store_settings(self) -> dict:
        """Get store settings from database"""
        settings = await self.db.store_settings.find_one({"id": "store_settings"})
        if not settings:
            default_settings = StoreSettings()
            return default_settings.dict()
        return settings
    
    async def get_store_context(self) -> dict:
        """Build the full context for template rendering"""
        settings = await self.get_store_settings()
        categories = await self.db.categories.find({}, {"_id": 0}).to_list(100)
        
        return {
            "store": settings,
            "categories": categories,
            "current_year": str(datetime.now(timezone.utc).year),
            "current_date": datetime.now(timezone.utc).strftime('%Y-%m-%d'),
        }
    
    async def process_data_tags(self, content: str, context: dict) -> str:
        """Process [@tag@] data tags"""
        # Store/Global Tags
        store = context.get('store', {})
        current_time = datetime.now(timezone.utc)
        
        global_replacements = {
            '[@store_name@]': store.get('store_name', ''),
            '[@store_email@]': store.get('store_email', ''),
            '[@store_phone@]': store.get('store_phone', ''),
            '[@store_url@]': store.get('store_url', ''),
            '[@store_logo@]': store.get('store_logo', ''),
            '[@store_favicon@]': store.get('store_favicon', ''),
            '[@currency@]': store.get('currency', 'USD'),
            '[@currency_symbol@]': store.get('currency_symbol', '$'),
            '[@store_facebook@]': store.get('store_facebook', ''),
            '[@store_instagram@]': store.get('store_instagram', ''),
            '[@store_twitter@]': store.get('store_twitter', ''),
            '[@current_date@]': current_time.strftime('%Y-%m-%d'),
            '[@current_year@]': str(current_time.year),
        }
        
        for tag, value in global_replacements.items():
            content = content.replace(tag, str(value or ''))
        
        # Product tags (when in product context)
        if 'product' in context:
            prod = context['product']
            content = self._replace_product_tags(content, prod, context.get('store', {}))
        
        # Category/Content tags
        if 'category' in context:
            cat = context['category']
            content = self._replace_category_tags(content, cat)
        
        # Cart tags
        if 'cart' in context:
            cart = context['cart']
            content = self._replace_cart_tags(content, cart, store)
        
        # Customer tags
        if 'customer' in context:
            cust = context['customer']
            content = self._replace_customer_tags(content, cust)
        
        # Order tags
        if 'order' in context:
            order = context['order']
            content = self._replace_order_tags(content, order)
        
        return content
    
    def _replace_product_tags(self, content: str, prod: dict, store: dict) -> str:
        """Replace product-related data tags"""
        price = prod.get('price', 0)
        compare_price = prod.get('compare_price', 0) or 0
        currency_symbol = store.get('currency_symbol', '$')
        
        save_price = compare_price - price if compare_price > price else 0
        save_percent = int((save_price / compare_price * 100)) if compare_price > 0 else 0
        
        replacements = {
            '[@SKU@]': prod.get('sku', ''),
            '[@name@]': prod.get('name', ''),
            '[@model@]': prod.get('model', ''),
            '[@brand@]': prod.get('brand', ''),
            '[@description@]': prod.get('description', ''),
            '[@short_description@]': (prod.get('description', '') or '')[:150],
            '[@price@]': f"{price:.2f}",
            '[@price_formatted@]': f"{currency_symbol}{price:.2f}",
            '[@rrp@]': f"{compare_price:.2f}" if compare_price else '',
            '[@rrp_formatted@]': f"{currency_symbol}{compare_price:.2f}" if compare_price else '',
            '[@save_price@]': f"{save_price:.2f}",
            '[@save_percent@]': str(save_percent),
            '[@on_sale@]': 'y' if compare_price and compare_price > price else 'n',
            '[@qty@]': str(prod.get('stock', 0)),
            '[@in_stock@]': 'y' if prod.get('stock', 0) > 0 else 'n',
            '[@stock_status@]': 'In Stock' if prod.get('stock', 0) > 0 else 'Out of Stock',
            '[@image@]': prod.get('images', [''])[0] if prod.get('images') else '',
            '[@thumb@]': prod.get('images', [''])[0] if prod.get('images') else '',
            '[@url@]': f"/store/product/{prod.get('id', '')}",
            '[@add_to_cart_url@]': f"/store/cart/add/{prod.get('id', '')}",
            '[@weight@]': str(prod.get('weight', '')),
            '[@shipping_length@]': str(prod.get('shipping_length', 0) or 0),
            '[@shipping_width@]': str(prod.get('shipping_width', 0) or 0),
            '[@shipping_height@]': str(prod.get('shipping_height', 0) or 0),
            '[@category@]': prod.get('category_name', ''),
            '[@id@]': prod.get('id', ''),
            '[@rating@]': str(prod.get('rating', 0)),
            '[@reviews_count@]': str(prod.get('reviews_count', 0)),
        }
        
        # Handle multiple images
        images = prod.get('images', [])
        for i in range(1, 13):
            tag = f'[@image_{i}@]' if i > 1 else '[@image@]'
            replacements[tag] = images[i-1] if i <= len(images) else ''
        
        for tag, value in replacements.items():
            content = content.replace(tag, str(value))
        
        return content
    
    def _replace_category_tags(self, content: str, cat: dict) -> str:
        """Replace category-related data tags"""
        replacements = {
            '[@content_name@]': cat.get('name', ''),
            '[@content_id@]': cat.get('id', ''),
            '[@content_url@]': f"/store/category/{cat.get('id', '')}",
            '[@content_description@]': cat.get('description', ''),
            '[@content_image@]': cat.get('image', ''),
            '[@content_product_count@]': str(cat.get('product_count', 0)),
        }
        
        for tag, value in replacements.items():
            content = content.replace(tag, str(value))
        
        return content
    
    def _replace_cart_tags(self, content: str, cart: dict, store: dict) -> str:
        """Replace cart-related data tags"""
        currency_symbol = store.get('currency_symbol', '$')
        
        replacements = {
            '[@cart_subtotal@]': f"{currency_symbol}{cart.get('subtotal', 0):.2f}",
            '[@cart_total@]': f"{currency_symbol}{cart.get('total', 0):.2f}",
            '[@cart_item_count@]': str(cart.get('item_count', 0)),
            '[@cart_coupon@]': cart.get('coupon', ''),
            '[@mini_cart_count@]': str(cart.get('item_count', 0)),
            '[@mini_cart_total@]': f"{currency_symbol}{cart.get('total', 0):.2f}",
        }
        
        for tag, value in replacements.items():
            content = content.replace(tag, str(value))
        
        return content
    
    def _replace_customer_tags(self, content: str, cust: dict) -> str:
        """Replace customer-related data tags"""
        replacements = {
            '[@customer_id@]': cust.get('id', ''),
            '[@customer_email@]': cust.get('email', ''),
            '[@customer_first_name@]': cust.get('first_name', ''),
            '[@customer_last_name@]': cust.get('last_name', ''),
            '[@customer_full_name@]': cust.get('name', ''),
            '[@customer_logged_in@]': 'y' if cust.get('id') else 'n',
        }
        
        for tag, value in replacements.items():
            content = content.replace(tag, str(value))
        
        return content
    
    def _replace_order_tags(self, content: str, order: dict) -> str:
        """Replace order-related data tags"""
        replacements = {
            '[@order_id@]': order.get('id', ''),
            '[@order_number@]': order.get('order_number', ''),
            '[@order_status@]': order.get('status', ''),
            '[@order_total@]': f"${order.get('total', 0):.2f}",
            '[@order_customer_name@]': order.get('customer_name', ''),
            '[@order_customer_email@]': order.get('customer_email', ''),
        }
        
        for tag, value in replacements.items():
            content = content.replace(tag, str(value))
        
        return content
    
    async def process_function_tags(self, content: str, context: dict) -> str:
        """Process [%tag%]...[%/tag%] function tags"""
        
        # Process thumb_list
        content = await self._process_thumb_list(content, context)
        
        # Process new_arrivals
        content = await self._process_new_arrivals(content, context)
        
        # Process top_sellers
        content = await self._process_top_sellers(content, context)
        
        # Process conditionals
        content = self._process_conditionals(content, context)
        
        # Process forloop
        content = self._process_forloop(content)
        
        # Process set variables
        content = self._process_set_variables(content, context)
        
        # Process formatting tags
        content = self._process_formatting(content, context)
        
        # Process content_zone
        content = await self._process_content_zone(content)
        
        # Process load_template
        content = await self._process_load_template(content)
        
        return content
    
    async def _process_thumb_list(self, content: str, context: dict) -> str:
        """Process [%thumb_list%] tags"""
        pattern = r'\[%thumb_list\s+([^%]*?)%\](.*?)\[%/thumb_list%\]'
        matches = re.findall(pattern, content, re.DOTALL)
        
        for params_str, inner_content in matches:
            params = self._parse_params(params_str)
            
            # Build query
            query = {"is_active": True}
            if params.get('category'):
                query['category_id'] = params['category']
            if params.get('featured') == 'true':
                query['is_featured'] = True
            if params.get('on_sale') == 'true':
                query['compare_price'] = {'$exists': True, '$ne': None}
            if params.get('in_stock') == 'true':
                query['stock'] = {'$gt': 0}
            
            # Sorting
            sort_field = params.get('orderby', 'created_at')
            sort_order = 1 if params.get('order', 'desc') == 'asc' else -1
            sort_map = {
                'name': 'name',
                'price': 'price',
                'date': 'created_at',
                'popularity': 'sales_count'
            }
            sort_field = sort_map.get(sort_field, 'created_at')
            
            limit = int(params.get('limit', 12))
            offset = int(params.get('offset', 0))
            
            products = await self.db.products.find(query).sort(sort_field, sort_order).skip(offset).limit(limit).to_list(limit)
            
            # Parse inner template parts
            header = self._extract_param(inner_content, 'header', '')
            body = self._extract_param(inner_content, 'body', '')
            footer = self._extract_param(inner_content, 'footer', '')
            ifempty = self._extract_param(inner_content, 'ifempty', 'No products found')
            
            if not products:
                result = ifempty
            else:
                result = header
                store = context.get('store', {})
                for idx, prod in enumerate(products):
                    item_body = body
                    item_body = item_body.replace('[@count@]', str(idx))
                    item_body = item_body.replace('[@current_index@]', str(idx + 1))
                    item_body = item_body.replace('[@total@]', str(len(products)))
                    item_body = self._replace_product_tags(item_body, prod, store)
                    result += item_body
                result += footer
            
            full_pattern = re.escape(f'[%thumb_list {params_str}%]') + r'.*?' + re.escape('[%/thumb_list%]')
            content = re.sub(full_pattern, result, content, count=1, flags=re.DOTALL)
        
        return content
    
    async def _process_new_arrivals(self, content: str, context: dict) -> str:
        """Process [%new_arrivals%] tags"""
        pattern = r'\[%new_arrivals\s+([^%]*?)%\](.*?)\[%/new_arrivals%\]'
        matches = re.findall(pattern, content, re.DOTALL)
        
        for params_str, inner_content in matches:
            params = self._parse_params(params_str)
            limit = int(params.get('limit', 8))
            
            products = await self.db.products.find({"is_active": True}).sort("created_at", -1).limit(limit).to_list(limit)
            
            body = self._extract_param(inner_content, 'body', '')
            ifempty = self._extract_param(inner_content, 'ifempty', '')
            
            if not products:
                result = ifempty
            else:
                result = ''
                store = context.get('store', {})
                for prod in products:
                    item_body = self._replace_product_tags(body, prod, store)
                    result += item_body
            
            full_pattern = re.escape(f'[%new_arrivals {params_str}%]') + r'.*?' + re.escape('[%/new_arrivals%]')
            content = re.sub(full_pattern, result, content, count=1, flags=re.DOTALL)
        
        return content
    
    async def _process_top_sellers(self, content: str, context: dict) -> str:
        """Process [%top_sellers%] tags"""
        pattern = r'\[%top_sellers\s+([^%]*?)%\](.*?)\[%/top_sellers%\]'
        matches = re.findall(pattern, content, re.DOTALL)
        
        for params_str, inner_content in matches:
            params = self._parse_params(params_str)
            limit = int(params.get('limit', 8))
            
            products = await self.db.products.find({"is_active": True}).sort("sales_count", -1).limit(limit).to_list(limit)
            
            body = self._extract_param(inner_content, 'body', '')
            ifempty = self._extract_param(inner_content, 'ifempty', '')
            
            if not products:
                result = ifempty
            else:
                result = ''
                store = context.get('store', {})
                for prod in products:
                    item_body = self._replace_product_tags(body, prod, store)
                    result += item_body
            
            full_pattern = re.escape(f'[%top_sellers {params_str}%]') + r'.*?' + re.escape('[%/top_sellers%]')
            content = re.sub(full_pattern, result, content, count=1, flags=re.DOTALL)
        
        return content
    
    def _process_conditionals(self, content: str, context: dict) -> str:
        """Process [%if%]...[%/if%] conditionals"""
        pattern = r'\[%if\s+([^%]+)%\](.*?)\[%/if%\]'
        
        def evaluate_condition(condition: str) -> bool:
            # Simple condition evaluation
            condition = condition.strip()
            
            # Handle string comparisons
            if ' eq ' in condition:
                parts = condition.split(' eq ')
                return parts[0].strip().strip("'\"") == parts[1].strip().strip("'\"")
            if ' ne ' in condition:
                parts = condition.split(' ne ')
                return parts[0].strip().strip("'\"") != parts[1].strip().strip("'\"")
            
            # Handle numeric comparisons
            for op in ['>=', '<=', '>', '<', '==', '!=']:
                if op in condition:
                    parts = condition.split(op)
                    try:
                        left = float(parts[0].strip())
                        right = float(parts[1].strip())
                        if op == '>=': return left >= right
                        if op == '<=': return left <= right
                        if op == '>': return left > right
                        if op == '<': return left < right
                        if op == '==': return left == right
                        if op == '!=': return left != right
                    except:
                        pass
            
            # Handle truthy checks
            return bool(condition and condition != 'n' and condition != '0')
        
        def process_if_block(match):
            condition = match.group(1)
            block_content = match.group(2)
            
            # Handle elseif and else
            parts = re.split(r'\[%elseif\s+([^%]+)%\]|\[%else%\]', block_content)
            
            if evaluate_condition(condition):
                return parts[0]
            
            # Process elseif/else parts
            for i in range(1, len(parts)):
                if parts[i] is None:  # This is after [%else%]
                    if i + 1 < len(parts):
                        return parts[i + 1]
                elif i % 2 == 1:  # This is an elseif condition
                    if evaluate_condition(parts[i]) and i + 1 < len(parts):
                        return parts[i + 1]
            
            return ''
        
        content = re.sub(pattern, process_if_block, content, flags=re.DOTALL)
        return content
    
    def _process_forloop(self, content: str) -> str:
        """Process [%forloop%] tags"""
        pattern = r'\[%forloop\s+([^%]*?)%\](.*?)\[%/forloop%\]'
        matches = re.findall(pattern, content, re.DOTALL)
        
        for params_str, inner_content in matches:
            params = self._parse_params(params_str)
            from_val = int(params.get('from', 1))
            to_val = int(params.get('to', 10))
            
            body = self._extract_param(inner_content, 'body', '')
            
            result = ''
            for i in range(from_val, to_val + 1):
                item_body = body
                item_body = item_body.replace('[@current_index@]', str(i))
                item_body = item_body.replace('[@count@]', str(i - from_val))
                result += item_body
            
            full_pattern = re.escape(f'[%forloop {params_str}%]') + r'.*?' + re.escape('[%/forloop%]')
            content = re.sub(full_pattern, result, content, count=1, flags=re.DOTALL)
        
        return content
    
    def _process_set_variables(self, content: str, context: dict) -> str:
        """Process [%set%] variable tags"""
        pattern = r"\[%set\s+name:'([^']+)'\s+value:'([^']*)'%\]"
        matches = re.findall(pattern, content)
        
        variables = context.get('variables', {})
        for name, value in matches:
            variables[name] = value
            content = re.sub(re.escape(f"[%set name:'{name}' value:'{value}'%]"), '', content)
        
        # Replace variable references
        for name, value in variables.items():
            content = content.replace(f'[@{name}@]', value)
        
        return content
    
    def _process_formatting(self, content: str, context: dict) -> str:
        """Process formatting function tags"""
        # [%currency value:'100'%]
        currency_pattern = r"\[%currency\s+value:'([^']*)'%\]"
        currency_symbol = context.get('store', {}).get('currency_symbol', '$')
        content = re.sub(currency_pattern, lambda m: f"{currency_symbol}{float(m.group(1) or 0):.2f}", content)
        
        # [%truncate value:'text' length:'100' suffix:'...'%]
        truncate_pattern = r"\[%truncate\s+value:'([^']*)'\s+length:'(\d+)'(?:\s+suffix:'([^']*)')?%\]"
        def truncate_replace(m):
            text = m.group(1)
            length = int(m.group(2))
            suffix = m.group(3) or '...'
            if len(text) > length:
                return text[:length] + suffix
            return text
        content = re.sub(truncate_pattern, truncate_replace, content)
        
        # [%strip_tags value:'<p>text</p>'%]
        strip_tags_pattern = r"\[%strip_tags\s+value:'([^']*)'%\]"
        content = re.sub(strip_tags_pattern, lambda m: re.sub(r'<[^>]+>', '', m.group(1)), content)
        
        # [%date value:'2024-01-01' format:'d/m/Y'%]
        date_pattern = r"\[%date\s+value:'([^']*)'\s+format:'([^']*)'%\]"
        def date_replace(m):
            try:
                date_str = m.group(1)
                fmt = m.group(2)
                dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                # Convert Python strftime format
                fmt = fmt.replace('d', '%d').replace('m', '%m').replace('Y', '%Y')
                return dt.strftime(fmt)
            except:
                return m.group(1)
        content = re.sub(date_pattern, date_replace, content)
        
        return content
    
    async def _process_content_zone(self, content: str) -> str:
        """Process [%content_zone%] tags"""
        pattern = r"\[%content_zone\s+id:'([^']+)'%\]"
        matches = re.findall(pattern, content)
        
        for zone_id in matches:
            zone = await self.db.content_zones.find_one({"zone_id": zone_id, "is_active": True})
            zone_content = zone.get('content', '') if zone else ''
            content = content.replace(f"[%content_zone id:'{zone_id}'%]", zone_content)
        
        return content
    
    async def _process_load_template(self, content: str) -> str:
        """Process [%load_template%] tags"""
        pattern = r"\[%load_template\s+file:'([^']+)'%\]"
        matches = re.findall(pattern, content)
        
        for template_name in matches:
            template = await self.db.templates.find_one({"name": template_name, "is_active": True})
            template_content = template.get('content', '') if template else ''
            content = content.replace(f"[%load_template file:'{template_name}'%]", template_content)
        
        return content
    
    def _parse_params(self, params_str: str) -> dict:
        """Parse parameter string like "type:'products' limit:'12'" into dict"""
        params = {}
        pattern = r"(\w+):'([^']*)'"
        matches = re.findall(pattern, params_str)
        for key, value in matches:
            params[key] = value
        return params
    
    def _extract_param(self, content: str, param_name: str, default: str = '') -> str:
        """Extract content from [%param *name%]...[%/param%]"""
        pattern = rf'\[%param\s+\*{param_name}%\](.*?)\[%/param%\]'
        match = re.search(pattern, content, re.DOTALL)
        return match.group(1) if match else default
    
    async def render(self, template_content: str, context: dict = None) -> str:
        """Full template rendering with all tag processing"""
        if context is None:
            context = {}
        
        # Get store settings if not in context
        if 'store' not in context:
            context['store'] = await self.get_store_settings()
        
        # Process function tags first (they may contain data tags)
        content = await self.process_function_tags(template_content, context)
        
        # Then process data tags
        content = await self.process_data_tags(content, context)
        
        # Clean up unprocessed Maropost tags
        content = self._cleanup_unprocessed_tags(content)
        
        return content
    
    def _cleanup_unprocessed_tags(self, content: str) -> str:
        """Remove or replace unprocessed Maropost tags for cleaner output"""
        
        # Remove block function tags [%tag%]...[%/tag%]
        block_patterns = [
            r'\[%if\s+[^\]]*%\].*?\[%/if%\]',
            r'\[%cache\s+[^\]]*%\].*?\[%/cache%\]',
            r'\[%format\s+[^\]]*%\].*?\[%/format%\]',
            r'\[%foreach\s+[^\]]*%\].*?\[%/foreach%\]',
            r'\[%content_menu\s+[^\]]*%\].*?\[%/content_menu%\]',
            r'\[%advert\s+[^\]]*%\].*?\[%/advert%\]',
            r'\[%param\s+[^\]]*%\].*?\[%/param%\]',
        ]
        
        for pattern in block_patterns:
            content = re.sub(pattern, '', content, flags=re.DOTALL)
        
        # Remove inline function tags [%tag%]
        inline_function_pattern = r'\[%[a-zA-Z_][a-zA-Z0-9_]*(?:\s+[^\]]*)?\s*/?%\]'
        content = re.sub(inline_function_pattern, '', content)
        
        # Remove closing tags [%/tag%]
        closing_tag_pattern = r'\[%/[a-zA-Z_][a-zA-Z0-9_]*%\]'
        content = re.sub(closing_tag_pattern, '', content)
        
        # Replace unprocessed data tags [@tag@] with empty string or placeholder
        data_tag_pattern = r'\[@[a-zA-Z_][a-zA-Z0-9_:]*@\]'
        content = re.sub(data_tag_pattern, '', content)
        
        # Clean up multiple blank lines
        content = re.sub(r'\n\s*\n\s*\n', '\n\n', content)
        
        return content

# Initialize template engine
template_engine = MaropostTemplateEngine(db)

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/login", response_model=Token)
async def login(login_data: UserLogin):
    """Login with email and password"""
    user = await db.users.find_one({"email": login_data.email})
    
    if not user or not verify_password(login_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password"
        )
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="User account is disabled")
    
    access_token = create_access_token(data={"sub": user["id"]})
    
    return Token(
        access_token=access_token,
        user={
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"]
        }
    )

@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    """Register a new user"""
    # Check if user already exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    new_user = User(
        email=user_data.email,
        name=user_data.name,
        role=user_data.role,
        hashed_password=get_password_hash(user_data.password)
    )
    
    await db.users.insert_one(new_user.dict())
    
    access_token = create_access_token(data={"sub": new_user.id})
    
    return Token(
        access_token=access_token,
        user={
            "id": new_user.id,
            "email": new_user.email,
            "name": new_user.name,
            "role": new_user.role
        }
    )

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_active_user)):
    """Get current authenticated user"""
    return current_user

@api_router.post("/auth/init-admin")
async def init_admin():
    """Initialize the default admin user - only works if no users exist"""
    user_count = await db.users.count_documents({})
    
    if user_count > 0:
        return {"message": "Admin user already exists", "initialized": False}
    
    # Create default admin user
    admin_user = User(
        email="eddie@toolsinabox.com.au",
        name="Eddie",
        role="admin",
        hashed_password=get_password_hash("Yealink1991%")
    )
    
    await db.users.insert_one(admin_user.dict())
    
    return {"message": "Admin user created successfully", "initialized": True, "email": admin_user.email}

# ==================== PASSWORD RESET ====================

@api_router.post("/auth/forgot-password")
async def forgot_password(data: dict):
    """Request a password reset email"""
    email = data.get("email", "").lower().strip()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    
    # Find user in either users or platform_owners collection
    user = await db.users.find_one({"email": email})
    owner = await db.platform_owners.find_one({"email": email})
    
    if not user and not owner:
        # Don't reveal if email exists - return success anyway
        return {"message": "If an account exists with this email, you will receive a password reset link."}
    
    # Generate reset token
    reset_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    
    # Store reset token
    await db.password_reset_tokens.delete_many({"email": email})  # Remove old tokens
    await db.password_reset_tokens.insert_one({
        "email": email,
        "token": reset_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc)
    })
    
    # Send email
    name = user.get("name") if user else owner.get("name", email.split("@")[0])
    email_result = await send_password_reset_email(email, name, reset_token)
    
    if email_result.get("mocked"):
        logger.info(f"Password reset token for {email}: {reset_token}")
    
    return {"message": "If an account exists with this email, you will receive a password reset link."}

@api_router.post("/auth/reset-password")
async def reset_password(data: dict):
    """Reset password using token from email"""
    token = data.get("token", "")
    new_password = data.get("new_password", "")
    
    if not token or not new_password:
        raise HTTPException(status_code=400, detail="Token and new password are required")
    
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Find and validate token
    reset_record = await db.password_reset_tokens.find_one({"token": token})
    if not reset_record:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    if reset_record["expires_at"] < datetime.now(timezone.utc):
        await db.password_reset_tokens.delete_one({"token": token})
        raise HTTPException(status_code=400, detail="Reset token has expired")
    
    email = reset_record["email"]
    hashed = get_password_hash(new_password)
    
    # Update password in users collection
    user_result = await db.users.update_one(
        {"email": email},
        {"$set": {"hashed_password": hashed, "updated_at": datetime.now(timezone.utc)}}
    )
    
    # Also update in platform_owners if exists
    owner_result = await db.platform_owners.update_one(
        {"email": email},
        {"$set": {"hashed_password": hashed, "updated_at": datetime.now(timezone.utc)}}
    )
    
    if user_result.modified_count == 0 and owner_result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Failed to update password")
    
    # Delete the used token
    await db.password_reset_tokens.delete_one({"token": token})
    
    return {"message": "Password has been reset successfully. You can now log in with your new password."}

@api_router.get("/auth/verify-reset-token/{token}")
async def verify_reset_token(token: str):
    """Verify if a reset token is valid"""
    reset_record = await db.password_reset_tokens.find_one({"token": token})
    
    if not reset_record:
        return {"valid": False, "message": "Invalid reset token"}
    
    if reset_record["expires_at"] < datetime.now(timezone.utc):
        await db.password_reset_tokens.delete_one({"token": token})
        return {"valid": False, "message": "Reset token has expired"}
    
    return {"valid": True, "email": reset_record["email"]}

# ==================== EMAIL STATUS ====================

@api_router.get("/system/email-status")
async def get_email_status():
    """Check if email service is configured"""
    return {
        "configured": is_email_configured(),
        "provider": "Resend" if is_email_configured() else None
    }

# ==================== CATEGORY ENDPOINTS ====================

@api_router.get("/")
async def root():
    return {"message": "Maropost Clone API - Operational"}

@api_router.post("/categories", response_model=Category)
async def create_category(category: CategoryCreate, request: Request):
    store_id = await get_store_id_from_header(request)
    new_category = Category(**category.dict())
    cat_dict = new_category.dict()
    cat_dict["store_id"] = store_id
    await db.categories.insert_one(cat_dict)
    return new_category

@api_router.get("/categories", response_model=List[Category])
async def get_categories(request: Request, is_active: Optional[bool] = None):
    store_id = await get_store_id_from_header(request)
    query = {"store_id": store_id}
    if is_active is not None:
        query["is_active"] = is_active
    categories = await db.categories.find(query, {"_id": 0}).sort("sort_order", 1).to_list(100)
    return [Category(**cat) for cat in categories]

@api_router.get("/categories/{category_id}", response_model=Category)
async def get_category(category_id: str, request: Request):
    store_id = await get_store_id_from_header(request)
    category = await db.categories.find_one({"id": category_id, "store_id": store_id}, {"_id": 0})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return Category(**category)

@api_router.put("/categories/{category_id}", response_model=Category)
async def update_category(category_id: str, category: CategoryCreate, request: Request):
    store_id = await get_store_id_from_header(request)
    update_data = category.dict()
    update_data["updated_at"] = datetime.now(timezone.utc)
    result = await db.categories.update_one(
        {"id": category_id, "store_id": store_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    updated = await db.categories.find_one({"id": category_id}, {"_id": 0})
    return Category(**updated)

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str, request: Request):
    store_id = await get_store_id_from_header(request)
    result = await db.categories.delete_one({"id": category_id, "store_id": store_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted successfully"}

# ==================== PRODUCT ENDPOINTS ====================

@api_router.post("/products", response_model=Product)
async def create_product(product: ProductCreate, request: Request):
    store_id = await get_store_id_from_header(request)
    new_product = Product(**product.dict())
    prod_dict = new_product.dict()
    prod_dict["store_id"] = store_id
    await db.products.insert_one(prod_dict)
    
    # Update category product count
    if product.category_id:
        await db.categories.update_one(
            {"id": product.category_id, "store_id": store_id},
            {"$inc": {"product_count": 1}}
        )
    
    return new_product

@api_router.get("/products", response_model=List[Product])
async def get_products(
    request: Request,
    category_id: Optional[str] = None,
    is_active: Optional[bool] = None,
    in_stock: Optional[bool] = None,
    on_sale: Optional[bool] = None,
    search: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    limit: int = Query(default=50, le=100),
    skip: int = 0
):
    store_id = await get_store_id_from_header(request)
    query = {"store_id": store_id}
    if category_id:
        # Support both single category_id and multiple category_ids array
        query["$or"] = [
            {"category_id": category_id},
            {"category_ids": category_id}
        ]
    if is_active is not None:
        query["is_active"] = is_active
    if in_stock:
        query["stock"] = {"$gt": 0}
    if on_sale:
        query["compare_price"] = {"$exists": True, "$ne": None}
    if search:
        search_conditions = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"sku": {"$regex": search, "$options": "i"}}
        ]
        if "$or" in query:
            query["$and"] = [{"$or": query.pop("$or")}, {"$or": search_conditions}]
        else:
            query["$or"] = search_conditions
    
    sort_direction = -1 if sort_order == "desc" else 1
    products = await db.products.find(query, {"_id": 0}).sort(sort_by, sort_direction).skip(skip).limit(limit).to_list(limit)
    return [Product(**prod) for prod in products]

@api_router.get("/products/template-tags")
async def get_product_template_tags():
    """Get all available product template tags for theme development.
    
    Note: Both short form ([@name@]) and prefixed form ([@product_name@]) are supported.
    Short form is used for single product pages, prefixed form for loops and lists.
    """
    return {
        "basic_info": {
            "title": "Basic Information",
            "tags": [
                {"field": "name", "tag": "[@name@] or [@product_name@]", "description": "Product name/title"},
                {"field": "subtitle", "tag": "[@product_subtitle@]", "description": "Product subtitle or tagline"},
                {"field": "description", "tag": "[@description@] or [@product_description@]", "description": "Full product description (HTML supported)"},
                {"field": "short_description", "tag": "[@short_description@] or [@product_short_description@]", "description": "Brief product summary"},
                {"field": "id", "tag": "[@id@] or [@product_id@]", "description": "Unique product identifier"},
            ]
        },
        "pricing": {
            "title": "Pricing",
            "tags": [
                {"field": "price", "tag": "[@price@] or [@product_price@]", "description": "Current selling price (number)"},
                {"field": "price", "tag": "[@price_formatted@] or [@product_price_formatted@]", "description": "Price with currency symbol (e.g., $99.99)"},
                {"field": "compare_price", "tag": "[@compare_price@] or [@product_compare_price@]", "description": "Original/RRP price (number)"},
                {"field": "compare_price", "tag": "[@compare_price_formatted@]", "description": "RRP with currency symbol"},
                {"field": "compare_price", "tag": "[@rrp@] or [@product_rrp@]", "description": "Alias for compare price"},
                {"field": "savings", "tag": "[@savings@] or [@savings_formatted@]", "description": "Amount saved if on sale"},
                {"field": "on_sale", "tag": "[@on_sale@] or [@product_on_sale@]", "description": "Returns 'y' if on sale, 'n' otherwise"},
                {"field": "installment_price", "tag": "[@installment_price@]", "description": "Price divided by 4 for Afterpay/etc"},
                {"field": "tax_class", "tag": "[@product_tax_class@]", "description": "Tax classification"},
            ]
        },
        "identification": {
            "title": "Identification & SKU",
            "tags": [
                {"field": "sku", "tag": "[@sku@] or [@SKU@] or [@product_sku@]", "description": "Stock Keeping Unit"},
                {"field": "barcode", "tag": "[@barcode@] or [@product_barcode@]", "description": "Product barcode/UPC"},
                {"field": "barcode", "tag": "[@upc@] or [@product_upc@]", "description": "Alias for barcode"},
                {"field": "mpn", "tag": "[@mpn@] or [@product_mpn@]", "description": "Manufacturer Part Number"},
            ]
        },
        "categorization": {
            "title": "Categorization",
            "tags": [
                {"field": "category_id", "tag": "[@category_name@] or [@product_category@]", "description": "Category name"},
                {"field": "category_id", "tag": "[@category_id@] or [@product_category_id@]", "description": "Category ID"},
                {"field": "brand", "tag": "[@brand@] or [@product_brand@]", "description": "Brand name"},
                {"field": "manufacturer", "tag": "[@manufacturer@] or [@product_manufacturer@]", "description": "Manufacturer name"},
                {"field": "tags", "tag": "[@product_tags@]", "description": "Comma-separated tags"},
            ]
        },
        "images": {
            "title": "Images",
            "tags": [
                {"field": "images", "tag": "[@image@] or [@product_image@]", "description": "Primary product image URL"},
                {"field": "images", "tag": "[@image2@] through [@image12@]", "description": "Additional product images (up to 12)"},
                {"field": "images", "tag": "[@product_images@]", "description": "Comma-separated list of all image URLs"},
                {"field": "thumbnail", "tag": "[@thumb@] or [@thumbnail@] or [@product_thumbnail@]", "description": "Thumbnail image URL"},
            ]
        },
        "inventory": {
            "title": "Inventory & Stock",
            "tags": [
                {"field": "stock", "tag": "[@stock@] or [@qty@] or [@product_stock@]", "description": "Current stock quantity"},
                {"field": "stock", "tag": "[@product_qty@]", "description": "Alias for stock quantity"},
                {"field": "in_stock", "tag": "[@in_stock@] or [@product_in_stock@]", "description": "Returns 'y' if in stock"},
                {"field": "stock_status", "tag": "[@stock_status@]", "description": "Returns 'In Stock' or 'Out of Stock'"},
                {"field": "low_stock_threshold", "tag": "[@product_low_stock@]", "description": "Low stock warning threshold"},
                {"field": "allow_backorder", "tag": "[@product_backorder@]", "description": "Returns 'y' if backorders allowed"},
            ]
        },
        "shipping": {
            "title": "Shipping & Dimensions",
            "tags": [
                {"field": "weight", "tag": "[@weight@] or [@product_weight@]", "description": "Product weight (kg)"},
                {"field": "length", "tag": "[@product_length@]", "description": "Product length (cm)"},
                {"field": "width", "tag": "[@product_width@]", "description": "Product width (cm)"},
                {"field": "height", "tag": "[@product_height@]", "description": "Product height (cm)"},
                {"field": "shipping_class", "tag": "[@product_shipping_class@]", "description": "Shipping class/rate group"},
            ]
        },
        "seo": {
            "title": "SEO & URL",
            "tags": [
                {"field": "meta_title", "tag": "[@product_meta_title@]", "description": "SEO page title"},
                {"field": "meta_description", "tag": "[@product_meta_description@]", "description": "SEO meta description"},
                {"field": "url_slug", "tag": "[@url@] or [@product_url@]", "description": "Product URL/permalink"},
                {"field": "url_slug", "tag": "[@product_slug@]", "description": "URL slug only"},
            ]
        },
        "visibility": {
            "title": "Visibility & Status",
            "tags": [
                {"field": "is_active", "tag": "[@product_active@]", "description": "Returns 'y' if active"},
                {"field": "is_featured", "tag": "[@product_featured@]", "description": "Returns 'y' if featured"},
                {"field": "visibility", "tag": "[@product_visibility@]", "description": "visible, hidden, or search_only"},
            ]
        },
        "reviews": {
            "title": "Reviews & Ratings",
            "tags": [
                {"field": "rating", "tag": "[@product_rating@]", "description": "Average rating (0-5)"},
                {"field": "reviews_count", "tag": "[@product_reviews_count@]", "description": "Number of reviews"},
            ]
        },
        "stats": {
            "title": "Statistics",
            "tags": [
                {"field": "sales_count", "tag": "[@product_sales@]", "description": "Total units sold"},
                {"field": "views_count", "tag": "[@product_views@]", "description": "Product page views"},
                {"field": "created_at", "tag": "[@product_created@]", "description": "Date product was created"},
                {"field": "updated_at", "tag": "[@product_updated@]", "description": "Date last modified"},
            ]
        },
        "loops": {
            "title": "Product List Loops",
            "tags": [
                {"field": "product_list", "tag": "[%product_list limit:'8'%]...[%/product_list%]", "description": "Loop through products"},
                {"field": "featured", "tag": "[%featured_products limit:'4'%]...[%/featured_products%]", "description": "Featured products loop"},
                {"field": "related", "tag": "[%related_products limit:'4'%]...[%/related_products%]", "description": "Related products"},
            ]
        },
        "conditionals": {
            "title": "Conditional Tags",
            "tags": [
                {"field": "if_sale", "tag": "[%if [@product_sale@] == 'y'%]...[%/if%]", "description": "Show if product is on sale"},
                {"field": "if_stock", "tag": "[%if [@product_in_stock@] == 'y'%]...[%/if%]", "description": "Show if in stock"},
                {"field": "if_featured", "tag": "[%if [@product_featured@] == 'y'%]...[%/if%]", "description": "Show if featured"},
            ]
        }
    }

@api_router.get("/products/featured", response_model=List[Product])
async def get_featured_products(limit: int = 8):
    products = await db.products.find({"is_active": True}).sort("rating", -1).limit(limit).to_list(limit)
    return [Product(**prod) for prod in products]

@api_router.get("/products/sale", response_model=List[Product])
async def get_sale_products(limit: int = 8):
    products = await db.products.find({
        "is_active": True, 
        "compare_price": {"$exists": True, "$ne": None}
    }).limit(limit).to_list(limit)
    return [Product(**prod) for prod in products]

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str, request: Request):
    store_id = await get_store_id_from_header(request)
    product = await db.products.find_one({"id": product_id, "store_id": store_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return Product(**product)

@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, product: ProductUpdate, request: Request):
    store_id = await get_store_id_from_header(request)
    update_data = {k: v for k, v in product.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    result = await db.products.update_one(
        {"id": product_id, "store_id": store_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    updated = await db.products.find_one({"id": product_id}, {"_id": 0})
    return Product(**updated)

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, request: Request):
    store_id = await get_store_id_from_header(request)
    product = await db.products.find_one({"id": product_id, "store_id": store_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Update category product count
    if product.get("category_id"):
        await db.categories.update_one(
            {"id": product["category_id"], "store_id": store_id},
            {"$inc": {"product_count": -1}}
        )
    
    await db.products.delete_one({"id": product_id, "store_id": store_id})
    return {"message": "Product deleted successfully"}

# ==================== ORDER ENDPOINTS ====================

async def generate_order_number():
    """Generate a sequential order number based on store settings"""
    # Get store settings
    settings = await db.store_settings.find_one({"id": "store_settings"})
    prefix = settings.get("order_prefix", "ORD") if settings else "ORD"
    start_number = settings.get("order_number_start", 1001) if settings else 1001
    
    # Get current order count to generate sequential number
    order_count = await db.orders.count_documents({})
    
    # Generate the order number
    order_number = start_number + order_count
    
    return f"{prefix}-{order_number}"

@api_router.post("/orders", response_model=Order)
async def create_order(order: OrderCreate, request: Request):
    store_id = await get_store_id_from_header(request)
    new_order = Order(**order.dict())
    
    # Generate custom order number
    new_order.order_number = await generate_order_number()
    
    new_order.payment_status = "paid"  # For demo purposes
    order_dict = new_order.dict()
    order_dict["store_id"] = store_id
    await db.orders.insert_one(order_dict)
    
    # Update product sales count
    for item in order.items:
        await db.products.update_one(
            {"id": item.product_id, "store_id": store_id},
            {"$inc": {"sales_count": item.quantity, "stock": -item.quantity}}
        )
    
    # Update or create customer
    customer = await db.customers.find_one({"email": order.customer_email, "store_id": store_id})
    if customer:
        await db.customers.update_one(
            {"email": order.customer_email, "store_id": store_id},
            {
                "$inc": {"total_orders": 1, "total_spent": order.total},
                "$set": {"updated_at": datetime.now(timezone.utc)}
            }
        )
    else:
        new_customer = Customer(
            name=order.customer_name,
            email=order.customer_email,
            phone=order.customer_phone,
            total_orders=1,
            total_spent=order.total
        )
        cust_dict = new_customer.dict()
        cust_dict["store_id"] = store_id
        await db.customers.insert_one(cust_dict)
    
    return new_order

@api_router.get("/orders", response_model=List[Order])
async def get_orders(
    request: Request,
    status: Optional[str] = None,
    payment_status: Optional[str] = None,
    limit: int = Query(default=50, le=100),
    skip: int = 0
):
    store_id = await get_store_id_from_header(request)
    query = {"store_id": store_id}
    if status:
        query["status"] = status
    if payment_status:
        query["payment_status"] = payment_status
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return orders

@api_router.get("/orders/count")
async def get_orders_count(request: Request, status: Optional[str] = None):
    store_id = await get_store_id_from_header(request)
    query = {"store_id": store_id}
    if status:
        query["status"] = status
    count = await db.orders.count_documents(query)
    return {"count": count}

@api_router.get("/orders/stats")
async def get_orders_stats(request: Request):
    """Get order statistics for dashboard"""
    store_id = await get_store_id_from_header(request)
    try:
        # Total orders
        total_orders = await db.orders.count_documents({"store_id": store_id})
        pending_orders = await db.orders.count_documents({"status": "pending", "store_id": store_id})
        
        # Total revenue from delivered orders
        pipeline = [
            {"$match": {"payment_status": "paid", "store_id": store_id}},
            {"$group": {"_id": None, "total": {"$sum": "$total"}}}
        ]
        revenue_result = await db.orders.aggregate(pipeline).to_list(1)
        total_revenue = revenue_result[0]["total"] if revenue_result else 0
        
        # Average order value
        avg_order_value = total_revenue / total_orders if total_orders > 0 else 0
        
        # Today's orders
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        today_orders = await db.orders.count_documents({"created_at": {"$gte": today}, "store_id": store_id})
        
        # Today's revenue
        today_pipeline = [
            {"$match": {"created_at": {"$gte": today}, "payment_status": "paid", "store_id": store_id}},
            {"$group": {"_id": None, "total": {"$sum": "$total"}}}
        ]
        today_revenue_result = await db.orders.aggregate(today_pipeline).to_list(1)
        today_revenue = today_revenue_result[0]["total"] if today_revenue_result else 0
        
        return {
            "totalOrders": total_orders,
            "pendingOrders": pending_orders,
            "totalRevenue": total_revenue,
            "avgOrderValue": avg_order_value,
            "todayOrders": today_orders,
            "todayRevenue": today_revenue
        }
    except Exception as e:
        return {"totalOrders": 0, "pendingOrders": 0, "totalRevenue": 0, "avgOrderValue": 0, "todayOrders": 0, "todayRevenue": 0}

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, request: Request):
    store_id = await get_store_id_from_header(request)
    order = await db.orders.find_one({"id": order_id, "store_id": store_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@api_router.patch("/orders/{order_id}/status")
async def update_order_status(order_id: str, status: str, request: Request, notify: bool = False):
    store_id = await get_store_id_from_header(request)
    valid_statuses = ["pending", "processing", "shipped", "delivered", "cancelled", "refunded"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    result = await db.orders.update_one(
        {"id": order_id, "store_id": store_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # TODO: If notify=True, send email to customer
    
    return {"message": f"Order status updated to {status}"}

@api_router.patch("/orders/{order_id}/tracking")
async def update_order_tracking(order_id: str, tracking_number: str, carrier: str, notify_customer: bool = True):
    """Update order tracking information"""
    result = await db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "tracking_number": tracking_number,
            "tracking_carrier": carrier,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {"message": "Tracking information updated"}

@api_router.post("/orders/{order_id}/notes")
async def add_order_note(order_id: str, note: str, type: str = "internal", notify_customer: bool = False):
    """Add a note to an order"""
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    note_entry = {
        "content": note,
        "type": type,
        "author": "Staff",  # TODO: Get from auth context
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.orders.update_one(
        {"id": order_id},
        {
            "$push": {"internal_notes": note_entry},
            "$set": {"updated_at": datetime.now(timezone.utc)}
        }
    )
    
    return {"message": "Note added successfully"}

@api_router.get("/orders/{order_id}/timeline")
async def get_order_timeline(order_id: str):
    """Get order activity timeline"""
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Build timeline from order data
    timeline = []
    # Add internal notes to timeline
    if order.get("internal_notes"):
        for note in order["internal_notes"]:
            timeline.append({
                "description": note.get("content", ""),
                "type": note.get("type", "internal"),
                "created_at": note.get("created_at")
            })
    
    return timeline

@api_router.post("/orders/{order_id}/refund")
async def process_order_refund(order_id: str, amount: float, reason: str):
    """Process a refund for an order"""
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.get("payment_status") != "paid":
        raise HTTPException(status_code=400, detail="Order is not paid")
    
    # TODO: Process actual refund via Stripe if payment was via card
    
    # Update order status
    new_payment_status = "refunded" if amount >= order.get("total", 0) else "partial_refund"
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "payment_status": new_payment_status,
            "refund_amount": amount,
            "refund_reason": reason,
            "refunded_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    return {"message": f"Refund of ${amount:.2f} processed", "new_status": new_payment_status}

@api_router.patch("/orders/{order_id}")
async def update_order(order_id: str, updates: dict):
    """Update order fields (items, addresses, customer info, etc.)"""
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Allowed fields to update
    allowed_fields = [
        "items", "subtotal", "discount", "shipping", "tax", "total",
        "customer_name", "customer_email", "customer_phone", "company_name",
        "shipping_address", "shipping_city", "shipping_state", "shipping_postcode", "shipping_country",
        "billing_address", "billing_city", "billing_state", "billing_postcode", "billing_country",
        "notes"
    ]
    
    update_data = {k: v for k, v in updates.items() if k in allowed_fields}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.orders.update_one({"id": order_id}, {"$set": update_data})
    return {"message": "Order updated successfully"}

@api_router.delete("/orders/{order_id}")
async def delete_order(order_id: str):
    """Delete an order - only allowed for cancelled orders"""
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Only allow deletion of cancelled orders
    if order.get("status") != "cancelled":
        raise HTTPException(
            status_code=400, 
            detail="Only cancelled orders can be deleted. Please cancel the order first."
        )
    
    # Delete the order
    await db.orders.delete_one({"id": order_id})
    
    return {"message": "Order deleted successfully"}

@api_router.patch("/orders/{order_id}/fulfillment")
async def update_order_fulfillment(order_id: str, fulfillment_data: dict):
    """Update order fulfillment status (pick, pack, dispatch)"""
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    update_data = {
        "fulfillment_status": fulfillment_data.get("status"),
        "updated_at": datetime.now(timezone.utc)
    }
    
    if fulfillment_data.get("picked_items"):
        update_data["picked_items"] = fulfillment_data["picked_items"]
        update_data["picked_at"] = fulfillment_data.get("picked_at")
    
    if fulfillment_data.get("packed_items"):
        update_data["packed_items"] = fulfillment_data["packed_items"]
        update_data["packed_at"] = fulfillment_data.get("packed_at")
        update_data["package_weight"] = fulfillment_data.get("package_weight")
        update_data["package_dimensions"] = fulfillment_data.get("package_dimensions")
    
    if fulfillment_data.get("tracking_number"):
        update_data["tracking_number"] = fulfillment_data["tracking_number"]
        update_data["tracking_carrier"] = fulfillment_data.get("tracking_carrier")
        update_data["tracking_url"] = fulfillment_data.get("tracking_url")
        update_data["dispatched_at"] = fulfillment_data.get("dispatched_at")
    
    await db.orders.update_one({"id": order_id}, {"$set": update_data})
    
    # Add to timeline
    await db.orders.update_one(
        {"id": order_id},
        {"$push": {"timeline": {
            "action": f"fulfillment_{fulfillment_data.get('status')}",
            "description": f"Order marked as {fulfillment_data.get('status')}",
            "created_at": datetime.now(timezone.utc).isoformat()
        }}}
    )
    
    return {"message": f"Fulfillment status updated to {fulfillment_data.get('status')}"}

@api_router.get("/orders/{order_id}/emails")
async def get_order_emails(order_id: str):
    """Get email history for an order"""
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return order.get("email_history", [])

@api_router.post("/orders/{order_id}/email")
async def send_order_email(order_id: str, email_data: dict):
    """Send email to customer about their order"""
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Save to email history
    email_record = {
        "template": email_data.get("template", "custom"),
        "subject": email_data.get("subject", ""),
        "body": email_data.get("body", ""),
        "to": email_data.get("to", order.get("customer_email")),
        "sent_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.orders.update_one(
        {"id": order_id},
        {"$push": {"email_history": email_record}}
    )
    
    # TODO: Implement actual email sending via email service
    
    return {"message": f"Email sent to {order.get('customer_email')}"}

@api_router.get("/orders/{order_id}/invoice")
async def get_order_invoice(order_id: str, format: str = "html"):
    """Generate invoice for an order (HTML or PDF)"""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    store_settings = await db.store_settings.find_one({"id": "store_settings"}, {"_id": 0})
    
    if format == "pdf":
        pdf_bytes = PDFGenerator.generate_invoice_pdf(order, store_settings)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=invoice-{order.get('order_number', order_id)}.pdf"
            }
        )
    
    # Return HTML for print preview
    currency = store_settings.get('currency_symbol', '$') if store_settings else '$'
    store_name = store_settings.get('store_name', 'TOOLS IN A BOX') if store_settings else 'TOOLS IN A BOX'
    
    # Handle shipping address (can be string or dict)
    shipping_addr = order.get('shipping_address', {})
    if isinstance(shipping_addr, str):
        ship_street = shipping_addr
        ship_city_state = ''
        ship_country = ''
    else:
        ship_street = shipping_addr.get('street', '')
        ship_city_state = f"{shipping_addr.get('city', '')}, {shipping_addr.get('state', '')} {shipping_addr.get('postcode', '')}"
        ship_country = shipping_addr.get('country', 'Australia')
    
    items_html = ""
    for item in order.get('items', []):
        qty = item.get('quantity', 1)
        price = item.get('price', 0)
        total = qty * price
        items_html += f"""
        <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e5e5;">{item.get('name', 'Product')}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e5e5;">{item.get('sku', 'N/A')}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: center;">{qty}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: right;">{currency}{price:.2f}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: right;">{currency}{total:.2f}</td>
        </tr>
        """
    
    subtotal = order.get('subtotal', order.get('total', 0))
    shipping = order.get('shipping', 0)
    tax = order.get('tax', subtotal * 0.1)
    total = order.get('total', subtotal + shipping + tax)
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Invoice - {order.get('order_number')}</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 40px; color: #333; }}
            .header {{ margin-bottom: 30px; }}
            .header h1 {{ margin: 0; font-size: 28px; }}
            .header h2 {{ margin: 10px 0 0 0; font-size: 18px; color: #666; }}
            .details {{ display: flex; justify-content: space-between; margin-bottom: 30px; }}
            .details-box {{ flex: 1; }}
            .details-box h3 {{ margin: 0 0 10px 0; font-size: 14px; color: #666; }}
            table {{ width: 100%; border-collapse: collapse; }}
            th {{ background: #1a1a1a; color: white; padding: 12px; text-align: left; }}
            .totals {{ margin-top: 20px; text-align: right; }}
            .totals table {{ width: 300px; margin-left: auto; }}
            .totals td {{ padding: 8px 0; }}
            .totals .total-row {{ font-weight: bold; font-size: 18px; border-top: 2px solid #333; }}
            @media print {{ body {{ margin: 20px; }} }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>{store_name}</h1>
            <h2>TAX INVOICE</h2>
        </div>
        
        <div class="details">
            <div class="details-box">
                <h3>Invoice Details</h3>
                <p><strong>Invoice #:</strong> {order.get('order_number', 'N/A')}</p>
                <p><strong>Date:</strong> {str(order.get('created_at', ''))[:10]}</p>
                <p><strong>Status:</strong> {order.get('payment_status', 'Pending').title()}</p>
            </div>
            <div class="details-box">
                <h3>Bill To</h3>
                <p>{order.get('customer_name', 'N/A')}</p>
                <p>{order.get('customer_email', '')}</p>
                <p>{order.get('customer_phone', '')}</p>
            </div>
            <div class="details-box">
                <h3>Ship To</h3>
                <p>{ship_street}</p>
                <p>{ship_city_state}</p>
                <p>{ship_country}</p>
            </div>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th style="text-align: center;">Qty</th>
                    <th style="text-align: right;">Unit Price</th>
                    <th style="text-align: right;">Total</th>
                </tr>
            </thead>
            <tbody>
                {items_html}
            </tbody>
        </table>
        
        <div class="totals">
            <table>
                <tr><td>Subtotal:</td><td style="text-align: right;">{currency}{subtotal:.2f}</td></tr>
                <tr><td>Shipping:</td><td style="text-align: right;">{currency}{shipping:.2f}</td></tr>
                <tr><td>GST (10%):</td><td style="text-align: right;">{currency}{tax:.2f}</td></tr>
                <tr class="total-row"><td>Total:</td><td style="text-align: right;">{currency}{total:.2f}</td></tr>
            </table>
        </div>
        
        <p style="margin-top: 40px; text-align: center; color: #666; font-size: 12px;">
            Thank you for your business!
        </p>
    </body>
    </html>
    """
    return HTMLResponse(content=html)

@api_router.get("/orders/{order_id}/packing-slip")
async def get_packing_slip(order_id: str, format: str = "pdf"):
    """Generate packing slip for an order"""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    store_settings = await db.store_settings.find_one({"id": "store_settings"}, {"_id": 0})
    
    pdf_bytes = PDFGenerator.generate_packing_slip_pdf(order, store_settings)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=packing-slip-{order.get('order_number', order_id)}.pdf"
        }
    )

@api_router.get("/orders/export")
async def export_orders(format: str = "csv"):
    """Export orders to CSV/Excel/PDF"""
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    if format == "csv":
        # Generate CSV
        import csv
        import io
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Order Number", "Customer", "Email", "Total", "Status", "Payment Status", "Date"])
        for order in orders:
            writer.writerow([
                order.get("order_number", ""),
                order.get("customer_name", ""),
                order.get("customer_email", ""),
                order.get("total", 0),
                order.get("status", ""),
                order.get("payment_status", ""),
                order.get("created_at", "")
            ])
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=orders.csv"}
        )
    
    return {"message": f"Export format {format} not yet implemented"}

# ==================== CHECKOUT & PAYMENT ====================

class CheckoutRequest(BaseModel):
    customer_name: str
    customer_email: str
    customer_phone: Optional[str] = None
    company_name: Optional[str] = None
    shipping_address: str
    shipping_city: str
    shipping_state: str
    shipping_postcode: str
    shipping_country: str = "AU"
    billing_same_as_shipping: bool = True
    billing_address: Optional[str] = None
    billing_city: Optional[str] = None
    billing_state: Optional[str] = None
    billing_postcode: Optional[str] = None
    billing_country: Optional[str] = None
    cart_id: str
    shipping_method: Optional[str] = None
    shipping_cost: float = 0
    payment_method: str = "card"  # card, bank_transfer, pay_later
    notes: Optional[str] = None
    purchase_order: Optional[str] = None

# ==================== RETURNS/REFUNDS ENDPOINTS ====================

@api_router.get("/returns")
async def get_returns(
    status: Optional[str] = None,
    limit: int = 50,
    skip: int = 0
):
    """Get all return requests"""
    query = {}
    if status:
        query["status"] = status
    
    returns = await db.returns.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.returns.count_documents(query)
    
    return {"returns": returns, "total": total}

@api_router.get("/returns/stats")
async def get_returns_stats():
    """Get returns statistics"""
    total = await db.returns.count_documents({})
    pending = await db.returns.count_documents({"status": "pending"})
    approved = await db.returns.count_documents({"status": "approved"})
    received = await db.returns.count_documents({"status": "received"})
    refunded = await db.returns.count_documents({"status": "refunded"})
    
    # Calculate total refund amount
    pipeline = [
        {"$match": {"refund_status": "completed"}},
        {"$group": {"_id": None, "total": {"$sum": "$refund_amount"}}}
    ]
    result = await db.returns.aggregate(pipeline).to_list(1)
    total_refunded = result[0]["total"] if result else 0
    
    return {
        "total": total,
        "pending": pending,
        "approved": approved,
        "received": received,
        "refunded": refunded,
        "total_refunded": total_refunded
    }

@api_router.get("/returns/{return_id}")
async def get_return(return_id: str):
    """Get a specific return request"""
    ret = await db.returns.find_one({"id": return_id}, {"_id": 0})
    if not ret:
        raise HTTPException(status_code=404, detail="Return not found")
    return ret

@api_router.post("/returns")
async def create_return(return_data: Dict[str, Any]):
    """Create a new return request"""
    order = await db.orders.find_one({"id": return_data.get("order_id")})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    new_return = ReturnRequest(
        order_id=return_data.get("order_id"),
        order_number=order.get("order_number", ""),
        customer_id=order.get("customer_id"),
        customer_name=order.get("customer_name", ""),
        customer_email=order.get("customer_email", ""),
        items=return_data.get("items", []),
        reason=return_data.get("reason", "other"),
        description=return_data.get("description"),
        refund_amount=return_data.get("refund_amount", 0),
        refund_method=return_data.get("refund_method", "original"),
        images=return_data.get("images", [])
    )
    
    await db.returns.insert_one(new_return.dict())
    return new_return.dict()

@api_router.put("/returns/{return_id}")
async def update_return(return_id: str, update_data: Dict[str, Any]):
    """Update a return request"""
    ret = await db.returns.find_one({"id": return_id})
    if not ret:
        raise HTTPException(status_code=404, detail="Return not found")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Set timestamp for status changes
    if update_data.get("status") == "approved" and ret.get("status") != "approved":
        update_data["approved_at"] = datetime.now(timezone.utc).isoformat()
    elif update_data.get("status") == "received" and ret.get("status") != "received":
        update_data["received_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.returns.update_one({"id": return_id}, {"$set": update_data})
    return await db.returns.find_one({"id": return_id}, {"_id": 0})

@api_router.post("/returns/{return_id}/approve")
async def approve_return(return_id: str, approval_data: Dict[str, Any] = {}):
    """Approve a return request"""
    ret = await db.returns.find_one({"id": return_id})
    if not ret:
        raise HTTPException(status_code=404, detail="Return not found")
    
    update = {
        "status": "approved",
        "approved_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    if approval_data.get("refund_amount"):
        update["refund_amount"] = approval_data["refund_amount"]
    if approval_data.get("merchant_notes"):
        update["merchant_notes"] = approval_data["merchant_notes"]
    
    await db.returns.update_one({"id": return_id}, {"$set": update})
    return await db.returns.find_one({"id": return_id}, {"_id": 0})

@api_router.post("/returns/{return_id}/reject")
async def reject_return(return_id: str, rejection_data: Dict[str, Any] = {}):
    """Reject a return request"""
    ret = await db.returns.find_one({"id": return_id})
    if not ret:
        raise HTTPException(status_code=404, detail="Return not found")
    
    update = {
        "status": "rejected",
        "merchant_notes": rejection_data.get("reason", ""),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.returns.update_one({"id": return_id}, {"$set": update})
    return await db.returns.find_one({"id": return_id}, {"_id": 0})

@api_router.post("/returns/{return_id}/receive")
async def receive_return(return_id: str):
    """Mark return items as received"""
    ret = await db.returns.find_one({"id": return_id})
    if not ret:
        raise HTTPException(status_code=404, detail="Return not found")
    
    update = {
        "status": "received",
        "received_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.returns.update_one({"id": return_id}, {"$set": update})
    return await db.returns.find_one({"id": return_id}, {"_id": 0})

@api_router.post("/returns/{return_id}/refund")
async def process_return_refund(return_id: str, refund_data: Dict[str, Any] = {}):
    """Process refund for a return"""
    ret = await db.returns.find_one({"id": return_id})
    if not ret:
        raise HTTPException(status_code=404, detail="Return not found")
    
    refund_amount = refund_data.get("amount", ret.get("refund_amount", 0))
    
    update = {
        "status": "refunded",
        "refund_status": "completed",
        "refund_amount": refund_amount,
        "refunded_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.returns.update_one({"id": return_id}, {"$set": update})
    
    # Update original order
    await db.orders.update_one(
        {"id": ret.get("order_id")},
        {"$set": {"payment_status": "refunded", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return await db.returns.find_one({"id": return_id}, {"_id": 0})

@api_router.delete("/returns/{return_id}")
async def delete_return(return_id: str):
    """Delete a return request"""
    ret = await db.returns.find_one({"id": return_id})
    if not ret:
        raise HTTPException(status_code=404, detail="Return not found")
    
    if ret.get("status") not in ["pending", "rejected"]:
        raise HTTPException(status_code=400, detail="Can only delete pending or rejected returns")
    
    await db.returns.delete_one({"id": return_id})
    return {"message": "Return deleted successfully"}

# ==================== CHECKOUT ====================
async def create_payment_intent(amount: float, currency: str = "aud"):
    """Create a Stripe payment intent for checkout"""
    try:
        if not stripe.api_key:
            raise HTTPException(status_code=500, detail="Stripe not configured")
        
        intent = stripe.PaymentIntent.create(
            amount=int(amount * 100),  # Stripe uses cents
            currency=currency.lower(),
            automatic_payment_methods={"enabled": True},
        )
        return {"client_secret": intent.client_secret, "payment_intent_id": intent.id}
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/checkout/process")
async def process_checkout(checkout: CheckoutRequest):
    """Process checkout - creates order and handles payment"""
    # Get cart
    cart = await db.carts.find_one({"id": checkout.cart_id})
    if not cart or not cart.get("items"):
        raise HTTPException(status_code=400, detail="Cart is empty or not found")
    
    # Calculate totals
    subtotal = sum(item["price"] * item["quantity"] for item in cart["items"])
    tax = subtotal * 0.1  # 10% GST
    total = subtotal + checkout.shipping_cost + tax
    
    # Build shipping address string
    shipping_full = f"{checkout.shipping_address}, {checkout.shipping_city}, {checkout.shipping_state} {checkout.shipping_postcode}, {checkout.shipping_country}"
    
    # Build billing address
    if checkout.billing_same_as_shipping:
        billing_full = shipping_full
    else:
        billing_full = f"{checkout.billing_address}, {checkout.billing_city}, {checkout.billing_state} {checkout.billing_postcode}, {checkout.billing_country}"
    
    # Create order items
    order_items = [
        OrderItemBase(
            product_id=item["product_id"],
            product_name=item["name"],
            price=item["price"],
            quantity=item["quantity"],
            image=item.get("image")
        ) for item in cart["items"]
    ]
    
    # Create order
    new_order = Order(
        customer_name=checkout.customer_name,
        customer_email=checkout.customer_email,
        customer_phone=checkout.customer_phone,
        shipping_address=shipping_full,
        items=[item.dict() for item in order_items],
        subtotal=subtotal,
        shipping=checkout.shipping_cost,
        tax=tax,
        total=total,
        payment_method=checkout.payment_method,
        status="pending" if checkout.payment_method != "card" else "processing",
        payment_status="pending" if checkout.payment_method != "card" else "paid",
        notes=checkout.notes
    )
    
    # Generate custom order number
    new_order.order_number = await generate_order_number()
    
    await db.orders.insert_one(new_order.dict())
    
    # Deduct stock for each item
    for item in cart["items"]:
        await db.products.update_one(
            {"id": item["product_id"]},
            {"$inc": {"stock": -item["quantity"], "sales_count": item["quantity"]}}
        )
    
    # Update or create customer
    customer = await db.customers.find_one({"email": checkout.customer_email})
    if customer:
        await db.customers.update_one(
            {"email": checkout.customer_email},
            {
                "$inc": {"total_orders": 1, "total_spent": total},
                "$set": {"updated_at": datetime.now(timezone.utc)}
            }
        )
    else:
        new_customer = Customer(
            name=checkout.customer_name,
            email=checkout.customer_email,
            phone=checkout.customer_phone,
            total_orders=1,
            total_spent=total
        )
        await db.customers.insert_one(new_customer.dict())
    
    # Clear cart
    await db.carts.delete_one({"id": checkout.cart_id})
    
    return {
        "success": True,
        "order_id": new_order.id,
        "order_number": new_order.order_number,
        "total": total,
        "message": "Order placed successfully!"
    }

@api_router.post("/checkout/confirm-payment/{order_id}")
async def confirm_payment(order_id: str, payment_intent_id: str):
    """Confirm payment for an order after Stripe payment"""
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Update order with payment info
    await db.orders.update_one(
        {"id": order_id},
        {
            "$set": {
                "payment_status": "paid",
                "payment_intent_id": payment_intent_id,
                "status": "processing",
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )
    
    return {"success": True, "message": "Payment confirmed"}

# ==================== QUOTE ENDPOINTS ====================

@api_router.post("/quotes", response_model=Quote)
async def create_quote(quote: QuoteCreate):
    """Create a new quote request - does NOT deduct stock"""
    new_quote = Quote(**quote.dict())
    new_quote.valid_until = datetime.now(timezone.utc) + timedelta(days=30)  # 30 day validity
    await db.quotes.insert_one(new_quote.dict())
    return new_quote

@api_router.get("/quotes")
async def get_quotes(
    status: Optional[str] = None,
    limit: int = Query(default=50, le=100),
    skip: int = 0
):
    """Get all quotes"""
    query = {}
    if status:
        query["status"] = status
    quotes = await db.quotes.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return quotes

@api_router.get("/quotes/stats")
async def get_quotes_stats():
    """Get quote statistics for dashboard"""
    try:
        total_quotes = await db.quotes.count_documents({})
        pending_quotes = await db.quotes.count_documents({"status": {"$in": ["pending", "sent"]}})
        accepted_quotes = await db.quotes.count_documents({"status": {"$in": ["accepted", "converted"]}})
        
        # Total value of all quotes
        pipeline = [
            {"$group": {"_id": None, "total": {"$sum": "$total"}}}
        ]
        value_result = await db.quotes.aggregate(pipeline).to_list(1)
        total_value = value_result[0]["total"] if value_result else 0
        
        # Conversion rate
        converted = await db.quotes.count_documents({"status": "converted"})
        conversion_rate = (converted / total_quotes * 100) if total_quotes > 0 else 0
        
        return {
            "totalQuotes": total_quotes,
            "pendingQuotes": pending_quotes,
            "acceptedQuotes": accepted_quotes,
            "totalValue": total_value,
            "conversionRate": round(conversion_rate, 1)
        }
    except Exception as e:
        return {"totalQuotes": 0, "pendingQuotes": 0, "acceptedQuotes": 0, "totalValue": 0, "conversionRate": 0}

@api_router.post("/quotes/{quote_id}/send")
async def send_quote_to_customer(quote_id: str, subject: str = "", body: str = ""):
    """Send quote email to customer"""
    quote = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    # TODO: Implement actual email sending with PDF attachment
    
    # Update quote status to sent
    await db.quotes.update_one(
        {"id": quote_id},
        {"$set": {"status": "sent", "updated_at": datetime.now(timezone.utc)}}
    )
    
    return {"message": f"Quote sent to {quote.get('customer_email')}"}

@api_router.get("/quotes/{quote_id}/print")
async def print_quote(quote_id: str):
    """Generate printable quote HTML"""
    quote = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    # Generate print-friendly HTML
    return HTMLResponse(content=f"""
    <html>
    <head><title>Quote {quote.get('quote_number')}</title>
    <style>
        body {{ font-family: Arial, sans-serif; padding: 40px; }}
        h1 {{ color: #333; }}
        table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
        th, td {{ border: 1px solid #ddd; padding: 12px; text-align: left; }}
        th {{ background: #f5f5f5; }}
        .total {{ font-weight: bold; font-size: 18px; }}
    </style>
    </head>
    <body>
        <h1>Quote: {quote.get('quote_number')}</h1>
        <p><strong>Customer:</strong> {quote.get('customer_name')}</p>
        <p><strong>Email:</strong> {quote.get('customer_email')}</p>
        <p><strong>Valid Until:</strong> {quote.get('valid_until', 'N/A')}</p>
        <p class="total"><strong>Total:</strong> ${quote.get('total', 0):.2f}</p>
    </body>
    </html>
    """)

@api_router.get("/quotes/{quote_id}/pdf")
async def download_quote_pdf(quote_id: str):
    """Generate quote PDF"""
    quote = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    store_settings = await db.store_settings.find_one({"id": "store_settings"}, {"_id": 0})
    
    pdf_bytes = PDFGenerator.generate_quote_pdf(quote, store_settings)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=quote-{quote.get('quote_number', quote_id)}.pdf"
        }
    )

@api_router.get("/quotes/{quote_id}")
async def get_quote(quote_id: str):
    """Get a single quote"""
    quote = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    return quote

@api_router.put("/quotes/{quote_id}")
async def update_quote(quote_id: str, update: QuoteUpdate):
    """Update a quote"""
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    result = await db.quotes.update_one(
        {"id": quote_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    quote = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    return quote

@api_router.post("/quotes/{quote_id}/convert-to-order")
async def convert_quote_to_order(quote_id: str):
    """Convert a quote to an order - NOW deducts stock"""
    quote = await db.quotes.find_one({"id": quote_id})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    if quote.get("status") == "converted":
        raise HTTPException(status_code=400, detail="Quote already converted to order")
    
    # Create order from quote
    new_order = Order(
        customer_name=quote["customer_name"],
        customer_email=quote["customer_email"],
        customer_phone=quote.get("customer_phone"),
        shipping_address=quote["shipping_address"],
        items=quote["items"],
        subtotal=quote["subtotal"],
        shipping=quote["shipping"],
        tax=quote["tax"],
        total=quote["total"],
        payment_method="quote",
        status="pending",
        payment_status="pending",
        notes=f"Converted from Quote #{quote['quote_number']}"
    )
    
    # Generate custom order number
    new_order.order_number = await generate_order_number()
    
    await db.orders.insert_one(new_order.dict())
    
    # Deduct stock NOW (not when quote was created)
    for item in quote["items"]:
        await db.products.update_one(
            {"id": item["product_id"]},
            {"$inc": {"stock": -item["quantity"], "sales_count": item["quantity"]}}
        )
    
    # Update quote status
    await db.quotes.update_one(
        {"id": quote_id},
        {
            "$set": {
                "status": "converted",
                "converted_order_id": new_order.id,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )
    
    # Update customer stats
    customer = await db.customers.find_one({"email": quote["customer_email"]})
    if customer:
        await db.customers.update_one(
            {"email": quote["customer_email"]},
            {
                "$inc": {"total_orders": 1, "total_spent": quote["total"]},
                "$set": {"updated_at": datetime.now(timezone.utc)}
            }
        )
    else:
        new_customer = Customer(
            name=quote["customer_name"],
            email=quote["customer_email"],
            phone=quote.get("customer_phone"),
            total_orders=1,
            total_spent=quote["total"]
        )
        await db.customers.insert_one(new_customer.dict())
    
    return {
        "success": True,
        "order_id": new_order.id,
        "order_number": new_order.order_number,
        "message": "Quote converted to order successfully"
    }

@api_router.delete("/quotes/{quote_id}")
async def delete_quote(quote_id: str):
    """Delete a quote"""
    result = await db.quotes.delete_one({"id": quote_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Quote not found")
    return {"message": "Quote deleted"}

# ==================== CUSTOMER ENDPOINTS ====================

@api_router.post("/customers", response_model=Customer)
async def create_customer(customer: CustomerCreate, request: Request):
    store_id = await get_store_id_from_header(request)
    # Check if customer with email exists in this store
    existing = await db.customers.find_one({"email": customer.email, "store_id": store_id})
    if existing:
        raise HTTPException(status_code=400, detail="Customer with this email already exists")
    
    new_customer = Customer(**customer.dict(exclude={'password'}))
    cust_dict = new_customer.dict()
    cust_dict["store_id"] = store_id
    await db.customers.insert_one(cust_dict)
    return new_customer

@api_router.get("/customers", response_model=List[Customer])
async def get_customers(
    request: Request,
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(default=50, le=100),
    skip: int = 0
):
    store_id = await get_store_id_from_header(request)
    query = {"store_id": store_id}
    if status:
        query["status"] = status
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}}
        ]
    
    customers = await db.customers.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return [Customer(**cust) for cust in customers]

@api_router.get("/customers/{customer_id}", response_model=Customer)
async def get_customer(customer_id: str, request: Request):
    store_id = await get_store_id_from_header(request)
    customer = await db.customers.find_one({"id": customer_id, "store_id": store_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return Customer(**customer)

@api_router.put("/customers/{customer_id}", response_model=Customer)
async def update_customer(customer_id: str, customer: CustomerUpdate, request: Request):
    store_id = await get_store_id_from_header(request)
    update_data = {k: v for k, v in customer.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    result = await db.customers.update_one(
        {"id": customer_id, "store_id": store_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    updated = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    return Customer(**updated)

@api_router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str, request: Request):
    store_id = await get_store_id_from_header(request)
    result = await db.customers.delete_one({"id": customer_id, "store_id": store_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"message": "Customer deleted successfully"}

# ==================== DASHBOARD STATS ====================

@api_router.get("/stats/dashboard")
async def get_dashboard_stats(request: Request):
    store_id = await get_store_id_from_header(request)
    total_products = await db.products.count_documents({"store_id": store_id})
    total_orders = await db.orders.count_documents({"store_id": store_id})
    total_customers = await db.customers.count_documents({"store_id": store_id})
    
    # Calculate total revenue
    pipeline = [
        {"$match": {"payment_status": "paid", "store_id": store_id}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ]
    revenue_result = await db.orders.aggregate(pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    # Pending orders
    pending_orders = await db.orders.count_documents({"status": "pending"})
    
    # Low stock products
    low_stock = await db.products.count_documents({"stock": {"$lte": 10, "$gt": 0}})
    out_of_stock = await db.products.count_documents({"stock": 0})
    
    return {
        "total_products": total_products,
        "total_orders": total_orders,
        "total_customers": total_customers,
        "total_revenue": total_revenue,
        "pending_orders": pending_orders,
        "low_stock_products": low_stock,
        "out_of_stock_products": out_of_stock
    }

# ==================== HERO BANNERS ====================

@api_router.get("/banners", response_model=List[HeroBanner])
async def get_banners(request: Request, include_inactive: bool = False):
    store_id = await get_store_id_from_header(request)
    query = {"store_id": store_id} if not include_inactive else {"store_id": store_id}
    if not include_inactive:
        query["is_active"] = True
    banners = await db.banners.find(query, {"_id": 0}).sort("sort_order", 1).to_list(20)
    # Handle legacy banners that don't have name field - use title as fallback
    result = []
    for banner in banners:
        if not banner.get('name'):
            banner['name'] = banner.get('title', 'Untitled Banner')
        result.append(HeroBanner(**banner))
    return result

@api_router.post("/banners", response_model=HeroBanner)
async def create_banner(banner: HeroBanner, request: Request):
    store_id = await get_store_id_from_header(request)
    banner_data = banner.dict()
    banner_data["store_id"] = store_id
    # Ensure name is set
    if not banner_data.get('name'):
        banner_data['name'] = banner_data.get('title', 'Untitled Banner')
    await db.banners.insert_one(banner_data)
    return HeroBanner(**banner_data)

@api_router.put("/banners/{banner_id}", response_model=HeroBanner)
async def update_banner(banner_id: str, banner: BannerUpdate, request: Request):
    store_id = await get_store_id_from_header(request)
    update_data = {k: v for k, v in banner.dict().items() if v is not None}
    result = await db.banners.update_one(
        {"id": banner_id, "store_id": store_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Banner not found")
    updated = await db.banners.find_one({"id": banner_id}, {"_id": 0})
    if not updated.get('name'):
        updated['name'] = updated.get('title', 'Untitled Banner')
    return HeroBanner(**updated)

@api_router.delete("/banners/{banner_id}")
async def delete_banner(banner_id: str, request: Request):
    store_id = await get_store_id_from_header(request)
    result = await db.banners.delete_one({"id": banner_id, "store_id": store_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Banner not found")
    return {"message": "Banner deleted successfully"}

# ==================== CONTENT ZONES ====================

@api_router.get("/content-zones", response_model=List[ContentZone])
async def get_content_zones(request: Request, page: Optional[str] = None, include_inactive: bool = False):
    """Get all content zones, optionally filtered by page"""
    store_id = await get_store_id_from_header(request)
    query = {"store_id": store_id}
    if page:
        query["page"] = page
    if not include_inactive:
        query["is_active"] = True
    
    zones = await db.content_zones.find(query, {"_id": 0}).sort("name", 1).to_list(100)
    return [ContentZone(**zone) for zone in zones]

@api_router.get("/content-zones/{zone_id}", response_model=ContentZone)
async def get_content_zone(zone_id: str, request: Request):
    """Get a specific content zone by ID"""
    store_id = await get_store_id_from_header(request)
    zone = await db.content_zones.find_one({"id": zone_id, "store_id": store_id}, {"_id": 0})
    if not zone:
        raise HTTPException(status_code=404, detail="Content zone not found")
    return ContentZone(**zone)

@api_router.get("/content-zones/by-name/{zone_name}")
async def get_content_zone_by_name(zone_name: str, request: Request):
    """Get a content zone by its unique name"""
    store_id = await get_store_id_from_header(request)
    zone = await db.content_zones.find_one({"name": zone_name, "store_id": store_id}, {"_id": 0})
    if not zone:
        raise HTTPException(status_code=404, detail="Content zone not found")
    return ContentZone(**zone)

@api_router.post("/content-zones", response_model=ContentZone)
async def create_content_zone(zone: ContentZoneCreate, request: Request):
    """Create a new content zone"""
    store_id = await get_store_id_from_header(request)
    # Check if name already exists for this store
    existing = await db.content_zones.find_one({"name": zone.name, "store_id": store_id})
    if existing:
        raise HTTPException(status_code=400, detail="Content zone with this name already exists")
    
    zone_data = ContentZone(
        **zone.dict(),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    zone_dict = zone_data.dict()
    zone_dict["store_id"] = store_id
    await db.content_zones.insert_one(zone_dict)
    return zone_data

@api_router.put("/content-zones/{zone_id}", response_model=ContentZone)
async def update_content_zone(zone_id: str, zone_update: ContentZoneUpdate, request: Request):
    """Update a content zone"""
    store_id = await get_store_id_from_header(request)
    update_data = {k: v for k, v in zone_update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    result = await db.content_zones.update_one(
        {"id": zone_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Content zone not found")
    
    updated = await db.content_zones.find_one({"id": zone_id}, {"_id": 0})
    return ContentZone(**updated)

@api_router.delete("/content-zones/{zone_id}")
async def delete_content_zone(zone_id: str):
    """Delete a content zone"""
    result = await db.content_zones.delete_one({"id": zone_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Content zone not found")
    return {"message": "Content zone deleted successfully"}

@api_router.post("/content-zones/{zone_id}/blocks", response_model=ContentZone)
async def add_content_block(zone_id: str, block: ContentBlock):
    """Add a new content block to a zone"""
    zone = await db.content_zones.find_one({"id": zone_id})
    if not zone:
        raise HTTPException(status_code=404, detail="Content zone not found")
    
    # Set sort_order to end of list
    blocks = zone.get("blocks", [])
    block.sort_order = len(blocks)
    
    await db.content_zones.update_one(
        {"id": zone_id},
        {
            "$push": {"blocks": block.dict()},
            "$set": {"updated_at": datetime.now(timezone.utc)}
        }
    )
    
    updated = await db.content_zones.find_one({"id": zone_id}, {"_id": 0})
    return ContentZone(**updated)

@api_router.put("/content-zones/{zone_id}/blocks/{block_id}")
async def update_content_block(zone_id: str, block_id: str, block_update: Dict[str, Any]):
    """Update a specific content block within a zone"""
    zone = await db.content_zones.find_one({"id": zone_id})
    if not zone:
        raise HTTPException(status_code=404, detail="Content zone not found")
    
    # Find and update the block
    blocks = zone.get("blocks", [])
    block_found = False
    for i, b in enumerate(blocks):
        if b.get("id") == block_id:
            blocks[i] = {**b, **block_update}
            block_found = True
            break
    
    if not block_found:
        raise HTTPException(status_code=404, detail="Content block not found")
    
    await db.content_zones.update_one(
        {"id": zone_id},
        {
            "$set": {
                "blocks": blocks,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )
    
    updated = await db.content_zones.find_one({"id": zone_id}, {"_id": 0})
    return ContentZone(**updated)

@api_router.delete("/content-zones/{zone_id}/blocks/{block_id}")
async def delete_content_block(zone_id: str, block_id: str):
    """Delete a content block from a zone"""
    zone = await db.content_zones.find_one({"id": zone_id})
    if not zone:
        raise HTTPException(status_code=404, detail="Content zone not found")
    
    blocks = zone.get("blocks", [])
    new_blocks = [b for b in blocks if b.get("id") != block_id]
    
    if len(new_blocks) == len(blocks):
        raise HTTPException(status_code=404, detail="Content block not found")
    
    await db.content_zones.update_one(
        {"id": zone_id},
        {
            "$set": {
                "blocks": new_blocks,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )
    
    return {"message": "Content block deleted successfully"}

@api_router.put("/content-zones/{zone_id}/reorder")
async def reorder_content_blocks(zone_id: str, block_ids: List[str]):
    """Reorder content blocks within a zone"""
    zone = await db.content_zones.find_one({"id": zone_id})
    if not zone:
        raise HTTPException(status_code=404, detail="Content zone not found")
    
    blocks = zone.get("blocks", [])
    blocks_dict = {b["id"]: b for b in blocks}
    
    # Reorder blocks based on provided order
    reordered = []
    for i, block_id in enumerate(block_ids):
        if block_id in blocks_dict:
            block = blocks_dict[block_id]
            block["sort_order"] = i
            reordered.append(block)
    
    await db.content_zones.update_one(
        {"id": zone_id},
        {
            "$set": {
                "blocks": reordered,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )
    
    updated = await db.content_zones.find_one({"id": zone_id}, {"_id": 0})
    return ContentZone(**updated)

@api_router.get("/content-zones/render/{zone_name}")
async def render_content_zone(zone_name: str):
    """Render a content zone to HTML (for preview or AJAX loading)"""
    zone = await db.content_zones.find_one({"name": zone_name, "is_active": True}, {"_id": 0})
    if not zone:
        return {"html": "", "found": False}
    
    html_parts = []
    for block in sorted(zone.get("blocks", []), key=lambda x: x.get("sort_order", 0)):
        if not block.get("is_active", True):
            continue
        
        block_type = block.get("type", "html")
        content = block.get("content", "")
        settings = block.get("settings", {})
        
        if block_type == "html":
            html_parts.append(content)
        elif block_type == "text":
            html_parts.append(f'<div class="content-text">{content}</div>')
        elif block_type == "image":
            src = settings.get("src", "")
            alt = settings.get("alt", "")
            link = settings.get("link", "")
            width = settings.get("width", "100%")
            img_html = f'<img src="{src}" alt="{alt}" style="width:{width};max-width:100%">'
            if link:
                img_html = f'<a href="{link}">{img_html}</a>'
            html_parts.append(f'<div class="content-image">{img_html}</div>')
        elif block_type == "spacer":
            height = settings.get("height", "50px")
            html_parts.append(f'<div class="content-spacer" style="height:{height}"></div>')
        elif block_type == "divider":
            style = settings.get("style", "solid")
            color = settings.get("color", "#e5e7eb")
            html_parts.append(f'<hr class="content-divider" style="border-style:{style};border-color:{color}">')
        elif block_type == "video":
            src = settings.get("src", "")
            # Convert YouTube URL to embed
            if "youtube.com/watch" in src:
                video_id = src.split("v=")[1].split("&")[0] if "v=" in src else ""
                src = f"https://www.youtube.com/embed/{video_id}"
            elif "youtu.be/" in src:
                video_id = src.split("youtu.be/")[1].split("?")[0]
                src = f"https://www.youtube.com/embed/{video_id}"
            html_parts.append(f'<div class="content-video"><iframe src="{src}" frameborder="0" allowfullscreen style="width:100%;aspect-ratio:16/9"></iframe></div>')
        elif block_type == "product_grid":
            # Fetch products and render grid
            limit = settings.get("limit", 4)
            category_id = settings.get("category_id")
            columns = settings.get("columns", 4)
            
            query = {"is_active": True}
            if category_id:
                query["category_id"] = category_id
            
            products = await db.products.find(query, {"_id": 0}).limit(limit).to_list(limit)
            
            grid_html = f'<div class="content-product-grid" style="display:grid;grid-template-columns:repeat({columns},1fr);gap:1rem">'
            for p in products:
                img = p.get("images", [""])[0] if p.get("images") else ""
                grid_html += f'''
                <div class="product-card-mini">
                    <img src="{img}" alt="{p.get('name','')}" style="width:100%;aspect-ratio:1;object-fit:cover">
                    <h4>{p.get('name','')}</h4>
                    <p>${p.get('price', 0):.2f}</p>
                </div>
                '''
            grid_html += '</div>'
            html_parts.append(grid_html)
        elif block_type == "custom":
            # Custom HTML with template tag processing
            html_parts.append(content)
    
    return {"html": "\n".join(html_parts), "found": True, "zone": zone}

# ==================== PRODUCT REVIEWS ====================

@api_router.get("/reviews")
async def get_all_reviews(
    request: Request,
    status: Optional[str] = None,
    product_id: Optional[str] = None,
    rating: Optional[int] = None,
    featured: Optional[bool] = None,
    limit: int = 100
):
    """Get all reviews with optional filters"""
    store_id = await get_store_id_from_header(request)
    query = {"store_id": store_id}
    if status:
        query["status"] = status
    if product_id:
        query["product_id"] = product_id
    if rating:
        query["rating"] = rating
    if featured is not None:
        query["is_featured"] = featured
    
    reviews = await db.reviews.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    
    # Enrich with product info if missing
    for review in reviews:
        if not review.get("product_name") and review.get("product_id"):
            product = await db.products.find_one({"id": review["product_id"], "store_id": store_id}, {"_id": 0, "name": 1, "sku": 1})
            if product:
                review["product_name"] = product.get("name")
                review["product_sku"] = product.get("sku")
    
    return reviews

@api_router.get("/reviews/stats")
async def get_review_stats(request: Request):
    """Get review statistics for dashboard"""
    store_id = await get_store_id_from_header(request)
    all_reviews = await db.reviews.find({"store_id": store_id}, {"_id": 0, "rating": 1, "status": 1}).to_list(10000)
    
    total = len(all_reviews)
    pending = sum(1 for r in all_reviews if r.get("status") == "pending")
    approved = sum(1 for r in all_reviews if r.get("status") == "approved")
    rejected = sum(1 for r in all_reviews if r.get("status") == "rejected")
    
    # Rating distribution
    rating_dist = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for r in all_reviews:
        rating = r.get("rating", 0)
        if rating in rating_dist:
            rating_dist[rating] += 1
    
    avg_rating = sum(r.get("rating", 0) for r in all_reviews) / total if total > 0 else 0
    
    return {
        "total": total,
        "pending": pending,
        "approved": approved,
        "rejected": rejected,
        "average_rating": round(avg_rating, 1),
        "rating_distribution": rating_dist
    }

@api_router.get("/reviews/product/{product_id}")
async def get_product_reviews(product_id: str, include_pending: bool = False):
    """Get reviews for a product"""
    query = {"product_id": product_id}
    if not include_pending:
        query["status"] = "approved"
    
    reviews = await db.reviews.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Calculate statistics
    approved_reviews = [r for r in reviews if r.get("status") == "approved"]
    if approved_reviews:
        avg_rating = sum(r["rating"] for r in approved_reviews) / len(approved_reviews)
        rating_dist = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        for r in approved_reviews:
            rating_dist[r["rating"]] += 1
    else:
        avg_rating = 0
        rating_dist = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    
    return {
        "reviews": reviews,
        "count": len(approved_reviews),
        "average_rating": round(avg_rating, 1),
        "rating_distribution": rating_dist
    }

@api_router.post("/reviews", response_model=ProductReview)
async def create_review(review: ProductReviewCreate):
    """Submit a new product review (customer or admin)"""
    product_id = review.product_id
    product_name = None
    product_sku = review.product_sku
    
    # If SKU provided, look up product
    if review.product_sku and not review.product_id:
        product = await db.products.find_one({"sku": review.product_sku}, {"_id": 0})
        if product:
            product_id = product["id"]
            product_name = product.get("name")
            product_sku = product.get("sku")
        else:
            raise HTTPException(status_code=404, detail=f"Product with SKU '{review.product_sku}' not found")
    elif review.product_id:
        product = await db.products.find_one({"id": review.product_id}, {"_id": 0})
        if product:
            product_name = product.get("name")
            product_sku = product.get("sku")
    
    if not product_id:
        raise HTTPException(status_code=400, detail="Either product_id or product_sku is required")
    
    new_review = ProductReview(
        product_id=product_id,
        product_sku=product_sku,
        product_name=product_name,
        customer_name=review.customer_name,
        customer_email=review.customer_email,
        rating=review.rating,
        title=review.title,
        content=review.content,
        images=review.images,
        verified_purchase=review.verified_purchase,
        status=review.status
    )
    await db.reviews.insert_one(new_review.dict())
    
    # Update product review count
    if product_id:
        approved_count = await db.reviews.count_documents({"product_id": product_id, "status": "approved"})
        await db.products.update_one({"id": product_id}, {"$set": {"reviews_count": approved_count}})
    
    return new_review

@api_router.put("/reviews/{review_id}")
async def update_review(review_id: str, update: ProductReviewUpdate):
    """Update a review (moderation, reply, etc.)"""
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # If adding admin reply, add timestamp
    if update.admin_reply is not None:
        update_data["admin_reply_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.reviews.update_one(
        {"id": review_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    
    # Update product review count if status changed
    if update.status:
        review = await db.reviews.find_one({"id": review_id}, {"_id": 0})
        if review and review.get("product_id"):
            approved_count = await db.reviews.count_documents({"product_id": review["product_id"], "status": "approved"})
            await db.products.update_one({"id": review["product_id"]}, {"$set": {"reviews_count": approved_count}})
    
    return {"message": "Review updated"}

@api_router.delete("/reviews/{review_id}")
async def delete_review(review_id: str):
    """Delete a review"""
    review = await db.reviews.find_one({"id": review_id}, {"_id": 0})
    result = await db.reviews.delete_one({"id": review_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    
    # Update product review count
    if review and review.get("product_id"):
        approved_count = await db.reviews.count_documents({"product_id": review["product_id"], "status": "approved"})
        await db.products.update_one({"id": review["product_id"]}, {"$set": {"reviews_count": approved_count}})
    
    return {"message": "Review deleted"}

@api_router.post("/reviews/{review_id}/helpful")
async def mark_review_helpful(review_id: str):
    """Mark a review as helpful"""
    await db.reviews.update_one(
        {"id": review_id},
        {"$inc": {"helpful_votes": 1}}
    )
    return {"message": "Vote recorded"}

@api_router.post("/reviews/upload-image")
async def upload_review_image(request: Request, file: UploadFile = File(...)):
    """Upload an image for a review"""
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Create reviews upload directory
    reviews_dir = UPLOADS_DIR / "reviews"
    reviews_dir.mkdir(exist_ok=True)
    
    # Generate unique filename
    ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    filename = f"{uuid.uuid4()}.{ext}"
    file_path = reviews_dir / filename
    
    # Save file
    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)
    
    # Return URL using the API route format (relative path works with proxy)
    return {"url": f"/api/uploads/reviews/{filename}", "filename": filename}

# ==================== MERCHANT NOTIFICATIONS ====================

class MerchantNotification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # order, return, review, stock, system, payment
    title: str
    message: str
    link: Optional[str] = None  # Link to related resource
    priority: str = "normal"  # low, normal, high, urgent
    is_read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    read_at: Optional[datetime] = None

@api_router.get("/notifications")
async def get_merchant_notifications(
    is_read: Optional[bool] = None,
    type: Optional[str] = None,
    limit: int = 50
):
    """Get merchant notifications"""
    query = {}
    if is_read is not None:
        query["is_read"] = is_read
    if type:
        query["type"] = type
    
    notifications = await db.merchant_notifications.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    unread_count = await db.merchant_notifications.count_documents({"is_read": False})
    
    return {"notifications": notifications, "unread_count": unread_count}

@api_router.get("/notifications/stats")
async def get_notifications_stats():
    """Get notification statistics"""
    total = await db.merchant_notifications.count_documents({})
    unread = await db.merchant_notifications.count_documents({"is_read": False})
    
    # Count by type
    pipeline = [
        {"$group": {"_id": "$type", "count": {"$sum": 1}}}
    ]
    by_type = await db.merchant_notifications.aggregate(pipeline).to_list(20)
    type_counts = {item["_id"]: item["count"] for item in by_type}
    
    return {
        "total": total,
        "unread": unread,
        "by_type": type_counts
    }

@api_router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    """Mark a notification as read"""
    result = await db.merchant_notifications.update_one(
        {"id": notification_id},
        {"$set": {"is_read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"success": True}

@api_router.post("/notifications/mark-all-read")
async def mark_all_notifications_read():
    """Mark all notifications as read"""
    await db.merchant_notifications.update_many(
        {"is_read": False},
        {"$set": {"is_read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"success": True}

@api_router.delete("/notifications/{notification_id}")
async def delete_notification(notification_id: str):
    """Delete a notification"""
    result = await db.merchant_notifications.delete_one({"id": notification_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"success": True}

@api_router.delete("/notifications/clear-all")
async def clear_all_notifications():
    """Clear all read notifications"""
    await db.merchant_notifications.delete_many({"is_read": True})
    return {"success": True}

# Helper function to create notifications (used internally)
async def create_merchant_notification(
    type: str,
    title: str,
    message: str,
    link: Optional[str] = None,
    priority: str = "normal"
):
    notification = MerchantNotification(
        type=type,
        title=title,
        message=message,
        link=link,
        priority=priority
    )
    await db.merchant_notifications.insert_one(notification.dict())
    return notification

# ==================== ACTIVITY LOG ====================

class ActivityLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    action: str  # created, updated, deleted, login, logout, export, import
    resource_type: str  # product, order, customer, coupon, etc.
    resource_id: Optional[str] = None
    resource_name: Optional[str] = None
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

@api_router.get("/activity-log")
async def get_activity_log(
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    user_email: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 100,
    skip: int = 0
):
    """Get activity log entries"""
    query = {}
    if action:
        query["action"] = action
    if resource_type:
        query["resource_type"] = resource_type
    if user_email:
        query["user_email"] = user_email
    if start_date:
        query["created_at"] = {"$gte": start_date}
    if end_date:
        if "created_at" in query:
            query["created_at"]["$lte"] = end_date
        else:
            query["created_at"] = {"$lte": end_date}
    
    logs = await db.activity_log.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.activity_log.count_documents(query)
    
    return {"logs": logs, "total": total}

@api_router.get("/activity-log/stats")
async def get_activity_log_stats():
    """Get activity log statistics"""
    total = await db.activity_log.count_documents({})
    
    # Count by action
    pipeline = [{"$group": {"_id": "$action", "count": {"$sum": 1}}}]
    by_action = await db.activity_log.aggregate(pipeline).to_list(20)
    action_counts = {item["_id"]: item["count"] for item in by_action if item["_id"]}
    
    # Count by resource type
    pipeline = [{"$group": {"_id": "$resource_type", "count": {"$sum": 1}}}]
    by_resource = await db.activity_log.aggregate(pipeline).to_list(20)
    resource_counts = {item["_id"]: item["count"] for item in by_resource if item["_id"]}
    
    # Recent activity count (last 24 hours)
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    recent = await db.activity_log.count_documents({"created_at": {"$gte": yesterday}})
    
    return {
        "total": total,
        "by_action": action_counts,
        "by_resource": resource_counts,
        "recent_24h": recent
    }

@api_router.delete("/activity-log/clear")
async def clear_activity_log(days_to_keep: int = 30):
    """Clear old activity log entries"""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days_to_keep)).isoformat()
    result = await db.activity_log.delete_many({"created_at": {"$lt": cutoff}})
    return {"deleted": result.deleted_count}

# Helper function to log activity
async def log_activity(
    action: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    resource_name: Optional[str] = None,
    user_name: Optional[str] = None,
    user_email: Optional[str] = None,
    details: Optional[Dict] = None,
    request: Optional[Request] = None
):
    log_entry = ActivityLog(
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        resource_name=resource_name,
        user_name=user_name,
        user_email=user_email,
        details=details,
        ip_address=request.client.host if request else None,
        user_agent=request.headers.get("user-agent") if request else None
    )
    await db.activity_log.insert_one(log_entry.dict())

# ==================== TAX MANAGEMENT ====================

class TaxRate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    rate: float  # Percentage
    country: str = "AU"
    state: Optional[str] = None
    postcode_from: Optional[str] = None
    postcode_to: Optional[str] = None
    tax_class: str = "standard"  # standard, reduced, zero
    compound: bool = False  # If true, applied after other taxes
    is_active: bool = True
    priority: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TaxSettings(BaseModel):
    prices_include_tax: bool = True
    calculate_tax_based_on: str = "shipping"  # shipping, billing, store
    shipping_tax_class: str = "standard"
    display_prices_in_shop: str = "incl"  # incl, excl
    display_prices_in_cart: str = "incl"
    tax_round_at_subtotal: bool = False
    tax_classes: List[str] = ["standard", "reduced", "zero"]

@api_router.get("/tax/rates")
async def get_tax_rates(country: Optional[str] = None, state: Optional[str] = None):
    """Get all tax rates"""
    query = {}
    if country:
        query["country"] = country
    if state:
        query["state"] = state
    
    rates = await db.tax_rates.find(query, {"_id": 0}).sort("priority", 1).to_list(100)
    return {"rates": rates}

@api_router.post("/tax/rates")
async def create_tax_rate(rate_data: Dict[str, Any]):
    """Create a new tax rate"""
    new_rate = TaxRate(**rate_data)
    await db.tax_rates.insert_one(new_rate.dict())
    return new_rate.dict()

@api_router.put("/tax/rates/{rate_id}")
async def update_tax_rate(rate_id: str, update_data: Dict[str, Any]):
    """Update a tax rate"""
    result = await db.tax_rates.update_one({"id": rate_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tax rate not found")
    return await db.tax_rates.find_one({"id": rate_id}, {"_id": 0})

@api_router.delete("/tax/rates/{rate_id}")
async def delete_tax_rate(rate_id: str):
    """Delete a tax rate"""
    result = await db.tax_rates.delete_one({"id": rate_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tax rate not found")
    return {"success": True}

@api_router.get("/tax/settings")
async def get_tax_settings():
    """Get tax settings"""
    settings = await db.tax_settings.find_one({"id": "tax_settings"}, {"_id": 0})
    if not settings:
        settings = TaxSettings().dict()
        settings["id"] = "tax_settings"
    return settings

@api_router.put("/tax/settings")
async def update_tax_settings(settings: Dict[str, Any]):
    """Update tax settings"""
    settings["id"] = "tax_settings"
    await db.tax_settings.update_one(
        {"id": "tax_settings"},
        {"$set": settings},
        upsert=True
    )
    return await db.tax_settings.find_one({"id": "tax_settings"}, {"_id": 0})

@api_router.post("/tax/calculate")
async def calculate_tax(
    subtotal: float,
    country: str = "AU",
    state: Optional[str] = None,
    postcode: Optional[str] = None
):
    """Calculate tax for an order"""
    # Get applicable tax rates
    query = {"country": country, "is_active": True}
    if state:
        # Match specific state OR rates that apply to all states (empty string or None)
        query["$or"] = [{"state": state}, {"state": ""}, {"state": None}]
    else:
        # If no state specified, only get rates that apply to all states
        query["$or"] = [{"state": ""}, {"state": None}]
    
    rates = await db.tax_rates.find(query, {"_id": 0}).sort("priority", 1).to_list(10)
    
    total_tax = 0
    tax_breakdown = []
    
    for rate in rates:
        # Check postcode range if specified
        if rate.get("postcode_from") and rate.get("postcode_to") and postcode:
            if not (rate["postcode_from"] <= postcode <= rate["postcode_to"]):
                continue
        
        tax_amount = subtotal * (rate["rate"] / 100)
        if rate.get("compound"):
            tax_amount = (subtotal + total_tax) * (rate["rate"] / 100)
        
        total_tax += tax_amount
        tax_breakdown.append({
            "name": rate["name"],
            "rate": rate["rate"],
            "amount": round(tax_amount, 2)
        })
    
    return {
        "subtotal": subtotal,
        "tax_total": round(total_tax, 2),
        "total": round(subtotal + total_tax, 2),
        "breakdown": tax_breakdown
    }

# ==================== IMPORT/EXPORT ====================

@api_router.get("/export/{resource_type}")
async def export_data(resource_type: str, format: str = "csv"):
    """Export data to CSV or JSON"""
    collection_map = {
        "products": "products",
        "customers": "customers",
        "orders": "orders",
        "coupons": "coupons",
        "reviews": "reviews"
    }
    
    if resource_type not in collection_map:
        raise HTTPException(status_code=400, detail="Invalid resource type")
    
    collection = db[collection_map[resource_type]]
    data = await collection.find({}, {"_id": 0}).to_list(10000)
    
    if format == "json":
        return {"data": data, "count": len(data)}
    
    # CSV format
    if not data:
        return Response(content="No data", media_type="text/csv")
    
    import io
    import csv
    
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=data[0].keys())
    writer.writeheader()
    for row in data:
        # Flatten nested objects for CSV
        flat_row = {}
        for key, value in row.items():
            if isinstance(value, (dict, list)):
                flat_row[key] = str(value)
            else:
                flat_row[key] = value
        writer.writerow(flat_row)
    
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={resource_type}_export.csv"}
    )

@api_router.post("/import/{resource_type}")
async def import_data(resource_type: str, data: List[Dict[str, Any]]):
    """Import data from JSON"""
    collection_map = {
        "products": "products",
        "customers": "customers",
        "coupons": "coupons"
    }
    
    if resource_type not in collection_map:
        raise HTTPException(status_code=400, detail="Invalid resource type")
    
    collection = db[collection_map[resource_type]]
    
    imported = 0
    errors = []
    
    for idx, item in enumerate(data):
        try:
            # Generate ID if not present
            if "id" not in item:
                item["id"] = str(uuid.uuid4())
            
            # Upsert based on ID or SKU
            if resource_type == "products" and "sku" in item:
                await collection.update_one(
                    {"sku": item["sku"]},
                    {"$set": item},
                    upsert=True
                )
            else:
                await collection.update_one(
                    {"id": item["id"]},
                    {"$set": item},
                    upsert=True
                )
            imported += 1
        except Exception as e:
            errors.append({"row": idx, "error": str(e)})
    
    return {
        "imported": imported,
        "errors": errors,
        "total": len(data)
    }

@api_router.get("/import/template/{resource_type}")
async def get_import_template(resource_type: str):
    """Get import template for a resource type"""
    templates = {
        "products": {
            "fields": ["sku", "name", "description", "price", "sale_price", "stock", "category", "brand", "weight", "images"],
            "required": ["sku", "name", "price"],
            "sample": [
                {"sku": "PROD-001", "name": "Sample Product", "description": "Description here", "price": 99.99, "stock": 100, "category": "General"}
            ]
        },
        "customers": {
            "fields": ["email", "first_name", "last_name", "phone", "company", "address", "city", "state", "postcode", "country"],
            "required": ["email"],
            "sample": [
                {"email": "customer@example.com", "first_name": "John", "last_name": "Doe", "phone": "0400000000"}
            ]
        },
        "coupons": {
            "fields": ["code", "name", "discount_type", "discount_value", "min_order", "max_uses", "expiry_date"],
            "required": ["code", "discount_type", "discount_value"],
            "sample": [
                {"code": "SAVE10", "name": "10% Off", "discount_type": "percentage", "discount_value": 10, "min_order": 50}
            ]
        }
    }
    
    if resource_type not in templates:
        raise HTTPException(status_code=400, detail="Invalid resource type")
    
    return templates[resource_type]

# ==================== STOCK NOTIFICATIONS ====================

@api_router.post("/stock-notifications")
async def create_stock_notification(notification: StockNotificationCreate):
    """Subscribe to stock notification for a product"""
    # Get product name
    product = await db.products.find_one({"id": notification.product_id}, {"name": 1})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check if already subscribed
    existing = await db.stock_notifications.find_one({
        "product_id": notification.product_id,
        "customer_email": notification.customer_email,
        "notified": False
    })
    if existing:
        return {"message": "Already subscribed to notifications for this product", "success": True}
    
    # Create notification subscription
    new_notification = StockNotification(
        product_id=notification.product_id,
        product_name=product.get("name", "Unknown Product"),
        customer_name=notification.customer_name,
        customer_email=notification.customer_email,
        customer_phone=notification.customer_phone
    )
    await db.stock_notifications.insert_one(new_notification.dict())
    return {"message": "You will be notified when this product is back in stock!", "success": True}

@api_router.get("/stock-notifications/product/{product_id}")
async def get_product_notifications(product_id: str):
    """Get all notification subscribers for a product"""
    notifications = await db.stock_notifications.find(
        {"product_id": product_id, "notified": False},
        {"_id": 0}
    ).to_list(1000)
    return notifications

@api_router.get("/stock-notifications")
async def get_all_notifications(notified: Optional[bool] = None):
    """Get all stock notification subscriptions"""
    query = {}
    if notified is not None:
        query["notified"] = notified
    notifications = await db.stock_notifications.find(query, {"_id": 0}).to_list(1000)
    return notifications

@api_router.post("/stock-notifications/notify/{product_id}")
async def send_stock_notifications(product_id: str):
    """Mark notifications as sent for a product (when stock arrives)"""
    result = await db.stock_notifications.update_many(
        {"product_id": product_id, "notified": False},
        {"$set": {"notified": True, "notified_at": datetime.now(timezone.utc)}}
    )
    return {
        "message": f"Marked {result.modified_count} notifications as sent",
        "count": result.modified_count
    }

@api_router.delete("/stock-notifications/{notification_id}")
async def delete_stock_notification(notification_id: str):
    """Delete a stock notification subscription"""
    result = await db.stock_notifications.delete_one({"id": notification_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification deleted"}

# ==================== PREORDER AUTO-DISABLE CHECK ====================

@api_router.post("/products/check-preorders")
async def check_preorder_dates():
    """Check and auto-disable pre-orders where arrival date has passed"""
    from datetime import date
    today = date.today().isoformat()
    
    # Find products with preorder enabled and arrival date in the past
    result = await db.products.update_many(
        {
            "preorder_enabled": True,
            "preorder_arrival_date": {"$lte": today, "$ne": None}
        },
        {
            "$set": {
                "preorder_enabled": False,
                "stock": {"$add": ["$stock", "$preorder_qty"]},  # This won't work in simple update
            }
        }
    )
    
    # Need to handle stock addition separately
    products = await db.products.find({
        "preorder_enabled": True,
        "preorder_arrival_date": {"$lte": today, "$ne": None}
    }).to_list(100)
    
    updated_count = 0
    for product in products:
        new_stock = (product.get("stock", 0) or 0) + (product.get("preorder_qty", 0) or 0)
        await db.products.update_one(
            {"id": product["id"]},
            {
                "$set": {
                    "preorder_enabled": False,
                    "stock": new_stock,
                    "preorder_qty": 0,
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        updated_count += 1
    
    return {"message": f"Processed {updated_count} products", "updated": updated_count}

# ==================== SHIPPING ZONES & RATES (Deprecated - Use /api/shipping/* routes) ====================
# Note: Comprehensive shipping system is now in /app/backend/routes/shipping.py
# The routes below are kept for backwards compatibility but will be removed in future

# ==================== ABANDONED CART RECOVERY ====================

# ==================== ABANDONED CART RECOVERY ====================

@api_router.get("/abandoned-carts")
async def get_abandoned_carts(
    recovered: Optional[bool] = None,
    days: int = 7
):
    """Get abandoned carts from the last N days"""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    query = {"created_at": {"$gte": cutoff}}
    
    if recovered is not None:
        query["recovered"] = recovered
    
    carts = await db.abandoned_carts.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    return carts

@api_router.get("/abandoned-carts/stats")
async def get_abandoned_cart_stats():
    """Get abandoned cart statistics"""
    # Total abandoned carts (last 30 days)
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    total = await db.abandoned_carts.count_documents({"created_at": {"$gte": cutoff}})
    recovered = await db.abandoned_carts.count_documents({
        "created_at": {"$gte": cutoff},
        "recovered": True
    })
    
    # Calculate total value
    pipeline = [
        {"$match": {"created_at": {"$gte": cutoff}}},
        {"$group": {
            "_id": None,
            "total_value": {"$sum": "$subtotal"},
            "recovered_value": {
                "$sum": {"$cond": [{"$eq": ["$recovered", True]}, "$subtotal", 0]}
            }
        }}
    ]
    result = await db.abandoned_carts.aggregate(pipeline).to_list(1)
    
    stats = result[0] if result else {"total_value": 0, "recovered_value": 0}
    
    return {
        "total_carts": total,
        "recovered_carts": recovered,
        "recovery_rate": round(recovered / total * 100, 1) if total > 0 else 0,
        "total_abandoned_value": stats.get("total_value", 0),
        "recovered_value": stats.get("recovered_value", 0)
    }

@api_router.post("/abandoned-carts/track")
async def track_abandoned_cart(
    cart_id: str,
    email: str,
    name: Optional[str] = None,
    items: List[dict] = [],
    subtotal: float = 0
):
    """Track or update an abandoned cart"""
    existing = await db.abandoned_carts.find_one({"cart_id": cart_id})
    
    if existing:
        # Update existing
        await db.abandoned_carts.update_one(
            {"cart_id": cart_id},
            {"$set": {
                "items": items,
                "subtotal": subtotal,
                "last_activity": datetime.now(timezone.utc)
            }}
        )
    else:
        # Create new
        cart = AbandonedCart(
            cart_id=cart_id,
            customer_email=email,
            customer_name=name,
            items=items,
            subtotal=subtotal
        )
        await db.abandoned_carts.insert_one(cart.dict())
    
    return {"message": "Cart tracked"}

@api_router.post("/abandoned-carts/{cart_id}/send-recovery")
async def send_recovery_email(cart_id: str, email_type: str = "reminder"):
    """Send a recovery email for an abandoned cart"""
    cart = await db.abandoned_carts.find_one({"cart_id": cart_id}, {"_id": 0})
    if not cart:
        raise HTTPException(status_code=404, detail="Abandoned cart not found")
    
    # In a real implementation, this would send an email
    # For now, we'll just update the tracking
    await db.abandoned_carts.update_one(
        {"cart_id": cart_id},
        {
            "$inc": {"recovery_emails_sent": 1},
            "$set": {"last_email_sent": datetime.now(timezone.utc)}
        }
    )
    
    return {
        "message": f"Recovery email ({email_type}) queued for {cart['customer_email']}",
        "email_type": email_type,
        "cart_id": cart_id
    }

@api_router.post("/abandoned-carts/{cart_id}/mark-recovered")
async def mark_cart_recovered(cart_id: str, order_id: str):
    """Mark an abandoned cart as recovered"""
    result = await db.abandoned_carts.update_one(
        {"cart_id": cart_id},
        {"$set": {
            "recovered": True,
            "recovered_order_id": order_id
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Abandoned cart not found")
    
    return {"message": "Cart marked as recovered"}

# ==================== SEO TOOLS ====================

@api_router.get("/seo/global")
async def get_global_seo_settings():
    """Get global SEO settings"""
    settings = await db.seo_settings.find_one({"id": "global_seo"}, {"_id": 0})
    if not settings:
        return GlobalSEOSettings().dict()
    return settings

@api_router.put("/seo/global")
async def update_global_seo_settings(settings: dict):
    """Update global SEO settings"""
    settings["id"] = "global_seo"
    await db.seo_settings.update_one(
        {"id": "global_seo"},
        {"$set": settings},
        upsert=True
    )
    return await db.seo_settings.find_one({"id": "global_seo"}, {"_id": 0})

@api_router.get("/seo/{entity_type}/{entity_id}")
async def get_entity_seo(entity_type: str, entity_id: str):
    """Get SEO settings for a specific entity"""
    seo = await db.seo_settings.find_one(
        {"entity_type": entity_type, "entity_id": entity_id},
        {"_id": 0}
    )
    if not seo:
        return SEOSettings(entity_type=entity_type, entity_id=entity_id).dict()
    return seo

@api_router.put("/seo/{entity_type}/{entity_id}")
async def update_entity_seo(entity_type: str, entity_id: str, settings: SEOSettingsUpdate):
    """Update SEO settings for a specific entity"""
    update_data = {k: v for k, v in settings.dict().items() if v is not None}
    update_data["entity_type"] = entity_type
    update_data["entity_id"] = entity_id
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.seo_settings.update_one(
        {"entity_type": entity_type, "entity_id": entity_id},
        {"$set": update_data},
        upsert=True
    )
    
    return await db.seo_settings.find_one(
        {"entity_type": entity_type, "entity_id": entity_id},
        {"_id": 0}
    )

@api_router.get("/sitemap.xml")
async def generate_sitemap():
    """Generate XML sitemap"""
    from fastapi.responses import Response
    
    # Get store URL
    store_settings = await db.store_settings.find_one({"id": "store_settings"})
    base_url = store_settings.get("store_url", "") if store_settings else ""
    if not base_url:
        base_url = "https://example.com"
    
    urls = []
    
    # Homepage
    urls.append({"loc": f"{base_url}/live", "priority": "1.0", "changefreq": "daily"})
    
    # Products
    products = await db.products.find({"is_active": True}, {"id": 1, "updated_at": 1}).to_list(1000)
    for p in products:
        urls.append({
            "loc": f"{base_url}/live/product/{p['id']}",
            "priority": "0.8",
            "changefreq": "weekly",
            "lastmod": p.get("updated_at", datetime.now(timezone.utc)).strftime("%Y-%m-%d")
        })
    
    # Categories
    categories = await db.categories.find({}, {"id": 1}).to_list(100)
    for c in categories:
        urls.append({
            "loc": f"{base_url}/live/category/{c['id']}",
            "priority": "0.7",
            "changefreq": "weekly"
        })
    
    # Build XML
    xml_parts = ['<?xml version="1.0" encoding="UTF-8"?>']
    xml_parts.append('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    
    for url in urls:
        xml_parts.append("  <url>")
        xml_parts.append(f"    <loc>{url['loc']}</loc>")
        if url.get("lastmod"):
            xml_parts.append(f"    <lastmod>{url['lastmod']}</lastmod>")
        xml_parts.append(f"    <changefreq>{url.get('changefreq', 'weekly')}</changefreq>")
        xml_parts.append(f"    <priority>{url.get('priority', '0.5')}</priority>")
        xml_parts.append("  </url>")
    
    xml_parts.append("</urlset>")
    
    return Response(content="\n".join(xml_parts), media_type="application/xml")

@api_router.get("/robots.txt")
async def get_robots_txt():
    """Get robots.txt content"""
    from fastapi.responses import PlainTextResponse
    
    seo = await db.seo_settings.find_one({"id": "global_seo"}, {"_id": 0})
    if seo and seo.get("robots_txt"):
        content = seo["robots_txt"]
    else:
        content = "User-agent: *\nAllow: /\n\nSitemap: /api/sitemap.xml"
    
    return PlainTextResponse(content=content)

# ==================== CMS PAGES ====================

@api_router.get("/pages")
async def get_all_pages(request: Request):
    """Get all CMS pages"""
    store_id = await get_store_id_from_header(request)
    pages = await db.cms_pages.find({"store_id": store_id}, {"_id": 0}).sort("name", 1).to_list(100)
    
    # Ensure homepage exists for this store
    homepage_exists = any(p.get("is_homepage") for p in pages)
    if not homepage_exists:
        # Create default homepage
        homepage = CMSPage(
            id=f"homepage-{store_id[:8]}",
            name="Homepage",
            slug="home",
            is_homepage=True,
            is_system=True,
            is_active=True,
            seo_title="Home",
            seo_description="Welcome to our store",
            seo_heading="Welcome"
        )
        homepage_dict = homepage.dict()
        homepage_dict["store_id"] = store_id
        await db.cms_pages.insert_one(homepage_dict)
        pages.insert(0, homepage_dict)
    
    return pages

@api_router.get("/pages/{page_id}")
async def get_page(page_id: str, request: Request):
    """Get a single CMS page"""
    store_id = await get_store_id_from_header(request)
    page = await db.cms_pages.find_one({"id": page_id, "store_id": store_id}, {"_id": 0})
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    return page

@api_router.post("/pages", response_model=CMSPage)
async def create_page(page: CMSPageCreate, request: Request):
    """Create a new CMS page"""
    store_id = await get_store_id_from_header(request)
    # Check if slug already exists for this store
    existing = await db.cms_pages.find_one({"slug": page.slug, "store_id": store_id})
    if existing:
        raise HTTPException(status_code=400, detail="Page with this slug already exists")
    
    new_page = CMSPage(**page.dict())
    page_dict = new_page.dict()
    page_dict["store_id"] = store_id
    await db.cms_pages.insert_one(page_dict)
    return new_page

@api_router.put("/pages/{page_id}")
async def update_page(page_id: str, update: CMSPageUpdate, request: Request):
    """Update a CMS page"""
    store_id = await get_store_id_from_header(request)
    # Check if page exists
    page = await db.cms_pages.find_one({"id": page_id, "store_id": store_id})
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    # Prevent changing slug of system pages
    if page.get("is_system") and update.slug and update.slug != page.get("slug"):
        raise HTTPException(status_code=400, detail="Cannot change slug of system page")
    
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.cms_pages.update_one(
        {"id": page_id},
        {"$set": update_data}
    )
    
    updated = await db.cms_pages.find_one({"id": page_id}, {"_id": 0})
    return updated

@api_router.delete("/pages/{page_id}")
async def delete_page(page_id: str):
    """Delete a CMS page"""
    page = await db.cms_pages.find_one({"id": page_id})
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    # Prevent deletion of system pages
    if page.get("is_system"):
        raise HTTPException(status_code=400, detail="Cannot delete system page")
    
    await db.cms_pages.delete_one({"id": page_id})
    return {"message": "Page deleted"}

@api_router.get("/pages/by-slug/{slug}")
async def get_page_by_slug(slug: str):
    """Get a CMS page by its slug"""
    page = await db.cms_pages.find_one({"slug": slug, "is_active": True}, {"_id": 0})
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    return page

# ==================== MEGA MENU ====================

@api_router.get("/mega-menu")
async def get_mega_menus():
    """Get all mega menu configurations"""
    menus = await db.mega_menus.find({}, {"_id": 0}).sort("sort_order", 1).to_list(50)
    return menus

@api_router.get("/mega-menu/{menu_id}")
async def get_mega_menu(menu_id: str):
    """Get a single mega menu"""
    menu = await db.mega_menus.find_one({"id": menu_id}, {"_id": 0})
    if not menu:
        raise HTTPException(status_code=404, detail="Mega menu not found")
    return menu

@api_router.post("/mega-menu", response_model=MegaMenu)
async def create_mega_menu(menu: MegaMenu):
    """Create a new mega menu"""
    await db.mega_menus.insert_one(menu.dict())
    return menu

@api_router.put("/mega-menu/{menu_id}")
async def update_mega_menu(menu_id: str, update: MegaMenuUpdate):
    """Update a mega menu"""
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    
    result = await db.mega_menus.update_one(
        {"id": menu_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Mega menu not found")
    
    return await db.mega_menus.find_one({"id": menu_id}, {"_id": 0})

@api_router.delete("/mega-menu/{menu_id}")
async def delete_mega_menu(menu_id: str):
    """Delete a mega menu"""
    result = await db.mega_menus.delete_one({"id": menu_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Mega menu not found")
    return {"message": "Mega menu deleted"}

@api_router.post("/mega-menu/generate-from-categories")
async def generate_mega_menu_from_categories():
    """Auto-generate mega menu from existing categories"""
    categories = await db.categories.find({}, {"_id": 0}).to_list(100)
    
    # Create mega menu entries for each top-level category
    created = []
    for i, cat in enumerate(categories):
        menu = MegaMenu(
            category_id=cat.get("id"),
            title=cat.get("name", "Category"),
            columns=[
                MegaMenuColumn(
                    title="Shop All",
                    items=[
                        MegaMenuItem(
                            title=f"View All {cat.get('name', 'Products')}",
                            url=f"/store/category/{cat.get('id')}",
                            type="category"
                        )
                    ]
                )
            ],
            featured_image=cat.get("image"),
            sort_order=i
        )
        
        await db.mega_menus.update_one(
            {"category_id": cat.get("id")},
            {"$set": menu.dict()},
            upsert=True
        )
        created.append(menu.dict())
    
    return {"message": f"Generated {len(created)} mega menus", "menus": created}

# ==================== STORE SETTINGS ====================

@api_router.get("/store/settings", response_model=StoreSettings)
async def get_store_settings(request: Request):
    store_id = await get_store_id_from_header(request)
    settings = await db.store_settings.find_one({"store_id": store_id})
    if not settings:
        # Try legacy settings without store_id
        settings = await db.store_settings.find_one({"id": "store_settings", "store_id": store_id})
    if not settings:
        # Return default settings
        return StoreSettings()
    return StoreSettings(**settings)

@api_router.get("/store/logo-base64")
async def get_store_logo_base64(request: Request):
    """Get store logo as base64 data URL to avoid CORS issues in iframe preview"""
    import httpx
    import base64
    
    store_id = await get_store_id_from_header(request)
    settings = await db.store_settings.find_one({"store_id": store_id})
    if not settings or not settings.get("store_logo"):
        raise HTTPException(status_code=404, detail="No store logo found")
    
    logo_url = settings.get("store_logo")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(logo_url, timeout=10.0)
            response.raise_for_status()
            
            # Determine content type
            content_type = response.headers.get("content-type", "image/png")
            if ";" in content_type:
                content_type = content_type.split(";")[0].strip()
            
            # Convert to base64
            base64_data = base64.b64encode(response.content).decode("utf-8")
            data_url = f"data:{content_type};base64,{base64_data}"
            
            return {"data_url": data_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch logo: {str(e)}")

@api_router.put("/store/settings", response_model=StoreSettings)
async def update_store_settings(settings: StoreSettingsUpdate, request: Request):
    store_id = await get_store_id_from_header(request)
    update_data = {k: v for k, v in settings.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    update_data["store_id"] = store_id
    
    result = await db.store_settings.update_one(
        {"store_id": store_id},
        {"$set": update_data},
        upsert=True
    )
    
    updated = await db.store_settings.find_one({"store_id": store_id})
    return StoreSettings(**updated)

# ==================== CUSTOM DOMAIN MANAGEMENT ====================

@api_router.get("/store/domain-settings")
async def get_domain_settings(current_user: dict = Depends(get_current_user)):
    """Get store domain settings"""
    store_id = current_user.get("store_id")
    
    # If no store_id in token, try to find store by user email (for store owners)
    if not store_id:
        user_email = current_user.get("email")
        if user_email:
            # Check if user is a platform owner
            owner = await db.platform_owners.find_one({"email": user_email})
            if owner:
                store_id = owner.get("store_id")
            
            # Also check platform_stores for owner_email
            if not store_id:
                store = await db.platform_stores.find_one({"owner_email": user_email}, {"_id": 0})
                if store:
                    store_id = store.get("id")
    
    if not store_id:
        raise HTTPException(status_code=400, detail="No store associated with user")
    
    store = await db.platform_stores.find_one({"id": store_id}, {"_id": 0})
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    return {
        "store_id": store.get("id"),
        "store_name": store.get("store_name"),
        "subdomain": store.get("subdomain"),
        "custom_domain": store.get("custom_domain"),
        "custom_domain_verified": store.get("custom_domain_verified", False),
        "domain_verification_token": store.get("domain_verification_token")
    }

async def get_store_id_for_current_user(current_user: dict) -> str:
    """Helper to get store_id from current user context"""
    store_id = current_user.get("store_id")
    
    if not store_id:
        user_email = current_user.get("email")
        if user_email:
            owner = await db.platform_owners.find_one({"email": user_email})
            if owner:
                store_id = owner.get("store_id")
            
            if not store_id:
                store = await db.platform_stores.find_one({"owner_email": user_email}, {"_id": 0})
                if store:
                    store_id = store.get("id")
    
    return store_id

@api_router.put("/store/custom-domain")
async def update_custom_domain(
    domain_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update store's custom domain and generate verification token"""
    import secrets
    
    store_id = await get_store_id_for_current_user(current_user)
    if not store_id:
        raise HTTPException(status_code=400, detail="No store associated with user")
    
    custom_domain = domain_data.get("custom_domain")
    
    # Clean domain
    if custom_domain:
        custom_domain = custom_domain.lower().strip()
        custom_domain = custom_domain.replace("http://", "").replace("https://", "")
        custom_domain = custom_domain.rstrip("/")
        
        # Check if domain is already in use by another store
        existing = await db.platform_stores.find_one({
            "custom_domain": custom_domain,
            "custom_domain_verified": True,
            "id": {"$ne": store_id}
        })
        if existing:
            raise HTTPException(status_code=400, detail="Domain is already verified by another store")
    
    # Get current store to check if we need a new verification token
    store = await db.platform_stores.find_one({"id": store_id})
    current_domain = store.get("custom_domain") if store else None
    
    # Generate new verification token if domain changed or doesn't have one
    verification_token = store.get("domain_verification_token") if store else None
    if not verification_token or custom_domain != current_domain:
        # Generate unique token: celora-verify=<store_id_prefix>-<random>
        token_suffix = secrets.token_hex(8)
        verification_token = f"celora-verify={store_id[:8]}-{token_suffix}"
    
    await db.platform_stores.update_one(
        {"id": store_id},
        {"$set": {
            "custom_domain": custom_domain,
            "custom_domain_verified": False,
            "domain_verification_token": verification_token,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    return {
        "message": "Domain saved. Please add the TXT record to verify ownership.",
        "custom_domain": custom_domain,
        "verification_token": verification_token
    }

@api_router.delete("/store/custom-domain")
async def remove_custom_domain(current_user: dict = Depends(get_current_user)):
    """Remove store's custom domain"""
    store_id = await get_store_id_for_current_user(current_user)
    if not store_id:
        raise HTTPException(status_code=400, detail="No store associated with user")
    
    await db.platform_stores.update_one(
        {"id": store_id},
        {"$set": {
            "custom_domain": None,
            "custom_domain_verified": False,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    return {"message": "Custom domain removed"}

@api_router.post("/store/verify-domain")
async def verify_custom_domain(
    domain_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Verify custom domain ownership via TXT record AND routing via A record"""
    import socket
    import dns.resolver
    
    store_id = await get_store_id_for_current_user(current_user)
    if not store_id:
        raise HTTPException(status_code=400, detail="No store associated with user")
    
    domain = domain_data.get("domain", "").lower().strip()
    if not domain:
        raise HTTPException(status_code=400, detail="Domain is required")
    
    # Get store's verification token
    store = await db.platform_stores.find_one({"id": store_id})
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    verification_token = store.get("domain_verification_token")
    if not verification_token:
        raise HTTPException(status_code=400, detail="Please save the domain first to get a verification token")
    
    # Our server IP
    SERVER_IP = "45.77.239.247"
    
    # Clean domain for verification
    root_domain = domain.replace("www.", "") if domain.startswith("www.") else domain
    
    # Step 1: Verify TXT record (proves ownership)
    txt_verified = False
    txt_error = None
    try:
        resolver = dns.resolver.Resolver()
        resolver.timeout = 10
        resolver.lifetime = 10
        
        answers = resolver.resolve(root_domain, 'TXT')
        txt_records = [str(rdata).strip('"') for rdata in answers]
        
        # Check if our verification token is in any TXT record
        for record in txt_records:
            if verification_token in record:
                txt_verified = True
                break
        
        if not txt_verified:
            txt_error = f"TXT record not found. Please add: {verification_token}"
    except dns.resolver.NXDOMAIN:
        txt_error = "Domain not found. Please check your domain name."
    except dns.resolver.NoAnswer:
        txt_error = f"No TXT records found. Please add: {verification_token}"
    except dns.resolver.Timeout:
        txt_error = "DNS lookup timed out. Please try again."
    except Exception as e:
        txt_error = f"Could not check TXT records: {str(e)}"
    
    # Step 2: Verify A record (proves routing)
    a_verified = False
    a_error = None
    try:
        resolved_ip = socket.gethostbyname(domain)
        if resolved_ip == SERVER_IP:
            a_verified = True
        else:
            a_error = f"Domain points to {resolved_ip}, expected {SERVER_IP}"
    except socket.gaierror:
        a_error = "Could not resolve domain. Check your A record."
    except Exception as e:
        a_error = f"A record check failed: {str(e)}"
    
    # Both checks must pass
    if txt_verified and a_verified:
        # Domain ownership verified AND points to our server
        await db.platform_stores.update_one(
            {"id": store_id},
            {"$set": {
                "custom_domain": domain,
                "custom_domain_verified": True,
                "domain_verified_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }}
        )
        return {
            "verified": True, 
            "message": "Domain verified successfully! Your custom domain is now active."
        }
    else:
        errors = []
        if not txt_verified:
            errors.append(f"TXT verification failed: {txt_error}")
        if not a_verified:
            errors.append(f"A record failed: {a_error}")
        
        return {
            "verified": False,
            "txt_verified": txt_verified,
            "a_verified": a_verified,
            "message": " | ".join(errors),
            "required_txt": verification_token,
            "required_ip": SERVER_IP
        }

@api_router.post("/store/check-dns")
async def check_dns_status(
    domain_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Check DNS configuration status for a domain without activating it"""
    import socket
    import subprocess
    
    domain = domain_data.get("domain", "").lower().strip()
    if not domain:
        raise HTTPException(status_code=400, detail="Domain is required")
    
    # Clean the domain
    domain = domain.replace("http://", "").replace("https://", "").rstrip("/")
    
    # Our server IP
    SERVER_IP = "45.77.239.247"
    
    checks = []
    all_passed = True
    
    # Check root domain (remove www if present)
    root_domain = domain.replace("www.", "") if domain.startswith("www.") else domain
    www_domain = f"www.{root_domain}"
    
    # Check root domain A record
    try:
        resolved_ip = socket.gethostbyname(root_domain)
        if resolved_ip == SERVER_IP:
            checks.append({
                "record": f"A record for {root_domain}",
                "passed": True,
                "message": f"Correctly points to {SERVER_IP}"
            })
        else:
            checks.append({
                "record": f"A record for {root_domain}",
                "passed": False,
                "message": f"Points to {resolved_ip}, should be {SERVER_IP}"
            })
            all_passed = False
    except socket.gaierror:
        checks.append({
            "record": f"A record for {root_domain}",
            "passed": False,
            "message": "No A record found or not propagated yet"
        })
        all_passed = False
    
    # Check www subdomain A record
    try:
        resolved_ip = socket.gethostbyname(www_domain)
        if resolved_ip == SERVER_IP:
            checks.append({
                "record": f"A record for {www_domain}",
                "passed": True,
                "message": f"Correctly points to {SERVER_IP}"
            })
        else:
            checks.append({
                "record": f"A record for {www_domain}",
                "passed": False,
                "message": f"Points to {resolved_ip}, should be {SERVER_IP}"
            })
            all_passed = False
    except socket.gaierror:
        checks.append({
            "record": f"A record for {www_domain}",
            "passed": False,
            "message": "No A record found or not propagated yet"
        })
        all_passed = False
    
    return {
        "domain": domain,
        "all_passed": all_passed,
        "checks": checks,
        "server_ip": SERVER_IP
    }

# ==================== URL REDIRECTS ====================

@api_router.get("/store/redirects")
async def get_redirects(current_user: dict = Depends(get_current_user)):
    """Get all URL redirects for the store"""
    store_id = await get_store_id_for_current_user(current_user)
    if not store_id:
        return []
    
    redirects = await db.url_redirects.find(
        {"store_id": store_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    return redirects

@api_router.post("/store/redirects")
async def create_redirect(
    redirect_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Create a new URL redirect"""
    store_id = await get_store_id_for_current_user(current_user)
    if not store_id:
        raise HTTPException(status_code=400, detail="No store associated with user")
    
    # Check for duplicate source path
    existing = await db.url_redirects.find_one({
        "store_id": store_id,
        "source_path": redirect_data.get("source_path")
    })
    if existing:
        raise HTTPException(status_code=400, detail="A redirect for this source path already exists")
    
    redirect = {
        "id": str(uuid.uuid4()),
        "store_id": store_id,
        "source_path": redirect_data.get("source_path", "").strip(),
        "target_url": redirect_data.get("target_url", "").strip(),
        "redirect_type": redirect_data.get("redirect_type", "301"),
        "is_active": redirect_data.get("is_active", True),
        "notes": redirect_data.get("notes", ""),
        "hit_count": 0,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.url_redirects.insert_one(redirect)
    if "_id" in redirect:
        del redirect["_id"]
    
    return redirect

@api_router.put("/store/redirects/{redirect_id}")
async def update_redirect(
    redirect_id: str,
    redirect_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update a URL redirect"""
    store_id = await get_store_id_for_current_user(current_user)
    if not store_id:
        raise HTTPException(status_code=400, detail="No store associated with user")
    
    result = await db.url_redirects.update_one(
        {"id": redirect_id, "store_id": store_id},
        {"$set": {
            "source_path": redirect_data.get("source_path"),
            "target_url": redirect_data.get("target_url"),
            "redirect_type": redirect_data.get("redirect_type", "301"),
            "is_active": redirect_data.get("is_active", True),
            "notes": redirect_data.get("notes", ""),
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Redirect not found")
    
    return {"message": "Redirect updated"}

@api_router.delete("/store/redirects/{redirect_id}")
async def delete_redirect(
    redirect_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a URL redirect"""
    store_id = await get_store_id_for_current_user(current_user)
    if not store_id:
        raise HTTPException(status_code=400, detail="No store associated with user")
    
    result = await db.url_redirects.delete_one({"id": redirect_id, "store_id": store_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Redirect not found")
    
    return {"message": "Redirect deleted"}

@api_router.post("/store/redirects/bulk")
async def bulk_import_redirects(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Bulk import URL redirects"""
    store_id = await get_store_id_for_current_user(current_user)
    if not store_id:
        raise HTTPException(status_code=400, detail="No store associated with user")
    
    redirects_to_import = data.get("redirects", [])
    imported = 0
    
    for r in redirects_to_import:
        # Skip if redirect already exists
        existing = await db.url_redirects.find_one({
            "store_id": store_id,
            "source_path": r.get("source_path")
        })
        if existing:
            continue
        
        redirect = {
            "id": str(uuid.uuid4()),
            "store_id": store_id,
            "source_path": r.get("source_path", "").strip(),
            "target_url": r.get("target_url", "").strip(),
            "redirect_type": r.get("redirect_type", "301"),
            "is_active": r.get("is_active", True),
            "notes": "",
            "hit_count": 0,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        await db.url_redirects.insert_one(redirect)
        imported += 1
    
    return {"imported": imported, "total": len(redirects_to_import)}

# ==================== CUSTOM SCRIPTS ====================

@api_router.get("/store/custom-scripts")
async def get_custom_scripts(current_user: dict = Depends(get_current_user)):
    """Get custom scripts settings for the store"""
    store_id = await get_store_id_for_current_user(current_user)
    if not store_id:
        return {}
    
    scripts = await db.custom_scripts.find_one({"store_id": store_id}, {"_id": 0})
    return scripts or {
        "head_scripts": "",
        "body_start_scripts": "",
        "body_end_scripts": "",
        "custom_css": "",
        "google_analytics_id": "",
        "google_tag_manager_id": "",
        "facebook_pixel_id": "",
        "tiktok_pixel_id": "",
        "snapchat_pixel_id": "",
        "pinterest_tag_id": "",
        "custom_checkout_scripts": "",
        "custom_thankyou_scripts": "",
        "scripts_enabled": True
    }

@api_router.put("/store/custom-scripts")
async def update_custom_scripts(
    scripts_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update custom scripts settings"""
    store_id = await get_store_id_for_current_user(current_user)
    if not store_id:
        raise HTTPException(status_code=400, detail="No store associated with user")
    
    scripts_data["store_id"] = store_id
    scripts_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.custom_scripts.update_one(
        {"store_id": store_id},
        {"$set": scripts_data},
        upsert=True
    )
    
    return {"message": "Scripts saved successfully"}

# ==================== INVOICE SETTINGS ====================

@api_router.get("/settings/invoice-template")
async def get_invoice_template():
    """Get invoice template settings"""
    template = await db.invoice_settings.find_one({"id": "invoice_template"}, {"_id": 0})
    return template or {}

@api_router.put("/settings/invoice-template")
async def update_invoice_template(template: dict):
    """Update invoice template settings"""
    template["id"] = "invoice_template"
    template["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.invoice_settings.update_one(
        {"id": "invoice_template"},
        {"$set": template},
        upsert=True
    )
    return {"message": "Invoice template saved successfully"}

# ==================== FILE UPLOAD ====================

@api_router.post("/upload/{upload_type}")
async def upload_file(upload_type: str, file: UploadFile = File(...)):
    """Upload a file (logo, banner, product image, favicon)"""
    allowed_types = ["logos", "banners", "products", "favicons"]
    if upload_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Invalid upload type. Must be one of: {allowed_types}")
    
    # Validate file type
    allowed_extensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".ico"]
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: {allowed_extensions}")
    
    # Generate unique filename
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = UPLOADS_DIR / upload_type / unique_filename
    
    # Save file
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    # Return the URL path
    file_url = f"/api/uploads/{upload_type}/{unique_filename}"
    
    return {
        "filename": unique_filename,
        "url": file_url,
        "size": len(content),
        "type": file.content_type
    }

@api_router.get("/uploads/{upload_type}/{filename}")
async def get_uploaded_file(upload_type: str, filename: str):
    """Serve uploaded files"""
    from fastapi.responses import FileResponse
    
    file_path = UPLOADS_DIR / upload_type / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(file_path)

@api_router.get("/store/favicon")
async def get_store_favicon(request: Request):
    """Get store favicon based on subdomain/domain - returns redirect to favicon URL"""
    from fastapi.responses import RedirectResponse, FileResponse
    
    # Detect store from request
    store_id = await get_store_id_from_header(request)
    
    if store_id:
        settings = await db.store_settings.find_one({"store_id": store_id})
    else:
        settings = await db.store_settings.find_one({})
    
    if settings and settings.get("store_favicon"):
        favicon_url = settings.get("store_favicon")
        # If it's a local URL, serve the file directly
        if favicon_url.startswith("/api/uploads/"):
            filename = favicon_url.split("/")[-1]
            file_path = UPLOADS_DIR / "favicons" / filename
            if file_path.exists():
                return FileResponse(file_path, media_type="image/x-icon")
        # Otherwise redirect to the URL
        return RedirectResponse(url=favicon_url)
    
    # Return default favicon or 404
    raise HTTPException(status_code=404, detail="Favicon not found")

# ==================== THEME TEMPLATES ====================

@api_router.get("/templates", response_model=List[ThemeTemplate])
async def get_templates():
    templates = await db.templates.find({}).sort("name", 1).to_list(100)
    return [ThemeTemplate(**t) for t in templates]

@api_router.get("/templates/{template_id}", response_model=ThemeTemplate)
async def get_template(template_id: str):
    template = await db.templates.find_one({"id": template_id})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return ThemeTemplate(**template)

@api_router.post("/templates", response_model=ThemeTemplate)
async def create_template(template: ThemeTemplate):
    # Check if template with same name exists
    existing = await db.templates.find_one({"name": template.name})
    if existing:
        raise HTTPException(status_code=400, detail="Template with this name already exists")
    
    await db.templates.insert_one(template.dict())
    return template

@api_router.put("/templates/{template_id}", response_model=ThemeTemplate)
async def update_template(template_id: str, template: ThemeTemplateUpdate):
    update_data = {k: v for k, v in template.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    result = await db.templates.update_one(
        {"id": template_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    
    updated = await db.templates.find_one({"id": template_id})
    return ThemeTemplate(**updated)

@api_router.delete("/templates/{template_id}")
async def delete_template(template_id: str):
    result = await db.templates.delete_one({"id": template_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"message": "Template deleted successfully"}

# ==================== TEMPLATE RENDERING ====================

@api_router.post("/render-template")
async def render_template(template_content: str = Form(...), context: str = Form(default="{}")):
    """Render a template with Maropost-style tags"""
    try:
        ctx = json.loads(context)
    except:
        ctx = {}
    
    rendered = await template_engine.render(template_content, ctx)
    return {"rendered": rendered}

@api_router.get("/template-tags")
async def get_template_tags():
    """Return documentation of all available template tags"""
    return {
        "data_tags": {
            "product": [
                {"tag": "[@SKU@]", "description": "Product SKU code"},
                {"tag": "[@name@]", "description": "Product name"},
                {"tag": "[@model@]", "description": "Model number"},
                {"tag": "[@brand@]", "description": "Brand name"},
                {"tag": "[@description@]", "description": "Full HTML description"},
                {"tag": "[@short_description@]", "description": "Brief summary"},
                {"tag": "[@price@]", "description": "Selling price (29.95)"},
                {"tag": "[@price_formatted@]", "description": "Price with currency ($29.95)"},
                {"tag": "[@rrp@]", "description": "Recommended retail price"},
                {"tag": "[@rrp_formatted@]", "description": "RRP with currency"},
                {"tag": "[@save_price@]", "description": "Discount amount"},
                {"tag": "[@save_percent@]", "description": "Discount percentage"},
                {"tag": "[@on_sale@]", "description": "'y' if on sale"},
                {"tag": "[@qty@]", "description": "Stock quantity"},
                {"tag": "[@in_stock@]", "description": "'y' if in stock"},
                {"tag": "[@stock_status@]", "description": "Human-readable status"},
                {"tag": "[@image@]", "description": "Main image URL"},
                {"tag": "[@image_2@] - [@image_12@]", "description": "Additional images"},
                {"tag": "[@thumb@]", "description": "Thumbnail URL"},
                {"tag": "[@url@]", "description": "Product page URL"},
                {"tag": "[@add_to_cart_url@]", "description": "Direct add to cart link"},
                {"tag": "[@weight@]", "description": "Product weight"},
                {"tag": "[@category@]", "description": "Primary category"},
                {"tag": "[@id@]", "description": "Product ID"},
                {"tag": "[@count@]", "description": "Loop position (0-indexed)"},
                {"tag": "[@current_index@]", "description": "Loop position (1-indexed)"},
                {"tag": "[@total@]", "description": "Total items in list"},
            ],
            "category": [
                {"tag": "[@content_name@]", "description": "Category name"},
                {"tag": "[@content_id@]", "description": "Category ID"},
                {"tag": "[@content_url@]", "description": "Category URL"},
                {"tag": "[@content_description@]", "description": "Description"},
                {"tag": "[@content_image@]", "description": "Category image"},
                {"tag": "[@content_product_count@]", "description": "Product count"},
            ],
            "store": [
                {"tag": "[@store_name@]", "description": "Business name"},
                {"tag": "[@store_email@]", "description": "Contact email"},
                {"tag": "[@store_phone@]", "description": "Phone number"},
                {"tag": "[@store_url@]", "description": "Website URL"},
                {"tag": "[@store_logo@]", "description": "Logo URL"},
                {"tag": "[@currency@]", "description": "Currency code (USD)"},
                {"tag": "[@currency_symbol@]", "description": "Symbol ($)"},
                {"tag": "[@store_facebook@]", "description": "Facebook URL"},
                {"tag": "[@store_instagram@]", "description": "Instagram URL"},
                {"tag": "[@current_date@]", "description": "Today's date"},
                {"tag": "[@current_year@]", "description": "Current year"},
            ],
            "cart": [
                {"tag": "[@cart_subtotal@]", "description": "Cart subtotal"},
                {"tag": "[@cart_total@]", "description": "Cart total"},
                {"tag": "[@cart_item_count@]", "description": "Number of items"},
                {"tag": "[@cart_coupon@]", "description": "Applied coupon"},
                {"tag": "[@mini_cart_count@]", "description": "Items in cart"},
                {"tag": "[@mini_cart_total@]", "description": "Cart total formatted"},
            ],
            "customer": [
                {"tag": "[@customer_id@]", "description": "Customer ID"},
                {"tag": "[@customer_email@]", "description": "Email address"},
                {"tag": "[@customer_first_name@]", "description": "First name"},
                {"tag": "[@customer_last_name@]", "description": "Last name"},
                {"tag": "[@customer_full_name@]", "description": "Full name"},
                {"tag": "[@customer_logged_in@]", "description": "'y' if logged in"},
            ],
            "order": [
                {"tag": "[@order_id@]", "description": "Order ID"},
                {"tag": "[@order_number@]", "description": "Display order number"},
                {"tag": "[@order_status@]", "description": "Status"},
                {"tag": "[@order_total@]", "description": "Order total"},
                {"tag": "[@order_customer_name@]", "description": "Customer name"},
                {"tag": "[@order_customer_email@]", "description": "Customer email"},
            ],
        },
        "function_tags": {
            "listings": [
                {"tag": "[%thumb_list type:'products' category:'100' limit:'12'%]...[%/thumb_list%]", "description": "Display products"},
                {"tag": "[%new_arrivals limit:'8'%]...[%/new_arrivals%]", "description": "Recent products"},
                {"tag": "[%top_sellers limit:'8' days:'30'%]...[%/top_sellers%]", "description": "Best sellers"},
            ],
            "conditionals": [
                {"tag": "[%if condition%]...[%elseif condition%]...[%else%]...[%/if%]", "description": "Conditional logic"},
            ],
            "loops": [
                {"tag": "[%forloop from:'1' to:'10'%]...[%/forloop%]", "description": "Number iteration"},
            ],
            "variables": [
                {"tag": "[%set name:'my_var' value:'Hello'%]", "description": "Set variable"},
            ],
            "includes": [
                {"tag": "[%load_template file:'partials/header.html'%]", "description": "Include template"},
                {"tag": "[%content_zone id:'homepage_banner'%]", "description": "Display content zone"},
            ],
            "formatting": [
                {"tag": "[%currency value:'100'%]", "description": "Format as currency"},
                {"tag": "[%truncate value:'text' length:'100' suffix:'...'%]", "description": "Truncate text"},
                {"tag": "[%strip_tags value:'<p>text</p>'%]", "description": "Remove HTML tags"},
                {"tag": "[%date value:'2024-01-01' format:'d/m/Y'%]", "description": "Format date"},
            ],
        },
        "param_syntax": "[%param *header%]...[%/param%], [%param *body%]...[%/param%], [%param *footer%]...[%/param%], [%param *ifempty%]...[%/param%]"
    }

# ==================== MULTI-THEME FILE MANAGEMENT ====================

class ThemeInfo(BaseModel):
    name: str
    file_count: int = 0
    is_active: bool = False
    created_at: Optional[str] = None

class ThemeFile(BaseModel):
    path: str
    theme: str
    file_type: str = "text"
    size: int = 0
    modified: Optional[str] = None

class ThemeFileContent(BaseModel):
    content: str

class ThemeFileCreate(BaseModel):
    path: str
    content: str = ""

# Helper to get file type
def get_file_type(ext):
    if ext in ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico']:
        return "image"
    elif ext in ['.woff', '.woff2', '.ttf', '.eot', '.otf']:
        return "font"
    elif ext in ['.svg']:
        return "svg"
    return "text"

# Helper to get all files for a theme
def get_theme_files_list(theme_name: str):
    files = []
    theme_path = THEMES_DIR / theme_name
    if theme_path.exists():
        for file_path in theme_path.rglob('*'):
            if file_path.is_file():
                rel_path = str(file_path.relative_to(theme_path))
                ext = file_path.suffix.lower()
                stat = file_path.stat()
                files.append(ThemeFile(
                    path=rel_path,
                    theme=theme_name,
                    file_type=get_file_type(ext),
                    size=stat.st_size,
                    modified=datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat()
                ))
    return files

# Get active theme name from database
async def get_active_theme_name(store_id: str = None):
    """Get active theme - supports per-store themes or falls back to global setting"""
    # First check if store has its own theme
    if store_id:
        store = await db.platform_stores.find_one({"id": store_id}, {"_id": 0, "theme": 1})
        if store and store.get("theme"):
            return store["theme"]
    
    # Fall back to global store settings
    settings = await db.store_settings.find_one({"id": "store_settings"})
    return settings.get("active_theme", "toolsinabox") if settings else "toolsinabox"

@api_router.get("/themes")
async def list_themes(current_user: dict = Depends(get_current_user)):
    """List all available themes - shows which is active for the current store"""
    themes = []
    
    # Get the store's active theme if user has a store
    store_id = await get_store_id_for_current_user(current_user)
    active_theme = await get_active_theme_name(store_id)
    
    if THEMES_DIR.exists():
        for theme_dir in THEMES_DIR.iterdir():
            if theme_dir.is_dir():
                file_count = sum(1 for _ in theme_dir.rglob('*') if _.is_file())
                stat = theme_dir.stat()
                themes.append(ThemeInfo(
                    name=theme_dir.name,
                    file_count=file_count,
                    is_active=(theme_dir.name == active_theme),
                    created_at=datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat()
                ))
    
    return sorted(themes, key=lambda t: t.name)

@api_router.post("/themes")
async def create_theme(name: str, current_user: dict = Depends(get_current_user)):
    """Create a new empty theme"""
    # Sanitize theme name
    safe_name = re.sub(r'[^a-zA-Z0-9_-]', '', name.lower())
    if not safe_name:
        raise HTTPException(status_code=400, detail="Invalid theme name")
    
    theme_path = THEMES_DIR / safe_name
    if theme_path.exists():
        raise HTTPException(status_code=400, detail="Theme already exists")
    
    # Create theme with basic structure
    (theme_path / "templates" / "headers").mkdir(parents=True, exist_ok=True)
    (theme_path / "templates" / "footers").mkdir(parents=True, exist_ok=True)
    (theme_path / "templates" / "cms").mkdir(parents=True, exist_ok=True)
    (theme_path / "templates" / "products").mkdir(parents=True, exist_ok=True)
    (theme_path / "css").mkdir(parents=True, exist_ok=True)
    (theme_path / "js").mkdir(parents=True, exist_ok=True)
    (theme_path / "images").mkdir(parents=True, exist_ok=True)
    
    # Create default template files
    default_header = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>[@store_name@]</title>
    <link rel="stylesheet" href="/api/themes/{theme}/assets/css/style.css">
</head>
<body>
<header>
    <div class="logo">
        <a href="/"><img src="[@store_logo@]" alt="[@store_name@]"></a>
    </div>
    <nav>
        [%category_list%]
        <a href="/[@category_url@]">[@category_name@]</a>
        [%/category_list%]
    </nav>
</header>
<main>
""".replace("{theme}", safe_name)
    
    default_footer = """</main>
<footer>
    <p>&copy; [@current_year@] [@store_name@]. All rights reserved.</p>
</footer>
<script src="/api/themes/{theme}/assets/js/main.js"></script>
</body>
</html>
""".replace("{theme}", safe_name)
    
    default_home = """[%load_template file:'headers/template.html'/%]

<section class="hero">
    <h1>Welcome to [@store_name@]</h1>
</section>

<section class="featured-products">
    <h2>Featured Products</h2>
    [%thumb_list type:'products' limit:'8'%]
    <div class="product-card">
        <a href="[@url@]">
            <img src="[@thumb@]" alt="[@name@]">
            <h3>[@name@]</h3>
            <p class="price">[@price_formatted@]</p>
        </a>
    </div>
    [%/thumb_list%]
</section>

[%load_template file:'footers/template.html'/%]
"""
    
    async with aiofiles.open(theme_path / "templates" / "headers" / "template.html", 'w') as f:
        await f.write(default_header)
    async with aiofiles.open(theme_path / "templates" / "footers" / "template.html", 'w') as f:
        await f.write(default_footer)
    async with aiofiles.open(theme_path / "templates" / "cms" / "home.template.html", 'w') as f:
        await f.write(default_home)
    
    # Create empty CSS
    async with aiofiles.open(theme_path / "css" / "style.css", 'w') as f:
        await f.write("/* Theme styles */\n")
    
    # Create empty JS
    async with aiofiles.open(theme_path / "js" / "main.js", 'w') as f:
        await f.write("// Theme scripts\n")
    
    return {"message": f"Theme '{safe_name}' created successfully", "name": safe_name}

@api_router.delete("/themes/{theme_name}")
async def delete_theme(theme_name: str, current_user: dict = Depends(get_current_user)):
    """Delete a theme"""
    theme_path = THEMES_DIR / theme_name
    
    if not theme_path.exists():
        raise HTTPException(status_code=404, detail="Theme not found")
    
    # Check if it's the active theme
    active_theme = await get_active_theme_name()
    if theme_name == active_theme:
        raise HTTPException(status_code=400, detail="Cannot delete the active theme")
    
    shutil.rmtree(theme_path)
    return {"message": f"Theme '{theme_name}' deleted successfully"}

@api_router.put("/themes/{theme_name}/activate")
async def activate_theme(theme_name: str, current_user: dict = Depends(get_current_user)):
    """Set a theme as active for the current store or globally"""
    theme_path = THEMES_DIR / theme_name
    
    if not theme_path.exists():
        raise HTTPException(status_code=404, detail="Theme not found")
    
    # Check if user has a store - if so, set theme for that store
    store_id = await get_store_id_for_current_user(current_user)
    
    if store_id:
        # Set theme for this specific store
        await db.platform_stores.update_one(
            {"id": store_id},
            {"$set": {"theme": theme_name, "updated_at": datetime.now(timezone.utc)}}
        )
        return {"message": f"Theme '{theme_name}' is now active for your store"}
    else:
        # Fall back to global setting (for admin users)
        await db.store_settings.update_one(
            {"id": "store_settings"},
            {"$set": {"active_theme": theme_name}},
            upsert=True
        )
        return {"message": f"Theme '{theme_name}' is now active globally"}

@api_router.get("/themes/{theme_name}/files")
async def list_theme_files(theme_name: str, current_user: dict = Depends(get_current_user)):
    """List all files in a specific theme"""
    theme_path = THEMES_DIR / theme_name
    
    if not theme_path.exists():
        raise HTTPException(status_code=404, detail="Theme not found")
    
    return get_theme_files_list(theme_name)

@api_router.get("/themes/{theme_name}/files/{file_path:path}")
async def get_theme_file(theme_name: str, file_path: str, current_user: dict = Depends(get_current_user)):
    """Get content of a specific theme file"""
    full_path = THEMES_DIR / theme_name / file_path
    
    if not full_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    if not full_path.is_file():
        raise HTTPException(status_code=400, detail="Path is not a file")
    
    # Check if it's a binary file
    ext = full_path.suffix.lower()
    if ext in ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.otf']:
        raise HTTPException(status_code=400, detail="Binary files cannot be read as text")
    
    try:
        async with aiofiles.open(full_path, 'r', encoding='utf-8') as f:
            content = await f.read()
        return {"path": file_path, "theme": theme_name, "content": content}
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File is not a valid text file")

@api_router.get("/themes/{theme_name}/assets/{file_path:path}")
async def get_theme_asset(theme_name: str, file_path: str):
    """Get raw asset file (for images, fonts, CSS, JS)"""
    full_path = THEMES_DIR / theme_name / file_path
    
    if not full_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    ext = full_path.suffix.lower()
    content_types = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
        '.ttf': 'font/ttf',
        '.eot': 'application/vnd.ms-fontobject',
    }
    
    content_type = content_types.get(ext, 'application/octet-stream')
    
    return StreamingResponse(
        open(full_path, 'rb'),
        media_type=content_type
    )

@api_router.post("/themes/{theme_name}/files")
async def create_theme_file(theme_name: str, file_data: ThemeFileCreate, current_user: dict = Depends(get_current_user)):
    """Create a new file in a theme"""
    theme_path = THEMES_DIR / theme_name
    
    if not theme_path.exists():
        raise HTTPException(status_code=404, detail="Theme not found")
    
    full_path = theme_path / file_data.path
    
    # Security: Prevent path traversal
    try:
        full_path.resolve().relative_to(theme_path.resolve())
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid file path")
    
    if full_path.exists():
        raise HTTPException(status_code=400, detail="File already exists")
    
    full_path.parent.mkdir(parents=True, exist_ok=True)
    
    async with aiofiles.open(full_path, 'w', encoding='utf-8') as f:
        await f.write(file_data.content)
    
    return {"message": "File created successfully", "path": file_data.path, "theme": theme_name}

@api_router.put("/themes/{theme_name}/files/{file_path:path}")
async def update_theme_file(theme_name: str, file_path: str, file_data: ThemeFileContent, current_user: dict = Depends(get_current_user)):
    """Update a theme file's content"""
    full_path = THEMES_DIR / theme_name / file_path
    
    if not full_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    # Security: Prevent path traversal
    try:
        full_path.resolve().relative_to((THEMES_DIR / theme_name).resolve())
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid file path")
    
    async with aiofiles.open(full_path, 'w', encoding='utf-8') as f:
        await f.write(file_data.content)
    
    return {"message": "File updated successfully", "path": file_path, "theme": theme_name}

@api_router.delete("/themes/{theme_name}/files/{file_path:path}")
async def delete_theme_file(theme_name: str, file_path: str, current_user: dict = Depends(get_current_user)):
    """Delete a file from a theme"""
    theme_path = THEMES_DIR / theme_name
    full_path = theme_path / file_path
    
    if not full_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    # Security: Prevent path traversal
    try:
        full_path.resolve().relative_to(theme_path.resolve())
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid file path")
    
    full_path.unlink()
    
    # Remove empty parent directories
    parent = full_path.parent
    while parent != theme_path:
        if not any(parent.iterdir()):
            parent.rmdir()
            parent = parent.parent
        else:
            break
    
    return {"message": "File deleted successfully"}

@api_router.get("/themes/{theme_name}/download")
async def download_theme(theme_name: str, current_user: dict = Depends(get_current_user)):
    """Download a theme as a ZIP file"""
    theme_path = THEMES_DIR / theme_name
    
    if not theme_path.exists():
        raise HTTPException(status_code=404, detail="Theme not found")
    
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for file_path in theme_path.rglob('*'):
            if file_path.is_file():
                arcname = str(file_path.relative_to(theme_path))
                zip_file.write(file_path, arcname)
    
    zip_buffer.seek(0)
    
    return StreamingResponse(
        zip_buffer,
        media_type='application/zip',
        headers={'Content-Disposition': f'attachment; filename="{theme_name}.zip"'}
    )

@api_router.post("/themes/{theme_name}/upload")
async def upload_theme_files(theme_name: str, file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Upload a ZIP file to a theme (replaces existing files)"""
    if not file.filename.endswith('.zip'):
        raise HTTPException(status_code=400, detail="Only ZIP files are allowed")
    
    theme_path = THEMES_DIR / theme_name
    
    # Create theme directory if it doesn't exist
    theme_path.mkdir(parents=True, exist_ok=True)
    
    contents = await file.read()
    
    try:
        with zipfile.ZipFile(io.BytesIO(contents)) as zf:
            for name in zf.namelist():
                if name.startswith('/') or '..' in name:
                    raise HTTPException(status_code=400, detail=f"Invalid path in ZIP: {name}")
        
        # Clear existing files (but keep the directory)
        for item in theme_path.iterdir():
            if item.is_file():
                item.unlink()
            elif item.is_dir():
                shutil.rmtree(item)
        
        # Extract
        with zipfile.ZipFile(io.BytesIO(contents)) as zf:
            names = zf.namelist()
            common_prefix = os.path.commonprefix(names)
            if common_prefix and '/' in common_prefix:
                common_prefix = common_prefix.split('/')[0] + '/'
            else:
                common_prefix = ''
            
            for member in zf.namelist():
                if member.endswith('/'):
                    continue
                
                target_path = member
                if common_prefix:
                    target_path = member[len(common_prefix):]
                
                if not target_path:
                    continue
                
                full_path = theme_path / target_path
                full_path.parent.mkdir(parents=True, exist_ok=True)
                
                with zf.open(member) as source:
                    with open(full_path, 'wb') as target:
                        target.write(source.read())
        
        file_count = len(get_theme_files_list(theme_name))
        return {"message": f"Theme updated. {file_count} files extracted.", "theme": theme_name}
        
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="Invalid ZIP file")

# ==================== SERVER-SIDE RENDERING ====================

@api_router.get("/render/full-page/{page_type}")
async def render_full_page(page_type: str, category_id: Optional[str] = None, product_id: Optional[str] = None):
    """Render a complete storefront page with header, content, and footer from active theme"""
    active_theme = await get_active_theme_name()
    theme_path = THEMES_DIR / active_theme
    
    if not theme_path.exists():
        raise HTTPException(status_code=404, detail="Active theme not found")
    
    engine = MaropostTemplateEngine(db)
    context = await engine.get_store_context()
    
    # Get products for product grids
    products = await db.products.find({}, {"_id": 0}).limit(20).to_list(20)
    context["products"] = products
    context["featured_products"] = products[:8]
    
    # Get banners
    banners = await db.banners.find({}, {"_id": 0}).to_list(20)
    context["banners"] = banners
    
    # Get categories
    categories = await db.categories.find({}, {"_id": 0}).to_list(50)
    context["categories"] = categories
    
    # Add page-specific context
    if page_type == "category" and category_id:
        category = await db.categories.find_one({"id": category_id}, {"_id": 0})
        if category:
            context["category"] = category
            cat_products = await db.products.find({"category": category.get("name")}, {"_id": 0}).to_list(100)
            context["products"] = cat_products
    
    if page_type == "product" and product_id:
        product = await db.products.find_one({"id": product_id}, {"_id": 0})
        if product:
            context["product"] = product
    
    # Helper function to process includes recursively
    async def process_includes(content):
        pattern = r"\[%load_template\s+file:'([^']+)'/?%\]"
        matches = re.findall(pattern, content)
        
        for include_path in matches:
            include_file = theme_path / "templates" / include_path
            if include_file.exists():
                async with aiofiles.open(include_file, 'r', encoding='utf-8') as f:
                    include_content = await f.read()
                include_content = await process_includes(include_content)
                content = re.sub(
                    rf"\[%load_template\s+file:'{re.escape(include_path)}'/?%\]",
                    include_content,
                    content
                )
        return content
    
    # Build the full page from header + content + footer
    header_file = theme_path / "templates" / "headers" / "template.html"
    footer_file = theme_path / "templates" / "footers" / "template.html"
    
    # Determine content template
    content_file = None
    if page_type == "home":
        content_file = theme_path / "templates" / "cms" / "home.template.html"
    elif page_type == "category":
        content_file = theme_path / "templates" / "cms" / "category.template.html"
    elif page_type == "product":
        content_file = theme_path / "templates" / "products" / "template.html"
    elif page_type == "cart":
        content_file = theme_path / "templates" / "cart" / "shopping_cart.template.html"
    else:
        content_file = theme_path / "templates" / "cms" / f"{page_type}.template.html"
    
    # Read templates
    header_html = ""
    footer_html = ""
    content_html = ""
    
    if header_file.exists():
        async with aiofiles.open(header_file, 'r', encoding='utf-8') as f:
            header_html = await f.read()
        header_html = await process_includes(header_html)
    
    if footer_file.exists():
        async with aiofiles.open(footer_file, 'r', encoding='utf-8') as f:
            footer_html = await f.read()
        footer_html = await process_includes(footer_html)
    
    if content_file and content_file.exists():
        async with aiofiles.open(content_file, 'r', encoding='utf-8') as f:
            content_html = await f.read()
        content_html = await process_includes(content_html)
    else:
        content_html = f"<div class='container py-8'><h1>Page not found: {page_type}</h1></div>"
    
    # Combine: The header should contain <body>, content goes in main, footer closes </body>
    # For skeletal theme, header has full structure, we just need to add content before footer
    full_html = header_html + content_html + footer_html
    
    # Process Maropost tags
    rendered = await engine.render(full_html, context)
    
    # Replace theme asset paths
    rendered = re.sub(r'\[%ntheme_asset%\]', f'/api/themes/{active_theme}/assets/', rendered)
    rendered = re.sub(r'\[%/ntheme_asset%\]', '', rendered)
    rendered = re.sub(r'/assets/themes/skeletal/', f'/api/themes/{active_theme}/assets/', rendered)
    
    # Fix relative CSS/JS paths - these need to have the full path
    # Replace href="css/ with full path
    rendered = re.sub(r'href="css/', f'href="/api/themes/{active_theme}/assets/css/', rendered)
    rendered = re.sub(r'href="js/', f'href="/api/themes/{active_theme}/assets/js/', rendered)
    rendered = re.sub(r'src="js/', f'src="/api/themes/{active_theme}/assets/js/', rendered)
    rendered = re.sub(r'src="images/', f'src="/api/themes/{active_theme}/assets/images/', rendered)
    rendered = re.sub(r'src="img/', f'src="/api/themes/{active_theme}/assets/img/', rendered)
    
    return StreamingResponse(
        io.BytesIO(rendered.encode('utf-8')),
        media_type='text/html'
    )

@api_router.get("/render/{page_type}")
async def render_storefront_page(page_type: str, category_id: Optional[str] = None, product_id: Optional[str] = None):
    """Render a storefront page using the active theme templates"""
    active_theme = await get_active_theme_name()
    theme_path = THEMES_DIR / active_theme
    
    if not theme_path.exists():
        raise HTTPException(status_code=404, detail="Active theme not found")
    
    engine = MaropostTemplateEngine(db)
    
    # Build context
    context = await engine.get_store_context()
    
    # Determine which template to use
    template_file = None
    
    if page_type == "home":
        template_file = theme_path / "templates" / "cms" / "home.template.html"
    elif page_type == "category":
        template_file = theme_path / "templates" / "cms" / "category.template.html"
        if category_id:
            category = await db.categories.find_one({"id": category_id}, {"_id": 0})
            if category:
                context["category"] = category
                products = await db.products.find({"category": category["name"]}, {"_id": 0}).to_list(100)
                context["products"] = products
    elif page_type == "product":
        template_file = theme_path / "templates" / "products" / "template.html"
        if product_id:
            product = await db.products.find_one({"id": product_id}, {"_id": 0})
            if product:
                context["product"] = product
    elif page_type == "cart":
        template_file = theme_path / "templates" / "cart" / "shopping_cart.template.html"
    else:
        # Try to find a matching CMS template
        template_file = theme_path / "templates" / "cms" / f"{page_type}.template.html"
    
    if not template_file or not template_file.exists():
        # Fall back to default template
        template_file = theme_path / "templates" / "cms" / "default.template.html"
        if not template_file.exists():
            return {"html": f"<h1>Template not found: {page_type}</h1>", "theme": active_theme}
    
    # Read and render template
    async with aiofiles.open(template_file, 'r', encoding='utf-8') as f:
        template_content = await f.read()
    
    # Process load_template tags to include headers/footers
    async def process_includes(content):
        pattern = r"\[%load_template\s+file:'([^']+)'/?%\]"
        matches = re.findall(pattern, content)
        
        for include_path in matches:
            include_file = theme_path / "templates" / include_path
            if include_file.exists():
                async with aiofiles.open(include_file, 'r', encoding='utf-8') as f:
                    include_content = await f.read()
                # Recursively process includes
                include_content = await process_includes(include_content)
                content = re.sub(
                    rf"\[%load_template\s+file:'{re.escape(include_path)}'/?%\]",
                    include_content,
                    content
                )
        
        return content
    
    # Process includes first
    full_template = await process_includes(template_content)
    
    # Render with Maropost engine
    rendered = await engine.render(full_template, context)
    
    return StreamingResponse(
        io.BytesIO(rendered.encode('utf-8')),
        media_type='text/html'
    )

# ==================== PARTIAL RENDERING FOR HYBRID APPROACH ====================

@api_router.get("/render/partial/header")
async def render_partial_header():
    """Render just the header from active theme"""
    active_theme = await get_active_theme_name()
    theme_path = THEMES_DIR / active_theme
    
    if not theme_path.exists():
        return {"html": "", "error": "Theme not found"}
    
    # Try to find header template
    header_file = theme_path / "templates" / "headers" / "template.html"
    if not header_file.exists():
        return {"html": "", "error": "Header template not found"}
    
    engine = MaropostTemplateEngine(db)
    context = await engine.get_store_context()
    
    async with aiofiles.open(header_file, 'r', encoding='utf-8') as f:
        template_content = await f.read()
    
    # Process includes
    async def process_includes(content, base_path):
        pattern = r"\[%load_template\s+file:'([^']+)'/?%\]"
        matches = re.findall(pattern, content)
        for include_path in matches:
            include_file = theme_path / "templates" / include_path
            if include_file.exists():
                async with aiofiles.open(include_file, 'r', encoding='utf-8') as f:
                    include_content = await f.read()
                include_content = await process_includes(include_content, base_path)
                content = re.sub(rf"\[%load_template\s+file:'{re.escape(include_path)}'/?%\]", include_content, content)
        return content
    
    full_template = await process_includes(template_content, theme_path)
    rendered = await engine.render(full_template, context)
    
    return {"html": rendered, "theme": active_theme}

@api_router.get("/render/partial/footer")
async def render_partial_footer():
    """Render just the footer from active theme"""
    active_theme = await get_active_theme_name()
    theme_path = THEMES_DIR / active_theme
    
    if not theme_path.exists():
        return {"html": "", "error": "Theme not found"}
    
    footer_file = theme_path / "templates" / "footers" / "template.html"
    if not footer_file.exists():
        return {"html": "", "error": "Footer template not found"}
    
    engine = MaropostTemplateEngine(db)
    context = await engine.get_store_context()
    
    async with aiofiles.open(footer_file, 'r', encoding='utf-8') as f:
        template_content = await f.read()
    
    async def process_includes(content, base_path):
        pattern = r"\[%load_template\s+file:'([^']+)'/?%\]"
        matches = re.findall(pattern, content)
        for include_path in matches:
            include_file = theme_path / "templates" / include_path
            if include_file.exists():
                async with aiofiles.open(include_file, 'r', encoding='utf-8') as f:
                    include_content = await f.read()
                include_content = await process_includes(include_content, base_path)
                content = re.sub(rf"\[%load_template\s+file:'{re.escape(include_path)}'/?%\]", include_content, content)
        return content
    
    full_template = await process_includes(template_content, theme_path)
    rendered = await engine.render(full_template, context)
    
    return {"html": rendered, "theme": active_theme}

@api_router.get("/render/partial/hero")
async def render_partial_hero():
    """Render hero/banner section from active theme"""
    active_theme = await get_active_theme_name()
    theme_path = THEMES_DIR / active_theme
    
    if not theme_path.exists():
        return {"html": "", "error": "Theme not found"}
    
    engine = MaropostTemplateEngine(db)
    context = await engine.get_store_context()
    
    # Get banners for hero section
    banners = await db.banners.find({}, {"_id": 0}).to_list(20)
    context["banners"] = banners
    
    # Try hero template first, then carousel template
    hero_file = theme_path / "templates" / "thumbs" / "advert" / "carousel.template.html"
    if not hero_file.exists():
        # Create a simple hero template from banners data
        banner_html = '<div class="hero-carousel">'
        for banner in banners:
            img_url = banner.get("image_url_desktop", banner.get("image_url", ""))
            title = banner.get("title", "")
            subtitle = banner.get("subtitle", "")
            link = banner.get("link_url", "#")
            btn_text = banner.get("button_text", "")
            
            banner_html += f'''
            <div class="hero-slide" style="background-image: url('{img_url}');">
                <div class="hero-content">
                    {f'<h1>{title}</h1>' if title else ''}
                    {f'<p>{subtitle}</p>' if subtitle else ''}
                    {f'<a href="{link}" class="hero-btn">{btn_text}</a>' if btn_text else ''}
                </div>
            </div>
            '''
        banner_html += '</div>'
        return {"html": banner_html, "theme": active_theme, "banners": banners}
    
    async with aiofiles.open(hero_file, 'r', encoding='utf-8') as f:
        template_content = await f.read()
    
    rendered = await engine.render(template_content, context)
    return {"html": rendered, "theme": active_theme, "banners": banners}

@api_router.get("/render/partial/products")
async def render_partial_products(
    category: Optional[str] = None,
    limit: int = Query(default=12, le=50),
    featured: bool = False
):
    """Render product grid from active theme"""
    active_theme = await get_active_theme_name()
    theme_path = THEMES_DIR / active_theme
    
    if not theme_path.exists():
        return {"html": "", "error": "Theme not found"}
    
    engine = MaropostTemplateEngine(db)
    context = await engine.get_store_context()
    
    # Get products
    query = {}
    if category:
        query["category"] = category
    if featured:
        query["featured"] = True
    
    products = await db.products.find(query, {"_id": 0}).limit(limit).to_list(limit)
    context["products"] = products
    
    # Try to find product thumb template
    thumb_file = theme_path / "templates" / "thumbs" / "product" / "template.html"
    
    if not thumb_file.exists():
        # Create a simple product grid
        html = '<div class="product-grid">'
        for prod in products:
            price = prod.get("price", 0)
            img = prod.get("images", [""])[0] if prod.get("images") else ""
            html += f'''
            <div class="product-card" data-product-id="{prod.get('id', '')}">
                <a href="/store/product/{prod.get('id', '')}">
                    <img src="{img}" alt="{prod.get('name', '')}" loading="lazy">
                    <h3>{prod.get('name', '')}</h3>
                    <p class="price">${price:.2f}</p>
                </a>
                <button class="add-to-cart-btn" data-product-id="{prod.get('id', '')}">Add to Cart</button>
            </div>
            '''
        html += '</div>'
        return {"html": html, "theme": active_theme, "products": products}
    
    # Render each product with the template
    async with aiofiles.open(thumb_file, 'r', encoding='utf-8') as f:
        thumb_template = await f.read()
    
    html = '<div class="product-grid">'
    for idx, prod in enumerate(products):
        prod_context = {**context, "product": prod, "count": idx, "current_index": idx + 1, "total": len(products)}
        rendered_item = await engine.render(thumb_template, prod_context)
        html += f'<div class="product-item" data-product-id="{prod.get("id", "")}">{rendered_item}</div>'
    html += '</div>'
    
    return {"html": html, "theme": active_theme, "products": products}

@api_router.get("/render/partial/categories")
async def render_partial_categories():
    """Render category navigation from active theme"""
    active_theme = await get_active_theme_name()
    
    engine = MaropostTemplateEngine(db)
    context = await engine.get_store_context()
    categories = context.get("categories", [])
    
    # Simple category nav
    html = '<nav class="category-nav"><ul>'
    for cat in categories:
        html += f'<li><a href="/store/category/{cat.get("id", "")}">{cat.get("name", "")}</a></li>'
    html += '</ul></nav>'
    
    return {"html": html, "theme": active_theme, "categories": categories}

@api_router.get("/render/partial/product-detail")
async def render_partial_product_detail(product_id: str):
    """Render single product detail from active theme"""
    active_theme = await get_active_theme_name()
    theme_path = THEMES_DIR / active_theme
    
    if not theme_path.exists():
        return {"html": "", "error": "Theme not found"}
    
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        return {"html": "<p>Product not found</p>", "error": "Product not found"}
    
    engine = MaropostTemplateEngine(db)
    context = await engine.get_store_context()
    context["product"] = product
    
    # Try product detail template
    detail_file = theme_path / "templates" / "products" / "template.html"
    
    if not detail_file.exists():
        # Create simple product detail
        price = product.get("price", 0)
        compare_price = product.get("compare_price", 0)
        images = product.get("images", [])
        
        html = f'''
        <div class="product-detail" data-product-id="{product.get('id', '')}">
            <div class="product-images">
                {f'<img src="{images[0]}" alt="{product.get("name", "")}">' if images else ''}
            </div>
            <div class="product-info">
                <h1>{product.get('name', '')}</h1>
                <p class="sku">SKU: {product.get('sku', '')}</p>
                <div class="price">
                    <span class="current-price">${price:.2f}</span>
                    {f'<span class="compare-price">${compare_price:.2f}</span>' if compare_price and compare_price > price else ''}
                </div>
                <div class="description">{product.get('description', '')}</div>
                <div class="stock-status">{"In Stock" if product.get("stock", 0) > 0 else "Out of Stock"}</div>
                <button class="add-to-cart-btn" data-product-id="{product.get('id', '')}">Add to Cart</button>
            </div>
        </div>
        '''
        return {"html": html, "theme": active_theme, "product": product}
    
    async with aiofiles.open(detail_file, 'r', encoding='utf-8') as f:
        template_content = await f.read()
    
    # Process includes
    async def process_includes(content):
        pattern = r"\[%load_template\s+file:'([^']+)'/?%\]"
        matches = re.findall(pattern, content)
        for include_path in matches:
            include_file = theme_path / "templates" / include_path
            if include_file.exists():
                async with aiofiles.open(include_file, 'r', encoding='utf-8') as f:
                    include_content = await f.read()
                include_content = await process_includes(include_content)
                content = re.sub(rf"\[%load_template\s+file:'{re.escape(include_path)}'/?%\]", include_content, content)
        return content
    
    full_template = await process_includes(template_content)
    rendered = await engine.render(full_template, context)
    
    return {"html": rendered, "theme": active_theme, "product": product}

# ==================== SHOPPING CART API ====================

class CartItem(BaseModel):
    product_id: str
    quantity: int = 1

class CartResponse(BaseModel):
    id: str
    items: List[dict]
    subtotal: float
    total: float
    item_count: int
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

@api_router.get("/cart/{cart_id}")
async def get_cart(cart_id: str):
    """Get cart by ID"""
    cart = await db.carts.find_one({"id": cart_id}, {"_id": 0})
    if not cart:
        # Create new cart if not exists
        cart = {
            "id": cart_id,
            "items": [],
            "subtotal": 0,
            "total": 0,
            "item_count": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.carts.insert_one(cart.copy())  # Insert a copy to avoid _id pollution
    return cart

@api_router.post("/cart/{cart_id}/add")
async def add_to_cart(cart_id: str, item: CartItem):
    """Add item to cart"""
    # Get or create cart
    cart = await db.carts.find_one({"id": cart_id}, {"_id": 0})
    if not cart:
        cart = {
            "id": cart_id,
            "items": [],
            "subtotal": 0,
            "total": 0,
            "item_count": 0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    
    # Get product details
    product = await db.products.find_one({"id": item.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check if item already in cart
    existing_item = None
    for cart_item in cart["items"]:
        if cart_item["product_id"] == item.product_id:
            existing_item = cart_item
            break
    
    if existing_item:
        existing_item["quantity"] += item.quantity
        existing_item["line_total"] = existing_item["quantity"] * existing_item["price"]
    else:
        cart["items"].append({
            "product_id": item.product_id,
            "name": product.get("name", ""),
            "sku": product.get("sku", ""),
            "price": product.get("price", 0),
            "compare_price": product.get("compare_price"),
            "image": product.get("images", [""])[0] if product.get("images") else "",
            "quantity": item.quantity,
            "line_total": item.quantity * product.get("price", 0),
            "weight": product.get("weight", 0.5),
            "shipping_length": product.get("shipping_length", 0),
            "shipping_width": product.get("shipping_width", 0),
            "shipping_height": product.get("shipping_height", 0)
        })
    
    # Recalculate totals
    cart["subtotal"] = sum(i["line_total"] for i in cart["items"])
    cart["total"] = cart["subtotal"]  # Add tax/shipping later if needed
    cart["item_count"] = sum(i["quantity"] for i in cart["items"])
    cart["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Save cart
    await db.carts.update_one(
        {"id": cart_id},
        {"$set": cart},
        upsert=True
    )
    
    return {
        "success": True,
        "message": "Item added to cart",
        "cart": cart,
        "added_item": {
            "product_id": item.product_id,
            "name": product.get("name", ""),
            "price": product.get("price", 0),
            "image": product.get("images", [""])[0] if product.get("images") else "",
            "quantity": item.quantity
        }
    }

@api_router.put("/cart/{cart_id}/update")
async def update_cart_item(cart_id: str, item: CartItem):
    """Update item quantity in cart"""
    cart = await db.carts.find_one({"id": cart_id}, {"_id": 0})
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    # Find and update item
    item_found = False
    for cart_item in cart["items"]:
        if cart_item["product_id"] == item.product_id:
            if item.quantity <= 0:
                cart["items"].remove(cart_item)
            else:
                cart_item["quantity"] = item.quantity
                cart_item["line_total"] = item.quantity * cart_item["price"]
            item_found = True
            break
    
    if not item_found:
        raise HTTPException(status_code=404, detail="Item not in cart")
    
    # Recalculate totals
    cart["subtotal"] = sum(i["line_total"] for i in cart["items"])
    cart["total"] = cart["subtotal"]
    cart["item_count"] = sum(i["quantity"] for i in cart["items"])
    cart["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.carts.update_one({"id": cart_id}, {"$set": cart})
    
    return {"success": True, "cart": cart}

@api_router.delete("/cart/{cart_id}/remove/{product_id}")
async def remove_from_cart(cart_id: str, product_id: str):
    """Remove item from cart"""
    cart = await db.carts.find_one({"id": cart_id}, {"_id": 0})
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    # Remove item
    cart["items"] = [i for i in cart["items"] if i["product_id"] != product_id]
    
    # Recalculate totals
    cart["subtotal"] = sum(i["line_total"] for i in cart["items"])
    cart["total"] = cart["subtotal"]
    cart["item_count"] = sum(i["quantity"] for i in cart["items"])
    cart["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.carts.update_one({"id": cart_id}, {"$set": cart})
    
    return {"success": True, "cart": cart}

@api_router.delete("/cart/{cart_id}/clear")
async def clear_cart(cart_id: str):
    """Clear all items from cart"""
    cart = {
        "id": cart_id,
        "items": [],
        "subtotal": 0,
        "total": 0,
        "item_count": 0,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.carts.update_one({"id": cart_id}, {"$set": cart}, upsert=True)
    
    return {"success": True, "cart": cart}


# ==================== MAROPOST TEMPLATE ENGINE V2 ====================

@api_router.get("/maropost/info")
async def get_render_v2_info():
    """Get information about the template rendering system"""
    active_theme = await get_active_theme_name()
    theme_path = THEMES_DIR / active_theme
    
    # Check which files exist
    files_status = {
        "template.html": (theme_path / "template.html").exists(),
        "checkout.template.html": (theme_path / "checkout.template.html").exists(),
        "empty.template.html": (theme_path / "empty.template.html").exists(),
        "print.template.html": (theme_path / "print.template.html").exists(),
        "headers/template.html": (theme_path / "templates" / "headers" / "template.html").exists(),
        "headers/includes/head.template.html": (theme_path / "templates" / "headers" / "includes" / "head.template.html").exists(),
        "footers/template.html": (theme_path / "templates" / "footers" / "template.html").exists(),
        "cms/home.template.html": (theme_path / "templates" / "cms" / "home.template.html").exists(),
        "products/template.html": (theme_path / "templates" / "products" / "template.html").exists(),
    }
    
    return {
        "active_theme": active_theme,
        "theme_path": str(theme_path),
        "files": files_status,
        "supported_page_types": [pt.value for pt in PageType],
        "wrapper_contexts": [wc.value for wc in WrapperContext],
        "endpoints": {
            "render_home": "/api/maropost/home",
            "render_product": "/api/maropost/product/{product_id}",
            "render_category": "/api/maropost/category/{category_id}",
            "render_checkout": "/api/maropost/checkout",
            "render_with_debug": "/api/maropost/home?debug=true",
            "render_print": "/api/maropost/product/{id}?print=true"
        }
    }


@api_router.get("/maropost/{path:path}")
async def render_page_v2(
    path: str,
    request: Request,
    print: Optional[bool] = None,
    embed: Optional[bool] = None,
    debug: Optional[bool] = None,
    q: Optional[str] = None,
    subdomain: Optional[str] = None  # Query param for Emergent preview
):
    """
    Render a page using the new Maropost-style template engine.
    
    This implements the full Maropost rendering specification:
    - Layout wrapper selection based on context
    - Page template selection based on page type
    - Head partial injection
    - Header/footer includes
    - Include directive processing
    - Data binding with [@tag@] and [%loop%] tags
    - Conditional processing [%if%]
    
    Args:
        path: URL path (e.g., 'home', 'product/123', 'category/456')
        print: Enable print wrapper
        embed: Enable minimal/empty wrapper
        debug: Enable debug headers
        subdomain: Optional subdomain for Emergent preview environment
    """
    # Detect store from host header (subdomain or custom domain)
    host = request.headers.get("host", "").split(":")[0].lower()
    custom_domain_header = request.headers.get("x-custom-domain", "").lower()
    x_subdomain_header = request.headers.get("x-subdomain", "").lower()  # Nginx can set this
    
    store = None
    store_id = None
    subdomain_requested = None
    
    # Method 0: Check subdomain query parameter (for Emergent preview environment)
    if subdomain and subdomain not in ["www", "", "api", "admin", "app"]:
        subdomain_requested = subdomain.lower()
        store = await db.platform_stores.find_one({
            "subdomain": subdomain_requested,
            "status": {"$in": ["active", "trial"]}
        }, {"_id": 0})
        if not store:
            raise HTTPException(
                status_code=404, 
                detail=f"Store '{subdomain_requested}' not found or inactive"
            )
    
    # Method 1: Check X-Subdomain header (set by Nginx for subdomain routing)
    if not store and x_subdomain_header and x_subdomain_header not in ["www", "", "api", "admin", "app"]:
        subdomain_requested = x_subdomain_header
        store = await db.platform_stores.find_one({
            "subdomain": subdomain_requested,
            "status": {"$in": ["active", "trial"]}
        }, {"_id": 0})
        if not store:
            raise HTTPException(
                status_code=404, 
                detail=f"Store '{subdomain_requested}' not found or inactive"
            )
    
    # Method 2: Check if it's a custom domain
    if not store and custom_domain_header and custom_domain_header not in ["getcelora.com", "www.getcelora.com"]:
        store = await db.platform_stores.find_one({
            "custom_domain": custom_domain_header,
            "custom_domain_verified": True
        }, {"_id": 0})
        if not store:
            raise HTTPException(status_code=404, detail="Store not found for this domain")
    
    # Method 3: Check for subdomain in Host header (getcelora.com pattern)
    if not store and host:
        # Check for getcelora.com subdomain pattern
        if "getcelora.com" in host or "getcelora" in host:
            # Extract subdomain from various patterns
            if ".getcelora.com" in host:
                subdomain_requested = host.replace(".getcelora.com", "").strip()
            elif host.endswith(".getcelora"):
                subdomain_requested = host.replace(".getcelora", "").strip()
            
            if subdomain_requested and subdomain_requested not in ["www", "", "api", "admin", "app", "store"]:
                store = await db.platform_stores.find_one({
                    "subdomain": {"$regex": f"^{subdomain_requested}$", "$options": "i"},
                    "status": {"$in": ["active", "trial"]}
                }, {"_id": 0})
                if not store:
                    raise HTTPException(
                        status_code=404, 
                        detail=f"Store '{subdomain_requested}' not found or inactive"
                    )
        
        # Check for any other subdomain pattern (e.g., store.example.com)
        elif "." in host:
            parts = host.split(".")
            if len(parts) >= 3:  # subdomain.domain.tld
                potential_subdomain = parts[0]
                if potential_subdomain not in ["www", "api", "admin", "app", "store", "mail", "ftp"]:
                    # Check if this could be a store subdomain
                    store = await db.platform_stores.find_one({
                        "subdomain": {"$regex": f"^{potential_subdomain}$", "$options": "i"},
                        "status": {"$in": ["active", "trial"]}
                    }, {"_id": 0})
                    # If subdomain looks like a store but doesn't exist, return 404
                    if not store:
                        # Check if ANY store exists with this subdomain (even inactive)
                        any_store = await db.platform_stores.find_one({"subdomain": {"$regex": f"^{potential_subdomain}$", "$options": "i"}})
                        if any_store:
                            raise HTTPException(
                                status_code=404, 
                                detail=f"Store '{potential_subdomain}' is not active"
                            )
                        # Not a store subdomain, continue without error (might be platform domain)
    
    # CRITICAL: If a subdomain was explicitly requested but no store found, return 404
    if subdomain_requested and not store:
        # Return a proper 404 page
        return HTMLResponse(
            content="""<!DOCTYPE html>
<html>
<head>
    <title>Store Not Found</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
               display: flex; justify-content: center; align-items: center; 
               min-height: 100vh; margin: 0; background: #f5f5f5; }
        .container { text-align: center; padding: 40px; }
        h1 { color: #333; font-size: 48px; margin-bottom: 10px; }
        p { color: #666; font-size: 18px; }
        a { color: #4F46E5; text-decoration: none; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <h1>404</h1>
        <p>Store not found</p>
        <p><a href="https://getcelora.com">Go to Celora</a></p>
    </div>
</body>
</html>""",
            status_code=404
        )
    
    # If store found, get store-specific settings
    if store:
        store_id = store.get("id")
    
    # Get theme - uses store-specific theme or falls back to global
    active_theme = await get_active_theme_name(store_id)
    theme_path = THEMES_DIR / active_theme
    
    if not theme_path.exists():
        # Fall back to default theme if store's theme doesn't exist
        active_theme = "toolsinabox"
        theme_path = THEMES_DIR / active_theme
        if not theme_path.exists():
            raise HTTPException(status_code=404, detail="Theme not found")
    
    # Create engine with debug mode if requested
    debug_mode = debug or False
    engine = create_engine(theme_path, db, debug=debug_mode)
    
    # Build request params for wrapper context detection
    request_params = {}
    if print:
        request_params['print'] = True
    if embed:
        request_params['embed'] = True
    if q:
        request_params['q'] = q
    
    try:
        # Render the page
        html, debug_info = await engine.render_page(
            url=path,
            request_params=request_params,
            customer=None,  # TODO: Get from session if logged in
            cart=None  # TODO: Get from session
        )
        
        # Build response headers
        headers = {
            "Content-Type": "text/html; charset=utf-8",
            "X-Theme": active_theme
        }
        
        if debug_info:
            headers.update(debug_info.to_headers())
        
        return StreamingResponse(
            io.BytesIO(html.encode('utf-8')),
            media_type='text/html',
            headers=headers
        )
    
    except FileNotFoundError as e:
        logger.error(f"Template not found: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Render error: {e}")
        raise HTTPException(status_code=500, detail=f"Render error: {str(e)}")


# ==================== INVENTORY ====================

@api_router.get("/inventory")
async def get_inventory():
    products = await db.products.find({}).to_list(1000)
    inventory = []
    for prod in products:
        status = "in_stock"
        if prod["stock"] == 0:
            status = "out_of_stock"
        elif prod["stock"] <= 10:
            status = "low_stock"
        
        inventory.append({
            "id": prod["id"],
            "sku": prod["sku"],
            "name": prod["name"],
            "stock": prod["stock"],
            "status": status,
            "last_updated": prod.get("updated_at", prod["created_at"])
        })
    
    return inventory

@api_router.put("/inventory/{product_id}")
async def update_inventory(product_id: str, stock: int):
    result = await db.products.update_one(
        {"id": product_id},
        {"$set": {"stock": stock, "updated_at": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Inventory updated successfully"}

# ==================== POS SYSTEM ====================

# POS Models
class POSCartItem(BaseModel):
    product_id: str
    name: str
    sku: str
    price: float
    quantity: int
    discount: float = 0
    discount_type: str = "fixed"  # fixed or percentage
    subtotal: float

class POSPayment(BaseModel):
    method: str  # cash, card, split
    amount: float
    reference: Optional[str] = None  # For card payments
    change_given: float = 0  # For cash payments

class POSTransactionCreate(BaseModel):
    items: List[POSCartItem]
    payments: List[POSPayment]
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    subtotal: float
    discount_total: float = 0
    tax_total: float = 0
    total: float
    notes: Optional[str] = None
    outlet_id: Optional[str] = None
    register_id: Optional[str] = None
    staff_id: Optional[str] = None
    staff_name: Optional[str] = None

class POSOutlet(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class POSRegister(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    outlet_id: str
    is_active: bool = True
    current_float: float = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class POSShift(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    register_id: str
    outlet_id: str
    staff_id: str
    staff_name: str
    opening_float: float = 0
    closing_float: Optional[float] = None
    expected_cash: float = 0
    actual_cash: Optional[float] = None
    variance: Optional[float] = None
    status: str = "open"  # open, closed
    opened_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    closed_at: Optional[datetime] = None
    notes: Optional[str] = None

class POSCashMovement(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    shift_id: str
    register_id: str
    type: str  # in, out
    amount: float
    reason: str
    staff_id: str
    staff_name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# POS Endpoints

@api_router.get("/pos/products")
async def get_pos_products(search: Optional[str] = None, barcode: Optional[str] = None):
    """Get products optimized for POS - fast search by name, SKU, or barcode"""
    query = {"is_active": True}
    
    if barcode:
        # Exact barcode match
        query["barcode"] = barcode
    elif search:
        # Search by name or SKU
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"sku": {"$regex": search, "$options": "i"}},
            {"barcode": {"$regex": search, "$options": "i"}}
        ]
    
    products = await db.products.find(query, {"_id": 0}).to_list(50)
    
    # Return simplified product data for POS
    return [{
        "id": p["id"],
        "name": p["name"],
        "sku": p["sku"],
        "barcode": p.get("barcode"),
        "price": p["price"],
        "stock": p.get("stock", 0),
        "image": p.get("images", [None])[0],
        "category_id": p.get("category_id"),
        "tax_class": p.get("tax_class", "standard")
    } for p in products]

@api_router.post("/pos/transactions")
async def create_pos_transaction(transaction: POSTransactionCreate):
    """Create a new POS transaction (sale)"""
    # Generate transaction number
    count = await db.pos_transactions.count_documents({})
    transaction_number = f"POS-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{count + 1:04d}"
    
    # Create transaction record
    trans_data = {
        "id": str(uuid.uuid4()),
        "transaction_number": transaction_number,
        "type": "sale",
        "items": [item.dict() for item in transaction.items],
        "payments": [payment.dict() for payment in transaction.payments],
        "customer_id": transaction.customer_id,
        "customer_name": transaction.customer_name,
        "customer_email": transaction.customer_email,
        "subtotal": transaction.subtotal,
        "discount_total": transaction.discount_total,
        "tax_total": transaction.tax_total,
        "total": transaction.total,
        "notes": transaction.notes,
        "outlet_id": transaction.outlet_id,
        "register_id": transaction.register_id,
        "staff_id": transaction.staff_id,
        "staff_name": transaction.staff_name,
        "status": "completed",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "synced": True
    }
    
    await db.pos_transactions.insert_one(trans_data)
    
    # Also create an order record so it shows in Orders section
    order_number = await generate_order_number()
    order_items = []
    for item in transaction.items:
        order_items.append({
            "product_id": item.product_id,
            "product_name": item.name,
            "sku": item.sku,
            "quantity": item.quantity,
            "price": item.price,
            "subtotal": item.price * item.quantity
        })
    
    # Determine payment method from payments
    payment_method = "cash"
    if transaction.payments:
        payment_method = transaction.payments[0].method
    
    order_data = {
        "id": str(uuid.uuid4()),
        "order_number": order_number,
        "customer_name": transaction.customer_name or "Walk-in Customer",
        "customer_email": transaction.customer_email or "pos@store.local",
        "customer_phone": "",
        "shipping_address": "POS Sale - In Store",
        "items": order_items,
        "subtotal": transaction.subtotal,
        "discount": transaction.discount_total,
        "shipping": 0,
        "tax": transaction.tax_total,
        "total": transaction.total,
        "status": "completed",
        "payment_status": "paid",
        "payment_method": payment_method,
        "fulfillment_status": "fulfilled",
        "notes": f"POS Transaction: {transaction_number}" + (f"\n{transaction.notes}" if transaction.notes else ""),
        "source": "pos",
        "pos_transaction_id": trans_data["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.orders.insert_one(order_data)
    
    # Update inventory - reduce stock for each item sold
    for item in transaction.items:
        await db.products.update_one(
            {"id": item.product_id},
            {"$inc": {"stock": -item.quantity, "sales_count": item.quantity}}
        )
    
    # If there's a shift open for this register, update expected cash
    if transaction.register_id:
        cash_amount = sum(p.amount for p in transaction.payments if p.method == "cash")
        if cash_amount > 0:
            await db.pos_shifts.update_one(
                {"register_id": transaction.register_id, "status": "open"},
                {"$inc": {"expected_cash": cash_amount}}
            )
    
    # Update or create customer record
    if transaction.customer_email and transaction.customer_email != "pos@store.local":
        customer = await db.customers.find_one({"email": transaction.customer_email})
        if customer:
            await db.customers.update_one(
                {"email": transaction.customer_email},
                {
                    "$inc": {"total_orders": 1, "total_spent": transaction.total},
                    "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
                }
            )
    
    return {
        "id": trans_data["id"],
        "transaction_number": transaction_number,
        "order_number": order_number,
        "message": "Transaction completed successfully"
    }

@api_router.get("/pos/transactions")
async def get_pos_transactions(
    limit: int = 50,
    offset: int = 0,
    register_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None
):
    """Get POS transaction history"""
    query = {}
    
    if register_id:
        query["register_id"] = register_id
    
    if date_from:
        query["created_at"] = {"$gte": date_from}
    
    if date_to:
        if "created_at" in query:
            query["created_at"]["$lte"] = date_to
        else:
            query["created_at"] = {"$lte": date_to}
    
    transactions = await db.pos_transactions.find(query, {"_id": 0}).sort("created_at", -1).skip(offset).limit(limit).to_list(limit)
    total = await db.pos_transactions.count_documents(query)
    
    return {
        "transactions": transactions,
        "total": total,
        "limit": limit,
        "offset": offset
    }

@api_router.get("/pos/transactions/{transaction_id}")
async def get_pos_transaction(transaction_id: str):
    """Get a single POS transaction"""
    transaction = await db.pos_transactions.find_one({"id": transaction_id}, {"_id": 0})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return transaction

@api_router.put("/pos/transactions/{transaction_id}/status")
async def update_pos_transaction_status(transaction_id: str, status: str, notes: Optional[str] = None):
    """Update POS transaction and corresponding order status"""
    # Find the transaction
    transaction = await db.pos_transactions.find_one({"id": transaction_id})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Map POS status to order status/fulfillment
    status_mapping = {
        "new": {"status": "pending", "fulfillment_status": "unfulfilled"},
        "on_hold": {"status": "on_hold", "fulfillment_status": "unfulfilled"},
        "pick": {"status": "processing", "fulfillment_status": "pick"},
        "pack": {"status": "processing", "fulfillment_status": "pack"},
        "completed": {"status": "completed", "fulfillment_status": "fulfilled"}
    }
    
    order_updates = status_mapping.get(status, {"status": status, "fulfillment_status": "unfulfilled"})
    
    # Update POS transaction
    update_data = {
        "status": status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    if notes:
        update_data["notes"] = notes
    
    await db.pos_transactions.update_one(
        {"id": transaction_id},
        {"$set": update_data}
    )
    
    # Update corresponding order if exists
    if transaction.get("order_id"):
        order_update = {
            **order_updates,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        if notes:
            order_update["notes"] = (transaction.get("notes", "") + f"\n{notes}").strip()
        
        await db.orders.update_one(
            {"id": transaction["order_id"]},
            {"$set": order_update}
        )
    else:
        # Find order by POS transaction ID
        order = await db.orders.find_one({"pos_transaction_id": transaction_id})
        if order:
            order_update = {
                **order_updates,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            if notes:
                existing_notes = order.get("notes", "")
                order_update["notes"] = (existing_notes + f"\n{notes}").strip() if existing_notes else notes
            
            await db.orders.update_one(
                {"pos_transaction_id": transaction_id},
                {"$set": order_update}
            )
    
    return {"message": "Status updated successfully", "status": status}

@api_router.post("/pos/transactions/{transaction_id}/email-receipt")
async def email_pos_receipt(transaction_id: str, email: str):
    """Send email receipt/tax invoice for a POS transaction"""
    # Find the transaction
    transaction = await db.pos_transactions.find_one({"id": transaction_id}, {"_id": 0})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Get store settings for email details
    settings = await db.store_settings.find_one({}, {"_id": 0})
    store_name = settings.get("store_name", "Store") if settings else "Store"
    store_email = settings.get("support_email", "") if settings else ""
    store_phone = settings.get("phone", "") if settings else ""
    store_address = settings.get("address", "") if settings else ""
    
    # Build email content
    items_html = ""
    for item in transaction.get("items", []):
        items_html += f"""
        <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e5e5;">{item.get('name', 'Item')}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e5e5; text-align: center;">{item.get('quantity', 1)}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e5e5; text-align: right;">${item.get('price', 0):.2f}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e5e5; text-align: right;">${(item.get('price', 0) * item.get('quantity', 1)):.2f}</td>
        </tr>
        """
    
    email_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Tax Invoice - {transaction.get('transaction_number', '')}</title>
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #333; margin: 0;">{store_name}</h1>
            <p style="color: #666; margin: 5px 0;">TAX INVOICE</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 5px 0;"><strong>Invoice #:</strong> {transaction.get('transaction_number', 'N/A')}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> {transaction.get('created_at', '')[:10]}</p>
            <p style="margin: 5px 0;"><strong>Customer:</strong> {transaction.get('customer_name', 'Walk-in Customer')}</p>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
                <tr style="background: #333; color: white;">
                    <th style="padding: 10px; text-align: left;">Item</th>
                    <th style="padding: 10px; text-align: center;">Qty</th>
                    <th style="padding: 10px; text-align: right;">Price</th>
                    <th style="padding: 10px; text-align: right;">Total</th>
                </tr>
            </thead>
            <tbody>
                {items_html}
            </tbody>
        </table>
        
        <div style="text-align: right; margin-bottom: 20px;">
            <p style="margin: 5px 0;"><strong>Subtotal:</strong> ${transaction.get('subtotal', 0):.2f}</p>
            {'<p style="margin: 5px 0; color: #dc2626;"><strong>Discount:</strong> -$' + f"{transaction.get('discount_total', 0):.2f}" + '</p>' if transaction.get('discount_total', 0) > 0 else ''}
            <p style="margin: 5px 0;"><strong>GST (10%):</strong> ${transaction.get('tax_total', 0):.2f}</p>
            <p style="margin: 10px 0; font-size: 1.2em;"><strong>Total:</strong> ${transaction.get('total', 0):.2f}</p>
            <p style="margin: 5px 0; color: #059669;"><strong>Payment:</strong> {transaction.get('payments', [{}])[0].get('method', 'cash').upper()} - PAID</p>
        </div>
        
        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e5e5; color: #666;">
            <p style="margin: 5px 0;">Thank you for your purchase!</p>
            {f'<p style="margin: 5px 0;">{store_address}</p>' if store_address else ''}
            {f'<p style="margin: 5px 0;">Phone: {store_phone}</p>' if store_phone else ''}
            {f'<p style="margin: 5px 0;">Email: {store_email}</p>' if store_email else ''}
        </div>
    </body>
    </html>
    """
    
    # Try to send email using available email service
    try:
        # Check if we have email configuration
        email_settings = await db.email_settings.find_one({}, {"_id": 0})
        
        if email_settings and email_settings.get("smtp_host"):
            import smtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart
            
            msg = MIMEMultipart('alternative')
            msg['Subject'] = f"Tax Invoice - {transaction.get('transaction_number', '')}"
            msg['From'] = email_settings.get("from_email", store_email)
            msg['To'] = email
            
            msg.attach(MIMEText(email_html, 'html'))
            
            with smtplib.SMTP(email_settings["smtp_host"], email_settings.get("smtp_port", 587)) as server:
                if email_settings.get("smtp_use_tls", True):
                    server.starttls()
                if email_settings.get("smtp_username") and email_settings.get("smtp_password"):
                    server.login(email_settings["smtp_username"], email_settings["smtp_password"])
                server.send_message(msg)
            
            return {"message": "Email sent successfully", "email": email}
        else:
            # Log email for later sending or return success for demo
            await db.email_queue.insert_one({
                "id": str(uuid.uuid4()),
                "to": email,
                "subject": f"Tax Invoice - {transaction.get('transaction_number', '')}",
                "html": email_html,
                "status": "queued",
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            return {"message": "Email queued for sending", "email": email}
            
    except Exception as e:
        # Queue the email for later
        await db.email_queue.insert_one({
            "id": str(uuid.uuid4()),
            "to": email,
            "subject": f"Tax Invoice - {transaction.get('transaction_number', '')}",
            "html": email_html,
            "status": "failed",
            "error": str(e),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

# POS Outlets
@api_router.get("/pos/outlets")
async def get_pos_outlets():
    """Get all POS outlets"""
    outlets = await db.pos_outlets.find({"is_active": True}, {"_id": 0}).to_list(100)
    return outlets

@api_router.post("/pos/outlets")
async def create_pos_outlet(outlet: POSOutlet):
    """Create a new POS outlet"""
    outlet_data = outlet.dict()
    outlet_data["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.pos_outlets.insert_one(outlet_data)
    return outlet_data

@api_router.put("/pos/outlets/{outlet_id}")
async def update_pos_outlet(outlet_id: str, outlet: POSOutlet):
    """Update a POS outlet"""
    outlet_data = outlet.dict()
    outlet_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.pos_outlets.update_one({"id": outlet_id}, {"$set": outlet_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Outlet not found")
    return {"message": "Outlet updated successfully"}

# POS Registers
@api_router.get("/pos/registers")
async def get_pos_registers(outlet_id: Optional[str] = None):
    """Get all POS registers, optionally filtered by outlet"""
    query = {"is_active": True}
    if outlet_id:
        query["outlet_id"] = outlet_id
    registers = await db.pos_registers.find(query, {"_id": 0}).to_list(100)
    return registers

@api_router.post("/pos/registers")
async def create_pos_register(register: POSRegister):
    """Create a new POS register"""
    register_data = register.dict()
    register_data["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.pos_registers.insert_one(register_data)
    return register_data

# POS Shifts
@api_router.post("/pos/shifts/open")
async def open_pos_shift(register_id: str, outlet_id: str, staff_id: str, staff_name: str, opening_float: float = 0):
    """Open a new shift for a register"""
    # Check if there's already an open shift
    existing = await db.pos_shifts.find_one({"register_id": register_id, "status": "open"})
    if existing:
        raise HTTPException(status_code=400, detail="There is already an open shift for this register")
    
    shift = POSShift(
        register_id=register_id,
        outlet_id=outlet_id,
        staff_id=staff_id,
        staff_name=staff_name,
        opening_float=opening_float,
        expected_cash=opening_float
    )
    
    shift_data = shift.dict()
    shift_data["opened_at"] = datetime.now(timezone.utc).isoformat()
    await db.pos_shifts.insert_one(shift_data)
    
    # Remove MongoDB _id before returning
    shift_data.pop("_id", None)
    return shift_data

@api_router.get("/pos/shifts/current")
async def get_current_shift(register_id: str):
    """Get the current open shift for a register"""
    shift = await db.pos_shifts.find_one({"register_id": register_id, "status": "open"}, {"_id": 0})
    return shift

@api_router.get("/pos/shifts")
async def get_pos_shifts(register_id: Optional[str] = None, outlet_id: Optional[str] = None, limit: int = 20):
    """Get shift history"""
    query = {}
    if register_id:
        query["register_id"] = register_id
    if outlet_id:
        query["outlet_id"] = outlet_id
    
    shifts = await db.pos_shifts.find(query, {"_id": 0}).sort("opened_at", -1).limit(limit).to_list(limit)
    return shifts

@api_router.post("/pos/shifts/{shift_id}/close")
async def close_pos_shift(shift_id: str, actual_cash: float, closing_float: float, notes: Optional[str] = None):
    """Close a shift and perform cash-up"""
    shift = await db.pos_shifts.find_one({"id": shift_id})
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    if shift["status"] == "closed":
        raise HTTPException(status_code=400, detail="Shift is already closed")
    
    variance = actual_cash - shift["expected_cash"]
    
    update_data = {
        "status": "closed",
        "closing_float": closing_float,
        "actual_cash": actual_cash,
        "variance": variance,
        "closed_at": datetime.now(timezone.utc).isoformat(),
        "notes": notes
    }
    
    await db.pos_shifts.update_one({"id": shift_id}, {"$set": update_data})
    
    return {
        "message": "Shift closed successfully",
        "expected_cash": shift["expected_cash"],
        "actual_cash": actual_cash,
        "variance": variance
    }

# Cash Movements (Money In/Out)
@api_router.post("/pos/cash-movements")
async def create_cash_movement(movement: POSCashMovement):
    """Record a cash movement (money in/out of register)"""
    movement_data = movement.dict()
    movement_data["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.pos_cash_movements.insert_one(movement_data)
    
    # Update shift expected cash
    adjustment = movement.amount if movement.type == "in" else -movement.amount
    await db.pos_shifts.update_one(
        {"id": movement.shift_id},
        {"$inc": {"expected_cash": adjustment}}
    )
    
    return movement_data

@api_router.get("/pos/cash-movements")
async def get_cash_movements(shift_id: Optional[str] = None, register_id: Optional[str] = None):
    """Get cash movements for a shift or register"""
    query = {}
    if shift_id:
        query["shift_id"] = shift_id
    if register_id:
        query["register_id"] = register_id
    
    movements = await db.pos_cash_movements.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return movements

# POS Reports
@api_router.get("/pos/reports/daily")
async def get_pos_daily_report(date: Optional[str] = None, outlet_id: Optional[str] = None):
    """Get daily POS sales report"""
    if not date:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    query = {
        "created_at": {"$regex": f"^{date}"}
    }
    if outlet_id:
        query["outlet_id"] = outlet_id
    
    transactions = await db.pos_transactions.find(query, {"_id": 0}).to_list(1000)
    
    # Calculate totals
    total_sales = sum(t["total"] for t in transactions)
    total_transactions = len(transactions)
    total_items = sum(sum(item["quantity"] for item in t["items"]) for t in transactions)
    
    # Payment breakdown
    payment_breakdown = {}
    for trans in transactions:
        for payment in trans.get("payments", []):
            method = payment["method"]
            if method not in payment_breakdown:
                payment_breakdown[method] = 0
            payment_breakdown[method] += payment["amount"]
    
    # Average transaction value
    avg_transaction = total_sales / total_transactions if total_transactions > 0 else 0
    
    return {
        "date": date,
        "total_sales": total_sales,
        "total_transactions": total_transactions,
        "total_items": total_items,
        "average_transaction": avg_transaction,
        "payment_breakdown": payment_breakdown,
        "transactions": transactions
    }

@api_router.get("/pos/reports/summary")
async def get_pos_summary():
    """Get POS summary statistics"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Today's transactions
    today_transactions = await db.pos_transactions.find(
        {"created_at": {"$regex": f"^{today}"}}, {"_id": 0}
    ).to_list(1000)
    
    today_sales = sum(t["total"] for t in today_transactions)
    today_count = len(today_transactions)
    
    # Total all time
    all_transactions = await db.pos_transactions.find({}, {"_id": 0}).to_list(10000)
    total_sales = sum(t["total"] for t in all_transactions)
    total_count = len(all_transactions)
    
    # Open shifts
    open_shifts = await db.pos_shifts.count_documents({"status": "open"})
    
    return {
        "today": {
            "sales": today_sales,
            "transactions": today_count
        },
        "all_time": {
            "sales": total_sales,
            "transactions": total_count
        },
        "open_shifts": open_shifts
    }

# Initialize default outlet and register
@api_router.post("/pos/init")
async def init_pos():
    """Initialize POS with default outlet and register"""
    # Check if already initialized
    outlets = await db.pos_outlets.count_documents({})
    if outlets > 0:
        return {"message": "POS already initialized", "initialized": False}
    
    # Create default outlet
    outlet = {
        "id": str(uuid.uuid4()),
        "name": "Main Store",
        "address": "",
        "phone": "",
        "email": "",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.pos_outlets.insert_one(outlet)
    
    # Create default register
    register = {
        "id": str(uuid.uuid4()),
        "name": "Register 1",
        "outlet_id": outlet["id"],
        "is_active": True,
        "current_float": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.pos_registers.insert_one(register)
    
    return {
        "message": "POS initialized successfully",
        "initialized": True,
        "outlet": outlet,
        "register": register
    }

# ==================== POS RETURNS/REFUNDS ====================

class POSReturnItem(BaseModel):
    product_id: str
    name: str
    sku: str
    price: float
    quantity: int
    reason: str = "customer_return"

class POSReturnCreate(BaseModel):
    original_transaction_id: str
    items: List[POSReturnItem]
    refund_method: str = "cash"  # cash, card, store_credit
    refund_amount: float
    reason: str
    notes: Optional[str] = None
    outlet_id: Optional[str] = None
    register_id: Optional[str] = None
    staff_id: Optional[str] = None
    staff_name: Optional[str] = None

@api_router.post("/pos/returns")
async def create_pos_return(return_data: POSReturnCreate):
    """Process a POS return/refund"""
    # Verify original transaction exists
    original = await db.pos_transactions.find_one({"id": return_data.original_transaction_id})
    if not original:
        raise HTTPException(status_code=404, detail="Original transaction not found")
    
    # Generate return number
    count = await db.pos_returns.count_documents({})
    return_number = f"RET-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{count + 1:04d}"
    
    # Create return record
    ret_data = {
        "id": str(uuid.uuid4()),
        "return_number": return_number,
        "original_transaction_id": return_data.original_transaction_id,
        "original_transaction_number": original.get("transaction_number"),
        "items": [item.dict() for item in return_data.items],
        "refund_method": return_data.refund_method,
        "refund_amount": return_data.refund_amount,
        "reason": return_data.reason,
        "notes": return_data.notes,
        "outlet_id": return_data.outlet_id,
        "register_id": return_data.register_id,
        "staff_id": return_data.staff_id,
        "staff_name": return_data.staff_name,
        "status": "completed",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.pos_returns.insert_one(ret_data)
    
    # Restore inventory for returned items
    for item in return_data.items:
        await db.products.update_one(
            {"id": item.product_id},
            {"$inc": {"stock": item.quantity}}
        )
    
    # Update shift expected cash if cash refund
    if return_data.refund_method == "cash" and return_data.register_id:
        await db.pos_shifts.update_one(
            {"register_id": return_data.register_id, "status": "open"},
            {"$inc": {"expected_cash": -return_data.refund_amount}}
        )
    
    return {
        "id": ret_data["id"],
        "return_number": return_number,
        "message": "Return processed successfully"
    }

@api_router.get("/pos/returns")
async def get_pos_returns(limit: int = 50, offset: int = 0):
    """Get POS return history"""
    returns = await db.pos_returns.find({}, {"_id": 0}).sort("created_at", -1).skip(offset).limit(limit).to_list(limit)
    total = await db.pos_returns.count_documents({})
    return {"returns": returns, "total": total}

@api_router.get("/pos/transactions/{transaction_id}/returnable")
async def get_returnable_items(transaction_id: str):
    """Get items that can still be returned from a transaction"""
    transaction = await db.pos_transactions.find_one({"id": transaction_id}, {"_id": 0})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Get existing returns for this transaction
    existing_returns = await db.pos_returns.find(
        {"original_transaction_id": transaction_id}
    ).to_list(100)
    
    # Calculate already returned quantities
    returned_qty = {}
    for ret in existing_returns:
        for item in ret.get("items", []):
            pid = item["product_id"]
            returned_qty[pid] = returned_qty.get(pid, 0) + item["quantity"]
    
    # Build returnable items list
    returnable = []
    for item in transaction.get("items", []):
        already_returned = returned_qty.get(item["product_id"], 0)
        remaining = item["quantity"] - already_returned
        if remaining > 0:
            returnable.append({
                **item,
                "max_returnable": remaining,
                "already_returned": already_returned
            })
    
    return {
        "transaction": transaction,
        "returnable_items": returnable
    }

# ==================== POS DISCOUNT SETTINGS ====================

@api_router.get("/pos/discount-settings")
async def get_pos_discount_settings():
    """Get POS discount permission settings"""
    settings = await db.pos_settings.find_one({"type": "discount_permissions"}, {"_id": 0})
    if not settings:
        # Default settings
        return {
            "type": "discount_permissions",
            "roles": {
                "admin": {"max_percentage": 100, "max_fixed": 10000, "requires_approval": False},
                "manager": {"max_percentage": 50, "max_fixed": 500, "requires_approval": False},
                "staff": {"max_percentage": 10, "max_fixed": 50, "requires_approval": True}
            }
        }
    return settings

@api_router.put("/pos/discount-settings")
async def update_pos_discount_settings(settings: dict):
    """Update POS discount permission settings"""
    settings["type"] = "discount_permissions"
    settings["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.pos_settings.update_one(
        {"type": "discount_permissions"},
        {"$set": settings},
        upsert=True
    )
    return {"message": "Discount settings updated"}

@api_router.post("/pos/discount-approval")
async def request_discount_approval(
    amount: float,
    discount_type: str,
    reason: str,
    staff_id: str,
    staff_name: str
):
    """Request approval for a discount exceeding staff limits"""
    approval = {
        "id": str(uuid.uuid4()),
        "amount": amount,
        "discount_type": discount_type,
        "reason": reason,
        "staff_id": staff_id,
        "staff_name": staff_name,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.pos_discount_approvals.insert_one(approval)
    return {"id": approval["id"], "message": "Approval request submitted"}

# ==================== POS QUICK CUSTOMER ====================

@api_router.post("/pos/customers/quick-add")
async def quick_add_customer(
    name: str, 
    email: str, 
    phone: Optional[str] = None,
    company: Optional[str] = None,
    billing_address: Optional[str] = None,
    billing_city: Optional[str] = None,
    billing_state: Optional[str] = None,
    billing_postcode: Optional[str] = None,
    delivery_address: Optional[str] = None,
    delivery_city: Optional[str] = None,
    delivery_state: Optional[str] = None,
    delivery_postcode: Optional[str] = None
):
    """Quickly add a customer from POS with full address details"""
    # Check if customer already exists
    existing = await db.customers.find_one({"email": email})
    if existing:
        return {**existing, "_id": None, "existing": True}
    
    customer = {
        "id": str(uuid.uuid4()),
        "name": name,
        "email": email,
        "phone": phone or "",
        "company": company or "",
        "address": billing_address or "",
        "city": billing_city or "",
        "state": billing_state or "",
        "postcode": billing_postcode or "",
        "country": "AU",
        "delivery_address": delivery_address or billing_address or "",
        "delivery_city": delivery_city or billing_city or "",
        "delivery_state": delivery_state or billing_state or "",
        "delivery_postcode": delivery_postcode or billing_postcode or "",
        "notes": "Added via POS",
        "total_orders": 0,
        "total_spent": 0,
        "tags": ["pos-customer"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.customers.insert_one(customer)
    return {**customer, "_id": None, "existing": False}

# ==================== SEED DATA ====================

@api_router.post("/seed")
async def seed_database():
    """Seed the database with initial data"""
    
    # Check if data already exists
    existing_products = await db.products.count_documents({})
    if existing_products > 0:
        return {"message": "Database already has data. Skipping seed."}
    
    # Create default store settings
    default_settings = StoreSettings()
    await db.store_settings.update_one(
        {"id": "store_settings"},
        {"$set": default_settings.dict()},
        upsert=True
    )
    
    # Create categories
    categories_data = [
        {"name": "Electronics", "description": "Gadgets and devices", "image": "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400", "sort_order": 1},
        {"name": "Clothing", "description": "Fashion and apparel", "image": "https://images.unsplash.com/photo-1445205170230-053b83016050?w=400", "sort_order": 2},
        {"name": "Home & Office", "description": "Home and office essentials", "image": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400", "sort_order": 3},
        {"name": "Sports", "description": "Sports equipment and gear", "image": "https://images.unsplash.com/photo-1461896836934-bc1c94de815c?w=400", "sort_order": 4},
        {"name": "Accessories", "description": "Bags, watches and more", "image": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400", "sort_order": 5},
        {"name": "Beauty", "description": "Beauty and personal care", "image": "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400", "sort_order": 6},
    ]
    
    created_categories = []
    for cat_data in categories_data:
        category = Category(**cat_data)
        await db.categories.insert_one(category.dict())
        created_categories.append(category)
    
    # Create products
    products_data = [
        {"name": "Wireless Bluetooth Headphones", "description": "Premium noise-cancelling wireless headphones with 30-hour battery life.", "price": 149.99, "compare_price": 199.99, "sku": "WBH-001", "category_id": created_categories[0].id, "images": ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500"], "stock": 156, "rating": 4.8, "reviews_count": 234, "sales_count": 1456},
        {"name": "Smart Watch Pro", "description": "Advanced smartwatch with health monitoring and GPS.", "price": 299.99, "compare_price": 349.99, "sku": "SWP-002", "category_id": created_categories[0].id, "images": ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500"], "stock": 89, "rating": 4.6, "reviews_count": 189, "sales_count": 892},
        {"name": "Leather Laptop Bag", "description": "Handcrafted genuine leather laptop bag.", "price": 89.99, "compare_price": 129.99, "sku": "LLB-003", "category_id": created_categories[4].id, "images": ["https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500"], "stock": 234, "rating": 4.9, "reviews_count": 456, "sales_count": 2341},
        {"name": "Minimalist Desk Lamp", "description": "Modern LED desk lamp with adjustable brightness.", "price": 59.99, "compare_price": None, "sku": "MDL-004", "category_id": created_categories[2].id, "images": ["https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=500"], "stock": 67, "rating": 4.5, "reviews_count": 123, "sales_count": 567},
        {"name": "Premium Cotton T-Shirt", "description": "100% organic cotton t-shirt with modern fit.", "price": 34.99, "compare_price": 44.99, "sku": "PCT-005", "category_id": created_categories[1].id, "images": ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500"], "stock": 445, "rating": 4.7, "reviews_count": 678, "sales_count": 3456},
        {"name": "Portable Power Bank", "description": "20000mAh portable charger with fast charging.", "price": 49.99, "compare_price": 69.99, "sku": "PPB-006", "category_id": created_categories[0].id, "images": ["https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=500"], "stock": 12, "rating": 4.4, "reviews_count": 234, "sales_count": 1234},
        {"name": "Ceramic Coffee Mug Set", "description": "Set of 4 handcrafted ceramic mugs.", "price": 39.99, "compare_price": None, "sku": "CCM-007", "category_id": created_categories[2].id, "images": ["https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=500"], "stock": 0, "rating": 4.8, "reviews_count": 89, "sales_count": 456},
        {"name": "Running Shoes Ultra", "description": "Lightweight running shoes with responsive cushioning.", "price": 129.99, "compare_price": 159.99, "sku": "RSU-008", "category_id": created_categories[3].id, "images": ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500"], "stock": 178, "rating": 4.6, "reviews_count": 345, "sales_count": 1678},
    ]
    
    for prod_data in products_data:
        product = Product(**prod_data)
        await db.products.insert_one(product.dict())
        
        # Update category product count
        if prod_data["category_id"]:
            await db.categories.update_one(
                {"id": prod_data["category_id"]},
                {"$inc": {"product_count": 1}}
            )
    
    # Create hero banners
    banners_data = [
        {"title": "New Collection 2025", "subtitle": "Discover the latest trends", "image": "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1920", "link": "/store/products", "sort_order": 1},
        {"title": "Summer Sale", "subtitle": "Up to 50% off", "image": "https://images.unsplash.com/photo-1607082349566-187342175e2f?w=1920", "link": "/store/sale", "sort_order": 2},
        {"title": "Free Shipping", "subtitle": "On orders over $50", "image": "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1920", "link": "/store/products", "sort_order": 3},
    ]
    
    for banner_data in banners_data:
        banner = HeroBanner(**banner_data)
        await db.banners.insert_one(banner.dict())
    
    # Create default templates
    default_templates = [
        {
            "name": "header",
            "display_name": "Header",
            "template_type": "partial",
            "content": """<header class="site-header">
  <div class="logo">
    <img src="[@store_logo@]" alt="[@store_name@]" />
  </div>
  <nav class="main-nav">
    <a href="/store">Home</a>
    <a href="/store/products">Products</a>
  </nav>
  <div class="cart-icon">
    <span class="cart-count">[@mini_cart_count@]</span>
  </div>
</header>"""
        },
        {
            "name": "footer",
            "display_name": "Footer",
            "template_type": "partial",
            "content": """<footer class="site-footer">
  <div class="footer-info">
    <p>© [@current_year@] [@store_name@]. All rights reserved.</p>
    <p>Contact: [@store_email@] | [@store_phone@]</p>
  </div>
  <div class="social-links">
    [%if [@store_facebook@]%]
    <a href="[@store_facebook@]">Facebook</a>
    [%/if%]
    [%if [@store_instagram@]%]
    <a href="[@store_instagram@]">Instagram</a>
    [%/if%]
  </div>
</footer>"""
        },
        {
            "name": "product-card",
            "display_name": "Product Card",
            "template_type": "partial",
            "content": """<div class="product-card">
  <a href="[@url@]">
    <img src="[@image@]" alt="[@name@]" />
    <h3>[@name@]</h3>
    <div class="price">
      [%if [@on_sale@] eq 'y'%]
      <span class="sale-price">[@price_formatted@]</span>
      <span class="original-price">[@rrp_formatted@]</span>
      <span class="discount">Save [@save_percent@]%</span>
      [%else%]
      <span class="regular-price">[@price_formatted@]</span>
      [%/if%]
    </div>
    <span class="stock-status">[@stock_status@]</span>
  </a>
</div>"""
        },
        {
            "name": "homepage",
            "display_name": "Homepage",
            "template_type": "page",
            "content": """<div class="homepage">
  [%content_zone id:'hero_banner'%]
  
  <section class="new-arrivals">
    <h2>New Arrivals</h2>
    <div class="product-grid">
      [%new_arrivals limit:'4'%]
        [%param *body%]
        <div class="product-item">
          <img src="[@image@]" alt="[@name@]" />
          <h3>[@name@]</h3>
          <p>[@price_formatted@]</p>
        </div>
        [%/param%]
      [%/new_arrivals%]
    </div>
  </section>
  
  <section class="top-sellers">
    <h2>Best Sellers</h2>
    <div class="product-grid">
      [%top_sellers limit:'4'%]
        [%param *body%]
        <div class="product-item">
          <img src="[@image@]" alt="[@name@]" />
          <h3>[@name@]</h3>
          <p>[@price_formatted@]</p>
        </div>
        [%/param%]
      [%/top_sellers%]
    </div>
  </section>
</div>"""
        },
    ]
    
    for tmpl_data in default_templates:
        template = ThemeTemplate(**tmpl_data)
        await db.templates.insert_one(template.dict())
    
    return {"message": "Database seeded successfully", "categories": len(categories_data), "products": len(products_data), "banners": len(banners_data), "templates": len(default_templates)}

# ==================== ADMIN PLATFORM STATS ====================

@api_router.get("/admin/stats")
async def get_admin_platform_stats(admin: dict = Depends(get_admin_user)):
    """Get platform-wide statistics for admin dashboard"""
    
    # Total websites/merchants
    total_websites = await db.websites.count_documents({})
    active_websites = await db.websites.count_documents({"status": "active"})
    
    # Aggregate revenue and orders from all websites
    pipeline = [
        {"$group": {
            "_id": None,
            "total_revenue": {"$sum": "$revenue"},
            "total_orders": {"$sum": "$orders"},
            "total_products": {"$sum": "$products"},
            "total_customers": {"$sum": "$customers"}
        }}
    ]
    website_stats = await db.websites.aggregate(pipeline).to_list(1)
    
    total_revenue = website_stats[0]["total_revenue"] if website_stats else 0
    total_orders = website_stats[0]["total_orders"] if website_stats else 0
    total_products = website_stats[0]["total_products"] if website_stats else 0
    total_customers = website_stats[0]["total_customers"] if website_stats else 0
    
    # Total users
    total_users = await db.users.count_documents({})
    
    # Monthly revenue data (simulated based on websites)
    monthly_revenue = []
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    current_month = datetime.now(timezone.utc).month
    
    for i, month in enumerate(months[:current_month]):
        # Create realistic trending data
        base = total_revenue / current_month if current_month > 0 else 0
        variance = (i + 1) / current_month if current_month > 0 else 1
        monthly_revenue.append({
            "month": month,
            "revenue": round(base * variance * (0.8 + (i * 0.05)), 2)
        })
    
    return {
        "total_merchants": total_websites,
        "active_merchants": active_websites,
        "total_revenue": round(total_revenue, 2),
        "total_orders": total_orders,
        "total_products": total_products,
        "total_customers": total_customers,
        "total_users": total_users,
        "monthly_revenue": monthly_revenue
    }

# ==================== ADMIN WEBSITES/MERCHANTS CRUD ====================

@api_router.get("/admin/websites", response_model=List[Website])
async def get_admin_websites(
    status: Optional[str] = None,
    plan: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(default=50, le=100),
    skip: int = 0,
    admin: dict = Depends(get_admin_user)
):
    """Get all websites/merchants"""
    query = {}
    if status:
        query["status"] = status
    if plan:
        query["plan"] = plan
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"url": {"$regex": search, "$options": "i"}}
        ]
    
    websites = await db.websites.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return [Website(**w) for w in websites]

# ==================== ADMIN AUTHENTICATION ====================

@api_router.post("/admin/auth/login")
async def admin_login(email: str, password: str):
    """Admin login endpoint"""
    import hashlib
    
    admin = await db.admins.find_one({"email": email.lower()})
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check password (SHA256)
    hashed_password = hashlib.sha256(password.encode()).hexdigest()
    if admin.get("hashed_password") != hashed_password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create token with admin role
    token = create_access_token(data={
        "sub": admin["id"], 
        "role": "admin", 
        "email": admin["email"],
        "is_admin": True
    })
    
    return {
        "token": token,
        "admin": {
            "id": admin["id"],
            "email": admin["email"],
            "name": admin.get("name", "Admin"),
            "role": admin.get("role", "admin")
        }
    }

@api_router.get("/admin/platform-stores")
async def get_admin_platform_stores(
    status: Optional[str] = None,
    plan_id: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(default=50, le=100),
    skip: int = 0,
    admin: dict = Depends(get_admin_user)
):
    """Get all platform stores (multi-tenant stores)"""
    query = {}
    if status:
        query["status"] = status
    if plan_id:
        query["plan_id"] = plan_id
    if search:
        query["$or"] = [
            {"store_name": {"$regex": search, "$options": "i"}},
            {"subdomain": {"$regex": search, "$options": "i"}}
        ]
    
    stores = await db.platform_stores.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Enrich with owner info and stats
    enriched_stores = []
    for store in stores:
        owner = await db.platform_owners.find_one({"id": store.get("owner_id")}, {"_id": 0})
        store_id = store.get("id")
        
        # Get product count
        product_count = await db.products.count_documents({"store_id": store_id})
        order_count = await db.orders.count_documents({"store_id": store_id})
        customer_count = await db.customers.count_documents({"store_id": store_id})
        
        enriched_stores.append({
            **store,
            "owner_name": owner.get("name") if owner else "Unknown",
            "owner_email": owner.get("email") if owner else "Unknown",
            "product_count": product_count,
            "order_count": order_count,
            "customer_count": customer_count
        })
    
    return enriched_stores

@api_router.get("/admin/platform-stats")
async def get_admin_platform_stats(admin: dict = Depends(get_admin_user)):
    """Get platform-wide statistics"""
    total_stores = await db.platform_stores.count_documents({})
    active_stores = await db.platform_stores.count_documents({"status": "active"})
    trial_stores = await db.platform_stores.count_documents({"status": "trial"})
    
    # Count by plan
    free_stores = await db.platform_stores.count_documents({"plan_id": "free"})
    starter_stores = await db.platform_stores.count_documents({"plan_id": "starter"})
    professional_stores = await db.platform_stores.count_documents({"plan_id": "professional"})
    enterprise_stores = await db.platform_stores.count_documents({"plan_id": "enterprise"})
    
    # Total products, orders across all stores
    total_products = await db.products.count_documents({})
    total_orders = await db.orders.count_documents({})
    total_customers = await db.customers.count_documents({})
    
    # Calculate total revenue
    pipeline = [
        {"$match": {"payment_status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ]
    revenue_result = await db.orders.aggregate(pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    # Monthly recurring revenue estimate
    mrr = (starter_stores * 29) + (professional_stores * 79) + (enterprise_stores * 299)
    
    return {
        "total_stores": total_stores,
        "active_stores": active_stores,
        "trial_stores": trial_stores,
        "stores_by_plan": {
            "free": free_stores,
            "starter": starter_stores,
            "professional": professional_stores,
            "enterprise": enterprise_stores
        },
        "total_products": total_products,
        "total_orders": total_orders,
        "total_customers": total_customers,
        "total_revenue": total_revenue,
        "mrr": mrr
    }

@api_router.get("/admin/websites/{website_id}", response_model=Website)
async def get_admin_website(website_id: str, admin: dict = Depends(get_admin_user)):
    """Get a specific website by ID"""
    website = await db.websites.find_one({"id": website_id}, {"_id": 0})
    if not website:
        raise HTTPException(status_code=404, detail="Website not found")
    return Website(**website)

@api_router.post("/admin/websites", response_model=Website)
async def create_admin_website(website: WebsiteCreate, admin: dict = Depends(get_admin_user)):
    """Create a new website/merchant"""
    # Check if website with email exists
    existing = await db.websites.find_one({"email": website.email})
    if existing:
        raise HTTPException(status_code=400, detail="Website with this email already exists")
    
    new_website = Website(**website.dict())
    await db.websites.insert_one(new_website.dict())
    return new_website

@api_router.put("/admin/websites/{website_id}", response_model=Website)
async def update_admin_website(website_id: str, website: WebsiteUpdate, admin: dict = Depends(get_admin_user)):
    """Update a website/merchant"""
    update_data = {k: v for k, v in website.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    result = await db.websites.update_one(
        {"id": website_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Website not found")
    
    updated = await db.websites.find_one({"id": website_id}, {"_id": 0})
    return Website(**updated)

@api_router.delete("/admin/websites/{website_id}")
async def delete_admin_website(website_id: str, admin: dict = Depends(get_admin_user)):
    """Delete a website/merchant"""
    result = await db.websites.delete_one({"id": website_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Website not found")
    return {"message": "Website deleted successfully"}

# ==================== ADMIN USERS CRUD ====================

@api_router.get("/admin/users")
async def get_admin_users(
    role: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(default=50, le=100),
    skip: int = 0,
    admin: dict = Depends(get_admin_user)
):
    """Get all users"""
    query = {}
    if role:
        query["role"] = role
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    
    users = await db.users.find(query, {"_id": 0, "hashed_password": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return users

@api_router.get("/admin/users/{user_id}")
async def get_admin_user_by_id(user_id: str, admin: dict = Depends(get_admin_user)):
    """Get a specific user by ID"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "hashed_password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@api_router.post("/admin/users")
async def create_admin_user(user_data: UserCreate, admin: dict = Depends(get_admin_user)):
    """Create a new user (admin creates merchant accounts)"""
    # Check if user already exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    new_user = User(
        email=user_data.email,
        name=user_data.name,
        role=user_data.role,
        hashed_password=get_password_hash(user_data.password)
    )
    
    await db.users.insert_one(new_user.dict())
    
    # Return user without password
    return {
        "id": new_user.id,
        "email": new_user.email,
        "name": new_user.name,
        "role": new_user.role,
        "is_active": new_user.is_active,
        "created_at": new_user.created_at.isoformat(),
        "updated_at": new_user.updated_at.isoformat()
    }

@api_router.put("/admin/users/{user_id}")
async def update_admin_user(user_id: str, user: UserUpdate, admin: dict = Depends(get_admin_user)):
    """Update a user"""
    update_data = {k: v for k, v in user.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    updated = await db.users.find_one({"id": user_id}, {"_id": 0, "hashed_password": 0})
    return updated

@api_router.delete("/admin/users/{user_id}")
async def delete_admin_user(user_id: str, admin: dict = Depends(get_admin_user)):
    """Delete a user"""
    # Prevent deleting self
    if user_id == admin.get("id"):
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted successfully"}


# ==================== ADMIN PASSWORD RESET ====================

@api_router.post("/admin/users/{user_id}/reset-password")
async def admin_reset_user_password(user_id: str, password_data: dict, admin: dict = Depends(get_admin_user)):
    """Admin can reset any user's password"""
    new_password = password_data.get("new_password")
    if not new_password or len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    hashed = get_password_hash(new_password)
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"hashed_password": hashed, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": f"Password reset successfully for {user.get('email')}"}


# ==================== ADMIN IMPERSONATE / LOGIN AS ====================

@api_router.post("/admin/users/{user_id}/impersonate")
async def admin_impersonate_user(user_id: str, admin: dict = Depends(get_admin_user)):
    """Admin can generate a login token to access any user's account"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Generate token for the target user
    access_token = create_access_token(data={"sub": user["id"], "impersonated_by": admin["id"]})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "store_id": user.get("store_id")
        },
        "impersonated_by": admin["email"],
        "message": f"You are now logged in as {user.get('email')}"
    }


@api_router.post("/admin/stores/{store_id}/impersonate")
async def admin_impersonate_store_owner(store_id: str, admin: dict = Depends(get_admin_user)):
    """Admin can login as a store owner to access their merchant dashboard"""
    # Find the store
    store = await db.platform_stores.find_one({"id": store_id})
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    # Find the store owner
    owner = await db.platform_owners.find_one({"id": store.get("owner_id")})
    if not owner:
        # Try to find user by store_id
        user = await db.users.find_one({"store_id": store_id})
        if user:
            access_token = create_access_token(data={"sub": user["id"], "impersonated_by": admin["id"]})
            return {
                "access_token": access_token,
                "token_type": "bearer",
                "user": {
                    "id": user["id"],
                    "email": user["email"],
                    "name": user["name"],
                    "role": user.get("role", "merchant"),
                    "store_id": store_id
                },
                "store": {
                    "id": store["id"],
                    "store_name": store.get("store_name"),
                    "subdomain": store.get("subdomain")
                },
                "impersonated_by": admin["email"]
            }
        raise HTTPException(status_code=404, detail="Store owner not found")
    
    # Find or create a user record for this owner
    user = await db.users.find_one({"email": owner["email"]})
    if not user:
        # Create a temporary user record for impersonation
        user = {
            "id": owner["id"],
            "email": owner["email"],
            "name": owner["name"],
            "role": "merchant",
            "store_id": store_id
        }
    
    access_token = create_access_token(data={"sub": owner["id"], "impersonated_by": admin["id"], "store_id": store_id})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": owner["id"],
            "email": owner["email"],
            "name": owner["name"],
            "role": "merchant",
            "store_id": store_id
        },
        "store": {
            "id": store["id"],
            "store_name": store.get("store_name"),
            "subdomain": store.get("subdomain")
        },
        "impersonated_by": admin["email"]
    }


# ==================== SUBDOMAIN CPANEL ENDPOINTS ====================

@api_router.get("/cpanel/store-info/{subdomain}")
async def get_cpanel_store_info(subdomain: str):
    """Get store info for CPanel login page branding"""
    store = await db.platform_stores.find_one(
        {"subdomain": subdomain.lower()},
        {"_id": 0, "id": 1, "store_name": 1, "subdomain": 1, "logo": 1, "status": 1}
    )
    
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    if store.get("status") == "suspended":
        raise HTTPException(status_code=403, detail="This store has been suspended")
    
    return store


@api_router.post("/cpanel/login")
async def cpanel_login(login_data: dict):
    """Login to merchant CPanel with subdomain context"""
    email = login_data.get("email", "").lower()
    password = login_data.get("password", "")
    subdomain = login_data.get("subdomain", "").lower()
    
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password required")
    
    # Find the store by subdomain
    store = None
    if subdomain:
        store = await db.platform_stores.find_one({"subdomain": subdomain})
        if not store:
            raise HTTPException(status_code=404, detail="Store not found")
        if store.get("status") == "suspended":
            raise HTTPException(status_code=403, detail="This store has been suspended")
    
    # Try to find user in users collection first
    user = await db.users.find_one({"email": email})
    
    if user:
        if not verify_password(password, user.get("hashed_password", "")):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # If store context provided, verify user belongs to this store
        if store and user.get("store_id") and user.get("store_id") != store["id"]:
            raise HTTPException(status_code=403, detail="You don't have access to this store")
        
        access_token = create_access_token(data={"sub": user["id"], "store_id": store["id"] if store else user.get("store_id")})
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user["id"],
                "email": user["email"],
                "name": user.get("name", ""),
                "role": user.get("role", "merchant"),
                "store_id": store["id"] if store else user.get("store_id")
            }
        }
    
    # Try platform_owners collection
    owner = await db.platform_owners.find_one({"email": email})
    
    if owner:
        # Verify password - platform_owners might use different hashing
        import hashlib
        sha256_hash = hashlib.sha256(password.encode()).hexdigest()
        
        if owner.get("hashed_password") != sha256_hash:
            # Try bcrypt verification
            if not verify_password(password, owner.get("hashed_password", "")):
                raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Check if owner has access to this store
        if store and store["id"] not in owner.get("stores", []):
            raise HTTPException(status_code=403, detail="You don't have access to this store")
        
        target_store_id = store["id"] if store else (owner.get("stores", [None])[0])
        
        access_token = create_access_token(data={"sub": owner["id"], "store_id": target_store_id})
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": owner["id"],
                "email": owner["email"],
                "name": owner.get("name", ""),
                "role": "merchant",
                "store_id": target_store_id
            }
        }
    
    raise HTTPException(status_code=401, detail="Invalid email or password")


# ==================== ADMIN STORE MANAGEMENT ====================

@api_router.get("/admin/stores/{store_id}/details")
async def get_admin_store_details(store_id: str, admin: dict = Depends(get_admin_user)):
    """Get comprehensive store details for admin"""
    store = await db.platform_stores.find_one({"id": store_id}, {"_id": 0})
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    # Get owner info
    owner = await db.platform_owners.find_one({"id": store.get("owner_id")}, {"_id": 0, "hashed_password": 0})
    
    # Get store statistics
    products_count = await db.products.count_documents({"store_id": store_id})
    orders_count = await db.orders.count_documents({"store_id": store_id})
    customers_count = await db.customers.count_documents({"store_id": store_id})
    
    # Get recent orders
    recent_orders = await db.orders.find(
        {"store_id": store_id},
        {"_id": 0, "id": 1, "order_number": 1, "total": 1, "status": 1, "created_at": 1}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    # Get total revenue
    pipeline = [
        {"$match": {"store_id": store_id, "payment_status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ]
    revenue_result = await db.orders.aggregate(pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    return {
        "store": store,
        "owner": owner,
        "stats": {
            "products_count": products_count,
            "orders_count": orders_count,
            "customers_count": customers_count,
            "total_revenue": total_revenue
        },
        "recent_orders": recent_orders
    }


@api_router.put("/admin/stores/{store_id}")
async def update_admin_store(store_id: str, updates: dict, admin: dict = Depends(get_admin_user)):
    """Admin can update any store"""
    store = await db.platform_stores.find_one({"id": store_id})
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    allowed_fields = ["store_name", "status", "plan_id", "custom_domain", "custom_domain_verified"]
    update_data = {k: v for k, v in updates.items() if k in allowed_fields}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.platform_stores.update_one({"id": store_id}, {"$set": update_data})
    
    updated_store = await db.platform_stores.find_one({"id": store_id}, {"_id": 0})
    return updated_store


@api_router.post("/admin/stores/{store_id}/reset-owner-password")
async def admin_reset_store_owner_password(store_id: str, password_data: dict, admin: dict = Depends(get_admin_user)):
    """Admin can reset a store owner's password"""
    new_password = password_data.get("new_password")
    if not new_password or len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    store = await db.platform_stores.find_one({"id": store_id})
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    owner_id = store.get("owner_id")
    if not owner_id:
        raise HTTPException(status_code=404, detail="Store owner not found")
    
    # Update password in platform_owners (using sha256 for consistency with existing data)
    import hashlib
    sha256_hash = hashlib.sha256(new_password.encode()).hexdigest()
    
    result = await db.platform_owners.update_one(
        {"id": owner_id},
        {"$set": {"hashed_password": sha256_hash, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Also try to update in users collection if exists
    owner = await db.platform_owners.find_one({"id": owner_id})
    if owner:
        bcrypt_hash = get_password_hash(new_password)
        await db.users.update_one(
            {"email": owner["email"]},
            {"$set": {"hashed_password": bcrypt_hash, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    return {"message": f"Password reset successfully for store owner"}


# Include the router in the main app
app.include_router(api_router)

# Include modular route routers under /api prefix
app.include_router(auth_router, prefix="/api")
app.include_router(shipping_router, prefix="/api")

# Initialize and include addons router
addons_module.set_database(db)
app.include_router(addons_module.router, prefix="/api")

# Initialize and include eBay router
ebay_module.set_database(db)
app.include_router(ebay_module.router, prefix="/api")

# Initialize and include Import/Export router
import_export_module.set_db(db)
app.include_router(import_export_module.router)

# Include Marketing router (coupons, loyalty, gift cards, flash sales, bundles, email campaigns)
app.include_router(marketing_module.router)

# Include Analytics router (dashboard, sales, customer analytics, inventory reports, exports)
app.include_router(analytics_module.router)

# Include Operations router (suppliers, purchase orders, warehouses, stock alerts)
app.include_router(operations_module.router)

# Include Customer Management router (groups, wishlists, notes, tags)
app.include_router(customer_management_module.router)

# Include Blog router (posts, categories, comments)
app.include_router(blog_module.router)

# Include Abandoned Carts router (cart recovery, automation)
app.include_router(abandoned_carts_module.router)

# Include Custom Fields router (dynamic fields for products, categories, pages, etc.)
custom_fields_module.set_db(db)
app.include_router(custom_fields_module.router)

# Include Template Tags router (system and custom template tags)
template_tags_module.set_db(db)
app.include_router(template_tags_module.router)

# Include Platform router (multi-tenant store management)
platform_module.set_db(db)
app.include_router(platform_module.router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Serve static files for backup download
import os
static_path = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_path):
    app.mount("/static", StaticFiles(directory=static_path), name="static")

@app.get("/download/backup")
async def download_backup():
    import os
    backup_path = "/app/backend/celora_backup.tar.gz"
    if os.path.exists(backup_path):
        with open(backup_path, "rb") as f:
            content = f.read()
        return Response(content=content, media_type="application/gzip", headers={"Content-Disposition": "attachment; filename=celora_backup.tar.gz"})
    return {"error": "Backup not found"}
