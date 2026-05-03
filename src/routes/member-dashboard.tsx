import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Info, Sparkles, MapPin, UserCircle, History, QrCode, Calendar, Clock, ShoppingBag, ShoppingCart, Trophy, Share2, LogOut } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/BackButton";
import { supabase } from "@/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/member-dashboard")({
  head: () => ({
    meta: [
      { title: "My Pass — Gymphony Member Portal" },
      {
        name: "description",
        content: "Access your personalized gym member portal to track progress and attendance.",
      },
    ],
  }),
  component: MemberDashboard,
});

function MemberDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'pass' | 'history' | 'store' | 'leaderboard'>('pass');
  const [member, setMember] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMemberData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate({ to: "/member-login" });
          return;
        }

        const { data, error } = await supabase
          .from("members")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (error) {
          console.error("Error fetching member data:", error);
          // If profile doesn't exist, we might want to redirect or show a state
          setIsLoading(false);
          return;
        }

        setMember(data);
      } catch (err) {
        console.error("Unexpected error in fetchMemberData:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMemberData();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate({ to: "/member-login" });
  };

  // Derived data from member profile
  const gym = {
    name: "Iron Paradise", // Default or fetched from gym_profiles if linked
    location: member?.city || "Your Gym Location",
    planName: member?.membership_plan || "No Active Plan",
    expiryDate: member?.expiry_date ? new Date(member.expiry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : "N/A",
    status: member?.status || "Pending",
    totalMembers: 350,
    memberRank: 4,
    points: 1240
  };

  // Mock leaderboard data
  const memberLeaderboard = [
    { id: 1, name: "Aryan Khan", points: 2850, rank: 1, isMe: false, avatar: "AK" },
    { id: 2, name: "Sneha Gupta", points: 2640, rank: 2, isMe: false, avatar: "SG" },
    { id: 3, name: "Rohan Varma", points: 2420, rank: 3, isMe: false, avatar: "RV" },
    { id: 4, name: "Rahul Sharma", points: 1240, rank: 4, isMe: true, avatar: "RS" },
    { id: 5, name: "Priya Singh", points: 1180, rank: 5, isMe: false, avatar: "PS" },
  ];

  // Mock history data with bonus indicators
  const workoutHistory = [
    { id: 1, date: "Apr 18", timeIn: "6:00 AM", timeOut: "7:30 AM", gymName: "Royal Fitness HQ", bonus: "Early Bird (+50 pts)" },
    { id: 2, date: "Apr 17", timeIn: "7:00 AM", timeOut: "8:30 AM", gymName: "Royal Fitness HQ" },
    { id: 3, date: "Apr 16", timeIn: "6:15 PM", timeOut: "7:45 PM", gymName: "Royal Fitness HQ" },
    { id: 4, date: "Apr 15", timeIn: "6:45 PM", timeOut: "8:15 PM", gymName: "Royal Fitness HQ" },
    { id: 5, date: "Apr 14", timeIn: "6:05 AM", timeOut: "7:35 AM", gymName: "Royal Fitness HQ", bonus: "Early Bird (+50 pts)" },
  ];

  // Mock store data
  const storeItems = [
    { id: 1, name: "Whey Protein Shake", price: "₹149", category: "Drink", icon: "🥤" },
    { id: 2, name: "Pre-workout Drink", price: "₹99", category: "Drink", icon: "⚡" },
    { id: 3, name: "1-on-1 PT Session", price: "₹999", category: "Training", icon: "🏋️‍♂️" },
    { id: 4, name: "Gym Towel (Microfiber)", price: "₹249", category: "Gear", icon: "🧣" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center p-6 font-sans relative overflow-hidden pb-32">
      {/* Background Orbs */}
      <div className="glow-orb -top-20 -left-20 h-64 w-64 bg-primary-glow opacity-20" />
      <div className="glow-orb bottom-40 -right-20 h-96 w-96 bg-primary opacity-10" />

      {/* Header */}
      <div className="w-full max-w-md flex justify-between items-center mb-8 mt-4 relative z-10">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="h-8 w-8 rounded-lg bg-gradient-brand flex items-center justify-center shadow-glow transition-transform group-hover:scale-110 group-active:scale-95">
              <span className="font-bold text-white text-xs">G</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {activeTab === 'pass' ? 'My Pass' : activeTab === 'history' ? 'Workout History' : activeTab === 'store' ? 'Gym Store' : "Aligarh's Fittest"}
            </h1>
          </Link>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleLogout}
            className="rounded-full hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
        <div className="bg-primary/10 text-primary border border-primary/20 px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 backdrop-blur-md">
          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          {gym.status}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'pass' ? (
          <motion.div
            key="pass"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="w-full max-w-md space-y-6 relative z-10"
          >
            {/* Live Gym Status */}
            <div className="w-full bg-white/40 dark:bg-black/20 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-elegant">
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
            </div>

            {/* Membership & QR Card */}
            <div className="w-full bg-white rounded-[2.5rem] shadow-elegant p-8 border border-purple-100">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-2xl font-display font-bold text-gray-900 tracking-tight">{gym.name}</h2>
                  <p className="text-sm text-muted-foreground font-medium flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" />
                    {gym.location}
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  <div className="h-12 w-12 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center">
                    <UserCircle className="h-6 w-6 text-primary" />
                  </div>
                  <span className="text-[10px] font-bold text-primary uppercase tracking-widest mt-2">{member?.full_name?.split(' ')[0]}</span>
                </div>
              </div>
              
              <div className="bg-primary/5 rounded-[2rem] p-8 flex flex-col items-center justify-center border-2 border-dashed border-primary/20 mb-8 cursor-pointer hover:bg-primary/10 transition-all group active:scale-95">
                <div className="w-44 h-44 bg-white rounded-3xl mb-6 flex items-center justify-center shadow-soft relative overflow-hidden group-hover:scale-105 transition-transform">
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
                  <span className="text-primary font-bold tracking-tight text-lg">Tap to show at entry</span>
                  <ArrowRight className="h-5 w-5 text-primary transition-transform group-hover:translate-x-1" />
                </div>
              </div>

              {/* Plan Details Footer */}
              <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-6">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Current Plan</span>
                  <p className="text-lg font-bold text-gray-800">{gym.planName}</p>
                </div>
                <div className="space-y-1 text-right">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Valid Until</span>
                  <p className="text-lg font-bold text-primary">{gym.expiryDate}</p>
                </div>
              </div>
            </div>
          </motion.div>
        ) : activeTab === 'history' ? (
          <motion.div
            key="history"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-md space-y-6 relative z-10"
          >
            {/* Streak Counter */}
            <div className="w-full bg-gradient-brand p-8 rounded-3xl shadow-glow text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                <Sparkles className="h-24 w-24" />
              </div>
              <div className="relative">
                <h3 className="text-4xl font-black flex items-center gap-2 animate-bounce-slow text-white">
                  🔥 5 Day Streak!
                </h3>
                <p className="mt-2 text-white/80 font-medium">You're on fire, {member?.full_name?.split(' ')[0] || "Rahul"}! Keep up the momentum.</p>
                
                <div className="mt-6 flex gap-2">
                  {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                    <div 
                      key={day} 
                      className={`h-1.5 flex-1 rounded-full ${day <= 5 ? 'bg-white' : 'bg-white/30'}`}
                    />
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-[10px] font-bold uppercase tracking-widest opacity-80">
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                  <span>Sun</span>
                </div>
              </div>
            </div>

            {/* History List */}
            <div className="space-y-4">
              <h3 className="font-display text-xl font-bold px-2 text-foreground">Recent Workouts</h3>
              <div className="space-y-3">
                {workoutHistory.map((workout, index) => (
                  <motion.div
                    key={workout.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white/60 dark:bg-white/5 backdrop-blur-md border border-white/20 p-5 rounded-2xl flex items-center justify-between group hover:bg-white/80 dark:hover:bg-white/10 transition-all cursor-pointer shadow-soft"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <Calendar className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{workout.date}</span>
                          <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {workout.timeIn} - {workout.timeOut}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{workout.gymName}</p>
                        {workout.bonus && (
                          <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/10 text-[10px] font-bold text-amber-600 border border-amber-400/20">
                            <Sparkles className="h-2 w-2" />
                            {workout.bonus}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="h-8 w-8 rounded-full border border-primary/20 flex items-center justify-center text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : activeTab === 'leaderboard' ? (
          <motion.div
            key="leaderboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md space-y-6 relative z-10"
          >
            {/* My Rank Card */}
            <div className="w-full bg-gradient-brand p-8 rounded-[2.5rem] shadow-glow text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:rotate-12 transition-transform duration-500">
                <Trophy className="h-24 w-24" />
              </div>
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="text-white/80 font-bold uppercase tracking-widest text-[10px] mb-2">Your Ranking</p>
                  <h3 className="text-5xl font-black text-white">#{gym.memberRank}</h3>
                  <p className="mt-2 text-white/90 font-medium">out of {gym.totalMembers} members</p>
                </div>
                <div className="text-right">
                  <p className="text-white/80 font-bold uppercase tracking-widest text-[10px] mb-2">Total Points</p>
                  <h3 className="text-3xl font-black text-white">{gym.points}</h3>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-[10px] font-bold">
                    Top 2% this month
                  </div>
                </div>
              </div>
              
              <Button 
                variant="ghost" 
                className="w-full mt-8 bg-white/10 hover:bg-white/20 text-white border-white/10 rounded-2xl h-12 font-bold flex items-center gap-2"
                onClick={() => toast.success("Share link copied! Time to brag! 🚀")}
              >
                <Share2 className="h-4 w-4" />
                Share Achievement
              </Button>
            </div>

            {/* Top Members List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="font-display text-xl font-bold text-foreground">Top Members</h3>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Iron Paradise • April</span>
              </div>
              
              <div className="space-y-3">
                {memberLeaderboard.map((member, index) => (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-5 rounded-[2rem] flex items-center justify-between border transition-all ${
                      member.isMe 
                        ? 'bg-primary/5 border-primary shadow-soft' 
                        : 'bg-white/60 dark:bg-white/5 border-white/20 backdrop-blur-md'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 flex items-center justify-center font-bold text-lg ${
                        member.rank === 1 ? 'text-amber-400' : 
                        member.rank === 2 ? 'text-slate-400' : 
                        member.rank === 3 ? 'text-amber-600' : 'text-muted-foreground'
                      }`}>
                        {member.rank === 1 ? <Trophy className="h-6 w-6" /> : member.rank}
                      </div>
                      <div className="h-10 w-10 rounded-full bg-gradient-brand flex items-center justify-center text-white font-bold text-xs">
                        {member.avatar}
                      </div>
                      <div>
                        <div className="font-bold text-foreground flex items-center gap-2">
                          {member.isMe ? (member?.full_name || member.name) : member.name}
                          {member.isMe && <Badge className="h-4 px-1.5 bg-primary text-[8px] uppercase">You</Badge>}
                        </div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter mt-0.5">Member since 2023</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black text-primary">{member.points}</div>
                      <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Points</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Badges Section */}
            <div className="rounded-[2.5rem] border border-white/20 bg-white/40 dark:bg-black/20 backdrop-blur-xl p-6">
              <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-4">Your Badges</h3>
              <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                {[
                  { icon: "🌅", name: "Early Bird", color: "bg-amber-400/10 border-amber-400/20" },
                  { icon: "🔥", name: "Streak King", color: "bg-orange-400/10 border-orange-400/20" },
                  { icon: "💪", name: "Heavy Lifter", color: "bg-blue-400/10 border-blue-400/20" },
                  { icon: "🥗", name: "Healthy Eater", color: "bg-green-400/10 border-green-400/20" },
                ].map((badge) => (
                  <div key={badge.name} className="flex flex-col items-center gap-2 shrink-0">
                    <div className={`h-16 w-16 rounded-2xl flex items-center justify-center text-3xl border ${badge.color}`}>
                      {badge.icon}
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{badge.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="store"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md space-y-6 relative z-10"
          >
            <div className="mb-2">
              <BackButton />
            </div>
            {/* Promo Banner */}
            <div className="w-full bg-gradient-brand p-6 rounded-3xl shadow-glow text-white relative overflow-hidden group border border-white/20">
              <div className="absolute -right-4 -top-4 opacity-20 group-hover:rotate-12 transition-transform">
                <ShoppingBag className="h-24 w-24" />
              </div>
              <div className="relative z-10">
                <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                  🔥 5-Day Streak Bonus
                </h3>
                <p className="mt-1 text-sm text-white/90">20% OFF any drink today!</p>
              </div>
            </div>

            {/* Store Grid */}
            <div className="grid grid-cols-2 gap-4">
              {storeItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-white/20 p-5 rounded-3xl flex flex-col items-center text-center group hover:bg-white/80 dark:hover:bg-white/10 transition-all shadow-soft"
                >
                  <div className="h-24 w-full bg-primary/5 rounded-2xl flex items-center justify-center text-4xl mb-4 group-hover:scale-110 transition-transform">
                    {item.icon}
                  </div>
                  <h4 className="text-sm font-bold text-foreground leading-tight mb-1">{item.name}</h4>
                  <p className="text-xs text-muted-foreground mb-3">{item.category}</p>
                  <div className="w-full flex items-center justify-between mt-auto">
                    <span className="text-lg font-black text-primary">{item.price}</span>
                    <Button size="sm" className="h-8 rounded-full px-3 bg-primary hover:bg-primary/90 text-[10px] font-bold">
                      Quick Buy
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Loyalty Points Card */}
            <div className="bg-white/40 dark:bg-black/20 backdrop-blur-md rounded-3xl p-5 border border-white/10 flex items-center justify-between shadow-soft">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-400/10 flex items-center justify-center text-amber-500">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Gym Points</p>
                  <p className="text-lg font-black text-foreground">1,240 pts</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="rounded-full border-primary/20 text-primary text-[10px] font-bold">
                Redeem
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-[380px] z-50 px-4">
        <div className="bg-white/80 dark:bg-black/80 backdrop-blur-2xl border border-white/20 rounded-full p-2 shadow-elegant flex items-center justify-between">
          <button
            onClick={() => setActiveTab('pass')}
            className={`flex items-center gap-2 px-4 py-3 rounded-full transition-all duration-300 ${
              activeTab === 'pass' 
                ? 'bg-gradient-brand text-white shadow-glow' 
                : 'text-muted-foreground hover:bg-primary/5'
            }`}
          >
            <QrCode className={`h-5 w-5 ${activeTab === 'pass' ? 'animate-pulse' : ''}`} />
            <span className={`text-xs font-bold ${activeTab === 'pass' ? 'block' : 'hidden'}`}>My Pass</span>
          </button>
          
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-3 rounded-full transition-all duration-300 ${
              activeTab === 'history' 
                ? 'bg-gradient-brand text-white shadow-glow' 
                : 'text-muted-foreground hover:bg-primary/5'
            }`}
          >
            <History className={`h-5 w-5 ${activeTab === 'history' ? 'animate-pulse' : ''}`} />
            <span className={`text-xs font-bold ${activeTab === 'history' ? 'block' : 'hidden'}`}>History</span>
          </button>

          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex items-center gap-2 px-4 py-3 rounded-full transition-all duration-300 ${
              activeTab === 'leaderboard' 
                ? 'bg-gradient-brand text-white shadow-glow' 
                : 'text-muted-foreground hover:bg-primary/5'
            }`}
          >
            <Trophy className={`h-5 w-5 ${activeTab === 'leaderboard' ? 'animate-pulse' : ''}`} />
            <span className={`text-xs font-bold ${activeTab === 'leaderboard' ? 'block' : 'hidden'}`}>Fittest</span>
          </button>

          <button
            onClick={() => setActiveTab('store')}
            className={`flex items-center gap-2 px-4 py-3 rounded-full transition-all duration-300 ${
              activeTab === 'store' 
                ? 'bg-gradient-brand text-white shadow-glow' 
                : 'text-muted-foreground hover:bg-primary/5'
            }`}
          >
            <ShoppingBag className={`h-5 w-5 ${activeTab === 'store' ? 'animate-pulse' : ''}`} />
            <span className={`text-xs font-bold ${activeTab === 'store' ? 'block' : 'hidden'}`}>Store</span>
          </button>
        </div>
      </div>
    </div>
  );
}

const ArrowRight = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
  </svg>
);

