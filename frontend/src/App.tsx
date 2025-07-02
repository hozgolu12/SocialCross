import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from '@/contexts/AuthContext';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Dashboard from '@/pages/Dashboard';
import CreatePost from '@/pages/CreatePost';
import SocialAccounts from '@/pages/SocialAccounts';
import Posts from '@/pages/Posts';
import TelegramSetup from '@/components/TelegramSetup';
import ProtectedRoute from '@/components/ProtectedRoute';
import NotFound from "./pages/NotFound";
import Reach from '@/pages/Reach';
import VerifyEmail from '@/pages/VerifyEmail';
import RedditSetup from "./pages/RedditSetup";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <div className="min-h-screen bg-gray-50">
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/create" element={
                <ProtectedRoute>
                  <CreatePost />
                </ProtectedRoute>
              } />
              <Route path="/accounts" element={
                <ProtectedRoute>
                  <SocialAccounts />
                </ProtectedRoute>
              } />
              <Route path="/accounts/telegram-setup" element={<TelegramSetup />} />
              <Route path="/posts" element={
                <ProtectedRoute>
                  <Posts />
                </ProtectedRoute>
              } />
              <Route path="/reach" element={<Reach />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/accounts/reddit-setup" element={<RedditSetup />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </div>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
