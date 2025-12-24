"""
Abandoned Cart Routes - Cart recovery and automation
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import os
import uuid

router = APIRouter(prefix="/api/abandoned-carts", tags=["Abandoned Carts"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'maropost_clone')]


# ==================== MODELS ====================

class AbandonedCart(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: Optional[str] = None
    customer_email: Optional[str] = None
    customer_name: Optional[str] = None
    items: List[Dict[str, Any]] = []
    subtotal: float = 0
    currency: str = "AUD"
    recovery_token: str = Field(default_factory=lambda: uuid.uuid4().hex)
    status: str = "abandoned"  # abandoned, reminded, recovered, expired
    reminder_count: int = 0
    last_reminder_at: Optional[datetime] = None
    recovered_at: Optional[datetime] = None
    recovered_order_id: Optional[str] = None
    discount_offered: Optional[float] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    abandoned_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RecoverySettings(BaseModel):
    id: str = "recovery_settings"
    is_enabled: bool = True
    first_reminder_hours: int = 1
    second_reminder_hours: int = 24
    third_reminder_hours: int = 72
    offer_discount: bool = False
    discount_percentage: float = 10
    discount_on_reminder: int = 2  # Which reminder to offer discount on
    min_cart_value: float = 0
    exclude_products: List[str] = []
    email_subject_1: str = "You left something behind!"
    email_subject_2: str = "Still thinking about it?"
    email_subject_3: str = "Last chance! {{discount}}% off your cart"


class RecoveryStats(BaseModel):
    total_abandoned: int = 0
    total_value: float = 0
    recovered_count: int = 0
    recovered_value: float = 0
    recovery_rate: float = 0
    avg_cart_value: float = 0


# ==================== ROUTES ====================

@router.get("")
async def get_abandoned_carts(
    status: Optional[str] = None,
    min_value: Optional[float] = None,
    days: int = 30,
    skip: int = 0,
    limit: int = 50
):
    """Get all abandoned carts"""
    query = {}
    
    # Only get carts from last N days
    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    query["abandoned_at"] = {"$gte": start_date.isoformat()}
    
    if status:
        query["status"] = status
    if min_value:
        query["subtotal"] = {"$gte": min_value}
    
    carts = await db.abandoned_carts.find(query, {"_id": 0}).sort("abandoned_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.abandoned_carts.count_documents(query)
    
    return {"carts": carts, "total": total}

@router.get("/stats")
async def get_recovery_stats(days: int = 30):
    """Get abandoned cart recovery statistics"""
    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    query = {"abandoned_at": {"$gte": start_date.isoformat()}}
    
    carts = await db.abandoned_carts.find(query, {"_id": 0}).to_list(10000)
    
    total_abandoned = len(carts)
    total_value = sum(c.get("subtotal", 0) for c in carts)
    recovered = [c for c in carts if c.get("status") == "recovered"]
    recovered_count = len(recovered)
    recovered_value = sum(c.get("subtotal", 0) for c in recovered)
    
    return RecoveryStats(
        total_abandoned=total_abandoned,
        total_value=round(total_value, 2),
        recovered_count=recovered_count,
        recovered_value=round(recovered_value, 2),
        recovery_rate=round((recovered_count / total_abandoned) * 100, 1) if total_abandoned > 0 else 0,
        avg_cart_value=round(total_value / total_abandoned, 2) if total_abandoned > 0 else 0
    ).dict()

@router.get("/settings")
async def get_recovery_settings():
    """Get cart recovery settings"""
    settings = await db.recovery_settings.find_one({"id": "recovery_settings"}, {"_id": 0})
    if not settings:
        settings = RecoverySettings().dict()
        await db.recovery_settings.insert_one(settings)
    return settings

@router.put("/settings")
async def update_recovery_settings(settings: Dict[str, Any]):
    """Update cart recovery settings"""
    await db.recovery_settings.update_one(
        {"id": "recovery_settings"},
        {"$set": settings},
        upsert=True
    )
    return await db.recovery_settings.find_one({"id": "recovery_settings"}, {"_id": 0})

@router.get("/{cart_id}")
async def get_abandoned_cart(cart_id: str):
    """Get a specific abandoned cart"""
    cart = await db.abandoned_carts.find_one({"id": cart_id}, {"_id": 0})
    if not cart:
        cart = await db.abandoned_carts.find_one({"recovery_token": cart_id}, {"_id": 0})
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    # Enrich with product details
    for item in cart.get("items", []):
        product = await db.products.find_one({"id": item.get("product_id")}, {"_id": 0, "name": 1, "image": 1, "price": 1})
        if product:
            item["product"] = product
    
    return cart

@router.post("")
async def track_abandoned_cart(
    customer_email: Optional[str] = None,
    customer_name: Optional[str] = None,
    customer_id: Optional[str] = None,
    items: List[Dict[str, Any]] = []
):
    """Track a new abandoned cart"""
    if not items:
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    # Calculate subtotal
    subtotal = sum(item.get("price", 0) * item.get("quantity", 1) for item in items)
    
    # Check for existing cart from same customer
    query = {}
    if customer_id:
        query["customer_id"] = customer_id
    elif customer_email:
        query["customer_email"] = customer_email
    
    if query:
        query["status"] = "abandoned"
        existing = await db.abandoned_carts.find_one(query)
        if existing:
            # Update existing cart
            await db.abandoned_carts.update_one(
                {"id": existing["id"]},
                {"$set": {
                    "items": items,
                    "subtotal": subtotal,
                    "abandoned_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            return await db.abandoned_carts.find_one({"id": existing["id"]}, {"_id": 0})
    
    # Create new abandoned cart
    cart = AbandonedCart(
        customer_id=customer_id,
        customer_email=customer_email,
        customer_name=customer_name,
        items=items,
        subtotal=subtotal
    )
    
    await db.abandoned_carts.insert_one(cart.dict())
    return cart

@router.post("/{cart_id}/send-reminder")
async def send_cart_reminder(cart_id: str, include_discount: bool = False):
    """Manually send a cart reminder email"""
    cart = await db.abandoned_carts.find_one({"id": cart_id})
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    if not cart.get("customer_email"):
        raise HTTPException(status_code=400, detail="No email address for this cart")
    
    # Get settings
    settings = await get_recovery_settings()
    
    # Update cart
    update_data = {
        "reminder_count": cart.get("reminder_count", 0) + 1,
        "last_reminder_at": datetime.now(timezone.utc).isoformat(),
        "status": "reminded"
    }
    
    if include_discount and settings.get("offer_discount"):
        update_data["discount_offered"] = settings.get("discount_percentage", 10)
    
    await db.abandoned_carts.update_one({"id": cart_id}, {"$set": update_data})
    
    # In a real implementation, this would send an email
    # For now, return success
    return {
        "success": True,
        "message": "Reminder email queued",
        "discount_offered": update_data.get("discount_offered")
    }

@router.post("/{cart_id}/recover")
async def mark_cart_recovered(cart_id: str, order_id: str):
    """Mark a cart as recovered"""
    cart = await db.abandoned_carts.find_one({"id": cart_id})
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    await db.abandoned_carts.update_one(
        {"id": cart_id},
        {"$set": {
            "status": "recovered",
            "recovered_at": datetime.now(timezone.utc).isoformat(),
            "recovered_order_id": order_id
        }}
    )
    
    return {"success": True}

@router.post("/recover-by-token/{token}")
async def recover_cart_by_token(token: str):
    """Get cart details by recovery token (for recovery link)"""
    cart = await db.abandoned_carts.find_one({"recovery_token": token, "status": {"$ne": "recovered"}}, {"_id": 0})
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found or already recovered")
    
    # Enrich with product details
    for item in cart.get("items", []):
        product = await db.products.find_one({"id": item.get("product_id")}, {"_id": 0})
        if product:
            item["product"] = product
    
    return cart

@router.delete("/{cart_id}")
async def delete_abandoned_cart(cart_id: str):
    """Delete an abandoned cart"""
    result = await db.abandoned_carts.delete_one({"id": cart_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cart not found")
    return {"success": True}

@router.post("/cleanup")
async def cleanup_old_carts(days: int = 90):
    """Delete carts older than specified days"""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db.abandoned_carts.delete_many({
        "abandoned_at": {"$lt": cutoff.isoformat()},
        "status": {"$ne": "recovered"}
    })
    return {"deleted": result.deleted_count}

@router.get("/by-email/{email}")
async def get_carts_by_email(email: str):
    """Get all abandoned carts for an email"""
    carts = await db.abandoned_carts.find(
        {"customer_email": email, "status": "abandoned"}, {"_id": 0}
    ).sort("abandoned_at", -1).to_list(10)
    return {"carts": carts}
