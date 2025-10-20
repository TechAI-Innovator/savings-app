import { useState, FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Lock, AlertCircle } from 'lucide-react';

export const PasswordOverlay = () => {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, error } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    console.log('🔐 PasswordOverlay: Login form submitted');
    setIsLoading(true);
    
    console.log('🔑 PasswordOverlay: Attempting login with password length:', password.length);
    const loginSuccess = await login(password);
    
    if (loginSuccess) {
      console.log('✅ PasswordOverlay: Login successful');
    } else {
      console.log('❌ PasswordOverlay: Login failed');
    }
    
    setIsLoading(false);
    setPassword('');
    console.log('🧹 PasswordOverlay: Form reset, password cleared');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md mx-4 p-8 rounded-3xl bg-gradient-to-br from-primary/10 via-background to-accent/10 border border-primary/20 shadow-2xl animate-scale-in">
        <div className="flex flex-col items-center gap-6">
          {/* Icon */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
            <Lock className="w-8 h-8 text-primary-foreground" />
          </div>

          {/* Title */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              Secure Access Required
            </h2>
            <p className="text-sm text-muted-foreground">
              Please enter your password to access this application
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="h-12 bg-background/50 border-primary/30 focus:border-primary"
                disabled={isLoading}
                required
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 animate-fade-in">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-semibold shadow-lg transition-all"
              disabled={isLoading}
            >
              {isLoading ? 'Verifying...' : 'Unlock'}
            </Button>
          </form>

          {/* Info */}
          <p className="text-xs text-muted-foreground text-center">
            For security reasons, you'll be logged out after 5 minutes of inactivity
          </p>
        </div>
      </div>
    </div>
  );
};
