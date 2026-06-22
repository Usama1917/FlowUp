import { useLayoutEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { MessageSquare, CheckSquare, Settings2, BarChart3, ClipboardList, SlidersHorizontal, PanelLeft } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { getTranslations } from '@/i18n/translations';
import type { UserRole } from '@/data/mockData';

const navItems = [
  { key: 'chat',      path: '/',          icon: MessageSquare,    labelKey: 'navChat' as const },
  { key: 'tasks',     path: '/tasks',     icon: CheckSquare,      labelKey: 'navTasks' as const },
  { key: 'admin',     path: '/admin',     icon: Settings2,        labelKey: 'navAdmin' as const },
  { key: 'dashboard', path: '/dashboard', icon: BarChart3,        labelKey: 'navDashboard' as const },
  { key: 'audit',     path: '/audit',     icon: ClipboardList,    labelKey: 'navAudit' as const },
  { key: 'settings',  path: '/settings',  icon: SlidersHorizontal,labelKey: 'navSettings' as const },
];

// Per-role hidden nav items. The designer has a focused workspace (no admin/dashboard/audit);
// the scientific (subject) supervisor has no governance access, so Admin is hidden for them.
const HIDDEN_NAV_BY_ROLE: Partial<Record<UserRole, string[]>> = {
  designer: ['admin', 'dashboard', 'audit'],
  scientific_supervisor: ['admin'],
};

export function FloatingNav({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  const [location, navigate] = useLocation();
  const { lang, currentRole } = useApp();
  const tr = getTranslations(lang);

  const isActive = (path: string) => {
    if (path === '/') return location === '/';
    return location.startsWith(path);
  };

  const hidden = HIDDEN_NAV_BY_ROLE[currentRole] ?? [];
  const visibleNavItems = navItems.filter(item => !hidden.includes(item.key));

  // A single sliding highlight: its vertical position tracks the active item (animated),
  // while its width follows the rail (inset-x-2) so expand/collapse stays in sync with the edge.
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState<{ y: number; show: boolean }>({ y: 0, show: false });

  useLayoutEffect(() => {
    const idx = visibleNavItems.findIndex(item => isActive(item.path));
    const el = idx >= 0 ? itemRefs.current[idx] : null;
    if (el) setIndicator({ y: el.offsetTop, show: true });
    else setIndicator(prev => ({ ...prev, show: false }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, currentRole, expanded]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={`fixed top-0 bottom-0 start-0 z-50 flex flex-col gap-1 py-4 px-2 bg-white/90 dark:bg-card/90 backdrop-blur-xl border-e border-border/60 shadow-lg transition-all duration-200 ${expanded ? 'w-52' : 'w-16'}`}
      style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)' }}
    >
      {/* Sliding active highlight (slides between tabs; width follows the rail) */}
      {indicator.show && (
        <motion.div
          className="absolute inset-x-2 h-10 rounded-xl bg-secondary pointer-events-none"
          style={{ top: 0 }}
          initial={false}
          animate={{ y: indicator.y }}
          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
        />
      )}

      {/* Expand / collapse the rail */}
      <button
        onClick={onToggle}
        data-testid="nav-toggle"
        className={`relative z-10 flex items-center h-10 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-200 justify-start ps-3.5 w-full ${expanded ? 'gap-3 pe-3' : ''}`}
      >
        <PanelLeft size={20} className="flex-shrink-0" strokeWidth={2} />
        {expanded && <span className="text-sm font-medium whitespace-nowrap">{lang === 'ar' ? 'القائمة' : 'Menu'}</span>}
      </button>

      <div className="h-px bg-border/60 my-1 mx-1" />

      {visibleNavItems.map((item, i) => {
        const active = isActive(item.path);
        const Icon = item.icon;
        return (
          <motion.button
            key={item.key}
            ref={(el) => { itemRefs.current[i] = el; }}
            whileTap={{ scale: 0.96 }}
            onClick={() => navigate(item.path)}
            data-testid={`nav-${item.key}`}
            className={`group relative z-10 flex items-center h-10 rounded-xl transition-all duration-200 justify-start ps-3.5 w-full ${expanded ? 'gap-3 pe-3' : ''}`}
          >
            <Icon
              size={20}
              className={`flex-shrink-0 transition-colors duration-200 ${active ? 'text-white' : 'text-muted-foreground group-hover:text-foreground'}`}
              strokeWidth={active ? 2.5 : 2}
            />
            {expanded && (
              <span className={`text-sm font-medium whitespace-nowrap ${active ? 'text-white' : 'text-foreground'}`}>
                {tr[item.labelKey]}
              </span>
            )}
            {/* Collapsed-rail label: pure CSS hover tooltip — no JS/focus state, so it can never stick open */}
            {!expanded && (
              <span className="pointer-events-none absolute top-1/2 -translate-y-1/2 start-full ms-2 z-50 whitespace-nowrap rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                {tr[item.labelKey]}
              </span>
            )}
          </motion.button>
        );
      })}
    </motion.div>
  );
}
