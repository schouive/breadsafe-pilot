import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { OfflineIndicator } from "@/components/layout/OfflineIndicator";
import { Loader2 } from "lucide-react";

// Lazy load layouts
const HACCPLayout = lazy(() => import("@/components/layout/HACCPLayout").then(m => ({ default: m.HACCPLayout })));
const ProductsLayout = lazy(() => import("@/components/layout/ProductsLayout").then(m => ({ default: m.ProductsLayout })));
const SettingsLayout = lazy(() => import("@/components/layout/SettingsLayout").then(m => ({ default: m.SettingsLayout })));
const OrdersLayout = lazy(() => import("@/components/layout/OrdersLayout").then(m => ({ default: m.OrdersLayout })));

// Lazy load pages
const Home = lazy(() => import("./pages/Home"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Controls = lazy(() => import("./pages/Controls"));
const NewRecipe = lazy(() => import("./pages/NewRecipe"));
const EditRecipe = lazy(() => import("./pages/EditRecipe"));
const RecipesList = lazy(() => import("./pages/RecipesList"));
const ControlHistory = lazy(() => import("./pages/ControlHistory"));
const NonConformities = lazy(() => import("./pages/NonConformities"));
const Planning = lazy(() => import("./pages/Planning"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const StorageTemperatures = lazy(() => import("./pages/StorageTemperatures"));
const DataExport = lazy(() => import("./pages/DataExport"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ProductSheetManagement = lazy(() => import("@/components/products/ProductSheetManagement").then(m => ({ default: m.ProductSheetManagement })));
const CartonLabelManagement = lazy(() => import("@/components/products/CartonLabelManagement").then(m => ({ default: m.CartonLabelManagement })));
const RecipeData = lazy(() => import("./pages/RecipeData"));
const OrdersList = lazy(() => import("./pages/OrdersList"));
const NewOrder = lazy(() => import("./pages/NewOrder"));
const ReceptionHistory = lazy(() => import("./pages/ReceptionHistory"));
const MetalDetectorControl = lazy(() => import("./pages/MetalDetectorControl"));
const MetalDetectorHistory = lazy(() => import("./pages/MetalDetectorHistory"));
const TimeClock = lazy(() => import("./pages/TimeClock"));
const TimeTrackingDashboard = lazy(() => import("./pages/TimeTrackingDashboard"));
const TimeTrackingHistory = lazy(() => import("./pages/TimeTrackingHistory"));
const TimeTrackingCorrections = lazy(() => import("./pages/TimeTrackingCorrections"));
const TimeTrackingBadges = lazy(() => import("./pages/TimeTrackingBadges"));
const TimeTrackingExport = lazy(() => import("./pages/TimeTrackingExport"));
const TimeTrackingLayout = lazy(() => import("@/components/layout/TimeTrackingLayout").then(m => ({ default: m.TimeTrackingLayout })));
const RDTrialsList = lazy(() => import("./pages/RDTrialsList"));
const RDTrialDetail = lazy(() => import("./pages/RDTrialDetail"));
const PrintLabels = lazy(() => import("./pages/PrintLabels"));


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
    },
  },
});

// Loading fallback component
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        
        {/* Home - Module Selection */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />

        {/* HACCP Module Routes */}
        <Route
          path="/haccp"
          element={<Navigate to="/haccp/dashboard" replace />}
        />
        <Route
          path="/haccp/dashboard"
          element={
            <ProtectedRoute>
              <HACCPLayout>
                <Dashboard />
              </HACCPLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/haccp/controls"
          element={
            <ProtectedRoute>
              <HACCPLayout>
                <Controls />
              </HACCPLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/haccp/controls/:code"
          element={
            <ProtectedRoute>
              <HACCPLayout>
                <ControlHistory />
              </HACCPLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/haccp/metal-detector"
          element={
            <ProtectedRoute>
              <HACCPLayout>
                <MetalDetectorControl />
              </HACCPLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/haccp/metal-detector/history"
          element={
            <ProtectedRoute>
              <HACCPLayout>
                <MetalDetectorHistory />
              </HACCPLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/haccp/reception-history"
          element={
            <ProtectedRoute>
              <HACCPLayout>
                <ReceptionHistory />
              </HACCPLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/haccp/non-conformities"
          element={
            <ProtectedRoute>
              <HACCPLayout>
                <NonConformities />
              </HACCPLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/haccp/temperatures"
          element={
            <ProtectedRoute>
              <HACCPLayout>
                <StorageTemperatures />
              </HACCPLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/haccp/planning"
          element={
            <ProtectedRoute>
              <HACCPLayout>
                <Planning />
              </HACCPLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/haccp/reports"
          element={
            <ProtectedRoute>
              <HACCPLayout>
                <Reports />
              </HACCPLayout>
            </ProtectedRoute>
          }
        />

        {/* Orders Module Routes */}
        <Route
          path="/orders"
          element={<Navigate to="/orders/list" replace />}
        />
        <Route
          path="/orders/list"
          element={
            <ProtectedRoute>
              <OrdersLayout>
                <OrdersList />
              </OrdersLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/new"
          element={
            <ProtectedRoute>
              <OrdersLayout>
                <NewOrder />
              </OrdersLayout>
            </ProtectedRoute>
          }
        />

        {/* Products Module Routes */}
        <Route
          path="/products"
          element={<Navigate to="/products/recipes" replace />}
        />
        <Route
          path="/products/new-recipe"
          element={
            <ProtectedRoute>
              <ProductsLayout>
                <NewRecipe />
              </ProductsLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/products/recipes"
          element={
            <ProtectedRoute>
              <ProductsLayout>
                <RecipesList />
              </ProductsLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/products/recipes/edit/:id"
          element={
            <ProtectedRoute>
              <ProductsLayout>
                <EditRecipe />
              </ProductsLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/products/data"
          element={
            <ProtectedRoute>
              <ProductsLayout>
                <RecipeData />
              </ProductsLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/products/technical-sheet"
          element={
            <ProtectedRoute>
              <ProductsLayout>
                <ProductSheetManagement />
              </ProductsLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/products/carton-labels"
          element={
            <ProtectedRoute>
              <ProductsLayout>
                <CartonLabelManagement />
              </ProductsLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/products/rd-trials"
          element={
            <ProtectedRoute>
              <ProductsLayout>
                <RDTrialsList />
              </ProductsLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/products/rd-trials/:id"
          element={
            <ProtectedRoute>
              <ProductsLayout>
                <RDTrialDetail />
              </ProductsLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/products/print"
          element={
            <ProtectedRoute>
              <ProductsLayout>
                <PrintLabels />
              </ProductsLayout>
            </ProtectedRoute>
          }
        />

        {/* Settings Module Routes */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsLayout>
                <Settings />
              </SettingsLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/export"
          element={
            <ProtectedRoute>
              <SettingsLayout>
                <DataExport />
              </SettingsLayout>
            </ProtectedRoute>
          }
        />

        {/* Time Tracking Module Routes */}
        <Route
          path="/time-clock"
          element={
            <ProtectedRoute>
              <TimeClock />
            </ProtectedRoute>
          }
        />
        <Route
          path="/time-tracking"
          element={<Navigate to="/time-tracking/dashboard" replace />}
        />
        <Route
          path="/time-tracking/dashboard"
          element={
            <ProtectedRoute>
              <TimeTrackingLayout>
                <TimeTrackingDashboard />
              </TimeTrackingLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/time-tracking/history"
          element={
            <ProtectedRoute>
              <TimeTrackingLayout>
                <TimeTrackingHistory />
              </TimeTrackingLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/time-tracking/corrections"
          element={
            <ProtectedRoute>
              <TimeTrackingLayout>
                <TimeTrackingCorrections />
              </TimeTrackingLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/time-tracking/badges"
          element={
            <ProtectedRoute>
              <TimeTrackingLayout>
                <TimeTrackingBadges />
              </TimeTrackingLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/time-tracking/export"
          element={
            <ProtectedRoute>
              <TimeTrackingLayout>
                <TimeTrackingExport />
              </TimeTrackingLayout>
            </ProtectedRoute>
          }
        />

        {/* Legacy redirects */}
        <Route path="/controls" element={<Navigate to="/haccp/controls" replace />} />
        <Route path="/controls/:code" element={<Navigate to="/haccp/controls/:code" replace />} />
        <Route path="/non-conformities" element={<Navigate to="/haccp/non-conformities" replace />} />
        <Route path="/storage-temperatures" element={<Navigate to="/haccp/temperatures" replace />} />
        <Route path="/planning" element={<Navigate to="/haccp/planning" replace />} />
        <Route path="/reports" element={<Navigate to="/haccp/reports" replace />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-center" />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <OfflineIndicator />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
