"""
Database initialization script for Savings System
Run this script to create tables and add the user with hashed password
"""
from app import app, db, DBUser, Transaction
from dotenv import load_dotenv

load_dotenv()

def init_database():
    """Initialize database tables and create default user"""
    with app.app_context():
        # Drop all tables (WARNING: This deletes all data!)
        print("Dropping existing tables...")
        db.drop_all()
        
        # Create all tables
        print("Creating database tables...")
        db.create_all()
        
        # Create the single user with hashed password
        print("Creating user...")
        user = DBUser()
        user.set_password('Omoadu07.')  # This will hash the password
        
        db.session.add(user)
        db.session.commit()
        
        print(f"✓ User created with ID: {user.id}")
        print(f"✓ Password hash: {user.password_hash}")
        print("\n✓ Database initialized successfully!")
        print("\n" + "="*60)
        print("DATABASE SETUP COMPLETE")
        print("="*60)
        print("\nYou can now:")
        print("  1. Start the backend server: python app.py")
        print("  2. Login with password: Omoadu07.")
        print("  3. Add transactions through the frontend")
        print("\nTables created:")
        print("  - users")
        print("  - transactions")
        print("="*60)

if __name__ == '__main__':
    print("\n" + "="*60)
    print("SAVINGS SYSTEM - DATABASE INITIALIZATION")
    print("="*60)
    print("\nWARNING: This will delete all existing data!")
    response = input("\nProceed with initialization? (yes/no): ")
    
    if response.lower() in ['yes', 'y']:
        init_database()
    else:
        print("\nInitialization cancelled.")

