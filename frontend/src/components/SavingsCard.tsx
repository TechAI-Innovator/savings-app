import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SavingsCardProps {
  gradientFrom: string;
  gradientTo: string;
  children?: ReactNode;
  className?: string;
}

const SavingsCard = ({ gradientFrom, gradientTo, children, className }: SavingsCardProps) => {
  return (
    <div
      className={cn(
        "rounded-3xl p-6 shadow-lg",
        className
      )}
      style={{
        background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
      }}
    >
      {children}
    </div>
  );
};

export default SavingsCard;
