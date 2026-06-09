import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import ProOnboarding from "./pages/ProOnboarding";
import ProDashboard from "./pages/ProDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ProtectedAdminRoute from "./components/ProtectedAdminRoute";
import ProtectedAuthRoute from "./components/ProtectedAuthRoute";
import ProtectedBuyerRoute from "./components/ProtectedBuyerRoute";
import ProtectedSellerRoute from "./components/ProtectedSellerRoute";
import ProfilePage from "./pages/ProfilePage";
import SearchPage from "./pages/SearchPage";
import BookingsPage from "./pages/BookingsPage";
import ProfessionalDetailPage from "./pages/ProfessionalDetailPage";
import ChatsPage from "./pages/ChatsPage";
import ChatDetailPage from "./pages/ChatDetailPage";
import NotFound from "./pages/NotFound";
import SettingsPage from "./pages/SettingsPage";
import ProNotificationsPage from "./pages/ProNotificationsPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<AuthPage />} />

          {/* Shared authenticated routes — customers AND professionals */}
          <Route element={<ProtectedAuthRoute />}>
            <Route path="/chats" element={<ChatsPage />} />
            <Route path="/chat/:id" element={<ChatDetailPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Buyer-only routes */}
          <Route element={<ProtectedBuyerRoute />}>
            <Route path="/search" element={<SearchPage />} />
            <Route path="/bookings" element={<BookingsPage />} />
            <Route path="/professional/:id" element={<ProfessionalDetailPage />} />
          </Route>

          {/* Seller (professional) routes */}
          <Route element={<ProtectedSellerRoute />}>
            <Route path="/pro/onboarding" element={<ProOnboarding />} />
            <Route path="/pro/dashboard" element={<ProDashboard />} />
            {/* /pro/bookings shows the same BookingsPage filtered for professionals */}
            <Route path="/pro/bookings" element={<BookingsPage />} />
            <Route path="/pro/notifications" element={<ProNotificationsPage />} />
          </Route>

          {/* Admin routes */}
          <Route element={<ProtectedAdminRoute />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
