from flask import Flask, request, jsonify, session, render_template, redirect, url_for
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from flask_sqlalchemy import SQLAlchemy
import os
import logging
from datetime import timedelta, datetime
from decimal import Decimal, InvalidOperation
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder='static', template_folder='templates')

SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-this-in-production')
ENV = os.environ.get('FLASK_ENV', 'development')
is_production = (
    os.environ.get('RENDER') == 'true'
    or os.environ.get('VERCEL_ENV') == 'production'
    or ENV == 'production'
)

app.config['SECRET_KEY'] = SECRET_KEY
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(minutes=5)

if is_production:
    app.config['SESSION_COOKIE_SAMESITE'] = 'None'
    app.config['SESSION_COOKIE_SECURE'] = True
else:
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
    app.config['SESSION_COOKIE_SECURE'] = False

app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_PATH'] = '/'
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

from models import create_models

DBUser, Transaction = create_models(db)

API_BASE_PATH = os.environ.get('API_BASE_PATH', '/api')
ENDPOINT_AUTH_VERIFY = os.environ.get('ENDPOINT_AUTH_VERIFY', '/auth/verify')
ENDPOINT_AUTH_LOGOUT = os.environ.get('ENDPOINT_AUTH_LOGOUT', '/auth/logout')
ENDPOINT_AUTH_STATUS = os.environ.get('ENDPOINT_AUTH_STATUS', '/auth/status')
ENDPOINT_ACCOUNT_UPDATE = os.environ.get('ENDPOINT_ACCOUNT_UPDATE', '/account/update')
ENDPOINT_ACCOUNT_HISTORY = os.environ.get('ENDPOINT_ACCOUNT_HISTORY', '/account/history')
ENDPOINT_HEALTH = os.environ.get('ENDPOINT_HEALTH', '/health')

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.session_protection = 'strong'


class UserSession(UserMixin):
    def __init__(self, user_id):
        self.id = user_id


@login_manager.user_loader
def load_user(user_id):
    user = DBUser.query.get(int(user_id))
    if user:
        return UserSession(user.id)
    return None


@login_manager.unauthorized_handler
def unauthorized():
    if request.path.startswith(API_BASE_PATH):
        return jsonify({
            'success': False,
            'message': 'Authentication required. Please log in.',
            'error': 'unauthorized',
        }), 401
    return redirect(url_for('index'))


# --- Page routes (Jinja2) ---

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/update-account')
def update_account_page():
    source = request.args.get('source', '')
    return render_template('update_account.html', source=source)


@app.route('/transaction-history')
def transaction_history_page():
    account = request.args.get('account', '')
    return render_template('transaction_history.html', account_filter=account)


@app.errorhandler(404)
def not_found(e):
    if request.path.startswith(API_BASE_PATH):
        return jsonify({'success': False, 'message': 'Not found'}), 404
    return render_template('not_found.html'), 404


# --- API routes ---

@app.route(f'{API_BASE_PATH}{ENDPOINT_AUTH_VERIFY}', methods=['POST'])
def verify_password():
    try:
        data = request.get_json() or {}
        password = data.get('password', '')

        user = DBUser.query.get(1)
        if not user:
            return jsonify({'success': False, 'message': 'Authentication failed'}), 401

        if user.check_password(password):
            user_session = UserSession(user.id)
            login_user(user_session, remember=True)
            session.permanent = True
            return jsonify({'success': True, 'message': 'Authentication successful'}), 200

        return jsonify({'success': False, 'message': 'Invalid password'}), 401
    except Exception as e:
        logger.error(f'Authentication error: {e}', exc_info=True)
        return jsonify({'success': False, 'message': 'Server error occurred'}), 500


@app.route(f'{API_BASE_PATH}{ENDPOINT_AUTH_LOGOUT}', methods=['POST'])
@login_required
def logout():
    try:
        logout_user()
        session.clear()
        return jsonify({'success': True, 'message': 'Logged out successfully'}), 200
    except Exception as e:
        logger.error(f'Logout error: {e}', exc_info=True)
        return jsonify({'success': False, 'message': 'Logout error occurred'}), 500


@app.route(f'{API_BASE_PATH}{ENDPOINT_AUTH_STATUS}', methods=['GET'])
def auth_status():
    try:
        if current_user.is_authenticated:
            return jsonify({'authenticated': True, 'user_id': current_user.id}), 200
        return jsonify({'authenticated': False}), 200
    except Exception as e:
        logger.error(f'Auth status check error: {e}')
        return jsonify({'authenticated': False, 'error': 'Status check failed'}), 500


@app.route(f'{API_BASE_PATH}{ENDPOINT_ACCOUNT_UPDATE}', methods=['POST'])
@login_required
def update_account():
    try:
        data = request.get_json() or {}
        account_name = data.get('accountName', '')
        amount_str = data.get('amount', '')
        note = data.get('note', '')
        date_time_str = data.get('dateTime', '')
        transaction_type = data.get('transactionType', 'add')

        if not account_name or not amount_str:
            return jsonify({
                'success': False,
                'message': 'Account name and amount are required',
            }), 400

        try:
            amount_cleaned = amount_str.replace(',', '')
            amount_decimal = Decimal(amount_cleaned)
            if amount_decimal <= 0:
                return jsonify({
                    'success': False,
                    'message': 'Amount must be greater than zero',
                }), 400
        except (ValueError, InvalidOperation):
            return jsonify({'success': False, 'message': 'Invalid amount format'}), 400

        try:
            if date_time_str:
                transaction_date = datetime.fromisoformat(date_time_str.replace('Z', '+00:00'))
            else:
                transaction_date = datetime.now()
        except ValueError:
            transaction_date = datetime.now()

        new_transaction = Transaction(
            user_id=current_user.id,
            account_name=account_name,
            transaction_type=transaction_type,
            amount=amount_decimal,
            note=note,
            transaction_date=transaction_date,
        )

        db.session.add(new_transaction)
        db.session.commit()

        new_balance = Transaction.get_balance_for_account(current_user.id, account_name)

        return jsonify({
            'success': True,
            'message': f'Money {"added to" if transaction_type == "add" else "subtracted from"} {account_name} successfully',
            'data': {
                'accountName': account_name,
                'amount': float(amount_decimal),
                'transactionType': transaction_type,
                'note': note,
                'dateTime': transaction_date.isoformat(),
                'newBalance': float(new_balance),
            },
        }), 200
    except Exception as e:
        logger.error(f'Account update error: {e}', exc_info=True)
        db.session.rollback()
        return jsonify({'success': False, 'message': 'Failed to update account'}), 500


@app.route(f'{API_BASE_PATH}{ENDPOINT_ACCOUNT_HISTORY}', methods=['GET'])
@login_required
def get_history():
    try:
        account_name = request.args.get('account', None)
        limit = request.args.get('limit', 50, type=int)

        transactions = Transaction.get_transaction_history(
            user_id=current_user.id,
            account_name=account_name,
            limit=limit,
        )
        account_balances = Transaction.get_account_balances(current_user.id)
        total_balance = Transaction.get_total_balance(current_user.id)

        transactions_data = [t.to_dict() for t in transactions]
        balances_data = {account: float(balance) for account, balance in account_balances.items()}

        return jsonify({
            'success': True,
            'data': {
                'transactions': transactions_data,
                'accountBalances': balances_data,
                'totalBalance': float(total_balance),
            },
        }), 200
    except Exception as e:
        logger.error(f'History fetch error: {e}', exc_info=True)
        return jsonify({'success': False, 'message': 'Failed to fetch history'}), 500


@app.route(f'{API_BASE_PATH}{ENDPOINT_HEALTH}', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'message': 'Backend is running'}), 200


def keep_db_alive():
    with app.app_context():
        try:
            db.session.execute(db.text('SELECT 1')).scalar()
        except Exception as e:
            logger.error(f'Database keep-alive ping failed: {e}', exc_info=True)


from apscheduler.schedulers.background import BackgroundScheduler
import atexit

scheduler = BackgroundScheduler()


def init_scheduler():
    if not scheduler.running:
        scheduler.add_job(keep_db_alive, 'interval', minutes=4, id='keep_db_alive')
        scheduler.start()
        keep_db_alive()


init_scheduler()
atexit.register(lambda: scheduler.shutdown() if scheduler.running else None)

if __name__ == '__main__':
    # Default 5000 for this standalone app (original backend may use BACKEND_PORT=5001)
    PORT = int(os.environ.get('FLASK_PORT', os.environ.get('PORT', 5000)))
    HOST = os.environ.get('HOST', os.environ.get('BACKEND_HOST', '0.0.0.0'))
    DEBUG = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'
    logger.info(f'Starting Savings Tracker (Flask + Jinja) on http://{HOST}:{PORT}')
    app.run(debug=DEBUG, host=HOST, port=PORT)
