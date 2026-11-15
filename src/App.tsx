import { Navigate, Route, Routes } from 'react-router-dom';
import { RedirectIfAuthenticated, RequireAuth } from '@/components/RouteGuards';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { AiAdGeneratorPage } from '@/pages/AiAdGeneratorPage';
import { AiModelStudioPage } from '@/pages/AiModelStudioPage';
import { BrandKitPage } from '@/pages/BrandKitPage';
import { CalendarPage } from '@/pages/CalendarPage';
import { CampaignsPage } from '@/pages/CampaignsPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { InstagramPage } from '@/pages/InstagramPage';
import { ForgotPasswordPage, ResetPasswordPage } from '@/pages/PasswordPages';
import { ProductsPage } from '@/pages/ProductsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { SignInPage } from '@/pages/SignInPage';
import { SignUpPage } from '@/pages/SignUpPage';

function App() {
  return (
    <Routes>
      {/* Public routes — redirect to /dashboard if already authenticated */}
      <Route element={<RedirectIfAuthenticated />}>
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/sign-up" element={<SignUpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      {/* Password Recovery callback route */}
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Protected routes — require authenticated user */}
      <Route element={<RequireAuth />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/ai-ads" element={<AiAdGeneratorPage />} />
          <Route path="/ai-models" element={<AiModelStudioPage />} />
          <Route path="/campaigns" element={<CampaignsPage />} />
          <Route path="/instagram" element={<InstagramPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/brand-kit" element={<BrandKitPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
