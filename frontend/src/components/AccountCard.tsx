import { Button } from "@/components/ui/button";

interface AccountCardProps {
  iconSrc: string;
  title: string;
  amount: string;
  gradientFrom: string;
  gradientTo: string;
  shadowColor?: string;
  onUpdate?: () => void;
  onHistory?: () => void;
}

const AccountCard = ({
  iconSrc,
  title,
  amount,
  gradientFrom,
  gradientTo,
  shadowColor,
  onUpdate,
  onHistory,
}: AccountCardProps) => {
  return (
    <div
      className="w-full max-w-[400px] h-[222px] px-6 rounded-[24px] flex flex-col gap-8 justify-center transition-transform duration-300 hover:scale-95"
      style={{
        background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
        boxShadow: shadowColor ? `0 -8px 24px -8px ${shadowColor}` : 'none',
      }}
    >
      {/* First div: Icon and Title */}
      <div className="flex items-center gap-1.5 opacity-0 animate-[fade-in-up_0.8s_ease-out_0.3s_forwards]">
        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
          <img src={iconSrc} alt={title} className="w-full h-full object-cover" />
        </div>
        <h3 className="text-h3 text-foreground">{title}</h3>
      </div>

      {/* Second div: Amount and Eye Icon */}
      <div className="flex items-center justify-between gap-12 opacity-0 animate-[fade-in-up_0.8s_ease-out_0.5s_forwards]">
        <h2 className="text-h2 text-foreground">{amount}</h2>
        <div className="w-9 h-9 rounded-full bg-primary/80 flex items-center justify-center flex-shrink-0">
          <img src="/icon/openmoji_eyes.svg" alt="Toggle visibility" className="w-6 h-6" />
        </div>
      </div>

      {/* Third div: Two Buttons */}
      <div className="flex gap-5 opacity-0 animate-[fade-in-up_0.8s_ease-out_0.7s_forwards]">
        <Button
          onClick={() => {
            console.log('📝 AccountCard: Update button clicked for account:', title);
            onUpdate?.();
          }}
          className="flex-1 rounded-[10px] text-body bg-primary hover:bg-primary/70 text-primary-foreground"
        >
          Update
        </Button>
        <Button
          onClick={() => {
            console.log('📊 AccountCard: History button clicked for account:', title);
            onHistory?.();
          }}
          className="flex-1 rounded-[10px] text-body text-foreground"
          style={{ backgroundColor: 'hsl(250, 63%, 90%)' }}
        >
          History
        </Button>
      </div>
    </div>
  );
};

export default AccountCard;
