import { Switch, Route, Router as WouterRouter } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppProvider } from '@/contexts/AppContext';
import { FloatingNav } from '@/components/layout/FloatingNav';
import { RoleSwitcher } from '@/components/layout/RoleSwitcher';
import { ChatPage } from '@/pages/ChatPage';
import { TasksPage } from '@/pages/TasksPage';
import { AdminPage } from '@/pages/AdminPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { AuditLogPage } from '@/pages/AuditLogPage';
import { SettingsPage } from '@/pages/SettingsPage';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={ChatPage} />
      <Route path="/tasks" component={TasksPage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/audit" component={AuditLogPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppShell() {
  return (
    <div className="min-h-screen bg-background relative">
      <FloatingNav />
      <div className="pt-20 pb-4 h-screen overflow-hidden">
        <Router />
      </div>
      <RoleSwitcher />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <AppShell />
          </WouterRouter>
          <Toaster />
        </AppProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
