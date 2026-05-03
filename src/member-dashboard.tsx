import React from 'react';
import { motion } from 'framer-motion';
import { Users, Info, Sparkles } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function MemberDashboard() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center p-6 font-sans relative overflow-hidden">
      {/* Background Orbs */}
      <div className="glow-orb -top-20 -left-20 h-64 w-64 bg-primary-glow opacity-20" />
      <div className="glow-orb bottom-40 -right-20 h-96 w-96 bg-primary opacity-10" />

      {/* Header */}
      <div className="w-full max-w-md flex justify-between items-center mb-8 mt-4 relative z-10">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-brand flex items-center justify-center shadow-glow">
            <span className="font-bold text-white text-xs">G</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">My Pass</h1>
        </div>
        <div className="bg-primary/10 text-primary border border-primary/20 px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 backdrop-blur-md">
          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          Active
        </div>
      </div>

      {/* Live Gym Status */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white/40 dark:bg-black/20 backdrop-blur-xl rounded-3xl p-6 mb-6 border border-white/20 shadow-elegant relative z-10"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Live Gym Status
          </h3>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-widest">Not Busy</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="h-3 w-full bg-primary/10 rounded-full overflow-hidden border border-primary/5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: '40%' }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-brand shadow-[0_0_10px_rgba(123,44,255,0.5)]"
            />
          </div>
          <div className="flex justify-between items-center">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-primary" />
              22 people currently lifting
            </p>
            <p className="text-[10px] font-bold text-primary uppercase tracking-tighter">40% Capacity</p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-primary/5 flex items-start gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/5 flex items-center justify-center shrink-0">
            <Info className="h-4 w-4 text-primary" />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Plenty of benches available! It's a great time for your chest workout.
          </p>
        </div>
      </motion.div>

      {/* ID Card */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-md bg-white rounded-[2.5rem] shadow-elegant p-8 mb-6 border border-purple-100 relative z-10"
      >
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-2xl font-display font-bold text-gray-900 tracking-tight">Rahul Sharma</h2>
            <p className="text-sm text-primary font-semibold tracking-wide uppercase mt-1">Royal Fitness HQ</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
            <Users className="h-6 w-6 text-slate-400" />
          </div>
        </div>
        
        <div className="bg-primary/5 rounded-[2rem] p-8 flex flex-col items-center justify-center border-2 border-dashed border-primary/20 mb-4 cursor-pointer hover:bg-primary/10 transition-all group active:scale-95">
          <div className="w-40 h-40 bg-white rounded-3xl mb-6 flex items-center justify-center shadow-soft relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-brand opacity-0 group-hover:opacity-5 transition-opacity" />
             <div className="relative p-6 opacity-80 group-hover:opacity-100 transition-opacity">
               <div className="grid grid-cols-4 gap-2">
                 {[...Array(16)].map((_, i) => (
                   <div key={i} className={`h-4 w-4 rounded-sm ${Math.random() > 0.5 ? 'bg-slate-900' : 'bg-slate-100'}`} />
                 ))}
               </div>
             </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-primary font-bold tracking-tight">Tap to show at entry</span>
            <ArrowRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </motion.div>

      {/* Subscription Details */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-md bg-white/60 backdrop-blur-md rounded-2xl shadow-soft p-6 border border-white/40 mb-6 relative z-10"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Current Plan</span>
            <p className="font-bold text-gray-800">Pro Monthly</p>
          </div>
          <div className="space-y-1 text-right">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Valid Until</span>
            <p className="font-bold text-primary">28 May, 2026</p>
          </div>
        </div>
      </motion.div>

    </div>
  );
}

const ArrowRight = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
  </svg>
);