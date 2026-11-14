import { Navigate, Route, Routes } from 'react-router-dom';
import { CalendarDays, Clapperboard, Palette, Send, Sparkles, UserRound } from 'lucide-react';
import { ComingSoonPage } from '@/components/ComingSoonPage';
import { RedirectIfAuthenticated, RequireAuth } from '@/components/RouteGuards';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { ForgotPasswordPage, ResetPasswordPage } from '@/pages/PasswordPages';
import { ProductsPage } from '@/pages/ProductsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { SignInPage } from '@/pages/SignInPage';
import { SignUpPage } from '@/pages/SignUpPage';

function App() {
  return (
    <Routes>
      <Route element={<RedirectIfAuthenticated />}>
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/sign-up" element={<SignUpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route
            path="/ai-ads"
            element={
              <ComingSoonPage
                eyebrow="AI Ad Generator"
                title="Luxury advertisements"
                description="Turn a product photograph into editorial-grade advertisements in your chosen style, ratio and campaign theme."
                icon={Sparkles}
                requirements={[
                  'An image generation service connected through a secure server function',
                  'Your jewellery photographs stay the reference, so the original piece is preserved',
                ]}
              />
            }
          />
          <Route
            path="/ai-models"
            element={
              <ComingSoonPage
                eyebrow="AI Model Studio"
                title="Models wearing your jewellery"
                description="Generate fashion campaigns featuring AI models wearing your pieces, with careful placement guided by your product photos."
                icon={UserRound}
                requirements={[
                  'An image generation service connected through a secure server function',
                  'Your jewellery photographs uploaded to My Products',
                ]}
              />
            }
          />
          <Route
            path="/campaigns"
            element={
              <ComingSoonPage
                eyebrow="Campaign Studio"
                title="Complete campaigns"
                description="Build a full marketing kit for a product: posters, feed posts, stories, banners, captions, hashtags and calls to action."
                icon={Clapperboard}
                requirements={[
                  'An image generation service and a text generation service connected through secure server functions',
                ]}
              />
            }
          />
          <Route
            path="/instagram"
            element={
              <ComingSoonPage
                eyebrow="Instagram Publishing"
                title="Publish to Instagram"
                description="Connect your Instagram professional account and publish or schedule approved advertisements through Meta's official API."
                icon={Send}
                requirements={[
                  'An Instagram professional (Business or Creator) account',
                  'A Meta developer app with Instagram Graph API permissions approved',
                  'Meta app credentials stored as secure server settings',
                ]}
              />
            }
          />
          <Route
            path="/calendar"
            element={
              <ComingSoonPage
                eyebrow="Content Calendar"
                title="Plan your content"
                description="See scheduled campaigns, published posts and drafts across the month and week, and reschedule with a click."
                icon={CalendarDays}
                requirements={['Instagram Publishing connected, so scheduled posts can be sent at the right time']}
              />
            }
          />
          <Route
            path="/brand-kit"
            element={
              <ComingSoonPage
                eyebrow="Brand Kit"
                title="Your brand identity"
                description="Save your logo, colours, typography and default campaign style so every new advertisement carries your brand."
                icon={Palette}
                requirements={['Logo and brand details saved from this page once the Brand Kit is enabled']}
              />
            }
          />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
