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
import { useEffect } from "react";

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

function Router() {
  return (
    <Switch>
      <Route path="/" component={WelcomeScreen} />
      <Route path="/home" component={SearchPage} />
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
