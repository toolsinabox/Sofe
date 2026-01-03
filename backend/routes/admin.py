"""
Comprehensive Admin Routes for Celora Platform
Full store management, analytics, activity logging, and platform settings
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Header
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from jose import jwt, JWTError
from passlib.context import CryptContext
import hashlib
import os
import uuid

router = APIRouter(prefix="/admin", tags=["admin"])

# Database connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'test_database')]

# JWT Settings
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'maropost-clone-super-secret-key-change-in-production')
ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Pydantic Models
class AdminLogin(BaseModel):
    email: str
    password: str

class StoreUpdate(BaseModel):
    store_name: Optional[str] = None
    status: Optional[str] = None
    plan_id: Optional[str] = None
    custom_domain: Optional[str] = None

class AnnouncementCreate(BaseModel):
    title: str
    message: str
    type: str = "info"  # info, warning, success, error
    active: bool = True
    expires_at: Optional[datetime] = None

class FeatureFlagUpdate(BaseModel):
    feature_name: str
    enabled: bool
    description: Optional[str] = None

class PasswordResetRequest(BaseModel):
    new_password: str


# Dependency: Get authenticated admin
async def get_current_admin(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        role = payload.get("role")
        
        if role not in ["admin", "super_admin"]:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Verify admin exists
        admin = await db.admins.find_one({"id": user_id}, {"_id": 0})
        if not admin:
            # Also check users collection for super_admin
            admin = await db.users.find_one({"id": user_id, "role": {"$in": ["admin", "super_admin"]}}, {"_id": 0})
        
        if not admin:
            raise HTTPException(status_code=401, detail="Admin not found")
        
        return admin
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password - supports both bcrypt and SHA256"""
    # Try bcrypt first
    try:
        if pwd_context.verify(plain_password, hashed_password):
            return True
    except:
        pass
    
    # Try SHA256
    sha256_hash = hashlib.sha256(plain_password.encode()).hexdigest()
    return sha256_hash == hashed_password


def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(days=7))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# ==================== AUTHENTICATION ====================

@router.post("/auth/login")
async def admin_login(email: str, password: str):
    """Admin login with exclusive access check"""
    
    # Check admins collection first
    admin = await db.admins.find_one({"email": email.lower()}, {"_id": 0})
    
    if not admin:
        # Also check users with super_admin role
        admin = await db.users.find_one(
            {"email": email.lower(), "role": {"$in": ["admin", "super_admin"]}},
            {"_id": 0}
        )
    
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid credentials - Admin access denied")
    
    # Verify password
    if not verify_password(password, admin.get("hashed_password", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Log activity
    await db.admin_activity_log.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": admin.get("id"),
        "admin_email": admin.get("email"),
        "action": "login",
        "details": {"ip": "system"},
        "timestamp": datetime.now(timezone.utc)
    })
    
    # Update last login
    await db.admins.update_one(
        {"email": email.lower()},
        {"$set": {"last_login": datetime.now(timezone.utc)}}
    )
    
    # Create token
    token = create_access_token(data={
        "sub": admin.get("id"),
        "role": admin.get("role", "admin"),
        "email": admin.get("email"),
        "is_admin": True
    })
    
    return {
        "token": token,
        "admin": {
            "id": admin.get("id"),
            "email": admin.get("email"),
            "name": admin.get("name", "Admin"),
            "role": admin.get("role", "admin")
        }
    }


# ==================== PLATFORM ANALYTICS ====================

@router.get("/analytics/overview")
async def get_analytics_overview(admin: dict = Depends(get_current_admin)):
    """Get comprehensive platform analytics"""
    
    # Store counts
    total_stores = await db.platform_stores.count_documents({})
    active_stores = await db.platform_stores.count_documents({"status": "active"})
    trial_stores = await db.platform_stores.count_documents({"status": "trial"})
    suspended_stores = await db.platform_stores.count_documents({"status": "suspended"})
    
    # Plan distribution
    plans = {}
    for plan in ["free", "starter", "professional", "enterprise"]:
        plans[plan] = await db.platform_stores.count_documents({"plan_id": plan})
    
    # Total metrics
    total_products = await db.products.count_documents({})
    total_orders = await db.orders.count_documents({})
    total_customers = await db.customers.count_documents({})
    total_users = await db.platform_owners.count_documents({})
    
    # Revenue calculation
    pipeline = [
        {"$match": {"payment_status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ]
    revenue_result = await db.orders.aggregate(pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    # Monthly revenue trend (last 12 months)
    monthly_revenue = []
    for i in range(11, -1, -1):
        date = datetime.now(timezone.utc) - timedelta(days=30 * i)
        start_of_month = date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if i > 0:
            end_of_month = (start_of_month + timedelta(days=32)).replace(day=1) - timedelta(seconds=1)
        else:
            end_of_month = datetime.now(timezone.utc)
        
        pipeline = [
            {"$match": {
                "payment_status": "paid",
                "created_at": {"$gte": start_of_month, "$lte": end_of_month}
            }},
            {"$group": {"_id": None, "total": {"$sum": "$total"}}}
        ]
        result = await db.orders.aggregate(pipeline).to_list(1)
        monthly_revenue.append({
            "month": start_of_month.strftime("%b"),
            "revenue": result[0]["total"] if result else 0
        })
    
    # MRR calculation
    mrr = (plans.get("starter", 0) * 29) + (plans.get("professional", 0) * 79) + (plans.get("enterprise", 0) * 299)
    
    # Top performing stores
    top_stores_pipeline = [
        {"$match": {"payment_status": "paid"}},
        {"$group": {"_id": "$store_id", "revenue": {"$sum": "$total"}, "orders": {"$sum": 1}}},
        {"$sort": {"revenue": -1}},
        {"$limit": 10}
    ]
    top_stores_raw = await db.orders.aggregate(top_stores_pipeline).to_list(10)
    
    top_stores = []
    for store in top_stores_raw:
        store_info = await db.platform_stores.find_one({"id": store["_id"]}, {"_id": 0, "store_name": 1, "subdomain": 1})
        if store_info:
            top_stores.append({
                "store_id": store["_id"],
                "store_name": store_info.get("store_name", "Unknown"),
                "subdomain": store_info.get("subdomain", ""),
                "revenue": store["revenue"],
                "orders": store["orders"]
            })
    
    return {
        "stores": {
            "total": total_stores,
            "active": active_stores,
            "trial": trial_stores,
            "suspended": suspended_stores,
            "by_plan": plans
        },
        "metrics": {
            "total_products": total_products,
            "total_orders": total_orders,
            "total_customers": total_customers,
            "total_users": total_users,
            "total_revenue": total_revenue,
            "mrr": mrr
        },
        "monthly_revenue": monthly_revenue,
        "top_stores": top_stores
    }


@router.get("/analytics/stores/{store_id}")
async def get_store_analytics(store_id: str, admin: dict = Depends(get_current_admin)):
    """Get detailed analytics for a specific store"""
    
    store = await db.platform_stores.find_one({"id": store_id}, {"_id": 0})
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    # Store metrics
    products = await db.products.count_documents({"store_id": store_id})
    orders = await db.orders.count_documents({"store_id": store_id})
    customers = await db.customers.count_documents({"store_id": store_id})
    
    # Revenue
    pipeline = [
        {"$match": {"store_id": store_id, "payment_status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ]
    revenue_result = await db.orders.aggregate(pipeline).to_list(1)
    revenue = revenue_result[0]["total"] if revenue_result else 0
    
    # Recent orders
    recent_orders = await db.orders.find(
        {"store_id": store_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    # Top products
    top_products_pipeline = [
        {"$match": {"store_id": store_id}},
        {"$unwind": "$items"},
        {"$group": {"_id": "$items.product_id", "quantity": {"$sum": "$items.quantity"}, "revenue": {"$sum": {"$multiply": ["$items.price", "$items.quantity"]}}}},
        {"$sort": {"revenue": -1}},
        {"$limit": 5}
    ]
    top_products = await db.orders.aggregate(top_products_pipeline).to_list(5)
    
    return {
        "store": store,
        "metrics": {
            "products": products,
            "orders": orders,
            "customers": customers,
            "revenue": revenue
        },
        "recent_orders": recent_orders,
        "top_products": top_products
    }


# ==================== STORE MANAGEMENT ====================

@router.get("/stores")
async def get_all_stores(
    status: Optional[str] = None,
    plan_id: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(default=50, le=100),
    skip: int = 0,
    admin: dict = Depends(get_current_admin)
):
    """Get all stores with full details"""
    
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
    
    enriched = []
    for store in stores:
        owner = await db.platform_owners.find_one({"id": store.get("owner_id")}, {"_id": 0, "email": 1, "name": 1})
        
        products = await db.products.count_documents({"store_id": store["id"]})
        orders = await db.orders.count_documents({"store_id": store["id"]})
        customers = await db.customers.count_documents({"store_id": store["id"]})
        
        pipeline = [
            {"$match": {"store_id": store["id"], "payment_status": "paid"}},
            {"$group": {"_id": None, "total": {"$sum": "$total"}}}
        ]
        rev = await db.orders.aggregate(pipeline).to_list(1)
        
        enriched.append({
            **store,
            "owner_name": owner.get("name") if owner else "Unknown",
            "owner_email": owner.get("email") if owner else "Unknown",
            "product_count": products,
            "order_count": orders,
            "customer_count": customers,
            "revenue": rev[0]["total"] if rev else 0
        })
    
    return enriched


@router.get("/stores/{store_id}")
async def get_store_details(store_id: str, admin: dict = Depends(get_current_admin)):
    """Get complete store details for editing"""
    
    store = await db.platform_stores.find_one({"id": store_id}, {"_id": 0})
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    owner = await db.platform_owners.find_one({"id": store.get("owner_id")}, {"_id": 0})
    
    # Get all store data
    products = await db.products.find({"store_id": store_id}, {"_id": 0}).to_list(1000)
    orders = await db.orders.find({"store_id": store_id}, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)
    customers = await db.customers.find({"store_id": store_id}, {"_id": 0}).to_list(500)
    categories = await db.categories.find({"store_id": store_id}, {"_id": 0}).to_list(100)
    
    return {
        "store": store,
        "owner": owner,
        "products": products,
        "orders": orders,
        "customers": customers,
        "categories": categories
    }


@router.put("/stores/{store_id}")
async def update_store(store_id: str, update: StoreUpdate, admin: dict = Depends(get_current_admin)):
    """Update store settings"""
    
    store = await db.platform_stores.find_one({"id": store_id})
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.platform_stores.update_one({"id": store_id}, {"$set": update_data})
    
    # Log activity
    await db.admin_activity_log.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": admin.get("id"),
        "admin_email": admin.get("email"),
        "action": "update_store",
        "details": {"store_id": store_id, "changes": update_data},
        "timestamp": datetime.now(timezone.utc)
    })
    
    return {"success": True, "message": "Store updated"}


@router.post("/stores/{store_id}/suspend")
async def suspend_store(store_id: str, admin: dict = Depends(get_current_admin)):
    """Suspend a store"""
    
    await db.platform_stores.update_one(
        {"id": store_id},
        {"$set": {"status": "suspended", "suspended_at": datetime.now(timezone.utc)}}
    )
    
    await db.admin_activity_log.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": admin.get("id"),
        "admin_email": admin.get("email"),
        "action": "suspend_store",
        "details": {"store_id": store_id},
        "timestamp": datetime.now(timezone.utc)
    })
    
    return {"success": True, "message": "Store suspended"}


@router.post("/stores/{store_id}/activate")
async def activate_store(store_id: str, admin: dict = Depends(get_current_admin)):
    """Activate a store"""
    
    await db.platform_stores.update_one(
        {"id": store_id},
        {"$set": {"status": "active"}, "$unset": {"suspended_at": ""}}
    )
    
    await db.admin_activity_log.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": admin.get("id"),
        "admin_email": admin.get("email"),
        "action": "activate_store",
        "details": {"store_id": store_id},
        "timestamp": datetime.now(timezone.utc)
    })
    
    return {"success": True, "message": "Store activated"}


@router.post("/stores/{store_id}/impersonate")
async def impersonate_store_owner(store_id: str, admin: dict = Depends(get_current_admin)):
    """Generate token to login as store owner"""
    
    store = await db.platform_stores.find_one({"id": store_id}, {"_id": 0})
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    owner = await db.platform_owners.find_one({"id": store.get("owner_id")}, {"_id": 0})
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")
    
    # Create merchant token
    token = create_access_token(data={
        "sub": owner["id"],
        "email": owner["email"],
        "role": "merchant",
        "store_id": store_id,
        "impersonated_by": admin.get("email")
    })
    
    await db.admin_activity_log.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": admin.get("id"),
        "admin_email": admin.get("email"),
        "action": "impersonate",
        "details": {"store_id": store_id, "owner_email": owner["email"]},
        "timestamp": datetime.now(timezone.utc)
    })
    
    return {
        "token": token,
        "store": store,
        "owner": {
            "id": owner["id"],
            "email": owner["email"],
            "name": owner.get("name")
        }
    }


@router.post("/stores/{store_id}/reset-password")
async def reset_store_owner_password(store_id: str, data: PasswordResetRequest, admin: dict = Depends(get_current_admin)):
    """Reset store owner's password"""
    
    store = await db.platform_stores.find_one({"id": store_id})
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    owner_id = store.get("owner_id")
    hashed = pwd_context.hash(data.new_password)
    
    await db.platform_owners.update_one(
        {"id": owner_id},
        {"$set": {"hashed_password": hashed}}
    )
    
    await db.admin_activity_log.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": admin.get("id"),
        "admin_email": admin.get("email"),
        "action": "reset_password",
        "details": {"store_id": store_id, "owner_id": owner_id},
        "timestamp": datetime.now(timezone.utc)
    })
    
    return {"success": True, "message": "Password reset successfully"}


# ==================== STORE DATA EDITING ====================

@router.put("/stores/{store_id}/products/{product_id}")
async def update_store_product(store_id: str, product_id: str, product_data: dict, admin: dict = Depends(get_current_admin)):
    """Edit any product in any store"""
    
    product_data["updated_at"] = datetime.now(timezone.utc)
    product_data["updated_by_admin"] = admin.get("email")
    
    result = await db.products.update_one(
        {"id": product_id, "store_id": store_id},
        {"$set": product_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return {"success": True, "message": "Product updated"}


@router.delete("/stores/{store_id}/products/{product_id}")
async def delete_store_product(store_id: str, product_id: str, admin: dict = Depends(get_current_admin)):
    """Delete any product from any store"""
    
    result = await db.products.delete_one({"id": product_id, "store_id": store_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    await db.admin_activity_log.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": admin.get("id"),
        "admin_email": admin.get("email"),
        "action": "delete_product",
        "details": {"store_id": store_id, "product_id": product_id},
        "timestamp": datetime.now(timezone.utc)
    })
    
    return {"success": True, "message": "Product deleted"}


@router.put("/stores/{store_id}/orders/{order_id}")
async def update_store_order(store_id: str, order_id: str, order_data: dict, admin: dict = Depends(get_current_admin)):
    """Edit any order in any store"""
    
    order_data["updated_at"] = datetime.now(timezone.utc)
    order_data["updated_by_admin"] = admin.get("email")
    
    result = await db.orders.update_one(
        {"id": order_id, "store_id": store_id},
        {"$set": order_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {"success": True, "message": "Order updated"}


# ==================== USER MANAGEMENT ====================

@router.get("/users")
async def get_all_users(
    role: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(default=50, le=100),
    admin: dict = Depends(get_current_admin)
):
    """Get all platform users (owners)"""
    
    query = {}
    if search:
        query["$or"] = [
            {"email": {"$regex": search, "$options": "i"}},
            {"name": {"$regex": search, "$options": "i"}}
        ]
    
    owners = await db.platform_owners.find(query, {"_id": 0, "hashed_password": 0}).limit(limit).to_list(limit)
    
    enriched = []
    for owner in owners:
        stores = await db.platform_stores.find(
            {"owner_id": owner["id"]},
            {"_id": 0, "id": 1, "store_name": 1, "subdomain": 1, "status": 1}
        ).to_list(10)
        
        enriched.append({
            **owner,
            "stores": stores,
            "store_count": len(stores)
        })
    
    return enriched


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(get_current_admin)):
    """Delete a platform user"""
    
    # Get user's stores
    stores = await db.platform_stores.find({"owner_id": user_id}, {"id": 1}).to_list(100)
    
    # Delete user
    await db.platform_owners.delete_one({"id": user_id})
    
    # Optionally delete their stores too
    for store in stores:
        await db.platform_stores.update_one(
            {"id": store["id"]},
            {"$set": {"status": "suspended", "owner_deleted": True}}
        )
    
    await db.admin_activity_log.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": admin.get("id"),
        "admin_email": admin.get("email"),
        "action": "delete_user",
        "details": {"user_id": user_id},
        "timestamp": datetime.now(timezone.utc)
    })
    
    return {"success": True, "message": "User deleted"}


# ==================== ACTIVITY LOG ====================

@router.get("/activity-log")
async def get_activity_log(
    action: Optional[str] = None,
    admin_email: Optional[str] = None,
    limit: int = Query(default=100, le=500),
    admin: dict = Depends(get_current_admin)
):
    """Get admin activity log"""
    
    query = {}
    if action:
        query["action"] = action
    if admin_email:
        query["admin_email"] = admin_email
    
    logs = await db.admin_activity_log.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    
    return logs


@router.get("/login-history")
async def get_login_history(limit: int = Query(default=50, le=200), admin: dict = Depends(get_current_admin)):
    """Get platform-wide login history"""
    
    # Get from activity log
    logins = await db.admin_activity_log.find(
        {"action": "login"},
        {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    
    # Also get merchant logins
    merchant_logins = await db.platform_sessions.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {
        "admin_logins": logins,
        "merchant_logins": merchant_logins
    }


# ==================== ANNOUNCEMENTS ====================

@router.get("/announcements")
async def get_announcements(admin: dict = Depends(get_current_admin)):
    """Get all platform announcements"""
    
    announcements = await db.platform_announcements.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return announcements


@router.post("/announcements")
async def create_announcement(data: AnnouncementCreate, admin: dict = Depends(get_current_admin)):
    """Create platform announcement"""
    
    announcement = {
        "id": str(uuid.uuid4()),
        "title": data.title,
        "message": data.message,
        "type": data.type,
        "active": data.active,
        "expires_at": data.expires_at,
        "created_by": admin.get("email"),
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.platform_announcements.insert_one(announcement)
    
    return {"success": True, "id": announcement["id"]}


@router.put("/announcements/{announcement_id}")
async def update_announcement(announcement_id: str, data: dict, admin: dict = Depends(get_current_admin)):
    """Update announcement"""
    
    data["updated_at"] = datetime.now(timezone.utc)
    await db.platform_announcements.update_one({"id": announcement_id}, {"$set": data})
    
    return {"success": True}


@router.delete("/announcements/{announcement_id}")
async def delete_announcement(announcement_id: str, admin: dict = Depends(get_current_admin)):
    """Delete announcement"""
    
    await db.platform_announcements.delete_one({"id": announcement_id})
    return {"success": True}


# ==================== FEATURE FLAGS ====================

@router.get("/feature-flags")
async def get_feature_flags(admin: dict = Depends(get_current_admin)):
    """Get all feature flags"""
    
    flags = await db.feature_flags.find({}, {"_id": 0}).to_list(100)
    
    # Default flags if none exist
    if not flags:
        default_flags = [
            {"name": "new_checkout", "enabled": True, "description": "New checkout flow"},
            {"name": "ai_product_descriptions", "enabled": False, "description": "AI-generated product descriptions"},
            {"name": "multi_currency", "enabled": True, "description": "Multi-currency support"},
            {"name": "advanced_analytics", "enabled": True, "description": "Advanced analytics dashboard"},
            {"name": "email_marketing", "enabled": True, "description": "Email marketing features"},
            {"name": "pos_system", "enabled": True, "description": "Point of Sale system"},
        ]
        for flag in default_flags:
            flag["id"] = str(uuid.uuid4())
            await db.feature_flags.insert_one(flag)
        flags = default_flags
    
    return flags


@router.put("/feature-flags/{flag_name}")
async def update_feature_flag(flag_name: str, data: FeatureFlagUpdate, admin: dict = Depends(get_current_admin)):
    """Update feature flag"""
    
    await db.feature_flags.update_one(
        {"name": flag_name},
        {"$set": {"enabled": data.enabled, "updated_at": datetime.now(timezone.utc)}},
        upsert=True
    )
    
    await db.admin_activity_log.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": admin.get("id"),
        "admin_email": admin.get("email"),
        "action": "update_feature_flag",
        "details": {"flag": flag_name, "enabled": data.enabled},
        "timestamp": datetime.now(timezone.utc)
    })
    
    return {"success": True}


# ==================== PLATFORM SETTINGS ====================

@router.get("/settings")
async def get_platform_settings(admin: dict = Depends(get_current_admin)):
    """Get platform settings"""
    
    settings = await db.platform_settings.find_one({}, {"_id": 0})
    
    if not settings:
        settings = {
            "id": "platform_settings",
            "platform_name": "Celora",
            "support_email": "support@getcelora.com",
            "default_plan": "free",
            "trial_days": 14,
            "maintenance_mode": False,
            "allow_signups": True,
            "require_email_verification": True,
            "max_stores_per_user": 5,
            "default_currency": "USD",
            "smtp_configured": False,
            "stripe_configured": True
        }
        await db.platform_settings.insert_one(settings)
    
    return settings


@router.put("/settings")
async def update_platform_settings(data: dict, admin: dict = Depends(get_current_admin)):
    """Update platform settings"""
    
    data["updated_at"] = datetime.now(timezone.utc)
    data["updated_by"] = admin.get("email")
    
    await db.platform_settings.update_one(
        {"id": "platform_settings"},
        {"$set": data},
        upsert=True
    )
    
    await db.admin_activity_log.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": admin.get("id"),
        "admin_email": admin.get("email"),
        "action": "update_settings",
        "details": data,
        "timestamp": datetime.now(timezone.utc)
    })
    
    return {"success": True}
