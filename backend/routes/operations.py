"""
Operations Routes - Supplier Management, Purchase Orders, Multi-Warehouse, Stock Alerts
"""

from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import os
import uuid

router = APIRouter(prefix="/api/operations", tags=["Operations"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'maropost_clone')]


# ==================== SUPPLIER MODELS ====================

class Supplier(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    code: Optional[str] = None
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: str = "Australia"
    postal_code: Optional[str] = None
    payment_terms: Optional[str] = None  # NET30, NET60, etc.
    lead_time_days: int = 7
    min_order_value: Optional[float] = None
    currency: str = "AUD"
    tax_id: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = True
    products: List[str] = []  # Product IDs this supplier provides
    rating: Optional[float] = None  # 1-5 rating
    total_orders: int = 0
    total_spent: float = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None

class SupplierCreate(BaseModel):
    name: str
    code: Optional[str] = None
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: str = "Australia"
    postal_code: Optional[str] = None
    payment_terms: Optional[str] = None
    lead_time_days: int = 7
    min_order_value: Optional[float] = None
    notes: Optional[str] = None


# ==================== PURCHASE ORDER MODELS ====================

class POItem(BaseModel):
    product_id: str
    sku: str
    name: str
    quantity: int
    unit_cost: float
    received_quantity: int = 0
    total: float = 0

class PurchaseOrder(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    po_number: str = Field(default_factory=lambda: f"PO-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}")
    supplier_id: str
    supplier_name: str
    warehouse_id: Optional[str] = None
    items: List[POItem] = []
    subtotal: float = 0
    tax: float = 0
    shipping_cost: float = 0
    total: float = 0
    status: str = "draft"  # draft, pending, approved, ordered, partial, received, cancelled
    expected_date: Optional[datetime] = None
    received_date: Optional[datetime] = None
    notes: Optional[str] = None
    internal_notes: Optional[str] = None
    payment_status: str = "unpaid"  # unpaid, partial, paid
    payment_date: Optional[datetime] = None
    created_by: Optional[str] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None

class POCreate(BaseModel):
    supplier_id: str
    warehouse_id: Optional[str] = None
    items: List[Dict[str, Any]]
    expected_date: Optional[datetime] = None
    notes: Optional[str] = None
    shipping_cost: float = 0


# ==================== WAREHOUSE MODELS ====================

class Warehouse(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    code: str
    address: str
    city: str
    state: str
    country: str = "Australia"
    postal_code: str
    phone: Optional[str] = None
    email: Optional[str] = None
    manager: Optional[str] = None
    is_default: bool = False
    is_active: bool = True
    capacity: Optional[int] = None  # Max items
    current_stock: int = 0
    fulfillment_priority: int = 1  # Lower = higher priority
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WarehouseStock(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    warehouse_id: str
    product_id: str
    quantity: int = 0
    reserved_quantity: int = 0  # Reserved for orders
    available_quantity: int = 0
    bin_location: Optional[str] = None
    last_counted: Optional[datetime] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StockTransfer(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    transfer_number: str = Field(default_factory=lambda: f"TRF-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}")
    from_warehouse_id: str
    to_warehouse_id: str
    items: List[Dict[str, Any]] = []  # product_id, quantity, received_quantity
    status: str = "pending"  # pending, in_transit, partial, completed, cancelled
    notes: Optional[str] = None
    shipped_at: Optional[datetime] = None
    received_at: Optional[datetime] = None
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ==================== STOCK ALERT MODELS ====================

class StockAlert(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_id: str
    product_name: str
    sku: str
    alert_type: str  # low_stock, out_of_stock, overstock, expiring
    current_stock: int
    threshold: int
    warehouse_id: Optional[str] = None
    is_read: bool = False
    is_resolved: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved_at: Optional[datetime] = None

class AlertSettings(BaseModel):
    id: str = "alert_settings"
    low_stock_enabled: bool = True
    low_stock_threshold: int = 10
    out_of_stock_enabled: bool = True
    overstock_enabled: bool = False
    overstock_threshold: int = 1000
    email_notifications: bool = True
    notification_emails: List[str] = []
    dashboard_alerts: bool = True


# ==================== SUPPLIER ROUTES ====================

@router.get("/suppliers")
async def get_suppliers(
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
):
    """Get all suppliers"""
    query = {}
    if is_active is not None:
        query["is_active"] = is_active
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"code": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    
    suppliers = await db.suppliers.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.suppliers.count_documents(query)
    
    return {"suppliers": suppliers, "total": total}

@router.get("/suppliers/{supplier_id}")
async def get_supplier(supplier_id: str):
    """Get a specific supplier"""
    supplier = await db.suppliers.find_one({"id": supplier_id}, {"_id": 0})
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    # Get recent purchase orders
    pos = await db.purchase_orders.find(
        {"supplier_id": supplier_id}, {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    supplier["recent_orders"] = pos
    
    return supplier

@router.post("/suppliers")
async def create_supplier(supplier: SupplierCreate):
    """Create a new supplier"""
    new_supplier = Supplier(**supplier.dict())
    await db.suppliers.insert_one(new_supplier.dict())
    return new_supplier

@router.put("/suppliers/{supplier_id}")
async def update_supplier(supplier_id: str, update: Dict[str, Any]):
    """Update a supplier"""
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.suppliers.update_one({"id": supplier_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return await db.suppliers.find_one({"id": supplier_id}, {"_id": 0})

@router.delete("/suppliers/{supplier_id}")
async def delete_supplier(supplier_id: str):
    """Delete a supplier"""
    result = await db.suppliers.delete_one({"id": supplier_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return {"success": True}


# ==================== PURCHASE ORDER ROUTES ====================

@router.get("/purchase-orders")
async def get_purchase_orders(
    status: Optional[str] = None,
    supplier_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
):
    """Get all purchase orders"""
    query = {}
    if status:
        query["status"] = status
    if supplier_id:
        query["supplier_id"] = supplier_id
    
    pos = await db.purchase_orders.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.purchase_orders.count_documents(query)
    
    return {"purchase_orders": pos, "total": total}

@router.get("/purchase-orders/{po_id}")
async def get_purchase_order(po_id: str):
    """Get a specific purchase order"""
    po = await db.purchase_orders.find_one({"id": po_id}, {"_id": 0})
    if not po:
        po = await db.purchase_orders.find_one({"po_number": po_id}, {"_id": 0})
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return po

@router.post("/purchase-orders")
async def create_purchase_order(po_data: POCreate):
    """Create a new purchase order"""
    # Get supplier info
    supplier = await db.suppliers.find_one({"id": po_data.supplier_id}, {"_id": 0})
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    # Process items
    items = []
    subtotal = 0
    for item_data in po_data.items:
        product = await db.products.find_one({"id": item_data["product_id"]}, {"_id": 0})
        if product:
            item = POItem(
                product_id=item_data["product_id"],
                sku=product.get("sku", ""),
                name=product.get("name", ""),
                quantity=item_data.get("quantity", 1),
                unit_cost=item_data.get("unit_cost", product.get("cost", product.get("price", 0))),
                total=item_data.get("quantity", 1) * item_data.get("unit_cost", product.get("cost", product.get("price", 0)))
            )
            items.append(item.dict())
            subtotal += item.total
    
    # Create PO
    po = PurchaseOrder(
        supplier_id=po_data.supplier_id,
        supplier_name=supplier.get("name", ""),
        warehouse_id=po_data.warehouse_id,
        items=items,
        subtotal=subtotal,
        shipping_cost=po_data.shipping_cost,
        total=subtotal + po_data.shipping_cost,
        expected_date=po_data.expected_date,
        notes=po_data.notes
    )
    
    await db.purchase_orders.insert_one(po.dict())
    return po

@router.put("/purchase-orders/{po_id}")
async def update_purchase_order(po_id: str, update: Dict[str, Any]):
    """Update a purchase order"""
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.purchase_orders.update_one({"id": po_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return await db.purchase_orders.find_one({"id": po_id}, {"_id": 0})

@router.post("/purchase-orders/{po_id}/approve")
async def approve_purchase_order(po_id: str, approved_by: str = "admin"):
    """Approve a purchase order"""
    po = await db.purchase_orders.find_one({"id": po_id})
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    if po.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Only pending orders can be approved")
    
    await db.purchase_orders.update_one(
        {"id": po_id},
        {"$set": {
            "status": "approved",
            "approved_by": approved_by,
            "approved_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return await db.purchase_orders.find_one({"id": po_id}, {"_id": 0})

@router.post("/purchase-orders/{po_id}/receive")
async def receive_purchase_order(po_id: str, items_received: List[Dict[str, Any]]):
    """Receive items from a purchase order"""
    po = await db.purchase_orders.find_one({"id": po_id})
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    # Update received quantities
    all_received = True
    for item in po.get("items", []):
        for received in items_received:
            if item["product_id"] == received["product_id"]:
                item["received_quantity"] = item.get("received_quantity", 0) + received.get("quantity", 0)
                
                # Update product stock
                await db.products.update_one(
                    {"id": item["product_id"]},
                    {"$inc": {"stock": received.get("quantity", 0)}}
                )
        
        if item.get("received_quantity", 0) < item.get("quantity", 0):
            all_received = False
    
    # Update PO status
    new_status = "received" if all_received else "partial"
    
    await db.purchase_orders.update_one(
        {"id": po_id},
        {"$set": {
            "items": po["items"],
            "status": new_status,
            "received_date": datetime.now(timezone.utc).isoformat() if all_received else None,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Update supplier stats
    if all_received:
        await db.suppliers.update_one(
            {"id": po.get("supplier_id")},
            {"$inc": {"total_orders": 1, "total_spent": po.get("total", 0)}}
        )
    
    return await db.purchase_orders.find_one({"id": po_id}, {"_id": 0})

@router.delete("/purchase-orders/{po_id}")
async def delete_purchase_order(po_id: str):
    """Delete a purchase order"""
    result = await db.purchase_orders.delete_one({"id": po_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return {"success": True}


# ==================== WAREHOUSE ROUTES ====================

@router.get("/warehouses")
async def get_warehouses(is_active: Optional[bool] = None):
    """Get all warehouses"""
    query = {}
    if is_active is not None:
        query["is_active"] = is_active
    
    warehouses = await db.warehouses.find(query, {"_id": 0}).to_list(100)
    return {"warehouses": warehouses}

@router.get("/warehouses/{warehouse_id}")
async def get_warehouse(warehouse_id: str):
    """Get a specific warehouse"""
    warehouse = await db.warehouses.find_one({"id": warehouse_id}, {"_id": 0})
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    
    # Get stock summary
    stock = await db.warehouse_stock.find({"warehouse_id": warehouse_id}, {"_id": 0}).to_list(10000)
    warehouse["total_products"] = len(stock)
    warehouse["total_units"] = sum(s.get("quantity", 0) for s in stock)
    
    return warehouse

@router.post("/warehouses")
async def create_warehouse(warehouse: Dict[str, Any]):
    """Create a new warehouse"""
    new_warehouse = Warehouse(**warehouse)
    
    # If this is the first warehouse or marked as default, set as default
    existing = await db.warehouses.count_documents({})
    if existing == 0 or warehouse.get("is_default"):
        await db.warehouses.update_many({}, {"$set": {"is_default": False}})
        new_warehouse.is_default = True
    
    await db.warehouses.insert_one(new_warehouse.dict())
    return new_warehouse

@router.put("/warehouses/{warehouse_id}")
async def update_warehouse(warehouse_id: str, update: Dict[str, Any]):
    """Update a warehouse"""
    if update.get("is_default"):
        await db.warehouses.update_many({}, {"$set": {"is_default": False}})
    
    result = await db.warehouses.update_one({"id": warehouse_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    return await db.warehouses.find_one({"id": warehouse_id}, {"_id": 0})

@router.delete("/warehouses/{warehouse_id}")
async def delete_warehouse(warehouse_id: str):
    """Delete a warehouse"""
    # Check if warehouse has stock
    stock = await db.warehouse_stock.count_documents({"warehouse_id": warehouse_id, "quantity": {"$gt": 0}})
    if stock > 0:
        raise HTTPException(status_code=400, detail="Cannot delete warehouse with stock")
    
    result = await db.warehouses.delete_one({"id": warehouse_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    return {"success": True}

@router.get("/warehouses/{warehouse_id}/stock")
async def get_warehouse_stock(warehouse_id: str, search: Optional[str] = None):
    """Get stock for a specific warehouse"""
    query = {"warehouse_id": warehouse_id}
    
    stock = await db.warehouse_stock.find(query, {"_id": 0}).to_list(10000)
    
    # Enrich with product details
    for item in stock:
        product = await db.products.find_one({"id": item["product_id"]}, {"_id": 0, "name": 1, "sku": 1, "image": 1})
        if product:
            item["product_name"] = product.get("name")
            item["sku"] = product.get("sku")
            item["image"] = product.get("image")
    
    if search:
        stock = [s for s in stock if search.lower() in s.get("product_name", "").lower() or search.lower() in s.get("sku", "").lower()]
    
    return {"stock": stock}


# ==================== STOCK TRANSFER ROUTES ====================

@router.get("/transfers")
async def get_stock_transfers(status: Optional[str] = None):
    """Get all stock transfers"""
    query = {}
    if status:
        query["status"] = status
    
    transfers = await db.stock_transfers.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"transfers": transfers}

@router.post("/transfers")
async def create_stock_transfer(transfer: Dict[str, Any]):
    """Create a new stock transfer"""
    # Validate warehouses
    from_wh = await db.warehouses.find_one({"id": transfer["from_warehouse_id"]})
    to_wh = await db.warehouses.find_one({"id": transfer["to_warehouse_id"]})
    
    if not from_wh or not to_wh:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    
    # Validate stock availability
    for item in transfer.get("items", []):
        stock = await db.warehouse_stock.find_one({
            "warehouse_id": transfer["from_warehouse_id"],
            "product_id": item["product_id"]
        })
        if not stock or stock.get("available_quantity", 0) < item.get("quantity", 0):
            raise HTTPException(status_code=400, detail=f"Insufficient stock for product {item['product_id']}")
    
    new_transfer = StockTransfer(**transfer)
    await db.stock_transfers.insert_one(new_transfer.dict())
    
    # Reserve stock
    for item in transfer.get("items", []):
        await db.warehouse_stock.update_one(
            {"warehouse_id": transfer["from_warehouse_id"], "product_id": item["product_id"]},
            {"$inc": {"reserved_quantity": item["quantity"], "available_quantity": -item["quantity"]}}
        )
    
    return new_transfer

@router.post("/transfers/{transfer_id}/ship")
async def ship_stock_transfer(transfer_id: str):
    """Mark transfer as shipped"""
    transfer = await db.stock_transfers.find_one({"id": transfer_id})
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")
    
    await db.stock_transfers.update_one(
        {"id": transfer_id},
        {"$set": {"status": "in_transit", "shipped_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return await db.stock_transfers.find_one({"id": transfer_id}, {"_id": 0})

@router.post("/transfers/{transfer_id}/receive")
async def receive_stock_transfer(transfer_id: str, items_received: List[Dict[str, Any]]):
    """Receive items from a stock transfer"""
    transfer = await db.stock_transfers.find_one({"id": transfer_id})
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")
    
    all_received = True
    for item in transfer.get("items", []):
        for received in items_received:
            if item["product_id"] == received["product_id"]:
                qty = received.get("quantity", 0)
                item["received_quantity"] = item.get("received_quantity", 0) + qty
                
                # Remove from source warehouse
                await db.warehouse_stock.update_one(
                    {"warehouse_id": transfer["from_warehouse_id"], "product_id": item["product_id"]},
                    {"$inc": {"quantity": -qty, "reserved_quantity": -qty}}
                )
                
                # Add to destination warehouse
                await db.warehouse_stock.update_one(
                    {"warehouse_id": transfer["to_warehouse_id"], "product_id": item["product_id"]},
                    {"$inc": {"quantity": qty, "available_quantity": qty}},
                    upsert=True
                )
        
        if item.get("received_quantity", 0) < item.get("quantity", 0):
            all_received = False
    
    new_status = "completed" if all_received else "partial"
    
    await db.stock_transfers.update_one(
        {"id": transfer_id},
        {"$set": {
            "items": transfer["items"],
            "status": new_status,
            "received_at": datetime.now(timezone.utc).isoformat() if all_received else None
        }}
    )
    
    return await db.stock_transfers.find_one({"id": transfer_id}, {"_id": 0})


# ==================== STOCK ALERT ROUTES ====================

@router.get("/alerts")
async def get_stock_alerts(
    is_read: Optional[bool] = None,
    is_resolved: Optional[bool] = None,
    alert_type: Optional[str] = None
):
    """Get all stock alerts"""
    query = {}
    if is_read is not None:
        query["is_read"] = is_read
    if is_resolved is not None:
        query["is_resolved"] = is_resolved
    if alert_type:
        query["alert_type"] = alert_type
    
    alerts = await db.stock_alerts.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"alerts": alerts}

@router.get("/alerts/settings")
async def get_alert_settings():
    """Get stock alert settings"""
    settings = await db.alert_settings.find_one({"id": "alert_settings"}, {"_id": 0})
    if not settings:
        settings = AlertSettings().dict()
        await db.alert_settings.insert_one(settings)
    return settings

@router.put("/alerts/settings")
async def update_alert_settings(settings: Dict[str, Any]):
    """Update stock alert settings"""
    await db.alert_settings.update_one(
        {"id": "alert_settings"},
        {"$set": settings},
        upsert=True
    )
    return await db.alert_settings.find_one({"id": "alert_settings"}, {"_id": 0})

@router.post("/alerts/{alert_id}/read")
async def mark_alert_read(alert_id: str):
    """Mark an alert as read"""
    result = await db.stock_alerts.update_one(
        {"id": alert_id},
        {"$set": {"is_read": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"success": True}

@router.post("/alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: str):
    """Resolve an alert"""
    result = await db.stock_alerts.update_one(
        {"id": alert_id},
        {"$set": {"is_resolved": True, "resolved_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"success": True}

@router.post("/alerts/check")
async def check_stock_alerts():
    """Manually check and generate stock alerts"""
    settings = await get_alert_settings()
    products = await db.products.find({}, {"_id": 0}).to_list(10000)
    
    new_alerts = []
    
    for product in products:
        stock = product.get("stock", 0)
        
        # Check out of stock
        if settings.get("out_of_stock_enabled") and stock <= 0:
            existing = await db.stock_alerts.find_one({
                "product_id": product["id"],
                "alert_type": "out_of_stock",
                "is_resolved": False
            })
            if not existing:
                alert = StockAlert(
                    product_id=product["id"],
                    product_name=product.get("name", ""),
                    sku=product.get("sku", ""),
                    alert_type="out_of_stock",
                    current_stock=stock,
                    threshold=0
                )
                await db.stock_alerts.insert_one(alert.dict())
                new_alerts.append(alert.dict())
        
        # Check low stock
        elif settings.get("low_stock_enabled") and stock <= settings.get("low_stock_threshold", 10):
            existing = await db.stock_alerts.find_one({
                "product_id": product["id"],
                "alert_type": "low_stock",
                "is_resolved": False
            })
            if not existing:
                alert = StockAlert(
                    product_id=product["id"],
                    product_name=product.get("name", ""),
                    sku=product.get("sku", ""),
                    alert_type="low_stock",
                    current_stock=stock,
                    threshold=settings.get("low_stock_threshold", 10)
                )
                await db.stock_alerts.insert_one(alert.dict())
                new_alerts.append(alert.dict())
        
        # Check overstock
        if settings.get("overstock_enabled") and stock >= settings.get("overstock_threshold", 1000):
            existing = await db.stock_alerts.find_one({
                "product_id": product["id"],
                "alert_type": "overstock",
                "is_resolved": False
            })
            if not existing:
                alert = StockAlert(
                    product_id=product["id"],
                    product_name=product.get("name", ""),
                    sku=product.get("sku", ""),
                    alert_type="overstock",
                    current_stock=stock,
                    threshold=settings.get("overstock_threshold", 1000)
                )
                await db.stock_alerts.insert_one(alert.dict())
                new_alerts.append(alert.dict())
    
    return {"new_alerts": len(new_alerts), "alerts": new_alerts}
