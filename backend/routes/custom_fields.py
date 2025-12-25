"""
Custom Fields Module
Allows merchants to create custom fields/tags that can be:
- Assigned to different sections (products, categories, pages, blog posts, orders)
- Filled out in the respective editors
- Rendered as template tags on the frontend
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from uuid import uuid4

router = APIRouter(prefix="/api/custom-fields", tags=["Custom Fields"])

# Database reference (will be set from server.py)
db = None

def set_db(database):
    global db
    db = database


# ==================== PYDANTIC MODELS ====================

class SelectOption(BaseModel):
    label: str
    value: str

class CustomFieldCreate(BaseModel):
    name: str  # Display name (e.g., "Warranty Information")
    field_key: str  # Tag key (e.g., "warranty_info" -> renders as {{warranty_info}})
    field_type: str = "text"  # text, textarea, number, select, checkbox, date, url, email, color
    description: Optional[str] = None  # Help text for editors
    placeholder: Optional[str] = None
    default_value: Optional[str] = None
    is_required: bool = False
    assigned_to: List[str] = []  # products, categories, pages, blog_posts, orders
    options: Optional[List[SelectOption]] = None  # For select field type
    validation_regex: Optional[str] = None
    min_value: Optional[float] = None  # For number fields
    max_value: Optional[float] = None  # For number fields
    sort_order: int = 0
    is_active: bool = True
    show_in_storefront: bool = True  # Whether tag can be used in templates

class CustomFieldUpdate(BaseModel):
    name: Optional[str] = None
    field_key: Optional[str] = None
    field_type: Optional[str] = None
    description: Optional[str] = None
    placeholder: Optional[str] = None
    default_value: Optional[str] = None
    is_required: Optional[bool] = None
    assigned_to: Optional[List[str]] = None
    options: Optional[List[SelectOption]] = None
    validation_regex: Optional[str] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None
    show_in_storefront: Optional[bool] = None

class CustomField(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    field_key: str
    field_type: str = "text"
    description: Optional[str] = None
    placeholder: Optional[str] = None
    default_value: Optional[str] = None
    is_required: bool = False
    assigned_to: List[str] = []
    options: Optional[List[Dict[str, str]]] = None
    validation_regex: Optional[str] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    sort_order: int = 0
    is_active: bool = True
    show_in_storefront: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ==================== SECTION DEFINITIONS ====================

AVAILABLE_SECTIONS = [
    {"id": "products", "name": "Products", "description": "Add fields to product editor"},
    {"id": "categories", "name": "Categories", "description": "Add fields to category editor"},
    {"id": "pages", "name": "Pages", "description": "Add fields to page editor"},
    {"id": "blog_posts", "name": "Blog Posts", "description": "Add fields to blog post editor"},
    {"id": "orders", "name": "Orders", "description": "Add fields to order details"},
    {"id": "customers", "name": "Customers", "description": "Add fields to customer profiles"},
]

FIELD_TYPES = [
    {"id": "text", "name": "Text", "description": "Single line text input"},
    {"id": "textarea", "name": "Text Area", "description": "Multi-line text input"},
    {"id": "number", "name": "Number", "description": "Numeric input with optional min/max"},
    {"id": "select", "name": "Dropdown Select", "description": "Choose from predefined options"},
    {"id": "checkbox", "name": "Checkbox", "description": "Yes/No toggle"},
    {"id": "date", "name": "Date", "description": "Date picker"},
    {"id": "url", "name": "URL", "description": "Website link input"},
    {"id": "email", "name": "Email", "description": "Email address input"},
    {"id": "color", "name": "Color", "description": "Color picker"},
    {"id": "image", "name": "Image URL", "description": "Image URL input"},
]


# ==================== API ENDPOINTS ====================

@router.get("/sections")
async def get_available_sections():
    """Get all available sections where custom fields can be assigned"""
    return {"sections": AVAILABLE_SECTIONS}


@router.get("/field-types")
async def get_field_types():
    """Get all available field types"""
    return {"field_types": FIELD_TYPES}


@router.get("")
async def get_custom_fields(
    section: Optional[str] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None
):
    """Get all custom fields, optionally filtered by section"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    query = {}
    if section:
        query["assigned_to"] = section
    if is_active is not None:
        query["is_active"] = is_active
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"field_key": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    fields = await db.custom_fields.find(query, {"_id": 0}).sort("sort_order", 1).to_list(500)
    return {"fields": fields, "total": len(fields)}


@router.get("/by-section/{section}")
async def get_fields_by_section(section: str):
    """Get all active custom fields for a specific section"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    fields = await db.custom_fields.find(
        {"assigned_to": section, "is_active": True},
        {"_id": 0}
    ).sort("sort_order", 1).to_list(100)
    
    return {"fields": fields, "section": section}


@router.get("/{field_id}")
async def get_custom_field(field_id: str):
    """Get a specific custom field by ID"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    field = await db.custom_fields.find_one({"id": field_id}, {"_id": 0})
    if not field:
        raise HTTPException(status_code=404, detail="Custom field not found")
    return field


@router.post("")
async def create_custom_field(field_data: CustomFieldCreate):
    """Create a new custom field"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    # Check if field_key already exists
    existing = await db.custom_fields.find_one({"field_key": field_data.field_key})
    if existing:
        raise HTTPException(status_code=400, detail=f"Field key '{field_data.field_key}' already exists")
    
    # Sanitize field_key (lowercase, underscores only)
    field_key = field_data.field_key.lower().replace(" ", "_").replace("-", "_")
    field_key = ''.join(c for c in field_key if c.isalnum() or c == '_')
    
    new_field = CustomField(
        name=field_data.name,
        field_key=field_key,
        field_type=field_data.field_type,
        description=field_data.description,
        placeholder=field_data.placeholder,
        default_value=field_data.default_value,
        is_required=field_data.is_required,
        assigned_to=field_data.assigned_to,
        options=[opt.dict() for opt in field_data.options] if field_data.options else None,
        validation_regex=field_data.validation_regex,
        min_value=field_data.min_value,
        max_value=field_data.max_value,
        sort_order=field_data.sort_order,
        is_active=field_data.is_active,
        show_in_storefront=field_data.show_in_storefront
    )
    
    await db.custom_fields.insert_one(new_field.dict())
    return new_field.dict()


@router.put("/{field_id}")
async def update_custom_field(field_id: str, field_data: CustomFieldUpdate):
    """Update a custom field"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    # Check if field exists
    existing = await db.custom_fields.find_one({"id": field_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Custom field not found")
    
    # Build update dict
    update_data = {k: v for k, v in field_data.dict().items() if v is not None}
    
    # Sanitize field_key if being updated
    if "field_key" in update_data:
        field_key = update_data["field_key"].lower().replace(" ", "_").replace("-", "_")
        field_key = ''.join(c for c in field_key if c.isalnum() or c == '_')
        update_data["field_key"] = field_key
        
        # Check uniqueness
        dup = await db.custom_fields.find_one({"field_key": field_key, "id": {"$ne": field_id}})
        if dup:
            raise HTTPException(status_code=400, detail=f"Field key '{field_key}' already exists")
    
    if "options" in update_data and update_data["options"]:
        update_data["options"] = [opt.dict() if hasattr(opt, 'dict') else opt for opt in update_data["options"]]
    
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.custom_fields.update_one({"id": field_id}, {"$set": update_data})
    
    updated = await db.custom_fields.find_one({"id": field_id}, {"_id": 0})
    return updated


@router.delete("/{field_id}")
async def delete_custom_field(field_id: str):
    """Delete a custom field"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    result = await db.custom_fields.delete_one({"id": field_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Custom field not found")
    
    return {"message": "Custom field deleted successfully", "id": field_id}


@router.post("/reorder")
async def reorder_custom_fields(field_orders: List[Dict[str, Any]]):
    """Reorder custom fields by updating sort_order"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    for item in field_orders:
        await db.custom_fields.update_one(
            {"id": item["id"]},
            {"$set": {"sort_order": item["sort_order"]}}
        )
    
    return {"message": "Fields reordered successfully"}


@router.get("/values/{section}/{item_id}")
async def get_custom_field_values(section: str, item_id: str):
    """Get custom field values for a specific item (product, category, etc.)"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    # Map section to collection
    collection_map = {
        "products": "products",
        "categories": "categories",
        "pages": "pages",
        "blog_posts": "blog_posts",
        "orders": "orders",
        "customers": "customers"
    }
    
    collection_name = collection_map.get(section)
    if not collection_name:
        raise HTTPException(status_code=400, detail=f"Invalid section: {section}")
    
    collection = db[collection_name]
    item = await collection.find_one({"id": item_id}, {"_id": 0, "custom_fields": 1})
    
    if not item:
        raise HTTPException(status_code=404, detail=f"Item not found in {section}")
    
    return {"custom_fields": item.get("custom_fields", {})}


@router.put("/values/{section}/{item_id}")
async def update_custom_field_values(section: str, item_id: str, values: Dict[str, Any]):
    """Update custom field values for a specific item"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    collection_map = {
        "products": "products",
        "categories": "categories",
        "pages": "pages",
        "blog_posts": "blog_posts",
        "orders": "orders",
        "customers": "customers"
    }
    
    collection_name = collection_map.get(section)
    if not collection_name:
        raise HTTPException(status_code=400, detail=f"Invalid section: {section}")
    
    collection = db[collection_name]
    result = await collection.update_one(
        {"id": item_id},
        {"$set": {"custom_fields": values, "updated_at": datetime.now(timezone.utc)}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail=f"Item not found in {section}")
    
    return {"message": "Custom fields updated successfully", "custom_fields": values}


@router.get("/template-tags")
async def get_template_tags():
    """Get all custom field tags for use in templates"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    fields = await db.custom_fields.find(
        {"is_active": True, "show_in_storefront": True},
        {"_id": 0, "field_key": 1, "name": 1, "assigned_to": 1, "field_type": 1}
    ).to_list(500)
    
    # Group by section
    tags_by_section = {}
    for field in fields:
        for section in field.get("assigned_to", []):
            if section not in tags_by_section:
                tags_by_section[section] = []
            tags_by_section[section].append({
                "tag": f"{{{{custom_{field['field_key']}}}}}",
                "name": field["name"],
                "field_type": field["field_type"]
            })
    
    return {"tags": tags_by_section, "total": len(fields)}
