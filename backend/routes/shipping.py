"""
Comprehensive Shipping System - Maropost Style
Handles zones, categories, services, rates, and shipping calculation
"""

from fastapi import APIRouter, HTTPException, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid
import csv
import io
from motor.motor_asyncio import AsyncIOMotorClient
import os

router = APIRouter(prefix="/shipping", tags=["Shipping"])

# Database connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


# ============== PYDANTIC MODELS ==============

class ShippingZone(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str  # e.g., "SYD_METRO", "NSW_REGIONAL"
    name: str  # e.g., "Sydney Metro", "NSW Regional"
    country: str = "AU"
    postcodes: List[str] = []  # List of postcodes or ranges like "2000-2050"
    is_active: bool = True
    sort_order: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ShippingCategory(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str  # e.g., "Default", "Dangerous Goods", "Bulky Items"
    code: str
    description: Optional[str] = None
    is_default: bool = False
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ShippingRate(BaseModel):
    zone_code: str
    zone_name: str
    min_weight: float = 0
    max_weight: float = 999999
    max_length_mm: float = 0  # Maximum length in millimeters (0 = no limit)
    base_rate: float = 0
    min_charge: float = 0  # Minimum charge for this zone
    first_parcel: float = 0  # 1st Parcel rate (same as base_rate for backwards compatibility)
    per_subsequent: float = 0  # Per Subsequent Parcel rate
    per_kg_rate: float = 0
    add_weight: float = 0  # Additional weight charge
    delivery_days: int = 3
    internal_note: str = ""
    is_active: bool = True

class ShippingService(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str  # Customer-facing name
    code: str  # Internal code
    carrier: str = "custom"  # e.g., "australia_post", "startrack", "custom"
    charge_type: str = "weight"  # weight, cubic, fixed, flat, cart_total
    min_charge: float = 0
    max_charge: Optional[float] = None
    max_length: Optional[float] = None  # Maximum item length in mm (e.g., 1400)
    handling_fee: float = 0
    fuel_levy_percent: float = 0
    fuel_levy_amount: float = 0  # Flat dollar amount fuel levy
    cubic_weight_modifier: float = 250  # kg per cubic meter
    tax_inclusive: bool = False  # True = rates already include GST, False = GST will be added
    tax_rate: float = 10.0  # GST rate (default 10% for Australia)
    rates: List[ShippingRate] = []
    categories: List[str] = []  # Linked category codes
    is_active: bool = True
    sort_order: int = 0
    tracking_url_template: Optional[str] = None
    # Additional fields
    internal_description: Optional[str] = None
    packaging_allowance_kg: float = 0
    packaging_allowance_percent: float = 0
    round_up_weight: bool = False
    ignore_physical_weight: bool = False
    ship_to_po_box: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ShippingOption(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str  # Display name at checkout
    description: Optional[str] = None
    service_ids: List[str] = []  # Linked services
    countries: List[str] = ["AU"]  # Countries this applies to
    free_shipping_threshold: Optional[float] = None  # Cart total for free shipping
    free_shipping_zones: List[str] = []  # Zones eligible for free shipping
    is_active: bool = True
    sort_order: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PredefinedPackage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    code: str
    package_type: str  # satchel, box, pallet, custom
    length: float  # cm
    width: float  # cm
    height: float  # cm
    max_weight: float  # kg
    tare_weight: float = 0  # Packaging weight
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ShippingCalculationRequest(BaseModel):
    postcode: str
    suburb: Optional[str] = None  # Suburb for more accurate rate calculation
    country: str = "AU"
    items: List[Dict[str, Any]]  # [{product_id, quantity, weight, length, width, height, shipping_category}]
    cart_total: float

class ShippingCalculationResponse(BaseModel):
    options: List[Dict[str, Any]]
    zone: Optional[Dict[str, Any]] = None


# ============== SUBURB LOOKUP MODEL ==============

class SuburbEntry(BaseModel):
    postcode: str
    suburb: str
    state: str
    country: str = "AU"


# ============== SHIPPING ZONES ==============

@router.get("/zones")
async def get_shipping_zones(
    country: Optional[str] = None,
    is_active: Optional[bool] = None
):
    """Get all shipping zones"""
    query = {}
    if country:
        query["country"] = country
    if is_active is not None:
        query["is_active"] = is_active
    
    zones = await db.shipping_zones.find(query, {"_id": 0}).sort("sort_order", 1).to_list(1000)
    return zones

@router.get("/zones/{zone_id}")
async def get_shipping_zone(zone_id: str):
    """Get a specific shipping zone"""
    zone = await db.shipping_zones.find_one({"id": zone_id}, {"_id": 0})
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    return zone

@router.post("/zones")
async def create_shipping_zone(zone: ShippingZone):
    """Create a new shipping zone"""
    # Check for duplicate code
    existing = await db.shipping_zones.find_one({"code": zone.code})
    if existing:
        raise HTTPException(status_code=400, detail="Zone code already exists")
    
    zone_data = zone.dict()
    await db.shipping_zones.insert_one(zone_data)
    zone_data.pop("_id", None)
    return zone_data

@router.put("/zones/{zone_id}")
async def update_shipping_zone(zone_id: str, zone: ShippingZone):
    """Update a shipping zone"""
    existing = await db.shipping_zones.find_one({"id": zone_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Zone not found")
    
    zone_data = zone.dict()
    zone_data["id"] = zone_id
    await db.shipping_zones.update_one({"id": zone_id}, {"$set": zone_data})
    return {"message": "Zone updated successfully"}

@router.delete("/zones/{zone_id}")
async def delete_shipping_zone(zone_id: str):
    """Delete a shipping zone"""
    result = await db.shipping_zones.delete_one({"id": zone_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Zone not found")
    return {"message": "Zone deleted successfully"}


# ============== ZONES IMPORT/EXPORT ==============

class ZoneImportRow(BaseModel):
    country: str
    courier: str
    from_post_code: str
    to_post_code: str
    zone_code: str
    zone_name: str

@router.get("/zones/export/csv")
async def export_shipping_zones_csv():
    """
    Export all shipping zones to CSV in Maropost format
    Format: Country, Courier, From Post Code, To Post Code, Zone Code, Zone Name
    """
    zones = await db.shipping_zones.find({}, {"_id": 0}).sort("sort_order", 1).to_list(1000)
    
    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow(["Country", "Courier", "From Post Code", "To Post Code", "Zone Code", "Zone Name"])
    
    # Write zone data - expand postcode ranges into rows
    for zone in zones:
        country = zone.get("country", "AU")
        courier = zone.get("carrier", "Custom")
        zone_code = zone.get("code", "")
        zone_name = zone.get("name", "")
        
        for postcode_range in zone.get("postcodes", []):
            if "-" in postcode_range:
                # It's a range like "2000-2500"
                parts = postcode_range.split("-")
                from_pc = parts[0].strip()
                to_pc = parts[1].strip() if len(parts) > 1 else from_pc
            else:
                # Single postcode
                from_pc = postcode_range.strip()
                to_pc = postcode_range.strip()
            
            writer.writerow([country, courier, from_pc, to_pc, zone_code, zone_name])
    
    # Prepare response
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=shipping_zones_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        }
    )

@router.get("/zones/export/template")
async def get_zone_import_template():
    """
    Get a blank CSV template for importing shipping zones
    """
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow(["Country", "Courier", "From Post Code", "To Post Code", "Zone Code", "Zone Name"])
    
    # Add sample rows
    writer.writerow(["AU", "Australia Post", "2000", "2500", "SYD", "Sydney Metro"])
    writer.writerow(["AU", "Australia Post", "3000", "3500", "MEL", "Melbourne Metro"])
    writer.writerow(["AU", "Custom", "4000", "4500", "BNE", "Brisbane Metro"])
    
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=shipping_zones_template.csv"
        }
    )

@router.post("/zones/import/csv")
async def import_shipping_zones_csv(
    file: UploadFile = File(...),
    mode: str = Query("merge", description="Import mode: 'merge' (add/update) or 'replace' (clear and import)")
):
    """
    Import shipping zones from CSV in Maropost format
    Format: Country, Courier, From Post Code, To Post Code, Zone Code, Zone Name
    
    Modes:
    - merge: Add new zones and update existing ones (based on zone_code)
    - replace: Clear all zones and import fresh
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    try:
        # Read file content
        content = await file.read()
        decoded = content.decode('utf-8-sig')  # Handle BOM if present
        
        # Parse CSV
        reader = csv.DictReader(io.StringIO(decoded))
        
        # Group rows by zone_code to consolidate postcodes
        zones_dict = {}
        import_count = 0
        
        for row in reader:
            zone_code = row.get("Zone Code", "").strip().upper()
            if not zone_code:
                continue
                
            from_pc = row.get("From Post Code", "").strip()
            to_pc = row.get("To Post Code", "").strip()
            
            # Create postcode range string
            if from_pc and to_pc:
                if from_pc == to_pc:
                    postcode_range = from_pc
                else:
                    postcode_range = f"{from_pc}-{to_pc}"
            elif from_pc:
                postcode_range = from_pc
            else:
                continue
            
            if zone_code not in zones_dict:
                zones_dict[zone_code] = {
                    "code": zone_code,
                    "name": row.get("Zone Name", "").strip() or zone_code,
                    "country": row.get("Country", "AU").strip().upper(),
                    "carrier": row.get("Courier", "Custom").strip(),
                    "postcodes": [],
                    "is_active": True
                }
            
            # Add postcode if not already present
            if postcode_range and postcode_range not in zones_dict[zone_code]["postcodes"]:
                zones_dict[zone_code]["postcodes"].append(postcode_range)
            
            import_count += 1
        
        if not zones_dict:
            raise HTTPException(status_code=400, detail="No valid zones found in CSV")
        
        # Handle import mode
        if mode == "replace":
            # Clear existing zones
            await db.shipping_zones.delete_many({})
        
        # Process zones
        created = 0
        updated = 0
        
        for zone_code, zone_data in zones_dict.items():
            existing = await db.shipping_zones.find_one({"code": zone_code})
            
            if existing:
                # Update existing zone - merge postcodes
                if mode == "merge":
                    existing_postcodes = set(existing.get("postcodes", []))
                    new_postcodes = set(zone_data["postcodes"])
                    merged_postcodes = list(existing_postcodes.union(new_postcodes))
                    
                    await db.shipping_zones.update_one(
                        {"code": zone_code},
                        {"$set": {
                            "name": zone_data["name"],
                            "country": zone_data["country"],
                            "postcodes": merged_postcodes
                        }}
                    )
                else:
                    await db.shipping_zones.update_one(
                        {"code": zone_code},
                        {"$set": zone_data}
                    )
                updated += 1
            else:
                # Create new zone
                zone_data["id"] = str(uuid.uuid4())
                zone_data["sort_order"] = created
                zone_data["created_at"] = datetime.now(timezone.utc).isoformat()
                await db.shipping_zones.insert_one(zone_data)
                created += 1
        
        return {
            "message": "Import completed successfully",
            "mode": mode,
            "rows_processed": import_count,
            "zones_created": created,
            "zones_updated": updated,
            "total_zones": created + updated
        }
        
    except csv.Error as e:
        raise HTTPException(status_code=400, detail=f"CSV parsing error: {str(e)}")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File encoding error. Please use UTF-8 encoded CSV.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import error: {str(e)}")

@router.delete("/zones/bulk")
async def delete_all_shipping_zones():
    """Delete all shipping zones"""
    result = await db.shipping_zones.delete_many({})
    return {
        "message": f"Deleted {result.deleted_count} shipping zones",
        "deleted_count": result.deleted_count
    }


# ============== SHIPPING CATEGORIES ==============

@router.get("/categories")
async def get_shipping_categories(is_active: Optional[bool] = None):
    """Get all shipping categories"""
    query = {}
    if is_active is not None:
        query["is_active"] = is_active
    
    categories = await db.shipping_categories.find(query, {"_id": 0}).to_list(1000)
    return categories

@router.post("/categories")
async def create_shipping_category(category: ShippingCategory):
    """Create a new shipping category"""
    existing = await db.shipping_categories.find_one({"code": category.code})
    if existing:
        raise HTTPException(status_code=400, detail="Category code already exists")
    
    category_data = category.dict()
    await db.shipping_categories.insert_one(category_data)
    category_data.pop("_id", None)
    return category_data

@router.put("/categories/{category_id}")
async def update_shipping_category(category_id: str, category: ShippingCategory):
    """Update a shipping category"""
    existing = await db.shipping_categories.find_one({"id": category_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found")
    
    category_data = category.dict()
    category_data["id"] = category_id
    await db.shipping_categories.update_one({"id": category_id}, {"$set": category_data})
    return {"message": "Category updated successfully"}

@router.delete("/categories/{category_id}")
async def delete_shipping_category(category_id: str):
    """Delete a shipping category"""
    result = await db.shipping_categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted successfully"}


# ============== SHIPPING SERVICES & RATES ==============

@router.get("/services")
async def get_shipping_services(
    carrier: Optional[str] = None,
    is_active: Optional[bool] = None
):
    """Get all shipping services"""
    query = {}
    if carrier:
        query["carrier"] = carrier
    if is_active is not None:
        query["is_active"] = is_active
    
    services = await db.shipping_services.find(query, {"_id": 0}).sort("sort_order", 1).to_list(1000)
    return services

@router.get("/services/{service_id}")
async def get_shipping_service(service_id: str):
    """Get a specific shipping service with rates"""
    service = await db.shipping_services.find_one({"id": service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    return service

@router.post("/services")
async def create_shipping_service(service: ShippingService):
    """Create a new shipping service"""
    existing = await db.shipping_services.find_one({"code": service.code})
    if existing:
        raise HTTPException(status_code=400, detail="Service code already exists")
    
    service_data = service.dict()
    await db.shipping_services.insert_one(service_data)
    service_data.pop("_id", None)
    return service_data

@router.put("/services/{service_id}")
async def update_shipping_service(service_id: str, service: ShippingService):
    """Update a shipping service"""
    existing = await db.shipping_services.find_one({"id": service_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Service not found")
    
    service_data = service.dict()
    service_data["id"] = service_id
    # Preserve created_at from existing
    service_data["created_at"] = existing.get("created_at", service_data.get("created_at"))
    
    await db.shipping_services.update_one({"id": service_id}, {"$set": service_data})
    
    # Return updated service
    updated = await db.shipping_services.find_one({"id": service_id}, {"_id": 0})
    return updated

@router.delete("/services/{service_id}")
async def delete_shipping_service(service_id: str):
    """Delete a shipping service"""
    result = await db.shipping_services.delete_one({"id": service_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Service not found")
    return {"message": "Service deleted successfully"}


# ============== RATES IMPORT/EXPORT (Maropost Format) ==============

@router.get("/services/{service_id}/rates/export/csv")
async def export_service_rates_csv(service_id: str):
    """
    Export shipping service rates to CSV in Maropost format
    Format: Zone Code, Zone Name, Courier Name, Minimum Charge, 1st Parcel, 
            Per Subsequent Parcel, Per Kg, Minimum, Maximum, Add weight, Delivery Time, Internal Note
    """
    service = await db.shipping_services.find_one({"id": service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header (Maropost format)
    writer.writerow([
        "Zone Code", "Zone Name", "Courier Name", "Minimum Charge", "1st Parcel",
        "Per Subsequent Parcel", "Per Kg", "Minimum", "Maximum", "Add weight",
        "Delivery Time", "Internal Note"
    ])
    
    # Write rates
    for rate in service.get("rates", []):
        writer.writerow([
            rate.get("zone_code", ""),
            rate.get("zone_name", rate.get("zone_code", "")),
            service.get("carrier", "Custom"),
            rate.get("base_rate", 0),           # Minimum Charge
            rate.get("first_parcel", rate.get("base_rate", 0)),  # 1st Parcel
            rate.get("per_subsequent", ""),     # Per Subsequent Parcel
            rate.get("per_kg_rate", 0),         # Per Kg
            rate.get("min_weight", 0),          # Minimum weight
            rate.get("max_weight", ""),         # Maximum weight
            rate.get("add_weight", ""),         # Add weight
            rate.get("delivery_days", ""),      # Delivery Time
            rate.get("internal_note", "")       # Internal Note
        ])
    
    output.seek(0)
    
    service_name = service.get("name", "service").replace(" ", "_")
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=ShippingRate_{service_name}_{datetime.now().strftime('%Y%m%d%H%M%S')}.csv"
        }
    )

@router.get("/rates/export/template")
async def get_rate_import_template():
    """
    Get a blank CSV template for importing shipping rates (Maropost format)
    """
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header - matches Maropost export format
    writer.writerow([
        "Zone Code", "Zone Name", "Courier Name", "Minimum Charge", "1st Parcel",
        "Per Subsequent Parcel", "Per Kg", "Minimum", "Maximum", "Maximum Length",
        "Add weight", "Delivery Time", "Internal Note"
    ])
    
    # Add sample rows
    writer.writerow(["SYD-METRO", "Sydney Metro", "StarTrack", "18.48", "12.14", "", "0.43", "0", "", "2000", "", "2", ""])
    writer.writerow(["MEL-METRO", "Melbourne Metro", "StarTrack", "20.72", "12.14", "", "0.58", "0", "", "2000", "", "3", ""])
    writer.writerow(["BNE-METRO", "Brisbane Metro", "StarTrack", "21.22", "12.14", "", "0.61", "0", "", "2000", "", "3", ""])
    writer.writerow(["REGIONAL", "Regional", "Australia Post", "28.48", "13.82", "", "0.98", "0", "", "1500", "", "5", ""])
    
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=shipping_rates_template.csv"
        }
    )

@router.post("/services/{service_id}/rates/import/csv")
async def import_service_rates_csv(
    service_id: str,
    file: UploadFile = File(...),
    mode: str = Query("merge", description="Import mode: 'merge' (add/update) or 'replace' (clear and import)")
):
    """
    Import shipping rates from CSV in Maropost format
    Format: Zone Code, Zone Name, Courier Name, Minimum Charge, 1st Parcel, 
            Per Subsequent Parcel, Per Kg, Minimum, Maximum, Add weight, Delivery Time, Internal Note
    
    Modes:
    - merge: Add new rates and update existing ones (by zone_code)
    - replace: Clear all rates and import fresh
    """
    service = await db.shipping_services.find_one({"id": service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    try:
        content = await file.read()
        decoded = content.decode('utf-8-sig')
        reader = csv.DictReader(io.StringIO(decoded))
        
        imported_rates = []
        for row in reader:
            zone_code = row.get("Zone Code", "").strip()
            if not zone_code:
                continue
            
            rate = {
                "zone_code": zone_code,
                "zone_name": row.get("Zone Name", "").strip() or zone_code,
                "min_charge": float(row.get("Minimum Charge", 0) or 0),  # Minimum charge for this zone
                "base_rate": float(row.get("Minimum Charge", 0) or 0),  # Keep for backwards compatibility
                "first_parcel": float(row.get("1st Parcel", 0) or 0),
                "per_subsequent": float(row.get("Per Subsequent Parcel", 0) or 0) if row.get("Per Subsequent Parcel") else 0,
                "per_kg_rate": float(row.get("Per Kg", 0) or 0),
                "min_weight": float(row.get("Minimum", 0) or 0),
                "max_weight": float(row.get("Maximum", 999) or 999) if row.get("Maximum") else 999,
                "max_length_mm": float(row.get("Maximum Length", 0) or 0),  # Maximum length in MM
                "add_weight": float(row.get("Add weight", 0) or 0) if row.get("Add weight") else 0,
                "delivery_days": int(row.get("Delivery Time", 0) or 0) if row.get("Delivery Time") else 0,
                "internal_note": row.get("Internal Note", "").strip(),
                "is_active": True
            }
            imported_rates.append(rate)
        
        if not imported_rates:
            raise HTTPException(status_code=400, detail="No valid rates found in CSV")
        
        # Handle import mode
        if mode == "replace":
            # Replace all rates
            new_rates = imported_rates
        else:
            # Merge: update existing by zone_code, add new ones
            existing_rates = {r["zone_code"]: r for r in service.get("rates", [])}
            for rate in imported_rates:
                existing_rates[rate["zone_code"]] = rate
            new_rates = list(existing_rates.values())
        
        # Update service with new rates
        await db.shipping_services.update_one(
            {"id": service_id},
            {"$set": {"rates": new_rates}}
        )
        
        return {
            "message": "Rates imported successfully",
            "mode": mode,
            "rates_imported": len(imported_rates),
            "total_rates": len(new_rates)
        }
        
    except csv.Error as e:
        raise HTTPException(status_code=400, detail=f"CSV parsing error: {str(e)}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid number format: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import error: {str(e)}")

@router.post("/services/create-with-zones")
async def create_service_with_zones(
    name: str = Query(..., description="Service name"),
    code: str = Query(..., description="Service code"),
    carrier: str = Query("custom", description="Carrier name"),
    zone_ids: Optional[str] = Query(None, description="Comma-separated zone IDs to auto-add")
):
    """
    Create a new shipping service and optionally auto-populate rates from zones.
    If zone_ids provided, creates a rate entry for each zone with default values.
    """
    # Check if code already exists
    existing = await db.shipping_services.find_one({"code": code})
    if existing:
        raise HTTPException(status_code=400, detail="Service code already exists")
    
    rates = []
    
    # If zone_ids provided, create rate entries for each zone
    if zone_ids:
        zone_id_list = [z.strip() for z in zone_ids.split(",") if z.strip()]
        
        for zone_id in zone_id_list:
            zone = await db.shipping_zones.find_one({"id": zone_id}, {"_id": 0})
            if zone:
                rates.append({
                    "zone_code": zone["code"],
                    "zone_name": zone["name"],
                    "base_rate": 0,
                    "first_parcel": 0,
                    "per_subsequent": 0,
                    "per_kg_rate": 0,
                    "min_weight": 0,
                    "max_weight": 999,
                    "delivery_days": 3,
                    "is_active": True
                })
    
    service_data = {
        "id": str(uuid.uuid4()),
        "name": name,
        "code": code,
        "carrier": carrier,
        "charge_type": "weight",
        "min_charge": 0,
        "max_charge": None,
        "handling_fee": 0,
        "fuel_levy_percent": 0,
        "cubic_weight_modifier": 250,
        "categories": ["default"],
        "is_active": True,
        "sort_order": 0,
        "rates": rates,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.shipping_services.insert_one(service_data)
    service_data.pop("_id", None)
    
    return {
        "message": "Service created successfully",
        "service": service_data,
        "rates_created": len(rates)
    }

@router.get("/zones/by-carrier/{carrier}")
async def get_zones_by_carrier(carrier: str):
    """Get all shipping zones associated with a specific carrier"""
    zones = await db.shipping_zones.find(
        {"carrier": {"$regex": carrier, "$options": "i"}},
        {"_id": 0}
    ).to_list(1000)
    return zones


# ============== SHIPPING OPTIONS ==============

@router.get("/options")
async def get_shipping_options(
    country: Optional[str] = None,
    is_active: Optional[bool] = None
):
    """Get all shipping options"""
    query = {}
    if country:
        query["countries"] = country
    if is_active is not None:
        query["is_active"] = is_active
    
    options = await db.shipping_options.find(query, {"_id": 0}).sort("sort_order", 1).to_list(1000)
    return options

@router.post("/options")
async def create_shipping_option(option: ShippingOption):
    """Create a new shipping option"""
    option_data = option.dict()
    await db.shipping_options.insert_one(option_data)
    option_data.pop("_id", None)
    return option_data

@router.put("/options/{option_id}")
async def update_shipping_option(option_id: str, option: ShippingOption):
    """Update a shipping option"""
    existing = await db.shipping_options.find_one({"id": option_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Option not found")
    
    option_data = option.dict()
    option_data["id"] = option_id
    await db.shipping_options.update_one({"id": option_id}, {"$set": option_data})
    return {"message": "Option updated successfully"}

@router.delete("/options/{option_id}")
async def delete_shipping_option(option_id: str):
    """Delete a shipping option"""
    result = await db.shipping_options.delete_one({"id": option_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Option not found")
    return {"message": "Option deleted successfully"}


# ============== PREDEFINED PACKAGES ==============

@router.get("/packages")
async def get_predefined_packages(is_active: Optional[bool] = None):
    """Get all predefined packages"""
    query = {}
    if is_active is not None:
        query["is_active"] = is_active
    
    packages = await db.shipping_packages.find(query, {"_id": 0}).to_list(1000)
    return packages

@router.post("/packages")
async def create_predefined_package(package: PredefinedPackage):
    """Create a new predefined package"""
    existing = await db.shipping_packages.find_one({"code": package.code})
    if existing:
        raise HTTPException(status_code=400, detail="Package code already exists")
    
    package_data = package.dict()
    await db.shipping_packages.insert_one(package_data)
    package_data.pop("_id", None)
    return package_data

@router.put("/packages/{package_id}")
async def update_predefined_package(package_id: str, package: PredefinedPackage):
    """Update a predefined package"""
    existing = await db.shipping_packages.find_one({"id": package_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Package not found")
    
    package_data = package.dict()
    package_data["id"] = package_id
    await db.shipping_packages.update_one({"id": package_id}, {"$set": package_data})
    return {"message": "Package updated successfully"}

@router.delete("/packages/{package_id}")
async def delete_predefined_package(package_id: str):
    """Delete a predefined package"""
    result = await db.shipping_packages.delete_one({"id": package_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Package not found")
    return {"message": "Package deleted successfully"}


# ============== SHIPPING CALCULATION ==============

def find_zone_for_postcode(postcode: str, zones: List[dict]) -> Optional[dict]:
    """Find the matching zone for a given postcode (returns first match for backwards compatibility)"""
    matching_zones = find_all_zones_for_postcode(postcode, zones)
    return matching_zones[0] if matching_zones else None

def find_all_zones_for_postcode(postcode: str, zones: List[dict]) -> List[dict]:
    """Find ALL matching zones for a given postcode"""
    postcode = postcode.strip()
    matching = []
    
    for zone in zones:
        for pc in zone.get("postcodes", []):
            matched = False
            # Check for exact match
            if pc == postcode:
                matched = True
            # Check for range (e.g., "2000-2050")
            elif "-" in str(pc):
                try:
                    start, end = str(pc).split("-")
                    if int(start) <= int(postcode) <= int(end):
                        matched = True
                except (ValueError, TypeError):
                    pass
            # Check for prefix match (e.g., "20" matches "2000", "2001", etc.)
            elif postcode.startswith(str(pc)):
                matched = True
            
            if matched:
                matching.append(zone)
                break  # Found match for this zone, move to next zone
    
    return matching

def calculate_cubic_weight(length: float, width: float, height: float, modifier: float = 250) -> float:
    """Calculate cubic weight in kg (dimensions in cm)"""
    # Convert cm to meters and calculate cubic meters
    cubic_meters = (length / 100) * (width / 100) * (height / 100)
    return cubic_meters * modifier

def calculate_item_weight(item: dict, service: dict) -> float:
    """Calculate the chargeable weight for an item (actual or cubic, whichever is greater)"""
    actual_weight = item.get("weight", 0.5) * item.get("quantity", 1)
    
    if service.get("charge_type") == "cubic":
        length = item.get("length", 10)
        width = item.get("width", 10)
        height = item.get("height", 10)
        modifier = service.get("cubic_weight_modifier", 250)
        cubic_weight = calculate_cubic_weight(length, width, height, modifier) * item.get("quantity", 1)
        return max(actual_weight, cubic_weight)
    
    return actual_weight

@router.post("/calculate")
async def calculate_shipping(request: ShippingCalculationRequest):
    """
    Calculate shipping options for a cart
    This is the main shipping calculator that matches the Maropost logic
    """
    # Get all active zones
    zones = await db.shipping_zones.find(
        {"country": request.country, "is_active": True}, 
        {"_id": 0}
    ).to_list(1000)
    
    # Find ALL zones for the destination postcode (multiple carriers may have different zones)
    matching_zones = find_all_zones_for_postcode(request.postcode, zones)
    
    if not matching_zones:
        # Return pickup only if no zone found
        return ShippingCalculationResponse(
            options=[{
                "id": "pickup",
                "name": "Pickup - In Store",
                "price": 0,
                "delivery_days": 0,
                "description": "Collect from store"
            }],
            zone=None
        )
    
    # Get all active services
    services = await db.shipping_services.find(
        {"is_active": True}, 
        {"_id": 0}
    ).sort("sort_order", 1).to_list(1000)
    
    # Get shipping options
    options = await db.shipping_options.find(
        {"is_active": True, "countries": request.country}, 
        {"_id": 0}
    ).sort("sort_order", 1).to_list(1000)
    
    # Calculate total weight and cubic weight, check categories
    total_actual_weight = 0
    total_cubic_weight = 0
    item_categories = set()
    cubic_modifier = 250  # Default cubic weight modifier (kg per cubic meter)
    
    for item in request.items:
        qty = item.get("quantity", 1)
        
        # Actual weight
        actual_weight = item.get("weight", 0.5) * qty
        total_actual_weight += actual_weight
        
        # Calculate cubic weight from shipping dimensions (dimensions are in mm)
        # Formula: (L × W × H in mm) / 1,000,000,000 × Cubic Modifier = Cubic Weight in kg
        shipping_length = item.get("shipping_length") or item.get("length", 0)
        shipping_width = item.get("shipping_width") or item.get("width", 0)
        shipping_height = item.get("shipping_height") or item.get("height", 0)
        
        if shipping_length and shipping_width and shipping_height:
            # Calculate cubic weight: (L × W × H in mm) / 1,000,000,000 × modifier
            volume_m3 = (shipping_length * shipping_width * shipping_height) / 1000000000
            item_cubic_weight = volume_m3 * cubic_modifier * qty
            total_cubic_weight += item_cubic_weight
        else:
            # Fall back to actual weight if no dimensions
            total_cubic_weight += actual_weight
        
        if item.get("shipping_category"):
            item_categories.add(item["shipping_category"])
    
    # Default category if none specified
    if not item_categories:
        item_categories.add("default")
    
    # Calculate shipping for each service
    calculated_options = []
    
    # Always add pickup option
    calculated_options.append({
        "id": "pickup",
        "name": "Pickup - In Store",
        "price": 0,
        "delivery_days": 0,
        "description": "Collect from store",
        "service_code": "pickup"
    })
    
    for service in services:
        # Get service's cubic weight modifier
        service_cubic_modifier = service.get("cubic_weight_modifier", 250)
        
        # Recalculate cubic weight with service's modifier if different
        if service_cubic_modifier != cubic_modifier:
            service_cubic_weight = 0
            for item in request.items:
                qty = item.get("quantity", 1)
                shipping_length = item.get("shipping_length") or item.get("length", 0)
                shipping_width = item.get("shipping_width") or item.get("width", 0)
                shipping_height = item.get("shipping_height") or item.get("height", 0)
                
                if shipping_length and shipping_width and shipping_height:
                    # Dimensions are in mm, convert to m³
                    volume_m3 = (shipping_length * shipping_width * shipping_height) / 1000000000
                    service_cubic_weight += volume_m3 * service_cubic_modifier * qty
                else:
                    service_cubic_weight += item.get("weight", 0.5) * qty
        else:
            service_cubic_weight = total_cubic_weight
        
        # Use the GREATER of actual weight vs cubic weight (industry standard)
        chargeable_weight = max(total_actual_weight, service_cubic_weight)
        
        # Calculate max item length in mm (shipping dimensions are already in mm)
        max_item_length_mm = 0
        for item in request.items:
            # Get the longest dimension (could be length, width, or height)
            item_length_mm = max(
                item.get("shipping_length", 0) or 0,
                item.get("shipping_width", 0) or 0,
                item.get("shipping_height", 0) or 0
            )
            max_item_length_mm = max(max_item_length_mm, item_length_mm)
        
        # Check if service applies to item categories
        service_categories = set(service.get("categories", []))
        if service_categories and not service_categories.intersection(item_categories):
            continue
        
        # Check service-level max_length constraint (in mm)
        service_max_length_mm = service.get("max_length")
        if service_max_length_mm and service_max_length_mm > 0:
            if max_item_length_mm > service_max_length_mm:
                # Item exceeds service max length, skip this service entirely
                continue
        
        # Find rate by checking ALL matching zones (case-insensitive match)
        rate = None
        matched_zone = None
        for zone in matching_zones:
            zone_code = zone.get("code", "").upper()
            for r in service.get("rates", []):
                rate_zone_code = r.get("zone_code", "").upper()
                if rate_zone_code == zone_code:
                    # Check weight range against chargeable weight
                    if r.get("min_weight", 0) <= chargeable_weight <= r.get("max_weight", 999999):
                        # Check max length constraint (if set)
                        rate_max_length = r.get("max_length_mm", 0)
                        if rate_max_length > 0 and max_item_length_mm > rate_max_length:
                            # Item exceeds max length for this rate, skip
                            continue
                        if r.get("is_active", True):
                            rate = r
                            matched_zone = zone
                            break
            if rate:
                break
        
        if not rate:
            continue
        
        # Count number of parcels (each unit is a separate parcel, based on total quantity)
        num_parcels = sum(item.get("quantity", 1) for item in request.items)
        
        # Get rate values
        per_parcel_rate = rate.get("per_parcel_rate", rate.get("first_parcel", rate.get("base_rate", 0)))
        per_kg_rate = rate.get("per_kg_rate", 0)
        rate_min_charge = rate.get("min_charge", 0)
        
        # Get fuel levy settings
        fuel_levy_percent = service.get("fuel_levy_percent", 0)
        fuel_levy_amount = service.get("fuel_levy_amount", 0)
        
        # ============================================================
        # MAROPOST CALCULATION METHOD:
        # 1. Combine cubic weights for all items
        # 2. Apply per-kg rate to COMBINED weight
        # 3. Add per-parcel fee × number of parcels
        # 4. Apply minimum charge × number of parcels (min is per parcel)
        # 5. Apply fuel levy percentage
        # 6. Add flat fuel levy ONCE (only for multi-parcel orders)
        # 7. GST added at the end
        # ============================================================
        
        # Step 1-2: Calculate per-kg charge on COMBINED chargeable weight
        kg_charge = chargeable_weight * per_kg_rate
        
        # Step 3: Add per-parcel fee for each parcel
        parcel_charge = per_parcel_rate * num_parcels
        
        # Subtotal before min charge
        subtotal = kg_charge + parcel_charge
        
        # Step 4: Apply minimum charge PER PARCEL
        # Min charge is multiplied by number of parcels
        min_total = rate_min_charge * num_parcels if rate_min_charge > 0 else 0
        base_freight = max(subtotal, min_total)
        
        # Step 5: Apply fuel levy percentage
        if fuel_levy_percent > 0:
            base_freight = base_freight * (1 + fuel_levy_percent / 100)
        
        # Step 6: Add flat fuel levy ONCE (applies to all orders)
        if fuel_levy_amount > 0:
            base_freight += fuel_levy_amount
        
        # Add handling fee (per item)
        handling_fee = service.get("handling_fee", 0)
        if handling_fee > 0:
            base_freight += handling_fee * num_parcels
        
        base_price = base_freight
        
        # Apply service-level min/max charge (overrides rate-level)
        if service.get("min_charge", 0) > 0:
            base_price = max(base_price, service.get("min_charge", 0))
        if service.get("max_charge") and service.get("max_charge") > 0:
            base_price = min(base_price, service.get("max_charge"))
        
        # Check for free shipping
        is_free = False
        for option in options:
            if service["id"] in option.get("service_ids", []):
                threshold = option.get("free_shipping_threshold")
                free_zones = option.get("free_shipping_zones", [])
                
                if threshold and request.cart_total >= threshold:
                    if not free_zones or zone.get("code") in free_zones:
                        is_free = True
                        break
        
        # Calculate GST
        tax_inclusive = service.get("tax_inclusive", False)
        tax_rate = service.get("tax_rate", 10.0)  # Default 10% GST for Australia
        
        if is_free:
            final_price = 0
            gst_amount = 0
            price_ex_gst = 0
        elif tax_inclusive:
            # Rates already include GST - extract GST from total
            final_price = round(base_price, 2)
            gst_amount = round(base_price - (base_price / (1 + tax_rate / 100)), 2)
            price_ex_gst = round(base_price - gst_amount, 2)
        else:
            # Rates exclude GST - add GST to total
            price_ex_gst = round(base_price, 2)
            gst_amount = round(base_price * (tax_rate / 100), 2)
            final_price = round(base_price + gst_amount, 2)
        
        calculated_options.append({
            "id": service["id"],
            "name": service["name"],
            "price": final_price,
            "price_ex_gst": price_ex_gst,
            "gst_amount": gst_amount,
            "tax_inclusive": tax_inclusive,
            "tax_rate": tax_rate,
            "delivery_days": rate.get("delivery_days", 3),
            "description": f"{rate.get('delivery_days', 3)} business days" if not is_free else "Free shipping",
            "service_code": service["code"],
            "carrier": service.get("carrier", "custom"),
            "is_free": is_free
        })
    
    # Use the first matching zone for response (or None if no options)
    primary_zone = matching_zones[0] if matching_zones else None
    
    return ShippingCalculationResponse(
        options=calculated_options,
        zone={
            "code": primary_zone.get("code") if primary_zone else None,
            "name": primary_zone.get("name") if primary_zone else None
        } if primary_zone else None
    )


# ============== INITIALIZE DEFAULT DATA ==============

@router.post("/initialize")
async def initialize_shipping_data():
    """Initialize default shipping data for Australian shipping"""
    
    # Check if already initialized
    existing_zones = await db.shipping_zones.count_documents({})
    if existing_zones > 0:
        return {"message": "Shipping data already initialized", "initialized": False}
    
    # Default Australian Shipping Zones
    default_zones = [
        {
            "id": str(uuid.uuid4()),
            "code": "SYD_METRO",
            "name": "Sydney Metro",
            "country": "AU",
            "postcodes": ["2000-2234", "2555-2574", "2740-2786"],
            "is_active": True,
            "sort_order": 1,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "code": "MEL_METRO",
            "name": "Melbourne Metro",
            "country": "AU",
            "postcodes": ["3000-3207", "3335-3341", "3427-3442", "3750-3810"],
            "is_active": True,
            "sort_order": 2,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "code": "BNE_METRO",
            "name": "Brisbane Metro",
            "country": "AU",
            "postcodes": ["4000-4179", "4205-4275", "4300-4305"],
            "is_active": True,
            "sort_order": 3,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "code": "NSW_REGIONAL",
            "name": "NSW Regional",
            "country": "AU",
            "postcodes": ["2250-2530", "2575-2739", "2787-2899"],
            "is_active": True,
            "sort_order": 4,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "code": "VIC_REGIONAL",
            "name": "Victoria Regional",
            "country": "AU",
            "postcodes": ["3211-3334", "3342-3426", "3444-3749", "3812-3999"],
            "is_active": True,
            "sort_order": 5,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "code": "QLD_REGIONAL",
            "name": "Queensland Regional",
            "country": "AU",
            "postcodes": ["4180-4204", "4276-4299", "4306-4899"],
            "is_active": True,
            "sort_order": 6,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "code": "SA_ALL",
            "name": "South Australia",
            "country": "AU",
            "postcodes": ["5000-5999"],
            "is_active": True,
            "sort_order": 7,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "code": "WA_METRO",
            "name": "Perth Metro",
            "country": "AU",
            "postcodes": ["6000-6199"],
            "is_active": True,
            "sort_order": 8,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "code": "WA_REGIONAL",
            "name": "WA Regional",
            "country": "AU",
            "postcodes": ["6200-6799"],
            "is_active": True,
            "sort_order": 9,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "code": "TAS_ALL",
            "name": "Tasmania",
            "country": "AU",
            "postcodes": ["7000-7999"],
            "is_active": True,
            "sort_order": 10,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "code": "NT_ALL",
            "name": "Northern Territory",
            "country": "AU",
            "postcodes": ["0800-0899"],
            "is_active": True,
            "sort_order": 11,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "code": "REMOTE",
            "name": "Remote Australia",
            "country": "AU",
            "postcodes": ["0872", "4900-4999", "6800-6999", "0900-0999"],
            "is_active": True,
            "sort_order": 12,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    # Default Shipping Categories
    default_categories = [
        {
            "id": str(uuid.uuid4()),
            "code": "default",
            "name": "Default",
            "description": "Standard products",
            "is_default": True,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "code": "dangerous",
            "name": "Dangerous Goods",
            "description": "Items requiring special handling",
            "is_default": False,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "code": "bulky",
            "name": "Bulky Items",
            "description": "Oversized or heavy items",
            "is_default": False,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "code": "fragile",
            "name": "Fragile",
            "description": "Items requiring careful handling",
            "is_default": False,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    # Default Shipping Services with Rates
    standard_service_id = str(uuid.uuid4())
    express_service_id = str(uuid.uuid4())
    
    default_services = [
        {
            "id": standard_service_id,
            "name": "Standard Delivery",
            "code": "standard",
            "carrier": "custom",
            "charge_type": "weight",
            "min_charge": 9.95,
            "max_charge": None,
            "handling_fee": 0,
            "fuel_levy_percent": 0,
            "cubic_weight_modifier": 250,
            "categories": ["default", "fragile"],
            "is_active": True,
            "sort_order": 1,
            "rates": [
                {"zone_code": "SYD_METRO", "zone_name": "Sydney Metro", "min_weight": 0, "max_weight": 999, "base_rate": 9.95, "per_kg_rate": 1.5, "delivery_days": 3, "is_active": True},
                {"zone_code": "MEL_METRO", "zone_name": "Melbourne Metro", "min_weight": 0, "max_weight": 999, "base_rate": 12.95, "per_kg_rate": 1.5, "delivery_days": 4, "is_active": True},
                {"zone_code": "BNE_METRO", "zone_name": "Brisbane Metro", "min_weight": 0, "max_weight": 999, "base_rate": 14.95, "per_kg_rate": 2.0, "delivery_days": 5, "is_active": True},
                {"zone_code": "NSW_REGIONAL", "zone_name": "NSW Regional", "min_weight": 0, "max_weight": 999, "base_rate": 14.95, "per_kg_rate": 2.0, "delivery_days": 5, "is_active": True},
                {"zone_code": "VIC_REGIONAL", "zone_name": "Victoria Regional", "min_weight": 0, "max_weight": 999, "base_rate": 16.95, "per_kg_rate": 2.5, "delivery_days": 5, "is_active": True},
                {"zone_code": "QLD_REGIONAL", "zone_name": "Queensland Regional", "min_weight": 0, "max_weight": 999, "base_rate": 18.95, "per_kg_rate": 3.0, "delivery_days": 6, "is_active": True},
                {"zone_code": "SA_ALL", "zone_name": "South Australia", "min_weight": 0, "max_weight": 999, "base_rate": 19.95, "per_kg_rate": 3.5, "delivery_days": 5, "is_active": True},
                {"zone_code": "WA_METRO", "zone_name": "Perth Metro", "min_weight": 0, "max_weight": 999, "base_rate": 24.95, "per_kg_rate": 4.0, "delivery_days": 6, "is_active": True},
                {"zone_code": "WA_REGIONAL", "zone_name": "WA Regional", "min_weight": 0, "max_weight": 999, "base_rate": 34.95, "per_kg_rate": 5.0, "delivery_days": 8, "is_active": True},
                {"zone_code": "TAS_ALL", "zone_name": "Tasmania", "min_weight": 0, "max_weight": 999, "base_rate": 22.95, "per_kg_rate": 4.0, "delivery_days": 6, "is_active": True},
                {"zone_code": "NT_ALL", "zone_name": "Northern Territory", "min_weight": 0, "max_weight": 999, "base_rate": 39.95, "per_kg_rate": 6.0, "delivery_days": 8, "is_active": True},
                {"zone_code": "REMOTE", "zone_name": "Remote Australia", "min_weight": 0, "max_weight": 999, "base_rate": 49.95, "per_kg_rate": 8.0, "delivery_days": 10, "is_active": True},
            ],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": express_service_id,
            "name": "Express Delivery",
            "code": "express",
            "carrier": "custom",
            "charge_type": "weight",
            "min_charge": 14.95,
            "max_charge": None,
            "handling_fee": 0,
            "fuel_levy_percent": 0,
            "cubic_weight_modifier": 250,
            "categories": ["default", "fragile"],
            "is_active": True,
            "sort_order": 2,
            "rates": [
                {"zone_code": "SYD_METRO", "zone_name": "Sydney Metro", "min_weight": 0, "max_weight": 999, "base_rate": 14.95, "per_kg_rate": 2.0, "delivery_days": 1, "is_active": True},
                {"zone_code": "MEL_METRO", "zone_name": "Melbourne Metro", "min_weight": 0, "max_weight": 999, "base_rate": 19.95, "per_kg_rate": 2.5, "delivery_days": 2, "is_active": True},
                {"zone_code": "BNE_METRO", "zone_name": "Brisbane Metro", "min_weight": 0, "max_weight": 999, "base_rate": 22.95, "per_kg_rate": 3.0, "delivery_days": 2, "is_active": True},
                {"zone_code": "NSW_REGIONAL", "zone_name": "NSW Regional", "min_weight": 0, "max_weight": 999, "base_rate": 24.95, "per_kg_rate": 3.0, "delivery_days": 2, "is_active": True},
                {"zone_code": "VIC_REGIONAL", "zone_name": "Victoria Regional", "min_weight": 0, "max_weight": 999, "base_rate": 26.95, "per_kg_rate": 3.5, "delivery_days": 2, "is_active": True},
                {"zone_code": "QLD_REGIONAL", "zone_name": "Queensland Regional", "min_weight": 0, "max_weight": 999, "base_rate": 29.95, "per_kg_rate": 4.0, "delivery_days": 3, "is_active": True},
                {"zone_code": "SA_ALL", "zone_name": "South Australia", "min_weight": 0, "max_weight": 999, "base_rate": 34.95, "per_kg_rate": 5.0, "delivery_days": 2, "is_active": True},
                {"zone_code": "WA_METRO", "zone_name": "Perth Metro", "min_weight": 0, "max_weight": 999, "base_rate": 44.95, "per_kg_rate": 6.0, "delivery_days": 3, "is_active": True},
                {"zone_code": "WA_REGIONAL", "zone_name": "WA Regional", "min_weight": 0, "max_weight": 999, "base_rate": 64.95, "per_kg_rate": 8.0, "delivery_days": 4, "is_active": True},
                {"zone_code": "TAS_ALL", "zone_name": "Tasmania", "min_weight": 0, "max_weight": 999, "base_rate": 39.95, "per_kg_rate": 6.0, "delivery_days": 3, "is_active": True},
                {"zone_code": "NT_ALL", "zone_name": "Northern Territory", "min_weight": 0, "max_weight": 999, "base_rate": 69.95, "per_kg_rate": 10.0, "delivery_days": 4, "is_active": True},
                {"zone_code": "REMOTE", "zone_name": "Remote Australia", "min_weight": 0, "max_weight": 999, "base_rate": 89.95, "per_kg_rate": 12.0, "delivery_days": 5, "is_active": True},
            ],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    # Default Shipping Option with Free Shipping
    default_options = [
        {
            "id": str(uuid.uuid4()),
            "name": "Standard Shipping",
            "description": "Regular delivery to your door",
            "service_ids": [standard_service_id],
            "countries": ["AU"],
            "free_shipping_threshold": 150.00,
            "free_shipping_zones": ["SYD_METRO", "MEL_METRO", "BNE_METRO"],
            "is_active": True,
            "sort_order": 1,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Express Shipping",
            "description": "Fast delivery",
            "service_ids": [express_service_id],
            "countries": ["AU"],
            "free_shipping_threshold": None,
            "free_shipping_zones": [],
            "is_active": True,
            "sort_order": 2,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    # Default Packages
    default_packages = [
        {
            "id": str(uuid.uuid4()),
            "code": "small_satchel",
            "name": "Small Satchel",
            "package_type": "satchel",
            "length": 35,
            "width": 25,
            "height": 5,
            "max_weight": 0.5,
            "tare_weight": 0.02,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "code": "medium_satchel",
            "name": "Medium Satchel",
            "package_type": "satchel",
            "length": 40,
            "width": 30,
            "height": 10,
            "max_weight": 3,
            "tare_weight": 0.05,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "code": "large_satchel",
            "name": "Large Satchel",
            "package_type": "satchel",
            "length": 50,
            "width": 40,
            "height": 15,
            "max_weight": 5,
            "tare_weight": 0.1,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "code": "small_box",
            "name": "Small Box",
            "package_type": "box",
            "length": 30,
            "width": 20,
            "height": 15,
            "max_weight": 10,
            "tare_weight": 0.2,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "code": "medium_box",
            "name": "Medium Box",
            "package_type": "box",
            "length": 40,
            "width": 30,
            "height": 25,
            "max_weight": 20,
            "tare_weight": 0.4,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "code": "large_box",
            "name": "Large Box",
            "package_type": "box",
            "length": 60,
            "width": 40,
            "height": 40,
            "max_weight": 30,
            "tare_weight": 0.6,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    # Insert all data
    await db.shipping_zones.insert_many(default_zones)
    await db.shipping_categories.insert_many(default_categories)
    await db.shipping_services.insert_many(default_services)
    await db.shipping_options.insert_many(default_options)
    await db.shipping_packages.insert_many(default_packages)
    
    return {
        "message": "Shipping data initialized successfully",
        "initialized": True,
        "zones": len(default_zones),
        "categories": len(default_categories),
        "services": len(default_services),
        "options": len(default_options),
        "packages": len(default_packages)
    }


# ============== SHIPPING MATRIX OVERVIEW ==============

@router.get("/matrix")
async def get_shipping_matrix():
    """Get a complete overview of the shipping matrix"""
    zones = await db.shipping_zones.find({"is_active": True}, {"_id": 0}).sort("sort_order", 1).to_list(1000)
    services = await db.shipping_services.find({"is_active": True}, {"_id": 0}).sort("sort_order", 1).to_list(1000)
    categories = await db.shipping_categories.find({"is_active": True}, {"_id": 0}).to_list(1000)
    options = await db.shipping_options.find({"is_active": True}, {"_id": 0}).sort("sort_order", 1).to_list(1000)
    packages = await db.shipping_packages.find({"is_active": True}, {"_id": 0}).to_list(1000)
    
    return {
        "zones": zones,
        "services": services,
        "categories": categories,
        "options": options,
        "packages": packages,
        "summary": {
            "total_zones": len(zones),
            "total_services": len(services),
            "total_categories": len(categories),
            "total_options": len(options),
            "total_packages": len(packages)
        }
    }


# ============== SUBURB LOOKUP SYSTEM ==============

# Australian postcode-suburb mapping (comprehensive data for major areas)
AUSTRALIAN_SUBURBS = {
    # NSW - Sydney Metro
    "2000": [{"suburb": "Sydney", "state": "NSW"}, {"suburb": "The Rocks", "state": "NSW"}, {"suburb": "Barangaroo", "state": "NSW"}, {"suburb": "Dawes Point", "state": "NSW"}, {"suburb": "Haymarket", "state": "NSW"}, {"suburb": "Millers Point", "state": "NSW"}],
    "2001": [{"suburb": "Sydney", "state": "NSW"}],
    "2006": [{"suburb": "The University Of Sydney", "state": "NSW"}],
    "2007": [{"suburb": "Broadway", "state": "NSW"}, {"suburb": "Ultimo", "state": "NSW"}],
    "2008": [{"suburb": "Chippendale", "state": "NSW"}, {"suburb": "Darlington", "state": "NSW"}],
    "2009": [{"suburb": "Pyrmont", "state": "NSW"}],
    "2010": [{"suburb": "Darlinghurst", "state": "NSW"}, {"suburb": "Surry Hills", "state": "NSW"}],
    "2011": [{"suburb": "Elizabeth Bay", "state": "NSW"}, {"suburb": "Potts Point", "state": "NSW"}, {"suburb": "Rushcutters Bay", "state": "NSW"}, {"suburb": "Woolloomooloo", "state": "NSW"}],
    "2015": [{"suburb": "Alexandria", "state": "NSW"}, {"suburb": "Beaconsfield", "state": "NSW"}, {"suburb": "Eveleigh", "state": "NSW"}],
    "2016": [{"suburb": "Redfern", "state": "NSW"}],
    "2017": [{"suburb": "Waterloo", "state": "NSW"}, {"suburb": "Zetland", "state": "NSW"}],
    "2018": [{"suburb": "Rosebery", "state": "NSW"}, {"suburb": "Eastlakes", "state": "NSW"}],
    "2019": [{"suburb": "Botany", "state": "NSW"}, {"suburb": "Banksmeadow", "state": "NSW"}, {"suburb": "Pagewood", "state": "NSW"}],
    "2020": [{"suburb": "Mascot", "state": "NSW"}, {"suburb": "Sydney Airport", "state": "NSW"}],
    "2021": [{"suburb": "Centennial Park", "state": "NSW"}, {"suburb": "Moore Park", "state": "NSW"}, {"suburb": "Paddington", "state": "NSW"}],
    "2022": [{"suburb": "Bondi Junction", "state": "NSW"}, {"suburb": "Queens Park", "state": "NSW"}],
    "2023": [{"suburb": "Bellevue Hill", "state": "NSW"}],
    "2024": [{"suburb": "Bronte", "state": "NSW"}, {"suburb": "Waverley", "state": "NSW"}],
    "2025": [{"suburb": "Woollahra", "state": "NSW"}],
    "2026": [{"suburb": "Bondi", "state": "NSW"}, {"suburb": "Bondi Beach", "state": "NSW"}, {"suburb": "Tamarama", "state": "NSW"}],
    "2027": [{"suburb": "Darling Point", "state": "NSW"}, {"suburb": "Edgecliff", "state": "NSW"}, {"suburb": "Point Piper", "state": "NSW"}],
    "2028": [{"suburb": "Double Bay", "state": "NSW"}],
    "2029": [{"suburb": "Rose Bay", "state": "NSW"}],
    "2030": [{"suburb": "Dover Heights", "state": "NSW"}, {"suburb": "Rose Bay North", "state": "NSW"}, {"suburb": "Vaucluse", "state": "NSW"}, {"suburb": "Watsons Bay", "state": "NSW"}],
    "2031": [{"suburb": "Clovelly", "state": "NSW"}, {"suburb": "Clovelly West", "state": "NSW"}, {"suburb": "Randwick", "state": "NSW"}],
    "2032": [{"suburb": "Daceyville", "state": "NSW"}, {"suburb": "Kingsford", "state": "NSW"}],
    "2033": [{"suburb": "Kensington", "state": "NSW"}],
    "2034": [{"suburb": "Coogee", "state": "NSW"}, {"suburb": "South Coogee", "state": "NSW"}],
    "2035": [{"suburb": "Maroubra", "state": "NSW"}, {"suburb": "Maroubra South", "state": "NSW"}, {"suburb": "Pagewood", "state": "NSW"}],
    "2036": [{"suburb": "Chifley", "state": "NSW"}, {"suburb": "Eastgardens", "state": "NSW"}, {"suburb": "Hillsdale", "state": "NSW"}, {"suburb": "La Perouse", "state": "NSW"}, {"suburb": "Little Bay", "state": "NSW"}, {"suburb": "Malabar", "state": "NSW"}, {"suburb": "Matraville", "state": "NSW"}, {"suburb": "Phillip Bay", "state": "NSW"}, {"suburb": "Port Botany", "state": "NSW"}],
    "2037": [{"suburb": "Forest Lodge", "state": "NSW"}, {"suburb": "Glebe", "state": "NSW"}],
    "2038": [{"suburb": "Annandale", "state": "NSW"}],
    "2039": [{"suburb": "Rozelle", "state": "NSW"}],
    "2040": [{"suburb": "Leichhardt", "state": "NSW"}, {"suburb": "Lilyfield", "state": "NSW"}],
    "2041": [{"suburb": "Balmain", "state": "NSW"}, {"suburb": "Balmain East", "state": "NSW"}, {"suburb": "Birchgrove", "state": "NSW"}],
    "2042": [{"suburb": "Enmore", "state": "NSW"}, {"suburb": "Newtown", "state": "NSW"}],
    "2043": [{"suburb": "Erskineville", "state": "NSW"}],
    "2044": [{"suburb": "St Peters", "state": "NSW"}, {"suburb": "Sydenham", "state": "NSW"}, {"suburb": "Tempe", "state": "NSW"}],
    "2045": [{"suburb": "Haberfield", "state": "NSW"}],
    "2046": [{"suburb": "Abbotsford", "state": "NSW"}, {"suburb": "Canada Bay", "state": "NSW"}, {"suburb": "Chiswick", "state": "NSW"}, {"suburb": "Five Dock", "state": "NSW"}, {"suburb": "Rodd Point", "state": "NSW"}, {"suburb": "Russell Lea", "state": "NSW"}, {"suburb": "Wareemba", "state": "NSW"}],
    "2047": [{"suburb": "Drummoyne", "state": "NSW"}],
    "2048": [{"suburb": "Stanmore", "state": "NSW"}, {"suburb": "Westgate", "state": "NSW"}],
    "2049": [{"suburb": "Lewisham", "state": "NSW"}, {"suburb": "Petersham", "state": "NSW"}, {"suburb": "Petersham North", "state": "NSW"}],
    "2050": [{"suburb": "Camperdown", "state": "NSW"}, {"suburb": "Missenden Road", "state": "NSW"}],
    
    # NSW - Greater Sydney
    "2060": [{"suburb": "North Sydney", "state": "NSW"}, {"suburb": "Lavender Bay", "state": "NSW"}, {"suburb": "McMahons Point", "state": "NSW"}, {"suburb": "Waverton", "state": "NSW"}],
    "2061": [{"suburb": "Kirribilli", "state": "NSW"}, {"suburb": "Milsons Point", "state": "NSW"}],
    "2062": [{"suburb": "Cammeray", "state": "NSW"}],
    "2063": [{"suburb": "Northbridge", "state": "NSW"}],
    "2064": [{"suburb": "Artarmon", "state": "NSW"}],
    "2065": [{"suburb": "Crows Nest", "state": "NSW"}, {"suburb": "Greenwich", "state": "NSW"}, {"suburb": "Naremburn", "state": "NSW"}, {"suburb": "St Leonards", "state": "NSW"}, {"suburb": "Wollstonecraft", "state": "NSW"}],
    "2066": [{"suburb": "Lane Cove", "state": "NSW"}, {"suburb": "Lane Cove North", "state": "NSW"}, {"suburb": "Lane Cove West", "state": "NSW"}, {"suburb": "Linley Point", "state": "NSW"}, {"suburb": "Longueville", "state": "NSW"}, {"suburb": "Northwood", "state": "NSW"}, {"suburb": "Riverview", "state": "NSW"}],
    "2067": [{"suburb": "Chatswood", "state": "NSW"}, {"suburb": "Chatswood West", "state": "NSW"}],
    "2068": [{"suburb": "Castlecrag", "state": "NSW"}, {"suburb": "Middle Cove", "state": "NSW"}, {"suburb": "Willoughby", "state": "NSW"}, {"suburb": "Willoughby East", "state": "NSW"}, {"suburb": "Willoughby North", "state": "NSW"}],
    "2069": [{"suburb": "Castle Cove", "state": "NSW"}, {"suburb": "Roseville", "state": "NSW"}, {"suburb": "Roseville Chase", "state": "NSW"}],
    "2070": [{"suburb": "Lindfield", "state": "NSW"}, {"suburb": "Lindfield West", "state": "NSW"}],
    "2071": [{"suburb": "East Killara", "state": "NSW"}, {"suburb": "Killara", "state": "NSW"}],
    "2072": [{"suburb": "Gordon", "state": "NSW"}],
    "2073": [{"suburb": "Pymble", "state": "NSW"}, {"suburb": "West Pymble", "state": "NSW"}],
    "2074": [{"suburb": "South Turramurra", "state": "NSW"}, {"suburb": "Turramurra", "state": "NSW"}, {"suburb": "Warrawee", "state": "NSW"}],
    "2075": [{"suburb": "St Ives", "state": "NSW"}, {"suburb": "St Ives Chase", "state": "NSW"}],
    "2076": [{"suburb": "Normanhurst", "state": "NSW"}, {"suburb": "North Wahroonga", "state": "NSW"}, {"suburb": "Wahroonga", "state": "NSW"}],
    "2077": [{"suburb": "Asquith", "state": "NSW"}, {"suburb": "Hornsby", "state": "NSW"}, {"suburb": "Hornsby Heights", "state": "NSW"}, {"suburb": "Waitara", "state": "NSW"}],
    "2085": [{"suburb": "Belrose", "state": "NSW"}, {"suburb": "Belrose West", "state": "NSW"}, {"suburb": "Davidson", "state": "NSW"}],
    "2086": [{"suburb": "Frenchs Forest", "state": "NSW"}, {"suburb": "Frenchs Forest East", "state": "NSW"}],
    "2087": [{"suburb": "Forestville", "state": "NSW"}, {"suburb": "Killarney Heights", "state": "NSW"}],
    "2088": [{"suburb": "Mosman", "state": "NSW"}, {"suburb": "Spit Junction", "state": "NSW"}],
    "2089": [{"suburb": "Neutral Bay", "state": "NSW"}, {"suburb": "Neutral Bay Junction", "state": "NSW"}],
    "2090": [{"suburb": "Cremorne", "state": "NSW"}, {"suburb": "Cremorne Junction", "state": "NSW"}, {"suburb": "Cremorne Point", "state": "NSW"}],
    "2092": [{"suburb": "Seaforth", "state": "NSW"}],
    "2093": [{"suburb": "Balgowlah", "state": "NSW"}, {"suburb": "Balgowlah Heights", "state": "NSW"}, {"suburb": "Clontarf", "state": "NSW"}, {"suburb": "Manly Vale", "state": "NSW"}, {"suburb": "North Balgowlah", "state": "NSW"}],
    "2094": [{"suburb": "Fairlight", "state": "NSW"}],
    "2095": [{"suburb": "Manly", "state": "NSW"}, {"suburb": "Manly East", "state": "NSW"}],
    "2096": [{"suburb": "Curl Curl", "state": "NSW"}, {"suburb": "Freshwater", "state": "NSW"}, {"suburb": "Queenscliff", "state": "NSW"}],
    "2097": [{"suburb": "Collaroy", "state": "NSW"}, {"suburb": "Collaroy Beach", "state": "NSW"}, {"suburb": "Collaroy Plateau", "state": "NSW"}, {"suburb": "Wheeler Heights", "state": "NSW"}],
    "2099": [{"suburb": "Cromer", "state": "NSW"}, {"suburb": "Dee Why", "state": "NSW"}, {"suburb": "Narraweena", "state": "NSW"}, {"suburb": "North Curl Curl", "state": "NSW"}],
    "2100": [{"suburb": "Allambie Heights", "state": "NSW"}, {"suburb": "Beacon Hill", "state": "NSW"}, {"suburb": "Brookvale", "state": "NSW"}, {"suburb": "North Manly", "state": "NSW"}, {"suburb": "Warringah Mall", "state": "NSW"}],
    
    # NSW - Western Sydney
    "2113": [{"suburb": "East Ryde", "state": "NSW"}, {"suburb": "Macquarie Park", "state": "NSW"}, {"suburb": "North Ryde", "state": "NSW"}],
    "2114": [{"suburb": "Denistone", "state": "NSW"}, {"suburb": "Denistone East", "state": "NSW"}, {"suburb": "Denistone West", "state": "NSW"}, {"suburb": "Ryde", "state": "NSW"}, {"suburb": "West Ryde", "state": "NSW"}],
    "2115": [{"suburb": "Ermington", "state": "NSW"}],
    "2116": [{"suburb": "Rydalmere", "state": "NSW"}],
    "2117": [{"suburb": "Dundas", "state": "NSW"}, {"suburb": "Dundas Valley", "state": "NSW"}, {"suburb": "Oatlands", "state": "NSW"}, {"suburb": "Telopea", "state": "NSW"}],
    "2118": [{"suburb": "Carlingford", "state": "NSW"}, {"suburb": "Carlingford Court", "state": "NSW"}, {"suburb": "Kingsdene", "state": "NSW"}],
    "2119": [{"suburb": "Beecroft", "state": "NSW"}, {"suburb": "Cheltenham", "state": "NSW"}],
    "2120": [{"suburb": "Pennant Hills", "state": "NSW"}, {"suburb": "Thornleigh", "state": "NSW"}, {"suburb": "Westleigh", "state": "NSW"}],
    "2121": [{"suburb": "Epping", "state": "NSW"}, {"suburb": "North Epping", "state": "NSW"}],
    "2122": [{"suburb": "Eastwood", "state": "NSW"}, {"suburb": "Marsfield", "state": "NSW"}],
    "2125": [{"suburb": "West Pennant Hills", "state": "NSW"}],
    "2126": [{"suburb": "Cherrybrook", "state": "NSW"}],
    "2127": [{"suburb": "Newington", "state": "NSW"}, {"suburb": "Sydney Olympic Park", "state": "NSW"}, {"suburb": "Wentworth Point", "state": "NSW"}],
    "2128": [{"suburb": "Silverwater", "state": "NSW"}],
    "2129": [{"suburb": "Homebush West", "state": "NSW"}],
    "2130": [{"suburb": "Summer Hill", "state": "NSW"}],
    "2131": [{"suburb": "Ashfield", "state": "NSW"}],
    "2132": [{"suburb": "Croydon", "state": "NSW"}, {"suburb": "Croydon Park", "state": "NSW"}],
    "2133": [{"suburb": "Burwood Heights", "state": "NSW"}, {"suburb": "Enfield South", "state": "NSW"}],
    "2134": [{"suburb": "Burwood", "state": "NSW"}],
    "2135": [{"suburb": "Strathfield", "state": "NSW"}],
    "2136": [{"suburb": "Burwood Heights", "state": "NSW"}, {"suburb": "Enfield", "state": "NSW"}, {"suburb": "Strathfield South", "state": "NSW"}],
    "2137": [{"suburb": "Concord", "state": "NSW"}, {"suburb": "Concord West", "state": "NSW"}, {"suburb": "Liberty Grove", "state": "NSW"}, {"suburb": "North Strathfield", "state": "NSW"}],
    "2138": [{"suburb": "Concord West", "state": "NSW"}, {"suburb": "Rhodes", "state": "NSW"}],
    "2140": [{"suburb": "Homebush", "state": "NSW"}, {"suburb": "Homebush South", "state": "NSW"}],
    "2141": [{"suburb": "Berala", "state": "NSW"}, {"suburb": "Lidcombe", "state": "NSW"}, {"suburb": "Lidcombe North", "state": "NSW"}, {"suburb": "Rookwood", "state": "NSW"}],
    "2142": [{"suburb": "Blaxcell", "state": "NSW"}, {"suburb": "Camellia", "state": "NSW"}, {"suburb": "Clyde", "state": "NSW"}, {"suburb": "Granville", "state": "NSW"}, {"suburb": "Holroyd", "state": "NSW"}, {"suburb": "South Granville", "state": "NSW"}],
    "2143": [{"suburb": "Birrong", "state": "NSW"}, {"suburb": "Potts Hill", "state": "NSW"}, {"suburb": "Regents Park", "state": "NSW"}],
    "2144": [{"suburb": "Auburn", "state": "NSW"}],
    "2145": [{"suburb": "Constitution Hill", "state": "NSW"}, {"suburb": "Girraween", "state": "NSW"}, {"suburb": "Greystanes", "state": "NSW"}, {"suburb": "Mays Hill", "state": "NSW"}, {"suburb": "Pendle Hill", "state": "NSW"}, {"suburb": "South Wentworthville", "state": "NSW"}, {"suburb": "Wentworthville", "state": "NSW"}, {"suburb": "Westmead", "state": "NSW"}],
    "2146": [{"suburb": "Old Toongabbie", "state": "NSW"}, {"suburb": "Toongabbie", "state": "NSW"}, {"suburb": "Toongabbie East", "state": "NSW"}],
    "2147": [{"suburb": "Kings Langley", "state": "NSW"}, {"suburb": "Lalor Park", "state": "NSW"}, {"suburb": "Seven Hills", "state": "NSW"}, {"suburb": "Seven Hills West", "state": "NSW"}],
    "2148": [{"suburb": "Arndell Park", "state": "NSW"}, {"suburb": "Blacktown", "state": "NSW"}, {"suburb": "Blacktown Westpoint", "state": "NSW"}, {"suburb": "Huntingwood", "state": "NSW"}, {"suburb": "Kings Park", "state": "NSW"}, {"suburb": "Marayong", "state": "NSW"}, {"suburb": "Prospect", "state": "NSW"}],
    "2150": [{"suburb": "Harris Park", "state": "NSW"}, {"suburb": "Parramatta", "state": "NSW"}, {"suburb": "Parramatta Westfield", "state": "NSW"}],
    "2151": [{"suburb": "North Parramatta", "state": "NSW"}, {"suburb": "North Rocks", "state": "NSW"}],
    "2152": [{"suburb": "Northmead", "state": "NSW"}],
    "2153": [{"suburb": "Baulkham Hills", "state": "NSW"}, {"suburb": "Bella Vista", "state": "NSW"}, {"suburb": "Winston Hills", "state": "NSW"}],
    "2154": [{"suburb": "Castle Hill", "state": "NSW"}],
    "2155": [{"suburb": "Beaumont Hills", "state": "NSW"}, {"suburb": "Kellyville", "state": "NSW"}, {"suburb": "Kellyville Ridge", "state": "NSW"}, {"suburb": "Rouse Hill", "state": "NSW"}],
    "2156": [{"suburb": "Annangrove", "state": "NSW"}, {"suburb": "Glenhaven", "state": "NSW"}, {"suburb": "Kenthurst", "state": "NSW"}],
    "2157": [{"suburb": "Forest Glen", "state": "NSW"}, {"suburb": "Glenorie", "state": "NSW"}],
    "2158": [{"suburb": "Dural", "state": "NSW"}, {"suburb": "Middle Dural", "state": "NSW"}, {"suburb": "Round Corner", "state": "NSW"}],
    "2160": [{"suburb": "Merrylands", "state": "NSW"}, {"suburb": "Merrylands West", "state": "NSW"}],
    "2161": [{"suburb": "Guildford", "state": "NSW"}, {"suburb": "Guildford West", "state": "NSW"}, {"suburb": "Old Guildford", "state": "NSW"}, {"suburb": "Yennora", "state": "NSW"}],
    "2162": [{"suburb": "Chester Hill", "state": "NSW"}, {"suburb": "Sefton", "state": "NSW"}],
    "2163": [{"suburb": "Carramar", "state": "NSW"}, {"suburb": "Lansdowne", "state": "NSW"}, {"suburb": "Villawood", "state": "NSW"}],
    "2164": [{"suburb": "Smithfield", "state": "NSW"}, {"suburb": "Smithfield West", "state": "NSW"}, {"suburb": "Wetherill Park", "state": "NSW"}, {"suburb": "Woodpark", "state": "NSW"}],
    "2165": [{"suburb": "Fairfield", "state": "NSW"}, {"suburb": "Fairfield East", "state": "NSW"}, {"suburb": "Fairfield Heights", "state": "NSW"}, {"suburb": "Fairfield West", "state": "NSW"}],
    "2166": [{"suburb": "Cabramatta", "state": "NSW"}, {"suburb": "Cabramatta West", "state": "NSW"}, {"suburb": "Canley Heights", "state": "NSW"}, {"suburb": "Canley Vale", "state": "NSW"}, {"suburb": "Lansvale", "state": "NSW"}],
    "2167": [{"suburb": "Glenfield", "state": "NSW"}],
    "2168": [{"suburb": "Ashcroft", "state": "NSW"}, {"suburb": "Busby", "state": "NSW"}, {"suburb": "Cartwright", "state": "NSW"}, {"suburb": "Green Valley", "state": "NSW"}, {"suburb": "Heckenberg", "state": "NSW"}, {"suburb": "Hinchinbrook", "state": "NSW"}, {"suburb": "Miller", "state": "NSW"}, {"suburb": "Sadleir", "state": "NSW"}],
    "2170": [{"suburb": "Casula", "state": "NSW"}, {"suburb": "Liverpool", "state": "NSW"}, {"suburb": "Liverpool South", "state": "NSW"}, {"suburb": "Liverpool Westfield", "state": "NSW"}, {"suburb": "Lurnea", "state": "NSW"}, {"suburb": "Moorebank", "state": "NSW"}, {"suburb": "Mount Pritchard", "state": "NSW"}, {"suburb": "Warwick Farm", "state": "NSW"}],
    
    # NSW - South Sydney
    "2190": [{"suburb": "Chullora", "state": "NSW"}, {"suburb": "Greenacre", "state": "NSW"}, {"suburb": "Mount Lewis", "state": "NSW"}],
    "2191": [{"suburb": "Belfield", "state": "NSW"}, {"suburb": "Belmore", "state": "NSW"}],
    "2192": [{"suburb": "Belmore", "state": "NSW"}],
    "2193": [{"suburb": "Ashbury", "state": "NSW"}, {"suburb": "Canterbury", "state": "NSW"}, {"suburb": "Hurlstone Park", "state": "NSW"}],
    "2194": [{"suburb": "Campsie", "state": "NSW"}],
    "2195": [{"suburb": "Lakemba", "state": "NSW"}, {"suburb": "Wiley Park", "state": "NSW"}],
    "2196": [{"suburb": "Punchbowl", "state": "NSW"}, {"suburb": "Roselands", "state": "NSW"}],
    "2197": [{"suburb": "Bass Hill", "state": "NSW"}, {"suburb": "Georges Hall", "state": "NSW"}],
    "2198": [{"suburb": "Condell Park", "state": "NSW"}],
    "2199": [{"suburb": "Yagoona", "state": "NSW"}, {"suburb": "Yagoona West", "state": "NSW"}],
    "2200": [{"suburb": "Bankstown", "state": "NSW"}, {"suburb": "Bankstown Aerodrome", "state": "NSW"}, {"suburb": "Bankstown North", "state": "NSW"}, {"suburb": "Bankstown Square", "state": "NSW"}],
    "2203": [{"suburb": "Dulwich Hill", "state": "NSW"}],
    "2204": [{"suburb": "Marrickville", "state": "NSW"}, {"suburb": "Marrickville South", "state": "NSW"}],
    "2205": [{"suburb": "Arncliffe", "state": "NSW"}, {"suburb": "Turrella", "state": "NSW"}, {"suburb": "Wolli Creek", "state": "NSW"}],
    "2206": [{"suburb": "Clemton Park", "state": "NSW"}, {"suburb": "Earlwood", "state": "NSW"}],
    "2207": [{"suburb": "Bardwell Park", "state": "NSW"}, {"suburb": "Bardwell Valley", "state": "NSW"}, {"suburb": "Bexley", "state": "NSW"}, {"suburb": "Bexley North", "state": "NSW"}, {"suburb": "Bexley South", "state": "NSW"}, {"suburb": "Kingsgrove", "state": "NSW"}],
    "2208": [{"suburb": "Kingsgrove", "state": "NSW"}, {"suburb": "Kingsway West", "state": "NSW"}, {"suburb": "Roselands", "state": "NSW"}],
    "2209": [{"suburb": "Beverly Hills", "state": "NSW"}, {"suburb": "Narwee", "state": "NSW"}],
    "2210": [{"suburb": "Lugarno", "state": "NSW"}, {"suburb": "Peakhurst", "state": "NSW"}, {"suburb": "Peakhurst Heights", "state": "NSW"}, {"suburb": "Riverwood", "state": "NSW"}],
    "2211": [{"suburb": "Padstow", "state": "NSW"}, {"suburb": "Padstow Heights", "state": "NSW"}, {"suburb": "Revesby", "state": "NSW"}, {"suburb": "Revesby Heights", "state": "NSW"}, {"suburb": "Revesby North", "state": "NSW"}],
    "2212": [{"suburb": "East Hills", "state": "NSW"}, {"suburb": "Panania", "state": "NSW"}, {"suburb": "Picnic Point", "state": "NSW"}],
    "2213": [{"suburb": "Milperra", "state": "NSW"}],
    "2214": [{"suburb": "Milperra", "state": "NSW"}],
    "2216": [{"suburb": "Banksia", "state": "NSW"}, {"suburb": "Brighton-Le-Sands", "state": "NSW"}, {"suburb": "Kyeemagh", "state": "NSW"}, {"suburb": "Rockdale", "state": "NSW"}],
    "2217": [{"suburb": "Beverley Park", "state": "NSW"}, {"suburb": "Kogarah", "state": "NSW"}, {"suburb": "Kogarah Bay", "state": "NSW"}, {"suburb": "Monterey", "state": "NSW"}, {"suburb": "Ramsgate", "state": "NSW"}, {"suburb": "Ramsgate Beach", "state": "NSW"}],
    "2218": [{"suburb": "Allawah", "state": "NSW"}, {"suburb": "Carlton", "state": "NSW"}, {"suburb": "Hurstville Grove", "state": "NSW"}],
    "2219": [{"suburb": "Dolls Point", "state": "NSW"}, {"suburb": "Sans Souci", "state": "NSW"}, {"suburb": "Sandringham", "state": "NSW"}],
    "2220": [{"suburb": "Hurstville", "state": "NSW"}, {"suburb": "Hurstville Westfield", "state": "NSW"}],
    "2221": [{"suburb": "Blakehurst", "state": "NSW"}, {"suburb": "Carss Park", "state": "NSW"}, {"suburb": "Connells Point", "state": "NSW"}, {"suburb": "Kyle Bay", "state": "NSW"}, {"suburb": "South Hurstville", "state": "NSW"}],
    "2222": [{"suburb": "Penshurst", "state": "NSW"}],
    "2223": [{"suburb": "Mortdale", "state": "NSW"}, {"suburb": "Oatley", "state": "NSW"}],
    "2224": [{"suburb": "Kangaroo Point", "state": "NSW"}, {"suburb": "Sylvania", "state": "NSW"}, {"suburb": "Sylvania Waters", "state": "NSW"}],
    "2225": [{"suburb": "Oyster Bay", "state": "NSW"}],
    "2226": [{"suburb": "Bonnet Bay", "state": "NSW"}, {"suburb": "Como", "state": "NSW"}, {"suburb": "Jannali", "state": "NSW"}],
    "2227": [{"suburb": "Gymea", "state": "NSW"}, {"suburb": "Gymea Bay", "state": "NSW"}],
    "2228": [{"suburb": "Miranda", "state": "NSW"}, {"suburb": "Yowie Bay", "state": "NSW"}],
    "2229": [{"suburb": "Caringbah", "state": "NSW"}, {"suburb": "Caringbah South", "state": "NSW"}, {"suburb": "Dolans Bay", "state": "NSW"}, {"suburb": "Lilli Pilli", "state": "NSW"}, {"suburb": "Port Hacking", "state": "NSW"}, {"suburb": "Taren Point", "state": "NSW"}],
    "2230": [{"suburb": "Bundeena", "state": "NSW"}, {"suburb": "Burraneer", "state": "NSW"}, {"suburb": "Cronulla", "state": "NSW"}, {"suburb": "Maianbar", "state": "NSW"}, {"suburb": "Woolooware", "state": "NSW"}],
    "2231": [{"suburb": "Kurnell", "state": "NSW"}],
    "2232": [{"suburb": "Audley", "state": "NSW"}, {"suburb": "Grays Point", "state": "NSW"}, {"suburb": "Kareela", "state": "NSW"}, {"suburb": "Kirrawee", "state": "NSW"}, {"suburb": "Loftus", "state": "NSW"}, {"suburb": "Sutherland", "state": "NSW"}, {"suburb": "Woronora", "state": "NSW"}],
    "2233": [{"suburb": "Engadine", "state": "NSW"}, {"suburb": "Heathcote", "state": "NSW"}, {"suburb": "Waterfall", "state": "NSW"}, {"suburb": "Woronora Heights", "state": "NSW"}, {"suburb": "Yarrawarrah", "state": "NSW"}],
    "2234": [{"suburb": "Alfords Point", "state": "NSW"}, {"suburb": "Bangor", "state": "NSW"}, {"suburb": "Barden Ridge", "state": "NSW"}, {"suburb": "Illawong", "state": "NSW"}, {"suburb": "Lucas Heights", "state": "NSW"}, {"suburb": "Menai", "state": "NSW"}, {"suburb": "Menai Central", "state": "NSW"}],
    
    # VIC - Melbourne Metro
    "3000": [{"suburb": "Melbourne", "state": "VIC"}],
    "3001": [{"suburb": "Melbourne", "state": "VIC"}],
    "3002": [{"suburb": "East Melbourne", "state": "VIC"}],
    "3003": [{"suburb": "West Melbourne", "state": "VIC"}],
    "3004": [{"suburb": "Melbourne", "state": "VIC"}, {"suburb": "St Kilda Road", "state": "VIC"}],
    "3006": [{"suburb": "Southbank", "state": "VIC"}],
    "3008": [{"suburb": "Docklands", "state": "VIC"}],
    "3011": [{"suburb": "Footscray", "state": "VIC"}, {"suburb": "Seddon", "state": "VIC"}, {"suburb": "Seddon West", "state": "VIC"}],
    "3012": [{"suburb": "Brooklyn", "state": "VIC"}, {"suburb": "Kingsville", "state": "VIC"}, {"suburb": "Maidstone", "state": "VIC"}, {"suburb": "Tottenham", "state": "VIC"}, {"suburb": "West Footscray", "state": "VIC"}],
    "3013": [{"suburb": "Yarraville", "state": "VIC"}, {"suburb": "Yarraville West", "state": "VIC"}],
    "3015": [{"suburb": "Newport", "state": "VIC"}, {"suburb": "South Kingsville", "state": "VIC"}, {"suburb": "Spotswood", "state": "VIC"}],
    "3016": [{"suburb": "Williamstown", "state": "VIC"}, {"suburb": "Williamstown North", "state": "VIC"}],
    "3018": [{"suburb": "Altona", "state": "VIC"}, {"suburb": "Seaholme", "state": "VIC"}],
    "3019": [{"suburb": "Braybrook", "state": "VIC"}, {"suburb": "Robinson", "state": "VIC"}],
    "3020": [{"suburb": "Albion", "state": "VIC"}, {"suburb": "Sunshine", "state": "VIC"}, {"suburb": "Sunshine North", "state": "VIC"}, {"suburb": "Sunshine West", "state": "VIC"}],
    "3021": [{"suburb": "Albanvale", "state": "VIC"}, {"suburb": "Kealba", "state": "VIC"}, {"suburb": "Kings Park", "state": "VIC"}, {"suburb": "St Albans", "state": "VIC"}],
    "3022": [{"suburb": "Ardeer", "state": "VIC"}, {"suburb": "Deer Park", "state": "VIC"}, {"suburb": "Deer Park East", "state": "VIC"}, {"suburb": "Deer Park North", "state": "VIC"}],
    "3023": [{"suburb": "Burnside", "state": "VIC"}, {"suburb": "Burnside Heights", "state": "VIC"}, {"suburb": "Caroline Springs", "state": "VIC"}, {"suburb": "Ravenhall", "state": "VIC"}],
    "3024": [{"suburb": "Fraser Rise", "state": "VIC"}, {"suburb": "Plumpton", "state": "VIC"}, {"suburb": "Taylors Hill", "state": "VIC"}, {"suburb": "Truganina", "state": "VIC"}],
    "3025": [{"suburb": "Altona North", "state": "VIC"}],
    "3026": [{"suburb": "Laverton", "state": "VIC"}, {"suburb": "Laverton North", "state": "VIC"}],
    "3028": [{"suburb": "Altona Meadows", "state": "VIC"}, {"suburb": "Laverton", "state": "VIC"}, {"suburb": "Seabrook", "state": "VIC"}],
    "3029": [{"suburb": "Hoppers Crossing", "state": "VIC"}, {"suburb": "Tarneit", "state": "VIC"}, {"suburb": "Truganina", "state": "VIC"}],
    "3030": [{"suburb": "Cocoroc", "state": "VIC"}, {"suburb": "Derrimut", "state": "VIC"}, {"suburb": "Point Cook", "state": "VIC"}, {"suburb": "Quandong", "state": "VIC"}, {"suburb": "Werribee", "state": "VIC"}, {"suburb": "Werribee South", "state": "VIC"}],
    "3031": [{"suburb": "Flemington", "state": "VIC"}, {"suburb": "Kensington", "state": "VIC"}],
    "3032": [{"suburb": "Ascot Vale", "state": "VIC"}, {"suburb": "Highpoint City", "state": "VIC"}, {"suburb": "Maribyrnong", "state": "VIC"}, {"suburb": "Travancore", "state": "VIC"}],
    "3033": [{"suburb": "Keilor East", "state": "VIC"}],
    "3034": [{"suburb": "Avondale Heights", "state": "VIC"}],
    "3036": [{"suburb": "Keilor", "state": "VIC"}, {"suburb": "Keilor North", "state": "VIC"}],
    "3037": [{"suburb": "Delahey", "state": "VIC"}, {"suburb": "Hillside", "state": "VIC"}, {"suburb": "Sydenham", "state": "VIC"}, {"suburb": "Taylors Lakes", "state": "VIC"}],
    "3038": [{"suburb": "Keilor Downs", "state": "VIC"}, {"suburb": "Keilor Lodge", "state": "VIC"}, {"suburb": "Watergardens", "state": "VIC"}],
    "3039": [{"suburb": "Moonee Ponds", "state": "VIC"}],
    "3040": [{"suburb": "Aberfeldie", "state": "VIC"}, {"suburb": "Essendon", "state": "VIC"}, {"suburb": "Essendon West", "state": "VIC"}],
    "3041": [{"suburb": "Essendon North", "state": "VIC"}, {"suburb": "Strathmore", "state": "VIC"}, {"suburb": "Strathmore Heights", "state": "VIC"}],
    "3042": [{"suburb": "Airport West", "state": "VIC"}, {"suburb": "Keilor Park", "state": "VIC"}, {"suburb": "Niddrie", "state": "VIC"}, {"suburb": "Niddrie North", "state": "VIC"}],
    "3043": [{"suburb": "Gladstone Park", "state": "VIC"}, {"suburb": "Gowanbrae", "state": "VIC"}, {"suburb": "Tullamarine", "state": "VIC"}],
    "3044": [{"suburb": "Pascoe Vale", "state": "VIC"}, {"suburb": "Pascoe Vale South", "state": "VIC"}],
    "3046": [{"suburb": "Glenroy", "state": "VIC"}, {"suburb": "Hadfield", "state": "VIC"}, {"suburb": "Oak Park", "state": "VIC"}],
    "3047": [{"suburb": "Broadmeadows", "state": "VIC"}, {"suburb": "Dallas", "state": "VIC"}, {"suburb": "Jacana", "state": "VIC"}],
    "3048": [{"suburb": "Coolaroo", "state": "VIC"}, {"suburb": "Meadow Heights", "state": "VIC"}],
    "3049": [{"suburb": "Attwood", "state": "VIC"}, {"suburb": "Westmeadows", "state": "VIC"}],
    "3050": [{"suburb": "Royal Melbourne Hospital", "state": "VIC"}],
    "3051": [{"suburb": "North Melbourne", "state": "VIC"}],
    "3052": [{"suburb": "Melbourne University", "state": "VIC"}, {"suburb": "Parkville", "state": "VIC"}],
    "3053": [{"suburb": "Carlton", "state": "VIC"}],
    "3054": [{"suburb": "Carlton North", "state": "VIC"}, {"suburb": "Princes Hill", "state": "VIC"}],
    "3055": [{"suburb": "Brunswick South", "state": "VIC"}, {"suburb": "Brunswick West", "state": "VIC"}, {"suburb": "Moonee Vale", "state": "VIC"}, {"suburb": "Moreland West", "state": "VIC"}],
    "3056": [{"suburb": "Brunswick", "state": "VIC"}, {"suburb": "Brunswick Lower", "state": "VIC"}],
    "3057": [{"suburb": "Brunswick East", "state": "VIC"}, {"suburb": "Sumner", "state": "VIC"}],
    "3058": [{"suburb": "Coburg", "state": "VIC"}, {"suburb": "Coburg North", "state": "VIC"}, {"suburb": "Moreland", "state": "VIC"}],
    "3060": [{"suburb": "Fawkner", "state": "VIC"}],
    "3061": [{"suburb": "Campbellfield", "state": "VIC"}],
    
    # QLD - Brisbane Metro
    "4000": [{"suburb": "Brisbane City", "state": "QLD"}, {"suburb": "Brisbane", "state": "QLD"}, {"suburb": "Petrie Terrace", "state": "QLD"}, {"suburb": "Spring Hill", "state": "QLD"}],
    "4005": [{"suburb": "New Farm", "state": "QLD"}, {"suburb": "Teneriffe", "state": "QLD"}],
    "4006": [{"suburb": "Bowen Hills", "state": "QLD"}, {"suburb": "Fortitude Valley", "state": "QLD"}, {"suburb": "Herston", "state": "QLD"}, {"suburb": "Newstead", "state": "QLD"}],
    "4007": [{"suburb": "Ascot", "state": "QLD"}, {"suburb": "Hamilton", "state": "QLD"}],
    "4008": [{"suburb": "Pinkenba", "state": "QLD"}],
    "4009": [{"suburb": "Brisbane Airport", "state": "QLD"}, {"suburb": "Eagle Farm", "state": "QLD"}],
    "4010": [{"suburb": "Albion", "state": "QLD"}, {"suburb": "Breakfast Creek", "state": "QLD"}, {"suburb": "Lutwyche", "state": "QLD"}, {"suburb": "Windsor", "state": "QLD"}, {"suburb": "Wooloowin", "state": "QLD"}],
    "4011": [{"suburb": "Clayfield", "state": "QLD"}, {"suburb": "Hendra", "state": "QLD"}],
    "4012": [{"suburb": "Nundah", "state": "QLD"}, {"suburb": "Toombul", "state": "QLD"}],
    "4013": [{"suburb": "Northgate", "state": "QLD"}, {"suburb": "Virginia", "state": "QLD"}],
    "4014": [{"suburb": "Banyo", "state": "QLD"}, {"suburb": "Nudgee", "state": "QLD"}, {"suburb": "Nudgee Beach", "state": "QLD"}],
    "4017": [{"suburb": "Bracken Ridge", "state": "QLD"}, {"suburb": "Brighton", "state": "QLD"}, {"suburb": "Deagon", "state": "QLD"}, {"suburb": "Sandgate", "state": "QLD"}, {"suburb": "Shorncliffe", "state": "QLD"}],
    "4018": [{"suburb": "Fitzgibbon", "state": "QLD"}, {"suburb": "Taigum", "state": "QLD"}],
    "4019": [{"suburb": "Clontarf", "state": "QLD"}, {"suburb": "Margate", "state": "QLD"}, {"suburb": "Woody Point", "state": "QLD"}],
    "4020": [{"suburb": "Newport", "state": "QLD"}, {"suburb": "Redcliffe", "state": "QLD"}, {"suburb": "Scarborough", "state": "QLD"}],
    "4030": [{"suburb": "Gordon Park", "state": "QLD"}, {"suburb": "Kedron", "state": "QLD"}, {"suburb": "Wooloowin", "state": "QLD"}],
    "4031": [{"suburb": "Gordon Park", "state": "QLD"}, {"suburb": "Kedron", "state": "QLD"}],
    "4032": [{"suburb": "Chermside", "state": "QLD"}, {"suburb": "Chermside South", "state": "QLD"}, {"suburb": "Chermside West", "state": "QLD"}],
    "4034": [{"suburb": "Aspley", "state": "QLD"}, {"suburb": "Boondall", "state": "QLD"}, {"suburb": "Carseldine", "state": "QLD"}, {"suburb": "Geebung", "state": "QLD"}, {"suburb": "Zillmere", "state": "QLD"}],
    "4051": [{"suburb": "Alderley", "state": "QLD"}, {"suburb": "Enoggera", "state": "QLD"}, {"suburb": "Gaythorne", "state": "QLD"}, {"suburb": "Grange", "state": "QLD"}, {"suburb": "Newmarket", "state": "QLD"}, {"suburb": "Wilston", "state": "QLD"}],
    "4053": [{"suburb": "Brookside Centre", "state": "QLD"}, {"suburb": "Enoggera Reservoir", "state": "QLD"}, {"suburb": "Everton Hills", "state": "QLD"}, {"suburb": "Everton Park", "state": "QLD"}, {"suburb": "McDowall", "state": "QLD"}, {"suburb": "Mitchelton", "state": "QLD"}, {"suburb": "Stafford", "state": "QLD"}, {"suburb": "Stafford Heights", "state": "QLD"}],
    "4059": [{"suburb": "Kelvin Grove", "state": "QLD"}, {"suburb": "Red Hill", "state": "QLD"}],
    "4060": [{"suburb": "Ashgrove", "state": "QLD"}],
    "4061": [{"suburb": "The Gap", "state": "QLD"}],
    "4064": [{"suburb": "Milton", "state": "QLD"}, {"suburb": "Paddington", "state": "QLD"}],
    "4065": [{"suburb": "Bardon", "state": "QLD"}],
    "4066": [{"suburb": "Auchenflower", "state": "QLD"}, {"suburb": "Milton", "state": "QLD"}, {"suburb": "Toowong", "state": "QLD"}],
    "4067": [{"suburb": "St Lucia", "state": "QLD"}],
    "4068": [{"suburb": "Chelmer", "state": "QLD"}, {"suburb": "Indooroopilly", "state": "QLD"}, {"suburb": "Indooroopilly Centre", "state": "QLD"}, {"suburb": "Taringa", "state": "QLD"}],
    "4069": [{"suburb": "Brookfield", "state": "QLD"}, {"suburb": "Chapel Hill", "state": "QLD"}, {"suburb": "Fig Tree Pocket", "state": "QLD"}, {"suburb": "Kenmore", "state": "QLD"}, {"suburb": "Kenmore Hills", "state": "QLD"}, {"suburb": "Pinjarra Hills", "state": "QLD"}, {"suburb": "Pullenvale", "state": "QLD"}, {"suburb": "Upper Brookfield", "state": "QLD"}],
    "4070": [{"suburb": "Anstead", "state": "QLD"}, {"suburb": "Bellbowrie", "state": "QLD"}, {"suburb": "Moggill", "state": "QLD"}],
    "4072": [{"suburb": "University Of Queensland", "state": "QLD"}],
    "4073": [{"suburb": "Seventeen Mile Rocks", "state": "QLD"}, {"suburb": "Sinnamon Park", "state": "QLD"}],
    "4074": [{"suburb": "Jamboree Heights", "state": "QLD"}, {"suburb": "Jindalee", "state": "QLD"}, {"suburb": "Middle Park", "state": "QLD"}, {"suburb": "Mount Ommaney", "state": "QLD"}, {"suburb": "Riverhills", "state": "QLD"}, {"suburb": "Sumner", "state": "QLD"}, {"suburb": "Westlake", "state": "QLD"}],
    "4075": [{"suburb": "Corinda", "state": "QLD"}, {"suburb": "Graceville", "state": "QLD"}, {"suburb": "Graceville East", "state": "QLD"}, {"suburb": "Oxley", "state": "QLD"}, {"suburb": "Sherwood", "state": "QLD"}],
    "4076": [{"suburb": "Darra", "state": "QLD"}, {"suburb": "Wacol", "state": "QLD"}],
    
    # WA - Perth Metro
    "6000": [{"suburb": "Perth", "state": "WA"}],
    "6003": [{"suburb": "Highgate", "state": "WA"}, {"suburb": "Northbridge", "state": "WA"}],
    "6004": [{"suburb": "East Perth", "state": "WA"}],
    "6005": [{"suburb": "Kings Park", "state": "WA"}, {"suburb": "West Perth", "state": "WA"}],
    "6006": [{"suburb": "North Perth", "state": "WA"}],
    "6007": [{"suburb": "Leederville", "state": "WA"}, {"suburb": "West Leederville", "state": "WA"}],
    "6008": [{"suburb": "Shenton Park", "state": "WA"}, {"suburb": "Subiaco", "state": "WA"}],
    "6009": [{"suburb": "Crawley", "state": "WA"}, {"suburb": "Nedlands", "state": "WA"}],
    "6010": [{"suburb": "Claremont", "state": "WA"}, {"suburb": "Swanbourne", "state": "WA"}],
    "6011": [{"suburb": "Cottesloe", "state": "WA"}, {"suburb": "Peppermint Grove", "state": "WA"}],
    "6012": [{"suburb": "Mosman Park", "state": "WA"}],
    "6014": [{"suburb": "Floreat", "state": "WA"}, {"suburb": "Jolimont", "state": "WA"}, {"suburb": "Wembley", "state": "WA"}],
    "6015": [{"suburb": "City Beach", "state": "WA"}],
    "6016": [{"suburb": "Glendalough", "state": "WA"}, {"suburb": "Mount Hawthorn", "state": "WA"}],
    "6017": [{"suburb": "Osborne Park", "state": "WA"}, {"suburb": "Tuart Hill", "state": "WA"}],
    "6018": [{"suburb": "Churchlands", "state": "WA"}, {"suburb": "Doubleview", "state": "WA"}, {"suburb": "Gwelup", "state": "WA"}, {"suburb": "Innaloo", "state": "WA"}, {"suburb": "Karrinyup", "state": "WA"}, {"suburb": "Woodlands", "state": "WA"}],
    "6019": [{"suburb": "Scarborough", "state": "WA"}, {"suburb": "Wembley Downs", "state": "WA"}],
    "6020": [{"suburb": "Carine", "state": "WA"}, {"suburb": "Marmion", "state": "WA"}, {"suburb": "North Beach", "state": "WA"}, {"suburb": "Sorrento", "state": "WA"}, {"suburb": "Trigg", "state": "WA"}, {"suburb": "Watermans Bay", "state": "WA"}],
    "6021": [{"suburb": "Balcatta", "state": "WA"}, {"suburb": "Stirling", "state": "WA"}],
    "6022": [{"suburb": "Hamersley", "state": "WA"}],
    "6023": [{"suburb": "Duncraig", "state": "WA"}],
    "6024": [{"suburb": "Greenwood", "state": "WA"}, {"suburb": "Warwick", "state": "WA"}],
    "6025": [{"suburb": "Craigie", "state": "WA"}, {"suburb": "Hillarys", "state": "WA"}, {"suburb": "Kallaroo", "state": "WA"}, {"suburb": "Padbury", "state": "WA"}],
    "6026": [{"suburb": "Kingsley", "state": "WA"}, {"suburb": "Woodvale", "state": "WA"}],
    "6027": [{"suburb": "Beldon", "state": "WA"}, {"suburb": "Connolly", "state": "WA"}, {"suburb": "Edgewater", "state": "WA"}, {"suburb": "Heathridge", "state": "WA"}, {"suburb": "Joondalup", "state": "WA"}, {"suburb": "Ocean Reef", "state": "WIA"}],
    "6028": [{"suburb": "Currambine", "state": "WA"}, {"suburb": "Iluka", "state": "WA"}, {"suburb": "Kinross", "state": "WA"}],
    "6050": [{"suburb": "Mount Lawley", "state": "WA"}],
    "6051": [{"suburb": "Maylands", "state": "WA"}],
    "6052": [{"suburb": "Inglewood", "state": "WA"}, {"suburb": "Mount Lawley", "state": "WA"}],
    "6053": [{"suburb": "Bayswater", "state": "WA"}],
    "6054": [{"suburb": "Ashfield", "state": "WA"}, {"suburb": "Bassendean", "state": "WA"}],
    "6055": [{"suburb": "Bedford", "state": "WA"}, {"suburb": "Embleton", "state": "WA"}, {"suburb": "Morley", "state": "WA"}],
    "6056": [{"suburb": "Beechboro", "state": "WA"}, {"suburb": "Caversham", "state": "WA"}, {"suburb": "Hazelmere", "state": "WA"}, {"suburb": "Kiara", "state": "WA"}, {"suburb": "Lockridge", "state": "WA"}, {"suburb": "Middle Swan", "state": "WA"}, {"suburb": "Swan View", "state": "WA"}],
    
    # SA - Adelaide Metro
    "5000": [{"suburb": "Adelaide", "state": "SA"}],
    "5006": [{"suburb": "North Adelaide", "state": "SA"}],
    "5007": [{"suburb": "Bowden", "state": "SA"}, {"suburb": "Brompton", "state": "SA"}, {"suburb": "Hindmarsh", "state": "SA"}, {"suburb": "Welland", "state": "SA"}, {"suburb": "West Hindmarsh", "state": "SA"}],
    "5008": [{"suburb": "Croydon", "state": "SA"}, {"suburb": "Devon Park", "state": "SA"}, {"suburb": "Dudley Park", "state": "SA"}, {"suburb": "Renown Park", "state": "SA"}, {"suburb": "Ridleyton", "state": "SA"}, {"suburb": "West Croydon", "state": "SA"}],
    "5009": [{"suburb": "Allenby Gardens", "state": "SA"}, {"suburb": "Beverley", "state": "SA"}, {"suburb": "Kilkenny", "state": "SA"}],
    "5010": [{"suburb": "Angle Park", "state": "SA"}, {"suburb": "Ferryden Park", "state": "SA"}, {"suburb": "Regency Park", "state": "SA"}],
    "5011": [{"suburb": "Woodville", "state": "SA"}, {"suburb": "Woodville North", "state": "SA"}, {"suburb": "Woodville Park", "state": "SA"}, {"suburb": "Woodville South", "state": "SA"}, {"suburb": "Woodville West", "state": "SA"}],
    "5012": [{"suburb": "Athol Park", "state": "SA"}, {"suburb": "Cheltenham", "state": "SA"}, {"suburb": "Pennington", "state": "SA"}, {"suburb": "Rosewater", "state": "SA"}, {"suburb": "Rosewater East", "state": "SA"}],
    "5013": [{"suburb": "Gillman", "state": "SA"}, {"suburb": "Ottoway", "state": "SA"}, {"suburb": "Wingfield", "state": "SA"}],
    "5014": [{"suburb": "Albert Park", "state": "SA"}, {"suburb": "Alberton", "state": "SA"}, {"suburb": "Hendon", "state": "SA"}, {"suburb": "Royal Park", "state": "SA"}],
    "5015": [{"suburb": "Birkenhead", "state": "SA"}, {"suburb": "Ethelton", "state": "SA"}, {"suburb": "Glanville", "state": "SA"}, {"suburb": "New Port", "state": "SA"}, {"suburb": "Peterhead", "state": "SA"}, {"suburb": "Port Adelaide", "state": "SA"}],
    "5016": [{"suburb": "Exeter", "state": "SA"}, {"suburb": "Largs Bay", "state": "SA"}, {"suburb": "Largs North", "state": "SA"}, {"suburb": "Taperoo", "state": "SA"}],
    "5017": [{"suburb": "North Haven", "state": "SA"}, {"suburb": "Osborne", "state": "SA"}],
    "5018": [{"suburb": "Outer Harbor", "state": "SA"}],
    "5019": [{"suburb": "Semaphore", "state": "SA"}, {"suburb": "Semaphore Park", "state": "SA"}, {"suburb": "Semaphore South", "state": "SA"}],
    "5020": [{"suburb": "West Lakes", "state": "SA"}, {"suburb": "West Lakes Shore", "state": "SA"}],
    "5021": [{"suburb": "West Beach", "state": "SA"}],
    "5022": [{"suburb": "Grange", "state": "SA"}, {"suburb": "Henley Beach", "state": "SA"}, {"suburb": "Henley Beach South", "state": "SA"}, {"suburb": "Tennyson", "state": "SA"}],
    "5023": [{"suburb": "Findon", "state": "SA"}, {"suburb": "Seaton", "state": "SA"}],
    "5024": [{"suburb": "Fulham", "state": "SA"}, {"suburb": "Fulham Gardens", "state": "SA"}],
    "5025": [{"suburb": "Flinders Park", "state": "SA"}, {"suburb": "Kidman Park", "state": "SA"}],
    "5031": [{"suburb": "Mile End", "state": "SA"}, {"suburb": "Mile End South", "state": "SA"}, {"suburb": "Thebarton", "state": "SA"}, {"suburb": "Torrensville", "state": "SA"}],
    "5032": [{"suburb": "Brooklyn Park", "state": "SA"}, {"suburb": "Lockleys", "state": "SA"}, {"suburb": "Underdale", "state": "SA"}],
    "5033": [{"suburb": "Cowandilla", "state": "SA"}, {"suburb": "Hilton", "state": "SA"}, {"suburb": "Marleston", "state": "SA"}, {"suburb": "Richmond", "state": "SA"}, {"suburb": "West Richmond", "state": "SA"}],
    "5034": [{"suburb": "Goodwood", "state": "SA"}, {"suburb": "Kings Park", "state": "SA"}, {"suburb": "Millswood", "state": "SA"}, {"suburb": "Wayville", "state": "SA"}],
    "5035": [{"suburb": "Ashford", "state": "SA"}, {"suburb": "Everard Park", "state": "SA"}, {"suburb": "Keswick", "state": "SA"}, {"suburb": "Keswick Terminal", "state": "SA"}],
    "5037": [{"suburb": "Black Forest", "state": "SA"}, {"suburb": "Clarence Park", "state": "SA"}, {"suburb": "Cumberland Park", "state": "SA"}],
    "5038": [{"suburb": "Glandore", "state": "SA"}, {"suburb": "Kurralta Park", "state": "SA"}, {"suburb": "Netley", "state": "SA"}, {"suburb": "North Plympton", "state": "SA"}, {"suburb": "Plympton", "state": "SA"}, {"suburb": "Plympton Park", "state": "SA"}, {"suburb": "South Plympton", "state": "SA"}],
    "5039": [{"suburb": "Edwardstown", "state": "SA"}, {"suburb": "Melrose Park", "state": "SA"}],
    "5040": [{"suburb": "Novar Gardens", "state": "SA"}],
    "5041": [{"suburb": "Colonel Light Gardens", "state": "SA"}, {"suburb": "Daw Park", "state": "SA"}, {"suburb": "Westbourne Park", "state": "SA"}],
    "5042": [{"suburb": "Bedford Park", "state": "SA"}, {"suburb": "Clovelly Park", "state": "SA"}, {"suburb": "Pasadena", "state": "SA"}, {"suburb": "St Marys", "state": "SA"}, {"suburb": "Tonsley", "state": "SA"}],
    "5043": [{"suburb": "Ascot Park", "state": "SA"}, {"suburb": "Marion", "state": "SA"}, {"suburb": "Mitchell Park", "state": "SA"}, {"suburb": "Morphettville", "state": "SA"}, {"suburb": "Park Holme", "state": "SA"}, {"suburb": "Sturt", "state": "SA"}],
    "5044": [{"suburb": "Glengowrie", "state": "SA"}, {"suburb": "Glenelg", "state": "SA"}, {"suburb": "Glenelg East", "state": "SA"}, {"suburb": "Glenelg North", "state": "SA"}, {"suburb": "Glenelg South", "state": "SA"}, {"suburb": "Somerton Park", "state": "SA"}],
    "5045": [{"suburb": "Brighton", "state": "SA"}, {"suburb": "Hove", "state": "SA"}, {"suburb": "North Brighton", "state": "SA"}, {"suburb": "South Brighton", "state": "SA"}]
}


@router.get("/suburbs")
async def get_suburbs_by_postcode(postcode: str = Query(..., description="Postcode to lookup suburbs for")):
    """
    Get all suburbs for a given postcode.
    Returns a list of suburbs with their state.
    """
    postcode = postcode.strip()
    
    # First check the static data
    if postcode in AUSTRALIAN_SUBURBS:
        suburbs = AUSTRALIAN_SUBURBS[postcode]
        return {
            "postcode": postcode,
            "suburbs": suburbs,
            "count": len(suburbs)
        }
    
    # Check the database for custom suburb data
    db_suburbs = await db.postcode_suburbs.find(
        {"postcode": postcode},
        {"_id": 0}
    ).to_list(100)
    
    if db_suburbs:
        return {
            "postcode": postcode,
            "suburbs": db_suburbs,
            "count": len(db_suburbs)
        }
    
    # No suburbs found for this postcode
    return {
        "postcode": postcode,
        "suburbs": [],
        "count": 0,
        "message": "No suburbs found for this postcode. The postcode may be valid but not in our database yet."
    }


@router.post("/suburbs/import")
async def import_suburbs(
    file: UploadFile = File(...),
    mode: str = Query("merge", description="Import mode: 'merge' or 'replace'")
):
    """
    Import postcode-suburb mappings from CSV.
    CSV format: postcode, suburb, state, country
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    try:
        content = await file.read()
        decoded = content.decode('utf-8-sig')
        reader = csv.DictReader(io.StringIO(decoded))
        
        if mode == "replace":
            await db.postcode_suburbs.delete_many({})
        
        imported = 0
        for row in reader:
            postcode = row.get("postcode", "").strip()
            suburb = row.get("suburb", "").strip()
            state = row.get("state", "").strip()
            country = row.get("country", "AU").strip()
            
            if not postcode or not suburb:
                continue
            
            # Upsert the suburb entry
            await db.postcode_suburbs.update_one(
                {"postcode": postcode, "suburb": suburb},
                {"$set": {
                    "postcode": postcode,
                    "suburb": suburb,
                    "state": state,
                    "country": country
                }},
                upsert=True
            )
            imported += 1
        
        return {
            "message": "Suburbs imported successfully",
            "imported": imported,
            "mode": mode
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import error: {str(e)}")


@router.get("/suburbs/search")
async def search_suburbs(
    q: str = Query(..., min_length=2, description="Search term (suburb name or postcode)")
):
    """
    Search for suburbs by name or postcode prefix.
    Useful for autocomplete functionality.
    """
    q = q.strip().lower()
    results = []
    
    # Search in static data
    for postcode, suburbs in AUSTRALIAN_SUBURBS.items():
        # Match by postcode prefix
        if postcode.startswith(q):
            for s in suburbs:
                results.append({
                    "postcode": postcode,
                    "suburb": s["suburb"],
                    "state": s["state"]
                })
        # Match by suburb name
        else:
            for s in suburbs:
                if q in s["suburb"].lower():
                    results.append({
                        "postcode": postcode,
                        "suburb": s["suburb"],
                        "state": s["state"]
                    })
    
    # Also search in database
    db_results = await db.postcode_suburbs.find(
        {"$or": [
            {"postcode": {"$regex": f"^{q}", "$options": "i"}},
            {"suburb": {"$regex": q, "$options": "i"}}
        ]},
        {"_id": 0}
    ).to_list(50)
    
    results.extend(db_results)
    
    # Remove duplicates and limit results
    seen = set()
    unique_results = []
    for r in results:
        key = f"{r['postcode']}-{r['suburb']}"
        if key not in seen:
            seen.add(key)
            unique_results.append(r)
    
    return {
        "query": q,
        "results": unique_results[:50],  # Limit to 50 results
        "count": len(unique_results)
    }
