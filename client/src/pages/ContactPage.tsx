import { motion } from "framer-motion";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import { Button } from "@/components/ui/button";
import { Mail, MapPin, Phone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  const update = (key: "name" | "email" | "message", value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error("Please fill all fields.");
      return;
    }
    setSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 650));
      toast.success("Message sent. We’ll get back to you soon.");
      setForm({ name: "", email: "", message: "" });
    } finally {
      setSubmitting(false);
    }
  };

  const cards = [
    {
      title: "Email",
      value: "support@biome.local",
      icon: Mail,
    },
    {
      title: "Phone",
      value: "+91 99999 00000",
      icon: Phone,
    },
    {
      title: "Location",
      value: "Bengaluru, IN",
      icon: MapPin,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/40 via-white to-white">
      <Header />

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_25%,rgba(251,191,36,0.35),transparent_55%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(249,115,22,0.25),transparent_60%)]" />
          </div>

          <div className="container relative py-16 md:py-24">
            <motion.div variants={container} initial="hidden" animate="visible" className="max-w-3xl">
              <motion.p
                variants={item}
                className="inline-flex items-center rounded-full bg-amber-100/70 px-4 py-2 text-sm font-semibold text-amber-900"
              >
                Contact Us
              </motion.p>
              <motion.h1
                variants={item}
                className="mt-6 text-4xl md:text-6xl font-bold leading-tight tracking-tight text-foreground"
              >
                Let’s talk.
              </motion.h1>
              <motion.p variants={item} className="mt-6 text-lg md:text-xl text-muted-foreground leading-relaxed">
                Have feedback, partnership ideas, or need help? Send a message and we’ll respond.
              </motion.p>
            </motion.div>
          </div>
        </section>

        <section className="py-16 md:py-20 bg-white">
          <div className="container">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
              {cards.map((c, idx) => {
                const Icon = c.icon;
                return (
                  <motion.div
                    key={c.title}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.06 }}
                    className="rounded-2xl border border-amber-100 bg-gradient-to-b from-white to-amber-50/40 p-6 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-amber-100 p-3 text-amber-900">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{c.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">{c.value}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="rounded-2xl border border-amber-100 bg-white p-8 shadow-sm"
              >
                <h2 className="text-2xl font-bold text-foreground">Send a message</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Share as much detail as you can. We typically reply within 1–2 business days.
                </p>

                <form onSubmit={onSubmit} className="mt-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Name</label>
                    <input
                      value={form.name}
                      onChange={(e) => update("name", e.target.value)}
                      placeholder="Your name"
                      className="w-full px-4 py-3 rounded-xl border border-amber-100 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-4 py-3 rounded-xl border border-amber-100 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Message</label>
                    <textarea
                      value={form.message}
                      onChange={(e) => update("message", e.target.value)}
                      rows={6}
                      placeholder="Tell us what you need..."
                      className="w-full px-4 py-3 rounded-xl border border-amber-100 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all bg-white resize-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-11 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl"
                  >
                    {submitting ? "Sending..." : "Send message"}
                  </Button>
                </form>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.06 }}
                className="rounded-2xl border border-amber-100 bg-white p-8 shadow-sm"
              >
                <h2 className="text-2xl font-bold text-foreground">Support hours</h2>
                <div className="mt-5 space-y-3">
                  {[
                    { k: "Mon–Fri", v: "10:00 – 18:00" },
                    { k: "Sat", v: "11:00 – 15:00" },
                    { k: "Sun", v: "Closed" },
                  ].map((row) => (
                    <div key={row.k} className="flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50/40 px-4 py-3">
                      <p className="text-sm font-semibold text-foreground">{row.k}</p>
                      <p className="text-sm text-muted-foreground">{row.v}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 p-5 text-white">
                  <p className="text-sm font-semibold opacity-95">For partnerships</p>
                  <p className="mt-1 text-lg font-bold">partners@biome.local</p>
                  <p className="mt-2 text-sm opacity-90">Share your company and what you’d like to build together.</p>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

