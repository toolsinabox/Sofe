"""
Addons/Integrations management routes
Handles marketplace integrations like eBay, Amazon, Stripe, shipping providers, etc.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from bson import ObjectId
import os

router = APIRouter(prefix="/addons", tags=["addons"])

# Database will be injected from main server
db = None

def set_database(database):
    global db
    db = database

# Pydantic Models
class AddonConfig(BaseModel):
    api_key: Optional[str] = None
    secret_key: Optional[str] = None
    auto_sync_inventory: bool = True
    import_orders: bool = True
    webhook_url: Optional[str] = None
    sandbox_mode: bool = False
    custom_settings: Dict[str, Any] = {}

class AddonCreate(BaseModel):
    addon_id: str  # e.g., 'ebay', 'stripe', 'auspost'
    config: Optional[AddonConfig] = None

class AddonUpdate(BaseModel):
    enabled: Optional[bool] = None
    config: Optional[AddonConfig] = None

class AddonResponse(BaseModel):
    id: str
    addon_id: str
    installed: bool
    enabled: bool
    config: Optional[Dict[str, Any]] = None
    installed_at: Optional[str] = None
    updated_at: Optional[str] = None

# Default addon definitions (marketplace of available addons)
DEFAULT_ADDONS = [
    # Marketplaces
    {
        "addon_id": "ebay",
        "name": "eBay",
        "description": "List and sell products on eBay Australia, manage orders and sync inventory automatically.",
        "category": "marketplaces",
        "icon": "🛒",
        "color": "bg-yellow-500",
        "configurable": True,
        "popular": True,
        "features": ["Auto-sync inventory", "Order management", "Bulk listing", "Promotion tools"],
        "config_fields": ["api_key", "secret_key", "sandbox_mode"]
    },
    {
        "addon_id": "amazon",
        "name": "Amazon AU",
        "description": "Expand your reach by selling on Amazon Australia marketplace.",
        "category": "marketplaces",
        "icon": "📦",
        "color": "bg-orange-500",
        "configurable": True,
        "popular": True,
        "features": ["FBA integration", "Prime eligibility", "A+ content", "Automated repricing"],
        "config_fields": ["api_key", "secret_key", "seller_id"]
    },
    {
        "addon_id": "kogan",
        "name": "Kogan",
        "description": "Sell on Kogan Marketplace to reach millions of Australian shoppers.",
        "category": "marketplaces",
        "icon": "🏪",
        "color": "bg-red-500",
        "configurable": True,
        "features": ["Product sync", "Order import", "Stock management"],
        "config_fields": ["api_key", "merchant_id"]
    },
    {
        "addon_id": "catch",
        "name": "Catch.com.au",
        "description": "List products on Catch marketplace for increased visibility.",
        "category": "marketplaces",
        "icon": "🎯",
        "color": "bg-purple-500",
        "configurable": True,
        "features": ["Daily deals", "Flash sales", "Category management"],
        "config_fields": ["api_key", "secret_key"]
    },
    {
        "addon_id": "google-shopping",
        "name": "Google Shopping",
        "description": "Show your products in Google Shopping results and drive traffic.",
        "category": "marketplaces",
        "icon": "🔍",
        "color": "bg-blue-500",
        "configurable": True,
        "popular": True,
        "features": ["Product feed", "Smart shopping", "Performance max", "Local inventory"],
        "config_fields": ["merchant_id", "api_key"]
    },
    {
        "addon_id": "facebook-shop",
        "name": "Facebook & Instagram Shop",
        "description": "Sell directly on Facebook and Instagram with shop integration.",
        "category": "marketplaces",
        "icon": "📱",
        "color": "bg-blue-600",
        "configurable": True,
        "features": ["Product catalog", "Checkout on FB/IG", "Shoppable posts", "Ads integration"],
        "config_fields": ["access_token", "catalog_id"]
    },
    # Shipping
    {
        "addon_id": "startrack",
        "name": "StarTrack",
        "description": "Australia Post StarTrack integration for business shipping.",
        "category": "shipping",
        "icon": "🚚",
        "color": "bg-red-600",
        "configurable": True,
        "features": ["Live rates", "Label printing", "Tracking", "Pickup booking"],
        "config_fields": ["api_key", "account_number"]
    },
    {
        "addon_id": "auspost",
        "name": "Australia Post",
        "description": "Domestic and international shipping with Australia Post.",
        "category": "shipping",
        "icon": "📮",
        "color": "bg-red-500",
        "configurable": True,
        "features": ["eParcel", "Express post", "Parcel lockers", "International"],
        "config_fields": ["api_key", "account_number"]
    },
    {
        "addon_id": "sendle",
        "name": "Sendle",
        "description": "Carbon-neutral shipping for small businesses.",
        "category": "shipping",
        "icon": "🌱",
        "color": "bg-green-500",
        "configurable": True,
        "features": ["Flat rate shipping", "Pickup service", "Carbon neutral"],
        "config_fields": ["sendle_id", "api_key"]
    },
    {
        "addon_id": "shippit",
        "name": "Shippit",
        "description": "Multi-carrier shipping platform for smart delivery.",
        "category": "shipping",
        "icon": "📦",
        "color": "bg-indigo-500",
        "configurable": True,
        "features": ["Multi-carrier", "Smart routing", "Branded tracking"],
        "config_fields": ["api_key", "secret_key"]
    },
    # Payments
    {
        "addon_id": "stripe",
        "name": "Stripe",
        "description": "Accept credit cards, Apple Pay, Google Pay and more.",
        "category": "payments",
        "icon": "💳",
        "color": "bg-purple-600",
        "configurable": True,
        "popular": True,
        "features": ["Cards", "Digital wallets", "Subscriptions", "Invoicing"],
        "config_fields": ["publishable_key", "secret_key", "webhook_secret"]
    },
    {
        "addon_id": "paypal",
        "name": "PayPal",
        "description": "Accept PayPal payments and Pay Later options.",
        "category": "payments",
        "icon": "🅿️",
        "color": "bg-blue-700",
        "configurable": True,
        "features": ["PayPal checkout", "Pay in 4", "Venmo", "Buyer protection"],
        "config_fields": ["client_id", "client_secret", "sandbox_mode"]
    },
    {
        "addon_id": "afterpay",
        "name": "Afterpay",
        "description": "Buy now, pay later solution for Australian shoppers.",
        "category": "payments",
        "icon": "🛍️",
        "color": "bg-teal-500",
        "configurable": True,
        "features": ["4 installments", "No interest", "Instant approval"],
        "config_fields": ["merchant_id", "secret_key"]
    },
    {
        "addon_id": "zippay",
        "name": "Zip Pay",
        "description": "Interest-free payment plans up to $1000.",
        "category": "payments",
        "icon": "⚡",
        "color": "bg-indigo-600",
        "configurable": True,
        "features": ["Pay later", "Flexible plans", "No annual fees"],
        "config_fields": ["merchant_id", "api_key"]
    },
    # Marketing
    {
        "addon_id": "mailchimp",
        "name": "Mailchimp",
        "description": "Email marketing automation and customer journeys.",
        "category": "marketing",
        "icon": "📧",
        "color": "bg-yellow-400",
        "configurable": True,
        "features": ["Email campaigns", "Automation", "Segmentation", "Analytics"],
        "config_fields": ["api_key", "audience_id"]
    },
    {
        "addon_id": "klaviyo",
        "name": "Klaviyo",
        "description": "Ecommerce email and SMS marketing platform.",
        "category": "marketing",
        "icon": "📱",
        "color": "bg-green-600",
        "configurable": True,
        "popular": True,
        "features": ["Email flows", "SMS marketing", "Predictive analytics", "A/B testing"],
        "config_fields": ["api_key", "public_key"]
    },
    {
        "addon_id": "google-ads",
        "name": "Google Ads",
        "description": "Run search, display and shopping ads on Google.",
        "category": "marketing",
        "icon": "📈",
        "color": "bg-blue-500",
        "configurable": True,
        "features": ["Search ads", "Display ads", "Remarketing", "Conversion tracking"],
        "config_fields": ["customer_id", "developer_token"]
    },
    {
        "addon_id": "facebook-ads",
        "name": "Meta Ads",
        "description": "Advertise on Facebook and Instagram.",
        "category": "marketing",
        "icon": "📣",
        "color": "bg-blue-600",
        "configurable": True,
        "features": ["FB/IG ads", "Pixel tracking", "Custom audiences", "Lookalikes"],
        "config_fields": ["access_token", "pixel_id", "ad_account_id"]
    },
    # Analytics
    {
        "addon_id": "google-analytics",
        "name": "Google Analytics 4",
        "description": "Track website traffic, conversions and user behavior.",
        "category": "analytics",
        "icon": "📊",
        "color": "bg-orange-500",
        "configurable": True,
        "features": ["Traffic analysis", "Ecommerce tracking", "Custom reports", "Funnels"],
        "config_fields": ["measurement_id", "api_secret"]
    },
    {
        "addon_id": "hotjar",
        "name": "Hotjar",
        "description": "Heatmaps, recordings and feedback tools.",
        "category": "analytics",
        "icon": "🔥",
        "color": "bg-red-500",
        "configurable": True,
        "features": ["Heatmaps", "Session recording", "Surveys", "Feedback"],
        "config_fields": ["site_id"]
    },
    # Communication
    {
        "addon_id": "zendesk",
        "name": "Zendesk",
        "description": "Customer support and help desk solution.",
        "category": "communication",
        "icon": "💬",
        "color": "bg-green-500",
        "configurable": True,
        "features": ["Ticketing", "Live chat", "Knowledge base", "AI bots"],
        "config_fields": ["subdomain", "api_token", "email"]
    },
    {
        "addon_id": "intercom",
        "name": "Intercom",
        "description": "Customer messaging and engagement platform.",
        "category": "communication",
        "icon": "💭",
        "color": "bg-blue-500",
        "configurable": True,
        "features": ["Live chat", "Chatbots", "Product tours", "Help center"],
        "config_fields": ["app_id", "api_key"]
    },
    {
        "addon_id": "sms-gateway",
        "name": "SMS Notifications",
        "description": "Send SMS order updates to customers.",
        "category": "communication",
        "icon": "📲",
        "color": "bg-purple-500",
        "configurable": True,
        "features": ["Order SMS", "Shipping updates", "Marketing SMS", "Templates"],
        "config_fields": ["api_key", "sender_id"]
    },
]


@router.get("/available")
async def get_available_addons():
    """Get list of all available addons in the marketplace"""
    return DEFAULT_ADDONS


@router.get("/")
async def get_installed_addons():
    """Get all installed addons for the current merchant"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    installed = await db.addons.find({}, {"_id": 0}).to_list(100)
    
    # Merge with default addon info
    result = []
    installed_ids = {a["addon_id"]: a for a in installed}
    
    for addon_def in DEFAULT_ADDONS:
        addon_data = {
            **addon_def,
            "installed": addon_def["addon_id"] in installed_ids,
            "enabled": installed_ids.get(addon_def["addon_id"], {}).get("enabled", False),
            "config": installed_ids.get(addon_def["addon_id"], {}).get("config", {}),
            "installed_at": installed_ids.get(addon_def["addon_id"], {}).get("installed_at"),
            "updated_at": installed_ids.get(addon_def["addon_id"], {}).get("updated_at"),
        }
        result.append(addon_data)
    
    return result


@router.post("/{addon_id}/install")
async def install_addon(addon_id: str, config: Optional[AddonConfig] = None):
    """Install an addon"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    # Check if addon exists in available addons
    addon_def = next((a for a in DEFAULT_ADDONS if a["addon_id"] == addon_id), None)
    if not addon_def:
        raise HTTPException(status_code=404, detail=f"Addon '{addon_id}' not found")
    
    # Check if already installed
    existing = await db.addons.find_one({"addon_id": addon_id})
    if existing:
        raise HTTPException(status_code=400, detail=f"Addon '{addon_id}' is already installed")
    
    # Create addon record
    now = datetime.now(timezone.utc).isoformat()
    addon_record = {
        "id": str(ObjectId()),
        "addon_id": addon_id,
        "installed": True,
        "enabled": False,  # Disabled by default until configured
        "config": config.dict() if config else {},
        "installed_at": now,
        "updated_at": now,
    }
    
    await db.addons.insert_one(addon_record)
    
    # Return clean response without MongoDB _id
    response_addon = {k: v for k, v in addon_record.items() if k != "_id"}
    
    return {
        "success": True,
        "message": f"Addon '{addon_def['name']}' installed successfully",
        "addon": {**addon_def, **response_addon}
    }


@router.delete("/{addon_id}/uninstall")
async def uninstall_addon(addon_id: str):
    """Uninstall an addon"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    result = await db.addons.delete_one({"addon_id": addon_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail=f"Addon '{addon_id}' is not installed")
    
    return {
        "success": True,
        "message": f"Addon '{addon_id}' uninstalled successfully"
    }


@router.put("/{addon_id}/toggle")
async def toggle_addon(addon_id: str):
    """Toggle addon enabled/disabled status"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    addon = await db.addons.find_one({"addon_id": addon_id})
    if not addon:
        raise HTTPException(status_code=404, detail=f"Addon '{addon_id}' is not installed")
    
    new_enabled = not addon.get("enabled", False)
    now = datetime.now(timezone.utc).isoformat()
    
    await db.addons.update_one(
        {"addon_id": addon_id},
        {"$set": {"enabled": new_enabled, "updated_at": now}}
    )
    
    return {
        "success": True,
        "enabled": new_enabled,
        "message": f"Addon '{addon_id}' {'enabled' if new_enabled else 'disabled'}"
    }


@router.put("/{addon_id}/config")
async def update_addon_config(addon_id: str, config: AddonConfig):
    """Update addon configuration"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    addon = await db.addons.find_one({"addon_id": addon_id})
    if not addon:
        raise HTTPException(status_code=404, detail=f"Addon '{addon_id}' is not installed")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Merge existing config with new config
    existing_config = addon.get("config", {})
    new_config = {**existing_config, **config.dict(exclude_unset=True)}
    
    await db.addons.update_one(
        {"addon_id": addon_id},
        {"$set": {"config": new_config, "updated_at": now}}
    )
    
    return {
        "success": True,
        "message": f"Addon '{addon_id}' configuration updated",
        "config": new_config
    }


@router.get("/{addon_id}")
async def get_addon_details(addon_id: str):
    """Get details of a specific addon"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    # Get addon definition
    addon_def = next((a for a in DEFAULT_ADDONS if a["addon_id"] == addon_id), None)
    if not addon_def:
        raise HTTPException(status_code=404, detail=f"Addon '{addon_id}' not found")
    
    # Get installed status
    installed = await db.addons.find_one({"addon_id": addon_id}, {"_id": 0})
    
    return {
        **addon_def,
        "installed": installed is not None,
        "enabled": installed.get("enabled", False) if installed else False,
        "config": installed.get("config", {}) if installed else {},
        "installed_at": installed.get("installed_at") if installed else None,
        "updated_at": installed.get("updated_at") if installed else None,
    }


@router.post("/sync-all")
async def sync_all_addons():
    """Trigger sync for all enabled addons"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    enabled_addons = await db.addons.find({"enabled": True}, {"_id": 0}).to_list(100)
    
    # In a real implementation, this would trigger background jobs for each addon
    sync_results = []
    for addon in enabled_addons:
        sync_results.append({
            "addon_id": addon["addon_id"],
            "status": "queued",
            "message": f"Sync triggered for {addon['addon_id']}"
        })
    
    return {
        "success": True,
        "message": f"Sync triggered for {len(enabled_addons)} addons",
        "results": sync_results
    }
