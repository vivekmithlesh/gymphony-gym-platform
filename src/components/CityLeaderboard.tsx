import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Crown,
  Dumbbell,
  Flame,
  Loader2,
  MapPin,
  Medal,
  Trophy,
  Wifi,
} from "lucide-react";
import { useCityGymLeaderboard, type GymLeaderboardEntry } from "@/hooks/useCityGymLeaderboard";

// Map is client-only (Leaflet touches `window`), so load it lazily after mount.
const CityLeaderboardMap = lazy(() => import("./CityLeaderboardMap"));

const CITY = "ALIGARH";

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "GP";

/* -------------------------------------------------------------------------- */
/*  Gym avatar — shows the logo, and falls back to gradient initials instead   */
/*  of a broken-image placeholder.                                             */
/* -------------------------------------------------------------------------- */
const GymAvatar = ({
  entry,
  className,
  variant = "purple",
}: {
  entry: GymLeaderboardEntry;
  className?: string;
  variant?: "gold" | "silver" | "bronze" | "purple";
}) => {
  const [failed, setFailed] = useState(false);
  const ring =
    variant === "gold"
      ? "from-amber-300 to-orange-500"
      : variant === "silver"
        ? "from-slate-200 to-slate-400"
        : variant === "bronze"
          ? "from-orange-300 to-amber-700"
          : "from-purple-500 to-indigo-600";

  return (
    <div
      className={`overflow-hidden rounded-full bg-linear-to-br ${ring} flex items-center justify-center ${className ?? ""}`}
    >
      {entry.logo_url && !failed ? (
        <img
          src={entry.logo_url}
          alt={entry.gym_name}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="font-black text-white">{initials(entry.gym_name)}</span>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Concentric energy rings — radius / count / glow scale with the vibe score. */
/* -------------------------------------------------------------------------- */
const ConcentricRings = ({ intensity, active }: { intensity: number; active: boolean }) => {
  const clamped = Math.max(0.15, Math.min(1, intensity));
  const ringCount = 2 + Math.round(clamped * 2); // 2..4
  return (
    <>
      {Array.from({ length: ringCount }).map((_, i) => {
        const step = (i + 1) / ringCount;
        const spread = 14 + clamped * 34 * step; // px beyond the avatar
        const opacity = 0.1 + (1 - step) * 0.3 * (0.5 + clamped);
        return (
          <motion.span
            key={i}
            className="absolute rounded-full border-2"
            style={{
              inset: -spread,
              borderColor: `rgba(124, 58, 237, ${opacity})`,
            }}
            animate={
              active
                ? { scale: [1, 1.1, 1], opacity: [opacity, opacity * 1.9, opacity] }
                : { scale: 1, opacity }
            }
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.3, ease: "easeOut" }}
          />
        );
      })}
    </>
  );
};

/* -------------------------------------------------------------------------- */
/*  Podium card                                                                */
/* -------------------------------------------------------------------------- */
const PODIUM_META = {
  1: {
    variant: "gold",
    badge: "from-amber-300 to-orange-500",
    text: "text-amber-950",
    avatar: "h-24 w-24 sm:h-28 sm:w-28",
    order: "order-2 md:order-2",
    align: "self-end",
  },
  2: {
    variant: "silver",
    badge: "from-slate-200 to-slate-400",
    text: "text-slate-700",
    avatar: "h-20 w-20 sm:h-24 sm:w-24",
    order: "order-1 md:order-1",
    align: "self-end",
  },
  3: {
    variant: "bronze",
    badge: "from-orange-300 to-amber-700",
    text: "text-white",
    avatar: "h-20 w-20 sm:h-24 sm:w-24",
    order: "order-3 md:order-3",
    align: "self-end",
  },
} as const;

const PodiumCard = ({ entry, topScore }: { entry: GymLeaderboardEntry; topScore: number }) => {
  const meta = PODIUM_META[entry.rank as 1 | 2 | 3] ?? PODIUM_META[3];
  const intensity = topScore > 0 ? entry.vibe_points / topScore : 0;
  const isLeader = entry.rank === 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: entry.rank * 0.12, type: "spring", stiffness: 220, damping: 22 }}
      className={`flex w-full flex-col items-center ${meta.order} ${meta.align}`}
    >
      {/* Pedestal */}
      <div
        className={`relative flex w-full flex-col items-center rounded-t-2xl border-t-2 px-2 pt-16 pb-4 ${
          isLeader
            ? "min-h-48 border-amber-300 bg-linear-to-b from-amber-100 to-amber-50"
            : "min-h-40 border-slate-200 bg-linear-to-b from-slate-100 to-slate-50"
        }`}
      >
        {/* Avatar + rings */}
        <div className="absolute -top-12 mb-3 flex items-center justify-center">
          {isLeader && <ConcentricRings intensity={Math.max(intensity, 0.6)} active />}
          {isLeader && (
            <Crown className="absolute -top-9 z-20 h-8 w-8 fill-amber-400 text-amber-500 drop-shadow" />
          )}
          <div className="relative z-10">
            <GymAvatar
              entry={entry}
              variant={meta.variant}
              className={`${meta.avatar} border-4 border-white shadow-xl ${isLeader ? "text-2xl" : "text-xl"}`}
            />
            <span
              className={`absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-linear-to-br ${meta.badge} ${meta.text} flex h-7 min-w-7 items-center justify-center px-2 text-xs font-black shadow-md ring-2 ring-white`}
            >
              #{entry.rank}
            </span>
          </div>
        </div>

        <p className="mb-1 line-clamp-2 px-1 text-center text-sm font-black uppercase leading-tight text-slate-900 sm:text-base">
          {entry.gym_name}
        </p>
        <div className="mb-3 flex items-center gap-1">
          <Flame
            className={`h-4 w-4 text-orange-500 ${entry.is_active ? "animate-pulse" : ""} fill-orange-500`}
          />
          <span className="text-lg font-black text-purple-700 tabular-nums sm:text-xl">
            {entry.vibe_points.toLocaleString()}
          </span>
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Total Vibe Score
        </span>
      </div>
    </motion.div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Stat pill                                                                  */
/* -------------------------------------------------------------------------- */
const StatPill = ({
  icon: Icon,
  children,
  tone = "default",
}: {
  icon: React.ElementType;
  children: React.ReactNode;
  tone?: "default" | "live";
}) => (
  <div
    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold shadow-sm ${
      tone === "live"
        ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200"
        : "bg-white text-slate-700 ring-1 ring-slate-100"
    }`}
  >
    <Icon className={`h-4 w-4 ${tone === "live" ? "text-emerald-500" : "text-purple-600"}`} />
    {children}
  </div>
);

/* -------------------------------------------------------------------------- */
/*  Main component                                                             */
/* -------------------------------------------------------------------------- */
export const CityLeaderboard = () => {
  const { leaderboard, isLoading, isRealtimeConnected } = useCityGymLeaderboard(CITY);

  // Only mount Leaflet on the client.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const topThree = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);
  const topScore = useMemo(
    () => leaderboard.reduce((m, e) => Math.max(m, e.vibe_points), 0),
    [leaderboard],
  );
  const hasMapData = leaderboard.some((g) => g.latitude != null && g.longitude != null);

  if (isLoading) {
    return (
      <div className="flex min-h-100 flex-col items-center justify-center gap-3">
        <Loader2 className="h-12 w-12 animate-spin text-purple-600" />
        <p className="text-sm font-medium text-slate-400">Loading the city rankings…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-10 p-4 md:p-8">
      {/* ---------- Header ---------- */}
      <div className="space-y-5 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-700 shadow-sm ring-1 ring-slate-100">
          <Trophy className="h-4 w-4 text-amber-500" /> Live {CITY} Rankings
        </div>
        <h1 className="text-4xl font-black uppercase tracking-tight text-slate-900 sm:text-6xl">
          Gym{" "}
          <span className="bg-linear-to-r from-purple-600 to-violet-500 bg-clip-text italic text-transparent">
            Phonics
          </span>
        </h1>
        <p className="mx-auto max-w-xl text-sm font-medium text-slate-500 sm:text-base">
          The ultimate vibe check. Ranking {CITY}&apos;s gyms by the sweat, burn, and energy of
          their real members.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <StatPill icon={Activity}>{leaderboard.length} Gyms Live</StatPill>
          <StatPill icon={MapPin}>{CITY}</StatPill>
          <StatPill icon={Wifi} tone="live">
            {isRealtimeConnected ? "Connected Live" : "Reconnecting…"}
          </StatPill>
        </div>
      </div>

      {/* ---------- Podium ---------- */}
      {topThree.length > 0 ? (
        <div className="grid grid-cols-3 items-end gap-2 sm:gap-4">
          {topThree.map((entry) => (
            <PodiumCard key={entry.gym_id} entry={entry} topScore={topScore} />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 p-12 text-center">
          <Flame className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-bold text-slate-600">No gyms ranked yet in {CITY}</p>
        </div>
      )}

      {/* ---------- Interactive Map ---------- */}
      {hasMapData && (
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-black uppercase tracking-tight text-slate-900">
            <MapPin className="h-5 w-5 text-purple-600" /> The Arena Map
          </h2>
          <div className="rounded-3xl bg-white p-2 shadow-sm ring-1 ring-slate-100">
            {mounted ? (
              <Suspense
                fallback={
                  <div className="flex h-115 items-center justify-center rounded-3xl bg-slate-50">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                  </div>
                }
              >
                <CityLeaderboardMap entries={leaderboard} />
              </Suspense>
            ) : (
              <div className="h-115 rounded-3xl bg-slate-50" />
            )}
          </div>
        </div>
      )}

      {/* ---------- Full rankings (4th onward) ---------- */}
      {rest.length > 0 && (
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-black uppercase tracking-tight text-slate-900">
            <Medal className="h-5 w-5 text-purple-600" /> The Chasing Pack
          </h2>
          <div className="space-y-2">
            {rest.map((gym) => (
              <motion.div
                key={gym.gym_id}
                layout
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-3 pr-5 shadow-sm transition-all hover:border-purple-100 hover:shadow-md"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-7 text-center text-sm font-black text-slate-400">
                    #{gym.rank}
                  </span>
                  <GymAvatar entry={gym} className="h-11 w-11 text-sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-800">{gym.gym_name}</p>
                    <p className="flex items-center gap-1 text-xs text-slate-400">
                      <Dumbbell className="h-3 w-3" /> {gym.city}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Flame className="h-4 w-4 fill-orange-400 text-orange-500" />
                  <span className="text-base font-black text-purple-700 tabular-nums">
                    {gym.vibe_points.toLocaleString()}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CityLeaderboard;
