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

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key-change-this-in-production')
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(minutes=30)  # 30 minute session timeout

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

# Enable CORS for frontend
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:8080')
CORS(app, supports_credentials=True, origins=[FRONTEND_URL, 'http://localhost:3000'])

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

@app.route(f'{API_BASE_PATH}{ENDPOINT_AUTH_VERIFY}', methods=['POST'])
def verify_password():
    """Verify user password and create session"""
    try:
        data = request.get_json()
        password = data.get('password', '')
        
        logger.info(f"Login attempt from IP: {request.remote_addr}")
        
        # Get the first (and only) user from database (ID = 1)
        user = DBUser.query.get(1)
        
        if not user:
            logger.error("No user found in database")
            return jsonify({
                'success': False,
                'message': 'Authentication failed'
            }), 401
        
        # Check password against hash
        if user.check_password(password):
            # Create user session
            user_session = UserSession(user.id)
            login_user(user_session, remember=True)
            session.permanent = True
            
            logger.info("Authentication successful")
            return jsonify({
                'success': True,
                'message': 'Authentication successful'
            }), 200
        else:
            logger.warning("Authentication failed - invalid password")
            return jsonify({
                'success': False,
                'message': 'Invalid password'
            }), 401
            
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
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
        logout_user()
        session.clear()
        
        logger.info(f"User {user_id} logged out successfully")
        return jsonify({
            'success': True,
            'message': 'Logged out successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Logout error: {str(e)}")
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
        
        # Extract account data
        account_name = data.get('accountName', '')
        amount_str = data.get('amount', '')
        note = data.get('note', '')
        date_time_str = data.get('dateTime', '')
        transaction_type = data.get('transactionType', 'add')  # 'add' or 'subtract'
        
        # Validate required fields
        if not account_name or not amount_str:
            return jsonify({
                'success': False,
                'message': 'Account name and amount are required'
            }), 400
        
        # Clean and convert amount (remove commas, convert to Decimal)
        try:
            amount_cleaned = amount_str.replace(',', '')
            amount_decimal = Decimal(amount_cleaned)
            if amount_decimal <= 0:
                return jsonify({
                    'success': False,
                    'message': 'Amount must be greater than zero'
                }), 400
        except (ValueError, InvalidOperation):
            return jsonify({
                'success': False,
                'message': 'Invalid amount format'
            }), 400
        
        # Parse transaction date
        try:
            if date_time_str:
                transaction_date = datetime.fromisoformat(date_time_str.replace('Z', '+00:00'))
            else:
                transaction_date = datetime.now()
        except ValueError:
            transaction_date = datetime.now()
        
        # Create new transaction
        new_transaction = Transaction(
            user_id=current_user.id,
            account_name=account_name,
            transaction_type=transaction_type,
            amount=amount_decimal,
            note=note,
            transaction_date=transaction_date
        )
        
        # Save to database
        db.session.add(new_transaction)
        db.session.commit()
        
        # Calculate new balance for this account
        new_balance = Transaction.get_balance_for_account(current_user.id, account_name)
        
        logger.info(f"Transaction saved for user {current_user.id}")
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
        db.session.rollback()
        logger.error(f"Account update error: {str(e)}")
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
        
        # Get transaction history
        transactions = Transaction.get_transaction_history(
            user_id=current_user.id,
            account_name=account_name,
            limit=limit
        )
        
        # Get balances for all accounts
        account_balances = Transaction.get_account_balances(current_user.id)
        
        # Get total balance
        total_balance = Transaction.get_total_balance(current_user.id)
        
        # Convert transactions to dictionaries
        transactions_data = [t.to_dict() for t in transactions]
        
        # Convert Decimal balances to float for JSON
        balances_data = {account: float(balance) for account, balance in account_balances.items()}
        
        logger.info(f"History fetched for user {current_user.id} - {len(transactions_data)} transactions")
        
        return jsonify({
            'success': True,
            'data': {
                'transactions': transactions_data,
                'accountBalances': balances_data,
                'totalBalance': float(total_balance)
            }
        }), 200
        
    except Exception as e:
        logger.error(f"History fetch error: {str(e)}")
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

if __name__ == '__main__':
    PORT = int(os.environ.get('BACKEND_PORT', 5000))
    HOST = os.environ.get('BACKEND_HOST', '0.0.0.0')
    DEBUG = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'
    
    logger.info("Starting Savings System Backend Server")
    logger.info(f"Server will run on http://{HOST}:{PORT}")
    logger.info(f"Allowed CORS origin: {FRONTEND_URL}")
    app.run(debug=DEBUG, host=HOST, port=PORT)
