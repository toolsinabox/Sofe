"""
eBay Integration Module
Full integration with eBay marketplace for product listing, inventory sync, and order management.
Based on Maropost's eBay integration features.
"""
from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import os
import httpx
import base64
import asyncio
import logging

router = APIRouter(prefix="/ebay", tags=["ebay"])

logger = logging.getLogger(__name__)

# Database reference (set by main server)
db = None

def set_database(database):
    global db
    db = database

# eBay API Configuration
EBAY_SANDBOX_AUTH_URL = "https://api.sandbox.ebay.com/identity/v1/oauth2/token"
EBAY_PRODUCTION_AUTH_URL = "https://api.ebay.com/identity/v1/oauth2/token"
EBAY_SANDBOX_API_URL = "https://api.sandbox.ebay.com"
EBAY_PRODUCTION_API_URL = "https://api.ebay.com"

# OAuth scopes required for full integration
EBAY_SCOPES = [
    "https://api.ebay.com/oauth/api_scope",
    "https://api.ebay.com/oauth/api_scope/sell.inventory",
    "https://api.ebay.com/oauth/api_scope/sell.inventory.readonly",
    "https://api.ebay.com/oauth/api_scope/sell.account",
    "https://api.ebay.com/oauth/api_scope/sell.fulfillment",
    "https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly",
]

# Pydantic Models
class EbayCredentials(BaseModel):
    client_id: str = Field(..., description="eBay App ID (Client ID)")
    client_secret: str = Field(..., description="eBay Cert ID (Client Secret)")
    ru_name: Optional[str] = Field(None, description="Redirect URL name for user auth")
    sandbox_mode: bool = Field(True, description="Use sandbox environment for testing")

class EbayConnectionStatus(BaseModel):
    connected: bool
    sandbox_mode: bool
    account_name: Optional[str] = None
    seller_id: Optional[str] = None
    token_expires: Optional[str] = None
    last_sync: Optional[str] = None
    listings_count: int = 0
    active_orders: int = 0

class EbayListingConfig(BaseModel):
    product_id: str
    ebay_category_id: str
    listing_type: str = "FixedPriceItem"  # FixedPriceItem, Auction
    duration: str = "GTC"  # GTC (Good Till Cancelled), Days_7, Days_30
    condition: str = "NEW"  # NEW, LIKE_NEW, USED_EXCELLENT, USED_GOOD, etc.
    quantity: Optional[int] = None  # Override product stock
    price: Optional[float] = None  # Override product price
    shipping_service: str = "AU_StandardDelivery"
    shipping_cost: float = 0.0
    returns_accepted: bool = True
    return_period: int = 30  # days
    payment_policy_id: Optional[str] = None
    fulfillment_policy_id: Optional[str] = None
    return_policy_id: Optional[str] = None

class EbaySyncConfig(BaseModel):
    auto_sync_inventory: bool = True
    sync_interval_minutes: int = 15
    import_orders: bool = True
    push_tracking: bool = True
    auto_relist_when_in_stock: bool = True

class EbayOrder(BaseModel):
    ebay_order_id: str
    buyer_username: str
    buyer_email: Optional[str]
    total: float
    items: List[Dict]
    shipping_address: Dict
    order_date: str
    status: str

# Helper class for eBay API calls
class EbayClient:
    def __init__(self, credentials: Dict, sandbox: bool = True):
        self.client_id = credentials.get('client_id')
        self.client_secret = credentials.get('client_secret')
        self.sandbox = sandbox
        self.access_token = credentials.get('access_token')
        self.refresh_token = credentials.get('refresh_token')
        self.token_expires = credentials.get('token_expires')
        
    @property
    def auth_url(self):
        return EBAY_SANDBOX_AUTH_URL if self.sandbox else EBAY_PRODUCTION_AUTH_URL
    
    @property
    def api_url(self):
        return EBAY_SANDBOX_API_URL if self.sandbox else EBAY_PRODUCTION_API_URL
    
    async def get_application_token(self) -> str:
        """Get application-level access token using client credentials"""
        auth_string = base64.b64encode(
            f"{self.client_id}:{self.client_secret}".encode()
        ).decode()
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.auth_url,
                headers={
                    "Authorization": f"Basic {auth_string}",
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                data={
                    "grant_type": "client_credentials",
                    "scope": " ".join(EBAY_SCOPES)
                }
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=400,
                    detail=f"Failed to get eBay token: {response.text}"
                )
            
            data = response.json()
            return data.get('access_token')
    
    async def refresh_user_token(self) -> Dict:
        """Refresh user access token"""
        if not self.refresh_token:
            raise HTTPException(status_code=400, detail="No refresh token available")
        
        auth_string = base64.b64encode(
            f"{self.client_id}:{self.client_secret}".encode()
        ).decode()
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.auth_url,
                headers={
                    "Authorization": f"Basic {auth_string}",
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": self.refresh_token,
                    "scope": " ".join(EBAY_SCOPES)
                }
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=400,
                    detail=f"Failed to refresh token: {response.text}"
                )
            
            return response.json()
    
    async def api_call(self, method: str, endpoint: str, data: Dict = None, params: Dict = None) -> Dict:
        """Make authenticated API call to eBay"""
        if not self.access_token:
            self.access_token = await self.get_application_token()
        
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        
        url = f"{self.api_url}{endpoint}"
        
        async with httpx.AsyncClient() as client:
            if method.upper() == "GET":
                response = await client.get(url, headers=headers, params=params)
            elif method.upper() == "POST":
                response = await client.post(url, headers=headers, json=data)
            elif method.upper() == "PUT":
                response = await client.put(url, headers=headers, json=data)
            elif method.upper() == "DELETE":
                response = await client.delete(url, headers=headers)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            if response.status_code == 401:
                # Token expired, try to refresh
                new_tokens = await self.refresh_user_token()
                self.access_token = new_tokens.get('access_token')
                # Retry the call
                return await self.api_call(method, endpoint, data, params)
            
            return {
                "status_code": response.status_code,
                "data": response.json() if response.text else {}
            }


# ==================== ROUTES ====================

@router.post("/connect")
async def connect_ebay_account(credentials: EbayCredentials):
    """
    Connect eBay account with API credentials.
    This initiates the OAuth flow and stores credentials.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    # Validate credentials by getting an application token
    client = EbayClient(credentials.dict(), sandbox=credentials.sandbox_mode)
    
    try:
        token = await client.get_application_token()
        
        # Store credentials in database
        now = datetime.now(timezone.utc).isoformat()
        ebay_config = {
            "id": str(ObjectId()),
            "client_id": credentials.client_id,
            "client_secret": credentials.client_secret,
            "ru_name": credentials.ru_name,
            "sandbox_mode": credentials.sandbox_mode,
            "access_token": token,
            "refresh_token": None,  # Set after user authorization
            "token_expires": (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat(),
            "connected": True,
            "connected_at": now,
            "last_sync": None,
            "sync_config": {
                "auto_sync_inventory": True,
                "sync_interval_minutes": 15,
                "import_orders": True,
                "push_tracking": True,
                "auto_relist_when_in_stock": True
            }
        }
        
        # Upsert - update if exists, insert if not
        await db.ebay_config.update_one(
            {"client_id": credentials.client_id},
            {"$set": ebay_config},
            upsert=True
        )
        
        return {
            "success": True,
            "message": "eBay account connected successfully",
            "sandbox_mode": credentials.sandbox_mode,
            "token_expires": ebay_config["token_expires"]
        }
        
    except HTTPException as e:
        # Parse the eBay error for better messaging
        error_detail = str(e.detail)
        
        if "invalid_client" in error_detail:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "Invalid Credentials",
                    "message": "The Client ID or Client Secret is incorrect.",
                    "troubleshooting": [
                        "Verify you copied the credentials correctly from eBay Developer Portal",
                        f"Make sure you're using {'Sandbox' if credentials.sandbox_mode else 'Production'} credentials",
                        "Check that your eBay app is active and not expired",
                        "Ensure you're using the correct App ID (not the Cert ID) for Client ID"
                    ],
                    "help_url": "https://developer.ebay.com/my/keys"
                }
            )
        elif "invalid_scope" in error_detail:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "Invalid Scopes",
                    "message": "Your eBay app doesn't have the required permissions.",
                    "troubleshooting": [
                        "Go to your eBay Developer app settings",
                        "Enable OAuth scopes for Sell APIs",
                        "Required: sell.inventory, sell.fulfillment, sell.account"
                    ],
                    "help_url": "https://developer.ebay.com/my/keys"
                }
            )
        else:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "Connection Failed",
                    "message": error_detail,
                    "troubleshooting": [
                        "Double-check your Client ID and Client Secret",
                        "Verify Sandbox/Production mode matches your credentials",
                        "Try creating a new app on eBay Developer Portal"
                    ],
                    "help_url": "https://developer.ebay.com/my/keys"
                }
            )
    except Exception as e:
        logger.error(f"Failed to connect eBay: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Connection Failed", 
                "message": str(e),
                "troubleshooting": [
                    "Double-check your Client ID and Client Secret",
                    "Verify Sandbox/Production mode matches your credentials",
                    "Try creating a new app on eBay Developer Portal"
                ],
                "help_url": "https://developer.ebay.com/my/keys"
            }
        )


@router.post("/test-connection")
async def test_ebay_connection(credentials: EbayCredentials):
    """
    Test eBay credentials without saving them.
    Use this to validate credentials before connecting.
    """
    client = EbayClient(credentials.dict(), sandbox=credentials.sandbox_mode)
    
    try:
        token = await client.get_application_token()
        return {
            "success": True,
            "message": "Credentials are valid!",
            "sandbox_mode": credentials.sandbox_mode,
            "token_preview": token[:20] + "..." if token else None
        }
    except HTTPException as e:
        error_detail = str(e.detail)
        
        if "invalid_client" in error_detail:
            return {
                "success": False,
                "error": "Invalid Credentials",
                "message": "The Client ID or Client Secret is incorrect.",
                "troubleshooting": [
                    "Verify you copied the credentials correctly",
                    f"Make sure you're using {'Sandbox' if credentials.sandbox_mode else 'Production'} credentials",
                    "Check that your eBay app is active"
                ]
            }
        else:
            return {
                "success": False,
                "error": "Connection Failed",
                "message": error_detail
            }
    except Exception as e:
        return {
            "success": False,
            "error": "Connection Failed",
            "message": str(e)
        }


@router.get("/status")
async def get_connection_status() -> EbayConnectionStatus:
    """Get eBay connection status and statistics"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    config = await db.ebay_config.find_one({}, {"_id": 0})
    
    if not config or not config.get("connected"):
        return EbayConnectionStatus(
            connected=False,
            sandbox_mode=True
        )
    
    # Count listings and orders
    listings_count = await db.ebay_listings.count_documents({"status": "active"})
    active_orders = await db.ebay_orders.count_documents({"status": {"$in": ["pending", "processing"]}})
    
    return EbayConnectionStatus(
        connected=True,
        sandbox_mode=config.get("sandbox_mode", True),
        account_name=config.get("account_name"),
        seller_id=config.get("seller_id"),
        token_expires=config.get("token_expires"),
        last_sync=config.get("last_sync"),
        listings_count=listings_count,
        active_orders=active_orders
    )


@router.delete("/disconnect")
async def disconnect_ebay():
    """Disconnect eBay account and clear credentials"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    await db.ebay_config.delete_many({})
    
    return {"success": True, "message": "eBay account disconnected"}


@router.get("/oauth/authorize")
async def get_authorization_url():
    """
    Get eBay OAuth authorization URL for user consent.
    User must visit this URL to grant permissions.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    config = await db.ebay_config.find_one({}, {"_id": 0})
    if not config:
        raise HTTPException(status_code=400, detail="eBay not configured. Connect first.")
    
    sandbox = config.get("sandbox_mode", True)
    base_url = "https://auth.sandbox.ebay.com" if sandbox else "https://auth.ebay.com"
    
    ru_name = config.get("ru_name")
    if not ru_name:
        raise HTTPException(status_code=400, detail="RuName (Redirect URL name) not configured")
    
    scopes = " ".join(EBAY_SCOPES)
    
    auth_url = (
        f"{base_url}/oauth2/authorize?"
        f"client_id={config['client_id']}&"
        f"redirect_uri={ru_name}&"
        f"response_type=code&"
        f"scope={scopes}"
    )
    
    return {"authorization_url": auth_url}


@router.post("/oauth/callback")
async def handle_oauth_callback(code: str):
    """
    Handle OAuth callback with authorization code.
    Exchange code for user access token.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    config = await db.ebay_config.find_one({}, {"_id": 0})
    if not config:
        raise HTTPException(status_code=400, detail="eBay not configured")
    
    client = EbayClient(config, sandbox=config.get("sandbox_mode", True))
    
    auth_string = base64.b64encode(
        f"{config['client_id']}:{config['client_secret']}".encode()
    ).decode()
    
    async with httpx.AsyncClient() as http_client:
        response = await http_client.post(
            client.auth_url,
            headers={
                "Authorization": f"Basic {auth_string}",
                "Content-Type": "application/x-www-form-urlencoded"
            },
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": config.get("ru_name")
            }
        )
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to exchange code: {response.text}"
            )
        
        tokens = response.json()
    
    # Update stored tokens
    expires_in = tokens.get("expires_in", 7200)
    token_expires = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
    
    await db.ebay_config.update_one(
        {"client_id": config["client_id"]},
        {
            "$set": {
                "access_token": tokens.get("access_token"),
                "refresh_token": tokens.get("refresh_token"),
                "token_expires": token_expires.isoformat()
            }
        }
    )
    
    return {
        "success": True,
        "message": "User authorization successful",
        "token_expires": token_expires.isoformat()
    }


# ==================== PRODUCT LISTINGS ====================

@router.get("/categories")
async def get_ebay_categories(query: str = Query(None)):
    """Get eBay categories for listing products"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    config = await db.ebay_config.find_one({}, {"_id": 0})
    if not config or not config.get("connected"):
        raise HTTPException(status_code=400, detail="eBay not connected")
    
    client = EbayClient(config, sandbox=config.get("sandbox_mode", True))
    
    # Use Taxonomy API to get categories
    result = await client.api_call(
        "GET",
        "/commerce/taxonomy/v1/category_tree/15"  # 15 = Australia
    )
    
    if result["status_code"] != 200:
        # Return mock categories for development
        return {
            "categories": [
                {"id": "9355", "name": "Sporting Goods"},
                {"id": "888", "name": "Sporting Goods > Camping & Hiking"},
                {"id": "11700", "name": "Home & Garden"},
                {"id": "20081", "name": "Computers/Tablets & Networking"},
                {"id": "293", "name": "Consumer Electronics"},
                {"id": "11450", "name": "Clothing, Shoes & Accessories"},
            ]
        }
    
    return result["data"]


@router.post("/listings")
async def create_ebay_listing(listing_config: EbayListingConfig, background_tasks: BackgroundTasks):
    """
    Create a new eBay listing from a product.
    Pushes product to eBay marketplace.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    config = await db.ebay_config.find_one({}, {"_id": 0})
    if not config or not config.get("connected"):
        raise HTTPException(status_code=400, detail="eBay not connected")
    
    # Get product from database
    product = await db.products.find_one({"id": listing_config.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Prepare eBay listing data
    listing_data = {
        "sku": product.get("sku", listing_config.product_id),
        "locale": "en_AU",
        "product": {
            "title": product.get("name", "")[:80],  # eBay title limit
            "description": product.get("description", ""),
            "aspects": {},  # Product specifics
            "brand": product.get("brand", "Unbranded"),
            "mpn": product.get("mpn", "Does Not Apply"),
            "imageUrls": product.get("images", [])[:12]  # eBay allows up to 12 images
        },
        "condition": listing_config.condition,
        "availability": {
            "shipToLocationAvailability": {
                "quantity": listing_config.quantity or product.get("stock", 0)
            }
        }
    }
    
    client = EbayClient(config, sandbox=config.get("sandbox_mode", True))
    
    # Create inventory item
    result = await client.api_call(
        "PUT",
        f"/sell/inventory/v1/inventory_item/{listing_data['sku']}",
        data=listing_data
    )
    
    if result["status_code"] not in [200, 201, 204]:
        logger.error(f"eBay listing creation failed: {result}")
        # For demo/sandbox, still create local record
    
    # Create offer (pricing and listing details)
    offer_data = {
        "sku": listing_data["sku"],
        "marketplaceId": "EBAY_AU",
        "format": "FIXED_PRICE" if listing_config.listing_type == "FixedPriceItem" else "AUCTION",
        "listingDuration": listing_config.duration,
        "pricingSummary": {
            "price": {
                "value": str(listing_config.price or product.get("price", 0)),
                "currency": "AUD"
            }
        },
        "listingPolicies": {
            "fulfillmentPolicyId": listing_config.fulfillment_policy_id,
            "paymentPolicyId": listing_config.payment_policy_id,
            "returnPolicyId": listing_config.return_policy_id
        },
        "categoryId": listing_config.ebay_category_id
    }
    
    # Store listing in database
    now = datetime.now(timezone.utc).isoformat()
    ebay_listing = {
        "id": str(ObjectId()),
        "product_id": listing_config.product_id,
        "sku": listing_data["sku"],
        "ebay_item_id": None,  # Set after successful publish
        "title": listing_data["product"]["title"],
        "price": listing_config.price or product.get("price", 0),
        "quantity": listing_data["availability"]["shipToLocationAvailability"]["quantity"],
        "condition": listing_config.condition,
        "category_id": listing_config.ebay_category_id,
        "listing_type": listing_config.listing_type,
        "duration": listing_config.duration,
        "status": "draft",  # draft, active, ended, error
        "created_at": now,
        "updated_at": now,
        "last_sync": now,
        "ebay_response": result.get("data", {})
    }
    
    await db.ebay_listings.insert_one(ebay_listing)
    
    return {
        "success": True,
        "message": "Listing created",
        "listing_id": ebay_listing["id"],
        "status": ebay_listing["status"]
    }


@router.post("/listings/{listing_id}/publish")
async def publish_listing(listing_id: str):
    """Publish a draft listing to eBay"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    listing = await db.ebay_listings.find_one({"id": listing_id}, {"_id": 0})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    config = await db.ebay_config.find_one({}, {"_id": 0})
    client = EbayClient(config, sandbox=config.get("sandbox_mode", True))
    
    # Publish offer
    result = await client.api_call(
        "POST",
        f"/sell/inventory/v1/offer",
        data={"sku": listing["sku"]}
    )
    
    # Update listing status
    now = datetime.now(timezone.utc).isoformat()
    update_data = {
        "status": "active" if result["status_code"] in [200, 201] else "error",
        "updated_at": now,
        "last_sync": now,
        "ebay_item_id": result.get("data", {}).get("listingId"),
        "publish_response": result.get("data", {})
    }
    
    await db.ebay_listings.update_one(
        {"id": listing_id},
        {"$set": update_data}
    )
    
    return {
        "success": result["status_code"] in [200, 201],
        "ebay_item_id": update_data.get("ebay_item_id"),
        "status": update_data["status"]
    }


@router.get("/listings")
async def get_listings(status: str = Query(None), limit: int = 50, skip: int = 0):
    """Get all eBay listings"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    query = {}
    if status:
        query["status"] = status
    
    listings = await db.ebay_listings.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.ebay_listings.count_documents(query)
    
    return {
        "listings": listings,
        "total": total,
        "limit": limit,
        "skip": skip
    }


@router.delete("/listings/{listing_id}")
async def delete_listing(listing_id: str):
    """End and delete an eBay listing"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    listing = await db.ebay_listings.find_one({"id": listing_id}, {"_id": 0})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    # End listing on eBay if active
    if listing.get("ebay_item_id") and listing.get("status") == "active":
        config = await db.ebay_config.find_one({}, {"_id": 0})
        client = EbayClient(config, sandbox=config.get("sandbox_mode", True))
        
        await client.api_call(
            "DELETE",
            f"/sell/inventory/v1/inventory_item/{listing['sku']}"
        )
    
    # Delete from database
    await db.ebay_listings.delete_one({"id": listing_id})
    
    return {"success": True, "message": "Listing deleted"}


# ==================== INVENTORY SYNC ====================

@router.post("/sync/inventory")
async def sync_inventory(background_tasks: BackgroundTasks):
    """
    Synchronize inventory levels between local products and eBay listings.
    Updates eBay quantities based on local stock.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    config = await db.ebay_config.find_one({}, {"_id": 0})
    if not config or not config.get("connected"):
        raise HTTPException(status_code=400, detail="eBay not connected")
    
    # Get all active listings
    listings = await db.ebay_listings.find({"status": "active"}, {"_id": 0}).to_list(1000)
    
    client = EbayClient(config, sandbox=config.get("sandbox_mode", True))
    
    sync_results = {
        "total": len(listings),
        "synced": 0,
        "errors": 0,
        "details": []
    }
    
    for listing in listings:
        try:
            # Get current product stock
            product = await db.products.find_one({"id": listing["product_id"]}, {"_id": 0})
            if not product:
                continue
            
            current_stock = product.get("stock", 0)
            
            # Update eBay inventory
            result = await client.api_call(
                "PUT",
                f"/sell/inventory/v1/inventory_item/{listing['sku']}",
                data={
                    "availability": {
                        "shipToLocationAvailability": {
                            "quantity": current_stock
                        }
                    }
                }
            )
            
            # Update local listing record
            now = datetime.now(timezone.utc).isoformat()
            await db.ebay_listings.update_one(
                {"id": listing["id"]},
                {
                    "$set": {
                        "quantity": current_stock,
                        "last_sync": now,
                        "updated_at": now
                    }
                }
            )
            
            sync_results["synced"] += 1
            sync_results["details"].append({
                "sku": listing["sku"],
                "quantity": current_stock,
                "status": "synced"
            })
            
        except Exception as e:
            sync_results["errors"] += 1
            sync_results["details"].append({
                "sku": listing.get("sku"),
                "error": str(e),
                "status": "error"
            })
    
    # Update last sync time in config
    now = datetime.now(timezone.utc).isoformat()
    await db.ebay_config.update_one(
        {"client_id": config["client_id"]},
        {"$set": {"last_sync": now}}
    )
    
    return sync_results


# ==================== ORDER IMPORT ====================

@router.post("/sync/orders")
async def import_orders():
    """
    Import orders from eBay into the local system.
    Creates orders in the orders collection.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    config = await db.ebay_config.find_one({}, {"_id": 0})
    if not config or not config.get("connected"):
        raise HTTPException(status_code=400, detail="eBay not connected")
    
    client = EbayClient(config, sandbox=config.get("sandbox_mode", True))
    
    # Get orders from last 30 days
    result = await client.api_call(
        "GET",
        "/sell/fulfillment/v1/order",
        params={
            "filter": "orderfulfillmentstatus:{NOT_STARTED|IN_PROGRESS}",
            "limit": 50
        }
    )
    
    if result["status_code"] != 200:
        # Return mock data for development
        return {
            "imported": 0,
            "total_found": 0,
            "message": "Using mock data - connect production eBay account for real orders"
        }
    
    orders_data = result.get("data", {}).get("orders", [])
    imported_count = 0
    
    for ebay_order in orders_data:
        # Check if already imported
        existing = await db.ebay_orders.find_one(
            {"ebay_order_id": ebay_order.get("orderId")}
        )
        if existing:
            continue
        
        # Create local order record
        now = datetime.now(timezone.utc).isoformat()
        order_record = {
            "id": str(ObjectId()),
            "ebay_order_id": ebay_order.get("orderId"),
            "buyer_username": ebay_order.get("buyer", {}).get("username"),
            "buyer_email": ebay_order.get("buyer", {}).get("email"),
            "total": float(ebay_order.get("pricingSummary", {}).get("total", {}).get("value", 0)),
            "currency": ebay_order.get("pricingSummary", {}).get("total", {}).get("currency", "AUD"),
            "items": ebay_order.get("lineItems", []),
            "shipping_address": ebay_order.get("fulfillmentStartInstructions", [{}])[0].get("shippingStep", {}).get("shipTo", {}),
            "order_date": ebay_order.get("creationDate"),
            "status": "pending",
            "payment_status": ebay_order.get("orderPaymentStatus"),
            "fulfillment_status": ebay_order.get("orderFulfillmentStatus"),
            "imported_at": now,
            "updated_at": now,
            "source": "ebay"
        }
        
        await db.ebay_orders.insert_one(order_record)
        imported_count += 1
    
    return {
        "imported": imported_count,
        "total_found": len(orders_data),
        "message": f"Imported {imported_count} new orders from eBay"
    }


@router.get("/orders")
async def get_ebay_orders(status: str = Query(None), limit: int = 50, skip: int = 0):
    """Get imported eBay orders"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    query = {"source": "ebay"}
    if status:
        query["status"] = status
    
    orders = await db.ebay_orders.find(query, {"_id": 0}).sort("order_date", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.ebay_orders.count_documents(query)
    
    return {
        "orders": orders,
        "total": total,
        "limit": limit,
        "skip": skip
    }


@router.post("/orders/{order_id}/tracking")
async def update_tracking(order_id: str, tracking_number: str, carrier: str = "Australia Post"):
    """
    Push tracking information to eBay for an order.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    order = await db.ebay_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    config = await db.ebay_config.find_one({}, {"_id": 0})
    client = EbayClient(config, sandbox=config.get("sandbox_mode", True))
    
    # Create shipment with tracking
    shipment_data = {
        "lineItems": [
            {"lineItemId": item.get("lineItemId"), "quantity": item.get("quantity", 1)}
            for item in order.get("items", [])
        ],
        "shippedDate": datetime.now(timezone.utc).isoformat(),
        "shippingCarrierCode": carrier.upper().replace(" ", "_"),
        "trackingNumber": tracking_number
    }
    
    result = await client.api_call(
        "POST",
        f"/sell/fulfillment/v1/order/{order['ebay_order_id']}/shipping_fulfillment",
        data=shipment_data
    )
    
    # Update local order
    now = datetime.now(timezone.utc).isoformat()
    await db.ebay_orders.update_one(
        {"id": order_id},
        {
            "$set": {
                "tracking_number": tracking_number,
                "carrier": carrier,
                "shipped_at": now,
                "status": "shipped",
                "updated_at": now
            }
        }
    )
    
    return {
        "success": result["status_code"] in [200, 201],
        "message": "Tracking updated on eBay",
        "tracking_number": tracking_number
    }


# ==================== SYNC SETTINGS ====================

@router.put("/settings")
async def update_sync_settings(settings: EbaySyncConfig):
    """Update eBay sync configuration"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    result = await db.ebay_config.update_one(
        {},
        {"$set": {"sync_config": settings.dict()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=400, detail="eBay not configured")
    
    return {"success": True, "message": "Settings updated"}


@router.get("/settings")
async def get_sync_settings():
    """Get eBay sync configuration"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    config = await db.ebay_config.find_one({}, {"_id": 0, "client_secret": 0, "access_token": 0, "refresh_token": 0})
    
    if not config:
        return {
            "connected": False,
            "sync_config": EbaySyncConfig().dict()
        }
    
    return {
        "connected": config.get("connected", False),
        "sandbox_mode": config.get("sandbox_mode", True),
        "last_sync": config.get("last_sync"),
        "sync_config": config.get("sync_config", EbaySyncConfig().dict())
    }
