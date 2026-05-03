import { createFileRoute } from "@tanstack/react-router";
import { SettingsView } from "@/components/SettingsView";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/gym-profile")({
  head: () => ({
    meta: [
      { title: "Gym Profile — Gymphony" },
      {
        name: "description",
        content: "Update your gym profile details on Gymphony.",
      },
    ],
  }),
  component: GymProfilePage,
});

function GymProfilePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-6 py-24">
        <SettingsView initialCategory="Gym Profile" />
      </main>
      <Footer />
    </div>
  );
}
