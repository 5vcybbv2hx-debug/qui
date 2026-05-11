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
import AccountingDashboard from './pages/AccountingDashboard';
import AccountingCashbook from './pages/AccountingCashbook';
import AccountingReceipts from './pages/AccountingReceipts';
import AccountingCreditors from './pages/AccountingCreditors';
import AccountingDebitors from './pages/AccountingDebitors';
import AccountingExport from './pages/AccountingExport';
import AccountingMonthlyClosing from './pages/AccountingMonthlyClosing';
import AccountingFixedCosts from './pages/AccountingFixedCosts';
import AccountingLiabilities from './pages/AccountingLiabilities';
import AccountingBank from './pages/AccountingBank';
import BusinessCard from './pages/BusinessCard';
import AdminTimeEditor from './pages/AdminTimeEditor';
import DataExport from './pages/DataExport';
import MeinTag from './pages/MeinTag';
import ModuleCenter from './pages/ModuleCenter';
import OperativeListen from './pages/OperativeListen';
import BusinessCalendar from './pages/BusinessCalendar';

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



      {/* Digitale Visitenkarte — für alle Mitarbeiter */}
      <Route path="/BusinessCard" element={
        <LayoutWrapper currentPageName="BusinessCard">
          <BusinessCard />
        </LayoutWrapper>
      } />

      {/* Redirect old EmployeeHome links to Dashboard */}
      <Route path="/EmployeeHome" element={<Navigate to="/" replace />} />

      {/* Admin Zeit-Editor */}
      <Route path="/AdminTimeEditor" element={
        <LayoutWrapper currentPageName="AdminTimeEditor">
          <AdminTimeEditor />
        </LayoutWrapper>
      } />

      {/* Datenexport & Migration */}
      <Route path="/DataExport" element={
        <LayoutWrapper currentPageName="DataExport">
          <DataExport />
        </LayoutWrapper>
      } />

      {/* Mein Tag — Mitarbeiter Tagesansicht */}
      <Route path="/MeinTag" element={
        <LayoutWrapper currentPageName="MeinTag">
          <MeinTag />
        </LayoutWrapper>
      } />

      {/* Modulcenter — Admin Modulverwaltung */}
      <Route path="/ModuleCenter" element={
        <LayoutWrapper currentPageName="ModuleCenter">
          <ModuleCenter />
        </LayoutWrapper>
      } />

      {/* Operative Listen */}
      <Route path="/OperativeListen" element={
        <LayoutWrapper currentPageName="OperativeListen">
          <OperativeListen />
        </LayoutWrapper>
      } />

      {/* Betriebskalender & Sondertage */}
      <Route path="/BusinessCalendar" element={
        <LayoutWrapper currentPageName="BusinessCalendar">
          <BusinessCalendar />
        </LayoutWrapper>
      } />

      {/* Buchhaltungsmodul */}
      <Route path="/AccountingDashboard" element={<LayoutWrapper currentPageName="AccountingDashboard"><AccountingDashboard /></LayoutWrapper>} />
      <Route path="/AccountingCashbook" element={<LayoutWrapper currentPageName="AccountingCashbook"><AccountingCashbook /></LayoutWrapper>} />
      <Route path="/AccountingReceipts" element={<LayoutWrapper currentPageName="AccountingReceipts"><AccountingReceipts /></LayoutWrapper>} />
      <Route path="/AccountingCreditors" element={<LayoutWrapper currentPageName="AccountingCreditors"><AccountingCreditors /></LayoutWrapper>} />
      <Route path="/AccountingDebitors" element={<LayoutWrapper currentPageName="AccountingDebitors"><AccountingDebitors /></LayoutWrapper>} />
      <Route path="/AccountingExport" element={<LayoutWrapper currentPageName="AccountingExport"><AccountingExport /></LayoutWrapper>} />
      <Route path="/AccountingMonthlyClosing" element={<LayoutWrapper currentPageName="AccountingMonthlyClosing"><AccountingMonthlyClosing /></LayoutWrapper>} />
      <Route path="/AccountingFixedCosts" element={<LayoutWrapper currentPageName="AccountingFixedCosts"><AccountingFixedCosts /></LayoutWrapper>} />
      <Route path="/AccountingLiabilities" element={<LayoutWrapper currentPageName="AccountingLiabilities"><AccountingLiabilities /></LayoutWrapper>} />
      <Route path="/AccountingBank" element={<LayoutWrapper currentPageName="AccountingBank"><AccountingBank /></LayoutWrapper>} />

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
          <Routes>
            {/* Public pages (NO auth check, rendered outside AuthenticatedApp) */}
            <Route path="/PublicDrinkMenu" element={<PublicPages.PublicDrinkMenu />} />
            <Route path="/PublicWeeklySpecialDisplay" element={<PublicWeeklySpecialDisplay />} />
            <Route path="/StorageLocationScan/:id" element={<PublicPages.StorageLocationScan />} />

            {/* All authenticated pages */}
            <Route path="*" element={<AuthenticatedApp />} />
          </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App