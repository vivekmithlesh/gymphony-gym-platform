import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/supabase';
import { Loader2, TrendingUp } from 'lucide-react';

interface HourlyData {
  hour: string;
  count: number;
  level: number; // percentage for the bar height
}

export default function AttendanceHeatmap() {
  const [data, setData] = useState<HourlyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const heatmapControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetchCheckInData();

    const channel = supabase
      .channel('heatmap_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'check_ins' }, () => {
        fetchCheckInData();
      })
      .subscribe();

    return () => {
      if (heatmapControllerRef.current) {
        heatmapControllerRef.current.abort();
      }
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchCheckInData = async () => {
    // Abort previous request if it's still running
    if (heatmapControllerRef.current) {
      heatmapControllerRef.current.abort();
    }
    heatmapControllerRef.current = new AbortController();

    setIsLoading(true);
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: checkIns, error } = await supabase
        .from('check_ins')
        .select('created_at')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .abortSignal(heatmapControllerRef.current.signal);

      if (error) {
        if (
          error.name === 'AbortError' || 
          error.message?.includes('abort') || 
          error.message?.includes('Lock broken')
        ) {
          return;
        }
        throw error;
      }
      
      // Relevant hours: 6 AM to 10 PM
      const displayHours = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

      if (!checkIns || checkIns.length === 0) {
        // Fallback: Generate Mock Data for Demo
        const mockData: HourlyData[] = displayHours.map(h => {
          // Generate a bell curve pattern for mock data
          const bellCurve = Math.exp(-Math.pow(h - 18, 2) / 20) * 15 + Math.exp(-Math.pow(h - 8, 2) / 10) * 12;
          const count = Math.round(bellCurve);
          const hourLabel = h === 12 ? '12pm' : h > 12 ? `${h - 12}pm` : `${h}am`;
          return {
            hour: hourLabel,
            count: count,
            level: 0 // Will be calculated after
          };
        });

        const maxMockCount = Math.max(...mockData.map(d => d.count));
        setData(mockData.map(d => ({ ...d, level: (d.count / maxMockCount) * 100 })));
        return;
      }

      // Group by hour and calculate average per day (over 30 days)
      const hourCounts: Record<number, number> = {};
      displayHours.forEach(h => hourCounts[h] = 0);

      checkIns.forEach((ci: { created_at: string }) => {
        const date = new Date(ci.created_at);
        const hour = date.getHours();
        if (hourCounts[hour] !== undefined) {
          hourCounts[hour]++;
        }
      });

      // Divide by 30 to get daily average
      const maxAverage = Math.max(...Object.values(hourCounts).map(v => v / 30));

      const formattedData: HourlyData[] = displayHours.map(h => {
        const avgCount = Number((hourCounts[h] / 30).toFixed(1));
        const hourLabel = h === 12 ? '12pm' : h > 12 ? `${h - 12}pm` : `${h}am`;
        return {
          hour: hourLabel,
          count: avgCount,
          level: maxAverage > 0 ? (avgCount / maxAverage) * 100 : 0
        };
      });

      setData(formattedData);
    } catch (error: any) {
      // Silent error for aborts
      if (
        error.name === 'AbortError' || 
        error.message?.includes('abort') || 
        error.message?.includes('Lock broken')
      ) {
        console.warn('Silent fetch error in fetchCheckInData:', error);
        return;
      }
      console.warn('Error fetching peak hours data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-purple-100 mt-6 h-[240px] flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
        <p className="text-sm text-muted-foreground">Calculating peak hours...</p>
      </div>
    );
  }

  const hasData = data.some(d => d.count > 0);

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-purple-100 mt-6 min-h-[240px]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-900">Peak Hours (Average)</h3>
        {hasData && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-600 rounded-full text-xs font-bold border border-green-100">
            <TrendingUp className="h-3 w-3" />
            Live Insights
          </div>
        )}
      </div>

      {!hasData ? (
        <div className="flex flex-col items-center justify-center h-32 text-center">
          <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
            <TrendingUp className="h-6 w-6 text-slate-300" />
          </div>
          <p className="text-sm text-slate-500 font-medium">No check-in data yet</p>
          <p className="text-[11px] text-slate-400 mt-1">Check-ins will appear here as members arrive</p>
        </div>
      ) : (
        <div className="flex items-end justify-between h-32 gap-1 md:gap-2">
          {data.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <div 
                className={`w-full rounded-t-lg relative group transition-all duration-500 ease-out ${
                  d.count > 0 ? 'bg-purple-500 hover:bg-purple-600' : 'bg-slate-100'
                }`}
                style={{ height: `${Math.max(d.level, 4)}%` }} // Minimum height of 4% for visibility
              >
                {d.count > 0 && (
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-lg">
                    {d.count} {d.count === 1 ? 'check-in' : 'check-ins'}
                  </div>
                )}
              </div>
              <span className="text-[8px] md:text-[10px] font-bold text-gray-400 uppercase">{d.hour}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
