import { ChevronDown, ImageIcon, LayoutDashboard, LogOut, Menu, MonitorPlay, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/sliders', label: 'Slider Management', icon: ImageIcon },
  { to: '/preview', label: 'Full-screen Preview', icon: MonitorPlay },
];

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const title = NAV.find((n) => n.to === pathname)?.label ?? '';

  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, []);

  const handleLogout = async () => { setMenu(false); await logout(); toast.success('Signed out.'); navigate('/login'); };

  return (
    <div className="min-h-screen lg:pl-64">
      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOpen(false)} aria-hidden />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-navy-900 text-sky-50/80 transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="relative bg-white">
          <Link to="/dashboard" className="block px-6 py-6" aria-label="ISMO dashboard"><img src="/ismo_logo.png" alt="ISMO" className="h-auto w-full" /></Link>
          <button className="absolute right-2 top-2 rounded p-1 text-slate-500 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X size={20} /></button>
        </div>
        <nav className="flex-1 space-y-1 px-3 pt-5" aria-label="Main">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 rounded-md border-l-2 px-3 py-3 text-base transition ${isActive ? 'border-signal-400 bg-white/10 font-medium text-white' : 'border-transparent hover:bg-white/5 hover:text-white'}`}>
              <Icon size={20} /> {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-paper/90 px-4 backdrop-blur sm:px-8">
        <div className="flex items-center gap-3">
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={24} /></button>
          <p className="font-display text-lg font-bold text-navy-900">{title}</p>
        </div>
        <div className="relative" ref={menuRef}>
          <button onClick={() => setMenu(!menu)} aria-haspopup="menu" aria-expanded={menu}
            className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-base text-slate-700 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-signal-500">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-signal-500 text-sm font-bold uppercase text-navy-950">{user?.username[0]}</span>
            <span className="hidden sm:block">{user?.username}</span>
            <ChevronDown size={16} className={`transition ${menu ? 'rotate-180' : ''}`} />
          </button>
          {menu && (
            <div role="menu" className="card absolute right-0 mt-2 w-60 overflow-hidden shadow-lg">
              <div className="border-b border-slate-100 px-4 py-3"><p className="font-medium text-navy-900">{user?.username}</p>{user?.email && <p className="truncate text-sm text-slate-500">{user.email}</p>}</div>
              <button role="menuitem" onClick={handleLogout} className="flex w-full items-center gap-3 px-4 py-3 text-left text-base text-red-600 hover:bg-red-50"><LogOut size={18} /> Log out</button>
            </div>)}
        </div>
      </header>
      <main className="p-4 sm:p-8"><Outlet /></main>
    </div>
  );
}