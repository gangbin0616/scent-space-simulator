import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import Header from "./components/Header";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import SearchResults from "./pages/SearchResults";
import Navigation from "./pages/Navigation";
import Profile from "./pages/Profile";
import Reports from "./pages/Reports";
import Orchestrator from "./pages/Orchestrator";
import { useLocation } from "wouter";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/landing"} component={Home} />
      <Route path={"/search"} component={SearchResults} />
      <Route path={"/navigation/:sessionId"} component={Navigation} />
      <Route path={"/profile"} component={Profile} />
      <Route path={"/reports"} component={Reports} />
      <Route path={"/orchestrator"} component={Orchestrator} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [location] = useLocation();
  const showAppHeader = location !== "/" && location !== "/landing";

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          {showAppHeader && <Header />}
          <main className="min-h-screen bg-background text-foreground">
            <Router />
          </main>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
