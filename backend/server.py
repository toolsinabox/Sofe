from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

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
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

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
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

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
    order_number: str = Field(default_factory=lambda: f"ORD-{datetime.utcnow().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}")
    status: str = "pending"  # pending, processing, shipped, delivered, cancelled
    payment_status: str = "pending"  # pending, paid, refunded
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class CustomerBase(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None

class Customer(CustomerBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    total_orders: int = 0
    total_spent: float = 0
    status: str = "active"  # active, vip, inactive
    created_at: datetime = Field(default_factory=datetime.utcnow)

class CartItem(BaseModel):
    product_id: str
    quantity: int

class CartBase(BaseModel):
    items: List[CartItem]
    session_id: str

class HeroBanner(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    subtitle: Optional[str] = None
    image: str
    link: Optional[str] = None
    is_active: bool = True
    sort_order: int = 0

# ==================== CATEGORY ENDPOINTS ====================

@api_router.get("/")
async def root():
    return {"message": "Maropost Clone API - Operational"}

@api_router.post("/categories", response_model=Category)
async def create_category(category: CategoryCreate):
    category_dict = category.dict()
    category_obj = Category(**category_dict)
    await db.categories.insert_one(category_obj.dict())
    return category_obj

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
    existing = await db.categories.find_one({"id": category_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found")
    
    update_data = category.dict()
    update_data["updated_at"] = datetime.utcnow()
    await db.categories.update_one({"id": category_id}, {"$set": update_data})
    
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
    product_dict = product.dict()
    product_obj = Product(**product_dict)
    await db.products.insert_one(product_obj.dict())
    
    # Update category product count
    if product.category_id:
        await db.categories.update_one(
            {"id": product.category_id},
            {"$inc": {"product_count": 1}}
        )
    
    return product_obj

@api_router.get("/products", response_model=List[Product])
async def get_products(
    category_id: Optional[str] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort_by: Optional[str] = "created_at",
    limit: int = Query(default=50, le=100),
    skip: int = 0
):
    query = {}
    
    if category_id:
        query["category_id"] = category_id
    if is_active is not None:
        query["is_active"] = is_active
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"sku": {"$regex": search, "$options": "i"}}
        ]
    if min_price is not None:
        query["price"] = {"$gte": min_price}
    if max_price is not None:
        if "price" in query:
            query["price"]["$lte"] = max_price
        else:
            query["price"] = {"$lte": max_price}
    
    # Sort options
    sort_mapping = {
        "created_at": ("created_at", -1),
        "price_asc": ("price", 1),
        "price_desc": ("price", -1),
        "name": ("name", 1),
        "rating": ("rating", -1),
        "sales": ("sales_count", -1)
    }
    sort_field, sort_order = sort_mapping.get(sort_by, ("created_at", -1))
    
    products = await db.products.find(query).sort(sort_field, sort_order).skip(skip).limit(limit).to_list(limit)
    return [Product(**prod) for prod in products]

@api_router.get("/products/featured", response_model=List[Product])
async def get_featured_products(limit: int = 8):
    products = await db.products.find({"is_active": True}).sort("sales_count", -1).limit(limit).to_list(limit)
    return [Product(**prod) for prod in products]

@api_router.get("/products/sale", response_model=List[Product])
async def get_sale_products(limit: int = 8):
    products = await db.products.find({
        "is_active": True,
        "compare_price": {"$ne": None, "$gt": 0}
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
    existing = await db.products.find_one({"id": product_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    
    update_data = {k: v for k, v in product.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    await db.products.update_one({"id": product_id}, {"$set": update_data})
    
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
    order_dict = order.dict()
    order_obj = Order(**order_dict)
    order_obj.payment_status = "paid"  # Simulate payment success
    await db.orders.insert_one(order_obj.dict())
    
    # Update product stock and sales count
    for item in order.items:
        await db.products.update_one(
            {"id": item.product_id},
            {
                "$inc": {
                    "stock": -item.quantity,
                    "sales_count": item.quantity
                }
            }
        )
    
    # Update or create customer
    existing_customer = await db.customers.find_one({"email": order.customer_email})
    if existing_customer:
        await db.customers.update_one(
            {"email": order.customer_email},
            {
                "$inc": {
                    "total_orders": 1,
                    "total_spent": order.total
                }
            }
        )
    else:
        customer = Customer(
            name=order.customer_name,
            email=order.customer_email,
            phone=order.customer_phone,
            total_orders=1,
            total_spent=order.total
        )
        await db.customers.insert_one(customer.dict())
    
    return order_obj

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

@api_router.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, status: str):
    valid_statuses = ["pending", "processing", "shipped", "delivered", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    result = await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": status, "updated_at": datetime.utcnow()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {"message": f"Order status updated to {status}"}

# ==================== CUSTOMER ENDPOINTS ====================

@api_router.get("/customers", response_model=List[Customer])
async def get_customers(
    status: Optional[str] = None,
    limit: int = Query(default=50, le=100),
    skip: int = 0
):
    query = {}
    if status:
        query["status"] = status
    
    customers = await db.customers.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return [Customer(**cust) for cust in customers]

@api_router.get("/customers/{customer_id}", response_model=Customer)
async def get_customer(customer_id: str):
    customer = await db.customers.find_one({"id": customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return Customer(**customer)

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
async def get_banners():
    banners = await db.banners.find({"is_active": True}).sort("sort_order", 1).to_list(10)
    return [HeroBanner(**banner) for banner in banners]

@api_router.post("/banners", response_model=HeroBanner)
async def create_banner(banner: HeroBanner):
    await db.banners.insert_one(banner.dict())
    return banner

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
        {"$set": {"stock": stock, "updated_at": datetime.utcnow()}}
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
    
    # Create categories
    categories_data = [
        {"name": "Electronics", "description": "Gadgets and devices", "image": "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400", "sort_order": 1},
        {"name": "Clothing", "description": "Fashion and apparel", "image": "https://images.unsplash.com/photo-1445205170230-053b83016050?w=400", "sort_order": 2},
        {"name": "Home & Office", "description": "Home and office essentials", "image": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400", "sort_order": 3},
        {"name": "Sports", "description": "Sports equipment and gear", "image": "https://images.unsplash.com/photo-1461896836934- voices?w=400", "sort_order": 4},
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
    
    return {"message": "Database seeded successfully", "categories": len(categories_data), "products": len(products_data), "banners": len(banners_data)}

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
