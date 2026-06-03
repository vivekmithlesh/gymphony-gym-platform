import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Flame, ShoppingBag, Tag, Loader2, PackageOpen, Coffee, Zap, Dumbbell } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { timeLeftLabel, isCampaignExpired } from "@/lib/campaign";

// A member's 30+ consecutive check-in days unlocks "streak" campaigns.
const STREAK_THRESHOLD = 30;

interface MemberGymStoreProps {
  memberId: string;
  /** gym_settings.id — products are stamped with this. */
  gymId?: string | null;
  /** gym_settings.gym_owner_id — campaigns are scoped to it. */
  gymOwnerId?: string | null;
}

interface StoreProduct {
  id: string;
  item_name: string;
  brand?: string | null;
  category?: string | null;
  price: number;
  stock_quantity: number;
  image_url?: string | null;
  description?: string | null;
}

interface Campaign {
  id: string;
  name: string;
  discount_percentage: number;
  target_type: "global" | "streak";
  applies_to: string;
  is_active: boolean;
  ends_at?: string | null;
}

// Local-day key so consecutive-day counting is timezone-stable.
const dayKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

const categoryIcon = (category?: string | null) => {
  if (category === "Drinks") return Coffee;
  if (category === "Gear") return Dumbbell;
  return Zap; // Supplements / default
};

export function MemberGymStore({ memberId, gymId, gymOwnerId }: MemberGymStoreProps) {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [streak, setStreak] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  // Ticks every 30s so the "ends in…" countdowns stay live.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  // ── Fetch the visible, in-stock products for this gym ────────────────────────
  const fetchProducts = useCallback(async () => {
    if (!gymId) return;
    const { data, error } = await supabase
      .from("inventory")
      .select("id, item_name, brand, category, price, stock_quantity, image_url, description")
      .eq("gym_id", gymId)
      .eq("show_in_app", true)
      .gt("stock_quantity", 0)
      .order("created_at", { ascending: false });
    if (!error) setProducts((data as StoreProduct[]) || []);
  }, [gymId]);

  // ── Fetch active campaigns for this gym's owner ──────────────────────────────
  const fetchCampaigns = useCallback(async () => {
    if (!gymOwnerId) return;
    const { data, error } = await supabase
      .from("campaigns")
      .select("id, name, discount_percentage, target_type, applies_to, is_active, ends_at")
      .eq("gym_owner_id", gymOwnerId)
      .eq("is_active", true);
    if (!error) setCampaigns((data as Campaign[]) || []);
  }, [gymOwnerId]);

  // ── Compute the member's current consecutive-day check-in streak ─────────────
  const fetchStreak = useCallback(async () => {
    // Pull the last ~120 days of check-ins; plenty for a 30-day streak.
    const since = new Date();
    since.setDate(since.getDate() - 120);
    const { data, error } = await supabase
      .from("check_ins")
      .select("check_in_time")
      .eq("member_id", memberId)
      .gte("check_in_time", since.toISOString());
    if (error || !data) {
      setStreak(0);
      return;
    }

    const days = new Set(data.map((c: { check_in_time: string }) => dayKey(c.check_in_time)));
    let count = 0;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    // Grace: if there's no check-in today yet, start counting from yesterday so
    // an active streak isn't broken just because they haven't been in today.
    if (!days.has(dayKey(cursor.toISOString()))) {
      cursor.setDate(cursor.getDate() - 1);
    }
    while (days.has(dayKey(cursor.toISOString()))) {
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    setStreak(count);
  }, [memberId]);

  useEffect(() => {
    let active = true;
    (async () => {
      setIsLoading(true);
      await Promise.all([fetchProducts(), fetchCampaigns(), fetchStreak()]);
      if (active) setIsLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [fetchProducts, fetchCampaigns, fetchStreak]);

  // ── Realtime: store + campaigns stay live for the member ─────────────────────
  useEffect(() => {
    if (!gymId && !gymOwnerId) return;
    const channel = supabase.channel(`member_store_${memberId}`);
    if (gymId) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inventory", filter: `gym_id=eq.${gymId}` },
        () => fetchProducts()
      );
    }
    if (gymOwnerId) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "campaigns", filter: `gym_owner_id=eq.${gymOwnerId}` },
        () => fetchCampaigns()
      );
    }
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [memberId, gymId, gymOwnerId, fetchProducts, fetchCampaigns]);

  // Buy via the secure RPC — server re-checks stock, re-derives the discount
  // (campaign + streak), records the sale and decrements stock atomically.
  const handleBuy = useCallback(
    async (productId: string) => {
      setBuyingId(productId);
      try {
        const { data, error } = await supabase.rpc("process_store_purchase", {
          p_product_id: productId,
          p_quantity: 1,
        });
        if (error) throw error;
        const result = (data ?? {}) as {
          success: boolean;
          error?: string;
          item_name?: string;
          total_amount?: number;
        };
        if (!result.success) {
          toast.error(result.error || "Could not complete the purchase.");
          return;
        }
        toast.success(
          `Purchased ${result.item_name ?? "item"} for ₹${Number(result.total_amount ?? 0).toLocaleString()}! 🎉`
        );
        fetchProducts(); // refresh stock (realtime also covers this)
      } catch (err: any) {
        const m = (err?.message || "").toLowerCase();
        const msg =
          m.includes("does not exist") || m.includes("function")
            ? "Purchases aren't enabled yet — run the store purchases migration."
            : err?.message || "Purchase failed.";
        toast.error(msg);
      } finally {
        setBuyingId(null);
      }
    },
    [fetchProducts]
  );

  const streakUnlocked = streak >= STREAK_THRESHOLD;
  const hasStreakCampaign = useMemo(() => campaigns.some((c) => c.target_type === "streak"), [campaigns]);

  // ── Pick the best applicable campaign per product ────────────────────────────
  const pricedProducts = useMemo(() => {
    return products.map((product) => {
      const applicable = campaigns.filter((c) => {
        if (!c.is_active) return false;
        if (isCampaignExpired(c.ends_at)) return false; // auto-expired
        const categoryOk = c.applies_to === "All" || c.applies_to === product.category;
        if (!categoryOk) return false;
        if (c.target_type === "streak") return streakUnlocked;
        return true; // global applies to everyone
      });

      const best = applicable.reduce<Campaign | null>(
        (acc, c) => (!acc || c.discount_percentage > acc.discount_percentage ? c : acc),
        null
      );

      const discountPct = best ? Number(best.discount_percentage) : 0;
      const finalPrice = best ? Math.round(product.price * (1 - discountPct / 100)) : product.price;

      return { product, best, discountPct, finalPrice };
    });
    // nowMs is included so an expiring campaign drops off live without a refetch.
  }, [products, campaigns, streakUnlocked, nowMs]);

  if (isLoading) {
    return (
      <div className="flex min-h-[18rem] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
          <ShoppingBag className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Gym Store</h2>
          <p className="text-sm text-slate-500">Supplements, drinks & gear from your gym.</p>
        </div>
      </div>

      {/* Streak status — only when a streak campaign is live */}
      {hasStreakCampaign && (
        <div
          className={`flex items-center gap-3 rounded-2xl border p-4 ${
            streakUnlocked
              ? "border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50"
              : "border-slate-200 bg-slate-50"
          }`}
        >
          <Flame className={`h-6 w-6 shrink-0 ${streakUnlocked ? "text-orange-500" : "text-slate-400"}`} />
          <p className="text-sm font-medium text-slate-700">
            {streakUnlocked ? (
              <>
                You're on a <span className="font-bold text-orange-600">{streak}-day streak</span> — streak deals
                unlocked! 🔥
              </>
            ) : (
              <>
                You're on a <span className="font-bold text-slate-900">{streak}-day streak</span>. Check in{" "}
                <span className="font-bold text-orange-600">{STREAK_THRESHOLD - streak} more day{STREAK_THRESHOLD - streak === 1 ? "" : "s"}</span>{" "}
                to unlock exclusive discounts.
              </>
            )}
          </p>
        </div>
      )}

      {pricedProducts.length === 0 ? (
        <div className="flex min-h-[16rem] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-center">
          <PackageOpen className="h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">The store is empty right now.</p>
          <p className="text-xs text-slate-400">Check back soon — your gym hasn't listed any products yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {pricedProducts.map(({ product, best, discountPct, finalPrice }) => {
            const Icon = categoryIcon(product.category);
            const isStreakDeal = best?.target_type === "streak";
            const countdown = best?.ends_at ? timeLeftLabel(best.ends_at, nowMs) : null;
            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow-lg"
              >
                {/* Discount badge */}
                {best && (
                  <div className="absolute left-4 top-4 z-10">
                    {isStreakDeal ? (
                      <Badge className="gap-1 border-none bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-[0_0_18px_rgba(249,115,22,0.6)]">
                        <Flame className="h-3 w-3" />
                        Streak Unlocked! {discountPct}% Off
                      </Badge>
                    ) : (
                      <Badge className="gap-1 border-none bg-violet-600 text-white shadow-md">
                        <Tag className="h-3 w-3" />
                        {discountPct}% Off
                      </Badge>
                    )}
                  </div>
                )}

                {/* Image */}
                <div className="aspect-square w-full overflow-hidden bg-slate-50">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.item_name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center text-slate-300">
                      <Icon className="h-16 w-16 opacity-30" />
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="space-y-2 p-5">
                  {product.brand && (
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{product.brand}</p>
                  )}
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-slate-900">{product.item_name}</h3>
                    {product.category && (
                      <span className="shrink-0 rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {product.category}
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-2 pt-1">
                    {best ? (
                      <>
                        <span
                          className={`text-2xl font-black ${isStreakDeal ? "text-orange-600" : "text-violet-600"}`}
                        >
                          ₹{finalPrice.toLocaleString()}
                        </span>
                        <span className="text-sm font-medium text-slate-400 line-through">
                          ₹{product.price.toLocaleString()}
                        </span>
                      </>
                    ) : (
                      <span className="text-2xl font-black text-slate-900">₹{product.price.toLocaleString()}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <p className="text-xs text-slate-400">{product.stock_quantity} in stock</p>
                    {countdown && countdown !== "Ended" && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          isStreakDeal ? "bg-orange-100 text-orange-700" : "bg-violet-100 text-violet-700"
                        }`}
                      >
                        ⏳ {countdown}
                      </span>
                    )}
                  </div>

                  <Button
                    onClick={() => handleBuy(product.id)}
                    disabled={buyingId === product.id || product.stock_quantity < 1}
                    className={`mt-3 h-11 w-full rounded-xl font-bold text-white transition-all ${
                      isStreakDeal
                        ? "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                        : "bg-violet-600 hover:bg-violet-700"
                    } disabled:opacity-60`}
                  >
                    {buyingId === product.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Buying…
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="mr-2 h-4 w-4" />
                        Buy · ₹{finalPrice.toLocaleString()}
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MemberGymStore;
