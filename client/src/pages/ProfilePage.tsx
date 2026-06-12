import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { BadgeCheck, Bell, Mail, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { ordersAPI } from "@/services/api";

export default function ProfilePage() {
  const [, setLocation] = useLocation();
  const defaultProfile = useMemo(
    () => ({
      name: "Guest",
      email: "",
      phone: "",
      tier: "Free",
    }),
    []
  );

  const [profile, setProfile] = useState(defaultProfile);
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState({ name: "", email: "", phone: "" });
  const [orderCount, setOrderCount] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch("/api/users/profile", {
          credentials: "include",
        });
        const json = (await resp.json()) as {
          name: string;
          email: string | null;
          phone?: string | null;
          tier: string;
        };
        setProfile({
          name: json.name || "Guest",
          email: json.email || "",
          phone: json.phone || "",
          tier: json.tier || "Free",
        });
      } catch {
        return;
      }
    })();
  }, [defaultProfile]);

  useEffect(() => {
    (async () => {
      try {
        const data = await ordersAPI.listOrders(100);
        const items = Array.isArray(data?.items)
          ? (data.items as Array<unknown>)
          : [];
        setOrderCount(items.length);
      } catch {
        setOrderCount(null);
      }
    })();
  }, []);

  const stats = [
    { label: "Total Savings", value: "₹24,580" },
    { label: "Cashback", value: "₹3,240" },
    { label: "Orders", value: orderCount === null ? "—" : String(orderCount) },
    { label: "Alerts", value: "5" },
  ];

  return (
    <div className="mobile-stage">
      <div className="fit-shell">
        <div className="phone-screen">
          <main
            className="screen"
            style={{ paddingTop: 16, paddingBottom: 28 }}
          >
            <div className="simple-topbar">
              <button
                className="simple-topbar-button"
                type="button"
                onClick={() => setLocation("/home")}
                aria-label="Back"
              >
                ←
              </button>
              <h2 className="simple-topbar-title">Profile</h2>
              <div className="simple-topbar-space" />
            </div>

            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4"
            >
              <div className="rounded-2xl border border-amber-100 bg-white/95 p-4 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white">
                    <User className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xl font-bold text-foreground truncate">
                        {profile.name}
                      </p>
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
                        <BadgeCheck className="w-4 h-4" />
                        {profile.tier}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{profile.email || "—"}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  {stats.map(s => (
                    <div
                      key={s.label}
                      className="rounded-xl border border-amber-100 bg-amber-50/40 p-3"
                    >
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p className="mt-1 text-lg font-bold text-foreground">
                        {s.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setDraft({
                        name: profile.name,
                        email: profile.email,
                        phone: profile.phone,
                      });
                      setEditOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={async () => {
                      try {
                        await fetch("/auth/logout", {
                          method: "POST",
                          credentials: "include",
                        });
                        window.location.href = "/login";
                      } catch {
                        toast.error("Logout failed.");
                      }
                    }}
                  >
                    Logout
                  </Button>
                </div>
              </div>
            </motion.section>

            <section className="mt-4">
              <div className="rounded-2xl border border-amber-100 bg-white/95 p-4 shadow-sm">
                <div className="text-sm font-semibold text-foreground">
                  Quick actions
                </div>
                <div className="mt-3 space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setLocation("/history")}
                  >
                    🧾 Purchase history
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    🎯 Manage price alerts
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    ⚙️ Account settings
                  </Button>
                </div>
              </div>
            </section>

            <section className="mt-4">
              <div className="rounded-2xl border border-amber-100 bg-white/95 p-4 shadow-sm">
                <div className="text-sm font-semibold text-foreground">
                  Preferences
                </div>
                <div className="mt-3 space-y-2">
                  {[
                    {
                      title: "Email notifications",
                      icon: Mail,
                      value: "Enabled",
                    },
                    {
                      title: "Push notifications",
                      icon: Bell,
                      value: "Enabled",
                    },
                    { title: "Weekly summary", icon: Bell, value: "Disabled" },
                  ].map(row => {
                    const Icon = row.icon;
                    return (
                      <div
                        key={row.title}
                        className="flex items-center justify-between gap-4 rounded-xl border border-amber-100 bg-white p-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-900">
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">
                              {row.title}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {row.value}
                            </p>
                          </div>
                        </div>
                        <Button variant="outline">Change</Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Name
              </label>
              <Input
                value={draft.name}
                onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Email
              </label>
              <Input
                type="email"
                value={draft.email}
                onChange={e => setDraft(d => ({ ...d, email: e.target.value }))}
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Phone
              </label>
              <Input
                value={draft.phone}
                onChange={e => setDraft(d => ({ ...d, phone: e.target.value }))}
                placeholder="+91XXXXXXXXXX"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
              onClick={() => {
                const name = draft.name.trim();
                const email = draft.email.trim();
                const phone = draft.phone.trim();
                if (!name) {
                  toast.error("Please enter your name.");
                  return;
                }
                const next = { ...profile, name, email, phone };
                setProfile(next);
                toast.success("Profile updated (UI only).");
                setEditOpen(false);
              }}
            >
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
