import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getPlatformUpi, setPlatformUpi } from "@/lib/platform-billing";

// Admin editor for the platform UPI details owners pay subscriptions to.
export function AdminUpiConfig() {
  const [upiId, setUpiId] = useState("");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getPlatformUpi()
      .then((u) => {
        if (cancelled) return;
        setUpiId(u.upi_id);
        setName(u.name);
        setNote(u.note);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await setPlatformUpi(upiId.trim(), name.trim(), note.trim());
      toast.success("Platform UPI updated.");
    } catch (e: any) {
      toast.error(e?.message || "Could not save UPI details.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-border bg-white shadow-soft">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-slate-900">Platform UPI</CardTitle>
        <CardDescription>Where gym owners send subscription payments.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="p-upi">UPI ID</Label>
              <Input id="p-upi" value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="platform@upi" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-name">Account holder name</Label>
              <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Gymphony Pvt Ltd" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-note">Note (optional)</Label>
              <Input id="p-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Shown to owners at checkout" />
            </div>
            <Button onClick={save} disabled={saving} className="h-11 rounded-xl bg-slate-900 font-bold text-white">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save UPI details"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default AdminUpiConfig;
