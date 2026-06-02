import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Dumbbell, Flame, Trophy } from "lucide-react";
import type { GymLeaderboardEntry } from "@/hooks/useCityGymLeaderboard";

/**
 * Leaflet map for the city gym leaderboard. Lives in its own module so the
 * `leaflet` / `react-leaflet` imports are only evaluated on the client (the
 * parent loads it via React.lazy after mount) — keeping SSR safe.
 */

const markerStyles = `
  @keyframes gpWave { 0% { transform: scale(0.6); opacity: 0.9; } 100% { transform: scale(2.6); opacity: 0; } }
  .gp-marker { position: relative; display: flex; align-items: center; justify-content: center; }
  .gp-wave { position: absolute; border-radius: 9999px; background: rgba(124, 58, 237, 0.30); animation: gpWave 2s infinite ease-out; pointer-events: none; }
  .gp-wave-2 { animation-delay: 0.66s; }
  .gp-wave-3 { animation-delay: 1.33s; }
  .gp-core { position: relative; z-index: 5; display: flex; align-items: center; justify-content: center; color: #fff; border: 2px solid #fff; border-radius: 9999px; box-shadow: 0 6px 16px rgba(76, 29, 149, 0.45); }
  .gp-core-1 { background: linear-gradient(135deg, #f59e0b, #f97316); }
  .gp-core-2 { background: linear-gradient(135deg, #a78bfa, #7c3aed); }
  .gp-popup .leaflet-popup-content-wrapper { border-radius: 18px; padding: 0; overflow: hidden; box-shadow: 0 20px 45px rgba(15, 23, 42, 0.25); }
  .gp-popup .leaflet-popup-content { margin: 0; width: auto !important; }
  .gp-popup .leaflet-popup-tip { background: #fff; }
`;

const ALIGARH_CENTER: [number, number] = [27.8974, 78.088];

const buildIcon = (entry: GymLeaderboardEntry) => {
  const base = entry.rank === 1 ? 40 : 32;
  // Cap the vibe points contribution to prevent gigantic radius on high scores.
  // Max of 20px added to the radius from points.
  const pointsContribution = Math.min(20, entry.vibe_points / 250);
  const wave = base + 18 + pointsContribution;
  const isLeader = entry.rank === 1;

  return L.divIcon({
    className: "gp-custom-icon",
    html: `
      <div class="gp-marker" style="width:${base}px;height:${base}px;">
        <div class="gp-wave" style="width:${wave}px;height:${wave}px;"></div>
        <div class="gp-wave gp-wave-2" style="width:${wave}px;height:${wave}px;"></div>
        <div class="gp-wave gp-wave-3" style="width:${wave}px;height:${wave}px;"></div>
        <div class="gp-core ${isLeader ? "gp-core-1" : "gp-core-2"}" style="width:${base}px;height:${base}px;font-weight:800;font-size:${isLeader ? 15 : 12}px;">
          ${isLeader ? "★" : "#" + entry.rank}
        </div>
      </div>`,
    iconSize: [base, base],
    iconAnchor: [base / 2, base / 2],
  });
};

const CityLeaderboardMap = ({ entries }: { entries: GymLeaderboardEntry[] }) => {
  const located = entries.filter((g) => g.latitude != null && g.longitude != null);
  const center: [number, number] = located.length
    ? [located[0].latitude as number, located[0].longitude as number]
    : ALIGARH_CENTER;

  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-slate-200 shadow-inner">
      <style>{markerStyles}</style>
      <MapContainer center={center} zoom={13} scrollWheelZoom={false} className="z-0 h-115 w-full">
        <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
        {located.map((gym) => (
          <Marker
            key={gym.gym_id}
            position={[gym.latitude as number, gym.longitude as number]}
            icon={buildIcon(gym)}
          >
            <Popup className="gp-popup">
              <div className="w-64 font-sans">
                {/* Header */}
                <div className="flex items-center justify-between gap-2 bg-linear-to-r from-purple-600 to-indigo-600 px-4 py-3 text-white">
                  <h3 className="flex min-w-0 items-center gap-1.5 truncate text-sm font-black">
                    <Dumbbell className="h-4 w-4 shrink-0" /> {gym.gym_name}
                  </h3>
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-black">
                    <Trophy className="h-3 w-3" /> #{gym.rank}
                  </span>
                </div>
                {/* Score */}
                <div className="space-y-2 p-4">
                  <div className="flex items-center justify-between rounded-xl border border-orange-100 bg-orange-50 px-3 py-2">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      Total Vibe Score
                    </span>
                    <span className="flex items-center gap-1 text-base font-black text-orange-600">
                      <Flame className="h-4 w-4 fill-orange-500 text-orange-500" />
                      {gym.vibe_points.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-center text-[11px] font-medium text-slate-400">
                    {((gym.vibe_points || 0) * 1.4).toFixed(0)} kcal / hr burned · live
                  </p>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default CityLeaderboardMap;
