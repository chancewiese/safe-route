# api/database.py
# Database configuration that reads from root .env files

# This file will:
# - Import configuration from root .env files (not local api/.env)
# - Use python-dotenv to load environment variables from parent directory
# - Create SQLAlchemy engine with settings from root configuration
# - Handle both development and production database connections

# Example structure:
# from pathlib import Path
# from dotenv import load_dotenv
# 
# # Load .env from root directory
# root_dir = Path(__file__).parent.parent
# env_file = ".env.production" if os.getenv("ENVIRONMENT") == "production" else ".env"
# load_dotenv(root_dir / env_file)
#
# # Then use DATABASE_URL from your root .env files
# DATABASE_URL = os.getenv("DATABASE_URL")

# This approach keeps all your environment configuration centralized
# in your existing root .env files rather than duplicating them