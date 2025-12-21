from fastapi import FastAPI, APIRouter, HTTPException, Query, UploadFile, File, Form, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
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
from jose import JWTError, jwt
from passlib.context import CryptContext

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create uploads directory
UPLOADS_DIR = ROOT_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)
(UPLOADS_DIR / "logos").mkdir(exist_ok=True)
(UPLOADS_DIR / "banners").mkdir(exist_ok=True)
(UPLOADS_DIR / "products").mkdir(exist_ok=True)

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
    name: str
    description: Optional[str] = None
    price: float
    compare_price: Optional[float] = None
    sku: str
    category_id: Optional[str] = None
    images: List[str] = []
    stock: int = 0
    is_active: bool = True
    rating: float = 0
    reviews_count: int = 0

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    compare_price: Optional[float] = None
    category_id: Optional[str] = None
    images: Optional[List[str]] = None
    stock: Optional[int] = None
    is_active: Optional[bool] = None

class Product(ProductBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sales_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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
    # Internal identification name (required)
    name: str
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
    except JWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"id": user_id})
    if user is None:
        raise credentials_exception
    
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"]
    }

async def get_current_active_user(current_user: dict = Depends(get_current_user)) -> dict:
    return current_user

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

class ContentZone(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    zone_id: str  # e.g., "homepage_banner", "footer_links"
    name: str
    content: str  # HTML content
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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

# ==================== CATEGORY ENDPOINTS ====================

@api_router.get("/")
async def root():
    return {"message": "Maropost Clone API - Operational"}

@api_router.post("/categories", response_model=Category)
async def create_category(category: CategoryCreate):
    new_category = Category(**category.dict())
    await db.categories.insert_one(new_category.dict())
    return new_category

@api_router.get("/categories", response_model=List[Category])
async def get_categories(is_active: Optional[bool] = None):
    query = {}
    if is_active is not None:
        query["is_active"] = is_active
    categories = await db.categories.find(query).sort("sort_order", 1).to_list(100)
    return [Category(**cat) for cat in categories]

@api_router.get("/categories/{category_id}", response_model=Category)
async def get_category(category_id: str):
    category = await db.categories.find_one({"id": category_id})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return Category(**category)

@api_router.put("/categories/{category_id}", response_model=Category)
async def update_category(category_id: str, category: CategoryCreate):
    update_data = category.dict()
    update_data["updated_at"] = datetime.now(timezone.utc)
    result = await db.categories.update_one(
        {"id": category_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    updated = await db.categories.find_one({"id": category_id})
    return Category(**updated)

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str):
    result = await db.categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted successfully"}

# ==================== PRODUCT ENDPOINTS ====================

@api_router.post("/products", response_model=Product)
async def create_product(product: ProductCreate):
    new_product = Product(**product.dict())
    await db.products.insert_one(new_product.dict())
    
    # Update category product count
    if product.category_id:
        await db.categories.update_one(
            {"id": product.category_id},
            {"$inc": {"product_count": 1}}
        )
    
    return new_product

@api_router.get("/products", response_model=List[Product])
async def get_products(
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
    query = {}
    if category_id:
        query["category_id"] = category_id
    if is_active is not None:
        query["is_active"] = is_active
    if in_stock:
        query["stock"] = {"$gt": 0}
    if on_sale:
        query["compare_price"] = {"$exists": True, "$ne": None}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"sku": {"$regex": search, "$options": "i"}}
        ]
    
    sort_direction = -1 if sort_order == "desc" else 1
    products = await db.products.find(query).sort(sort_by, sort_direction).skip(skip).limit(limit).to_list(limit)
    return [Product(**prod) for prod in products]

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
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return Product(**product)

@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, product: ProductUpdate):
    update_data = {k: v for k, v in product.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    result = await db.products.update_one(
        {"id": product_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    updated = await db.products.find_one({"id": product_id})
    return Product(**updated)

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str):
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Update category product count
    if product.get("category_id"):
        await db.categories.update_one(
            {"id": product["category_id"]},
            {"$inc": {"product_count": -1}}
        )
    
    await db.products.delete_one({"id": product_id})
    return {"message": "Product deleted successfully"}

# ==================== ORDER ENDPOINTS ====================

@api_router.post("/orders", response_model=Order)
async def create_order(order: OrderCreate):
    new_order = Order(**order.dict())
    new_order.payment_status = "paid"  # For demo purposes
    await db.orders.insert_one(new_order.dict())
    
    # Update product sales count
    for item in order.items:
        await db.products.update_one(
            {"id": item.product_id},
            {"$inc": {"sales_count": item.quantity, "stock": -item.quantity}}
        )
    
    # Update or create customer
    customer = await db.customers.find_one({"email": order.customer_email})
    if customer:
        await db.customers.update_one(
            {"email": order.customer_email},
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
        await db.customers.insert_one(new_customer.dict())
    
    return new_order

@api_router.get("/orders", response_model=List[Order])
async def get_orders(
    status: Optional[str] = None,
    limit: int = Query(default=50, le=100),
    skip: int = 0
):
    query = {}
    if status:
        query["status"] = status
    orders = await db.orders.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return [Order(**order) for order in orders]

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str):
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return Order(**order)

@api_router.patch("/orders/{order_id}/status")
async def update_order_status(order_id: str, status: str):
    valid_statuses = ["pending", "processing", "shipped", "delivered", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    result = await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {"message": f"Order status updated to {status}"}

# ==================== CUSTOMER ENDPOINTS ====================

@api_router.post("/customers", response_model=Customer)
async def create_customer(customer: CustomerCreate):
    # Check if customer with email exists
    existing = await db.customers.find_one({"email": customer.email})
    if existing:
        raise HTTPException(status_code=400, detail="Customer with this email already exists")
    
    new_customer = Customer(**customer.dict(exclude={'password'}))
    await db.customers.insert_one(new_customer.dict())
    return new_customer

@api_router.get("/customers", response_model=List[Customer])
async def get_customers(
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(default=50, le=100),
    skip: int = 0
):
    query = {}
    if status:
        query["status"] = status
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}}
        ]
    
    customers = await db.customers.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return [Customer(**cust) for cust in customers]

@api_router.get("/customers/{customer_id}", response_model=Customer)
async def get_customer(customer_id: str):
    customer = await db.customers.find_one({"id": customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return Customer(**customer)

@api_router.put("/customers/{customer_id}", response_model=Customer)
async def update_customer(customer_id: str, customer: CustomerUpdate):
    update_data = {k: v for k, v in customer.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    result = await db.customers.update_one(
        {"id": customer_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    updated = await db.customers.find_one({"id": customer_id})
    return Customer(**updated)

@api_router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str):
    result = await db.customers.delete_one({"id": customer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"message": "Customer deleted successfully"}

# ==================== DASHBOARD STATS ====================

@api_router.get("/stats/dashboard")
async def get_dashboard_stats():
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
async def get_banners(include_inactive: bool = False):
    query = {} if include_inactive else {"is_active": True}
    banners = await db.banners.find(query).sort("sort_order", 1).to_list(20)
    return [HeroBanner(**banner) for banner in banners]

@api_router.post("/banners", response_model=HeroBanner)
async def create_banner(banner: HeroBanner):
    await db.banners.insert_one(banner.dict())
    return banner

@api_router.put("/banners/{banner_id}", response_model=HeroBanner)
async def update_banner(banner_id: str, banner: BannerUpdate):
    update_data = {k: v for k, v in banner.dict().items() if v is not None}
    result = await db.banners.update_one(
        {"id": banner_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Banner not found")
    updated = await db.banners.find_one({"id": banner_id})
    return HeroBanner(**updated)

@api_router.delete("/banners/{banner_id}")
async def delete_banner(banner_id: str):
    result = await db.banners.delete_one({"id": banner_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Banner not found")
    return {"message": "Banner deleted successfully"}

# ==================== STORE SETTINGS ====================

@api_router.get("/store/settings", response_model=StoreSettings)
async def get_store_settings():
    settings = await db.store_settings.find_one({"id": "store_settings"})
    if not settings:
        # Return default settings
        return StoreSettings()
    return StoreSettings(**settings)

@api_router.put("/store/settings", response_model=StoreSettings)
async def update_store_settings(settings: StoreSettingsUpdate):
    update_data = {k: v for k, v in settings.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    result = await db.store_settings.update_one(
        {"id": "store_settings"},
        {"$set": update_data},
        upsert=True
    )
    
    updated = await db.store_settings.find_one({"id": "store_settings"})
    return StoreSettings(**updated)

# ==================== FILE UPLOAD ====================

@api_router.post("/upload/{upload_type}")
async def upload_file(upload_type: str, file: UploadFile = File(...)):
    """Upload a file (logo, banner, product image)"""
    allowed_types = ["logos", "banners", "products"]
    if upload_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Invalid upload type. Must be one of: {allowed_types}")
    
    # Validate file type
    allowed_extensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"]
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

# ==================== CONTENT ZONES ====================

@api_router.get("/content-zones")
async def get_content_zones():
    zones = await db.content_zones.find({}).to_list(100)
    return [ContentZone(**z) for z in zones]

@api_router.post("/content-zones", response_model=ContentZone)
async def create_content_zone(zone: ContentZone):
    await db.content_zones.insert_one(zone.dict())
    return zone

@api_router.put("/content-zones/{zone_id}")
async def update_content_zone(zone_id: str, content: str = Form(...)):
    result = await db.content_zones.update_one(
        {"id": zone_id},
        {"$set": {"content": content, "updated_at": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Content zone not found")
    return {"message": "Content zone updated"}

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

# Include the router in the main app
app.include_router(api_router)

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
