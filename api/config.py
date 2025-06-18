# api/config.py
# Configuration file to read environment variables from root .env files

import os
from pathlib import Path

# Load environment variables from root .env files
def load_env_vars():
    """Load environment variables from root directory .env files"""
    
    # Get the root directory (parent of api directory)
    root_dir = Path(__file__).parent.parent
    
    # Determine which env file to load based on environment
    env_file = ".env.production" if os.getenv("ENVIRONMENT") == "production" else ".env"
    env_path = root_dir / env_file
    
    # This would use python-dotenv to load the file
    # from dotenv import load_dotenv
    # load_dotenv(env_path)
    
    # For now, just document what will be read:
    return {
        "database_url": os.getenv("DATABASE_URL"),
        "db_host": os.getenv("DB_HOST"),
        "db_port": os.getenv("DB_PORT"),
        "db_name": os.getenv("DB_NAME"),
        "db_user": os.getenv("DB_USER"),
        "db_password": os.getenv("DB_PASSWORD"),
    }

# Database configuration class
class DatabaseConfig:
    """Database configuration loaded from environment variables"""
    
    def __init__(self):
        # Load from root .env files
        # In implementation, this will read from your root .env files
        self.database_url = os.getenv("DATABASE_URL", "postgresql://localhost/saferoute_db")
        self.pool_size = int(os.getenv("DB_POOL_SIZE", "5"))
        self.max_overflow = int(os.getenv("DB_MAX_OVERFLOW", "10"))
        self.pool_timeout = int(os.getenv("DB_POOL_TIMEOUT", "30"))
        self.ssl_mode = os.getenv("DB_SSL_MODE", "prefer")