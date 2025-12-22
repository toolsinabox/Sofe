"""
Authentication routes for login, register, and user management.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

from core.database import db
from core.auth import (
    verify_password, 
    get_password_hash, 
    create_access_token,
    get_current_active_user
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ==================== PYDANTIC MODELS ====================

class UserBase(BaseModel):
    email: str
    name: str = ""
    role: str = "merchant"


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class User(UserBase):
    id: str
    is_active: bool = True
    created_at: datetime = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


# ==================== AUTH ENDPOINTS ====================

@router.post("/login", response_model=Token)
async def login(login_data: UserLogin):
    """Login with email and password"""
    user = await db.users.find_one({"email": login_data.email})
    
    if not user or not verify_password(login_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password"
        )
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="User account is disabled")
    
    access_token = create_access_token(data={"sub": user["id"]})
    
    return Token(
        access_token=access_token,
        user={
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"]
        }
    )


@router.post("/register", response_model=Token)
async def register(user_data: UserCreate):
    """Register a new user"""
    import uuid
    
    # Check if user already exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    new_user = {
        "id": str(uuid.uuid4()),
        "email": user_data.email,
        "name": user_data.name,
        "role": user_data.role,
        "is_active": True,
        "hashed_password": get_password_hash(user_data.password),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(new_user)
    
    access_token = create_access_token(data={"sub": new_user["id"]})
    
    return Token(
        access_token=access_token,
        user={
            "id": new_user["id"],
            "email": new_user["email"],
            "name": new_user["name"],
            "role": new_user["role"]
        }
    )


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_active_user)):
    """Get current authenticated user"""
    return current_user


@router.post("/init-admin")
async def init_admin():
    """Initialize the default admin user - only works if no users exist"""
    import uuid
    
    user_count = await db.users.count_documents({})
    
    if user_count > 0:
        return {"message": "Admin user already exists", "initialized": False}
    
    # Create default admin user
    admin_user = {
        "id": str(uuid.uuid4()),
        "email": "eddie@toolsinabox.com.au",
        "name": "Eddie",
        "role": "admin",
        "is_active": True,
        "hashed_password": get_password_hash("Yealink1991%"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(admin_user)
    
    return {"message": "Admin user created successfully", "initialized": True, "email": admin_user["email"]}
