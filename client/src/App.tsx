import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Link, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import SearchPage from "./pages/SearchPage";
import EcommercePage from "./pages/EcommercePage";
import FoodPage from "./pages/FoodPage";
import RidesPage from "./pages/RidesPage";
import TravelPage from "./pages/TravelPage";
import HospitalityPage from "./pages/HospitalityPage";
import DashboardPage from "./pages/DashboardPage";
import AuthPage from "./pages/AuthPage";
import AboutPage from "./pages/AboutPage";
import ProfilePage from "./pages/ProfilePage";
import ContactPage from "./pages/ContactPage";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

function Redirect({ to }: { to: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation(to);
  }, [setLocation, to]);
  return null;
}

function WelcomeScreen() {
  return (
    <div className="mobile-stage">
      <div className="fit-shell">
        <div className="phone-screen">
          <section className="screen onboarding-screen">
            <div className="hero-logo" aria-hidden="true">
              <div className="brand-logo" style={{ fontSize: 84, lineHeight: 1 }}>
                ⚡
              </div>
            </div>
            <div className="hero-copy">
              <h1 className="hero-title">
                <span>Stop Searching</span>
                <span className="hero-title-accent">Start Deciding</span>
              </h1>
              <p className="hero-description">
                Algorithec is your AI decision engine that finds the single best option across food, rides and more all in one place.
              </p>
              <p className="hero-description hero-description-bottom">
                No switching apps. No endless comparisons. Just the smartest choice, instantly.
              </p>
            </div>
            <div className="hero-actions">
              <Link className="button primary-button" href="/login">
                <span>Get Started</span>
                <ArrowRight size={28} strokeWidth={2.2} />
              </Link>
              <Link className="button secondary-button" href="/login">
                Log In
              </Link>
              <Link className="button secondary-button" href="/home">
                Continue as guest
              </Link>
            </div>
            <p className="bottom-note">Engineered by Algorithec</p>
          </section>
        </div>
      </div>
    </div>
  );
}

function HistoryScreen() {
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState<"All" | "Food" | "Rides">("All");
  const entries = [
    { brand: "zomato", title: "Dum Biryani", range: "Apr 10 - Apr 12, 2023", category: "Food", status: "Ongoing" },
    { brand: "J", title: "jumbo veg Burger", range: "Apr 10 - Apr 12, 2023", category: "Rides", status: "Complete" },
    { brand: "D", title: "Pizza Family Pack", range: "Apr 10 - Apr 12, 2023", category: "Food", status: "Cancel" },
  ] as const;

  const shown = entries.filter((e) => (filter === "All" ? true : e.category === filter));
  const statusClass = (s: string) =>
    s === "Ongoing" ? "history-status-ongoing" : s === "Complete" ? "history-status-complete" : "history-status-cancel";

  const brandClass = (b: string) =>
    b === "zomato" ? "history-brand-zomato" : b === "J" ? "history-brand-jumbo" : "history-brand-domino";

  return (
    <div className="mobile-stage">
      <div className="fit-shell">
        <div className="phone-screen">
          <section className="screen history-screen">
            <div className="simple-topbar">
              <button className="simple-topbar-button" type="button" onClick={() => setLocation("/home")} aria-label="Back">
                ←
              </button>
              <h2 className="simple-topbar-title">History</h2>
              <div className="simple-topbar-space" />
            </div>

            <div className="history-filter-row" role="tablist" aria-label="History filters">
              {(["All", "Food", "Rides"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  className={`history-filter-pill ${filter === k ? "history-filter-pill-active" : ""}`}
                  onClick={() => setFilter(k)}
                >
                  {k}
                </button>
              ))}
            </div>

            <div className="history-card-list">
              {shown.map((h) => (
                <div key={`${h.brand}_${h.title}`} className="history-booking-card">
                  <div className={`history-brand-badge ${brandClass(h.brand)}`}>{h.brand}</div>
                  <div className="history-booking-copy">
                    <strong>{h.title}</strong>
                    <span>
                      {h.range} • {h.category}
                    </span>
                  </div>
                  <div className={`history-status-pill ${statusClass(h.status)}`}>{h.status}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={WelcomeScreen} />
      <Route path="/home" component={SearchPage} />
      <Route path="/history" component={HistoryScreen} />
      <Route path="/login" component={AuthPage} />
      <Route path="/auth">
        <Redirect to="/login" />
      </Route>
      <Route path="/web" component={Home} />
      <Route path="/search" component={SearchPage} />
      <Route path="/deals">
        <Redirect to="/web" />
      </Route>
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/ecommerce" component={EcommercePage} />
      <Route path="/food" component={FoodPage} />
      <Route path="/rides" component={RidesPage} />
      <Route path="/travel" component={TravelPage} />
      <Route path="/hospitality" component={HospitalityPage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
