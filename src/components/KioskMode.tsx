import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from '@tanstack/react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/supabase';
import { Html5QrcodeScanner } from "html5-qrcode";
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
  const navigate = useNavigate();
  const checkInControllerRef = useRef<AbortController | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchInitialCheckIns();
    startScanner();
    
    const setupSubscription = async () => {
      const channel = supabase
        .channel('kiosk_check_ins')
        .on(
          'postgres_changes',
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'check_ins'
          },
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

      return channel;
    };

    const channelPromise = setupSubscription();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.warn);
      }
      channelPromise.then(channel => {
        if (channel) supabase.removeChannel(channel);
      });
    };
  }, []);

  const startScanner = () => {
    // Give a small delay to ensure DOM is ready
    setTimeout(() => {
      if (scannerRef.current) return;

      const scanner = new Html5QrcodeScanner(
        "reader",
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        /* verbose= */ false
      );

      scanner.render(
        async (decodedText) => {
          handleCheckIn(decodedText);
        },
        (error) => {
          // Silent scan errors
        }
      );
      scannerRef.current = scanner;
    }, 500);
  };

  const handleCheckIn = async (memberId: string) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      // 1. Verify member exists
      const { data: member, error: memberError } = await supabase
        .from("members")
        .select("id, full_name, status")
        .eq("id", memberId)
        .single();

      if (memberError || !member) {
        console.warn("Invalid Member QR Code");
        return;
      }

      const accessStatus = (member.status === 'Overdue' || member.status === 'Expired') ? 'denied' : 'granted';

      // 2. Insert into check_ins table
      const { error: checkInError } = await supabase
        .from("check_ins")
        .insert([{
          member_id: member.id,
          status: accessStatus,
          check_in_time: new Date().toISOString(),
          created_at: new Date().toISOString()
        }]);

      if (checkInError) throw checkInError;

      // 3. Log to activity_log
      await supabase
        .from("activity_log")
        .insert([
          {
            activity_type: "member",
            description: `${member.full_name} checked in via Kiosk (${accessStatus}).`,
            is_read: false,
          },
        ]);

      if (accessStatus === 'granted') {
        toast.success(`Welcome, ${member.full_name}!`);
        playBeep(880); // Success beep
      } else {
        console.warn(`Access Denied: ${member.status} for ${member.full_name}`);
        playBeep(440); // Error beep
      }

    } catch (error: any) {
      console.warn("Kiosk check-in error:", error);
    } finally {
      // Small cooldown to prevent double scans
      setTimeout(() => setIsProcessing(false), 2000);
    }
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

        {/* Camera Feed */}
        <div className="w-[450px] h-[450px] bg-gray-800 rounded-3xl border-4 border-gray-700 relative overflow-hidden shadow-2xl flex items-center justify-center">
          <div id="reader" className="w-full h-full object-cover scale-110"></div>
          <div className="absolute inset-0 border-4 border-purple-500/30 rounded-3xl m-4 pointer-events-none"></div>
          {/* Scanning animation line */}
          <div className="absolute top-0 left-0 w-full h-1 bg-purple-500 shadow-[0_0_15px_#a855f7] animate-[scan_4s_ease-in-out_infinite] pointer-events-none"></div>
          {isProcessing && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="font-bold text-white tracking-widest uppercase text-xs">Processing...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Status & Logs */}
      <div className="w-96 bg-gray-800 border-l border-gray-700 p-8 flex flex-col">
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
            navigate({ to: '/dashboard' });
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
