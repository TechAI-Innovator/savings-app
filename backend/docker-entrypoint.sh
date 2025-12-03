#!/bin/bash
set -e

echo "🚀 Starting Savings Backend..."

# Check if database tables exist, if not, create them
if [ -n "$DATABASE_URL" ]; then
    echo "🔄 Checking database..."
    python -c "
from app import app, db
with app.app_context():
    try:
        db.create_all()
        print('✅ Database tables verified/created')
    except Exception as e:
        print(f'⚠️  Database check failed: {e}')
" || echo "⚠️  Database initialization skipped"
fi

# Start the application
echo "🚀 Starting Gunicorn server..."
exec gunicorn --config gunicorn_config.py app:app

