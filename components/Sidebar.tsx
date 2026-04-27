import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';

const routes = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Analytics', href: '/analytics' },
  { label: 'Custom Report', href: '/clients' },
  { label: 'Admin', href: '/admin' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();

  return (
    <aside className={`sticky top-0 h-screen overflow-y-auto border-r border-slate-200 bg-white transition-all duration-300 ${collapsed ? 'w-18' : 'w-64'}`}>
      <div className="flex h-16 items-center justify-between px-4 border-b border-slate-200">
        <span className="text-base font-semibold text-slate-900">Modules</span>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-full bg-slate-100 p-2 text-slate-700 hover:bg-slate-200"
        >
          {collapsed ? '▶' : '◀'}
        </button>
      </div>
      <nav className="py-4 px-2">
        {routes.map((route) => {
          const active = router.pathname === route.href;
          return (
            <Link key={route.href} href={route.href} className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${active ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-100'}`}>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 group-hover:bg-brand-100 group-hover:text-brand-700">
                {route.label.charAt(0)}
              </span>
              {!collapsed && route.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
