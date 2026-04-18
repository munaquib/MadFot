import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { requestPushPermission, setupMessageNotifications } from "@/lib/notifications";
import Index from "./pages/Index";
import ProductDetail from "./pages/ProductDetail";
import Chat from "./pages/Chat";
import Sell from "./pages/Sell";
import Profile from "./pages/Profile";
import Wishlist from "./pages/Wishlist";
import Search from "./pages/Search";
import Notifications from "./pages/Notifications";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import MyOrders from "./pages/MyOrders";
import MyReviews from "./pages/MyReviews";
import VerifyAccount from "./pages/VerifyAccount";
import Settings from "./pages/Settings";
import HelpSupport from "./pages/HelpSupport";
import EditProfile from "./pages/EditProfile";
import AdminDashboard from "./pages/AdminDashboard";
import MyAds from "./pages/MyAds";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const NotificationSetup = () => {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    // Request permission and setup listeners
    requestPushPermission(user.id);
    const cleanup = setupMessageNotifications(user.id);
    return cleanup;
  }, [user]);
  return null;
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--gradient-bg)" }}><div className="text-primary font-semibold">Loading...</div></div>;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <NotificationSetup />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/" element={<Index />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/search" element={<Search />} />
            <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
            <Route path="/sell" element={<ProtectedRoute><Sell /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/my-orders" element={<ProtectedRoute><MyOrders /></ProtectedRoute>} />
            <Route path="/my-reviews" element={<ProtectedRoute><MyReviews /></ProtectedRoute>} />
            <Route path="/verify-account" element={<ProtectedRoute><VerifyAccount /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/help" element={<ProtectedRoute><HelpSupport /></ProtectedRoute>} />
            <Route path="/edit-profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/my-ads" element={<ProtectedRoute><MyAds /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

