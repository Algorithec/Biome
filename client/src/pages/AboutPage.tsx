import { motion } from "framer-motion";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import { Shield, Sparkles, Users } from "lucide-react";

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function AboutPage() {
  const highlights = [
    {
      title: "Transparent",
      description:
        "Clear results, clear reasoning. See why a deal is recommended.",
      icon: Shield,
    },
    {
      title: "Intelligent",
      description:
        "AI-assisted discovery across platforms with intent-aware search.",
      icon: Sparkles,
    },
    {
      title: "User-First",
      description:
        "Built to save time and money, without changing how you shop.",
      icon: Users,
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
            <motion.div
              variants={container}
              initial="hidden"
              animate="visible"
              className="max-w-3xl"
            >
              <motion.p
                variants={item}
                className="inline-flex items-center rounded-full bg-amber-100/70 px-4 py-2 text-sm font-semibold text-amber-900"
              >
                About Biome
              </motion.p>

              <motion.h1
                variants={item}
                className="mt-6 text-4xl md:text-6xl font-bold leading-tight tracking-tight text-foreground"
              >
                A smarter way to find the best deal, every time.
              </motion.h1>

              <motion.p
                variants={item}
                className="mt-6 text-lg md:text-xl text-muted-foreground leading-relaxed"
              >
                Biome helps you compare options across domains, apply offers,
                and make confident decisions with AI-powered recommendations.
                Built for speed, clarity, and everyday savings.
              </motion.p>
            </motion.div>
          </div>
        </section>

        <section className="py-16 md:py-20 bg-white">
          <div className="container">
            <motion.div
              variants={container}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-10% 0px" }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {highlights.map(h => {
                const Icon = h.icon;
                return (
                  <motion.div
                    key={h.title}
                    variants={item}
                    className="rounded-2xl border border-amber-100 bg-gradient-to-b from-white to-amber-50/40 p-8 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-amber-100 p-3 text-amber-900">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="text-xl font-bold text-foreground">
                        {h.title}
                      </h3>
                    </div>
                    <p className="mt-4 text-sm md:text-base text-muted-foreground leading-relaxed">
                      {h.description}
                    </p>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>

        <section className="py-16 md:py-20 bg-gradient-to-b from-white to-amber-50/50">
          <div className="container">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
              <div className="rounded-2xl border border-amber-100 bg-white p-8 shadow-sm">
                <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                  Our mission
                </h2>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  Make commerce decisions simple. Biome brings search,
                  comparison, and deal intelligence into one place so you can
                  focus on what matters—choosing the right option.
                </p>
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
                    <p className="text-sm font-semibold text-foreground">
                      Cross-platform results
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Compare prices, ratings, and value signals.
                    </p>
                  </div>
                  <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
                    <p className="text-sm font-semibold text-foreground">
                      Explainable recommendations
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Know why something is the best pick.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-100 bg-white p-8 shadow-sm">
                <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                  What we build
                </h2>
                <div className="mt-6 space-y-4">
                  {[
                    {
                      title: "Deal discovery",
                      description:
                        "Search and compare across domains like e-commerce, food, rides, travel, and more.",
                    },
                    {
                      title: "Savings automation",
                      description:
                        "Surface relevant offers and stack savings signals to maximize value.",
                    },
                    {
                      title: "Decision clarity",
                      description:
                        "Concise insights so you can buy faster with fewer tabs and less guesswork.",
                    },
                  ].map(row => (
                    <div
                      key={row.title}
                      className="rounded-xl border border-amber-100 bg-amber-50/40 p-5"
                    >
                      <p className="font-semibold text-foreground">
                        {row.title}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                        {row.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
