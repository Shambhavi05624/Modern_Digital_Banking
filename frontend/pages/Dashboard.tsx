import React, { useEffect, useState, useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend, LineChart, Line
} from 'recharts';
// Fixed: Import useNavigate from react-router to resolve "no exported member" error in react-router-dom
import { useNavigate } from 'react-router';
import { 
  TrendingDown, Globe, Trophy, Zap, ArrowRight, ShoppingBag, Activity, Bell, 
  AlertTriangle, CheckCircle, Loader2, Cpu, RefreshCw, Database, HelpCircle, 
  X, Server, TrendingUp, Filter, Calendar, Layers, LayoutGrid
} from 'lucide-react';
import { Account, Transaction, Budget, Bill, Reward } from '../types';
import { api } from '../api';
import { useToast } from '../App';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

interface ServerNotification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'critical';
  created_at: string;
  is_read: boolean;
}

interface ServiceHealth {
  api: string;
  redis: string;
  database: string;
  stats?: {
    transactions: number;
    bills: number;
    accounts: number;
  };
}

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
  const [notifications, setNotifications] = useState<ServerNotification[]>([]);
  const [currencySummary, setCurrencySummary] = useState<any>(null);
  const [backendSummary, setBackendSummary] = useState<any>(null);
  const [health, setHealth] = useState<ServiceHealth>({ api: 'online', redis: 'checking', database: 'checking' });
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const fetchData = async () => {
    try {
      const [accData, txnData, billData, rewardData, currData, noteData, healthData, summaryData] = await Promise.all([
        api.get('/accounts'),
        api.get('/transactions'),
        api.get('/bills'),
        api.get('/rewards'),
        api.get('/rewards/currency-summary'),
        api.get('/notifications'),
        api.get('/health/services').catch(() => ({ api: 'online', redis: 'offline', database: 'online' })),
        api.get('/insights/summary').catch(() => null)
      ]);
      setAccounts(accData || []);
      setTransactions(txnData || []);
      setBills(billData || []);
      setRewards(rewardData || []);
      setCurrencySummary(currData);
      setNotifications(noteData || []);
      setHealth(healthData);
      setBackendSummary(summaryData);
    } catch (err) {
      console.error("Dashboard data fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

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

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // 1. Monthly Cash Flow Data
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

  // 2. Category Distribution Data
  const categoryData = useMemo(() => {
    if (!backendSummary?.category_spending) return [];
    return backendSummary.category_spending.map((c: any) => ({
      name: c.category,
      value: c.amount
    })).sort((a: any, b: any) => b.value - a.value);
  }, [backendSummary]);

  // 3. Yearly Spending Trend Logic
  const yearlyTrendData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      name: new Date(2000, i).toLocaleString('default', { month: 'short' }),
      spend: 0
    }));

    transactions.forEach(tx => {
      const date = new Date(tx.txn_date);
      if (date.getFullYear() === selectedYear && tx.txn_type === 'debit') {
        const m = date.getMonth();
        months[m].spend += Math.abs(tx.amount);
      }
    });

    return months;
  }, [transactions, selectedYear]);

  // 4. Merchant Concentration (Top 5)
  const merchantData = useMemo(() => {
    if (!backendSummary?.top_merchants) return [];
    return backendSummary.top_merchants.map((m: any) => ({
      name: m.merchant,
      amount: m.amount
    }));
  }, [backendSummary]);

  const stats = useMemo(() => {
    return {
      netWorthInr: currencySummary?.total_inr || 0,
      monthlySpend: backendSummary?.cash_flow?.total_debits || 0,
      upcomingBillsAmount: bills.filter(b => b.status === 'upcoming').reduce((sum, b) => sum + b.amount_due, 0),
      totalRewards: rewards.reduce((sum, r) => sum + r.points_balance, 0)
    };
  }, [bills, rewards, currencySummary, backendSummary]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
        <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Aggregating Financial Data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-700">
      {/* Infrastructure Health Bar */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-[9px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>CORE STATUS: SECURE</span>
          </div>

          <div className={`flex items-center space-x-2 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-all ${
            health.redis === 'online' ? 'text-indigo-500 bg-indigo-50 border-indigo-100' : 'text-rose-500 bg-rose-50 border-rose-100'
          }`}>
            <Cpu size={10} />
            <span>WORKER: {health.redis.toUpperCase()}</span>
            {health.redis === 'offline' && (
              <button onClick={() => setShowRedisHelp(true)} className="ml-1 p-0.5 hover:bg-rose-100 rounded-full transition-colors"><HelpCircle size={10} /></button>
            )}
          </div>

          <button 
            onClick={triggerSync}
            disabled={syncing}
            className="flex items-center space-x-1.5 text-[9px] font-black uppercase tracking-widest bg-slate-900 px-4 py-1.5 rounded-lg text-white hover:bg-slate-800 transition-all disabled:opacity-50"
          >
            {syncing ? <RefreshCw size={10} className="animate-spin" /> : <RefreshCw size={10} />}
            <span>Sync Assets</span>
          </button>
        </div>
        <div className="text-[10px] font-black uppercase tracking-wider text-slate-300">Internal Build: v1.1.2-GA</div>
      </div>

      {/* Institutional Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div onClick={() => navigate('/insights')} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-600 transition-all cursor-pointer group">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Portfolio Valuation</p>
          <div className="flex items-end space-x-2">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">₹{stats.netWorthInr.toLocaleString()}</h3>
            <span className="text-[9px] font-black text-emerald-500 mb-1 flex items-center"><TrendingUp size={10} className="mr-0.5" /> 2.1%</span>
          </div>
        </div>

        <div onClick={() => navigate('/transactions')} className="bg-indigo-600 p-5 rounded-2xl shadow-xl shadow-indigo-100 hover:scale-[1.02] transition-all cursor-pointer text-white">
          <p className="text-[9px] font-black text-indigo-200 uppercase tracking-widest mb-1">Monthly Expenditure</p>
          <h3 className="text-xl font-black tracking-tight">₹{stats.monthlySpend.toLocaleString()}</h3>
        </div>

        <div onClick={() => navigate('/bills')} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-600 transition-all cursor-pointer">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Upcoming Payouts</p>
          <h3 className="text-xl font-black text-slate-900 tracking-tight">₹{stats.upcomingBillsAmount.toLocaleString()}</h3>
        </div>

        <div onClick={() => navigate('/insights')} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-600 transition-all cursor-pointer">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Reward Inventory</p>
          <h3 className="text-xl font-black text-slate-900 tracking-tight">{stats.totalRewards.toLocaleString()} <span className="text-xs font-light opacity-30 uppercase">PTS</span></h3>
        </div>
      </div>

      {/* Visualization Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Trend Analysis - 8 Cols */}
        <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-indigo-600">
               <TrendingUp size={14} strokeWidth={2.5} />
               <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Fiscal Year Expenditure Trend</h3>
            </div>
            <div className="flex items-center space-x-1 bg-slate-50 p-1 rounded-lg border border-slate-100">
              <Calendar size={12} className="text-slate-400 ml-1" />
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest outline-none px-1 py-0.5 cursor-pointer"
              >
                {[2026, 2025, 2024, 2023].map(y => <option key={y} value={y}>{y}</option>)}
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
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 9, fontWeight: 900}} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '10px'}}
                  cursor={{stroke: '#6366f1', strokeWidth: 1}}
                />
                <Area type="monotone" dataKey="spend" stroke="#6366f1" strokeWidth={3} fill="url(#trendGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Allocation - 4 Cols */}
        <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center">
          <div className="flex items-center space-x-2 text-indigo-600 w-full mb-6">
             <Filter size={14} strokeWidth={2.5} />
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Capital Allocation</h3>
          </div>
          <div className="h-64 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none', fontSize: '9px', fontWeight: 900}}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Net Outflow</span>
              <span className="text-sm font-black text-slate-900 mt-1">₹{stats.monthlySpend.toLocaleString()}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-4 w-full px-2">
            {categoryData.slice(0, 4).map((c: any, i: number) => (
              <div key={i} className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-[8px] font-black text-slate-500 uppercase truncate">{c.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cash Flow Analysis - 6 Cols */}
        <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
           <div className="flex items-center space-x-2 text-indigo-600 mb-8">
             <Activity size={14} strokeWidth={2.5} />
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Monthly Liquidity Analysis</h3>
          </div>
          <div className="h-56">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashFlowData}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                   <XAxis hide />
                   <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 9, fontWeight: 900}} />
                   <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '12px', border: 'none', fontSize: '9px', fontWeight: 900}} />
                   <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{fontSize: '9px', fontWeight: 900, textTransform: 'uppercase'}} />
                   <Bar dataKey="Inflow" fill="#10b981" radius={[8, 8, 0, 0]} barSize={40} />
                   <Bar dataKey="Outflow" fill="#f43f5e" radius={[8, 8, 0, 0]} barSize={40} />
                </BarChart>
             </ResponsiveContainer>
          </div>
        </div>

        {/* Merchant Concentration - 6 Cols */}
        <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
           <div className="flex items-center space-x-2 text-indigo-600 mb-8">
             <LayoutGrid size={14} strokeWidth={2.5} />
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Merchant Spending Concentration</h3>
          </div>
          <div className="h-56">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={merchantData} layout="vertical">
                   <XAxis type="number" hide />
                   <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 8, fontWeight: 900}} width={80} />
                   <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '12px', border: 'none', fontSize: '9px', fontWeight: 900}} />
                   <Bar dataKey="amount" fill="#6366f1" radius={[0, 8, 8, 0]} barSize={12}>
                     {merchantData.map((entry: any, index: number) => (
                       <Cell key={`cell-${index}`} fillOpacity={1 - (index * 0.15)} />
                     ))}
                   </Bar>
                </BarChart>
             </ResponsiveContainer>
          </div>
        </div>

        {/* Pulse Monitor Section */}
        <div className="lg:col-span-12">
          <div className="bg-[#0f172a] p-6 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between text-white ring-1 ring-white/10">
            <div className="flex items-center space-x-4 mb-4 md:mb-0">
               <div className="p-3 bg-indigo-600 rounded-xl">
                 <Bell size={20} className="animate-pulse" />
               </div>
               <div>
                  <h4 className="font-black uppercase tracking-widest text-[10px]">Active Pulse Surveillance</h4>
                  <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Automated risk detection is monitoring budgets and bill deadlines.</p>
               </div>
            </div>
            <div className="flex items-center space-x-6">
               <div className="text-center">
                  <p className="text-[14px] font-black">{notifications.filter(n => !n.is_read).length}</p>
                  <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Unread Logs</p>
               </div>
               <button onClick={() => navigate('/alerts')} className="px-5 py-2.5 bg-white text-slate-900 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 transition-all">
                 Review Audit
               </button>
            </div>
          </div>
        </div>

      </div>

      {showRedisHelp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-md shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-rose-50/20">
              <div className="flex items-center space-x-3 text-rose-600">
                <Server size={20} />
                <h3 className="font-black text-sm uppercase tracking-tight">Worker Connectivity Fix</h3>
              </div>
              <button onClick={() => setShowRedisHelp(false)} className="text-slate-400 hover:text-slate-900 transition-colors p-2"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed font-medium">The background task engine (Redis) is offline. Ensure your local service is active on the default port.</p>
              <div className="bg-slate-900 rounded-xl p-4">
                <code className="text-emerald-400 font-mono text-[11px] block">redis-server --port 6379</code>
              </div>
              <button 
                onClick={() => { setShowRedisHelp(false); fetchData(); }}
                className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-xl"
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