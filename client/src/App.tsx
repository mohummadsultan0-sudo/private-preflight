/** Audit Ledger style: all product pages share a calm, evidence-first shell rather than generic marketing chrome. */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

const ImageInspectorPage = lazy(() => import("./pages/ImageInspector"));
const Privacy = lazy(() => import("./pages/Privacy"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Guide = lazy(async () => ({ default: (await import("./pages/Guide")).Guide }));


function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/image-inspector"} component={ImageInspectorPage} />
      <Route path={"/csv-formula-injection-scanner"} component={() => <Guide kind="formula" />} />
      <Route path={"/csv-validator"} component={() => <Guide kind="validator" />} />
      <Route path={"/csv-duplicate-finder"} component={() => <Guide kind="duplicates" />} />
      <Route path={"/csv-pii-checker"} component={() => <Guide kind="pii" />} />
      <Route path={"/privacy"} component={Privacy} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Suspense fallback={<div className="route-loading" role="status" aria-live="polite">Opening local inspection workspace…</div>}><Router /></Suspense>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
