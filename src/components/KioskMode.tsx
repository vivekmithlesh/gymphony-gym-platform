import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from '@tanstack/react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/supabase';
import { Html5Qrcode } from "html5-qrcode";
import { toast } from "sonner";

interface CheckIn {
  id: string;
  check_in_time: string;
  status?: string;
  members: {
    full_name: string;
    membership_plan: string;
    status: string;
  };
}

export function KioskMode() {
  const [time, setTime] = useState(new Date());
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  // Sleek center success/denied overlay shown after each scan, auto-cleared.
  const [successMember, setSuccessMember] = useState<{ name: string; granted: boolean } | null>(null);
  const navigate = useNavigate();
  const checkInControllerRef = useRef<AbortController | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  // Ref-based cooldown guard — survives the scanner's mount-time closure so the
  // debounce actually blocks rapid duplicate scans (a state value would be stale here).
  const isProcessingRef = useRef(false);
  const ownerIdRef = useRef<string | null>(null);
  const gymIdRef = useRef<string | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchInitialCheckIns();
    startScanner();

    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setup = async () => {
      // Resolve the kiosk owner + gym so both the check-in writes and the
      // realtime subscription are scoped to this gym only.
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const ownerId = session?.user?.id ?? null;
        ownerIdRef.current = ownerId;

        if (ownerId) {
          const { data: gym } = await supabase
            .from('gym_settings')
            .select('id')
            .eq('gym_owner_id', ownerId)
            .maybeSingle();
          gymIdRef.current = gym?.id ?? null;
        }
      } catch (e) {
        console.warn('Kiosk owner/gym resolution failed:', e);
      }

      // Subscribe ONLY to this gym's check-ins — no cross-gym triggers.
      const gymId = gymIdRef.current;
      channel = supabase
        .channel('kiosk_check_ins')
        .on(
          'postgres_changes',
          gymId
            ? { event: 'INSERT', schema: 'public', table: 'check_ins', filter: `gym_id=eq.${gymId}` }
            : { event: 'INSERT', schema: 'public', table: 'check_ins' },
          async (payload) => {
            // Fetch member details for the new check-in to get the join data
            const { data, error } = await supabase
              .from('check_ins')
              .select('id, check_in_time, status, members(full_name, membership_plan, status)')
              .eq('id', payload.new.id)
              .single();

            if (!error && data) {
              setCheckIns((prev) => [data as any, ...prev].slice(0, 5));
            }
          }
        )
        .subscribe();
    };

    setup();

    return () => {
      if (scannerRef.current) {
        // Html5Qrcode must be stopped before clearing the rendered DOM.
        scannerRef.current.stop()
          .then(() => scannerRef.current?.clear())
          .catch(() => {});
        scannerRef.current = null;
      }
      if (channel) supabase.removeChannel(channel);
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  const startScanner = () => {
    // Small delay to ensure the #reader element is mounted before binding.
    setTimeout(async () => {
      if (scannerRef.current) return;

      try {
        const html5Qrcode = new Html5Qrcode("reader");
        scannerRef.current = html5Qrcode;

        // Start the live camera feed directly (back camera preferred). The
        // low-level Html5Qrcode API auto-starts the stream — the higher-level
        // Scanner hid its permission button behind CSS, leaving the box blank.
        await html5Qrcode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
          (decodedText) => { handleCheckIn(decodedText); },
          () => { /* silent per-frame decode errors */ }
        );
      } catch (err) {
        console.warn("Kiosk camera start failed:", err);
        toast.error("Could not access camera. Check permissions and reload.");
        scannerRef.current = null;
      }
    }, 500);
  };

  const handleCheckIn = async (memberId: string) => {
    // Ref guard (not state) so the cooldown reliably blocks rapid duplicate
    // scans even inside the scanner's mount-time callback closure.
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsProcessing(true);

    try {
      // 1. Verify member exists
      const { data: member, error: memberError } = await supabase
        .from("members")
        .select("id, full_name, status")
        .eq("id", (memberId || "").trim())
        .single();

      if (memberError || !member) {
        console.warn("Invalid Member QR Code");
        toast.error("Invalid QR code — member not found.");
        return;
      }

      const accessStatus = (member.status === 'Overdue' || member.status === 'Expired') ? 'denied' : 'granted';

      // 2. Insert into check_ins table, stamped with gym_id for hard
      //    multi-tenant isolation (RLS also enforces ownership).
      const { error: checkInError } = await supabase
        .from("check_ins")
        .insert([{
          member_id: member.id,
          gym_id: gymIdRef.current,
          status: accessStatus,
          check_in_time: new Date().toISOString(),
          created_at: new Date().toISOString()
        }]);

      if (checkInError) throw checkInError;

      // 3. Log to activity_log, stamped with the kiosk owner so this check-in
      //    appears on the owner dashboard's Activity Log feed.
      await supabase
        .from("activity_log")
        .insert([
          {
            gym_owner_id: ownerIdRef.current,
            activity_type: "member",
            description: `${member.full_name} checked in via Kiosk (${accessStatus}).`,
            is_read: false,
          },
        ]);

      // 4. User feedback — toast + sleek center overlay (auto-clears).
      if (accessStatus === 'granted') {
        toast.success(`Welcome, ${member.full_name}! Checked in successfully`);
        playBeep(880); // Success beep
      } else {
        toast.error(`Access Denied — ${member.full_name} (${member.status})`);
        playBeep(440); // Error beep
      }
      showSuccessOverlay(member.full_name, accessStatus === 'granted');

    } catch (error: any) {
      console.warn("Kiosk check-in error:", error);
      toast.error("Check-in failed. Please try again.");
    } finally {
      setIsProcessing(false);
      // 4-second cooldown/debounce to prevent the camera spam-logging the
      // same member many times per second.
      setTimeout(() => { isProcessingRef.current = false; }, 4000);
    }
  };

  const showSuccessOverlay = (name: string, granted: boolean) => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    setSuccessMember({ name, granted });
    successTimerRef.current = setTimeout(() => setSuccessMember(null), 3000);
  };

  const playBeep = (frequency: number) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.2);
    } catch (e) {
      console.warn("Could not play beep sound", e);
    }
  };

  const fetchInitialCheckIns = async () => {
    // Abort previous request if it's still running
    if (checkInControllerRef.current) {
      checkInControllerRef.current.abort();
    }
    checkInControllerRef.current = new AbortController();

    try {
      const { data, error } = await supabase
        .from('check_ins')
        .select('id, check_in_time, status, members(full_name, membership_plan, status)')
        .order('check_in_time', { ascending: false })
        .limit(5)
        .abortSignal(checkInControllerRef.current.signal);

      if (error) {
        // Silent Abort
        if (
          error.name === 'AbortError' || 
          error.message?.includes('abort') || 
          error.message?.includes('Lock broken')
        ) {
          return;
        }
        console.warn("Initial check-ins fetch error:", error.message);
        return;
      }
      setCheckIns(data as any || []);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.warn("Silent fetch error in fetchInitialCheckIns:", error);
      }
    }
  };

  return (
    <div className="min-h-screen w-screen bg-gray-900 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden font-sans text-white">
      
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

        {/* Camera Feed */}
        <div className="w-full max-w-112.5 aspect-square bg-gray-800 rounded-3xl border-4 border-gray-700 relative overflow-hidden shadow-2xl flex items-center justify-center">
          <div id="reader" className="w-full h-full object-cover scale-110"></div>
          <div className="absolute inset-0 border-4 border-purple-500/30 rounded-3xl m-4 pointer-events-none"></div>
          {/* Scanning animation line */}
          <div className="absolute top-0 left-0 w-full h-1 bg-purple-500 shadow-[0_0_15px_#a855f7] animate-[scan_4s_ease-in-out_infinite] pointer-events-none"></div>
          {isProcessing && !successMember && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="font-bold text-white tracking-widest uppercase text-xs">Processing...</p>
              </div>
            </div>
          )}

          <AnimatePresence>
            {successMember && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                className={`absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 backdrop-blur-md ${
                  successMember.granted ? "bg-green-600/30" : "bg-red-600/30"
                }`}
              >
                <div className={`w-24 h-24 rounded-full flex items-center justify-center text-5xl ${
                  successMember.granted ? "bg-green-500/30" : "bg-red-500/30"
                }`}>
                  {successMember.granted ? "✅" : "❌"}
                </div>
                <h3 className="text-3xl font-bold text-white text-center px-6">
                  {successMember.granted ? `Welcome, ${successMember.name}!` : "Access Denied"}
                </h3>
                <p className="text-gray-200 font-medium">
                  {successMember.granted ? "Checked in successfully" : successMember.name}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right Side - Status & Logs */}
      <div className="w-full lg:w-96 bg-gray-800 border-t lg:border-t-0 lg:border-l border-gray-700 p-8 flex flex-col">
        {/* Live Clock */}
        <div className="mb-12">
          <p className="text-5xl font-light tracking-wider mb-2">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="text-gray-400 font-medium">
            {time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Live Scan Feed */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <h3 className="text-sm uppercase tracking-widest text-gray-400 font-bold mb-6">Recent Check-ins</h3>
          
          <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
            <AnimatePresence initial={false}>
              {checkIns.length > 0 ? (
                checkIns.map((checkIn) => {
                  const isAccessDenied = checkIn.status === 'denied' || checkIn.members?.status === 'Overdue' || checkIn.members?.status === 'Expired';
                  return (
                    <motion.div
                      key={checkIn.id}
                      initial={{ opacity: 0, x: 20, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -20, scale: 0.95 }}
                      transition={{ duration: 0.3 }}
                      className={`${
                        isAccessDenied 
                          ? "bg-red-500/10 border border-red-500/20" 
                          : "bg-green-500/10 border border-green-500/20"
                      } p-4 rounded-2xl flex items-center gap-4`}
                    >
                      <div className={`w-12 h-12 ${
                        isAccessDenied ? "bg-red-500/20" : "bg-green-500/20"
                      } rounded-full flex items-center justify-center text-xl`}>
                        {isAccessDenied ? "❌" : "✅"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold truncate ${isAccessDenied ? "text-red-400" : "text-green-400"}`}>
                          {isAccessDenied ? "Access Denied" : "Access Granted"}
                        </p>
                        <p className="text-sm text-gray-300 truncate">
                          {checkIn.members?.full_name || "Unknown Member"}
                        </p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-tighter">
                          {checkIn.members?.membership_plan || "No Plan"} • {new Date(checkIn.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <p className="text-gray-500 text-center py-8">No recent check-ins</p>
              )}
            </AnimatePresence>
          </div>
        </div>
        
        {/* Exit Button for Owner */}
        <button 
          type="button"
          onClick={(e) => {
            e.preventDefault();
            navigate({ to: '/dashboard', search: { tab: undefined, section: undefined } });
          }}
          className="mt-8 w-full py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2"
        >
          Exit Kiosk Mode
        </button>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0% { transform: translateY(0); }
          50% { transform: translateY(430px); }
          100% { transform: translateY(0); }
        }
        #reader { border: none !important; }
        #reader video { border-radius: 1.5rem; object-fit: cover; }
        #reader__dashboard { display: none !important; }
        #reader__status_span { display: none !important; }
        #reader__scan_region { background: transparent !important; }
      `}} />
    </div>
  );
}
