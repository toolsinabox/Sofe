"""
Marketing Routes - Comprehensive marketing features for e-commerce platform
Includes: Coupons, Loyalty Program, Gift Cards, Flash Sales, Product Bundles, Email Campaigns
"""

from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import os
import uuid
import random
import string

router = APIRouter(prefix="/api/marketing", tags=["Marketing"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'maropost_clone')]


# ==================== COUPON/DISCOUNT MODELS ====================

class CouponRule(BaseModel):
    type: str  # min_purchase, min_items, specific_products, specific_categories, customer_group
    value: Any  # depends on type

class Coupon(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str
    name: str
    description: Optional[str] = None
    discount_type: str  # percentage, fixed_amount, free_shipping, buy_x_get_y
    discount_value: float
    buy_quantity: Optional[int] = None  # For BOGO
    get_quantity: Optional[int] = None  # For BOGO
    get_discount: Optional[float] = None  # Discount on "get" items (0-100%)
    min_purchase: Optional[float] = None
    max_discount: Optional[float] = None  # Cap on discount amount
    usage_limit: Optional[int] = None  # Total uses allowed
    usage_per_customer: Optional[int] = 1
    used_count: int = 0
    applicable_products: List[str] = []  # Empty = all products
    applicable_categories: List[str] = []  # Empty = all categories
    excluded_products: List[str] = []
    excluded_categories: List[str] = []
    customer_groups: List[str] = []  # Empty = all customers
    starts_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    is_active: bool = True
    is_stackable: bool = False  # Can combine with other coupons
    first_order_only: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None

class CouponCreate(BaseModel):
    code: Optional[str] = None  # Auto-generate if not provided
    name: str
    description: Optional[str] = None
    discount_type: str
    discount_value: float
    buy_quantity: Optional[int] = None
    get_quantity: Optional[int] = None
    get_discount: Optional[float] = None
    min_purchase: Optional[float] = None
    max_discount: Optional[float] = None
    usage_limit: Optional[int] = None
    usage_per_customer: Optional[int] = 1
    applicable_products: List[str] = []
    applicable_categories: List[str] = []
    excluded_products: List[str] = []
    excluded_categories: List[str] = []
    customer_groups: List[str] = []
    starts_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    is_active: bool = True
    is_stackable: bool = False
    first_order_only: bool = False

class CouponUsage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    coupon_id: str
    coupon_code: str
    customer_id: Optional[str] = None
    customer_email: Optional[str] = None
    order_id: str
    discount_amount: float
    used_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ==================== LOYALTY PROGRAM MODELS ====================

class LoyaltyTier(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    min_points: int
    max_points: Optional[int] = None
    points_multiplier: float = 1.0  # Earn points faster
    discount_percentage: float = 0  # Automatic discount
    free_shipping: bool = False
    priority_support: bool = False
    exclusive_access: bool = False
    birthday_bonus: int = 0  # Bonus points on birthday
    icon: Optional[str] = None
    color: str = "#6B7280"

class LoyaltyProgram(BaseModel):
    id: str = "loyalty_settings"
    is_enabled: bool = True
    program_name: str = "Rewards Program"
    points_per_dollar: float = 1.0  # Points earned per dollar spent
    points_value: float = 0.01  # Dollar value of each point when redeeming
    min_points_redeem: int = 100
    max_points_per_order: Optional[int] = None  # Max points redeemable per order
    points_expiry_days: Optional[int] = None  # Days until points expire
    signup_bonus: int = 0
    referral_bonus: int = 0
    referee_bonus: int = 0  # Bonus for person being referred
    review_bonus: int = 0
    tiers: List[LoyaltyTier] = []

class CustomerLoyalty(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    total_points: int = 0
    available_points: int = 0
    lifetime_points: int = 0
    current_tier_id: Optional[str] = None
    referral_code: str = Field(default_factory=lambda: ''.join(random.choices(string.ascii_uppercase + string.digits, k=8)))
    referred_by: Optional[str] = None
    referral_count: int = 0
    joined_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PointsTransaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    points: int  # Positive for earned, negative for redeemed
    balance_after: int
    type: str  # earned, redeemed, expired, bonus, referral, adjustment
    description: str
    order_id: Optional[str] = None
    expires_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ==================== GIFT CARD MODELS ====================

class GiftCard(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str = Field(default_factory=lambda: ''.join(random.choices(string.ascii_uppercase + string.digits, k=16)))
    initial_balance: float
    current_balance: float
    currency: str = "AUD"
    purchaser_email: Optional[str] = None
    purchaser_name: Optional[str] = None
    recipient_email: Optional[str] = None
    recipient_name: Optional[str] = None
    message: Optional[str] = None
    template: str = "default"
    is_digital: bool = True
    is_active: bool = True
    purchased_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    delivered_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    last_used_at: Optional[datetime] = None

class GiftCardTransaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    gift_card_id: str
    amount: float  # Positive for load, negative for redemption
    balance_after: float
    order_id: Optional[str] = None
    type: str  # purchase, redemption, refund, adjustment
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GiftCardCreate(BaseModel):
    initial_balance: float
    recipient_email: Optional[str] = None
    recipient_name: Optional[str] = None
    message: Optional[str] = None
    template: str = "default"
    send_email: bool = True
    expires_at: Optional[datetime] = None


# ==================== FLASH SALE MODELS ====================

class FlashSaleProduct(BaseModel):
    product_id: str
    sale_price: float
    original_price: float
    quantity_limit: Optional[int] = None
    sold_count: int = 0

class FlashSale(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    banner_image: Optional[str] = None
    products: List[FlashSaleProduct] = []
    discount_percentage: Optional[float] = None  # Apply to all products if no individual price
    starts_at: datetime
    ends_at: datetime
    is_active: bool = True
    show_countdown: bool = True
    show_stock: bool = True
    featured: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FlashSaleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    banner_image: Optional[str] = None
    products: List[FlashSaleProduct] = []
    discount_percentage: Optional[float] = None
    starts_at: datetime
    ends_at: datetime
    is_active: bool = True
    show_countdown: bool = True
    show_stock: bool = True
    featured: bool = False


# ==================== PRODUCT BUNDLE MODELS ====================

class BundleItem(BaseModel):
    product_id: str
    quantity: int = 1
    is_required: bool = True

class ProductBundle(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    image: Optional[str] = None
    items: List[BundleItem] = []
    bundle_price: float  # Total price for the bundle
    original_price: float  # Sum of individual prices
    savings: float = 0  # Calculated savings
    discount_type: str = "fixed"  # fixed, percentage
    is_active: bool = True
    stock: Optional[int] = None  # None = unlimited (based on component stock)
    sold_count: int = 0
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BundleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    image: Optional[str] = None
    items: List[BundleItem] = []
    bundle_price: float
    discount_type: str = "fixed"
    is_active: bool = True
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None


# ==================== EMAIL CAMPAIGN MODELS ====================

class EmailCampaign(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    subject: str
    preview_text: Optional[str] = None
    content_html: str
    content_text: Optional[str] = None
    template_id: Optional[str] = None
    type: str  # newsletter, promotional, abandoned_cart, welcome, birthday, win_back
    status: str = "draft"  # draft, scheduled, sending, sent, paused
    recipient_type: str = "all"  # all, segment, list
    recipient_segment: Optional[str] = None
    recipient_list: List[str] = []  # Customer IDs
    scheduled_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    stats: Dict[str, int] = Field(default_factory=lambda: {
        "sent": 0, "delivered": 0, "opened": 0, "clicked": 0, "bounced": 0, "unsubscribed": 0
    })
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None

class EmailTemplate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    category: str  # transactional, marketing, notification
    subject: str
    content_html: str
    content_text: Optional[str] = None
    variables: List[str] = []  # Available merge tags
    is_default: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AutomatedEmail(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    trigger: str  # abandoned_cart, welcome, order_confirmation, shipping, review_request, birthday, win_back
    delay_hours: int = 0  # Hours after trigger
    subject: str
    content_html: str
    is_active: bool = True
    stats: Dict[str, int] = Field(default_factory=lambda: {"sent": 0, "opened": 0, "clicked": 0, "converted": 0})


# ==================== COUPON ROUTES ====================

@router.get("/coupons")
async def get_coupons(
    is_active: Optional[bool] = None,
    discount_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
):
    """Get all coupons with filtering"""
    query = {}
    if is_active is not None:
        query["is_active"] = is_active
    if discount_type:
        query["discount_type"] = discount_type
    
    coupons = await db.coupons.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.coupons.count_documents(query)
    
    return {"coupons": coupons, "total": total}

@router.get("/coupons/{coupon_id}")
async def get_coupon(coupon_id: str):
    """Get a specific coupon"""
    coupon = await db.coupons.find_one({"id": coupon_id}, {"_id": 0})
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    return coupon

@router.post("/coupons")
async def create_coupon(coupon: CouponCreate):
    """Create a new coupon"""
    # Generate code if not provided
    code = coupon.code or ''.join(random.choices(string.ascii_uppercase + string.digits, k=10))
    
    # Check for duplicate code
    existing = await db.coupons.find_one({"code": code.upper()})
    if existing:
        raise HTTPException(status_code=400, detail="Coupon code already exists")
    
    new_coupon = Coupon(
        code=code.upper(),
        **coupon.dict(exclude={"code"})
    )
    await db.coupons.insert_one(new_coupon.dict())
    return new_coupon

@router.put("/coupons/{coupon_id}")
async def update_coupon(coupon_id: str, update: Dict[str, Any]):
    """Update a coupon"""
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.coupons.update_one({"id": coupon_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Coupon not found")
    return await db.coupons.find_one({"id": coupon_id}, {"_id": 0})

@router.delete("/coupons/{coupon_id}")
async def delete_coupon(coupon_id: str):
    """Delete a coupon"""
    result = await db.coupons.delete_one({"id": coupon_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Coupon not found")
    return {"success": True}

@router.post("/coupons/validate")
async def validate_coupon(code: str, cart_total: float, customer_id: Optional[str] = None, product_ids: List[str] = []):
    """Validate a coupon code"""
    coupon = await db.coupons.find_one({"code": code.upper(), "is_active": True}, {"_id": 0})
    if not coupon:
        raise HTTPException(status_code=400, detail="Invalid coupon code")
    
    now = datetime.now(timezone.utc)
    
    # Check dates
    if coupon.get("starts_at") and datetime.fromisoformat(coupon["starts_at"].replace("Z", "+00:00")) > now:
        raise HTTPException(status_code=400, detail="Coupon is not yet active")
    if coupon.get("expires_at") and datetime.fromisoformat(coupon["expires_at"].replace("Z", "+00:00")) < now:
        raise HTTPException(status_code=400, detail="Coupon has expired")
    
    # Check usage limits
    if coupon.get("usage_limit") and coupon.get("used_count", 0) >= coupon["usage_limit"]:
        raise HTTPException(status_code=400, detail="Coupon usage limit reached")
    
    # Check customer usage
    if customer_id and coupon.get("usage_per_customer"):
        customer_usage = await db.coupon_usage.count_documents({
            "coupon_id": coupon["id"],
            "customer_id": customer_id
        })
        if customer_usage >= coupon["usage_per_customer"]:
            raise HTTPException(status_code=400, detail="You have already used this coupon")
    
    # Check minimum purchase
    if coupon.get("min_purchase") and cart_total < coupon["min_purchase"]:
        raise HTTPException(status_code=400, detail=f"Minimum purchase of ${coupon['min_purchase']:.2f} required")
    
    # Calculate discount
    discount_amount = 0
    if coupon["discount_type"] == "percentage":
        discount_amount = cart_total * (coupon["discount_value"] / 100)
    elif coupon["discount_type"] == "fixed_amount":
        discount_amount = coupon["discount_value"]
    elif coupon["discount_type"] == "free_shipping":
        discount_amount = 0  # Handled separately
    
    # Apply max discount cap
    if coupon.get("max_discount") and discount_amount > coupon["max_discount"]:
        discount_amount = coupon["max_discount"]
    
    return {
        "valid": True,
        "coupon": coupon,
        "discount_amount": round(discount_amount, 2),
        "new_total": round(cart_total - discount_amount, 2)
    }

@router.post("/coupons/generate-bulk")
async def generate_bulk_coupons(
    prefix: str,
    count: int,
    discount_type: str,
    discount_value: float,
    expires_at: Optional[datetime] = None,
    usage_per_customer: int = 1
):
    """Generate multiple unique coupon codes"""
    coupons = []
    for i in range(count):
        code = f"{prefix}{uuid.uuid4().hex[:8].upper()}"
        coupon = Coupon(
            code=code,
            name=f"Bulk Coupon {prefix}",
            discount_type=discount_type,
            discount_value=discount_value,
            expires_at=expires_at,
            usage_per_customer=usage_per_customer,
            usage_limit=1
        )
        coupons.append(coupon.dict())
    
    await db.coupons.insert_many(coupons)
    return {"generated": count, "prefix": prefix}


# ==================== LOYALTY PROGRAM ROUTES ====================

@router.get("/loyalty/settings")
async def get_loyalty_settings():
    """Get loyalty program settings"""
    settings = await db.loyalty_settings.find_one({"id": "loyalty_settings"}, {"_id": 0})
    if not settings:
        default = LoyaltyProgram()
        await db.loyalty_settings.insert_one(default.dict())
        return default.dict()
    return settings

@router.put("/loyalty/settings")
async def update_loyalty_settings(settings: Dict[str, Any]):
    """Update loyalty program settings"""
    await db.loyalty_settings.update_one(
        {"id": "loyalty_settings"},
        {"$set": settings},
        upsert=True
    )
    return await db.loyalty_settings.find_one({"id": "loyalty_settings"}, {"_id": 0})

@router.get("/loyalty/tiers")
async def get_loyalty_tiers():
    """Get all loyalty tiers"""
    settings = await get_loyalty_settings()
    return settings.get("tiers", [])

@router.post("/loyalty/tiers")
async def create_loyalty_tier(tier: LoyaltyTier):
    """Create a new loyalty tier"""
    await db.loyalty_settings.update_one(
        {"id": "loyalty_settings"},
        {"$push": {"tiers": tier.dict()}}
    )
    return tier

@router.get("/loyalty/customers")
async def get_loyalty_customers(
    tier_id: Optional[str] = None,
    min_points: Optional[int] = None,
    skip: int = 0,
    limit: int = 50
):
    """Get customers in loyalty program"""
    query = {}
    if tier_id:
        query["current_tier_id"] = tier_id
    if min_points:
        query["available_points"] = {"$gte": min_points}
    
    customers = await db.customer_loyalty.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    
    # Enrich with customer details
    for customer in customers:
        cust_details = await db.customers.find_one({"id": customer["customer_id"]}, {"_id": 0, "name": 1, "email": 1})
        if cust_details:
            customer["customer_name"] = cust_details.get("name")
            customer["customer_email"] = cust_details.get("email")
    
    return {"customers": customers, "total": await db.customer_loyalty.count_documents(query)}

@router.get("/loyalty/customer/{customer_id}")
async def get_customer_loyalty(customer_id: str):
    """Get loyalty info for a specific customer"""
    loyalty = await db.customer_loyalty.find_one({"customer_id": customer_id}, {"_id": 0})
    if not loyalty:
        # Create loyalty record for customer
        loyalty = CustomerLoyalty(customer_id=customer_id)
        await db.customer_loyalty.insert_one(loyalty.dict())
        loyalty = loyalty.dict()
    
    # Get transaction history
    transactions = await db.points_transactions.find(
        {"customer_id": customer_id}, {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    
    loyalty["transactions"] = transactions
    return loyalty

@router.post("/loyalty/points/add")
async def add_loyalty_points(
    customer_id: str,
    points: int,
    type: str = "bonus",
    description: str = "Manual adjustment",
    order_id: Optional[str] = None
):
    """Add points to a customer's account"""
    loyalty = await db.customer_loyalty.find_one({"customer_id": customer_id})
    if not loyalty:
        loyalty = CustomerLoyalty(customer_id=customer_id).dict()
        await db.customer_loyalty.insert_one(loyalty)
    
    new_balance = loyalty.get("available_points", 0) + points
    new_lifetime = loyalty.get("lifetime_points", 0) + (points if points > 0 else 0)
    
    # Update loyalty record
    await db.customer_loyalty.update_one(
        {"customer_id": customer_id},
        {"$set": {
            "available_points": new_balance,
            "total_points": new_balance,
            "lifetime_points": new_lifetime
        }}
    )
    
    # Record transaction
    transaction = PointsTransaction(
        customer_id=customer_id,
        points=points,
        balance_after=new_balance,
        type=type,
        description=description,
        order_id=order_id
    )
    await db.points_transactions.insert_one(transaction.dict())
    
    return {"success": True, "new_balance": new_balance}

@router.post("/loyalty/points/redeem")
async def redeem_loyalty_points(customer_id: str, points: int, order_id: str):
    """Redeem points for an order"""
    loyalty = await db.customer_loyalty.find_one({"customer_id": customer_id})
    if not loyalty:
        raise HTTPException(status_code=404, detail="Customer not in loyalty program")
    
    if loyalty.get("available_points", 0) < points:
        raise HTTPException(status_code=400, detail="Insufficient points")
    
    settings = await get_loyalty_settings()
    if points < settings.get("min_points_redeem", 100):
        raise HTTPException(status_code=400, detail=f"Minimum {settings['min_points_redeem']} points required")
    
    # Calculate discount value
    discount_value = points * settings.get("points_value", 0.01)
    new_balance = loyalty["available_points"] - points
    
    # Update loyalty record
    await db.customer_loyalty.update_one(
        {"customer_id": customer_id},
        {"$set": {"available_points": new_balance, "total_points": new_balance}}
    )
    
    # Record transaction
    transaction = PointsTransaction(
        customer_id=customer_id,
        points=-points,
        balance_after=new_balance,
        type="redeemed",
        description=f"Redeemed for order {order_id}",
        order_id=order_id
    )
    await db.points_transactions.insert_one(transaction.dict())
    
    return {"success": True, "points_redeemed": points, "discount_value": discount_value, "new_balance": new_balance}


# ==================== GIFT CARD ROUTES ====================

@router.get("/gift-cards")
async def get_gift_cards(
    is_active: Optional[bool] = None,
    has_balance: Optional[bool] = None,
    skip: int = 0,
    limit: int = 50
):
    """Get all gift cards"""
    query = {}
    if is_active is not None:
        query["is_active"] = is_active
    if has_balance:
        query["current_balance"] = {"$gt": 0}
    
    cards = await db.gift_cards.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.gift_cards.count_documents(query)
    
    return {"gift_cards": cards, "total": total}

@router.get("/gift-cards/{card_id}")
async def get_gift_card(card_id: str):
    """Get a specific gift card"""
    card = await db.gift_cards.find_one({"id": card_id}, {"_id": 0})
    if not card:
        # Try by code
        card = await db.gift_cards.find_one({"code": card_id.upper()}, {"_id": 0})
    if not card:
        raise HTTPException(status_code=404, detail="Gift card not found")
    
    # Get transactions
    transactions = await db.gift_card_transactions.find(
        {"gift_card_id": card["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    card["transactions"] = transactions
    return card

@router.post("/gift-cards")
async def create_gift_card(card_data: GiftCardCreate):
    """Create a new gift card"""
    card = GiftCard(
        initial_balance=card_data.initial_balance,
        current_balance=card_data.initial_balance,
        recipient_email=card_data.recipient_email,
        recipient_name=card_data.recipient_name,
        message=card_data.message,
        template=card_data.template,
        expires_at=card_data.expires_at
    )
    await db.gift_cards.insert_one(card.dict())
    
    # Record purchase transaction
    transaction = GiftCardTransaction(
        gift_card_id=card.id,
        amount=card.initial_balance,
        balance_after=card.current_balance,
        type="purchase",
        notes="Gift card created"
    )
    await db.gift_card_transactions.insert_one(transaction.dict())
    
    return card

@router.post("/gift-cards/check-balance")
async def check_gift_card_balance(code: str):
    """Check gift card balance"""
    card = await db.gift_cards.find_one({"code": code.upper(), "is_active": True}, {"_id": 0})
    if not card:
        raise HTTPException(status_code=404, detail="Gift card not found or inactive")
    
    # Check expiry
    if card.get("expires_at"):
        expires = datetime.fromisoformat(card["expires_at"].replace("Z", "+00:00"))
        if expires < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Gift card has expired")
    
    return {
        "code": card["code"],
        "balance": card["current_balance"],
        "currency": card.get("currency", "AUD"),
        "expires_at": card.get("expires_at")
    }

@router.post("/gift-cards/redeem")
async def redeem_gift_card(code: str, amount: float, order_id: str):
    """Redeem gift card for an order"""
    card = await db.gift_cards.find_one({"code": code.upper(), "is_active": True})
    if not card:
        raise HTTPException(status_code=404, detail="Gift card not found or inactive")
    
    if card["current_balance"] < amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    new_balance = card["current_balance"] - amount
    
    await db.gift_cards.update_one(
        {"id": card["id"]},
        {"$set": {
            "current_balance": new_balance,
            "last_used_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Record transaction
    transaction = GiftCardTransaction(
        gift_card_id=card["id"],
        amount=-amount,
        balance_after=new_balance,
        order_id=order_id,
        type="redemption"
    )
    await db.gift_card_transactions.insert_one(transaction.dict())
    
    return {"success": True, "amount_redeemed": amount, "remaining_balance": new_balance}


# ==================== FLASH SALE ROUTES ====================

@router.get("/flash-sales")
async def get_flash_sales(
    is_active: Optional[bool] = None,
    featured: Optional[bool] = None,
    include_expired: bool = False
):
    """Get all flash sales"""
    query = {}
    if is_active is not None:
        query["is_active"] = is_active
    if featured is not None:
        query["featured"] = featured
    if not include_expired:
        query["ends_at"] = {"$gte": datetime.now(timezone.utc).isoformat()}
    
    sales = await db.flash_sales.find(query, {"_id": 0}).sort("starts_at", -1).to_list(100)
    return {"flash_sales": sales}

@router.get("/flash-sales/active")
async def get_active_flash_sales():
    """Get currently active flash sales"""
    now = datetime.now(timezone.utc).isoformat()
    sales = await db.flash_sales.find({
        "is_active": True,
        "starts_at": {"$lte": now},
        "ends_at": {"$gte": now}
    }, {"_id": 0}).to_list(100)
    return {"flash_sales": sales}

@router.get("/flash-sales/{sale_id}")
async def get_flash_sale(sale_id: str):
    """Get a specific flash sale"""
    sale = await db.flash_sales.find_one({"id": sale_id}, {"_id": 0})
    if not sale:
        raise HTTPException(status_code=404, detail="Flash sale not found")
    return sale

@router.post("/flash-sales")
async def create_flash_sale(sale: FlashSaleCreate):
    """Create a new flash sale"""
    new_sale = FlashSale(**sale.dict())
    await db.flash_sales.insert_one(new_sale.dict())
    return new_sale

@router.put("/flash-sales/{sale_id}")
async def update_flash_sale(sale_id: str, update: Dict[str, Any]):
    """Update a flash sale"""
    result = await db.flash_sales.update_one({"id": sale_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Flash sale not found")
    return await db.flash_sales.find_one({"id": sale_id}, {"_id": 0})

@router.delete("/flash-sales/{sale_id}")
async def delete_flash_sale(sale_id: str):
    """Delete a flash sale"""
    result = await db.flash_sales.delete_one({"id": sale_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Flash sale not found")
    return {"success": True}


# ==================== PRODUCT BUNDLE ROUTES ====================

@router.get("/bundles")
async def get_bundles(is_active: Optional[bool] = None):
    """Get all product bundles"""
    query = {}
    if is_active is not None:
        query["is_active"] = is_active
    
    bundles = await db.product_bundles.find(query, {"_id": 0}).to_list(100)
    
    # Enrich with product details
    for bundle in bundles:
        for item in bundle.get("items", []):
            product = await db.products.find_one({"id": item["product_id"]}, {"_id": 0, "name": 1, "price": 1, "image": 1})
            if product:
                item["product_name"] = product.get("name")
                item["product_price"] = product.get("price")
                item["product_image"] = product.get("image")
    
    return {"bundles": bundles}

@router.get("/bundles/{bundle_id}")
async def get_bundle(bundle_id: str):
    """Get a specific bundle"""
    bundle = await db.product_bundles.find_one({"id": bundle_id}, {"_id": 0})
    if not bundle:
        raise HTTPException(status_code=404, detail="Bundle not found")
    
    # Enrich with product details
    original_price = 0
    for item in bundle.get("items", []):
        product = await db.products.find_one({"id": item["product_id"]}, {"_id": 0})
        if product:
            item["product"] = product
            original_price += product.get("price", 0) * item.get("quantity", 1)
    
    bundle["original_price"] = original_price
    bundle["savings"] = original_price - bundle.get("bundle_price", 0)
    
    return bundle

@router.post("/bundles")
async def create_bundle(bundle: BundleCreate):
    """Create a new product bundle"""
    # Calculate original price
    original_price = 0
    for item in bundle.items:
        product = await db.products.find_one({"id": item.product_id}, {"_id": 0, "price": 1})
        if product:
            original_price += product.get("price", 0) * item.quantity
    
    new_bundle = ProductBundle(
        **bundle.dict(),
        original_price=original_price,
        savings=original_price - bundle.bundle_price
    )
    await db.product_bundles.insert_one(new_bundle.dict())
    return new_bundle

@router.put("/bundles/{bundle_id}")
async def update_bundle(bundle_id: str, update: Dict[str, Any]):
    """Update a bundle"""
    result = await db.product_bundles.update_one({"id": bundle_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Bundle not found")
    return await db.product_bundles.find_one({"id": bundle_id}, {"_id": 0})

@router.delete("/bundles/{bundle_id}")
async def delete_bundle(bundle_id: str):
    """Delete a bundle"""
    result = await db.product_bundles.delete_one({"id": bundle_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bundle not found")
    return {"success": True}


# ==================== EMAIL CAMPAIGN ROUTES ====================

@router.get("/email-campaigns")
async def get_email_campaigns(status: Optional[str] = None, type: Optional[str] = None):
    """Get all email campaigns"""
    query = {}
    if status:
        query["status"] = status
    if type:
        query["type"] = type
    
    campaigns = await db.email_campaigns.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"campaigns": campaigns}

@router.get("/email-campaigns/{campaign_id}")
async def get_email_campaign(campaign_id: str):
    """Get a specific email campaign"""
    campaign = await db.email_campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign

@router.post("/email-campaigns")
async def create_email_campaign(campaign: Dict[str, Any]):
    """Create a new email campaign"""
    new_campaign = EmailCampaign(**campaign)
    await db.email_campaigns.insert_one(new_campaign.dict())
    return new_campaign

@router.put("/email-campaigns/{campaign_id}")
async def update_email_campaign(campaign_id: str, update: Dict[str, Any]):
    """Update an email campaign"""
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.email_campaigns.update_one({"id": campaign_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return await db.email_campaigns.find_one({"id": campaign_id}, {"_id": 0})

@router.delete("/email-campaigns/{campaign_id}")
async def delete_email_campaign(campaign_id: str):
    """Delete an email campaign"""
    result = await db.email_campaigns.delete_one({"id": campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"success": True}

@router.get("/email-templates")
async def get_email_templates(category: Optional[str] = None):
    """Get all email templates"""
    query = {}
    if category:
        query["category"] = category
    templates = await db.email_templates.find(query, {"_id": 0}).to_list(100)
    return {"templates": templates}

@router.post("/email-templates")
async def create_email_template(template: Dict[str, Any]):
    """Create a new email template"""
    new_template = EmailTemplate(**template)
    await db.email_templates.insert_one(new_template.dict())
    return new_template

@router.get("/automated-emails")
async def get_automated_emails():
    """Get all automated email rules"""
    emails = await db.automated_emails.find({}, {"_id": 0}).to_list(100)
    return {"automated_emails": emails}

@router.post("/automated-emails")
async def create_automated_email(email: Dict[str, Any]):
    """Create a new automated email rule"""
    new_email = AutomatedEmail(**email)
    await db.automated_emails.insert_one(new_email.dict())
    return new_email

@router.put("/automated-emails/{email_id}")
async def update_automated_email(email_id: str, update: Dict[str, Any]):
    """Update an automated email rule"""
    result = await db.automated_emails.update_one({"id": email_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Automated email not found")
    return await db.automated_emails.find_one({"id": email_id}, {"_id": 0})
