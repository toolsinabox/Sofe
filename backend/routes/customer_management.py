"""
Customer Management Routes - Customer Groups, Wishlists, Communication
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import os
import uuid

router = APIRouter(prefix="/api/customers", tags=["Customers"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'maropost_clone')]


# ==================== CUSTOMER GROUP MODELS ====================

class CustomerGroup(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    discount_percentage: float = 0  # Automatic discount for group
    min_order_discount: float = 0  # Min order value for discount
    free_shipping: bool = False
    free_shipping_threshold: Optional[float] = None
    tax_exempt: bool = False
    wholesale_pricing: bool = False
    priority_support: bool = False
    exclusive_products: List[str] = []  # Product IDs only this group can see/buy
    hidden_from_registration: bool = False  # Admin assigns only
    color: str = "#6B7280"
    member_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CustomerGroupCreate(BaseModel):
    name: str
    description: Optional[str] = None
    discount_percentage: float = 0
    free_shipping: bool = False
    free_shipping_threshold: Optional[float] = None
    tax_exempt: bool = False
    wholesale_pricing: bool = False
    priority_support: bool = False
    color: str = "#6B7280"


# ==================== WISHLIST MODELS ====================

class WishlistItem(BaseModel):
    product_id: str
    added_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    notes: Optional[str] = None
    priority: int = 0  # 0 = normal, 1 = high, 2 = must have

class Wishlist(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    name: str = "My Wishlist"
    items: List[WishlistItem] = []
    is_public: bool = False
    share_token: str = Field(default_factory=lambda: uuid.uuid4().hex[:12])
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None


# ==================== CUSTOMER NOTES/TAGS ====================

class CustomerNote(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    content: str
    type: str = "note"  # note, warning, follow_up, complaint
    is_pinned: bool = False
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CustomerTag(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    color: str = "#6B7280"
    description: Optional[str] = None
    auto_assign_rules: Optional[Dict[str, Any]] = None  # Rules for auto-assignment


# ==================== CUSTOMER GROUP ROUTES ====================

@router.get("/groups")
async def get_customer_groups():
    """Get all customer groups"""
    groups = await db.customer_groups.find({}, {"_id": 0}).to_list(100)
    
    # Update member counts
    for group in groups:
        count = await db.customers.count_documents({"group_id": group["id"]})
        group["member_count"] = count
    
    return {"groups": groups}

@router.get("/groups/{group_id}")
async def get_customer_group(group_id: str):
    """Get a specific customer group"""
    group = await db.customer_groups.find_one({"id": group_id}, {"_id": 0})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Get members
    members = await db.customers.find({"group_id": group_id}, {"_id": 0}).limit(100).to_list(100)
    group["members"] = members
    group["member_count"] = len(members)
    
    return group

@router.post("/groups")
async def create_customer_group(group: CustomerGroupCreate):
    """Create a new customer group"""
    new_group = CustomerGroup(**group.dict())
    await db.customer_groups.insert_one(new_group.dict())
    return new_group

@router.put("/groups/{group_id}")
async def update_customer_group(group_id: str, update: Dict[str, Any]):
    """Update a customer group"""
    result = await db.customer_groups.update_one({"id": group_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Group not found")
    return await db.customer_groups.find_one({"id": group_id}, {"_id": 0})

@router.delete("/groups/{group_id}")
async def delete_customer_group(group_id: str):
    """Delete a customer group"""
    # Remove customers from this group
    await db.customers.update_many({"group_id": group_id}, {"$unset": {"group_id": ""}})
    
    result = await db.customer_groups.delete_one({"id": group_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Group not found")
    return {"success": True}

@router.post("/groups/{group_id}/members")
async def add_members_to_group(group_id: str, customer_ids: List[str]):
    """Add customers to a group"""
    group = await db.customer_groups.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    result = await db.customers.update_many(
        {"id": {"$in": customer_ids}},
        {"$set": {"group_id": group_id}}
    )
    
    return {"success": True, "updated": result.modified_count}

@router.delete("/groups/{group_id}/members/{customer_id}")
async def remove_member_from_group(group_id: str, customer_id: str):
    """Remove a customer from a group"""
    result = await db.customers.update_one(
        {"id": customer_id, "group_id": group_id},
        {"$unset": {"group_id": ""}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Customer not in group")
    return {"success": True}


# ==================== WISHLIST ROUTES ====================

@router.get("/wishlists")
async def get_all_wishlists(
    customer_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
):
    """Get all wishlists (admin view)"""
    query = {}
    if customer_id:
        query["customer_id"] = customer_id
    
    wishlists = await db.wishlists.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    
    # Enrich with customer and product details
    for wishlist in wishlists:
        customer = await db.customers.find_one({"id": wishlist["customer_id"]}, {"_id": 0, "name": 1, "email": 1})
        wishlist["customer"] = customer
        
        for item in wishlist.get("items", []):
            product = await db.products.find_one({"id": item["product_id"]}, {"_id": 0, "name": 1, "price": 1, "image": 1, "stock": 1})
            item["product"] = product
    
    total = await db.wishlists.count_documents(query)
    return {"wishlists": wishlists, "total": total}

@router.get("/wishlists/{wishlist_id}")
async def get_wishlist(wishlist_id: str):
    """Get a specific wishlist"""
    wishlist = await db.wishlists.find_one({"id": wishlist_id}, {"_id": 0})
    if not wishlist:
        # Try by share token
        wishlist = await db.wishlists.find_one({"share_token": wishlist_id}, {"_id": 0})
    if not wishlist:
        raise HTTPException(status_code=404, detail="Wishlist not found")
    
    # Enrich with product details
    for item in wishlist.get("items", []):
        product = await db.products.find_one({"id": item["product_id"]}, {"_id": 0})
        item["product"] = product
    
    return wishlist

@router.get("/{customer_id}/wishlists")
async def get_customer_wishlists(customer_id: str):
    """Get all wishlists for a customer"""
    wishlists = await db.wishlists.find({"customer_id": customer_id}, {"_id": 0}).to_list(100)
    
    for wishlist in wishlists:
        for item in wishlist.get("items", []):
            product = await db.products.find_one({"id": item["product_id"]}, {"_id": 0, "name": 1, "price": 1, "image": 1, "stock": 1})
            item["product"] = product
    
    return {"wishlists": wishlists}

@router.post("/{customer_id}/wishlists")
async def create_wishlist(customer_id: str, name: str = "My Wishlist"):
    """Create a new wishlist for a customer"""
    wishlist = Wishlist(customer_id=customer_id, name=name)
    await db.wishlists.insert_one(wishlist.dict())
    return wishlist

@router.post("/{customer_id}/wishlists/{wishlist_id}/items")
async def add_item_to_wishlist(customer_id: str, wishlist_id: str, product_id: str, notes: Optional[str] = None):
    """Add an item to a wishlist"""
    wishlist = await db.wishlists.find_one({"id": wishlist_id, "customer_id": customer_id})
    if not wishlist:
        raise HTTPException(status_code=404, detail="Wishlist not found")
    
    # Check if product already in wishlist
    existing_items = [i["product_id"] for i in wishlist.get("items", [])]
    if product_id in existing_items:
        raise HTTPException(status_code=400, detail="Product already in wishlist")
    
    item = WishlistItem(product_id=product_id, notes=notes)
    
    await db.wishlists.update_one(
        {"id": wishlist_id},
        {"$push": {"items": item.dict()}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True}

@router.delete("/{customer_id}/wishlists/{wishlist_id}/items/{product_id}")
async def remove_item_from_wishlist(customer_id: str, wishlist_id: str, product_id: str):
    """Remove an item from a wishlist"""
    result = await db.wishlists.update_one(
        {"id": wishlist_id, "customer_id": customer_id},
        {"$pull": {"items": {"product_id": product_id}}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Wishlist not found")
    return {"success": True}

@router.post("/wishlists/{wishlist_id}/send-reminder")
async def send_wishlist_reminder(wishlist_id: str):
    """Send a reminder email about wishlist items"""
    wishlist = await db.wishlists.find_one({"id": wishlist_id}, {"_id": 0})
    if not wishlist:
        raise HTTPException(status_code=404, detail="Wishlist not found")
    
    # In a real implementation, this would send an email
    # For now, just return success
    return {"success": True, "message": "Reminder email queued"}


# ==================== CUSTOMER NOTES ROUTES ====================

@router.get("/{customer_id}/notes")
async def get_customer_notes(customer_id: str):
    """Get all notes for a customer"""
    notes = await db.customer_notes.find({"customer_id": customer_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"notes": notes}

@router.post("/{customer_id}/notes")
async def create_customer_note(customer_id: str, content: str, type: str = "note", created_by: str = "admin"):
    """Create a note for a customer"""
    note = CustomerNote(
        customer_id=customer_id,
        content=content,
        type=type,
        created_by=created_by
    )
    await db.customer_notes.insert_one(note.dict())
    return note

@router.put("/{customer_id}/notes/{note_id}")
async def update_customer_note(customer_id: str, note_id: str, update: Dict[str, Any]):
    """Update a customer note"""
    result = await db.customer_notes.update_one(
        {"id": note_id, "customer_id": customer_id},
        {"$set": update}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    return await db.customer_notes.find_one({"id": note_id}, {"_id": 0})

@router.delete("/{customer_id}/notes/{note_id}")
async def delete_customer_note(customer_id: str, note_id: str):
    """Delete a customer note"""
    result = await db.customer_notes.delete_one({"id": note_id, "customer_id": customer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    return {"success": True}


# ==================== CUSTOMER TAGS ROUTES ====================

@router.get("/tags")
async def get_customer_tags():
    """Get all customer tags"""
    tags = await db.customer_tags.find({}, {"_id": 0}).to_list(100)
    
    # Get usage count for each tag
    for tag in tags:
        count = await db.customers.count_documents({"tags": tag["id"]})
        tag["usage_count"] = count
    
    return {"tags": tags}

@router.post("/tags")
async def create_customer_tag(name: str, color: str = "#6B7280", description: Optional[str] = None):
    """Create a new customer tag"""
    tag = CustomerTag(name=name, color=color, description=description)
    await db.customer_tags.insert_one(tag.dict())
    return tag

@router.put("/tags/{tag_id}")
async def update_customer_tag(tag_id: str, update: Dict[str, Any]):
    """Update a customer tag"""
    result = await db.customer_tags.update_one({"id": tag_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tag not found")
    return await db.customer_tags.find_one({"id": tag_id}, {"_id": 0})

@router.delete("/tags/{tag_id}")
async def delete_customer_tag(tag_id: str):
    """Delete a customer tag"""
    # Remove tag from all customers
    await db.customers.update_many({"tags": tag_id}, {"$pull": {"tags": tag_id}})
    
    result = await db.customer_tags.delete_one({"id": tag_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tag not found")
    return {"success": True}

@router.post("/{customer_id}/tags/{tag_id}")
async def add_tag_to_customer(customer_id: str, tag_id: str):
    """Add a tag to a customer"""
    result = await db.customers.update_one(
        {"id": customer_id},
        {"$addToSet": {"tags": tag_id}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"success": True}

@router.delete("/{customer_id}/tags/{tag_id}")
async def remove_tag_from_customer(customer_id: str, tag_id: str):
    """Remove a tag from a customer"""
    result = await db.customers.update_one(
        {"id": customer_id},
        {"$pull": {"tags": tag_id}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"success": True}


# ==================== CUSTOMER COMMUNICATION ====================

@router.get("/{customer_id}/communications")
async def get_customer_communications(customer_id: str):
    """Get all communications with a customer"""
    # Get emails sent to customer
    emails = await db.email_logs.find({"customer_id": customer_id}, {"_id": 0}).sort("sent_at", -1).to_list(100)
    
    # Get order-related communications
    order_emails = await db.order_emails.find({"customer_id": customer_id}, {"_id": 0}).sort("sent_at", -1).to_list(100)
    
    return {
        "emails": emails,
        "order_emails": order_emails
    }

@router.get("/{customer_id}/activity")
async def get_customer_activity(customer_id: str, limit: int = 50):
    """Get customer activity timeline"""
    activities = []
    
    # Get orders
    orders = await db.orders.find({"customer_id": customer_id}, {"_id": 0}).sort("created_at", -1).limit(20).to_list(20)
    for order in orders:
        activities.append({
            "type": "order",
            "title": f"Placed order #{order.get('order_number', order.get('id')[:8])}",
            "description": f"${order.get('total', 0):.2f} - {len(order.get('items', []))} items",
            "timestamp": order.get("created_at"),
            "data": {"order_id": order.get("id")}
        })
    
    # Get reviews
    reviews = await db.product_reviews.find({"customer_id": customer_id}, {"_id": 0}).sort("created_at", -1).limit(10).to_list(10)
    for review in reviews:
        activities.append({
            "type": "review",
            "title": f"Left a {review.get('rating', 0)}-star review",
            "description": review.get("title", ""),
            "timestamp": review.get("created_at"),
            "data": {"review_id": review.get("id")}
        })
    
    # Get wishlist additions
    wishlists = await db.wishlists.find({"customer_id": customer_id}, {"_id": 0}).to_list(10)
    for wishlist in wishlists:
        for item in wishlist.get("items", [])[-5:]:  # Last 5 items
            activities.append({
                "type": "wishlist",
                "title": "Added item to wishlist",
                "description": "",
                "timestamp": item.get("added_at"),
                "data": {"product_id": item.get("product_id")}
            })
    
    # Sort by timestamp
    activities.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    
    return {"activities": activities[:limit]}
