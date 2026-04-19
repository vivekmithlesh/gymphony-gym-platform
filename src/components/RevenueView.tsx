import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Users,
  CreditCard,
  Download,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { revenueSummary } from "@/server/api/revenue/summary";
import type { RevenueSummary } from "@/types/gym.types";
import { toast } from "sonner";
import { BackButton } from "./BackButton";

function formatCurrencyFromPaise(amountPaise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amountPaise / 100);
}

export function RevenueView() {
  const revenueQuery = useQuery<RevenueSummary>({
    queryKey: ["revenue-summary"],
    queryFn: () => revenueSummary(),
  });

  const handleExport = () => {
    toast.success("✅ Financial report exported as PDF!", {
      position: "bottom-center",
    });
  };

  const revenueData = revenueQuery.data?.monthly ?? [];
  const planDistribution = revenueQuery.data?.planDistribution ?? [];
  const totalMembers = planDistribution.reduce((sum, plan) => sum + plan.count, 0);
  const latestAmount = revenueData[revenueData.length - 1]?.amount ?? 0;
  const previousAmount = revenueData[revenueData.length - 2]?.amount ?? 0;
  const monthlyDelta =
    previousAmount === 0 ? 0 : ((latestAmount - previousAmount) / previousAmount) * 100;
  const avgPerMember = totalMembers === 0 ? 0 : latestAmount / totalMembers;

  if (revenueQuery.isLoading) {
    return (
      <div className="space-y-8 pb-10">
        <div className="mb-2">
          <BackButton />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="border-border bg-white shadow-soft">
              <CardContent className="h-28 animate-pulse" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="mb-2">
        <BackButton />
      </div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="font-display text-3xl font-bold md:text-4xl">
            Revenue <span className="text-gradient-brand">Analytics</span>
          </h1>
          <p className="mt-1 text-muted-foreground">
            Track your gym&apos;s financial growth and membership performance.
          </p>
        </div>
        <Button
          onClick={handleExport}
          variant="outline"
          className="rounded-xl border-primary/20 bg-white shadow-soft hover:bg-primary/5 text-primary font-bold transition-all"
        >
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: "Monthly Revenue",
            value: revenueQuery.data?.totalThisMonth ?? "₹0",
            change: `${monthlyDelta >= 0 ? "+" : ""}${monthlyDelta.toFixed(1)}%`,
            trend: monthlyDelta >= 0 ? "up" : "down",
            icon: DollarSign,
          },
          {
            title: "Avg. per Member",
            value: formatCurrencyFromPaise(avgPerMember),
            change: `${totalMembers} members`,
            trend: "up",
            icon: Users,
          },
          {
            title: "Net Profit",
            value: revenueQuery.data?.totalLastMonth ?? "₹0",
            change: "Last month",
            trend: "up",
            icon: TrendingUp,
          },
          {
            title: "Churn Rate",
            value: `${planDistribution.length}`,
            change: "Active plans",
            trend: "down",
            icon: CreditCard,
          },
        ].map((item, i) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="border-border bg-white shadow-soft hover:shadow-elegant transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {item.title}
                </CardTitle>
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <item.icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{item.value}</div>
                <div
                  className={`mt-1 flex items-center gap-1 text-xs font-bold ${item.trend === "up" ? "text-green-500" : "text-red-500"}`}
                >
                  {item.trend === "up" ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {item.change}
                  <span className="text-muted-foreground font-medium ml-1">vs last month</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border bg-white shadow-soft">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-900">Revenue Growth</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px] w-full pr-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7B2CFF" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#7B2CFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `₹${value / 1000}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    fontSize: "12px",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                  }}
                  itemStyle={{ color: "#7B2CFF", fontWeight: "bold" }}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#7B2CFF"
                  strokeWidth={4}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border bg-white shadow-soft">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-900">Membership Plans</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={planDistribution}
                margin={{ top: 20, right: 20, bottom: 20, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    fontSize: "12px",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                  }}
                  cursor={{ fill: "#7B2CFF05" }}
                />
                <Bar dataKey="count" radius={[10, 10, 0, 0]} barSize={40}>
                  {planDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
