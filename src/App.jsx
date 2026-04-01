import { Toaster } from "@/components/ui/toaster"
import CleaningChecklist from './pages/CleaningChecklist';
import Closing from './pages/Closing';
import ClosingDisplay from './pages/ClosingDisplay';
import Opening from './pages/Opening';
import EmployeeHome from './pages/EmployeeHome';
import EmployeeProfile from './pages/EmployeeProfile';
import EmployeesImproved from './pages/EmployeesImproved';
import Stationsplan from './pages/Stationsplan';
import OperatorDashboard from './pages/OperatorDashboard';
import NotificationSettings from './pages/NotificationSettings';
import DataProtection from './pages/DataProtection';
import Impressum from './pages/Impressum';
import PrivacyPolicy from './pages/PrivacyPolicy';
import AGB from './pages/AGB';
import AuditLog from './pages/AuditLog';
import ConsentDialog from '@/components/legal/ConsentDialog';
import { useConsent } from '@/components/legal/useConsent';
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

const { Pages, Layout, mainPage } = pagesConfig;
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
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
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
      <Route path="/CleaningChecklist" element={<CleaningChecklist />} />
      <Route path="/Closing" element={<LayoutWrapper currentPageName="Closing"><Closing /></LayoutWrapper>} />
      <Route path="/Opening" element={<LayoutWrapper currentPageName="Opening"><Opening /></LayoutWrapper>} />
      <Route path="/EmployeeHome" element={<LayoutWrapper currentPageName="EmployeeHome"><EmployeeHome /></LayoutWrapper>} />
      <Route path="/OperatorDashboard" element={<LayoutWrapper currentPageName="OperatorDashboard"><OperatorDashboard /></LayoutWrapper>} />
      <Route path="/ClosingDisplay" element={<ClosingDisplay />} />
      <Route path="/Stationsplan" element={<LayoutWrapper currentPageName="Stationsplan"><Stationsplan /></LayoutWrapper>} />
      <Route path="/NotificationSettings" element={<LayoutWrapper currentPageName="NotificationSettings"><NotificationSettings /></LayoutWrapper>} />
      <Route path="/EmployeeProfile" element={<LayoutWrapper currentPageName="EmployeeProfile"><EmployeeProfile /></LayoutWrapper>} />
      <Route path="/EmployeeProfile/:id" element={<LayoutWrapper currentPageName="EmployeeProfile"><EmployeeProfile /></LayoutWrapper>} />
      <Route path="/EmployeesImproved" element={<LayoutWrapper currentPageName="EmployeesImproved"><EmployeesImproved /></LayoutWrapper>} />
      <Route path="/DataProtection" element={<LayoutWrapper currentPageName="DataProtection"><DataProtection /></LayoutWrapper>} />
      <Route path="/Impressum" element={<LayoutWrapper currentPageName="Impressum"><Impressum /></LayoutWrapper>} />
      <Route path="/PrivacyPolicy" element={<LayoutWrapper currentPageName="PrivacyPolicy"><PrivacyPolicy /></LayoutWrapper>} />
      <Route path="/AGB" element={<LayoutWrapper currentPageName="AGB"><AGB /></LayoutWrapper>} />
      <Route path="/AuditLog" element={<LayoutWrapper currentPageName="AuditLog"><AuditLog /></LayoutWrapper>} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>

    {/* Consent Dialog */}
    <ConsentDialog
      open={needsNewConsent}
      onConsent={saveConsent}
      isLoading={isConsentLoading}
    />
    );
    };


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