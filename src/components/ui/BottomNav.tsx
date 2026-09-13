import { NavLink } from 'react-router-dom';
import { Terminal, Network, BarChart3, User } from 'lucide-react';

const tabs = [
  { to: '/', label: 'Learn', icon: Terminal, end: true },
  { to: '/tree', label: 'Tree', icon: Network, end: false },
  { to: '/stats', label: 'Stats', icon: BarChart3, end: true },
  { to: '/profile', label: 'Profile', icon: User, end: true },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 pb-safe bg-surface border-t border-border">
      <div className="h-14 flex items-center justify-around px-4 max-w-app mx-auto">
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={label}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[44px] transition-colors ${
                isActive ? 'text-accent-cyan font-semibold' : 'text-text-muted hover:text-text'
              }`
            }
          >
            <Icon size={20} strokeWidth={2} />
            <span className="font-mono text-[11px]">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
