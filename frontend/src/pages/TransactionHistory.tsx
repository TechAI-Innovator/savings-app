import { useEffect, useState } from 'react';
import { buildApiUrl, ENDPOINTS } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useSearchParams, useNavigate } from 'react-router-dom';

interface Transaction {
  id: number;
  account_name: string;  // Changed from accountName to match backend
  transaction_type: string;  // Changed from transactionType to match backend
  amount: number;
  note: string;
  transaction_date: string;  // Changed from dateTime to match backend
  created_at: string;  // Added to match backend
}

interface AccountBalance {
  [accountName: string]: number;
}

interface HistoryData {
  transactions: Transaction[];
  accountBalances: AccountBalance;
  totalBalance: number;
}

const TransactionHistory = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const accountFilter = searchParams.get('account'); // Get account from URL
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState('');
  const [historyData, setHistoryData] = useState<HistoryData | null>(null);
  const [balancesVisible, setBalancesVisible] = useState(false); // Hidden by default

  // Update time every second (without seconds)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12; // Convert to 12-hour format
      const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
      setCurrentTime(`${displayHours}:${displayMinutes} ${ampm}`); // No seconds
    };

    updateTime(); // Initial update
    const interval = setInterval(updateTime, 1000); // Update every second

    return () => clearInterval(interval); // Cleanup
  }, []);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        // Build URL with account filter if specified
        const url = accountFilter 
          ? `${buildApiUrl(ENDPOINTS.ACCOUNT.HISTORY)}?account=${encodeURIComponent(accountFilter)}`
          : buildApiUrl(ENDPOINTS.ACCOUNT.HISTORY);
        
        console.log('🔍 Fetching transaction history from backend', accountFilter ? `for ${accountFilter}` : '(all accounts)');
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        console.log(`📡 History response received - Status: ${response.status}`);

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Transaction history fetched successfully:', data);
          console.log('📊 Data structure:', {
            hasData: !!data.data,
            transactions: data.data?.transactions?.length || 0,
            accounts: Object.keys(data.data?.accountBalances || {}).length,
            totalBalance: data.data?.totalBalance
          });
          setHistoryData(data.data);
          setError(null);
        } else {
          const errorData = await response.json();
          console.error('❌ Failed to fetch history:', errorData);
          setError(errorData.message || errorData.error || 'Failed to load transaction history');
        }
      } catch (err) {
        console.error('🚨 Error fetching transaction history:', err);
        setError('Unable to connect to the server. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchHistory();
    }
  }, [isAuthenticated, accountFilter]);

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading transaction history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
          <div className="text-red-500 text-center">
            <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-semibold mb-2">Error Loading History</h2>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-3 sm:p-4 md:p-6 lg:px-40 lg:py-16 flex justify-center">
      <div className="w-full lg:max-w-[60%] bg-white rounded-2xl sm:rounded-3xl md:rounded-[80px] shadow-lg px-4 sm:px-6 md:px-8 pb-6 md:pb-8 pt-3 md:pt-4 min-h-[500px] border-4 md:border-[10px] border-blue-200">
        {/* Status bar design */}
        <div className='flex relative items-center sm:px-8 px-0 lg:px-12 h-[40px]'>
          {/* for time */}
          <div className='flex items-center gap-2'>
            <p className="text-gray-600 text-body font-medium">{currentTime}</p>
          </div>
          {/* For the space in the middle - absolutely centered */}
          <div className='absolute left-1/2 transform -translate-x-1/2 h-full flex items-center'>
            <div className='h-full bg-blue-100 w-24 lg:w-32 flex items-center justify-center rounded-full'>
              <p className="text-gray-0 text-sm"></p>
            </div>
          </div>
          {/* for the right side */}
          <div className='flex items-center gap-2 ml-auto'>
            {/* Signal icon - full bars increasing left to right */}
            <svg className='w-5 h-4' viewBox="0 0 20 16" fill="currentColor">
              <rect x="0" y="12" width="3" height="4" rx="0.5"/>
              <rect x="5" y="10" width="3" height="6" rx="0.5"/>
              <rect x="10" y="8" width="3" height="8" rx="0.5"/>
              <rect x="15" y="6" width="3" height="10" rx="0.5"/>
            </svg>
            {/* WiFi icon */}
            <svg className='w-5 h-5' viewBox="0 0 24 24" fill="currentColor">
              <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/>
            </svg>
            {/* Battery icon - horizontal */}
            <svg className='w-8 h-6' viewBox="0 0 24 12" fill="currentColor">
              <rect x="0" y="2" width="20" height="8" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="2" y="3.5" width="16" height="5" rx="0.5"/>
              <rect x="20" y="4.5" width="2" height="3" rx="0.5"/>
            </svg>
          </div>
        </div>

        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors mb-3 md:mb-4 mt-2 md:mt-6"
        >
          <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="text-base md:text-lg font-medium">Back</span>
        </button>

        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-4 md:mb-10">
          Transaction History
          {accountFilter && <span className="text-lg sm:text-xl md:text-2xl text-gray-600 block sm:inline"> - {accountFilter}</span>}
        </h1>
        
        {/* Account Balances Summary */}
        {historyData && (
          <div className="mb-4 md:mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mb-3 md:mb-4">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">General Summary</h2>
              <button
                onClick={() => setBalancesVisible(!balancesVisible)}
                className="flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-sm"
              >
                {balancesVisible ? (
                  <>
                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span className="text-xs md:text-sm font-medium">Hide</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                    <span className="text-xs md:text-sm font-medium">Show</span>
                  </>
                )}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-3 md:p-4 rounded-lg shadow-lg">
                <h3 className="text-sm md:text-lg font-semibold">Total Balance</h3>
                <p className="text-lg md:text-2xl font-bold">
                  {balancesVisible ? `₦${historyData.totalBalance.toLocaleString()}` : '₦ •••••'}
                </p>
              </div>
              {Object.entries(historyData.accountBalances).map(([account, balance]) => (
                <div key={account} className="bg-gradient-to-r from-green-500 to-green-600 text-white p-3 md:p-4 rounded-lg shadow-lg">
                  <h3 className="text-sm md:text-lg font-semibold">{account}</h3>
                  <p className="text-base md:text-xl font-bold">
                    {balancesVisible ? `₦${balance.toLocaleString()}` : '₦ •••••'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transaction List */}
        <div className="bg-white rounded-xl sm:rounded-2xl md:rounded-[54px] shadow-lg p-3 sm:p-4 md:p-6">
          {historyData && historyData.transactions.length > 0 ? (
            <div className="space-y-3 md:space-y-4">
              <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800 mb-3 md:mb-4">
                Recent Transactions ({historyData.transactions.length})
              </h2>
              {historyData.transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="border-2 border-gray-200 rounded-xl sm:rounded-2xl md:rounded-3xl p-3 sm:p-4 md:p-5 hover:shadow-xl hover:border-blue-300 transition-all duration-300"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2 md:mb-3">
                        <span className={`px-2 sm:px-3 md:px-4 py-1 md:py-1.5 rounded-full text-xs sm:text-sm md:text-base font-semibold ${
                          transaction.transaction_type === 'add' 
                            ? 'bg-green-100 text-green-800' 
                            : transaction.transaction_type === 'subtract'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {transaction.transaction_type === 'add' ? '+ Deposit' : transaction.transaction_type === 'subtract' ? '- Withdrawal' : transaction.transaction_type}
                        </span>
                        {!accountFilter && (
                          <span className="text-xs sm:text-sm md:text-base font-medium text-blue-600 bg-blue-50 px-2 md:px-3 py-0.5 md:py-1 rounded-full">
                            {transaction.account_name}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-900 font-bold text-lg sm:text-xl md:text-2xl mb-1 md:mb-2">
                        ₦{transaction.amount.toLocaleString()}
                      </p>
                      {transaction.note && (
                        <p className="text-gray-700 text-sm md:text-base mt-1 md:mt-2 italic">"{transaction.note}"</p>
                      )}
                      <p className="text-gray-500 text-xs md:text-sm mt-2 md:mt-3 flex items-center gap-1 md:gap-2">
                        <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {new Date(transaction.transaction_date).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 md:py-8">
              <svg className="w-12 h-12 md:w-16 md:h-16 mx-auto text-gray-400 mb-3 md:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="text-base md:text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
              <p className="text-gray-500 text-sm md:text-base">Start by adding some money to your accounts!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionHistory;