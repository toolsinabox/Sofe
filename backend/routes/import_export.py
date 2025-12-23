"""
Import/Export Module for Categories and Products
Comprehensive CSV import/export with field mapping, validation, and progress tracking
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Query, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from uuid import uuid4
import csv
import io
import json

router = APIRouter(prefix="/api/import-export", tags=["Import/Export"])

# Database reference (will be set from server.py)
db = None

def set_db(database):
    global db
    db = database


# ==================== PYDANTIC MODELS ====================

class ImportMapping(BaseModel):
    csv_column: str
    db_field: str
    
class ImportConfig(BaseModel):
    mappings: List[ImportMapping]
    update_existing: bool = False  # If true, update existing records by SKU/ID
    skip_errors: bool = True  # If true, continue on error rows

class ImportPreviewResponse(BaseModel):
    total_rows: int
    columns: List[str]
    sample_data: List[Dict[str, Any]]
    detected_mappings: List[Dict[str, str]]

class ImportResult(BaseModel):
    success: bool
    total_processed: int
    created: int
    updated: int
    errors: int
    error_details: List[Dict[str, Any]]

class ExportConfig(BaseModel):
    fields: List[str]
    filters: Optional[Dict[str, Any]] = None


# ==================== CATEGORY FIELDS ====================

CATEGORY_FIELDS = [
    {"field": "id", "label": "Category ID", "required": False, "type": "string"},
    {"field": "name", "label": "Category Name", "required": True, "type": "string"},
    {"field": "slug", "label": "URL Slug", "required": False, "type": "string"},
    {"field": "description", "label": "Description", "required": False, "type": "string"},
    {"field": "parent_id", "label": "Parent Category ID", "required": False, "type": "string"},
    {"field": "image", "label": "Image URL", "required": False, "type": "string"},
    {"field": "status", "label": "Status", "required": False, "type": "string", "default": "active"},
    {"field": "sort_order", "label": "Sort Order", "required": False, "type": "integer", "default": 0},
    {"field": "meta_title", "label": "Meta Title", "required": False, "type": "string"},
    {"field": "meta_description", "label": "Meta Description", "required": False, "type": "string"},
    {"field": "created_at", "label": "Created Date", "required": False, "type": "datetime"},
    {"field": "updated_at", "label": "Updated Date", "required": False, "type": "datetime"},
]


# ==================== PRODUCT FIELDS ====================

PRODUCT_FIELDS = [
    {"field": "id", "label": "Product ID", "required": False, "type": "string"},
    {"field": "sku", "label": "SKU", "required": True, "type": "string"},
    {"field": "name", "label": "Product Name", "required": True, "type": "string"},
    {"field": "description", "label": "Description", "required": False, "type": "string"},
    {"field": "price", "label": "Price", "required": True, "type": "float"},
    {"field": "compare_price", "label": "Compare At Price", "required": False, "type": "float"},
    {"field": "cost", "label": "Cost Price", "required": False, "type": "float"},
    {"field": "stock", "label": "Stock Quantity", "required": False, "type": "integer", "default": 0},
    {"field": "low_stock_threshold", "label": "Low Stock Alert", "required": False, "type": "integer"},
    {"field": "category_id", "label": "Primary Category ID", "required": False, "type": "string"},
    {"field": "category_ids", "label": "Category IDs (comma-separated)", "required": False, "type": "array"},
    {"field": "category_name", "label": "Category Name", "required": False, "type": "string"},
    {"field": "brand", "label": "Brand", "required": False, "type": "string"},
    {"field": "vendor", "label": "Vendor", "required": False, "type": "string"},
    {"field": "barcode", "label": "Barcode/UPC", "required": False, "type": "string"},
    {"field": "weight", "label": "Weight", "required": False, "type": "string"},
    {"field": "weight_unit", "label": "Weight Unit", "required": False, "type": "string"},
    {"field": "dimensions", "label": "Dimensions", "required": False, "type": "string"},
    {"field": "status", "label": "Status", "required": False, "type": "string", "default": "active"},
    {"field": "visibility", "label": "Visibility", "required": False, "type": "string", "default": "visible"},
    {"field": "tax_class", "label": "Tax Class", "required": False, "type": "string"},
    {"field": "image_1", "label": "Image 1 URL", "required": False, "type": "string"},
    {"field": "image_2", "label": "Image 2 URL", "required": False, "type": "string"},
    {"field": "image_3", "label": "Image 3 URL", "required": False, "type": "string"},
    {"field": "image_4", "label": "Image 4 URL", "required": False, "type": "string"},
    {"field": "image_5", "label": "Image 5 URL", "required": False, "type": "string"},
    {"field": "image_6", "label": "Image 6 URL", "required": False, "type": "string"},
    {"field": "meta_title", "label": "Meta Title", "required": False, "type": "string"},
    {"field": "meta_description", "label": "Meta Description", "required": False, "type": "string"},
    {"field": "tags", "label": "Tags (comma-separated)", "required": False, "type": "array"},
    {"field": "variant_options", "label": "Variant Options (JSON)", "required": False, "type": "json"},
    {"field": "custom_fields", "label": "Custom Fields (JSON)", "required": False, "type": "json"},
    {"field": "created_at", "label": "Created Date", "required": False, "type": "datetime"},
    {"field": "updated_at", "label": "Updated Date", "required": False, "type": "datetime"},
]


# ==================== HELPER FUNCTIONS ====================

def parse_csv_value(value: str, field_type: str) -> Any:
    """Parse CSV value based on field type"""
    if value is None or value.strip() == '':
        return None
    
    value = value.strip()
    
    if field_type == 'integer':
        try:
            return int(float(value))
        except:
            return None
    elif field_type == 'float':
        try:
            return float(value.replace('$', '').replace(',', ''))
        except:
            return None
    elif field_type == 'array':
        # Parse comma-separated values
        return [v.strip() for v in value.split(',') if v.strip()]
    elif field_type == 'json':
        try:
            return json.loads(value)
        except:
            return None
    elif field_type == 'datetime':
        try:
            return datetime.fromisoformat(value.replace('Z', '+00:00'))
        except:
            return value
    else:
        return value


def auto_detect_mappings(columns: List[str], field_definitions: List[Dict]) -> List[Dict[str, str]]:
    """Auto-detect column to field mappings based on column names"""
    mappings = []
    
    # Create lookup for field names and labels
    field_lookup = {}
    for field_def in field_definitions:
        field_lookup[field_def['field'].lower()] = field_def['field']
        field_lookup[field_def['label'].lower()] = field_def['field']
        # Add common variations
        field_lookup[field_def['field'].replace('_', ' ').lower()] = field_def['field']
        field_lookup[field_def['field'].replace('_', '').lower()] = field_def['field']
    
    for col in columns:
        col_lower = col.lower().strip()
        col_normalized = col_lower.replace(' ', '_').replace('-', '_')
        
        matched_field = None
        
        # Exact match
        if col_lower in field_lookup:
            matched_field = field_lookup[col_lower]
        elif col_normalized in field_lookup:
            matched_field = field_lookup[col_normalized]
        else:
            # Partial match
            for key, field in field_lookup.items():
                if key in col_lower or col_lower in key:
                    matched_field = field
                    break
        
        mappings.append({
            "csv_column": col,
            "db_field": matched_field or "",
            "auto_detected": matched_field is not None
        })
    
    return mappings


# ==================== CATEGORY ENDPOINTS ====================

@router.get("/categories/fields")
async def get_category_fields():
    """Get available category fields for import/export"""
    return {
        "fields": CATEGORY_FIELDS,
        "required_fields": [f for f in CATEGORY_FIELDS if f.get("required")]
    }


@router.get("/categories/template")
async def download_category_template():
    """Download CSV template for category import"""
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header row
    headers = [f["label"] for f in CATEGORY_FIELDS]
    writer.writerow(headers)
    
    # Write sample row
    sample = [
        "cat-001",  # id
        "Electronics",  # name
        "electronics",  # slug
        "Electronic devices and accessories",  # description
        "",  # parent_id
        "https://example.com/category-image.jpg",  # image
        "active",  # status
        "1",  # sort_order
        "Electronics - Shop Latest Gadgets",  # meta_title
        "Browse our collection of electronic devices",  # meta_description
        "",  # created_at
        "",  # updated_at
    ]
    writer.writerow(sample)
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=categories_template.csv"}
    )


@router.post("/categories/preview")
async def preview_category_import(file: UploadFile = File(...)):
    """Preview category CSV file before import"""
    try:
        contents = await file.read()
        decoded = contents.decode('utf-8-sig')  # Handle BOM
        
        reader = csv.DictReader(io.StringIO(decoded))
        columns = reader.fieldnames or []
        
        rows = []
        for i, row in enumerate(reader):
            if i >= 10:  # Sample first 10 rows
                break
            rows.append(dict(row))
        
        total_rows = len(list(csv.DictReader(io.StringIO(decoded))))
        
        return {
            "total_rows": total_rows,
            "columns": columns,
            "sample_data": rows,
            "detected_mappings": auto_detect_mappings(columns, CATEGORY_FIELDS)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing CSV: {str(e)}")


@router.post("/categories/import")
async def import_categories(
    file: UploadFile = File(...),
    mappings: str = Query(..., description="JSON string of field mappings"),
    update_existing: bool = Query(False),
    skip_errors: bool = Query(True)
):
    """Import categories from CSV file"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    try:
        mapping_list = json.loads(mappings)
    except:
        raise HTTPException(status_code=400, detail="Invalid mappings JSON")
    
    # Create mapping dict
    field_map = {m['csv_column']: m['db_field'] for m in mapping_list if m.get('db_field')}
    
    contents = await file.read()
    decoded = contents.decode('utf-8-sig')
    reader = csv.DictReader(io.StringIO(decoded))
    
    # Get field type lookup
    field_types = {f['field']: f['type'] for f in CATEGORY_FIELDS}
    
    created = 0
    updated = 0
    errors = []
    now = datetime.now(timezone.utc).isoformat()
    
    for row_num, row in enumerate(reader, start=2):  # Start at 2 (header is row 1)
        try:
            # Map CSV columns to database fields
            category_data = {}
            for csv_col, db_field in field_map.items():
                if csv_col in row and db_field:
                    field_type = field_types.get(db_field, 'string')
                    category_data[db_field] = parse_csv_value(row[csv_col], field_type)
            
            # Validate required fields
            if not category_data.get('name'):
                raise ValueError("Category name is required")
            
            # Generate ID and slug if not provided
            if not category_data.get('id'):
                category_data['id'] = str(uuid4())
            
            if not category_data.get('slug'):
                category_data['slug'] = category_data['name'].lower().replace(' ', '-')
            
            # Set defaults
            category_data.setdefault('status', 'active')
            category_data.setdefault('sort_order', 0)
            category_data['updated_at'] = now
            
            # Check if exists
            existing = await db.categories.find_one({"name": category_data['name']}, {"_id": 0})
            
            if existing and update_existing:
                await db.categories.update_one(
                    {"name": category_data['name']},
                    {"$set": category_data}
                )
                updated += 1
            elif not existing:
                category_data['created_at'] = now
                await db.categories.insert_one(category_data)
                created += 1
            
        except Exception as e:
            errors.append({
                "row": row_num,
                "error": str(e),
                "data": dict(row)
            })
            if not skip_errors:
                raise HTTPException(status_code=400, detail=f"Error at row {row_num}: {str(e)}")
    
    return {
        "success": True,
        "total_processed": created + updated + len(errors),
        "created": created,
        "updated": updated,
        "errors": len(errors),
        "error_details": errors[:50]  # Return first 50 errors
    }


@router.post("/categories/export")
async def export_categories(config: ExportConfig):
    """Export categories to CSV"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    # Build query from filters
    query = {}
    if config.filters:
        if config.filters.get('status'):
            query['status'] = config.filters['status']
        if config.filters.get('parent_id'):
            query['parent_id'] = config.filters['parent_id']
    
    # Get categories
    categories = await db.categories.find(query, {"_id": 0}).to_list(10000)
    
    # Get field labels for header
    field_labels = {f['field']: f['label'] for f in CATEGORY_FIELDS}
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    headers = [field_labels.get(f, f) for f in config.fields]
    writer.writerow(headers)
    
    # Write data
    for cat in categories:
        row = []
        for field in config.fields:
            value = cat.get(field, '')
            if isinstance(value, list):
                value = ', '.join(str(v) for v in value)
            elif isinstance(value, dict):
                value = json.dumps(value)
            row.append(value if value is not None else '')
        writer.writerow(row)
    
    output.seek(0)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=categories_export_{timestamp}.csv"}
    )


# ==================== PRODUCT ENDPOINTS ====================

@router.get("/products/fields")
async def get_product_fields():
    """Get available product fields for import/export"""
    return {
        "fields": PRODUCT_FIELDS,
        "required_fields": [f for f in PRODUCT_FIELDS if f.get("required")]
    }


@router.get("/products/template")
async def download_product_template():
    """Download CSV template for product import"""
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header row
    headers = [f["label"] for f in PRODUCT_FIELDS]
    writer.writerow(headers)
    
    # Write sample row
    sample = [
        "",  # id
        "PROD-001",  # sku
        "Wireless Bluetooth Headphones",  # name
        "High-quality wireless headphones with noise cancellation",  # description
        "149.99",  # price
        "199.99",  # compare_price
        "75.00",  # cost
        "100",  # stock
        "10",  # low_stock_threshold
        "",  # category_id
        "",  # category_ids
        "Electronics",  # category_name
        "Sony",  # brand
        "TechStore",  # vendor
        "1234567890123",  # barcode
        "0.5",  # weight
        "kg",  # weight_unit
        "20x15x8 cm",  # dimensions
        "active",  # status
        "visible",  # visibility
        "standard",  # tax_class
        "https://example.com/image1.jpg",  # image_1
        "https://example.com/image2.jpg",  # image_2
        "",  # image_3
        "",  # image_4
        "",  # image_5
        "",  # image_6
        "Wireless Headphones - Buy Online",  # meta_title
        "Shop premium wireless headphones",  # meta_description
        "wireless, bluetooth, headphones",  # tags
        "",  # variant_options
        "",  # custom_fields
        "",  # created_at
        "",  # updated_at
    ]
    writer.writerow(sample)
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=products_template.csv"}
    )


@router.post("/products/preview")
async def preview_product_import(file: UploadFile = File(...)):
    """Preview product CSV file before import"""
    try:
        contents = await file.read()
        decoded = contents.decode('utf-8-sig')
        
        reader = csv.DictReader(io.StringIO(decoded))
        columns = reader.fieldnames or []
        
        rows = []
        for i, row in enumerate(reader):
            if i >= 10:
                break
            rows.append(dict(row))
        
        # Count total rows
        total_rows = len(list(csv.DictReader(io.StringIO(decoded))))
        
        return {
            "total_rows": total_rows,
            "columns": columns,
            "sample_data": rows,
            "detected_mappings": auto_detect_mappings(columns, PRODUCT_FIELDS)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing CSV: {str(e)}")


@router.post("/products/import")
async def import_products(
    file: UploadFile = File(...),
    mappings: str = Query(..., description="JSON string of field mappings"),
    update_existing: bool = Query(False),
    skip_errors: bool = Query(True)
):
    """Import products from CSV file"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    try:
        mapping_list = json.loads(mappings)
    except:
        raise HTTPException(status_code=400, detail="Invalid mappings JSON")
    
    field_map = {m['csv_column']: m['db_field'] for m in mapping_list if m.get('db_field')}
    field_types = {f['field']: f['type'] for f in PRODUCT_FIELDS}
    
    contents = await file.read()
    decoded = contents.decode('utf-8-sig')
    reader = csv.DictReader(io.StringIO(decoded))
    
    # Get categories for name lookup
    categories = await db.categories.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(1000)
    category_name_map = {c['name'].lower(): c['id'] for c in categories}
    
    created = 0
    updated = 0
    errors = []
    now = datetime.now(timezone.utc).isoformat()
    
    for row_num, row in enumerate(reader, start=2):
        try:
            product_data = {}
            images = []
            
            for csv_col, db_field in field_map.items():
                if csv_col in row and db_field:
                    field_type = field_types.get(db_field, 'string')
                    value = parse_csv_value(row[csv_col], field_type)
                    
                    # Handle image fields specially
                    if db_field.startswith('image_') and value:
                        img_num = int(db_field.split('_')[1]) - 1
                        while len(images) <= img_num:
                            images.append(None)
                        images[img_num] = value
                    else:
                        product_data[db_field] = value
            
            # Handle images array
            product_data['images'] = [img for img in images if img]
            
            # Handle category by name
            if product_data.get('category_name') and not product_data.get('category_id'):
                cat_name = product_data['category_name'].lower()
                if cat_name in category_name_map:
                    product_data['category_id'] = category_name_map[cat_name]
                del product_data['category_name']
            
            # Validate required fields
            if not product_data.get('sku'):
                raise ValueError("SKU is required")
            if not product_data.get('name'):
                raise ValueError("Product name is required")
            if product_data.get('price') is None:
                raise ValueError("Price is required")
            
            # Generate ID if not provided
            if not product_data.get('id'):
                product_data['id'] = str(uuid4())
            
            # Set defaults
            product_data.setdefault('stock', 0)
            product_data.setdefault('status', 'active')
            product_data.setdefault('visibility', 'visible')
            product_data['updated_at'] = now
            
            # Check if exists by SKU
            existing = await db.products.find_one({"sku": product_data['sku']}, {"_id": 0})
            
            if existing and update_existing:
                await db.products.update_one(
                    {"sku": product_data['sku']},
                    {"$set": product_data}
                )
                updated += 1
            elif not existing:
                product_data['created_at'] = now
                await db.products.insert_one(product_data)
                created += 1
            
        except Exception as e:
            errors.append({
                "row": row_num,
                "error": str(e),
                "data": dict(row)
            })
            if not skip_errors:
                raise HTTPException(status_code=400, detail=f"Error at row {row_num}: {str(e)}")
    
    return {
        "success": True,
        "total_processed": created + updated + len(errors),
        "created": created,
        "updated": updated,
        "errors": len(errors),
        "error_details": errors[:50]
    }


@router.post("/products/export")
async def export_products(config: ExportConfig):
    """Export products to CSV"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    # Build query from filters
    query = {}
    if config.filters:
        if config.filters.get('status'):
            query['status'] = config.filters['status']
        if config.filters.get('category_id'):
            query['$or'] = [
                {"category_id": config.filters['category_id']},
                {"category_ids": config.filters['category_id']}
            ]
        if config.filters.get('brand'):
            query['brand'] = config.filters['brand']
        if config.filters.get('stock_status') == 'in_stock':
            query['stock'] = {"$gt": 0}
        elif config.filters.get('stock_status') == 'out_of_stock':
            query['stock'] = {"$lte": 0}
    
    # Get products
    products = await db.products.find(query, {"_id": 0}).to_list(50000)
    
    # Get categories for name lookup
    categories = await db.categories.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(1000)
    category_id_map = {c['id']: c['name'] for c in categories}
    
    field_labels = {f['field']: f['label'] for f in PRODUCT_FIELDS}
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    headers = [field_labels.get(f, f) for f in config.fields]
    writer.writerow(headers)
    
    # Write data
    for prod in products:
        row = []
        for field in config.fields:
            if field == 'category_name':
                # Get category name from ID
                cat_id = prod.get('category_id', '')
                value = category_id_map.get(cat_id, '')
            elif field.startswith('image_'):
                # Get specific image from images array
                img_idx = int(field.split('_')[1]) - 1
                images = prod.get('images', [])
                value = images[img_idx] if img_idx < len(images) else ''
            else:
                value = prod.get(field, '')
            
            if isinstance(value, list):
                value = ', '.join(str(v) for v in value)
            elif isinstance(value, dict):
                value = json.dumps(value)
            
            row.append(value if value is not None else '')
        writer.writerow(row)
    
    output.seek(0)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=products_export_{timestamp}.csv"}
    )


# ==================== IMPORT JOBS (For Progress Tracking) ====================

import_jobs = {}

@router.get("/jobs/{job_id}")
async def get_import_job_status(job_id: str):
    """Get status of an import job"""
    if job_id not in import_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return import_jobs[job_id]
