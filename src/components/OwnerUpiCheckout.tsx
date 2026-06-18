import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Smartphone, CheckCircle2, Loader2, AlertCircle, ExternalLink, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/supabase";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import { PLANS, formatINR, type PlanTier, type BillingCycle } from "@/lib/plans";
import { getPlatformUpi, submitSubscriptionPayment, type PlatformUpi } from "@/lib/platform-billing";
import { isValidUtr } from "@/lib/utr";

interface OwnerUpiCheckoutProps {
  open: boolean;
  onClose: () => void;
  tier: PlanTier | null;
  cycle: BillingCycle;
  /** Called after a pending subscription payment is recorded. */
  onSubmitted?: () => void;
}

// Manual-UPI subscription checkout (gym owner → platform). Mirrors the member
// MemberUpiCheckout: the owner scans the PLATFORM's UPI QR, pays in their own
// app, enters the UTR, and submits a 'pending_verification' subscription_payment
// for a platform admin to approve. The amount is recomputed server-side.
export function OwnerUpiCheckout({ open, onClose, tier, cycle, onSubmitted }: OwnerUpiCheckoutProps) {
  const { user } = useAuth();
  const [upi, setUpi] = useState<PlatformUpi | null>(null);
  const [loadingUpi, setLoadingUpi] = useState(false);
  const [utr, setUtr] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const plan = tier ? PLANS[tier] : null;
  const amount = useMemo(() => {
    if (!plan) return 0;
    return cycle === "yearly" ? plan.priceYearlyTotal : plan.priceMonthly;
  }, [plan, cycle]);

  // Load the platform UPI when opened; clear proof when closed.
  useEffect(() => {
    if (!open) {
      setUtr("");
      setEvidenceUrl(null);
      return;
    }
    let cancelled = false;
    setLoadingUpi(true);
    getPlatformUpi()
      .then((u) => {
        if (!cancelled) setUpi(u);
      })
      .finally(() => {
        if (!cancelled) setLoadingUpi(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const upiUri = useMemo(() => {
    if (!upi?.upi_id || !amount) return "";
    const pn = encodeURIComponent(upi.name || "Gymphony");
    return `upi://pay?pa=${upi.upi_id.trim()}&pn=${pn}&am=${amount}&cu=INR`;
  }, [upi, amount]);

  const handleEvidence = async (file: File) => {
    if (!user?.id) return;
    setIsUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${user.id}/sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage
        .from("payment-evidence")
        .upload(path, file, { upsert: false, contentType: file.type || "image/jpeg" });
      if (error) throw error;
      const { data } = supabase.storage.from("payment-evidence").getPublicUrl(path);
      setEvidenceUrl(data.publicUrl);
      toast.success("Proof attached.");
    } catch (err: any) {
      toast.error(`Could not upload proof: ${err.message || "please try again."}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handlePaid = async () => {
    if (!tier) return;
    if (!isValidUtr(utr)) {
      toast.error("Enter the UPI reference / UTR number from your payment app (12+ digits).");
      return;
    }
    setIsSubmitting(true);
    const res = await submitSubscriptionPayment({ tier, cycle, utr: utr.trim(), evidenceUrl });
    setIsSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Payment submitted! We'll verify and activate your plan shortly.");
    setUtr("");
    setEvidenceUrl(null);
    onSubmitted?.();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-violet-500" />
            Upgrade to {plan?.name ?? "plan"}
          </DialogTitle>
          <DialogDescription>
            {plan ? <>{plan.name} · {cycle} · {formatINR(amount)}</> : "Subscription payment"}
          </DialogDescription>
        </DialogHeader>

        {loadingUpi ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
          </div>
        ) : !upi?.upi_id ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <AlertCircle className="h-10 w-10 text-amber-500" />
            <p className="text-sm font-medium text-slate-700">Subscription billing isn't set up yet.</p>
            <p className="text-xs text-muted-foreground">Please contact support to upgrade your plan.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <QRCodeSVG value={upiUri} size={208} level="M" includeMargin />
            </div>

            <div className="text-center">
              <p className="text-xs text-muted-foreground">Scan with any UPI app, or pay to</p>
              <p className="font-bold text-slate-900">{upi.upi_id}</p>
              {upi.name && <p className="text-xs text-muted-foreground">{upi.name}</p>}
              <p className="mt-1 text-lg font-black text-slate-900">{formatINR(amount)}</p>
            </div>
            {upi.note && <p className="text-center text-[11px] text-muted-foreground">{upi.note}</p>}

            <a
              href={upiUri}
              className="inline-flex items-center gap-1 text-sm font-semibold text-violet-600 hover:text-violet-700"
            >
              <ExternalLink className="h-4 w-4" /> Open in a UPI app
            </a>

            <div className="w-full space-y-2 pt-1">
              <label className="text-xs font-semibold text-slate-700">
                UPI reference / UTR number <span className="text-red-500">*</span>
              </label>
              <input
                value={utr}
                onChange={(e) => setUtr(e.target.value)}
                inputMode="numeric"
                placeholder="e.g. 412345678901"
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-900 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
              />
              <p className="text-[11px] text-muted-foreground">
                From your UPI app's payment receipt — it lets us verify your payment.
              </p>

              <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-violet-600 hover:text-violet-700">
                <Paperclip className="h-4 w-4" />
                {isUploading ? "Uploading…" : evidenceUrl ? "Screenshot attached ✓" : "Attach payment screenshot (optional)"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={isUploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleEvidence(f);
                  }}
                />
              </label>
            </div>

            <Button
              onClick={handlePaid}
              disabled={isSubmitting || isUploading || !isValidUtr(utr)}
              className="mt-2 h-12 w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 font-bold text-white hover:from-violet-500 hover:to-fuchsia-500"
            >
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting…</>
              ) : (
                <><CheckCircle2 className="mr-2 h-4 w-4" />I have paid via UPI</>
              )}
            </Button>

            <p className="text-center text-[11px] text-muted-foreground">
              Your plan activates once we verify this payment.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default OwnerUpiCheckout;
