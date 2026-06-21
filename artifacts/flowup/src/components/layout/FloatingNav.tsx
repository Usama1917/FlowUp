import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { MessageSquare, CheckSquare, Settings2, BarChart3, ClipboardList, SlidersHorizontal, Globe } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useApp } from '@/contexts/AppContext';
import { getTranslations } from '@/i18n/translations';

const navItems = [
  { key: 'chat', path: '/', icon: MessageSquare, labelKey: 'navChat' as const },
  { key: 'tasks', path: '/tasks', icon: CheckSquare, labelKey: 'navTasks' as const },
  { key: 'admin', path: '/admin', icon: Settings2, labelKey: 'navAdmin' as const },
  { key: 'dashboard', path: '/dashboard', icon: BarChart3, labelKey: 'navDashboard' as const },
  { key: 'audit', path: '/audit', icon: ClipboardList, labelKey: 'navAudit' as const },
  { key: 'settings', path: '/settings', icon: SlidersHorizontal, labelKey: 'navSettings' as const },
];

export function FloatingNav() {
  const [location, navigate] = useLocation();
  const { lang, setLang } = useApp();
  const tr = getTranslations(lang);

  const isActive = (path: string) => {
    if (path === '/') return location === '/';
    return location.startsWith(path);
  };

  return (
    <div className="fixed top-4 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="pointer-events-auto flex items-center gap-1 bg-white/90 dark:bg-card/90 backdrop-blur-xl border border-border/60 shadow-lg rounded-full px-3 py-2"
        style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-1.5 px-2 me-2 border-e border-border/60">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <span className="text-white text-xs font-bold">F</span>
          </div>
          <span className="text-sm font-semibold text-foreground hidden sm:block">FlowUp</span>
        </div>

        {/* Nav Items */}
        {navItems.map(item => {
          const active = isActive(item.path);
          const Icon = item.icon;
          return (
            <Tooltip key={item.key}>
              <TooltipTrigger asChild>
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => navigate(item.path)}
                  data-testid={`nav-${item.key}`}
                  className="relative flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200"
                >
                  {active && (
                    <motion.div
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-xl bg-secondary"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <Icon
                    size={18}
                    className={`relative z-10 transition-colors duration-200 ${active ? 'text-white' : 'text-muted-foreground hover:text-foreground'}`}
                    strokeWidth={active ? 2.5 : 2}
                  />
                </motion.button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {tr[item.labelKey]}
              </TooltipContent>
            </Tooltip>
          );
        })}

        {/* Language Toggle */}
        <div className="ms-2 ps-2 border-s border-border/60">
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
                data-testid="lang-toggle"
                className="flex items-center gap-1.5 px-2.5 h-8 rounded-full bg-muted hover:bg-muted/80 transition-colors duration-200"
              >
                <Globe size={14} className="text-muted-foreground" />
                <span className="text-xs font-medium text-foreground">
                  {lang === 'ar' ? 'EN' : 'ع'}
                </span>
              </motion.button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {lang === 'ar' ? tr.langEnglish : tr.langArabic}
            </TooltipContent>
          </Tooltip>
        </div>
      </motion.div>
    </div>
  );
}
