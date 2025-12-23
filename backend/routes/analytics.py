"""
Analytics Routes - Comprehensive analytics and reporting for e-commerce platform
Includes: Sales Analytics, Customer Analytics, Inventory Reports, Export functionality
"""

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import os
import uuid
import io
import csv
import json

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'maropost_clone')]


# ==================== DASHBOARD KPIs ====================

@router.get("/dashboard")
async def get_dashboard_analytics(period: str = "30d"):
    """Get comprehensive dashboard KPIs"""
    
    # Calculate date range
    now = datetime.now(timezone.utc)
    if period == "7d":
        start_date = now - timedelta(days=7)
        prev_start = start_date - timedelta(days=7)
    elif period == "30d":
        start_date = now - timedelta(days=30)
        prev_start = start_date - timedelta(days=30)
    elif period == "90d":
        start_date = now - timedelta(days=90)
        prev_start = start_date - timedelta(days=90)
    elif period == "365d":
        start_date = now - timedelta(days=365)
        prev_start = start_date - timedelta(days=365)
    else:
        start_date = now - timedelta(days=30)
        prev_start = start_date - timedelta(days=30)
    
    # Current period metrics
    current_orders = await db.orders.find({
        "created_at": {"$gte": start_date.isoformat()}
    }).to_list(10000)
    
    prev_orders = await db.orders.find({
        "created_at": {"$gte": prev_start.isoformat(), "$lt": start_date.isoformat()}
    }).to_list(10000)
    
    # Calculate revenue
    current_revenue = sum(o.get("total", 0) for o in current_orders if o.get("status") not in ["cancelled", "refunded"])
    prev_revenue = sum(o.get("total", 0) for o in prev_orders if o.get("status") not in ["cancelled", "refunded"])
    
    # Calculate orders count
    current_count = len([o for o in current_orders if o.get("status") not in ["cancelled", "refunded"]])
    prev_count = len([o for o in prev_orders if o.get("status") not in ["cancelled", "refunded"]])
    
    # Average order value
    current_aov = current_revenue / current_count if current_count > 0 else 0
    prev_aov = prev_revenue / prev_count if prev_count > 0 else 0
    
    # Customers
    current_customers = await db.customers.count_documents({
        "created_at": {"$gte": start_date.isoformat()}
    })
    prev_customers = await db.customers.count_documents({
        "created_at": {"$gte": prev_start.isoformat(), "$lt": start_date.isoformat()}
    })
    
    # Products sold
    current_items = sum(sum(item.get("quantity", 0) for item in o.get("items", [])) for o in current_orders if o.get("status") not in ["cancelled", "refunded"])
    prev_items = sum(sum(item.get("quantity", 0) for item in o.get("items", [])) for o in prev_orders if o.get("status") not in ["cancelled", "refunded"])
    
    def calc_change(current, prev):
        if prev == 0:
            return 100 if current > 0 else 0
        return round(((current - prev) / prev) * 100, 1)
    
    return {
        "period": period,
        "kpis": {
            "revenue": {
                "value": round(current_revenue, 2),
                "change": calc_change(current_revenue, prev_revenue),
                "previous": round(prev_revenue, 2)
            },
            "orders": {
                "value": current_count,
                "change": calc_change(current_count, prev_count),
                "previous": prev_count
            },
            "average_order_value": {
                "value": round(current_aov, 2),
                "change": calc_change(current_aov, prev_aov),
                "previous": round(prev_aov, 2)
            },
            "new_customers": {
                "value": current_customers,
                "change": calc_change(current_customers, prev_customers),
                "previous": prev_customers
            },
            "items_sold": {
                "value": current_items,
                "change": calc_change(current_items, prev_items),
                "previous": prev_items
            }
        }
    }


@router.get("/sales/summary")
async def get_sales_summary(period: str = "30d"):
    """Get sales summary with trends"""
    now = datetime.now(timezone.utc)
    
    days = int(period.replace("d", "")) if period.endswith("d") else 30
    start_date = now - timedelta(days=days)
    
    # Daily sales
    daily_sales = []
    for i in range(days):
        day_start = start_date + timedelta(days=i)
        day_end = day_start + timedelta(days=1)
        
        orders = await db.orders.find({
            "created_at": {"$gte": day_start.isoformat(), "$lt": day_end.isoformat()},
            "status": {"$nin": ["cancelled", "refunded"]}
        }).to_list(1000)
        
        revenue = sum(o.get("total", 0) for o in orders)
        
        daily_sales.append({
            "date": day_start.strftime("%Y-%m-%d"),
            "revenue": round(revenue, 2),
            "orders": len(orders),
            "items": sum(sum(item.get("quantity", 0) for item in o.get("items", [])) for o in orders)
        })
    
    return {
        "period": period,
        "daily_sales": daily_sales,
        "total_revenue": sum(d["revenue"] for d in daily_sales),
        "total_orders": sum(d["orders"] for d in daily_sales),
        "total_items": sum(d["items"] for d in daily_sales)
    }


@router.get("/sales/by-category")
async def get_sales_by_category(period: str = "30d"):
    """Get sales breakdown by category"""
    now = datetime.now(timezone.utc)
    days = int(period.replace("d", "")) if period.endswith("d") else 30
    start_date = now - timedelta(days=days)
    
    orders = await db.orders.find({
        "created_at": {"$gte": start_date.isoformat()},
        "status": {"$nin": ["cancelled", "refunded"]}
    }).to_list(10000)
    
    # Aggregate by category
    category_sales = {}
    for order in orders:
        for item in order.get("items", []):
            product = await db.products.find_one({"id": item.get("product_id")}, {"_id": 0, "category": 1, "category_id": 1})
            cat_id = product.get("category_id") if product else "uncategorized"
            cat_name = product.get("category", "Uncategorized") if product else "Uncategorized"
            
            if cat_id not in category_sales:
                category_sales[cat_id] = {"category": cat_name, "revenue": 0, "quantity": 0, "orders": set()}
            
            category_sales[cat_id]["revenue"] += item.get("price", 0) * item.get("quantity", 1)
            category_sales[cat_id]["quantity"] += item.get("quantity", 1)
            category_sales[cat_id]["orders"].add(order.get("id"))
    
    # Format output
    result = []
    for cat_id, data in category_sales.items():
        result.append({
            "category_id": cat_id,
            "category": data["category"],
            "revenue": round(data["revenue"], 2),
            "quantity": data["quantity"],
            "orders": len(data["orders"])
        })
    
    result.sort(key=lambda x: x["revenue"], reverse=True)
    return {"categories": result}


@router.get("/sales/by-product")
async def get_sales_by_product(period: str = "30d", limit: int = 20):
    """Get top selling products"""
    now = datetime.now(timezone.utc)
    days = int(period.replace("d", "")) if period.endswith("d") else 30
    start_date = now - timedelta(days=days)
    
    orders = await db.orders.find({
        "created_at": {"$gte": start_date.isoformat()},
        "status": {"$nin": ["cancelled", "refunded"]}
    }).to_list(10000)
    
    # Aggregate by product
    product_sales = {}
    for order in orders:
        for item in order.get("items", []):
            prod_id = item.get("product_id")
            if prod_id not in product_sales:
                product_sales[prod_id] = {
                    "product_id": prod_id,
                    "name": item.get("name", "Unknown"),
                    "sku": item.get("sku", ""),
                    "revenue": 0,
                    "quantity": 0,
                    "orders": 0
                }
            
            product_sales[prod_id]["revenue"] += item.get("price", 0) * item.get("quantity", 1)
            product_sales[prod_id]["quantity"] += item.get("quantity", 1)
            product_sales[prod_id]["orders"] += 1
    
    # Sort and limit
    result = list(product_sales.values())
    result.sort(key=lambda x: x["revenue"], reverse=True)
    
    return {"products": result[:limit]}


@router.get("/sales/by-channel")
async def get_sales_by_channel(period: str = "30d"):
    """Get sales breakdown by channel (online, POS, etc.)"""
    now = datetime.now(timezone.utc)
    days = int(period.replace("d", "")) if period.endswith("d") else 30
    start_date = now - timedelta(days=days)
    
    orders = await db.orders.find({
        "created_at": {"$gte": start_date.isoformat()},
        "status": {"$nin": ["cancelled", "refunded"]}
    }).to_list(10000)
    
    channels = {}
    for order in orders:
        channel = order.get("channel", "online")
        if channel not in channels:
            channels[channel] = {"channel": channel, "revenue": 0, "orders": 0}
        channels[channel]["revenue"] += order.get("total", 0)
        channels[channel]["orders"] += 1
    
    return {"channels": list(channels.values())}


# ==================== CUSTOMER ANALYTICS ====================

@router.get("/customers/overview")
async def get_customer_overview(period: str = "30d"):
    """Get customer analytics overview"""
    now = datetime.now(timezone.utc)
    days = int(period.replace("d", "")) if period.endswith("d") else 30
    start_date = now - timedelta(days=days)
    
    # Total customers
    total_customers = await db.customers.count_documents({})
    new_customers = await db.customers.count_documents({"created_at": {"$gte": start_date.isoformat()}})
    
    # Returning vs new orders
    orders = await db.orders.find({
        "created_at": {"$gte": start_date.isoformat()},
        "status": {"$nin": ["cancelled", "refunded"]}
    }).to_list(10000)
    
    customer_orders = {}
    for order in orders:
        cust_id = order.get("customer_id") or order.get("customer_email", "guest")
        if cust_id not in customer_orders:
            customer_orders[cust_id] = []
        customer_orders[cust_id].append(order)
    
    # Count customers by order frequency
    one_time = len([c for c, o in customer_orders.items() if len(o) == 1])
    repeat = len([c for c, o in customer_orders.items() if len(o) > 1])
    
    # Calculate customer lifetime value (simple average)
    all_customers_orders = await db.orders.find({
        "status": {"$nin": ["cancelled", "refunded"]}
    }).to_list(100000)
    
    customer_totals = {}
    for order in all_customers_orders:
        cust_id = order.get("customer_id") or order.get("customer_email", "guest")
        if cust_id not in customer_totals:
            customer_totals[cust_id] = 0
        customer_totals[cust_id] += order.get("total", 0)
    
    avg_ltv = sum(customer_totals.values()) / len(customer_totals) if customer_totals else 0
    
    return {
        "total_customers": total_customers,
        "new_customers": new_customers,
        "one_time_buyers": one_time,
        "repeat_buyers": repeat,
        "average_lifetime_value": round(avg_ltv, 2),
        "repeat_rate": round((repeat / len(customer_orders)) * 100, 1) if customer_orders else 0
    }


@router.get("/customers/segments")
async def get_customer_segments():
    """Get customer segmentation data"""
    
    # Get all customers with their order history
    customers = await db.customers.find({}, {"_id": 0}).to_list(10000)
    
    segments = {
        "vip": {"name": "VIP", "count": 0, "revenue": 0, "criteria": "10+ orders or $1000+ spent"},
        "loyal": {"name": "Loyal", "count": 0, "revenue": 0, "criteria": "5-9 orders or $500-999 spent"},
        "regular": {"name": "Regular", "count": 0, "revenue": 0, "criteria": "2-4 orders"},
        "new": {"name": "New", "count": 0, "revenue": 0, "criteria": "1 order"},
        "at_risk": {"name": "At Risk", "count": 0, "revenue": 0, "criteria": "No orders in 90+ days"},
        "inactive": {"name": "Inactive", "count": 0, "revenue": 0, "criteria": "No orders in 180+ days"}
    }
    
    now = datetime.now(timezone.utc)
    
    for customer in customers:
        orders = await db.orders.find({
            "customer_id": customer.get("id"),
            "status": {"$nin": ["cancelled", "refunded"]}
        }).to_list(1000)
        
        total_spent = sum(o.get("total", 0) for o in orders)
        order_count = len(orders)
        
        # Get last order date
        last_order = None
        if orders:
            orders.sort(key=lambda x: x.get("created_at", ""), reverse=True)
            last_order = orders[0].get("created_at")
        
        days_since_order = 999
        if last_order:
            try:
                last_date = datetime.fromisoformat(last_order.replace("Z", "+00:00"))
                days_since_order = (now - last_date).days
            except:
                pass
        
        # Assign segment
        if order_count >= 10 or total_spent >= 1000:
            segment = "vip"
        elif order_count >= 5 or total_spent >= 500:
            segment = "loyal"
        elif order_count >= 2:
            segment = "regular"
        elif order_count == 1:
            if days_since_order >= 180:
                segment = "inactive"
            elif days_since_order >= 90:
                segment = "at_risk"
            else:
                segment = "new"
        else:
            segment = "inactive" if days_since_order >= 180 else "at_risk" if days_since_order >= 90 else "new"
        
        segments[segment]["count"] += 1
        segments[segment]["revenue"] += total_spent
    
    return {"segments": list(segments.values())}


@router.get("/customers/cohorts")
async def get_customer_cohorts(period: str = "monthly"):
    """Get customer cohort analysis"""
    
    # Get all customers grouped by signup month
    customers = await db.customers.find({}, {"_id": 0, "id": 1, "created_at": 1}).to_list(10000)
    
    cohorts = {}
    for customer in customers:
        try:
            created = datetime.fromisoformat(customer.get("created_at", "").replace("Z", "+00:00"))
            cohort_key = created.strftime("%Y-%m") if period == "monthly" else created.strftime("%Y-W%W")
            
            if cohort_key not in cohorts:
                cohorts[cohort_key] = {
                    "cohort": cohort_key,
                    "customers": 0,
                    "retained": {},
                    "revenue": {}
                }
            cohorts[cohort_key]["customers"] += 1
            
            # Get orders for this customer
            orders = await db.orders.find({
                "customer_id": customer["id"],
                "status": {"$nin": ["cancelled", "refunded"]}
            }).to_list(1000)
            
            for order in orders:
                order_date = datetime.fromisoformat(order.get("created_at", "").replace("Z", "+00:00"))
                months_diff = (order_date.year - created.year) * 12 + (order_date.month - created.month)
                
                if months_diff not in cohorts[cohort_key]["retained"]:
                    cohorts[cohort_key]["retained"][months_diff] = set()
                    cohorts[cohort_key]["revenue"][months_diff] = 0
                
                cohorts[cohort_key]["retained"][months_diff].add(customer["id"])
                cohorts[cohort_key]["revenue"][months_diff] += order.get("total", 0)
        except:
            continue
    
    # Format output
    result = []
    for cohort_key, data in sorted(cohorts.items(), reverse=True)[:12]:
        retention = {}
        for month, customers in data["retained"].items():
            retention[f"month_{month}"] = {
                "customers": len(customers),
                "rate": round((len(customers) / data["customers"]) * 100, 1) if data["customers"] > 0 else 0,
                "revenue": round(data["revenue"].get(month, 0), 2)
            }
        
        result.append({
            "cohort": cohort_key,
            "total_customers": data["customers"],
            "retention": retention
        })
    
    return {"cohorts": result}


@router.get("/customers/top")
async def get_top_customers(limit: int = 20, period: str = "all"):
    """Get top customers by revenue"""
    
    query = {"status": {"$nin": ["cancelled", "refunded"]}}
    if period != "all":
        days = int(period.replace("d", "")) if period.endswith("d") else 365
        start_date = datetime.now(timezone.utc) - timedelta(days=days)
        query["created_at"] = {"$gte": start_date.isoformat()}
    
    orders = await db.orders.find(query).to_list(100000)
    
    customer_data = {}
    for order in orders:
        cust_id = order.get("customer_id")
        if not cust_id:
            continue
        
        if cust_id not in customer_data:
            customer_data[cust_id] = {
                "customer_id": cust_id,
                "total_spent": 0,
                "order_count": 0,
                "avg_order_value": 0,
                "first_order": order.get("created_at"),
                "last_order": order.get("created_at")
            }
        
        customer_data[cust_id]["total_spent"] += order.get("total", 0)
        customer_data[cust_id]["order_count"] += 1
        
        if order.get("created_at", "") < customer_data[cust_id]["first_order"]:
            customer_data[cust_id]["first_order"] = order.get("created_at")
        if order.get("created_at", "") > customer_data[cust_id]["last_order"]:
            customer_data[cust_id]["last_order"] = order.get("created_at")
    
    # Calculate averages and get customer info
    result = []
    for cust_id, data in customer_data.items():
        data["avg_order_value"] = round(data["total_spent"] / data["order_count"], 2) if data["order_count"] > 0 else 0
        data["total_spent"] = round(data["total_spent"], 2)
        
        customer = await db.customers.find_one({"id": cust_id}, {"_id": 0, "name": 1, "email": 1})
        if customer:
            data["name"] = customer.get("name")
            data["email"] = customer.get("email")
        
        result.append(data)
    
    result.sort(key=lambda x: x["total_spent"], reverse=True)
    return {"customers": result[:limit]}


# ==================== INVENTORY ANALYTICS ====================

@router.get("/inventory/overview")
async def get_inventory_overview():
    """Get inventory overview and alerts"""
    
    products = await db.products.find({}, {"_id": 0}).to_list(10000)
    
    total_products = len(products)
    total_stock = sum(p.get("stock", 0) for p in products)
    total_value = sum(p.get("stock", 0) * p.get("cost", p.get("price", 0)) for p in products)
    
    # Stock levels
    out_of_stock = [p for p in products if p.get("stock", 0) <= 0]
    low_stock = [p for p in products if 0 < p.get("stock", 0) <= p.get("low_stock_threshold", 10)]
    overstocked = [p for p in products if p.get("stock", 0) > p.get("overstock_threshold", 100)]
    
    return {
        "total_products": total_products,
        "total_stock_units": total_stock,
        "total_stock_value": round(total_value, 2),
        "out_of_stock_count": len(out_of_stock),
        "low_stock_count": len(low_stock),
        "overstocked_count": len(overstocked),
        "out_of_stock": [{"id": p["id"], "name": p.get("name"), "sku": p.get("sku")} for p in out_of_stock[:10]],
        "low_stock": [{"id": p["id"], "name": p.get("name"), "sku": p.get("sku"), "stock": p.get("stock", 0)} for p in low_stock[:10]]
    }


@router.get("/inventory/turnover")
async def get_inventory_turnover(period: str = "30d"):
    """Get inventory turnover analysis"""
    
    now = datetime.now(timezone.utc)
    days = int(period.replace("d", "")) if period.endswith("d") else 30
    start_date = now - timedelta(days=days)
    
    products = await db.products.find({}, {"_id": 0}).to_list(10000)
    orders = await db.orders.find({
        "created_at": {"$gte": start_date.isoformat()},
        "status": {"$nin": ["cancelled", "refunded"]}
    }).to_list(10000)
    
    # Calculate units sold per product
    units_sold = {}
    for order in orders:
        for item in order.get("items", []):
            prod_id = item.get("product_id")
            if prod_id not in units_sold:
                units_sold[prod_id] = 0
            units_sold[prod_id] += item.get("quantity", 1)
    
    # Calculate turnover
    result = []
    for product in products:
        prod_id = product.get("id")
        sold = units_sold.get(prod_id, 0)
        stock = product.get("stock", 0)
        avg_stock = (stock + sold) / 2 if (stock + sold) > 0 else 1  # Simple average
        
        turnover_rate = sold / avg_stock if avg_stock > 0 else 0
        days_of_stock = stock / (sold / days) if sold > 0 else 999
        
        result.append({
            "product_id": prod_id,
            "name": product.get("name"),
            "sku": product.get("sku"),
            "current_stock": stock,
            "units_sold": sold,
            "turnover_rate": round(turnover_rate, 2),
            "days_of_stock": round(min(days_of_stock, 999), 0),
            "status": "healthy" if 30 <= days_of_stock <= 90 else "low" if days_of_stock < 30 else "excess"
        })
    
    result.sort(key=lambda x: x["units_sold"], reverse=True)
    return {"products": result}


@router.get("/inventory/reorder-suggestions")
async def get_reorder_suggestions():
    """Get product reorder suggestions based on sales velocity"""
    
    # Get last 30 days of sales
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=30)
    
    orders = await db.orders.find({
        "created_at": {"$gte": start_date.isoformat()},
        "status": {"$nin": ["cancelled", "refunded"]}
    }).to_list(10000)
    
    # Calculate daily sales rate
    sales_rate = {}
    for order in orders:
        for item in order.get("items", []):
            prod_id = item.get("product_id")
            if prod_id not in sales_rate:
                sales_rate[prod_id] = 0
            sales_rate[prod_id] += item.get("quantity", 1)
    
    # Get products and calculate reorder needs
    products = await db.products.find({}, {"_id": 0}).to_list(10000)
    suggestions = []
    
    for product in products:
        prod_id = product.get("id")
        sold_30d = sales_rate.get(prod_id, 0)
        daily_rate = sold_30d / 30
        current_stock = product.get("stock", 0)
        lead_time = product.get("lead_time_days", 7)
        safety_stock = product.get("safety_stock", 5)
        
        # Calculate reorder point
        reorder_point = (daily_rate * lead_time) + safety_stock
        suggested_qty = max(0, int((daily_rate * 30) - current_stock + safety_stock))  # 30 days of stock
        
        if current_stock <= reorder_point and suggested_qty > 0:
            suggestions.append({
                "product_id": prod_id,
                "name": product.get("name"),
                "sku": product.get("sku"),
                "current_stock": current_stock,
                "reorder_point": round(reorder_point, 0),
                "daily_sales_rate": round(daily_rate, 2),
                "suggested_quantity": suggested_qty,
                "urgency": "critical" if current_stock <= 0 else "high" if current_stock <= safety_stock else "medium"
            })
    
    suggestions.sort(key=lambda x: {"critical": 0, "high": 1, "medium": 2}.get(x["urgency"], 3))
    return {"suggestions": suggestions}


# ==================== EXPORT FUNCTIONALITY ====================

@router.get("/export/sales")
async def export_sales_report(period: str = "30d", format: str = "csv"):
    """Export sales report"""
    
    now = datetime.now(timezone.utc)
    days = int(period.replace("d", "")) if period.endswith("d") else 30
    start_date = now - timedelta(days=days)
    
    orders = await db.orders.find({
        "created_at": {"$gte": start_date.isoformat()},
        "status": {"$nin": ["cancelled", "refunded"]}
    }, {"_id": 0}).sort("created_at", -1).to_list(100000)
    
    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Order ID", "Date", "Customer", "Email", "Items", "Subtotal", "Shipping", "Tax", "Total", "Status", "Channel"])
        
        for order in orders:
            writer.writerow([
                order.get("order_number", order.get("id")),
                order.get("created_at", "")[:10],
                order.get("customer_name", ""),
                order.get("customer_email", ""),
                len(order.get("items", [])),
                order.get("subtotal", 0),
                order.get("shipping_cost", 0),
                order.get("tax", 0),
                order.get("total", 0),
                order.get("status", ""),
                order.get("channel", "online")
            ])
        
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=sales_report_{period}.csv"}
        )
    else:
        return {"orders": orders}


@router.get("/export/customers")
async def export_customers_report(format: str = "csv"):
    """Export customers report"""
    
    customers = await db.customers.find({}, {"_id": 0}).to_list(100000)
    
    # Enrich with order data
    for customer in customers:
        orders = await db.orders.find({
            "customer_id": customer.get("id"),
            "status": {"$nin": ["cancelled", "refunded"]}
        }).to_list(1000)
        
        customer["order_count"] = len(orders)
        customer["total_spent"] = sum(o.get("total", 0) for o in orders)
        customer["last_order"] = max([o.get("created_at", "") for o in orders]) if orders else ""
    
    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Customer ID", "Name", "Email", "Phone", "Orders", "Total Spent", "Last Order", "Created At"])
        
        for customer in customers:
            writer.writerow([
                customer.get("id"),
                customer.get("name", ""),
                customer.get("email", ""),
                customer.get("phone", ""),
                customer.get("order_count", 0),
                round(customer.get("total_spent", 0), 2),
                customer.get("last_order", "")[:10] if customer.get("last_order") else "",
                customer.get("created_at", "")[:10] if customer.get("created_at") else ""
            ])
        
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=customers_report.csv"}
        )
    else:
        return {"customers": customers}


@router.get("/export/inventory")
async def export_inventory_report(format: str = "csv"):
    """Export inventory report"""
    
    products = await db.products.find({}, {"_id": 0}).to_list(100000)
    
    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["SKU", "Name", "Category", "Stock", "Cost", "Price", "Stock Value", "Status"])
        
        for product in products:
            stock = product.get("stock", 0)
            cost = product.get("cost", product.get("price", 0))
            status = "In Stock" if stock > 10 else "Low Stock" if stock > 0 else "Out of Stock"
            
            writer.writerow([
                product.get("sku", ""),
                product.get("name", ""),
                product.get("category", ""),
                stock,
                cost,
                product.get("price", 0),
                round(stock * cost, 2),
                status
            ])
        
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=inventory_report.csv"}
        )
    else:
        return {"products": products}
