import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Building2, ArrowRight, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MemberJoinScanner } from "@/components/MemberJoinScanner";
import { extractGymIdFromQr } from "@/lib/app-url";

export const Route = createFileRoute("/member-join")({
  head: () => ({
    meta: [
      { title: "Join a Gym — Gymphony" },
      {
        name: "description",
        content: "Scan your gym's join QR or paste its link to join and pick a plan.",
      },
    ],
  }),
  component: MemberJoinPage,
});

function MemberJoinPage() {
  return (
    <ProtectedRoute requiredRole="member">
      <MemberJoinScreen />
    </ProtectedRoute>
  );
}

function MemberJoinScreen() {
  const navigate = useNavigate();
  const [pasted, setPasted] = useState("");

  const goToGym = (gymId: string) => {
    navigate({ to: "/join/$gymId", params: { gymId } });
  };

  const handlePasteJoin = () => {
    const gymId = extractGymIdFromQr(pasted);
    if (!gymId) {
      toast.error("That doesn't look like a valid gym link or code.");
      return;
    }
    goToGym(gymId);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="grow relative flex items-center justify-center px-6 py-24 md:py-32 overflow-hidden">
        <div className="glow-orb -top-20 left-1/4 h-72 w-72 bg-primary-glow opacity-30" />
        <div className="glow-orb bottom-20 right-1/4 h-96 w-96 bg-primary opacity-20" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,color-mix(in_oklab,var(--color-primary-glow)_10%,transparent),transparent_70%)]" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative w-full max-w-lg"
        >
          <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/5 p-8 md:p-12 shadow-2xl backdrop-blur-xl">
            <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />

            <div className="relative space-y-8">
              <div className="text-center space-y-3">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-glow">
                  <Building2 className="h-7 w-7" />
                </div>
                <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
                  Join your <span className="text-gradient-brand">gym</span>
                </h1>
                <p className="text-sm text-muted-foreground">
                  Scan the gym's "Join Gym" QR, or paste its join link or code below.
                </p>
              </div>

              <div className="flex justify-center">
                <MemberJoinScanner onJoined={goToGym} />
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-transparent px-2 text-muted-foreground font-bold italic">Or paste a link / code</span>
                </div>
              </div>

              <div className="space-y-2 group">
                <Label htmlFor="join-link" className="text-sm font-medium text-foreground/80 group-focus-within:text-primary transition-colors">Gym join link or ID</Label>
                <div className="relative">
                  <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="join-link"
                    value={pasted}
                    onChange={(e) => setPasted(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handlePasteJoin();
                      }
                    }}
                    placeholder="https://…/join/… or gym code"
                    className="h-12 pl-11 bg-white/5 border-white/10 focus:border-primary/50 focus:ring-primary/20 transition-all rounded-xl"
                  />
                </div>
              </div>

              <Button
                onClick={handlePasteJoin}
                disabled={!pasted.trim()}
                className="w-full h-14 rounded-xl bg-gradient-brand text-primary-foreground font-bold text-lg shadow-glow hover:shadow-primary/40 hover:-translate-y-0.5 transition-all group disabled:opacity-70 disabled:cursor-not-allowed"
              >
                Continue <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                <button
                  type="button"
                  onClick={() => navigate({ to: "/member-dashboard" })}
                  className="font-semibold text-primary underline-offset-4 hover:underline"
                >
                  Skip for now
                </button>
              </p>
            </div>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
