import { Loader2 } from "lucide-react"; // Lucide icon used by ShadCN
import { cn } from "@/lib/utils"; // Optional, only if you're already using cn utility

const LoadingIndicator = ({ className }) => {
    return (
        <div className="flex justify-center items-center">
            <Loader2 className={cn("h-6 w-6 animate-spin text-gray-500", className)} />
        </div>
    );
};

export default LoadingIndicator;
