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
    base_rate: float
    per_kg_rate: float = 0
    delivery_days: int = 3
    is_active: bool = True

class ShippingService(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str  # Customer-facing name
    code: str  # Internal code
    carrier: str = "custom"  # e.g., "australia_post", "startrack", "custom"
    charge_type: str = "weight"  # weight, cubic, fixed, flat, cart_total
    min_charge: float = 0
    max_charge: Optional[float] = None
    handling_fee: float = 0
    fuel_levy_percent: float = 0
    cubic_weight_modifier: float = 250  # kg per cubic meter
    rates: List[ShippingRate] = []
    categories: List[str] = []  # Linked category codes
    is_active: bool = True
    sort_order: int = 0
    tracking_url_template: Optional[str] = None
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
    country: str = "AU"
    items: List[Dict[str, Any]]  # [{product_id, quantity, weight, length, width, height, shipping_category}]
    cart_total: float

class ShippingCalculationResponse(BaseModel):
    options: List[Dict[str, Any]]
    zone: Optional[Dict[str, Any]] = None


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
            "message": f"Import completed successfully",
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
    await db.shipping_services.update_one({"id": service_id}, {"$set": service_data})
    return {"message": "Service updated successfully"}

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
    
    # Write header
    writer.writerow([
        "Zone Code", "Zone Name", "Courier Name", "Minimum Charge", "1st Parcel",
        "Per Subsequent Parcel", "Per Kg", "Minimum", "Maximum", "Add weight",
        "Delivery Time", "Internal Note"
    ])
    
    # Add sample rows
    writer.writerow(["SYD-METRO", "Sydney Metro", "StarTrack", "18.48", "12.14", "", "0.43", "0", "", "", "2", ""])
    writer.writerow(["MEL-METRO", "Melbourne Metro", "StarTrack", "20.72", "12.14", "", "0.58", "0", "", "", "3", ""])
    writer.writerow(["BNE-METRO", "Brisbane Metro", "StarTrack", "21.22", "12.14", "", "0.61", "0", "", "", "3", ""])
    writer.writerow(["REGIONAL", "Regional", "Australia Post", "28.48", "13.82", "", "0.98", "0", "", "", "5", ""])
    
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
                "base_rate": float(row.get("Minimum Charge", 0) or 0),
                "first_parcel": float(row.get("1st Parcel", 0) or 0),
                "per_subsequent": float(row.get("Per Subsequent Parcel", 0) or 0) if row.get("Per Subsequent Parcel") else 0,
                "per_kg_rate": float(row.get("Per Kg", 0) or 0),
                "min_weight": float(row.get("Minimum", 0) or 0),
                "max_weight": float(row.get("Maximum", 999) or 999) if row.get("Maximum") else 999,
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
    """Find the matching zone for a given postcode"""
    postcode = postcode.strip()
    
    for zone in zones:
        for pc in zone.get("postcodes", []):
            # Check for exact match
            if pc == postcode:
                return zone
            # Check for range (e.g., "2000-2050")
            if "-" in pc:
                try:
                    start, end = pc.split("-")
                    if int(start) <= int(postcode) <= int(end):
                        return zone
                except (ValueError, TypeError):
                    pass
            # Check for prefix match (e.g., "20" matches "2000", "2001", etc.)
            if postcode.startswith(pc):
                return zone
    
    return None

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
    
    # Find the zone for the destination postcode
    zone = find_zone_for_postcode(request.postcode, zones)
    
    if not zone:
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
    
    # Calculate total weight and check categories
    total_weight = 0
    item_categories = set()
    
    for item in request.items:
        item_weight = item.get("weight", 0.5) * item.get("quantity", 1)
        total_weight += item_weight
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
        # Check if service applies to item categories
        service_categories = set(service.get("categories", []))
        if service_categories and not service_categories.intersection(item_categories):
            continue
        
        # Find rate for this zone
        rate = None
        for r in service.get("rates", []):
            if r.get("zone_code") == zone.get("code"):
                # Check weight range
                if r.get("min_weight", 0) <= total_weight <= r.get("max_weight", 999999):
                    if r.get("is_active", True):
                        rate = r
                        break
        
        if not rate:
            continue
        
        # Calculate base price
        if service.get("charge_type") == "weight":
            # Weight-based calculation
            base_price = rate.get("base_rate", 0)
            if total_weight > 0 and rate.get("per_kg_rate", 0) > 0:
                base_price += total_weight * rate.get("per_kg_rate", 0)
        elif service.get("charge_type") == "cubic":
            # Cubic weight calculation
            total_cubic_weight = 0
            for item in request.items:
                total_cubic_weight += calculate_item_weight(item, service)
            base_price = rate.get("base_rate", 0)
            if total_cubic_weight > 0 and rate.get("per_kg_rate", 0) > 0:
                base_price += total_cubic_weight * rate.get("per_kg_rate", 0)
        elif service.get("charge_type") == "cart_total":
            # Based on cart total
            base_price = rate.get("base_rate", 0)
        else:
            # Fixed/flat rate
            base_price = rate.get("base_rate", 0)
        
        # Add handling fee
        base_price += service.get("handling_fee", 0)
        
        # Add fuel levy
        if service.get("fuel_levy_percent", 0) > 0:
            base_price += base_price * (service.get("fuel_levy_percent", 0) / 100)
        
        # Apply min/max charge
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
        
        final_price = 0 if is_free else round(base_price, 2)
        
        calculated_options.append({
            "id": service["id"],
            "name": service["name"],
            "price": final_price,
            "delivery_days": rate.get("delivery_days", 3),
            "description": f"{rate.get('delivery_days', 3)} business days" if not is_free else "Free shipping",
            "service_code": service["code"],
            "carrier": service.get("carrier", "custom"),
            "is_free": is_free
        })
    
    return ShippingCalculationResponse(
        options=calculated_options,
        zone={
            "code": zone.get("code"),
            "name": zone.get("name")
        }
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
