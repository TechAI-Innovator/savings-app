import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { buildApiUrl, ENDPOINTS } from "@/config/api";
import { useAuth } from "@/contexts/AuthContext";

const UpdateAccount = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const [showAmount, setShowAmount] = useState(true); // Start visible so placeholder shows
  const [isLoading, setIsLoading] = useState(false);
  
  // Get source from URL params
  const sourceFromUrl = searchParams.get("source") || "";
  
  // Map source to icon
  const getIconPath = (source: string): string => {
    const iconMap: Record<string, string> = {
      'Cooperative': '/assets/cooperative.avif',
      'PiggyVest': '/assets/piggyvest.webp',
      'OPay': '/assets/opay.png',
    };
    return iconMap[source] || '/assets/cooperative.avif';
  };
  
  const iconFromUrl = getIconPath(sourceFromUrl);
  
  const [transactionType, setTransactionType] = useState<"add" | "subtract">("add");
  const [formData, setFormData] = useState({
    accountName: sourceFromUrl || "Cooperative",
    amount: "",  // Empty by default so placeholder shows
    note: "",
    dateTime: new Date().toISOString().slice(0, 16) // Format: YYYY-MM-DDTHH:mm
  });

  // Redirect to home if not authenticated (after timeout)
  useEffect(() => {
    if (!isAuthenticated) {
      toast({
        title: "Session Expired",
        description: "Your session has expired. Please login again.",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [isAuthenticated, navigate, toast]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    console.log('💾 UpdateAccount: Save transaction initiated');
    console.log('📊 UpdateAccount: Transaction data:', {
      accountName: formData.accountName,
      amount: formData.amount,
      transactionType,
      note: formData.note,
      dateTime: formData.dateTime
    });
    
    setIsLoading(true);
    try {
      console.log('🌐 UpdateAccount: Sending transaction request to backend');
      const response = await fetch(buildApiUrl(ENDPOINTS.ACCOUNT.UPDATE), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          transactionType: transactionType
        }),
      });

      console.log(`📡 UpdateAccount: Response received - Status: ${response.status}`);

      // Check for authentication errors
      if (response.status === 401 || response.status === 403) {
        console.warn('🔒 UpdateAccount: Authentication error - session expired');
        toast({
          title: "Session Expired",
          description: "Your session has expired. Please login again.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      const result = await response.json();
      console.log('📄 UpdateAccount: Response data:', result);

      if (result.success) {
        console.log('✅ UpdateAccount: Transaction saved successfully');
        toast({
          title: "Success",
          description: "Account updated successfully!",
        });
        console.log('🏠 UpdateAccount: Navigating back to home page');
        navigate("/");
      } else {
        console.error('❌ UpdateAccount: Transaction failed:', result.message);
        toast({
          title: "Error",
          description: result.message || "Failed to update account",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('🚨 UpdateAccount: Network error:', error);
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      });
    } finally {
      console.log('🏁 UpdateAccount: Save operation completed');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-bl from-black via-black via-65% to-accentPurple relative flex items-center justify-center">
      {/* Main container with two panels */}
      <div className="flex w-[70%] h-[70vh] rounded-3xl overflow-hidden shadow-2xl bg-gray-800">
        {/* Left Panel - Glassy gradient background with centered image */}
        <div className="flex-1 relative overflow-hidden">
          {/* Glassy gradient background */}
          <div className="absolute inset-0 bg-gradient-to-bl from-gray-900 via-gray-800 via-65% to-accentPurple backdrop-blur-2xl border-t border-white/10 shadow-inner" />

          {/* Small centered image */}
          <div className="relative z-10 h-full flex items-center justify-center">
            <img 
              src={iconFromUrl} 
              alt={formData.accountName} 
              className="w-48 h-48 object-cover drop-shadow-lg rounded-full"
            />
          </div>
        </div>

        {/* Right Panel - Form */}
        <div className="flex-1 bg-gradient-to-br from-gray-100 to-white flex items-center justify-center p-8 border-[10px] border-background rounded-3xl h-full min-h-[500px]">
          <div className="w-full max-w-md space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <h1 className="text-h3 text-foreground">Update Account</h1>
              <p className="text-body text-muted-foreground">
                Modify your account information
              </p>
            </div>

            {/* Form */}
            <div className="flex justify-center items-center gap-12 h-full">
              <div>
                {/* Transaction Type Buttons */}
                <div className="">
                  <Label className="text-body font-medium mb-3 block">
                    Transaction Type
                  </Label>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      onClick={() => setTransactionType("add")}
                      className={`flex-1 rounded-lg text-body font-semibold transition-all ${
                        transactionType === "add"
                          ? "bg-green-600 hover:bg-green-700 text-white"
                          : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                      }`}
                    >
                      <span className="text-xl mr-1">+</span> Add Money
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setTransactionType("subtract")}
                      className={`flex-1 rounded-lg text-body font-semibold transition-all ${
                        transactionType === "subtract"
                          ? "bg-red-600 hover:bg-red-700 text-white"
                          : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                      }`}
                    >
                      <span className="text-xl mr-1">-</span> Subtract Money
                    </Button>
                  </div>
                </div>

                 {/* Account Name */}
                 <div className="">
                   <Label htmlFor="accountName" className="text-body font-medium">
                     Source
                   </Label>
                   <Input
                     id="accountName"
                     value={formData.accountName}
                     onChange={(e) => handleInputChange("accountName", e.target.value)}
                     disabled={!!sourceFromUrl}
                     className="rounded-lg border-2 border-gray-200 focus:border-accentPurple disabled:opacity-60 disabled:cursor-not-allowed"
                   />
                 </div>

                {/* Amount */}
                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-body font-medium">
                    Amount <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="amount"
                      type={showAmount ? "text" : "password"}
                      value={formData.amount}
                      onChange={(e) => {
                        // Only allow numbers and decimal point
                        const value = e.target.value;
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          handleInputChange("amount", value);
                        }
                      }}
                      placeholder="e.g., 50000 or 50000.50"
                      required
                      className="rounded-lg border-2 border-gray-200 focus:border-accentPurple pr-12"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                      onClick={() => setShowAmount(!showAmount)}
                    >
                      {showAmount ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* Note/Description (Optional) */}
                <div className="space-y-2">
                  <Label htmlFor="note" className="text-body font-medium">
                    Note/Description <span className="text-muted-foreground text-sm">(Optional)</span>
                  </Label>
                  <Input
                    id="note"
                    value={formData.note}
                    onChange={(e) => handleInputChange("note", e.target.value)}
                    placeholder="Add a note or description..."
                    className="rounded-lg border-2 border-gray-200 focus:border-accentPurple"
                  />
                </div>

                {/* Date & Time */}
                <div className="space-y-2">
                  <Label htmlFor="dateTime" className="text-body font-medium">
                    Date & Time
                  </Label>
                  <Input
                    id="dateTime"
                    type="datetime-local"
                    value={formData.dateTime}
                    onChange={(e) => handleInputChange("dateTime", e.target.value)}
                    className="rounded-lg border-2 border-gray-200 focus:border-accentPurple"
                  />
                  <p className="text-xs text-muted-foreground">
                    Auto-generated, but you can override manually
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col items-center justify-center space-y-6 w-full max-w-[180px] self-center -translate-y-2">
                <Button
                  onClick={() => navigate("/")}
                  variant="outline"
                  className="w-full rounded-lg border-2 border-gray-300 hover:border-gray-400"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="w-full rounded-lg bg-accentPurple hover:bg-accentPurple/90 text-white disabled:opacity-50"
                >
                  <Save className="w-4 h-4 mr-1" />
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdateAccount;
