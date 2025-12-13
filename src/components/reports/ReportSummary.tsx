import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportSummaryData } from "@/app/(dashboard)/(admin_panel)/reports/page";
import { Package, DollarSign, ListChecks } from "lucide-react";

const StatCard = ({ title, value, icon }: { title: string, value: string | number, icon: React.ReactNode }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
        </CardContent>
    </Card>
);

export default function ReportSummary({ summary }: { summary: ReportSummaryData }) {
    return (
        <div className="grid gap-4 md:grid-cols-3">
            <StatCard title="Total Pengajuan" value={summary.total_requests} icon={<ListChecks className="h-4 w-4 text-muted-foreground" />} />
            <StatCard title="Total Nominal Uang" value={`Rp ${summary.total_nominal_uang.toLocaleString('id-ID')}`} icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} />
            <StatCard title="Total Item Barang" value={summary.total_item_barang.toLocaleString('id-ID')} icon={<Package className="h-4 w-4 text-muted-foreground" />} />
        </div>
    );
}