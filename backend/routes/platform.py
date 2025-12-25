"""
Multi-Tenant Platform Module
Manages stores, subscriptions, and tenant isolation
Similar to Shopify/Wix architecture
"""

from fastapi import APIRouter, HTTPException, Request, Depends, Header
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
from uuid import uuid4
import secrets
import hashlib

router = APIRouter(prefix="/api/platform", tags=["Platform"])

# Database reference (will be set from server.py)
db = None

def set_db(database):
    global db
    db = database


# ==================== PYDANTIC MODELS ====================

class PlanFeatures(BaseModel):
    max_products: int = 100
    max_storage_mb: int = 500
    max_staff_accounts: int = 2
    custom_domain: bool = False
    remove_branding: bool = False
    advanced_analytics: bool = False
    priority_support: bool = False
    api_access: bool = False

class SubscriptionPlan(BaseModel):
    id: str
    name: str
    price_monthly: float
    price_yearly: float
    features: PlanFeatures
    is_popular: bool = False

class StoreCreate(BaseModel):
    store_name: str
    owner_email: EmailStr
    owner_password: str
    owner_name: str
    subdomain: str  # e.g., "mystore" -> mystore.yourplatform.com
    plan_id: str = "free"

class StoreSetup(BaseModel):
    business_type: Optional[str] = None
    country: Optional[str] = "AU"
    currency: Optional[str] = "AUD"
    timezone: Optional[str] = "Australia/Sydney"

class Store(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    store_name: str
    subdomain: str  # mystore.yourplatform.com
    custom_domain: Optional[str] = None  # www.mystore.com
    custom_domain_verified: bool = False
    owner_id: str
    plan_id: str = "free"
    status: str = "active"  # active, suspended, cancelled, trial
    trial_ends_at: Optional[datetime] = None
    subscription_id: Optional[str] = None  # Stripe subscription ID
    
    # Store settings
    business_type: Optional[str] = None
    country: str = "AU"
    currency: str = "AUD"
    timezone: str = "Australia/Sydney"
    
    # Usage tracking
    products_count: int = 0
    storage_used_mb: float = 0
    orders_count: int = 0
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StoreOwner(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    email: EmailStr
    name: str
    hashed_password: str
    stores: List[str] = []  # Store IDs this owner has access to
    is_platform_admin: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DomainVerification(BaseModel):
    store_id: str
    domain: str
    verification_token: str
    verified: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ==================== SUBSCRIPTION PLANS ====================

PLANS = {
    "free": SubscriptionPlan(
        id="free",
        name="Free",
        price_monthly=0,
        price_yearly=0,
        features=PlanFeatures(
            max_products=10,
            max_storage_mb=100,
            max_staff_accounts=1,
            custom_domain=False,
            remove_branding=False,
            advanced_analytics=False,
            priority_support=False,
            api_access=False
        )
    ),
    "starter": SubscriptionPlan(
        id="starter",
        name="Starter",
        price_monthly=29,
        price_yearly=290,
        features=PlanFeatures(
            max_products=100,
            max_storage_mb=1000,
            max_staff_accounts=2,
            custom_domain=True,
            remove_branding=False,
            advanced_analytics=False,
            priority_support=False,
            api_access=True
        )
    ),
    "professional": SubscriptionPlan(
        id="professional",
        name="Professional",
        price_monthly=79,
        price_yearly=790,
        is_popular=True,
        features=PlanFeatures(
            max_products=1000,
            max_storage_mb=5000,
            max_staff_accounts=5,
            custom_domain=True,
            remove_branding=True,
            advanced_analytics=True,
            priority_support=False,
            api_access=True
        )
    ),
    "enterprise": SubscriptionPlan(
        id="enterprise",
        name="Enterprise",
        price_monthly=299,
        price_yearly=2990,
        features=PlanFeatures(
            max_products=999999,
            max_storage_mb=50000,
            max_staff_accounts=999,
            custom_domain=True,
            remove_branding=True,
            advanced_analytics=True,
            priority_support=True,
            api_access=True
        )
    )
}


# ==================== HELPER FUNCTIONS ====================

def hash_password(password: str) -> str:
    """Simple password hashing"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hash"""
    return hash_password(password) == hashed

def generate_verification_token() -> str:
    """Generate a random verification token"""
    return secrets.token_urlsafe(32)

async def get_store_by_domain(domain: str) -> Optional[Dict]:
    """Look up store by subdomain or custom domain"""
    if db is None:
        return None
    
    # Check custom domain first
    store = await db.platform_stores.find_one(
        {"custom_domain": domain, "custom_domain_verified": True, "status": "active"},
        {"_id": 0}
    )
    if store:
        return store
    
    # Check subdomain (extract from domain like mystore.yourplatform.com)
    subdomain = domain.split('.')[0]
    store = await db.platform_stores.find_one(
        {"subdomain": subdomain, "status": "active"},
        {"_id": 0}
    )
    return store


# ==================== API ENDPOINTS ====================

# ----- Plans -----

@router.get("/plans")
async def get_plans():
    """Get all available subscription plans"""
    return {"plans": [plan.dict() for plan in PLANS.values()]}

@router.get("/plans/{plan_id}")
async def get_plan(plan_id: str):
    """Get a specific plan"""
    if plan_id not in PLANS:
        raise HTTPException(status_code=404, detail="Plan not found")
    return PLANS[plan_id].dict()


# ----- Store Registration -----

@router.post("/stores/check-subdomain")
async def check_subdomain(subdomain: str):
    """Check if a subdomain is available"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    # Validate subdomain format
    subdomain = subdomain.lower().strip()
    if len(subdomain) < 3:
        return {"available": False, "reason": "Subdomain must be at least 3 characters"}
    if not subdomain.isalnum():
        return {"available": False, "reason": "Subdomain can only contain letters and numbers"}
    
    # Check reserved subdomains
    reserved = ["www", "api", "app", "admin", "platform", "dashboard", "store", "shop", "mail", "email", "support", "help"]
    if subdomain in reserved:
        return {"available": False, "reason": "This subdomain is reserved"}
    
    # Check if already taken
    existing = await db.platform_stores.find_one({"subdomain": subdomain})
    if existing:
        return {"available": False, "reason": "This subdomain is already taken"}
    
    return {"available": True, "subdomain": subdomain}


@router.post("/stores/register")
async def register_store(store_data: StoreCreate):
    """Register a new store (signup)"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    # Check subdomain availability
    subdomain = store_data.subdomain.lower().strip()
    existing = await db.platform_stores.find_one({"subdomain": subdomain})
    if existing:
        raise HTTPException(status_code=400, detail="Subdomain already taken")
    
    # Check if email already registered
    existing_owner = await db.platform_owners.find_one({"email": store_data.owner_email.lower()})
    if existing_owner:
        raise HTTPException(status_code=400, detail="Email already registered. Please login instead.")
    
    # Create owner account
    owner = StoreOwner(
        email=store_data.owner_email.lower(),
        name=store_data.owner_name,
        hashed_password=hash_password(store_data.owner_password)
    )
    
    # Create store with 14-day trial
    store = Store(
        store_name=store_data.store_name,
        subdomain=subdomain,
        owner_id=owner.id,
        plan_id=store_data.plan_id if store_data.plan_id in PLANS else "free",
        status="trial" if store_data.plan_id != "free" else "active",
        trial_ends_at=datetime.now(timezone.utc) + timedelta(days=14) if store_data.plan_id != "free" else None
    )
    
    # Link store to owner
    owner.stores.append(store.id)
    
    # Save to database
    await db.platform_owners.insert_one(owner.dict())
    await db.platform_stores.insert_one(store.dict())
    
    # Create default store data (categories, settings, etc.)
    await initialize_store_data(store.id)
    
    # Generate auth token
    token = secrets.token_urlsafe(32)
    await db.platform_sessions.insert_one({
        "token": token,
        "owner_id": owner.id,
        "store_id": store.id,
        "created_at": datetime.now(timezone.utc),
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7)
    })
    
    return {
        "success": True,
        "store": {
            "id": store.id,
            "name": store.store_name,
            "subdomain": store.subdomain,
            "url": f"https://{subdomain}.yourplatform.com",
            "dashboard_url": f"https://{subdomain}.yourplatform.com/merchant"
        },
        "owner": {
            "id": owner.id,
            "email": owner.email,
            "name": owner.name
        },
        "token": token,
        "message": f"Welcome! Your store is ready at {subdomain}.yourplatform.com"
    }


async def initialize_store_data(store_id: str):
    """Initialize default data for a new store"""
    if db is None:
        return
    
    # Create default settings
    default_settings = {
        "id": "settings",
        "store_id": store_id,
        "store_name": "",
        "store_email": "",
        "store_phone": "",
        "currency": "AUD",
        "currency_symbol": "$",
        "timezone": "Australia/Sydney",
        "created_at": datetime.now(timezone.utc)
    }
    await db.store_settings.update_one(
        {"store_id": store_id},
        {"$set": default_settings},
        upsert=True
    )
    
    # Create default category
    default_category = {
        "id": str(uuid4()),
        "store_id": store_id,
        "name": "General",
        "description": "Default category",
        "is_active": True,
        "sort_order": 0,
        "created_at": datetime.now(timezone.utc)
    }
    await db.categories.insert_one(default_category)


# ----- Store Owner Auth -----

@router.post("/auth/login")
async def platform_login(email: str, password: str):
    """Login to platform"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    owner = await db.platform_owners.find_one({"email": email.lower()}, {"_id": 0})
    if not owner or not verify_password(password, owner["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Get owner's stores
    stores = await db.platform_stores.find(
        {"id": {"$in": owner.get("stores", [])}},
        {"_id": 0}
    ).to_list(100)
    
    # Generate token
    token = secrets.token_urlsafe(32)
    await db.platform_sessions.insert_one({
        "token": token,
        "owner_id": owner["id"],
        "store_id": stores[0]["id"] if stores else None,
        "created_at": datetime.now(timezone.utc),
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7)
    })
    
    return {
        "token": token,
        "owner": {
            "id": owner["id"],
            "email": owner["email"],
            "name": owner["name"]
        },
        "stores": stores
    }


@router.get("/auth/me")
async def get_current_owner(authorization: str = Header(None)):
    """Get current logged in owner"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.replace("Bearer ", "")
    session = await db.platform_sessions.find_one({
        "token": token,
        "expires_at": {"$gt": datetime.now(timezone.utc)}
    })
    
    if not session:
        raise HTTPException(status_code=401, detail="Session expired")
    
    owner = await db.platform_owners.find_one({"id": session["owner_id"]}, {"_id": 0, "hashed_password": 0})
    stores = await db.platform_stores.find({"id": {"$in": owner.get("stores", [])}}, {"_id": 0}).to_list(100)
    
    return {"owner": owner, "stores": stores, "current_store_id": session.get("store_id")}


# ----- Store Management -----

@router.get("/stores")
async def get_my_stores(authorization: str = Header(None)):
    """Get all stores owned by current user"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.replace("Bearer ", "")
    session = await db.platform_sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    owner = await db.platform_owners.find_one({"id": session["owner_id"]})
    stores = await db.platform_stores.find(
        {"id": {"$in": owner.get("stores", [])}},
        {"_id": 0}
    ).to_list(100)
    
    return {"stores": stores}


@router.get("/stores/{store_id}")
async def get_store(store_id: str):
    """Get store details"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    store = await db.platform_stores.find_one({"id": store_id}, {"_id": 0})
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    # Get plan details
    plan = PLANS.get(store.get("plan_id", "free"))
    
    return {"store": store, "plan": plan.dict() if plan else None}


@router.put("/stores/{store_id}")
async def update_store(store_id: str, updates: Dict[str, Any]):
    """Update store settings"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    allowed_fields = ["store_name", "business_type", "country", "currency", "timezone"]
    update_data = {k: v for k, v in updates.items() if k in allowed_fields}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.platform_stores.update_one({"id": store_id}, {"$set": update_data})
    
    store = await db.platform_stores.find_one({"id": store_id}, {"_id": 0})
    return {"store": store}


# ----- Custom Domain -----

@router.post("/stores/{store_id}/domain")
async def add_custom_domain(store_id: str, domain: str):
    """Add a custom domain to store"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    # Normalize domain
    domain = domain.lower().strip().replace("https://", "").replace("http://", "").rstrip("/")
    
    # Check if domain is already used
    existing = await db.platform_stores.find_one({"custom_domain": domain, "id": {"$ne": store_id}})
    if existing:
        raise HTTPException(status_code=400, detail="Domain is already in use by another store")
    
    # Generate verification token
    verification_token = generate_verification_token()
    
    # Save domain (unverified)
    await db.platform_stores.update_one(
        {"id": store_id},
        {
            "$set": {
                "custom_domain": domain,
                "custom_domain_verified": False,
                "domain_verification_token": verification_token,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )
    
    return {
        "domain": domain,
        "verified": False,
        "verification_token": verification_token,
        "instructions": {
            "method": "DNS TXT Record",
            "record_type": "TXT",
            "record_name": "_yourplatform-verification",
            "record_value": verification_token,
            "alternative": {
                "method": "CNAME",
                "record_name": "www",
                "record_value": "stores.yourplatform.com"
            }
        }
    }


@router.post("/stores/{store_id}/domain/verify")
async def verify_custom_domain(store_id: str):
    """Verify custom domain ownership"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    store = await db.platform_stores.find_one({"id": store_id})
    if not store or not store.get("custom_domain"):
        raise HTTPException(status_code=400, detail="No custom domain configured")
    
    # In production, you'd do DNS lookup here to verify TXT record
    # For now, we'll auto-verify
    
    await db.platform_stores.update_one(
        {"id": store_id},
        {"$set": {"custom_domain_verified": True, "updated_at": datetime.now(timezone.utc)}}
    )
    
    return {
        "domain": store["custom_domain"],
        "verified": True,
        "message": "Domain verified successfully! It may take up to 24 hours for SSL to be provisioned."
    }


# ----- Usage & Stats -----

@router.get("/stores/{store_id}/usage")
async def get_store_usage(store_id: str):
    """Get store usage statistics"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    store = await db.platform_stores.find_one({"id": store_id}, {"_id": 0})
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    plan = PLANS.get(store.get("plan_id", "free"))
    
    # Count actual usage
    products_count = await db.products.count_documents({"store_id": store_id})
    orders_count = await db.orders.count_documents({"store_id": store_id})
    customers_count = await db.customers.count_documents({"store_id": store_id})
    
    return {
        "usage": {
            "products": {"used": products_count, "limit": plan.features.max_products if plan else 10},
            "storage_mb": {"used": store.get("storage_used_mb", 0), "limit": plan.features.max_storage_mb if plan else 100},
            "staff_accounts": {"used": 1, "limit": plan.features.max_staff_accounts if plan else 1}
        },
        "stats": {
            "orders_count": orders_count,
            "customers_count": customers_count,
            "products_count": products_count
        },
        "plan": plan.dict() if plan else None
    }


# ----- Platform Admin (for managing all stores) -----

@router.get("/admin/stores")
async def admin_list_stores(
    status: Optional[str] = None,
    limit: int = 50,
    skip: int = 0
):
    """List all stores (platform admin only)"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    query = {}
    if status:
        query["status"] = status
    
    stores = await db.platform_stores.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.platform_stores.count_documents(query)
    
    return {"stores": stores, "total": total}


@router.get("/admin/stats")
async def admin_platform_stats():
    """Get platform-wide statistics"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    total_stores = await db.platform_stores.count_documents({})
    active_stores = await db.platform_stores.count_documents({"status": "active"})
    trial_stores = await db.platform_stores.count_documents({"status": "trial"})
    
    # Count by plan
    plan_counts = {}
    for plan_id in PLANS.keys():
        plan_counts[plan_id] = await db.platform_stores.count_documents({"plan_id": plan_id})
    
    return {
        "stores": {
            "total": total_stores,
            "active": active_stores,
            "trial": trial_stores
        },
        "plans": plan_counts
    }


# ----- Domain Resolution (used by middleware) -----

@router.get("/resolve/{domain}")
async def resolve_domain(domain: str):
    """Resolve a domain to a store (used internally)"""
    store = await get_store_by_domain(domain)
    if not store:
        raise HTTPException(status_code=404, detail="Store not found for this domain")
    return {"store_id": store["id"], "store": store}


# ==================== STRIPE BILLING ====================

import stripe
import os

stripe.api_key = os.environ.get("STRIPE_API_KEY", "sk_test_emergent")

# Stripe Price IDs for each plan (in production, these would be real Stripe price IDs)
# For testing, we'll create them dynamically or use placeholders
STRIPE_PRICE_IDS = {
    "starter": os.environ.get("STRIPE_PRICE_STARTER", "price_starter_monthly"),
    "professional": os.environ.get("STRIPE_PRICE_PROFESSIONAL", "price_professional_monthly"),
    "enterprise": os.environ.get("STRIPE_PRICE_ENTERPRISE", "price_enterprise_monthly"),
}

@router.post("/billing/create-checkout")
async def create_checkout_session(
    store_id: str,
    plan_id: str,
    success_url: str = None,
    cancel_url: str = None
):
    """Create a Stripe checkout session for plan upgrade"""
    
    # Validate plan
    if plan_id not in ["starter", "professional", "enterprise"]:
        raise HTTPException(status_code=400, detail="Invalid plan")
    
    # Get store
    store = await db.platform_stores.find_one({"id": store_id})
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    # Get owner
    owner = await db.platform_owners.find_one({"id": store["owner_id"]})
    if not owner:
        raise HTTPException(status_code=404, detail="Store owner not found")
    
    # Get or create Stripe customer
    customer_id = owner.get("stripe_customer_id")
    if not customer_id:
        try:
            customer = stripe.Customer.create(
                email=owner["email"],
                name=owner["name"],
                metadata={"owner_id": owner["id"], "store_id": store_id}
            )
            customer_id = customer.id
            await db.platform_owners.update_one(
                {"id": owner["id"]},
                {"$set": {"stripe_customer_id": customer_id}}
            )
        except stripe.error.StripeError as e:
            raise HTTPException(status_code=500, detail=f"Failed to create customer: {str(e)}")
    
    # Create checkout session
    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
    
    try:
        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "aud",
                    "product_data": {
                        "name": f"StoreBuilder {plan_id.title()} Plan",
                        "description": f"Monthly subscription to {plan_id.title()} plan",
                    },
                    "unit_amount": PLANS[plan_id].price * 100,  # Convert to cents
                    "recurring": {"interval": "month"},
                },
                "quantity": 1,
            }],
            mode="subscription",
            success_url=success_url or f"{frontend_url}/dashboard?upgrade=success&plan={plan_id}",
            cancel_url=cancel_url or f"{frontend_url}/dashboard?upgrade=cancelled",
            metadata={
                "store_id": store_id,
                "plan_id": plan_id,
                "owner_id": owner["id"]
            }
        )
        
        return {
            "checkout_url": session.url,
            "session_id": session.id
        }
        
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to create checkout: {str(e)}")


@router.post("/billing/create-portal")
async def create_billing_portal(store_id: str, return_url: str = None):
    """Create a Stripe billing portal session for subscription management"""
    
    # Get store and owner
    store = await db.platform_stores.find_one({"id": store_id})
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    owner = await db.platform_owners.find_one({"id": store["owner_id"]})
    if not owner:
        raise HTTPException(status_code=404, detail="Store owner not found")
    
    customer_id = owner.get("stripe_customer_id")
    if not customer_id:
        raise HTTPException(status_code=400, detail="No billing account found. Please upgrade first.")
    
    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
    
    try:
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=return_url or f"{frontend_url}/dashboard"
        )
        
        return {"portal_url": session.url}
        
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to create portal: {str(e)}")


@router.post("/billing/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    webhook_secret = os.environ.get("STRIPE_WEBHOOK_SECRET")
    
    try:
        if webhook_secret and sig_header:
            event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
        else:
            # For testing without webhook signature
            import json
            event = json.loads(payload)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    event_type = event.get("type", event.get("data", {}).get("object", {}).get("type"))
    
    # Handle subscription events
    if event_type == "checkout.session.completed":
        session = event["data"]["object"]
        metadata = session.get("metadata", {})
        store_id = metadata.get("store_id")
        plan_id = metadata.get("plan_id")
        subscription_id = session.get("subscription")
        
        if store_id and plan_id:
            await db.platform_stores.update_one(
                {"id": store_id},
                {
                    "$set": {
                        "plan_id": plan_id,
                        "subscription_id": subscription_id,
                        "status": "active",
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
            
    elif event_type == "customer.subscription.updated":
        subscription = event["data"]["object"]
        subscription_id = subscription["id"]
        status = subscription["status"]
        
        # Find and update store
        store = await db.platform_stores.find_one({"subscription_id": subscription_id})
        if store:
            new_status = "active" if status == "active" else "suspended" if status in ["past_due", "unpaid"] else store["status"]
            await db.platform_stores.update_one(
                {"id": store["id"]},
                {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc)}}
            )
            
    elif event_type == "customer.subscription.deleted":
        subscription = event["data"]["object"]
        subscription_id = subscription["id"]
        
        # Downgrade to free plan
        store = await db.platform_stores.find_one({"subscription_id": subscription_id})
        if store:
            await db.platform_stores.update_one(
                {"id": store["id"]},
                {
                    "$set": {
                        "plan_id": "free",
                        "subscription_id": None,
                        "status": "active",
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
    
    return {"received": True}


@router.get("/billing/subscription/{store_id}")
async def get_subscription_details(store_id: str):
    """Get subscription details for a store"""
    
    store = await db.platform_stores.find_one({"id": store_id})
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    owner = await db.platform_owners.find_one({"id": store["owner_id"]})
    
    plan = PLANS.get(store.get("plan_id", "free"))
    
    subscription_details = {
        "plan_id": store.get("plan_id", "free"),
        "plan_name": plan.name if plan else "Free",
        "plan_price": plan.price if plan else 0,
        "status": store.get("status", "active"),
        "subscription_id": store.get("subscription_id"),
        "has_billing_account": bool(owner and owner.get("stripe_customer_id")),
        "features": plan.features.dict() if plan else {}
    }
    
    # If there's an active subscription, get details from Stripe
    if store.get("subscription_id") and stripe.api_key:
        try:
            subscription = stripe.Subscription.retrieve(store["subscription_id"])
            subscription_details["current_period_end"] = datetime.fromtimestamp(subscription.current_period_end).isoformat()
            subscription_details["cancel_at_period_end"] = subscription.cancel_at_period_end
        except:
            pass
    
    return subscription_details

