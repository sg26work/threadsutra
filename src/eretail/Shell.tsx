import { useState, useEffect, ReactNode } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronRight, X, LogOut, User, Search, Maximize2, Flag, Star, ChevronDown, Download, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { RAIL, RailEntry } from './menuData';
import { apiGet } from '../lib/api';
import { DOWNLOADS_EVENT } from '../context/DownloadContext';

function Flyout({ entry, onNav }: { entry: RailEntry; onNav: () => void }) {
  const nav = useNavigate();
  const go = (to?: string) => { if (to) { nav(to); onNav(); } };
  return (
    <div className="absolute left-full top-0 z-50 flex max-h-[calc(100vh-64px)] min-w-[720px] max-w-[1040px] flex-col overflow-hidden rounded-r-md bg-[#26313f] text-slate-200 shadow-2xl">
      <div className="border-b border-white/10 px-6 py-3 text-lg font-semibold text-white">{entry.title}</div>
      <div className="flex gap-2 overflow-y-auto p-5">
        {entry.columns!.map((col, ci) => (
          <div key={ci} className="min-w-[220px] flex-1">
            {col.groups.map((g, gi) => (
              <div key={gi} className="mb-4">
                <div className="mb-1 border-b border-white/10 pb-1.5 text-sm font-semibold text-slate-300">{g.title}</div>
                <ul className="py-1">
                  {g.items.map((it) => (
                    <li key={it.label}>
                      <button
                        onClick={() => go(it.to)}
                        className="flex w-full items-center gap-2 px-1 py-1.5 text-left text-[15px] text-slate-200 transition hover:text-[#5ec6d9]"
                      >
                        <ChevronRight size={15} className="text-[#3fb6c9]" />
                        {it.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Shell({
  children, active, breadcrumb, openScreens,
}: {
  children: ReactNode;
  active: string;
  breadcrumb: string;
  openScreens?: { label: string; to: string }[];
}) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [userMenu, setUserMenu] = useState(false);
  const [orderType, setOrderType] = useState('Web Order');
  const [orderMenu, setOrderMenu] = useState(false);
  const [search, setSearch] = useState('');
  const [fav, setFav] = useState(false);
  const [dlMenu, setDlMenu] = useState(false);
  const [downloads, setDownloads] = useState<any[]>([]);

  const loadDownloads = () => apiGet('/api/downloads').then((d) => setDownloads(Array.isArray(d) ? d : [])).catch(() => {});
  useEffect(() => {
    loadDownloads();
    const handler = () => loadDownloads();
    window.addEventListener(DOWNLOADS_EVENT, handler);
    return () => window.removeEventListener(DOWNLOADS_EVENT, handler);
  }, []);

  const reDownload = (r: any) => {
    if (r.status === 'Processing' || !r.content) return;
    const blob = new Blob([r.content], { type: r.mime || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = r.filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const screens = openScreens && openScreens.length ? openScreens : [{ label: breadcrumb.split('>').pop()!.trim(), to: '#' }];

  const doSearch = () => {
    if (!search.trim()) return;
    nav(`/app/sale-orders?q=${encodeURIComponent(search.trim())}`);
    setSearch('');
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#eef1f3] font-sans" onClick={() => { setOpenKey(null); setUserMenu(false); }}>
      {/* Top header — medium blue */}
      <header className="relative z-40 flex h-[64px] items-center bg-[#3b8fc4] pr-4 text-white">
        <div className="flex h-full w-[64px] items-center justify-center bg-white">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#d62828]">
            <span className="text-2xl font-black italic text-white">e</span>
          </div>
        </div>
        {/* Open screen pill */}
        <button onClick={() => nav('/app/dashboard')} className="ml-3 flex items-center gap-1 rounded bg-[#8e2fb0] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#7d2999]">
          {screens[0].label}
          <span className="ml-1 rounded-full p-0.5 hover:bg-white/20"><X size={13} /></span>
        </button>
        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-2 rounded bg-white/15 px-3 py-1.5">
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setOrderMenu((v) => !v)} className="flex items-center gap-1 text-sm font-medium">{orderType} <ChevronDown size={14} /></button>
              {orderMenu && (
                <div className="absolute left-0 top-8 z-50 w-40 rounded-md border border-slate-200 bg-white py-1 text-slate-700 shadow-lg">
                  {['Web Order', 'Store Order', 'B2B Order', 'Exchange Order'].map((t) => (
                    <button key={t} onClick={() => { setOrderType(t); setOrderMenu(false); }} className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-slate-50 ${t === orderType ? 'font-semibold text-[#2f9e9e]' : ''}`}>{t}</button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center rounded bg-white px-2" onClick={(e) => e.stopPropagation()}>
              <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doSearch()} placeholder="Search order no…" className="w-36 bg-transparent py-1 text-sm text-slate-700 outline-none" />
              <button onClick={doSearch}><Search size={15} className="text-slate-500 hover:text-[#2f9e9e]" /></button>
            </div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); setFav((v) => !v); }} title="Add to favorites">
            <Star size={18} className={fav ? 'fill-yellow-300 text-yellow-300' : 'text-white/80'} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); nav('/app/fulfillment/order-processing'); }} className="relative" title="Pending tasks">
            <Flag size={18} className="text-white/90" /><span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold">1</span>
          </button>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => { setDlMenu((v) => !v); if (!dlMenu) loadDownloads(); }} title="Downloads" className="relative">
              <Download size={18} className="text-white/80 hover:text-white" />
              {downloads.length > 0 && <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[9px] font-bold">{downloads.length}</span>}
            </button>
            {dlMenu && (
              <div className="absolute right-0 top-9 z-50 w-80 rounded-md border border-slate-200 bg-white text-slate-700 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
                  <span className="text-sm font-semibold text-slate-700">Downloads</span>
                  <button onClick={() => { setDlMenu(false); nav('/app/downloads'); }} className="text-xs font-medium text-[#2f7fb6] hover:underline">View all</button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {downloads.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-slate-400">No exports yet</p>
                  ) : downloads.slice(0, 8).map((r) => (
                    <div key={r.id} className="flex items-center gap-2 border-b border-slate-50 px-3 py-2 hover:bg-slate-50">
                      <FileText size={15} className="shrink-0 text-slate-400" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-slate-700">{r.filename}</p>
                        <p className="text-[10px] text-slate-400">{r.format} · {r.exported_by || 'system'} · {new Date(r.created_at).toLocaleString()}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${r.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' : r.status === 'Processing' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>{r.status || 'Completed'}</span>
                      <button onClick={() => reDownload(r)} disabled={r.status === 'Processing' || !r.content} className="shrink-0 rounded p-1 text-emerald-600 hover:bg-emerald-50 disabled:opacity-30" title="Re-download"><Download size={13} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} title="Toggle fullscreen"><Maximize2 size={17} className="text-white/80 hover:text-white" /></button>
          <div className="relative">
            <button onClick={(e) => { e.stopPropagation(); setUserMenu((v) => !v); }} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20"><User size={18} /></button>
            {userMenu && (
              <div className="absolute right-0 top-10 z-50 w-52 rounded-md border border-slate-200 bg-white py-1 text-slate-700 shadow-lg" onClick={(e) => e.stopPropagation()}>
                <div className="border-b border-slate-100 px-4 py-2 text-xs"><div className="font-semibold">{user?.username}</div><div className="text-slate-400">Store Admin</div></div>
                <button onClick={() => { logout(); nav('/'); }} className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-slate-50"><LogOut size={14} /> Sign Out</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Icon rail with flyouts */}
        <div className="relative z-30 flex w-[64px] flex-col bg-[#1b232f] py-1" onClick={(e) => e.stopPropagation()}>
          {RAIL.map((entry) => {
            const on = active === entry.key;
            const opened = openKey === entry.key;
            return (
              <div key={entry.key} className="relative"
                onMouseEnter={() => !entry.single && setOpenKey(entry.key)}
                onMouseLeave={() => setOpenKey((k) => (k === entry.key ? null : k))}>
                <button
                  onClick={() => entry.single ? nav(entry.single) : setOpenKey(opened ? null : entry.key)}
                  title={entry.title}
                  className={`flex h-[52px] w-[64px] items-center justify-center border-l-[3px] transition ${on ? 'border-[#3fb6c9] bg-[#26313f] text-white' : 'border-transparent text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                  <entry.icon size={22} />
                </button>
                {opened && entry.columns && <Flyout entry={entry} onNav={() => setOpenKey(null)} />}
              </div>
            );
          })}
        </div>

        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Open screens bar */}
          <div className="flex items-center gap-2 border-b border-slate-200 bg-[#f4f6f8] px-3 py-1.5 text-sm">
            <span className="text-xs text-slate-500">You have {screens.length} Open Screen(s)</span>
            {screens.map((s) => (
              <span key={s.to} className="flex items-center gap-1 rounded border border-rose-300 bg-rose-50 px-2 py-0.5 text-slate-700">
                {s.to === '#' ? s.label : <Link to={s.to}>{s.label}</Link>}
                <Link to="/app/dashboard"><X size={12} className="text-slate-400 hover:text-rose-500" /></Link>
              </span>
            ))}
          </div>

          {/* Breadcrumb bar */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2">
            <span className="text-sm font-medium text-slate-500">{breadcrumb}</span>
            <div className="flex items-center gap-2">
              <select className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-600 outline-none">
                <option>-----All-----</option><option>Delhi NCR</option><option>Mumbai WH</option><option>Bengaluru WH</option><option>Kolkata WH</option>
              </select>
              <button onClick={() => nav(0)} className="flex h-8 w-9 items-center justify-center rounded bg-[#f5a623] text-white hover:bg-[#e0961a]">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/></svg>
              </button>
            </div>
          </div>

          <main className="flex-1 overflow-y-auto p-4">{children}</main>
        </div>
      </div>
    </div>
  );
}
