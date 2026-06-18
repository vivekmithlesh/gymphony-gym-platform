import { useCallback, useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { fetchAllSubscriptions, reviewSubscriptionPayment, type SubscriptionPayment } from "@/lib/platform-billing";
import { formatINR } from "@/lib/plans";

// Admin: verify owner subscription payments. Approve activates the plan
// immediately (server-side); reject keeps the subscription inactive.
export function AdminSubscriptions() {
  const [rows, setRows] = useState<SubscriptionPayment[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRows(await fetchAllSubscriptions(200));
    } catch (e: any) {
      toast.error(e?.message || "Could not load payments.");
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (id: string, action: "approve" | "reject") => {
    const reason = action === "reject" ? (window.prompt("Reason for rejection (optional):") ?? undefined) : undefined;
    setBusyId(id);
    try {
      const res = await reviewSubscriptionPayment(id, action, reason);
      if (!res.success) {
        toast.error(res.error || "Action failed.");
      } else {
        toast.success(action === "approve" ? "Approved — plan activated." : "Payment rejected.");
        await load();
      }
    } catch (e: any) {
      toast.error(e?.message || "Action failed.");
    } finally {
      setBusyId(null);
    }
  };

  if (rows === null) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
      </div>
    );
  }

  const pending = rows.filter((r) => r.status === "pending_verification");
  const others = rows.filter((r) => r.status !== "pending_verification");

  return (
    <Card className="border-border bg-white shadow-soft">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-slate-900">Subscription payments</CardTitle>
        <CardDescription>{pending.length} pending verification</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No payments yet.</p>}
        {[...pending, ...others].map((r) => (
          <div
            key={r.id}
            className="flex flex-col gap-3 rounded-xl border border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-sm font-bold capitalize text-slate-900">
                {r.tier} · {r.billing_cycle} · {formatINR(Number(r.amount))}
              </p>
              <p className="text-xs break-all text-muted-foreground">
                {new Date(r.created_at).toLocaleString()} · UTR {r.utr ?? "—"} · owner {r.owner_id.slice(0, 8)}…
              </p>
              {r.evidence_url && (
                <a href={r.evidence_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-violet-600 hover:underline">
                  View proof
                </a>
              )}
              {r.status === "rejected" && r.reject_reason && (
                <p className="text-xs text-red-500">Reason: {r.reject_reason}</p>
              )}
            </div>

            {r.status === "pending_verification" ? (
              <div className="flex shrink-0 gap-2">
                <Button
                  size="sm"
                  disabled={busyId === r.id}
                  onClick={() => act(r.id, "approve")}
                  className="bg-emerald-600 text-white hover:bg-emerald-500"
                >
                  {busyId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="mr-1 h-4 w-4" />Approve</>}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyId === r.id}
                  onClick={() => act(r.id, "reject")}
                  className="border-red-200 text-red-600 hover:bg-red-50"
                >
                  <XCircle className="mr-1 h-4 w-4" />Reject
                </Button>
              </div>
            ) : (
              <span
                className={`inline-flex w-fit shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                  r.status === "approved" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                }`}
              >
                {r.status === "approved" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />} {r.status}
              </span>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default AdminSubscriptions;
