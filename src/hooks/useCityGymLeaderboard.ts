import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/supabase";

export type GymLeaderboardEntry = {
  gym_id: string;
  rank: number;
  gym_name: string;
  logo_url: string | null;
  /** Total Vibe Score = aggregated calorie points of all the gym's members */
  vibe_points: number;
  city: string;
  latitude: number | null;
  longitude: number | null;
  email: string | null;
  mobile_number: string | null;
  /** flips briefly when a member of this gym logs a workout (drives the pulse) */
  is_active: boolean;
};

type GymSettingsRow = {
  id: string;
  gym_name?: string | null;
  city?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  logo_url?: string | null;
  owner_email?: string | null;
  contact_number?: string | null;
};

type WorkoutLogRow = { gym_id?: string | null; calories_burned?: number | string | null };
type GymProfileRow = {
  gym_id?: string | null;
  id?: string | null;
  vibe_points?: number | string | null;
};

const toNumber = (value: unknown) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const toCoord = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) && n !== 0 ? n : null;
};

/**
 * City-wide GYM leaderboard. Ranks every gym in `city` by its Total Vibe Score
 * — the sum of calories burned by all of that gym's members. Keyed strictly by
 * gym_settings.id so a gym can never appear twice, and kept live by subscribing
 * to workout_logs.
 */
export function useCityGymLeaderboard(city: string = "ALIGARH") {
  const [leaderboard, setLeaderboard] = useState<GymLeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeGymsRef = useRef<Set<string>>(new Set());
  const activeTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const [pulseVersion, setPulseVersion] = useState(0);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setIsLoading(true);

      // gym_settings is the single source of identity (id, name, coords, logo).
      // Aggregating from here guarantees one row per real gym — no duplicates.
      const [gymsRes, logsRes, profilesRes] = await Promise.all([
        supabase
          .from("gym_settings")
          .select("id, gym_name, city, latitude, longitude, logo_url, owner_email, contact_number"),
        supabase.from("workout_logs").select("gym_id, calories_burned"),
        // Legacy fallback score so a gym with vibe_points but no logs isn't shown as 0.
        supabase.from("gym_profiles").select("id, gym_id, vibe_points"),
      ]);

      const gyms = (gymsRes.data as GymSettingsRow[] | null) ?? [];
      const logs = (logsRes.data as WorkoutLogRow[] | null) ?? [];
      const profiles = (profilesRes.data as GymProfileRow[] | null) ?? [];

      // Sum member calories per gym.
      const burnByGym = new Map<string, number>();
      for (const log of logs) {
        if (!log.gym_id) continue;
        const key = String(log.gym_id);
        burnByGym.set(key, (burnByGym.get(key) || 0) + toNumber(log.calories_burned));
      }

      // Legacy vibe_points keyed by either id or gym_id.
      const legacyByGym = new Map<string, number>();
      for (const p of profiles) {
        const key = p.gym_id ? String(p.gym_id) : p.id ? String(p.id) : null;
        if (!key) continue;
        legacyByGym.set(key, Math.max(legacyByGym.get(key) || 0, toNumber(p.vibe_points)));
      }

      const target = city.trim().toUpperCase();

      const entries: GymLeaderboardEntry[] = gyms
        .map((g) => {
          const id = String(g.id);
          const burn = burnByGym.get(id) || 0;
          const legacy = legacyByGym.get(id) || 0;
          return {
            gym_id: id,
            rank: 0,
            gym_name: (g.gym_name || "Unknown Gym").trim(),
            logo_url: g.logo_url || null,
            vibe_points: Math.max(burn, legacy),
            city: (g.city || "ALIGARH").trim(),
            latitude: toCoord(g.latitude),
            longitude: toCoord(g.longitude),
            email: g.owner_email ?? null,
            mobile_number: g.contact_number ?? null,
            is_active: activeGymsRef.current.has(id),
          };
        })
        // Case-insensitive city filter; blank city defaults into ALIGARH.
        .filter((e) => {
          const c = e.city.toUpperCase();
          return c === target || (target === "ALIGARH" && (c === "" || c === "ALIGARH"));
        })
        .sort((a, b) => b.vibe_points - a.vibe_points || a.gym_name.localeCompare(b.gym_name))
        .map((e, i) => ({ ...e, rank: i + 1 }));

      setLeaderboard(entries);
    } catch (error) {
      console.error("City gym leaderboard fetch failed:", error);
    } finally {
      setIsLoading(false);
    }
  }, [city]);

  const refresh = useCallback(() => {
    if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    refreshTimeoutRef.current = setTimeout(() => void fetchLeaderboard(), 400);
  }, [fetchLeaderboard]);

  const pulseGym = useCallback((gymId: string) => {
    const key = String(gymId);
    activeGymsRef.current.add(key);
    setPulseVersion((v) => v + 1);

    const existing = activeTimersRef.current.get(key);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      activeGymsRef.current.delete(key);
      activeTimersRef.current.delete(key);
      setPulseVersion((v) => v + 1);
    }, 6000);
    activeTimersRef.current.set(key, timer);
  }, []);

  useEffect(() => {
    void fetchLeaderboard();
  }, [fetchLeaderboard]);

  useEffect(() => {
    const channel = supabase
      .channel(`city-gym-leaderboard-${city.toLowerCase()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "workout_logs" },
        (payload) => {
          const row = (payload.new ?? payload.old) as WorkoutLogRow | undefined;
          if (row?.gym_id) pulseGym(String(row.gym_id));
          refresh();
        },
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "gym_settings" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "gym_profiles" }, refresh)
      .subscribe((status) => setIsRealtimeConnected(status === "SUBSCRIBED"));

    return () => {
      supabase.removeChannel(channel);
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      activeTimersRef.current.forEach((t) => clearTimeout(t));
      activeTimersRef.current.clear();
      activeGymsRef.current.clear();
    };
  }, [city, pulseGym, refresh]);

  useEffect(() => {
    setLeaderboard((prev) =>
      prev.map((e) => ({ ...e, is_active: activeGymsRef.current.has(e.gym_id) })),
    );
  }, [pulseVersion]);

  return { leaderboard, isLoading, isRealtimeConnected, refresh: fetchLeaderboard };
}
