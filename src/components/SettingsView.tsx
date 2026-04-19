import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  Building2,
  ShieldCheck,
  Bell,
  CreditCard,
  HelpCircle,
  Camera,
  Save,
  ChevronRight,
  Lock,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { settingsLogoUpload } from "@/server/api/settings/logo";
import { settingsNotificationsUpdate } from "@/server/api/settings/notifications";
import { settingsProfile, settingsProfileUpdate } from "@/server/api/settings/profile";
import { toast } from "sonner";

export function SettingsView() {
  const [activeCategory, setActiveCategory] = useState("Gym Profile");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: ["settings-profile"],
    queryFn: () => settingsProfile(),
  });
  const [profileForm, setProfileForm] = useState({
    gymName: "",
    city: "",
    ownerEmail: "",
    contactNumber: "",
  });
  const [notificationForm, setNotificationForm] = useState({
    automaticReminders: true,
    dailySummaryEmail: false,
  });

  useEffect(() => {
    if (!settingsQuery.data) {
      return;
    }

    setProfileForm({
      gymName: settingsQuery.data.gymName,
      city: settingsQuery.data.city,
      ownerEmail: settingsQuery.data.ownerEmail,
      contactNumber: settingsQuery.data.contactNumber,
    });
    setNotificationForm({
      automaticReminders: settingsQuery.data.automaticReminders,
      dailySummaryEmail: settingsQuery.data.dailySummaryEmail,
    });
  }, [settingsQuery.data]);

  const profileMutation = useMutation({
    mutationFn: settingsProfileUpdate,
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["settings-profile"] });
      toast.success(result.message, { position: "bottom-center" });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Unable to update profile", {
        position: "bottom-center",
      });
    },
  });

  const logoMutation = useMutation({
    mutationFn: settingsLogoUpload,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settings-profile"] });
      toast.success("Logo uploaded successfully", { position: "bottom-center" });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Unable to upload logo", {
        position: "bottom-center",
      });
    },
  });

  const notificationMutation = useMutation({
    mutationFn: settingsNotificationsUpdate,
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["settings-profile"] });
      toast.success(result.message, { position: "bottom-center" });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Unable to update notifications", {
        position: "bottom-center",
      });
    },
  });

  const handleSave = () => {
    if (activeCategory !== "Gym Profile") {
      toast.success(`✅ ${activeCategory} settings updated successfully!`, {
        position: "bottom-center",
      });
      return;
    }

    profileMutation.mutate({
      data: {
        gymName: profileForm.gymName.trim(),
        city: profileForm.city.trim(),
        ownerEmail: profileForm.ownerEmail.trim(),
        contactNumber: profileForm.contactNumber.trim(),
      },
    });
  };

  const handleLogoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.set("file", file);
    logoMutation.mutate({ data: formData });
    event.target.value = "";
  };

  const handleNotificationToggle = (
    field: "automaticReminders" | "dailySummaryEmail",
    checked: boolean,
  ) => {
    setNotificationForm((current) => ({
      ...current,
      [field]: checked,
    }));

    notificationMutation.mutate({
      data: {
        [field]: checked,
      },
    });
  };

  const menuItems = [
    { name: "Gym Profile", icon: Building2 },
    { name: "Security", icon: ShieldCheck },
    { name: "Notifications", icon: Bell },
    { name: "Billing & Plans", icon: CreditCard },
    { name: "Help & Support", icon: HelpCircle },
  ];

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="font-display text-3xl font-bold md:text-4xl">
          System <span className="text-gradient-brand">Settings</span>
        </h1>
        <p className="mt-1 text-muted-foreground">
          Manage your gym profile, security, and application preferences.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Navigation Sidebar */}
        <div className="space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.name}
              onClick={() => setActiveCategory(item.name)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                activeCategory === item.name
                  ? "bg-primary/10 text-primary font-bold border border-primary/20 shadow-sm"
                  : "text-muted-foreground hover:bg-white hover:text-slate-700"
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className="h-4 w-4" />
                <span className="text-sm">{item.name}</span>
              </div>
              <ChevronRight
                className={`h-4 w-4 transition-transform ${activeCategory === item.name ? "rotate-90" : "opacity-30"}`}
              />
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {activeCategory === "Gym Profile" && (
                <>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                  <Card className="border-border bg-white shadow-soft">
                    <CardHeader>
                      <CardTitle className="text-lg font-bold text-slate-900">
                        Gym Information
                      </CardTitle>
                      <CardDescription>Update your public profile details.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center gap-6">
                        <div className="relative group">
                          {settingsQuery.data?.logoUrl ? (
                            <img
                              src={settingsQuery.data.logoUrl}
                              alt="Gym logo"
                              className="h-24 w-24 rounded-3xl object-cover shadow-glow"
                            />
                          ) : (
                            <div className="h-24 w-24 rounded-3xl bg-gradient-brand flex items-center justify-center font-bold text-3xl text-white shadow-glow">
                              {profileForm.gymName
                                .split(" ")
                                .filter(Boolean)
                                .slice(0, 2)
                                .map((part) => part[0]?.toUpperCase() ?? "")
                                .join("") || "GY"}
                            </div>
                          )}
                          <button
                            onClick={handleLogoClick}
                            className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl cursor-pointer"
                          >
                            <Camera className="h-6 w-6 text-white" />
                          </button>
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900">
                            {profileForm.gymName || "Gym Name"}
                          </h4>
                          <p className="text-sm text-muted-foreground">Registered since Jan 2024</p>
                          <Button
                            variant="link"
                            className="p-0 h-auto text-primary text-xs font-bold"
                            onClick={handleLogoClick}
                          >
                            Change Logo
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="text-slate-600">Gym Name</Label>
                          <Input
                            value={profileForm.gymName}
                            onChange={(event) =>
                              setProfileForm((current) => ({
                                ...current,
                                gymName: event.target.value,
                              }))
                            }
                            className="bg-slate-50 border-slate-200 rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-600">City</Label>
                          <Input
                            value={profileForm.city}
                            onChange={(event) =>
                              setProfileForm((current) => ({
                                ...current,
                                city: event.target.value,
                              }))
                            }
                            className="bg-slate-50 border-slate-200 rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-600">Owner Email</Label>
                          <Input
                            value={profileForm.ownerEmail}
                            onChange={(event) =>
                              setProfileForm((current) => ({
                                ...current,
                                ownerEmail: event.target.value,
                              }))
                            }
                            className="bg-slate-50 border-slate-200 rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-600">Contact Number</Label>
                          <Input
                            value={profileForm.contactNumber}
                            onChange={(event) =>
                              setProfileForm((current) => ({
                                ...current,
                                contactNumber: event.target.value,
                              }))
                            }
                            className="bg-slate-50 border-slate-200 rounded-xl"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border bg-white shadow-soft">
                    <CardHeader>
                      <CardTitle className="text-lg font-bold text-slate-900">
                        Preferences
                      </CardTitle>
                      <CardDescription>Control your dashboard experience.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-slate-900 font-medium">Automatic Reminders</Label>
                          <p className="text-xs text-muted-foreground">
                            Send WhatsApp links automatically when dues are overdue.
                          </p>
                        </div>
                        <Switch
                          checked={notificationForm.automaticReminders}
                          disabled={notificationMutation.isPending}
                          onCheckedChange={(checked) =>
                            handleNotificationToggle("automaticReminders", checked)
                          }
                          className="data-[state=checked]:bg-primary"
                        />
                      </div>
                      <div className="h-px bg-slate-100" />
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-slate-900 font-medium">Daily Summary Email</Label>
                          <p className="text-xs text-muted-foreground">
                            Receive a report of attendance and payments every morning.
                          </p>
                        </div>
                        <Switch
                          checked={notificationForm.dailySummaryEmail}
                          disabled={notificationMutation.isPending}
                          onCheckedChange={(checked) =>
                            handleNotificationToggle("dailySummaryEmail", checked)
                          }
                          className="data-[state=checked]:bg-primary"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {activeCategory === "Security" && (
                <Card className="border-border bg-white shadow-soft">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Lock className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg font-bold text-slate-900">
                        Security Settings
                      </CardTitle>
                    </div>
                    <CardDescription>
                      Manage your password and authentication methods.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-slate-600">Current Password</Label>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        className="bg-slate-50 border-slate-200 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600">New Password</Label>
                      <Input
                        type="password"
                        placeholder="Enter new password"
                        className="bg-slate-50 border-slate-200 rounded-xl"
                      />
                    </div>
                    <Button
                      variant="outline"
                      className="w-full rounded-xl border-primary/20 text-primary"
                    >
                      Enable Two-Factor Authentication
                    </Button>
                  </CardContent>
                </Card>
              )}

              {activeCategory === "Help & Support" && (
                <Card className="border-border bg-white shadow-soft">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <MessageSquare className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg font-bold text-slate-900">
                        Contact Support
                      </CardTitle>
                    </div>
                    <CardDescription>Need help? Our team is available 24/7.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 text-center py-10">
                    <p className="text-muted-foreground">Have questions about Gymphony?</p>
                    <Button className="rounded-xl bg-primary text-white font-bold px-8 shadow-lg shadow-primary/20">
                      Chat with Us on WhatsApp
                    </Button>
                  </CardContent>
                </Card>
              )}

              {(activeCategory === "Notifications" || activeCategory === "Billing & Plans") && (
                <Card className="border-border bg-white shadow-soft py-20">
                  <CardContent className="text-center space-y-3">
                    <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
                      <Settings className="h-6 w-6 animate-spin-slow" />
                    </div>
                    <h3 className="font-bold text-slate-900">{activeCategory} Coming Soon</h3>
                    <p className="text-sm text-muted-foreground">
                      We're fine-tuning these settings for you.
                    </p>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="ghost"
                  className="rounded-xl text-muted-foreground hover:bg-slate-50"
                >
                  Discard
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={profileMutation.isPending || logoMutation.isPending}
                  className="rounded-xl bg-gradient-brand text-primary-foreground font-bold shadow-glow hover:shadow-primary/40 px-8"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {profileMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
