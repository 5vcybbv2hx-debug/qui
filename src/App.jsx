import { Toaster } from "@/components/ui/toaster"
import ConsentDialog from '@/components/legal/ConsentDialog';
import { useConsent } from '@/components/legal/useConsent';
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import PublicWeeklySpecialDisplay from './pages/PublicWeeklySpecialDisplay';

const { Pages, CorePages, SpecialPagesWithLayout, PublicPages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const { needsNewConsent, saveConsent, isLoading: isConsentLoading } = useConsent();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <>
    <Routes>
      {/* Main landing page */}
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />

      {/* Core pages: all with layout */}
      {Object.entries(CorePages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}

      {/* Special pages: all with layout */}
      {Object.entries(SpecialPagesWithLayout).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}

      {/* Dynamic employee profile route */}
      <Route path="/EmployeeProfile/:id" element={
        <LayoutWrapper currentPageName="EmployeeProfile">
          <SpecialPagesWithLayout.EmployeeProfile />
        </LayoutWrapper>
      } />

      {/* Public pages: NO layout wrapper */}
      {Object.entries(PublicPages).map(([path, Page]) => (
        <Route key={path} path={`/${path}`} element={<Page />} />
      ))}

      {/* Storage location scan with dynamic ID */}
      <Route path="/StorageLocationScan/:id" element={<PublicPages.StorageLocationScan />} />

      {/* Public Weekly Special Display */}
      <Route path="/PublicWeeklySpecialDisplay" element={<PublicWeeklySpecialDisplay />} />

      {/* Redirect old EmployeeHome links to Dashboard */}
      <Route path="/EmployeeHome" element={<Navigate to="/" replace />} />

      {/* Catch-all */}
      <Route path="*" element={<PageNotFound />} />
    </Routes>

    {/* Consent Dialog */}
    <ConsentDialog
      open={needsNewConsent}
      onConsent={saveConsent}
      isLoading={isConsentLoading}
    />
    </>
  );
}

function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App