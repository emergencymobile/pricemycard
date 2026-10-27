import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import { CurrencyProvider } from '@/lib/currency';

import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import LoginRedirect from '@/components/LoginRedirect';
import AdminRoute from '@/components/AdminRoute';
import TermsGate from '@/components/legal/TermsGate';
import { lazy, Suspense } from 'react';

const Home = lazy(() => import('@/pages/Home'));
const SearchPage = lazy(() => import('@/pages/SearchPage'));
const ListingDetail = lazy(() => import('@/pages/ListingDetail'));
const SellPage = lazy(() => import('@/pages/SellPage'));
const CartPage = lazy(() => import('@/pages/CartPage'));
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const OrdersPage = lazy(() => import('@/pages/OrdersPage'));
const MessagesPage = lazy(() => import('@/pages/MessagesPage'));
const FavoritesPage = lazy(() => import('@/pages/FavoritesPage'));
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage'));
const AddressesPage = lazy(() => import('@/pages/AddressesPage'));
const AdminPage = lazy(() => import('@/pages/AdminPage'));
const WebSearchPage = lazy(() => import('@/pages/WebSearchPage'));
const TermsPage = lazy(() => import('@/pages/TermsPage'));
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage'));
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));

const PageFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
  </div>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center">
          <img src="/logo.png" alt="Price My Card" className="h-14 w-auto mx-auto mb-4" />
          <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Suspense fallback={<PageFallback />}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/web-search" element={<WebSearchPage />} />
        <Route path="/listing/:id" element={<ListingDetail />} />
        <Route element={<ProtectedRoute unauthenticatedElement={<LoginRedirect />} />}>
          <Route path="/sell" element={<SellPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/addresses" element={<AddressesPage />} />
        </Route>
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminPage />} />
        </Route>
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </Suspense>
  );
};

function App() {
  return (
    <AuthProvider>
      <CurrencyProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <ScrollToTop />
            <TermsGate>
              <AuthenticatedApp />
            </TermsGate>
          </Router>
          <Toaster />
        </QueryClientProvider>
      </CurrencyProvider>
    </AuthProvider>
  )
}

export default App