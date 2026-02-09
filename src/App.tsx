import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

// Auth
import Auth from "./pages/Auth";
import PartnerLogin from "./pages/PartnerLogin";

// Partner pages
import PartnerDashboard from "./pages/partner/PartnerDashboard";
import DonorsList from "./pages/partner/DonorsList";
import DonorForm from "./pages/partner/DonorForm";
import DonorDetail from "./pages/partner/DonorDetail";
import Notifications from "./pages/partner/Notifications";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import PartnersList from "./pages/admin/PartnersList";
import AdminDonorsList from "./pages/admin/AdminDonorsList";
import AdminDonorReview from "./pages/admin/AdminDonorReview";
import AdminNotifications from "./pages/admin/AdminNotifications";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Navigate to="/auth" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/login/:slug" element={<PartnerLogin />} />

            {/* Partner routes */}
            <Route
              path="/partner"
              element={
                <ProtectedRoute requiredRole="partner">
                  <PartnerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/partner/donors"
              element={
                <ProtectedRoute requiredRole="partner">
                  <DonorsList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/partner/donors/new"
              element={
                <ProtectedRoute requiredRole="partner">
                  <DonorForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/partner/donors/:id"
              element={
                <ProtectedRoute requiredRole="partner">
                  <DonorDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/partner/donors/:id/edit"
              element={
                <ProtectedRoute requiredRole="partner">
                  <DonorForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/partner/notifications"
              element={
                <ProtectedRoute requiredRole="partner">
                  <Notifications />
                </ProtectedRoute>
              }
            />

            {/* Admin routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/partners"
              element={
                <ProtectedRoute requiredRole="admin">
                  <PartnersList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/donors"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDonorsList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/donors/:id"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDonorReview />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/notifications"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminNotifications />
                </ProtectedRoute>
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
