import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/supabase';
import { Loader2, AlertCircle, MessageSquare } from 'lucide-react';

interface RiskyMember {
  id: string;
  name: string;
  phone: string;
  lastCheckIn: string;
  daysSinceLastCheckIn: number;
}

export default function RetentionWidget() {
  const [riskyMembers, setRiskyMembers] = useState<RiskyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const retentionControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    calculateRetention();
    return () => {
      if (retentionControllerRef.current) {
        retentionControllerRef.current.abort();
      }
    };
  }, []);

  const calculateRetention = async () => {
    // Abort previous request if it's still running
    if (retentionControllerRef.current) {
      retentionControllerRef.current.abort();
    }
    retentionControllerRef.current = new AbortController();

    setIsLoading(true);
    try {
      // Fetch all members with their last check-in date
      // We'll calculate "last_check_in" from check_ins table since it might not be a column in members
      const { data: members, error: membersError } = await supabase
        .from('members')
        .select('id, full_name, mobile_number')
        .abortSignal(retentionControllerRef.current.signal);

      if (membersError) throw membersError;

      // Fetch the latest check-in for each member
      const { data: checkIns, error: checkInsError } = await supabase
        .from('check_ins')
        .select('member_id, created_at')
        .order('created_at', { ascending: false })
        .abortSignal(retentionControllerRef.current.signal);

      if (checkInsError) throw checkInsError;

      const now = new Date();
      const processedRiskyMembers: RiskyMember[] = [];

      members.forEach(member => {
        const latestCheckIn = checkIns?.find(ci => ci.member_id === member.id);
        
        if (latestCheckIn) {
          const lastDate = new Date(latestCheckIn.created_at);
          const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
          
          if (diffDays > 7) {
            processedRiskyMembers.push({
              id: member.id,
              name: member.full_name,
              phone: member.mobile_number || "",
              lastCheckIn: lastDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
              daysSinceLastCheckIn: diffDays
            });
          }
        } else {
          // Optional: members who never checked in could also be "at risk"
          processedRiskyMembers.push({
            id: member.id,
            name: member.full_name,
            phone: member.mobile_number || "",
            lastCheckIn: "Never",
            daysSinceLastCheckIn: 999
          });
        }
      });

      setRiskyMembers(processedRiskyMembers.sort((a, b) => b.daysSinceLastCheckIn - a.daysSinceLastCheckIn));
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.warn('Error calculating retention:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleWhatsApp = (member: RiskyMember) => {
    const message = `Hi ${member.name}, we missed you at the gym! Your last workout was on ${member.lastCheckIn}. Is everything okay? Let us know if you need help getting back on track.`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${member.phone.replace(/\D/g, '')}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl shadow-sm border border-purple-100 p-6 h-[400px] flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
        <p className="text-sm text-muted-foreground">AI is analyzing member patterns...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-purple-100 p-6 min-h-[400px]">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          🧠 AI Retention Engine
        </h2>
        {riskyMembers.length > 0 && (
          <span className="text-xs font-semibold bg-red-100 text-red-600 px-3 py-1 rounded-full animate-pulse">
            {riskyMembers.length} Members At Risk
          </span>
        )}
      </div>

      {riskyMembers.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-green-500" />
          </div>
          <h3 className="font-bold text-gray-900 mb-1">Great Job!</h3>
          <p className="text-sm text-slate-500 max-w-[200px]">
            No members are currently at risk of dropping out.
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {riskyMembers.map((member) => (
            <div key={member.id} className="flex justify-between items-center p-4 bg-purple-50/30 rounded-2xl border border-purple-50 hover:border-purple-200 transition-colors">
              <div className="flex-1">
                <h3 className="font-bold text-gray-900">{member.name}</h3>
                <div className="flex flex-col gap-0.5 mt-1">
                  <p className="text-xs text-slate-500">
                    Last Seen: <span className="font-semibold text-slate-700">{member.lastCheckIn}</span>
                  </p>
                  <p className="text-[10px] text-red-600 font-bold uppercase tracking-wider">
                    {member.daysSinceLastCheckIn > 30 ? "Inactive" : `${member.daysSinceLastCheckIn} days away`}
                  </p>
                </div>
              </div>
              
              <button 
                onClick={() => handleWhatsApp(member)}
                className="ml-4 p-3 bg-white text-green-600 hover:bg-green-50 border border-green-100 rounded-xl shadow-sm transition-all active:scale-95 group"
                title="Send WhatsApp Message"
              >
                <MessageSquare className="w-5 h-5 group-hover:fill-green-600 transition-all" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
