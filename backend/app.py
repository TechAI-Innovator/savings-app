from flask import Flask, request, jsonify, session
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import os
import logging
from datetime import timedelta, datetime
from decimal import Decimal, InvalidOperation
from dotenv import load_dotenv



load_dotenv()

# Configure logging (StreamHandler only for Vercel serverless compatibility)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()  # Only StreamHandler - Vercel filesystem is read-only
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Get environment configuration
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-this-in-production')
ENV = os.environ.get('FLASK_ENV', 'development')

# Detect production: Render sets RENDER=true, or check FLASK_ENV
is_production = (
    os.environ.get('RENDER') == 'true' or 
    os.environ.get('VERCEL_ENV') == 'production' or 
    ENV == 'production'
)

# Flask configuration
app.config['SECRET_KEY'] = SECRET_KEY
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(minutes=5)  # 5 minute session timeout

# Session cookie configuration (Flask default sessions with cookies)
if is_production:
    # Production: Cross-domain cookies (Vercel frontend + Render backend)
    app.config['SESSION_COOKIE_SAMESITE'] = 'None'
    app.config['SESSION_COOKIE_SECURE'] = True
    logger.info("🔒 Production mode: Using secure cross-domain cookies (SameSite=None, Secure=True)")
else:
    # Development: Same-domain cookies (localhost)
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
    app.config['SESSION_COOKIE_SECURE'] = False
    logger.info("🔧 Development mode: Using standard cookies (SameSite=Lax)")

app.config['SESSION_COOKIE_HTTPONLY'] = True  # Prevent JavaScript access
app.config['SESSION_COOKIE_DOMAIN'] = None  # Allow cross-origin cookies
app.config['SESSION_COOKIE_PATH'] = '/'  # Ensure cookie is set for all paths

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize database
db = SQLAlchemy(app)

# Create models with db instance
from models import create_models
DBUser, Transaction = create_models(db)

# API Configuration
API_BASE_PATH = os.environ.get('API_BASE_PATH', '/api')
ENDPOINT_AUTH_VERIFY = os.environ.get('ENDPOINT_AUTH_VERIFY', '/auth/verify')
ENDPOINT_AUTH_LOGOUT = os.environ.get('ENDPOINT_AUTH_LOGOUT', '/auth/logout')
ENDPOINT_AUTH_STATUS = os.environ.get('ENDPOINT_AUTH_STATUS', '/auth/status')
ENDPOINT_ACCOUNT_UPDATE = os.environ.get('ENDPOINT_ACCOUNT_UPDATE', '/account/update')
ENDPOINT_ACCOUNT_HISTORY = os.environ.get('ENDPOINT_ACCOUNT_HISTORY', '/account/history')
ENDPOINT_HEALTH = os.environ.get('ENDPOINT_HEALTH', '/health')

# Initialize Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.session_protection = "strong"

# Enable CORS for frontend (with Safari/iOS compatibility)
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:8080')
CORS(
    app, 
    supports_credentials=True, 
    origins=[FRONTEND_URL, 'http://localhost:8080'],
    allow_headers=['Content-Type', 'Authorization', 'X-Requested-With'],
    methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    expose_headers=['Set-Cookie']
)

# Flask-Login User wrapper
class UserSession(UserMixin):
    def __init__(self, id):
        self.id = id

@login_manager.user_loader
def load_user(user_id):
    """Load user from database for Flask-Login"""
    user = DBUser.query.get(int(user_id))
    if user:
        return UserSession(user.id)
    return None

@login_manager.unauthorized_handler
def unauthorized():
    """Handle unauthorized access attempts"""
    logger.warning(f"Unauthorized access attempt from {request.remote_addr} to {request.path}")
    return jsonify({
        'success': False,
        'message': 'Authentication required. Please log in.',
        'error': 'unauthorized'
    }), 401

# Request logging middleware
@app.before_request
def log_request_info():
    """Log incoming requests"""
    logger.info(f"Request: {request.method} {request.path} from {request.remote_addr}")
    if request.is_json and request.get_data():
        try:
            logger.debug(f"Request body: {request.get_json()}")
        except Exception as e:
            logger.debug(f"Could not parse JSON body: {e}")

@app.after_request
def after_request(response):
    """Add CORS headers and log responses (Safari/iOS compatibility)"""
    logger.info(f"Response: {response.status_code} for {request.method} {request.path}")
    
    # Get the origin from the request
    origin = request.headers.get('Origin')
    
    # Add explicit CORS headers for Safari/iOS compatibility
    if origin and (origin == FRONTEND_URL or origin == 'http://localhost:8080'):
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
        response.headers['Access-Control-Expose-Headers'] = 'Set-Cookie'
        
        # Safari requires explicit Vary header
        response.headers['Vary'] = 'Origin, Cookie'
    
    return response

@app.route(f'{API_BASE_PATH}{ENDPOINT_AUTH_VERIFY}', methods=['POST'])
def verify_password():
    """Verify user password and create session"""
    try:
        data = request.get_json()
        password = data.get('password', '')
        
        logger.info(f"Login attempt from IP: {request.remote_addr}")
        logger.debug(f"Password length: {len(password)} characters")
        
        # Get the first (and only) user from database (ID = 1)
        logger.debug("Querying database for user ID 1")
        user = DBUser.query.get(1)
        
        if not user:
            logger.error("No user found in database - user ID 1 does not exist")
            return jsonify({
                'success': False,
                'message': 'Authentication failed'
            }), 401
        
        logger.debug(f"User found: ID={user.id}, checking password hash")
        # Check password against hash
        if user.check_password(password):
            # Create user session
            user_session = UserSession(user.id)
            login_user(user_session, remember=True)
            session.permanent = True
            try:
                logger.debug(f"Session SID type: {type(session.sid)} value: {session.sid}")
            except AttributeError:
                logger.debug("Session SID not set yet")
            
            logger.info(f"Authentication successful for user {user.id}")
            logger.debug(f"Session created with remember=True, permanent={session.permanent}")
            return jsonify({
                'success': True,
                'message': 'Authentication successful'
            }), 200
        else:
            logger.warning(f"Authentication failed - invalid password for user {user.id}")
            return jsonify({
                'success': False,
                'message': 'Invalid password'
            }), 401
            
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Server error occurred'
        }), 500

@app.route(f'{API_BASE_PATH}{ENDPOINT_AUTH_LOGOUT}', methods=['POST'])
@login_required
def logout():
    """Logout user and clear session"""
    try:
        user_id = current_user.id
        logger.info(f"Logout request from user {user_id}")
        
        logout_user()
        session.clear()
        
        logger.info(f"User {user_id} logged out successfully - session cleared")
        return jsonify({
            'success': True,
            'message': 'Logged out successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Logout error: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Logout error occurred'
        }), 500

@app.route(f'{API_BASE_PATH}{ENDPOINT_AUTH_STATUS}', methods=['GET'])
def auth_status():
    """Check authentication status"""
    try:
        if current_user.is_authenticated:
            logger.debug(f"Auth status check - User {current_user.id} is authenticated")
            return jsonify({
                'authenticated': True,
                'user_id': current_user.id
            }), 200
        else:
            logger.debug("Auth status check - User not authenticated")
            return jsonify({
                'authenticated': False
            }), 200
            
    except Exception as e:
        logger.error(f"Auth status check error: {str(e)}")
        return jsonify({
            'authenticated': False,
            'error': 'Status check failed'
        }), 500

@app.route(f'{API_BASE_PATH}{ENDPOINT_ACCOUNT_UPDATE}', methods=['POST'])
@login_required
def update_account():
    """Update user account information and save transaction"""
    try:
        data = request.get_json()
        logger.info(f"Account update request from user {current_user.id}")
        logger.debug(f"Request data: {data}")
        
        # Extract account data
        account_name = data.get('accountName', '')
        amount_str = data.get('amount', '')
        note = data.get('note', '')
        date_time_str = data.get('dateTime', '')
        transaction_type = data.get('transactionType', 'add')  # 'add' or 'subtract'
        
        logger.debug(f"Extracted data - Account: {account_name}, Amount: {amount_str}, Type: {transaction_type}")
        
        # Validate required fields
        if not account_name or not amount_str:
            logger.warning(f"Validation failed - missing required fields: account_name={bool(account_name)}, amount={bool(amount_str)}")
            return jsonify({
                'success': False,
                'message': 'Account name and amount are required'
            }), 400
        
        # Clean and convert amount (remove commas, convert to Decimal)
        try:
            amount_cleaned = amount_str.replace(',', '')
            amount_decimal = Decimal(amount_cleaned)
            logger.debug(f"Amount conversion: {amount_str} -> {amount_cleaned} -> {amount_decimal}")
            if amount_decimal <= 0:
                logger.warning(f"Invalid amount: {amount_decimal} (must be > 0)")
                return jsonify({
                    'success': False,
                    'message': 'Amount must be greater than zero'
                }), 400
        except (ValueError, InvalidOperation) as e:
            logger.error(f"Amount conversion error: {str(e)}")
            return jsonify({
                'success': False,
                'message': 'Invalid amount format'
            }), 400
        
        # Parse transaction date
        try:
            if date_time_str:
                transaction_date = datetime.fromisoformat(date_time_str.replace('Z', '+00:00'))
                logger.debug(f"Parsed date from input: {transaction_date}")
            else:
                transaction_date = datetime.now()
                logger.debug(f"Using current date: {transaction_date}")
        except ValueError as e:
            logger.warning(f"Date parsing error: {str(e)}, using current date")
            transaction_date = datetime.now()
        
        # Create new transaction
        logger.debug(f"Creating transaction object for user {current_user.id}")
        new_transaction = Transaction(
            user_id=current_user.id,
            account_name=account_name,
            transaction_type=transaction_type,
            amount=amount_decimal,
            note=note,
            transaction_date=transaction_date
        )
        
        # Save to database
        logger.debug("Adding transaction to database session")
        db.session.add(new_transaction)
        logger.debug("Committing transaction to database")
        db.session.commit()
        logger.info(f"Transaction successfully saved to database with ID: {new_transaction.id}")
        
        # Calculate new balance for this account
        logger.debug(f"Calculating new balance for account: {account_name}")
        new_balance = Transaction.get_balance_for_account(current_user.id, account_name)
        
        logger.info(f"Transaction completed for user {current_user.id}")
        logger.info(f"Account: {account_name}, Type: {transaction_type}, Amount: {amount_decimal}, New Balance: {new_balance}")
        
        return jsonify({
            'success': True,
            'message': f'Money {"added to" if transaction_type == "add" else "subtracted from"} {account_name} successfully',
            'data': {
                'accountName': account_name,
                'amount': float(amount_decimal),
                'transactionType': transaction_type,
                'note': note,
                'dateTime': transaction_date.isoformat(),
                'newBalance': float(new_balance)
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Account update error: {str(e)}", exc_info=True)
        db.session.rollback()
        logger.info("Database transaction rolled back due to error")
        return jsonify({
            'success': False,
            'message': 'Failed to update account'
        }), 500

@app.route(f'{API_BASE_PATH}{ENDPOINT_ACCOUNT_HISTORY}', methods=['GET'])
@login_required
def get_history():
    """Get transaction history and balances"""
    try:
        # Get optional query parameters
        account_name = request.args.get('account', None)
        limit = request.args.get('limit', 50, type=int)
        
        logger.info(f"History request from user {current_user.id}")
        logger.debug(f"Query parameters - account: {account_name}, limit: {limit}")
        
        # Get transaction history
        logger.debug(f"Fetching transaction history for user {current_user.id}")
        transactions = Transaction.get_transaction_history(
            user_id=current_user.id,
            account_name=account_name,
            limit=limit
        )
        logger.debug(f"Found {len(transactions)} transactions")
        
        # Get balances for all accounts
        logger.debug("Fetching account balances")
        account_balances = Transaction.get_account_balances(current_user.id)
        logger.debug(f"Account balances: {account_balances}")
        
        # Get total balance
        logger.debug("Calculating total balance")
        total_balance = Transaction.get_total_balance(current_user.id)
        logger.debug(f"Total balance: {total_balance}")
        
        # Convert transactions to dictionaries
        logger.debug("Converting transactions to dictionaries")
        transactions_data = [t.to_dict() for t in transactions]
        
        # Convert Decimal balances to float for JSON
        balances_data = {account: float(balance) for account, balance in account_balances.items()}
        
        logger.info(f"History fetched for user {current_user.id} - {len(transactions_data)} transactions, {len(balances_data)} accounts")
        
        return jsonify({
            'success': True,
            'data': {
                'transactions': transactions_data,
                'accountBalances': balances_data,
                'totalBalance': float(total_balance)
            }
        }), 200
        
    except Exception as e:
        logger.error(f"History fetch error: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to fetch history'
        }), 500

@app.route(f'{API_BASE_PATH}{ENDPOINT_HEALTH}', methods=['GET'])
def health_check():
    """Health check endpoint"""
    logger.debug("Health check requested")
    return jsonify({
        'status': 'healthy',
        'message': 'Backend is running'
    }), 200

# Database keep-alive to prevent Neon cold starts
def keep_db_alive():
    """
    Ping the database every 4 minutes to prevent Neon DB hibernation.
    Neon free tier hibernates after ~5 minutes of inactivity.
    """
    with app.app_context():
        try:
            # Simple lightweight query to keep connection alive
            result = db.session.execute(db.text("SELECT 1")).scalar()
            logger.debug(f"✅ Database keep-alive ping successful (result: {result})")
        except Exception as e:
            logger.error(f"❌ Database keep-alive ping failed: {str(e)}", exc_info=True)

# Initialize background scheduler for database keep-alive
from apscheduler.schedulers.background import BackgroundScheduler

scheduler = BackgroundScheduler()

def init_scheduler():
    """Initialize scheduled jobs with Flask app context."""
    if not scheduler.running:
        # Ping database every 4 minutes (Neon sleeps after ~5 minutes)
        scheduler.add_job(keep_db_alive, 'interval', minutes=4, id='keep_db_alive')
        scheduler.start()
        logger.info("✅ Database keep-alive scheduler started (pinging every 4 minutes)")
        
        # Initial ping immediately on startup
        logger.info("🔄 Running initial database ping...")
        keep_db_alive()

# Start scheduler when app initializes
init_scheduler()

# Graceful shutdown
import atexit
atexit.register(lambda: scheduler.shutdown() if scheduler.running else None)

if __name__ == '__main__':
    PORT = int(os.environ.get('BACKEND_PORT', 5001))
    HOST = os.environ.get('BACKEND_HOST', '0.0.0.0')
    DEBUG = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'
    
    logger.info("Starting Savings System Backend Server")
    logger.info(f"Server will run on http://{HOST}:{PORT}")
    logger.info(f"Allowed CORS origin: {FRONTEND_URL}")
    app.run(debug=DEBUG, host=HOST, port=PORT)
