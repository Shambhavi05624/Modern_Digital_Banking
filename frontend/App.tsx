import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
// Fixed: Split imports to resolve "no exported member" errors where react-router-dom re-exports might be failing
import { HashRouter, Link } from 'react-router-dom';
import { Routes, Route, Navigate, useLocation } from 'react-router';
import { 
  LayoutDashboard, 
  Wallet, 
  ArrowLeftRight, 
  PieChart, 
  CreditCard, 
  Trophy, 
  Bell, 
  LogOut,
  Menu,
  X,
  CheckCircle,
  AlertCircle,
  Info,
  AlertTriangle,
  ShieldAlert,
  Settings,
  User,
  Lock,
  Loader2,
  ShieldCheck,
  Fingerprint,
  ShieldX
} from 'lucide-react';
import { api } from './api';

import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import Transactions from './pages/Transactions';
import Budgets from './pages/Budgets';
import Bills from './pages/Bills';
import Insights from './pages/Insights';
import Alerts from './pages/Alerts';
import Login from './pages/Login';
import Register from './pages/Register';

// --- Toast System ---
type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};

const SidebarItem: React.FC<{ to: string, icon: React.ReactNode, label: string, active: boolean, badge?: number }> = ({ to, icon, label, active, badge }) => (
  <Link 
    to={to} 
    className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
      active 
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-[1.02]' 
        : 'text-slate-500 hover:bg-slate-100 hover:text-indigo-600'
    }`}
  >
    <div className="flex items-center space-x-3">
      {icon}
      <span className="font-semibold">{label}</span>
    </div>
    {badge && badge > 0 ? (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${active ? 'bg-white text-indigo-600' : 'bg-rose-600 text-white'}`}>
        {badge}
      </span>
    ) : null}
  </Link>
);

const EditProfileModal: React.FC<{ 
  isOpen: boolean, 
  onClose: () => void, 
  currentName: string, 
  onUpdate: (newName: string) => void 
}> = ({ isOpen, onClose, currentName, onUpdate }) => {
  const [name, setName] = useState(currentName);
  const [password, setPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate strength before allowing commit if a password is being set
    if (password && getPasswordStrength(password).score < 3) {
      showToast("Security policy requires a stronger password", "warning");
      return;
    }

    setIsSaving(true);
    try {
      const res = await api.put('/auth/me', { name, password: password || undefined });
      if (res && res.user_name) {
        onUpdate(res.user_name);
        showToast("Identity credentials successfully re-keyed", "success");
        onClose();
        setPassword('');
      }
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (n: string) => {
    return n.split(' ').map(i => i[0]).join('').toUpperCase().substring(0, 2) || 'JD';
  };

  const getPasswordStrength = (pwd: string) => {
    let score = 0;
    if (!pwd) return { score: 0, label: 'Unset', color: 'slate' };
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    
    if (score <= 1) return { score, label: 'Vulnerable', color: 'rose' };
    if (score === 2) return { score, label: 'Moderate', color: 'amber' };
    if (score === 3) return { score, label: 'Strong', color: 'indigo' };
    return { score, label: 'Elite Security', color: 'emerald' };
  };

  const strength = getPasswordStrength(password);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] overflow-hidden border border-white/40 animate-in zoom-in-95 fade-in duration-300">
        
        {/* Institutional Header */}
        <div className="relative h-44 bg-[#0f172a] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900"></div>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `radial-gradient(#fff 0.5px, transparent 0.5px)`, backgroundSize: '16px 16px' }} />
          
          <button 
            onClick={onClose} 
            className="absolute top-8 right-8 p-2 text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-2xl transition-all z-20"
          >
            <X size={24} strokeWidth={1.5} />
          </button>
          
          <div className="absolute -bottom-8 left-10 flex items-end space-x-6 z-10">
            <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-tr from-indigo-600 to-indigo-400 border-[6px] border-white shadow-2xl flex items-center justify-center text-white text-4xl font-black">
              {getInitials(name)}
            </div>
            <div className="mb-10">
              <h3 className="text-white font-black text-2xl tracking-tight leading-none">Profile Access</h3>
              <p className="text-indigo-400/80 text-[10px] font-black uppercase tracking-[0.25em] mt-2">Security Infrastructure</p>
            </div>
          </div>
        </div>

        <div className="p-10 pt-16">
          <form onSubmit={handleSave} className="space-y-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  <User size={14} className="text-indigo-600" />
                  <span>Legal Display Name</span>
                </label>
                <input 
                  type="text" required
                  className="w-full px-7 py-5 bg-slate-50 border border-slate-200 rounded-[1.75rem] outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 focus:bg-white transition-all font-bold text-slate-900"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  <Lock size={14} className="text-indigo-600" />
                  <span>Security Password</span>
                </label>
                <input 
                  type="password"
                  placeholder="Leave blank to keep current"
                  className="w-full px-7 py-5 bg-slate-50 border border-slate-200 rounded-[1.75rem] outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 focus:bg-white transition-all font-bold text-slate-900 placeholder:text-slate-300"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                {/* Password Strength Warning Alert */}
                {password && strength.score < 3 && (
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start space-x-3 animate-in slide-in-from-top-2 duration-300">
                    <ShieldX size={18} className="text-amber-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Security Advisory</p>
                      <p className="text-[11px] text-amber-600 font-bold leading-tight mt-0.5">
                        Your password is too simple. For institutional safety, include a mix of uppercase, numbers, and symbols.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Dynamic Strength Visualizer */}
            <div className="bg-slate-50 rounded-[2rem] p-6 flex items-center justify-between border border-slate-100">
              <div className="flex items-center space-x-4">
                <div className={`p-3 bg-white rounded-2xl shadow-sm border border-slate-100 ${
                  strength.color === 'rose' ? 'text-rose-500' :
                  strength.color === 'amber' ? 'text-amber-500' :
                  strength.color === 'emerald' ? 'text-emerald-500' : 'text-indigo-600'
                }`}>
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Protection Level</p>
                  <p className={`text-[9px] font-black uppercase mt-0.5 tracking-wider ${
                    strength.color === 'rose' ? 'text-rose-500' :
                    strength.color === 'amber' ? 'text-amber-500' :
                    strength.color === 'emerald' ? 'text-emerald-500' : 'text-slate-400'
                  }`}>
                    {strength.label}
                  </p>
                </div>
              </div>
              <div className="flex space-x-1.5">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className={`h-2 w-5 rounded-full transition-all duration-500 ${
                    i <= strength.score ? (
                      strength.score <= 1 ? 'bg-rose-500' :
                      strength.score === 2 ? 'bg-amber-500' :
                      strength.score === 3 ? 'bg-indigo-600' : 'bg-emerald-500'
                    ) : 'bg-slate-200'
                  }`} />
                ))}
              </div>
            </div>
            
            <div className="flex items-center space-x-4 pt-2">
              <button 
                type="button" 
                onClick={onClose}
                className="flex-1 px-8 py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] text-slate-400 hover:text-slate-900 transition-all"
              >
                Cancel
              </button>
              <button 
                type="submit" disabled={isSaving}
                className="flex-[2] bg-[#0f172a] text-white py-5 rounded-[1.75rem] font-black uppercase tracking-widest text-[11px] flex items-center justify-center space-x-3 shadow-xl hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="animate-spin" size={20} /> : (
                  <>
                    <Fingerprint size={18} />
                    <span>Synchronize Profile</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const AppLayout: React.FC<{ 
  children: React.ReactNode, 
  onLogout: () => void, 
  userName: string,
  onNameUpdate: (newName: string) => void
}> = ({ children, onLogout, userName, onNameUpdate }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const location = useLocation();

  const fetchUnreadCount = useCallback(async () => {
    try {
      const notes = await api.get('/notifications');
      if (notes) {
        setUnreadCount(notes.filter((n: any) => !n.is_read).length);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  const getInitials = (name: string) => {
    if (!name || name === 'Guest User') return 'JD';
    return name
      .split(' ')
      .filter(n => n)
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2) || 'JD';
  };

  const navItems = [
    { to: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/accounts', icon: <Wallet size={20} />, label: 'Accounts' },
    { to: '/transactions', icon: <ArrowLeftRight size={20} />, label: 'Transactions' },
    { to: '/budgets', icon: <PieChart size={20} />, label: 'Budgets' },
    { to: '/bills', icon: <CreditCard size={20} />, label: 'Bills' },
    { to: '/insights', icon: <Trophy size={20} />, label: 'Insights' },
    { to: '/alerts', icon: <ShieldAlert size={20} />, label: 'Alert Center', badge: unreadCount },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <EditProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
        currentName={userName}
        onUpdate={onNameUpdate}
      />

      <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-slate-200 p-6 fixed h-full z-30">
        <div className="flex items-center space-x-3 px-2 mb-10">
          <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-xl shadow-indigo-100">
            <Wallet className="text-white" size={24} />
          </div>
          <span className="text-2xl font-black text-slate-900 tracking-tight">DigitalBank <span className="text-indigo-600">Pro</span></span>
        </div>
        
        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <SidebarItem 
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={item.label}
              active={location.pathname === item.to}
              badge={item.badge}
            />
          ))}
        </nav>

        <div className="border-t border-slate-100 pt-6 mt-auto">
          <div className="bg-slate-50 rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 overflow-hidden">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                  {getInitials(userName)}
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-bold text-slate-900 truncate">{userName}</p>
                  <p className="text-[10px] text-slate-400 font-black uppercase">Platinum Member</p>
                </div>
              </div>
              <button 
                onClick={() => setIsProfileModalOpen(true)}
                className="p-2 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-indigo-600 transition-all"
                title="Edit Profile"
              >
                <Settings size={16} />
              </button>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="flex items-center space-x-3 px-4 py-3 w-full text-slate-500 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all group"
          >
            <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-bold">Sign Out</span>
          </button>
        </div>
      </aside>

      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-4 flex items-center justify-between z-50">
        <div className="flex items-center space-x-2">
          <div className="bg-indigo-600 p-2 rounded-xl">
            <Wallet className="text-white" size={20} />
          </div>
          <span className="text-xl font-black text-slate-900 tracking-tight">DigitalBank Pro</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-600 bg-slate-100 rounded-xl">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="w-72 bg-white h-full p-6 shadow-2xl animate-in slide-in-from-left duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-8 mt-4">
               <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold">
                    {getInitials(userName)}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-bold text-slate-900 truncate">{userName}</p>
                  </div>
               </div>
               <button 
                onClick={() => { setIsProfileModalOpen(true); setIsMobileMenuOpen(false); }}
                className="p-2 bg-slate-100 rounded-lg text-slate-500"
               >
                <Settings size={16} />
               </button>
            </div>

            <nav className="space-y-2">
              {navItems.map((item) => (
                <SidebarItem 
                  key={item.to}
                  to={item.to}
                  icon={item.icon}
                  label={item.label}
                  active={location.pathname === item.to}
                  badge={item.badge}
                />
              ))}
            </nav>
            <button onClick={onLogout} className="flex items-center space-x-3 px-4 py-3 w-full mt-6 text-rose-600 font-bold bg-rose-50 rounded-xl">
              <LogOut size={20} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 lg:ml-72 pt-20 lg:pt-0">
        <header className="hidden lg:flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-slate-200 px-10 py-5 sticky top-0 z-20">
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight capitalize">
              {location.pathname.substring(1).replace('-', ' ') || 'Dashboard'}
            </h1>
          </div>
          <div className="flex items-center space-x-6">
            <Link to="/alerts" className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-2xl transition-all relative group">
              <Bell size={22} className="group-hover:rotate-12 transition-transform" />
              {unreadCount > 0 && (
                <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white"></span>
              )}
            </Link>
            <div className="flex items-center space-x-4 pl-6 border-l border-slate-200">
              <div className="text-right">
                <p className="text-xs font-black text-slate-900">{userName}</p>
                <p className="text-[10px] text-emerald-500 font-bold">Online Now</p>
              </div>
              <button 
                onClick={() => setIsProfileModalOpen(true)}
                className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-100 hover:scale-105 transition-all"
              >
                {getInitials(userName)}
              </button>
            </div>
          </div>
        </header>
        <div className="p-6 lg:p-10 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!localStorage.getItem('access_token'));
  const [userName, setUserName] = useState<string>(() => localStorage.getItem('user_name') || 'John Doe');
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const handleLogin = (token: string, name: string) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('user_name', name);
    setUserName(name);
    setIsAuthenticated(true);
    showToast(`Welcome back, ${name}!`, 'success');
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_name');
    setIsAuthenticated(false);
    showToast('Signed out successfully', 'info');
  };

  const handleNameUpdate = (newName: string) => {
    setUserName(newName);
    localStorage.setItem('user_name', newName);
  };

  const getToastIcon = (type: ToastType) => {
    switch(type) {
      case 'success': return <CheckCircle size={18} className="text-emerald-500" />;
      case 'error': return <AlertCircle size={18} className="text-rose-500" />;
      case 'warning': return <AlertTriangle size={18} className="text-amber-500" />;
      default: return <Info size={18} className="text-blue-500" />;
    }
  };

  const getToastClass = (type: ToastType) => {
    switch(type) {
      case 'success': return 'bg-emerald-50 border-emerald-100 text-emerald-900';
      case 'error': return 'bg-rose-50 border-rose-100 text-rose-900';
      case 'warning': return 'bg-amber-50 border-amber-100 text-amber-900';
      default: return 'bg-blue-50 border-blue-100 text-blue-900';
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      <HashRouter>
        {/* Toast Container */}
        <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none w-full max-w-xs md:max-w-sm">
          {toasts.map(toast => (
            <div 
              key={toast.id}
              className={`pointer-events-auto flex items-center space-x-3 px-5 py-4 rounded-2xl border shadow-xl animate-in slide-in-from-right fade-in duration-300 ${getToastClass(toast.type)}`}
            >
              <div className="shrink-0">{getToastIcon(toast.type)}</div>
              <p className="text-sm font-bold flex-1">{toast.message}</p>
              <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>

        <Routes>
          <Route 
            path="/login" 
            element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />} 
          />
          <Route 
            path="/register" 
            element={isAuthenticated ? <Navigate to="/dashboard" /> : <Register />} 
          />
          
          <Route 
            path="/*" 
            element={
              isAuthenticated ? (
                <AppLayout onLogout={handleLogout} userName={userName} onNameUpdate={handleNameUpdate}>
                  <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/accounts" element={<Accounts />} />
                    <Route path="/transactions" element={<Transactions />} />
                    <Route path="/budgets" element={<Budgets />} />
                    <Route path="/bills" element={<Bills />} />
                    <Route path="/insights" element={<Insights />} />
                    <Route path="/alerts" element={<Alerts />} />
                    <Route path="*" element={<Navigate to="/dashboard" />} />
                  </Routes>
                </AppLayout>
              ) : (
                <Navigate to="/login" />
              )
            } 
          />
        </Routes>
      </HashRouter>
    </ToastContext.Provider>
  );
};

export default App;
