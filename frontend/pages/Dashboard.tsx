
import React, { useEffect, useState, useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import { useNavigate } from 'react-router';
// Added Trophy to imports to fix "Cannot find name 'Trophy'" error
import { 
  Activity, Bell, Loader2, Cpu, RefreshCw, 
  HelpCircle, X, Server, TrendingUp, Filter, 
  LayoutGrid, PieChart as PieChartIcon, ArrowUpRight, ArrowDownLeft,
  Calendar, Layers, ShoppingBag, Trophy
} from 'lucide-react';
import { Account, Transaction, Bill, Reward } from '../types';
import { api } from '../api';
import { useToast } from '../App';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showRedisHelp, setShowRedisHelp] = useState(false);
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [currencySummary, setCurrencySummary] = useState<any>(null);
  const [backendSummary, setBackendSummary] = useState<any>(null);
  const [health, setHealth] = useState<any>({ api: 'online', redis: 'offline', database: 'online' });
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const fetchData = async () => {
    try {
      const [acc, txn, bill, reward, curr, note, healthData, summary] = await Promise.all([
        api.get('/accounts').catch(() => []),
        api.get('/transactions').catch(() => []),
        api.get('/bills').catch(() => []),
        api.get('/rewards').catch(() => []),
        api.get('/rewards/currency-summary').catch(() => ({ total_inr: 0 })),
        api.get('/notifications').catch(() => []),
        api.get('/health/services').catch(() => ({ api: 'online', redis: 'offline', database: 'online' })),
        api.get('/insights/summary').catch(() => null)
      ]);

      setAccounts(acc || []);
      setTransactions(txn || []);
      setBills(bill || []);
      setRewards(reward || []);
      setCurrencySummary(curr || { total_inr: 0 });
      setNotifications(note || []);
      setHealth(healthData);
      setBackendSummary(summary);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 45000);
    return () => clearInterval(interval);
  }, []);

  const triggerSync = async () => {
    setSyncing(true);
    try {
      await api.post('/notifications/trigger-sync', {});
      showToast("Triggering background audit...", "info");
      setTimeout(fetchData, 2000);
    } catch (err: any) {
      showToast(err.message || "Failed to reach worker", "error");
    } finally {
      setSyncing(false);
    }
  };

  const stats = useMemo(() => ({
    netWorthInr: currencySummary?.total_inr || 0,
    monthlySpend: backendSummary?.cash_flow?.total_debits || 0,
    upcomingBillsAmount: Array.isArray(bills) ? bills.filter((b: any) => b.status === 'upcoming').reduce((sum: number, b: any) => sum + b.amount_due, 0) : 0,
    totalRewards: Array.isArray(rewards) ? rewards.reduce((sum: number, r: any) => sum + r.points_balance, 0) : 0
  }), [bills, rewards, currencySummary, backendSummary]);

  // Component 1: Monthly Cash Flow
  const cashFlowData = useMemo(() => {
    if (!backendSummary?.cash_flow) return [];
    return [
      {
        name: 'Liquidity',
        Inflow: backendSummary.cash_flow.total_credits,
        Outflow: backendSummary.cash_flow.total_debits
      }
    ];
  }, [backendSummary]);

  // Component 2: Category-wise Spending
  const categoryData = useMemo(() => {
    if (!backendSummary?.category_spending) return [];
    return backendSummary.category_spending
      .map((c: any) => ({ name: c.category, value: c.amount }))
      .sort((a: any, b: any) => b.value - a.value);
  }, [backendSummary]);

  // Component 3: Yearly Spending Trend (Dynamic)
  const yearlyTrendData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      name: new Date(2000, i).toLocaleString('default', { month: 'short' }),
      spend: 0
    }));
    transactions.forEach((tx: any) => {
      const date = new Date(tx.txn_date);
      if (date.getFullYear() === selectedYear && tx.txn_type === 'debit') {
        months[date.getMonth()].spend += Math.abs(tx.amount);
      }
    });
    return months;
  }, [transactions, selectedYear]);

  // Component 4: Top 5 Merchants (Concentration)
  const merchantData = useMemo(() => {
    if (!backendSummary?.top_merchants) return [];
    return backendSummary.top_merchants.map((m: any) => ({
      name: m.merchant.length > 12 ? m.merchant.substring(0, 10) + '...' : m.merchant,
      amount: m.amount
    }));
  }, [backendSummary]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
        <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em]">Synchronizing Financial Intelligence</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-10">
      {/* Institutional Health Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center space-x-3">
          <div className="text-[9px] font-black uppercase tracking-[0.25em] text-emerald-500 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>CORE NODE: SECURE</span>
          </div>

          <div className={`flex items-center space-x-2 text-[9px] font-black uppercase tracking-[0.25em] px-3 py-1.5 rounded-xl border transition-all ${
            health.redis === 'online' ? 'text-indigo-500 bg-indigo-50 border-indigo-100' : 'text-rose-500 bg-rose-50 border-rose-100'
          }`}>
            <Cpu size={12} />
            <span>WORKER: {health.redis?.toUpperCase() || 'OFFLINE'}</span>
          </div>

          <button 
            onClick={triggerSync}
            disabled={syncing}
            className="flex items-center space-x-2 text-[9px] font-black uppercase tracking-[0.25em] bg-slate-900 px-4 py-1.5 rounded-xl text-white hover:bg-black transition-all disabled:opacity-50"
          >
            {syncing ? <RefreshCw size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            <span>Re-Audit Assets</span>
          </button>
        </div>
        <div className="text-[10px] font-black uppercase text-slate-300 tracking-[0.25em]">Build v1.2.8-STABLE</div>
      </div>

      {/* Primary Metric Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Portfolio Valuation', val: `₹${stats.netWorthInr.toLocaleString()}`, color: 'text-slate-900', sub: '+2.1% MTD', icon: <TrendingUp size={14} /> },
          { label: 'Monthly Outflow', val: `₹${stats.monthlySpend.toLocaleString()}`, color: 'text-white', bg: 'bg-indigo-600 shadow-xl shadow-indigo-100', sub: 'Burn Velocity', icon: <Activity size={14} /> },
          { label: 'Upcoming Obligations', val: `₹${stats.upcomingBillsAmount.toLocaleString()}`, color: 'text-slate-900', sub: 'Next 7 Days', icon: <Calendar size={14} /> },
          { label: 'Reward Inventory', val: `${stats.totalRewards.toLocaleString()} PTS`, color: 'text-slate-900', sub: 'Redeemable Assets', icon: <Trophy size={14} /> },
        ].map((s, i) => (
          <div key={i} className={`${s.bg || 'bg-white'} p-6 rounded-[2rem] border ${s.bg ? 'border-transparent' : 'border-slate-200'} shadow-sm group hover:-translate-y-1 transition-all cursor-default`}>
            <div className="flex items-center justify-between mb-2">
              <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${s.bg ? 'text-indigo-200' : 'text-slate-400'}`}>{s.label}</p>
              <div className={`${s.bg ? 'text-indigo-300' : 'text-indigo-600'}`}>{s.icon}</div>
            </div>
            <h3 className={`text-2xl font-black tracking-tighter ${s.color}`}>{s.val}</h3>
            <p className={`text-[8px] font-bold uppercase mt-1 tracking-widest ${s.bg ? 'text-indigo-100' : 'text-emerald-500'}`}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Main Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Component 3: Yearly Spending Trend (8 Columns) */}
        <div className="lg:col-span-8 bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-indigo-600">
               <TrendingUp size={16} strokeWidth={2.5} />
               <h3 className="text-[10px] font-black uppercase tracking-[0.25em]">Fiscal Expenditure Corridor</h3>
            </div>
            <div className="flex items-center space-x-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
              <select 
                value={selectedYear} 
                onChange={e => setSelectedYear(parseInt(e.target.value))}
                className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest outline-none px-2 py-1 cursor-pointer"
              >
                {[2023, 2024, 2025].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={yearlyTrendData}>
                <defs>
                  <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 9, fontWeight: 800}} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 900}}
                  cursor={{stroke: '#6366f1', strokeWidth: 2}}
                />
                <Area type="monotone" dataKey="spend" stroke="#6366f1" strokeWidth={4} fill="url(#trendGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Component 2: Category Distribution (4 Columns) */}
        <div className="lg:col-span-4 bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col items-center">
          <div className="flex items-center space-x-2 text-indigo-600 w-full mb-6">
             <Layers size={16} strokeWidth={2.5} />
             <h3 className="text-[10px] font-black uppercase tracking-[0.25em]">Category Allocation</h3>
          </div>
          <div className="h-64 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={categoryData}
                  cx="50%" cy="50%"
                  innerRadius={65} outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{borderRadius: '16px', border: 'none', fontSize: '9px', fontWeight: 900}} />
              </RechartsPieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Net Outflow</span>
              <span className="text-sm font-black text-slate-900 mt-1">₹{stats.monthlySpend.toLocaleString()}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-4 w-full px-2">
            {categoryData.slice(0, 4).map((c: any, i: number) => (
              <div key={i} className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-[8px] font-black text-slate-500 uppercase truncate">{c.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Component 1: Monthly Cash Flow (6 Columns) */}
        <div className="lg:col-span-6 bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8">
           <div className="flex items-center space-x-2 text-indigo-600">
             <Activity size={16} strokeWidth={2.5} />
             <h3 className="text-[10px] font-black uppercase tracking-[0.25em]">Monthly Liquidity Flow</h3>
          </div>
          <div className="h-56">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashFlowData}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                   <XAxis hide />
                   <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 800}} />
                   <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '20px', border: 'none', fontSize: '10px', fontWeight: 900}} />
                   <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', paddingBottom: '20px'}} />
                   <Bar name="Inflow (Credits)" dataKey="Inflow" fill="#10b981" radius={[12, 12, 0, 0]} barSize={40} />
                   <Bar name="Outflow (Debits)" dataKey="Outflow" fill="#f43f5e" radius={[12, 12, 0, 0]} barSize={40} />
                </BarChart>
             </ResponsiveContainer>
          </div>
        </div>

        {/* Component 4: Top 5 Merchants (6 Columns) */}
        <div className="lg:col-span-6 bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8">
           <div className="flex items-center space-x-2 text-indigo-600">
             <LayoutGrid size={16} strokeWidth={2.5} />
             <h3 className="text-[10px] font-black uppercase tracking-[0.25em]">Major Concentration Nodes</h3>
          </div>
          <div className="h-56">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={merchantData} layout="vertical" margin={{ left: 20 }}>
                   <XAxis type="number" hide />
                   <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 9, fontWeight: 900}} width={70} />
                   <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none', fontSize: '10px', fontWeight: 900}} />
                   <Bar dataKey="amount" fill="#6366f1" radius={[0, 10, 10, 0]} barSize={16}>
                     {merchantData.map((_: any, i: number) => <Cell key={i} fillOpacity={1 - (i * 0.15)} />)}
                   </Bar>
                </BarChart>
             </ResponsiveContainer>
          </div>
        </div>

        {/* Active Pulse surveillance */}
        <div className="lg:col-span-12">
          <div className="bg-[#0f172a] p-8 rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row items-center justify-between text-white ring-1 ring-white/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 blur-[100px] -mr-32 -mt-32 rounded-full" />
            <div className="flex items-center space-x-6 relative z-10">
               <div className="p-4 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-900/40">
                 <Bell size={24} className="animate-pulse" />
               </div>
               <div>
                  <h4 className="font-black uppercase tracking-[0.25em] text-[10px]">Institutional Security Pulse</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Real-time surveillance is active. {notifications.filter(n => !n.is_read).length} unread audit logs pending review.</p>
               </div>
            </div>
            <button onClick={() => navigate('/alerts')} className="mt-6 md:mt-0 px-8 py-3 bg-white text-slate-900 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-slate-100 transition-all shadow-xl active:scale-95 relative z-10">
              Access Alert Center
            </button>
          </div>
        </div>

      </div>

      {showRedisHelp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-rose-50/20">
              <div className="flex items-center space-x-3 text-rose-600">
                <Server size={24} />
                <h3 className="font-black text-sm uppercase tracking-tight">Worker Node Offline</h3>
              </div>
              <button onClick={() => setShowRedisHelp(false)} className="text-slate-400 hover:text-slate-900 p-2"><X size={24} /></button>
            </div>
            <div className="p-10 space-y-6">
              <p className="text-xs text-slate-500 leading-relaxed font-bold uppercase tracking-widest">The background processing engine (Redis) is disconnected. Please execute the following sequence:</p>
              <div className="bg-slate-900 rounded-2xl p-6 shadow-inner">
                <code className="text-emerald-400 font-mono text-[11px] block tracking-wider">redis-server --port 6379</code>
              </div>
              <button 
                onClick={() => { setShowRedisHelp(false); fetchData(); }}
                className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl active:scale-95 transition-all"
              >
                Refresh Infrastructure
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
