import { Loader2 } from "lucide-react";

export default function LoadingSpinner({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center w-full h-full min-h-[200px] ${className}`}>
      <div className="relative">
        <div className="h-12 w-12 rounded-full border-4 border-muted/30"></div>
        <div className="absolute top-0 left-0 h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
      </div>
    </div>
  );
}
