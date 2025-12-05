import AccountCard from "@/components/AccountCard";
import { useAuth } from "@/contexts/AuthContext";
import { PasswordOverlay } from "@/components/PasswordOverlay";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { buildApiUrl, ENDPOINTS } from "@/config/api";

interface AccountBalances {
  [accountName: string]: number;
}

const Index = () => {
  const { isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [balances, setBalances] = useState<AccountBalances>({
    Cooperative: 0,
    PiggyVest: 0,
    OPay: 0,
  });
  const [balancesVisible, setBalancesVisible] = useState(false); // Hidden by default

  console.log('🏠 Index: Component rendered, authentication status:', isAuthenticated, 'loading:', authLoading);

  // Fetch account balances
  useEffect(() => {
    const fetchBalances = async () => {
      if (!isAuthenticated) return;

      try {
        console.log('💰 Fetching account balances from backend');
        const response = await fetch(buildApiUrl(ENDPOINTS.ACCOUNT.HISTORY), {
          method: 'GET',
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Balances fetched:', data.data.accountBalances);
          setBalances(data.data.accountBalances);
        }
      } catch (err) {
        console.error('❌ Error fetching balances:', err);
      }
    };

    fetchBalances();
  }, [isAuthenticated]);

  // Show loading spinner while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background/72 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('🔒 Index: User not authenticated, showing password overlay');
    return <PasswordOverlay />;
  }

  console.log('✅ Index: User authenticated, showing main dashboard');

  return (
    <div className="min-h-screen bg-background/72 relative">
      
      {/* Container with responsive padding: 64px on desktop (1440px), 24px on mobile (390px) */}
      <div className="mx-auto max-w-[1440px] px-6 py-6 md:px-16 lg:px-16">
        
        {/* Hero Section */}
        <section 
          className="relative mb-12 overflow-hidden backdrop-blur-[4px] px-[16px]"
          style={{
            height: '460px',
            borderRadius: '32px',
            border: '0.5px solid rgba(0, 0, 0, 1)',
            boxShadow: '0 4px 4px rgba(0, 0, 0, 0.25)',
          }}
        >
          {/* Background Image with opacity and blur */}
          <div 
            className="absolute inset-0 bg-cover bg-center z-0"
            style={{
              backgroundImage: 'url(/assets/Hero.png)',
              opacity: 0.7,
              filter: 'blur(4px)',
            }}
          />

          {/* Logout Button */}
          <div className="absolute top-1 right-1 z-20">
            <Button
              onClick={() => {
                console.log('🚪 Index: Logout button clicked');
                logout();
              }}
              size="sm"
              className="gap-2 bg-primary/90 hover:bg-primary text-primary-foreground rounded-tr-[32px] rounded-bl-2xl backdrop-blur-sm shadow-lg border-0 font-semibold transition-all hover:shadow-xl"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>

          {/* Content overlay */}
          <div className="relative z-10 flex h-full flex-col items-center justify-center gap-6">
            <div>
              <h1 className="text-display text-foreground opacity-0 animate-[fade-in-up_1s_ease-out_forwards]">MY SAVINGS TRACKER</h1>
              <p className="text-h2 max-w-4xl text-foreground opacity-0 animate-[fade-in-up_1s_ease-out_0.4s_forwards]">
                See your savings grow, not your confusion. Bring all your accounts together, understand your habits, and make smarter money moves with a tracker built for clarity and growth.
              </p>
            </div>
          </div>
        </section>

        {/* Card Section */}
        <section className="mb-10">
          <div className="flex flex-col md:flex-row md:flex-wrap justify-center gap-6 items-center items-stretch">
            <div className="opacity-0 animate-[fade-in-up_1s_ease-out_1s_forwards]">
              <AccountCard
                iconSrc="/assets/cooperative.avif"
                title="Cooperative"
                amount={(balances.Cooperative || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                gradientFrom="hsl(40, 15%, 85%)"
                gradientTo="hsl(40, 15%, 60%)"
                shadowColor="hsl(40, 15%, 50%)"
                initiallyVisible={balancesVisible}
                onVisibilityChange={(visible) => setBalancesVisible(visible)}
                onUpdate={() => navigate("/update-account?source=Cooperative")}
                onHistory={() => {
                  console.log('📊 Index: Navigating to Cooperative transaction history');
                  navigate("/transaction-history?account=Cooperative");
                }}
              />
            </div>
            <div className="opacity-0 animate-[fade-in-up_1s_ease-out_1.3s_forwards]">
              <AccountCard
                iconSrc="/assets/piggyvest.webp"
                title="PiggyVest"
                amount={(balances.PiggyVest || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                gradientFrom="hsl(210, 60%, 70%)"
                gradientTo="hsl(210, 60%, 40%)"
                shadowColor="hsl(210, 60%, 35%)"
                initiallyVisible={balancesVisible}
                onVisibilityChange={(visible) => setBalancesVisible(visible)}
                onUpdate={() => navigate("/update-account?source=PiggyVest")}
                onHistory={() => {
                  console.log('📊 Index: Navigating to PiggyVest transaction history');
                  navigate("/transaction-history?account=PiggyVest");
                }}
              />
            </div>
            <div className="opacity-0 animate-[fade-in-up_1s_ease-out_1.6s_forwards]">
              <AccountCard
                iconSrc="/assets/opay.png"
                title="OPay"
                amount={(balances.OPay || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                gradientFrom="hsl(160, 50%, 70%)"
                gradientTo="hsl(160, 50%, 40%)"
                shadowColor="hsl(160, 50%, 35%)"
                initiallyVisible={balancesVisible}
                onVisibilityChange={(visible) => setBalancesVisible(visible)}
                onUpdate={() => navigate("/update-account?source=OPay")}
                onHistory={() => {
                  console.log('📊 Index: Navigating to OPay transaction history');
                  navigate("/transaction-history?account=OPay");
                }}
              />
            </div>
          </div>
        </section>

        {/* Footer Section */}
        <footer>
          {/* Title */}
          <h1 className="text-h1">Savings Highlights</h1>

          {/* Highlight container */}
          <div className="bg-lightCream border-[0.5px] border-accentPurple rounded-[10px] h-[64px] flex items-center justify-center mt-2 shadow-[0_7px_7px_rgba(0,0,0,0.16)] overflow-hidden">
            {/* Left line */}
            <div></div>

            {/* Center text */}
            <div className="border-x-[4px] border-accentPurple h-full flex items-center justify-start md:w-[60%] overflow-hidden relative">
              <div className="flex animate-scroll-left">
                <p className="whitespace-nowrap text-h3 text-accentPurple">
                  Total savings Balance is 43,000,000 | Added ₦5,000 to PiggyVest | Tip: Save before spending | New goal: ₦500k target
                </p>
                <p className="whitespace-nowrap text-h3 text-accentPurple pr-12">
                  Total savings Balance is 43,000,000 | Added ₦5,000 to PiggyVest | Tip: Save before spending | New goal: ₦500k target
                </p>
                <p className="whitespace-nowrap text-h3 text-accentPurple pr-12">
                  Total savings Balance is 43,000,000 | Added ₦5,000 to PiggyVest | Tip: Save before spending | New goal: ₦500k target
                </p>
                <p className="whitespace-nowrap text-h3 text-accentPurple pr-12">
                  Total savings Balance is 43,000,000 | Added ₦5,000 to PiggyVest | Tip: Save before spending | New goal: ₦500k target
                </p>
                <p className="whitespace-nowrap text-h3 text-accentPurple pr-12">
                  Total savings Balance is 43,000,000 | Added ₦5,000 to PiggyVest | Tip: Save before spending | New goal: ₦500k target
                </p>
              </div>
            </div>

            {/* Right line */}
            <div></div>
          </div>
        </footer>

      </div>
    </div>
  );
};

export default Index;
