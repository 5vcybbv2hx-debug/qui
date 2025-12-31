import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function StatCard({ title, value, icon: Icon, color = "bg-slate-100", iconColor = "text-slate-600" }) {
    return (
        <Card className="p-5 bg-white border-0 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs uppercase tracking-wider text-slate-400 font-medium mb-1">{title}</p>
                    <p className="text-2xl font-semibold text-slate-800">{value}</p>
                </div>
                <div className={cn("p-3 rounded-xl", color)}>
                    <Icon className={cn("w-5 h-5", iconColor)} />
                </div>
            </div>
        </Card>
    );
}