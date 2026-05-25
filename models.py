from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from decimal import Decimal

# Models will be created after db is initialized in app.py
# This function is called from app.py after db = SQLAlchemy(app)

def create_models(db):
    """Create model classes with the db instance"""
    
    class User(db.Model):
        """User model for authentication"""
        __tablename__ = 'users'
        
        id = db.Column(db.Integer, primary_key=True)
        password_hash = db.Column(db.String(255), nullable=False)
        created_at = db.Column(db.DateTime, default=datetime.now)
        updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
        
        # Relationship to transactions
        transactions = db.relationship('Transaction', backref='user', lazy=True, cascade='all, delete-orphan')
        
        def set_password(self, password):
            """Hash and set password"""
            self.password_hash = generate_password_hash(password)
        
        def check_password(self, password):
            """Check if provided password matches hash"""
            return check_password_hash(self.password_hash, password)
        
        def to_dict(self):
            """Convert user to dictionary (excluding sensitive data)"""
            return {
                'id': self.id,
                'created_at': self.created_at.isoformat(),
                'updated_at': self.updated_at.isoformat()
            }

    class Transaction(db.Model):
        """Transaction model for tracking money movements"""
        __tablename__ = 'transactions'
        
        id = db.Column(db.Integer, primary_key=True)
        user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
        account_name = db.Column(db.String(100), nullable=False)  # Cooperative, PiggyVest, OPay
        transaction_type = db.Column(db.String(20), nullable=False)  # 'add' or 'subtract'
        amount = db.Column(db.Numeric(15, 2), nullable=False)  # Decimal for precise money calculations
        note = db.Column(db.Text, nullable=True)  # Optional description
        transaction_date = db.Column(db.DateTime, nullable=False)
        created_at = db.Column(db.DateTime, default=datetime.now)
        
        # Indexes for better query performance
        __table_args__ = (
            db.Index('idx_user_account', 'user_id', 'account_name'),
            db.Index('idx_user_date', 'user_id', 'transaction_date'),
            db.Index('idx_account_date', 'account_name', 'transaction_date'),
        )
        
        def to_dict(self):
            """Convert transaction to dictionary"""
            return {
                'id': self.id,
                'account_name': self.account_name,
                'transaction_type': self.transaction_type,
                'amount': float(self.amount),
                'note': self.note,
                'transaction_date': self.transaction_date.isoformat(),
                'created_at': self.created_at.isoformat()
            }
        
        @staticmethod
        def get_balance_for_account(user_id, account_name):
            """Calculate current balance for a specific account"""
            transactions = Transaction.query.filter_by(
                user_id=user_id, 
                account_name=account_name
            ).all()
            
            balance = Decimal('0.00')
            for transaction in transactions:
                if transaction.transaction_type == 'add':
                    balance += transaction.amount
                else:  # subtract
                    balance -= transaction.amount
            
            return balance
        
        @staticmethod
        def get_total_balance(user_id):
            """Calculate total balance across all accounts"""
            transactions = Transaction.query.filter_by(user_id=user_id).all()
            
            balance = Decimal('0.00')
            for transaction in transactions:
                if transaction.transaction_type == 'add':
                    balance += transaction.amount
                else:  # subtract
                    balance -= transaction.amount
            
            return balance
        
        @staticmethod
        def get_account_balances(user_id):
            """Get balance for each account"""
            accounts = db.session.query(Transaction.account_name).filter_by(
                user_id=user_id
            ).distinct().all()
            
            balances = {}
            for (account_name,) in accounts:
                balances[account_name] = Transaction.get_balance_for_account(user_id, account_name)
            
            return balances
        
        @staticmethod
        def get_transaction_history(user_id, account_name=None, limit=50):
            """Get transaction history for user, optionally filtered by account"""
            query = Transaction.query.filter_by(user_id=user_id)
            
            if account_name:
                query = query.filter_by(account_name=account_name)
            
            return query.order_by(Transaction.transaction_date.desc()).limit(limit).all()
    
    return User, Transaction
