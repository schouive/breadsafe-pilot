import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { HACCPLayout } from "@/components/layout/HACCPLayout";
import { ProductsLayout } from "@/components/layout/ProductsLayout";
import { SettingsLayout } from "@/components/layout/SettingsLayout";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Controls from "./pages/Controls";
import Products from "./pages/Products";
import NewRecipe from "./pages/NewRecipe";
import EditRecipe from "./pages/EditRecipe";
import RecipesList from "./pages/RecipesList";
import ControlHistory from "./pages/ControlHistory";
import NonConformities from "./pages/NonConformities";
import Planning from "./pages/Planning";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import StorageTemperatures from "./pages/StorageTemperatures";
import DataExport from "./pages/DataExport";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";
import { ProductSheetManagement } from "@/components/products/ProductSheetManagement";
import { CartonLabelManagement } from "@/components/products/CartonLabelManagement";

const queryClient = new QueryClient();

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
        element={<Navigate to="/haccp/controls" replace />}
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

      {/* Legacy redirects */}
      <Route path="/controls" element={<Navigate to="/haccp/controls" replace />} />
      <Route path="/controls/:code" element={<Navigate to="/haccp/controls/:code" replace />} />
      <Route path="/non-conformities" element={<Navigate to="/haccp/non-conformities" replace />} />
      <Route path="/storage-temperatures" element={<Navigate to="/haccp/temperatures" replace />} />
      <Route path="/planning" element={<Navigate to="/haccp/planning" replace />} />
      <Route path="/reports" element={<Navigate to="/haccp/reports" replace />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
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
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
