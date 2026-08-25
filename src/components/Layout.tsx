import { useState } from 'react';
import { NavLink, useNavigate, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, PackageSearch, ClipboardList, Boxes,
  Database, Undo2, BarChart3, LogOut, Menu, ChevronDown, Search, Bell,
  Warehouse, Truck, Users, Tag,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type NavItem = { to: string; label: string; icon: any };
type NavGroup = { label: string; icon: any; items: NavItem[] };

const GROUPS: NavGroup[] = [
  { label: 'Dashboard', icon: LayoutDashboard, items: [{ to: '/app', label: 'Overview', icon: LayoutDashboard }] },
  {
    label: 'Sales', icon: ShoppingCart,
    items: [{ to: '/app/sale-orders', label: 'Sale Orders', icon: ShoppingCart }],
  },
  {
    label: 'Procurement', icon: ClipboardList,
    items: [
      { to: '/app/purchase-orders', label: 'Purchase Orders', icon: ClipboardList },
      { to: '/app/grn', label: 'Inbound / GRN', icon: PackageSearch },
    ],
  },
  {
    label: 'WMS / Inventory', icon: Warehouse,
    items: [
      { to: '/app/inventory', label: 'Inventory View', icon: Boxes },
      { to: '/app/transfers', label: 'Stock Transfers', icon: Truck },
    ],
  },
  {
    label: 'Masters', icon: Database,
    items: [
      { to: '/app/skus', label: 'SKU / Catalog', icon: Tag },
      { to: '/app/partners', label: 'Trading Partners', icon: Users },
    ],
  },
  { label: 'Returns', icon: Undo2, items: [{ to: '/app/returns', label: 'Customer Returns', icon: Undo2 }] },
  { label: 'Reports', icon: BarChart3, items: [{ to: '/app/reports', label: 'Reports', icon: BarChart3 }] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    Object.fromEntries(GROUPS.map((g) => [g.label, true]))
  );

  const doLogout = () => { logout(); nav('/'); };

  const SidebarInner = (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 border-b border-white/10 px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-white text-sm font-bold text-[#1b3a6b]">V</div>
        <div className="leading-tight">
          <div className="text-sm font-bold text-white">Vin eRetail</div>
          <div className="text-[10px] text-white/50">Omnichannel OMS</div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
        {GROUPS.map((g) => (
          <div key={g.label}>
            <button
              onClick={() => setExpanded((e) => ({ ...e, [g.label]: !e[g.label] }))}
              className="flex w-full items-center justify-between rounded px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-white/50 hover:text-white/80"
            >
              <span className="flex items-center gap-2"><g.icon size={14} />{g.label}</span>
              <ChevronDown size={13} className={`transition-transform ${expanded[g.label] ? '' : '-rotate-90'}`} />
            </button>
            {expanded[g.label] && (
              <div className="mb-1 space-y-0.5">
                {g.items.map((it) => (
                  <NavLink
                    key={it.to}
                    to={it.to}
                    end={it.to === '/app'}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded px-3 py-2 pl-9 text-[13px] transition-colors ${
                        isActive ? 'bg-white/15 font-medium text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }`
                    }
                  >
                    <it.icon size={15} />
                    {it.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 p-3">
        <button onClick={doLogout} className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white">
          <LogOut size={15} /> Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      {/* Desktop sidebar */}
      <aside className={`hidden bg-gradient-to-b from-[#132a4d] to-[#1b3a6b] transition-all md:block ${open ? 'w-64' : 'w-0 overflow-hidden'}`}>
        {SidebarInner}
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-gradient-to-b from-[#132a4d] to-[#1b3a6b]">{SidebarInner}</aside>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setOpen((o) => !o)} className="hidden rounded p-2 text-slate-500 hover:bg-slate-100 md:block"><Menu size={18} /></button>
            <button onClick={() => setMobileOpen(true)} className="rounded p-2 text-slate-500 hover:bg-slate-100 md:hidden"><Menu size={18} /></button>
            <div className="hidden items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 sm:flex">
              <Search size={15} className="text-slate-400" />
              <input placeholder="Search order, SKU, invoice…" className="w-56 bg-transparent text-sm text-slate-600 outline-none placeholder:text-slate-400" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 sm:inline">Demo Warehouse • Delhi NCR</span>
            <button className="relative rounded p-2 text-slate-500 hover:bg-slate-100">
              <Bell size={18} /><span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500" />
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2a5298] text-xs font-semibold text-white">
                {user?.username.slice(0, 2).toUpperCase()}
              </div>
              <div className="hidden leading-tight sm:block">
                <div className="text-xs font-semibold text-slate-700">{user?.username}</div>
                <div className="text-[10px] text-slate-400">Store Admin</div>
              </div>
            </div>
          </div>
        </header>
        <main key={loc.pathname} className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
