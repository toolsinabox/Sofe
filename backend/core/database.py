"""
Database connection and shared dependencies for the application.
"""
from motor.motor_asyncio import AsyncIOMotorClient
import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Directory paths
UPLOADS_DIR = ROOT_DIR / "uploads"
THEME_DIR = ROOT_DIR / "theme"
THEMES_DIR = ROOT_DIR / "themes"
