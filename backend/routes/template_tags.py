"""
Template Tags Module
Provides system-level template tags for all entities and custom fields
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, List, Any

router = APIRouter(prefix="/api/template-tags", tags=["Template Tags"])

# Database reference (will be set from server.py)
db = None

def set_db(database):
    global db
    db = database


# ==================== DEFAULT SYSTEM TAGS ====================

SYSTEM_TAGS = {
    "products": {
        "title": "Product Tags",
        "description": "Tags available for product templates",
        "tags": [
            {"tag": "{{product_name}}", "field": "name", "description": "Product name/title"},
            {"tag": "{{product_sku}}", "field": "sku", "description": "Product SKU code"},
            {"tag": "{{product_price}}", "field": "price", "description": "Current selling price"},
            {"tag": "{{product_compare_price}}", "field": "compare_at_price", "description": "Original/compare price"},
            {"tag": "{{product_cost}}", "field": "cost_price", "description": "Cost price"},
            {"tag": "{{product_description}}", "field": "description", "description": "Full product description"},
            {"tag": "{{product_short_description}}", "field": "short_description", "description": "Short description/excerpt"},
            {"tag": "{{product_brand}}", "field": "brand", "description": "Brand name"},
            {"tag": "{{product_vendor}}", "field": "vendor", "description": "Vendor/supplier name"},
            {"tag": "{{product_barcode}}", "field": "barcode", "description": "Product barcode/UPC"},
            {"tag": "{{product_mpn}}", "field": "mpn", "description": "Manufacturer Part Number"},
            {"tag": "{{product_weight}}", "field": "weight", "description": "Product weight"},
            {"tag": "{{product_dimensions}}", "field": "dimensions", "description": "Product dimensions (LxWxH)"},
            {"tag": "{{product_stock}}", "field": "stock_quantity", "description": "Current stock quantity"},
            {"tag": "{{product_stock_status}}", "field": "stock_status", "description": "In Stock / Out of Stock"},
            {"tag": "{{product_image}}", "field": "main_image", "description": "Main product image URL"},
            {"tag": "{{product_images}}", "field": "images", "description": "All product images (array)"},
            {"tag": "{{product_url}}", "field": "slug", "description": "Product page URL"},
            {"tag": "{{product_category}}", "field": "category_name", "description": "Primary category name"},
            {"tag": "{{product_tags}}", "field": "tags", "description": "Product tags (comma separated)"},
            {"tag": "{{product_seo_title}}", "field": "seo_title", "description": "SEO meta title"},
            {"tag": "{{product_seo_description}}", "field": "seo_description", "description": "SEO meta description"},
            {"tag": "{{product_created_at}}", "field": "created_at", "description": "Date product was created"},
            {"tag": "{{product_updated_at}}", "field": "updated_at", "description": "Date product was last updated"},
            {"tag": "{{product_specs}}", "field": "specifications", "description": "Product specifications table"},
        ]
    },
    "categories": {
        "title": "Category Tags",
        "description": "Tags available for category templates",
        "tags": [
            {"tag": "{{category_name}}", "field": "name", "description": "Category name"},
            {"tag": "{{category_description}}", "field": "description", "description": "Category description"},
            {"tag": "{{category_image}}", "field": "image", "description": "Category image URL"},
            {"tag": "{{category_url}}", "field": "slug", "description": "Category page URL"},
            {"tag": "{{category_parent}}", "field": "parent_name", "description": "Parent category name"},
            {"tag": "{{category_product_count}}", "field": "product_count", "description": "Number of products"},
            {"tag": "{{category_seo_title}}", "field": "seo_title", "description": "SEO meta title"},
            {"tag": "{{category_seo_description}}", "field": "seo_description", "description": "SEO meta description"},
        ]
    },
    "pages": {
        "title": "Page Tags",
        "description": "Tags available for page templates",
        "tags": [
            {"tag": "{{page_title}}", "field": "name", "description": "Page title"},
            {"tag": "{{page_content}}", "field": "content", "description": "Page HTML content"},
            {"tag": "{{page_url}}", "field": "slug", "description": "Page URL slug"},
            {"tag": "{{page_image}}", "field": "main_image", "description": "Main page image"},
            {"tag": "{{page_alt_image}}", "field": "alt_image", "description": "Alternative page image"},
            {"tag": "{{page_seo_title}}", "field": "seo_title", "description": "SEO meta title"},
            {"tag": "{{page_seo_description}}", "field": "seo_description", "description": "SEO meta description"},
            {"tag": "{{page_seo_heading}}", "field": "seo_heading", "description": "SEO H1 heading"},
        ]
    },
    "blog_posts": {
        "title": "Blog Post Tags",
        "description": "Tags available for blog templates",
        "tags": [
            {"tag": "{{post_title}}", "field": "title", "description": "Blog post title"},
            {"tag": "{{post_content}}", "field": "content", "description": "Full post content"},
            {"tag": "{{post_excerpt}}", "field": "excerpt", "description": "Post excerpt/summary"},
            {"tag": "{{post_image}}", "field": "featured_image", "description": "Featured image URL"},
            {"tag": "{{post_author}}", "field": "author_name", "description": "Author name"},
            {"tag": "{{post_date}}", "field": "published_at", "description": "Publication date"},
            {"tag": "{{post_category}}", "field": "category_name", "description": "Post category"},
            {"tag": "{{post_tags}}", "field": "tags", "description": "Post tags (comma separated)"},
            {"tag": "{{post_url}}", "field": "slug", "description": "Post URL slug"},
            {"tag": "{{post_seo_title}}", "field": "seo_title", "description": "SEO meta title"},
            {"tag": "{{post_seo_description}}", "field": "seo_description", "description": "SEO meta description"},
        ]
    },
    "orders": {
        "title": "Order Tags",
        "description": "Tags available for order templates (emails, invoices)",
        "tags": [
            {"tag": "{{order_number}}", "field": "order_number", "description": "Order number"},
            {"tag": "{{order_date}}", "field": "created_at", "description": "Order date"},
            {"tag": "{{order_status}}", "field": "status", "description": "Order status"},
            {"tag": "{{order_subtotal}}", "field": "subtotal", "description": "Order subtotal"},
            {"tag": "{{order_tax}}", "field": "tax_total", "description": "Tax amount"},
            {"tag": "{{order_shipping}}", "field": "shipping_total", "description": "Shipping cost"},
            {"tag": "{{order_discount}}", "field": "discount_total", "description": "Discount amount"},
            {"tag": "{{order_total}}", "field": "total", "description": "Order total"},
            {"tag": "{{order_items}}", "field": "items", "description": "Order line items"},
            {"tag": "{{order_notes}}", "field": "notes", "description": "Order notes"},
        ]
    },
    "customers": {
        "title": "Customer Tags",
        "description": "Tags available for customer templates",
        "tags": [
            {"tag": "{{customer_name}}", "field": "name", "description": "Full customer name"},
            {"tag": "{{customer_first_name}}", "field": "first_name", "description": "First name"},
            {"tag": "{{customer_last_name}}", "field": "last_name", "description": "Last name"},
            {"tag": "{{customer_email}}", "field": "email", "description": "Email address"},
            {"tag": "{{customer_phone}}", "field": "phone", "description": "Phone number"},
            {"tag": "{{customer_company}}", "field": "company", "description": "Company name"},
            {"tag": "{{customer_address}}", "field": "address", "description": "Full address"},
            {"tag": "{{customer_city}}", "field": "city", "description": "City"},
            {"tag": "{{customer_state}}", "field": "state", "description": "State/Province"},
            {"tag": "{{customer_postcode}}", "field": "postcode", "description": "Postal/ZIP code"},
            {"tag": "{{customer_country}}", "field": "country", "description": "Country"},
        ]
    },
    "store": {
        "title": "Store Tags",
        "description": "Global store information tags",
        "tags": [
            {"tag": "{{store_name}}", "field": "store_name", "description": "Store name"},
            {"tag": "{{store_email}}", "field": "store_email", "description": "Store email"},
            {"tag": "{{store_phone}}", "field": "store_phone", "description": "Store phone"},
            {"tag": "{{store_address}}", "field": "store_address", "description": "Store address"},
            {"tag": "{{store_logo}}", "field": "store_logo", "description": "Store logo URL"},
            {"tag": "{{store_url}}", "field": "store_url", "description": "Store website URL"},
            {"tag": "{{store_currency}}", "field": "currency", "description": "Store currency code"},
            {"tag": "{{current_year}}", "field": "year", "description": "Current year"},
            {"tag": "{{current_date}}", "field": "date", "description": "Current date"},
        ]
    }
}

# Field to tag mapping for quick lookup
FIELD_TO_TAG_MAP = {}
for section, data in SYSTEM_TAGS.items():
    for tag_info in data["tags"]:
        key = f"{section}:{tag_info['field']}"
        FIELD_TO_TAG_MAP[key] = tag_info["tag"]


# ==================== API ENDPOINTS ====================

@router.get("")
async def get_all_template_tags():
    """Get all available template tags (system + custom fields)"""
    result = {
        "system_tags": SYSTEM_TAGS,
        "custom_tags": {}
    }
    
    # Get custom field tags if db is available
    if db is not None:
        try:
            custom_fields = await db.custom_fields.find(
                {"is_active": True, "show_in_storefront": True},
                {"_id": 0}
            ).to_list(500)
            
            # Group by section
            for field in custom_fields:
                for section in field.get("assigned_to", []):
                    if section not in result["custom_tags"]:
                        result["custom_tags"][section] = {
                            "title": f"Custom {section.replace('_', ' ').title()} Fields",
                            "tags": []
                        }
                    result["custom_tags"][section]["tags"].append({
                        "tag": f"{{{{custom_{field['field_key']}}}}}",
                        "field": field["field_key"],
                        "description": field.get("description") or field["name"],
                        "name": field["name"],
                        "type": field["field_type"]
                    })
        except Exception as e:
            print(f"Error fetching custom fields: {e}")
    
    return result


@router.get("/section/{section}")
async def get_tags_for_section(section: str):
    """Get all tags available for a specific section"""
    result = {
        "section": section,
        "system_tags": [],
        "custom_tags": []
    }
    
    # Get system tags
    if section in SYSTEM_TAGS:
        result["system_tags"] = SYSTEM_TAGS[section]["tags"]
    
    # Get custom field tags
    if db is not None:
        try:
            custom_fields = await db.custom_fields.find(
                {"is_active": True, "show_in_storefront": True, "assigned_to": section},
                {"_id": 0}
            ).to_list(100)
            
            for field in custom_fields:
                result["custom_tags"].append({
                    "tag": f"{{{{custom_{field['field_key']}}}}}",
                    "field": field["field_key"],
                    "description": field.get("description") or field["name"],
                    "name": field["name"],
                    "type": field["field_type"]
                })
        except Exception as e:
            print(f"Error fetching custom fields: {e}")
    
    return result


@router.get("/field/{section}/{field_name}")
async def get_tag_for_field(section: str, field_name: str):
    """Get the template tag for a specific field"""
    # Check system tags first
    key = f"{section}:{field_name}"
    if key in FIELD_TO_TAG_MAP:
        return {
            "tag": FIELD_TO_TAG_MAP[key],
            "field": field_name,
            "section": section,
            "type": "system"
        }
    
    # Check custom fields
    if db is not None:
        try:
            custom_field = await db.custom_fields.find_one(
                {"field_key": field_name, "assigned_to": section, "is_active": True},
                {"_id": 0}
            )
            if custom_field:
                return {
                    "tag": f"{{{{custom_{field_name}}}}}",
                    "field": field_name,
                    "section": section,
                    "type": "custom",
                    "name": custom_field["name"]
                }
        except Exception as e:
            print(f"Error fetching custom field: {e}")
    
    # Return a generated tag if not found
    return {
        "tag": f"{{{{{section}_{field_name}}}}}",
        "field": field_name,
        "section": section,
        "type": "generated"
    }


@router.get("/search")
async def search_tags(query: str = ""):
    """Search for tags by name or description"""
    results = []
    query_lower = query.lower()
    
    # Search system tags
    for section, data in SYSTEM_TAGS.items():
        for tag_info in data["tags"]:
            if (query_lower in tag_info["tag"].lower() or 
                query_lower in tag_info["description"].lower() or
                query_lower in tag_info["field"].lower()):
                results.append({
                    **tag_info,
                    "section": section,
                    "type": "system"
                })
    
    # Search custom tags
    if db is not None:
        try:
            custom_fields = await db.custom_fields.find(
                {
                    "is_active": True,
                    "$or": [
                        {"name": {"$regex": query, "$options": "i"}},
                        {"field_key": {"$regex": query, "$options": "i"}},
                        {"description": {"$regex": query, "$options": "i"}}
                    ]
                },
                {"_id": 0}
            ).to_list(50)
            
            for field in custom_fields:
                results.append({
                    "tag": f"{{{{custom_{field['field_key']}}}}}",
                    "field": field["field_key"],
                    "description": field.get("description") or field["name"],
                    "name": field["name"],
                    "section": ", ".join(field.get("assigned_to", [])),
                    "type": "custom"
                })
        except Exception as e:
            print(f"Error searching custom fields: {e}")
    
    return {"results": results, "total": len(results)}
