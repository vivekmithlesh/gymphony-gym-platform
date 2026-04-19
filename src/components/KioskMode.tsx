import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, Link } from "@tanstack/react-router";
import { attendanceList } from "@/server/api/attendance/list";
import { attendanceScan } from "@/server/api/attendance/scan";

export function KioskMode() {
  const [time, setTime] = useState(new Date());
  const [lastScanResult, setLastScanResult] = useState<
    { status: "success"; message: string } | { status: "error"; message: string } | null
  >(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const attendanceQuery = useQuery({
    queryKey: ["attendance-list"],
    queryFn: () => attendanceList(),
  });

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const attendanceScanMutation = useMutation({
    mutationFn: attendanceScan,
    onSuccess: async (result, variables) => {
      const member = attendanceQuery.data?.members.find((entry) => entry.id === variables.data.memberUserId);

      if (!result.success) {
        setLastScanResult({
          status: "error",
          message: result.message,
        });
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["attendance-list"] });
      setLastScanResult({
        status: "success",
        message: `${member?.name ?? "Member"} checked in successfully`,
      });
    },
    onError: (error) => {
      setLastScanResult({
        status: "error",
        message: error instanceof Error ? error.message : "Member not found",
      });
    },
  });

  const todayKey = new Date().toDateString();
  const recentCheckIns =
    attendanceQuery.data?.members
      .map((member) => {
        const todaysDates = member.dates
          .map((date) => new Date(date))
          .filter((date) => date.toDateString() === todayKey)
          .sort((a, b) => b.getTime() - a.getTime());

        if (!todaysDates[0]) {
          return null;
        }

        return {
          id: member.id,
          name: member.name,
          checkInAt: todaysDates[0],
        };
      })
      .filter((member): member is { id: string; name: string; checkInAt: Date } => member !== null)
      .sort((a, b) => b.checkInAt.getTime() - a.checkInAt.getTime())
      .slice(0, 5) ?? [];

  const handleScanSimulation = () => {
    const scannedValue = attendanceQuery.data?.members[0]?.id;

    if (!scannedValue) {
      setLastScanResult({
        status: "error",
        message: "Member not found",
      });
      return;
    }

    attendanceScanMutation.mutate({
      data: {
        memberUserId: scannedValue,
      },
    });
  };

  return (
    <div className="h-screen w-screen bg-gray-900 flex overflow-hidden font-sans text-white">
      {/* Left Side - Scanner Area */}
      <div className="flex-1 flex flex-col items-center justify-center relative p-8">
        <Link to="/" className="absolute top-8 left-8 group">
          <h1 className="text-3xl font-extrabold tracking-tight text-white transition-transform group-active:scale-95">
            <span className="text-purple-500">Gym</span>phony
          </h1>
        </Link>

        <h2 className="text-4xl font-bold mb-2 text-center">Scan your Entry Pass</h2>
        <p className="text-gray-400 text-lg mb-12 text-center">
          Open your member portal and hold the QR code to the camera
        </p>

        {/* Mock Camera Feed */}
        <button
          type="button"
          onClick={handleScanSimulation}
          className="w-[400px] h-[400px] bg-gray-800 rounded-3xl border-4 border-gray-700 relative overflow-hidden shadow-2xl flex items-center justify-center"
        >
          <div className="absolute inset-0 border-4 border-purple-500/30 rounded-3xl m-4"></div>
          {/* Scanning animation line */}
          <div className="absolute top-0 left-0 w-full h-1 bg-purple-500 shadow-[0_0_15px_#a855f7] animate-[scan_2s_ease-in-out_infinite]"></div>
          <p className="text-gray-500 font-medium">
            {attendanceScanMutation.isPending ? "Scanning..." : "Camera Active"}
          </p>
        </button>
      </div>

      {/* Right Side - Status & Logs */}
      <div className="w-96 bg-gray-800 border-l border-gray-700 p-8 flex flex-col">
        {/* Live Clock */}
        <div className="mb-12">
          <p className="text-5xl font-light tracking-wider mb-2">
            {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
          <p className="text-gray-400 font-medium">
            {time.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>

        {/* Live Scan Feed */}
        <div className="flex-1">
          <h3 className="text-sm uppercase tracking-widest text-gray-400 font-bold mb-6">
            Recent Check-ins
          </h3>

          <div className="space-y-4">
            {lastScanResult?.status === "success" && (
              <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-2xl flex items-center gap-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center text-xl">
                  ✅
                </div>
                <div>
                  <p className="font-bold text-green-400">Access Granted</p>
                  <p className="text-sm text-gray-300">{lastScanResult.message}</p>
                </div>
              </div>
            )}

            {lastScanResult?.status === "error" && (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-4">
                <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center text-xl">
                  ❌
                </div>
                <div>
                  <p className="font-bold text-red-400">Access Denied</p>
                  <p className="text-sm text-gray-300">{lastScanResult.message}</p>
                </div>
              </div>
            )}

            {recentCheckIns.map((member) => (
              <div
                key={member.id}
                className="bg-green-500/10 border border-green-500/20 p-4 rounded-2xl flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center text-xl">
                  ✅
                </div>
                <div>
                  <p className="font-bold text-green-400">{member.name}</p>
                  <p className="text-sm text-gray-300">
                    Checked in at{" "}
                    {member.checkInAt.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Exit Button for Owner */}
        <button
          onClick={() => navigate({ to: "/dashboard" })}
          className="mt-auto w-full py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl text-sm font-semibold transition"
        >
          Exit Kiosk Mode
        </button>
      </div>

      {/* Add this to your global CSS for the scanning animation */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes scan {
          0% { transform: translateY(0); }
          50% { transform: translateY(380px); }
          100% { transform: translateY(0); }
        }
      `,
        }}
      />
    </div>
  );
}
