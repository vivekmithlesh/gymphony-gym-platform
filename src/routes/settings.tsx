import { createFileRoute } from "@tanstack/react-router";
import { SettingsView } from "@/components/SettingsView";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Account Settings — Gymphony" },
      {
        name: "description",
        content: "Manage your Gymphony account security and preferences.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <ProtectedRoute requiredRole="owner">
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Navbar />
        <main className="flex-grow container mx-auto px-6 py-24">
          <SettingsView initialCategory="Security" />
        </main>
        <Footer />
      </div>
    </ProtectedRoute>
  );
}
