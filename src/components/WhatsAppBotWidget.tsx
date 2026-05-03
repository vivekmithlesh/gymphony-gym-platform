import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/supabase';
import { Loader2, Send, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface AIChat {
  id: string;
  member_name: string;
  message: string;
  response: string;
  created_at: string;
}

const SAMPLE_MESSAGES = [
  { q: "What are the gym timings for tomorrow?", a: "Hi! We're open from 6:00 AM to 10:00 PM tomorrow. Looking forward to seeing you!" },
  { q: "Can I bring a guest for a trial today?", a: "Yes, definitely! We offer a one-day free trial for guests. Please make sure they bring a valid ID." },
  { q: "Is the yoga class still happening at 7 PM?", a: "Hi! Yes, the Hatha Yoga session is scheduled for 7:00 PM today in Studio A." },
  { q: "Do you have any personal training slots available?", a: "We have a few slots open with Coach Rahul and Coach Priya. Would you like me to share their schedules?" },
  { q: "Is there a parking space available near the gym?", a: "Yes, we have dedicated basement parking for members, and street parking is also available." }
];

const SAMPLE_NAMES = ["Kabir", "Sanya", "Vikram", "Anjali", "Rohan"];

export default function WhatsAppBotWidget() {
  const [chats, setChats] = useState<AIChat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const chatControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetchLatestChats();
    const channel = subscribeToChats();
    return () => {
      if (chatControllerRef.current) {
        chatControllerRef.current.abort();
      }
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLatestChats = async () => {
    // Abort previous request if it's still running
    if (chatControllerRef.current) {
      chatControllerRef.current.abort();
    }
    chatControllerRef.current = new AbortController();

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_chats')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3)
        .abortSignal(chatControllerRef.current.signal);

      if (error) {
        // Silent Abort
        if (
          error.name === 'AbortError' || 
          error.message?.includes('abort') || 
          error.message?.includes('Lock broken')
        ) {
          return;
        }
        console.warn("AI Chats fetch error:", error.message);
        return;
      }
      setChats(data || []);
    } catch (error: any) {
      // Silent error for aborts
      if (
        error.name === 'AbortError' || 
        error.message?.includes('abort') || 
        error.message?.includes('Lock broken')
      ) {
        console.warn('Silent fetch error in fetchLatestChats:', error);
        return;
      }
      console.warn('Error fetching AI chats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToChats = () => {
    return supabase
      .channel('ai_chats_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ai_chats' },
        (payload) => {
          setChats(prev => [payload.new as AIChat, ...prev].slice(0, 3));
        }
      )
      .subscribe();
  };

  const simulateMessage = async () => {
    setIsSimulating(true);
    try {
      const randomPair = SAMPLE_MESSAGES[Math.floor(Math.random() * SAMPLE_MESSAGES.length)];
      const randomName = SAMPLE_NAMES[Math.floor(Math.random() * SAMPLE_NAMES.length)];

      const { error } = await supabase
        .from('ai_chats')
        .insert([{
          member_name: randomName,
          message: randomPair.q,
          response: randomPair.a
        }]);

      if (error) throw error;
      toast.success("New message simulated!");
    } catch (error: any) {
      console.warn("Simulation failed:", error.message);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-purple-100 p-6 flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          🤖 AI WhatsApp Receptionist
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={simulateMessage}
            disabled={isSimulating}
            className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {isSimulating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
            Simulate
          </button>
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-sm font-semibold text-green-600">Online</span>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 font-sans text-sm flex-grow overflow-hidden flex flex-col">
        <p className="text-xs text-gray-400 mb-3 uppercase font-bold tracking-wider">Live Chat Feed</p>
        
        {isLoading ? (
          <div className="flex-grow flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
            <p className="text-xs text-muted-foreground">Connecting to WhatsApp feed...</p>
          </div>
        ) : chats.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3">
              <Sparkles className="h-6 w-6 text-purple-400" />
            </div>
            <p className="text-sm text-gray-500 font-medium">No messages yet</p>
            <p className="text-[11px] text-gray-400 mt-1 max-w-[180px]">AI Receptionist is ready to handle your member inquiries.</p>
          </div>
        ) : (
          <div className="space-y-6 overflow-y-auto pr-1 custom-scrollbar">
            <AnimatePresence initial={false}>
              {chats.map((chat) => (
                <motion.div
                  key={chat.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="space-y-3"
                >
                  {/* Member Message */}
                  <div className="flex flex-col items-start">
                    <p className="text-[11px] text-gray-500 font-bold mb-1 ml-1">Member ({chat.member_name}):</p>
                    <div className="bg-white p-3 rounded-tr-xl rounded-br-xl rounded-bl-xl border border-gray-200 shadow-sm max-w-[85%] text-gray-800">
                      {chat.message}
                    </div>
                  </div>

                  {/* AI Response */}
                  <div className="flex flex-col items-end">
                    <p className="text-[11px] text-purple-600 font-bold mb-1 mr-1">Gymphony AI:</p>
                    <div className="bg-purple-600 text-white p-3 rounded-tl-xl rounded-bl-xl rounded-br-xl shadow-sm max-w-[85%] text-left">
                      {chat.response}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
