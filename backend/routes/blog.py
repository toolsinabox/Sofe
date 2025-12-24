"""
Blog Routes - Blog/News content management for e-commerce platform
"""

from fastapi import APIRouter, HTTPException, Query, UploadFile, File
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os
import uuid
import re

router = APIRouter(prefix="/api/blog", tags=["Blog"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'maropost_clone')]


# ==================== BLOG MODELS ====================

class BlogCategory(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    slug: str
    description: Optional[str] = None
    parent_id: Optional[str] = None
    post_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BlogPost(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    slug: str
    excerpt: Optional[str] = None
    content: str
    featured_image: Optional[str] = None
    category_id: Optional[str] = None
    tags: List[str] = []
    author_name: str = "Admin"
    author_avatar: Optional[str] = None
    status: str = "draft"  # draft, published, scheduled, archived
    visibility: str = "public"  # public, private, password_protected
    password: Optional[str] = None
    allow_comments: bool = True
    featured: bool = False
    views: int = 0
    likes: int = 0
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    seo_keywords: List[str] = []
    published_at: Optional[datetime] = None
    scheduled_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None

class BlogComment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    post_id: str
    parent_id: Optional[str] = None
    author_name: str
    author_email: str
    content: str
    status: str = "pending"  # pending, approved, spam
    likes: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BlogPostCreate(BaseModel):
    title: str
    content: str
    excerpt: Optional[str] = None
    featured_image: Optional[str] = None
    category_id: Optional[str] = None
    tags: List[str] = []
    author_name: str = "Admin"
    status: str = "draft"
    visibility: str = "public"
    allow_comments: bool = True
    featured: bool = False
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    seo_keywords: List[str] = []
    scheduled_at: Optional[datetime] = None


def generate_slug(title: str) -> str:
    """Generate URL-friendly slug from title"""
    slug = title.lower()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s_-]+', '-', slug)
    slug = slug.strip('-')
    return slug


# ==================== CATEGORY ROUTES ====================

@router.get("/categories")
async def get_blog_categories():
    """Get all blog categories"""
    categories = await db.blog_categories.find({}, {"_id": 0}).to_list(100)
    return {"categories": categories}

@router.post("/categories")
async def create_blog_category(name: str, description: Optional[str] = None, parent_id: Optional[str] = None):
    """Create a new blog category"""
    category = BlogCategory(
        name=name,
        slug=generate_slug(name),
        description=description,
        parent_id=parent_id
    )
    await db.blog_categories.insert_one(category.dict())
    return category

@router.put("/categories/{category_id}")
async def update_blog_category(category_id: str, update: Dict[str, Any]):
    """Update a blog category"""
    if "name" in update:
        update["slug"] = generate_slug(update["name"])
    result = await db.blog_categories.update_one({"id": category_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return await db.blog_categories.find_one({"id": category_id}, {"_id": 0})

@router.delete("/categories/{category_id}")
async def delete_blog_category(category_id: str):
    """Delete a blog category"""
    # Move posts to uncategorized
    await db.blog_posts.update_many({"category_id": category_id}, {"$set": {"category_id": None}})
    result = await db.blog_categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"success": True}


# ==================== POST ROUTES ====================

@router.get("/posts")
async def get_blog_posts(
    status: Optional[str] = None,
    category_id: Optional[str] = None,
    featured: Optional[bool] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 20
):
    """Get all blog posts with filtering"""
    query = {}
    if status:
        query["status"] = status
    if category_id:
        query["category_id"] = category_id
    if featured is not None:
        query["featured"] = featured
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"content": {"$regex": search, "$options": "i"}},
            {"tags": {"$in": [search.lower()]}}
        ]
    
    posts = await db.blog_posts.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.blog_posts.count_documents(query)
    
    # Enrich with category names
    for post in posts:
        if post.get("category_id"):
            category = await db.blog_categories.find_one({"id": post["category_id"]}, {"_id": 0, "name": 1})
            post["category_name"] = category.get("name") if category else None
    
    return {"posts": posts, "total": total}

@router.get("/posts/published")
async def get_published_posts(
    category_id: Optional[str] = None,
    tag: Optional[str] = None,
    skip: int = 0,
    limit: int = 10
):
    """Get published blog posts for storefront"""
    query = {"status": "published", "visibility": "public"}
    if category_id:
        query["category_id"] = category_id
    if tag:
        query["tags"] = tag.lower()
    
    posts = await db.blog_posts.find(query, {"_id": 0}).sort("published_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.blog_posts.count_documents(query)
    
    return {"posts": posts, "total": total}

@router.get("/posts/{post_id}")
async def get_blog_post(post_id: str):
    """Get a specific blog post"""
    post = await db.blog_posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        # Try by slug
        post = await db.blog_posts.find_one({"slug": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Increment views
    await db.blog_posts.update_one({"id": post["id"]}, {"$inc": {"views": 1}})
    
    # Get comments
    comments = await db.blog_comments.find(
        {"post_id": post["id"], "status": "approved"}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    post["comments"] = comments
    
    return post

@router.post("/posts")
async def create_blog_post(post: BlogPostCreate):
    """Create a new blog post"""
    slug = generate_slug(post.title)
    
    # Ensure unique slug
    existing = await db.blog_posts.find_one({"slug": slug})
    if existing:
        slug = f"{slug}-{uuid.uuid4().hex[:6]}"
    
    new_post = BlogPost(
        **post.dict(),
        slug=slug,
        published_at=datetime.now(timezone.utc) if post.status == "published" else None
    )
    
    await db.blog_posts.insert_one(new_post.dict())
    
    # Update category post count
    if post.category_id:
        await db.blog_categories.update_one({"id": post.category_id}, {"$inc": {"post_count": 1}})
    
    return new_post

@router.put("/posts/{post_id}")
async def update_blog_post(post_id: str, update: Dict[str, Any]):
    """Update a blog post"""
    post = await db.blog_posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Handle status change to published
    if update.get("status") == "published" and post.get("status") != "published":
        update["published_at"] = datetime.now(timezone.utc).isoformat()
    
    # Update slug if title changed
    if "title" in update and update["title"] != post.get("title"):
        update["slug"] = generate_slug(update["title"])
    
    # Handle category change
    if "category_id" in update and update["category_id"] != post.get("category_id"):
        if post.get("category_id"):
            await db.blog_categories.update_one({"id": post["category_id"]}, {"$inc": {"post_count": -1}})
        if update["category_id"]:
            await db.blog_categories.update_one({"id": update["category_id"]}, {"$inc": {"post_count": 1}})
    
    await db.blog_posts.update_one({"id": post_id}, {"$set": update})
    return await db.blog_posts.find_one({"id": post_id}, {"_id": 0})

@router.delete("/posts/{post_id}")
async def delete_blog_post(post_id: str):
    """Delete a blog post"""
    post = await db.blog_posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Update category count
    if post.get("category_id"):
        await db.blog_categories.update_one({"id": post["category_id"]}, {"$inc": {"post_count": -1}})
    
    # Delete comments
    await db.blog_comments.delete_many({"post_id": post_id})
    
    result = await db.blog_posts.delete_one({"id": post_id})
    return {"success": True}

@router.post("/posts/{post_id}/like")
async def like_blog_post(post_id: str):
    """Like a blog post"""
    result = await db.blog_posts.update_one({"id": post_id}, {"$inc": {"likes": 1}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    return {"success": True}


# ==================== COMMENT ROUTES ====================

@router.get("/posts/{post_id}/comments")
async def get_post_comments(post_id: str, status: Optional[str] = None):
    """Get comments for a post"""
    query = {"post_id": post_id}
    if status:
        query["status"] = status
    
    comments = await db.blog_comments.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"comments": comments}

@router.post("/posts/{post_id}/comments")
async def add_post_comment(
    post_id: str,
    author_name: str,
    author_email: str,
    content: str,
    parent_id: Optional[str] = None
):
    """Add a comment to a post"""
    post = await db.blog_posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if not post.get("allow_comments", True):
        raise HTTPException(status_code=400, detail="Comments are disabled for this post")
    
    comment = BlogComment(
        post_id=post_id,
        parent_id=parent_id,
        author_name=author_name,
        author_email=author_email,
        content=content
    )
    
    await db.blog_comments.insert_one(comment.dict())
    return comment

@router.put("/comments/{comment_id}")
async def update_comment_status(comment_id: str, status: str):
    """Update comment status (approve/reject)"""
    result = await db.blog_comments.update_one({"id": comment_id}, {"$set": {"status": status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Comment not found")
    return {"success": True}

@router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str):
    """Delete a comment"""
    result = await db.blog_comments.delete_one({"id": comment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Comment not found")
    return {"success": True}


# ==================== TAGS ====================

@router.get("/tags")
async def get_all_tags():
    """Get all unique tags with counts"""
    posts = await db.blog_posts.find({"status": "published"}, {"_id": 0, "tags": 1}).to_list(10000)
    
    tag_counts = {}
    for post in posts:
        for tag in post.get("tags", []):
            tag_counts[tag] = tag_counts.get(tag, 0) + 1
    
    tags = [{"name": tag, "count": count} for tag, count in tag_counts.items()]
    tags.sort(key=lambda x: x["count"], reverse=True)
    
    return {"tags": tags}


# ==================== STATS ====================

@router.get("/stats")
async def get_blog_stats():
    """Get blog statistics"""
    total_posts = await db.blog_posts.count_documents({})
    published_posts = await db.blog_posts.count_documents({"status": "published"})
    draft_posts = await db.blog_posts.count_documents({"status": "draft"})
    total_views = 0
    total_comments = await db.blog_comments.count_documents({})
    pending_comments = await db.blog_comments.count_documents({"status": "pending"})
    
    posts = await db.blog_posts.find({}, {"_id": 0, "views": 1}).to_list(10000)
    total_views = sum(p.get("views", 0) for p in posts)
    
    return {
        "total_posts": total_posts,
        "published_posts": published_posts,
        "draft_posts": draft_posts,
        "total_views": total_views,
        "total_comments": total_comments,
        "pending_comments": pending_comments
    }
