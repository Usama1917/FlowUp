import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, UserCircle2, Check } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { getTranslations } from '@/i18n/translations';
import { users } from '@/data/mockData';

const avatarColors = ['bg-primary', 'bg-secondary', 'bg-green-500', 'bg-amber-500', 'bg-rose-500', 'bg-purple-600'];

export function RoleSwitcher() {
  const [open, setOpen] = useState(false);
  const { currentUser, setCurrentUserId, lang } = useApp();
  const tr = getTranslations(lang);

  const roleLabel = (role: string) => {
    const map: Record<string, string> = {
      manager: tr.roleManager,
      design_supervisor: tr.roleDesignSupervisor,
      scientific_supervisor: tr.roleScientificSupervisor,
      designer: tr.roleDesigner,
    };
    return map[role] || role;
  };

  return (
    <div className="fixed bottom-5 end-5 z-50">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute bottom-full mb-2 end-0 w-60 bg-card border border-border rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="px-3 py-2.5 border-b border-border bg-muted/50">
              <p className="text-xs font-medium text-muted-foreground">{tr.switchRole}</p>
            </div>
            <div className="p-1.5">
              {users.map((u, i) => (
                <motion.button
                  key={u.id}
                  whileHover={{ x: lang === 'ar' ? -3 : 3 }}
                  onClick={() => { setCurrentUserId(u.id); setOpen(false); }}
                  data-testid={`role-option-${u.id}`}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-colors duration-150 ${currentUser.id === u.id ? 'bg-secondary/10' : 'hover:bg-muted/70'}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 ${avatarColors[i % avatarColors.length]}`}>
                    {u.avatar}
                  </div>
                  <div className="flex-1 text-start min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{lang === 'ar' ? u.name : u.nameEn}</p>
                    <p className="text-xs text-muted-foreground truncate">{roleLabel(u.role)}</p>
                  </div>
                  {currentUser.id === u.id && (
                    <Check size={14} className="text-secondary flex-shrink-0" />
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => setOpen(!open)}
        data-testid="role-switcher-btn"
        className="flex items-center gap-2 bg-card border border-border rounded-2xl shadow-lg px-3 py-2 transition-colors duration-200 hover:border-secondary/50"
      >
        <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-white text-xs font-semibold">
          {currentUser.avatar}
        </div>
        <div className="text-start hidden sm:block">
          <p className="text-xs font-semibold text-foreground leading-tight">{lang === 'ar' ? currentUser.name : currentUser.nameEn}</p>
          <p className="text-xs text-muted-foreground leading-tight">{roleLabel(currentUser.role)}</p>
        </div>
        <motion.div animate={{ rotate: open ? 0 : 180 }}>
          <ChevronUp size={14} className="text-muted-foreground" />
        </motion.div>
      </motion.button>
    </div>
  );
}
