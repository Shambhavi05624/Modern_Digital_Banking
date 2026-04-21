import React, { useState, useEffect, useCallback } from 'react';
import { 
  Trophy, TrendingUp, Sparkles, Target, Zap, Gift, ShieldCheck, 
  Globe, Loader2, Plus, X, ArrowUpRight, Coins, Wallet, Landmark, 
  RefreshCcw, ArrowDownRight, Activity, ShoppingBag, PieChart,
  ArrowUp, ArrowDown, CreditCard, FileText, Download,
  BarChart3, Layers, LayoutGrid, Calendar, Clock
} from 'lucide-react';
import { api } from '../api';
import { Reward } from '../types';
import { useToast } from '../App';

interface CurrencyBreakdown {
  currency: string;
  balance: number;
  rate_to_inr: number;
  value_in_inr: number;
}

interface BackendSummary {
  cash_flow: {
    total_credits: number;
    total_debits: number;
    net_savings: number;
  };
  top_merchants: Array<{merchant: string, amount: number}>;
  category_spending: Array<{category: string, amount: number}>;
  burn_rate: number;
  calculation_date: string;
}

interface InsightsData {
  breakdown: CurrencyBreakdown[];
  total_inr: number;
  reward_worth_inr: number;
  rates: Record<string, number>;
}

interface LiveRate {
  code: string;
  rate: number;
  trend: 'up' | 'down' | 'stable';
}

const Insights: React.FC = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'perks' | 'currency' | 'analytics' | 'reports'>('analytics');
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [insightsData, setInsightsData] = useState<InsightsData | null>(null);
  const [backendSummary, setBackendSummary] = useState<BackendSummary | null>(null);
  const [liveRates, setLiveRates] = useState<LiveRate[]>([]);
  const [lastUpdatedRates, setLastUpdatedRates] = useState<string>('--:--:--');
  const [loading, setLoading] = useState(true);
  const [loadingRates, setLoadingRates] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  
  const [displayCurrency, setDisplayCurrency] = useState<'INR' | 'USD' | 'EUR' | 'GBP'>('INR');

  // Report selection states
  const now = new Date();
  const [reportMonth, setReportMonth] = useState<number>(now.getMonth() + 1);
  const [reportYear, setReportYear] = useState<number>(now.getFullYear());

  const [rewardForm, setRewardForm] = useState({
    program_name: '',
    points_balance: '',
    currency: 'INR',
    point_value: '0.1' 
  });

  const fetchLiveRates = useCallback(async () => {
    setLoadingRates(true);
    try {
      // Added cache-busting timestamp and extra parameters for reliability
      const response = await fetch(`https://api.frankfurter.app/latest?from=INR&to=USD,EUR,GBP&_t=${Date.now()}`);
      const data = await response.json();
      
      if (data && data.rates) {
        setLiveRates(prev => {
          // Dynamic trend calculation by comparing with previous state
          const calculateTrend = (code: string, newRate: number): 'up' | 'down' | 'stable' => {
            const old = prev.find(r => r.code === code);
            if (!old) return 'stable';
            if (newRate > old.rate) return 'up';
            if (newRate < old.rate) return 'down';
            return 'stable';
          };

          return [
            { code: 'USD', rate: 1 / data.rates.USD, trend: calculateTrend('USD', 1 / data.rates.USD) },
            { code: 'EUR', rate: 1 / data.rates.EUR, trend: calculateTrend('EUR', 1 / data.rates.EUR) },
            { code: 'GBP', rate: 1 / data.rates.GBP, trend: calculateTrend('GBP', 1 / data.rates.GBP) },
            { code: 'INR', rate: 1, trend: 'stable' }
          ];
        });
        setLastUpdatedRates(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error("Failed to fetch live rates", err);
      showToast("Market Pulse sync failed", "error");
    } finally {
      setLoadingRates(false);
    }
  }, [showToast]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rewardData, summaryData, analyticsData] = await Promise.all([
        api.get('/rewards'),
        api.get('/rewards/currency-summary'),
        api.get('/insights/summary').catch(() => null)
      ]);
      setRewards(rewardData || []);
      setInsightsData(summaryData);
      setBackendSummary(analyticsData);
      await fetchLiveRates();
    } catch (err) {
      console.error("Insights fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchLiveRates, 60000);
    return () => clearInterval(interval);
  }, [fetchLiveRates]);

  const handleDownloadPdf = async () => {
    setGeneratingPdf(true);
    try {
      showToast(`Generating ${getMonthName(reportMonth)} ${reportYear} statement...`, "info");
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://127.0.0.1:8000/reports/monthly-pdf?month=${reportMonth}&year=${reportYear}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Report generation failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Statement_${reportYear}_${reportMonth}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast("PDF Statement ready", "success");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const getMonthName = (m: number) => {
    return new Date(2000, m - 1).toLocaleString('default', { month: 'long' });
  };

  const handleAddReward = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.post('/rewards', {
        program_name: rewardForm.program_name,
        points_balance: parseInt(rewardForm.points_balance) || 0,
        currency: rewardForm.currency,
        point_value: parseFloat(rewardForm.point_value) || 0
      });
      showToast(`${rewardForm.program_name} updated`, "success");
      setIsModalOpen(false);
      setRewardForm({ program_name: '', points_balance: '', currency: 'INR', point_value: '0.1' });
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const getCurrencySymbol = (curr: string) => {
    switch(curr) {
      case 'INR': return '₹';
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      default: return curr;
    }
  };

  const getCurrentRateToINR = (curr: string) => {
    const live = liveRates.find(r => r.code === curr);
    if (live) return live.rate;
    return insightsData?.rates[curr] || 1;
  };

  const convertFromINR = (amountInInr: number) => {
    if (!insightsData) return amountInInr;
    const rateToInr = getCurrentRateToINR(displayCurrency);
    return amountInInr / rateToInr;
  };

  const totalPoints = rewards.reduce((sum, r) => sum + r.points_balance, 0);
  const rewardsValueInDisplay = insightsData ? convertFromINR(insightsData.reward_worth_inr) : 0;
  const totalNetWorthDisplay = insightsData ? convertFromINR(insightsData.total_inr) : 0;

  if (loading && !insightsData) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Aggregating Insights</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-10 animate-in fade-in duration-700">
      {/* Compact Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Financial Intelligence</h2>
            <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[9px] font-black uppercase tracking-wider">Market Live</span>
            </div>
          </div>
          <p className="text-slate-400 text-sm font-medium">Deep analysis of currency corridors and reward valuations.</p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="bg-white border border-slate-200 p-1 rounded-xl flex items-center shadow-sm">
            {(['INR', 'USD', 'EUR', 'GBP'] as const).map((curr) => (
              <button
                key={curr}
                onClick={() => setDisplayCurrency(curr)}
                className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${
                  displayCurrency === curr ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {curr}
              </button>
            ))}
          </div>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
          >
            <Plus size={16} />
            <span className="text-xs">Link Source</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          {/* Refined Tab Navigation */}
          <div className="bg-slate-100/80 backdrop-blur-sm p-1 rounded-2xl flex items-center shadow-inner border border-slate-200">
            {[
              { id: 'analytics', label: 'Analytics', icon: PieChart },
              { id: 'perks', label: 'Loyalty Vault', icon: Trophy },
              { id: 'currency', label: 'Market', icon: Globe },
              { id: 'reports', label: 'Reports', icon: FileText }
            ].map((tab) => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center space-x-2 transition-all duration-300 ${
                  activeTab === tab.id ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <tab.icon size={12} strokeWidth={2.5} />
                <span className="hidden md:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="animate-in slide-in-from-bottom-2 duration-500">
            {activeTab === 'analytics' ? (
              <div className="space-y-6">
                {/* Horizontal Cash Flow Card - Compact and Responsive */}
                <div className="bg-[#0f172a] rounded-3xl p-8 text-white relative overflow-hidden shadow-xl ring-1 ring-white/10">
                   <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                     <div className="space-y-6">
                       <div className="space-y-1">
                         <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em]">Net Capital Balance</p>
                         <div className="flex items-center space-x-3">
                           <h3 className="text-3xl font-black tracking-tight">
                             ₹{backendSummary?.cash_flow.net_savings.toLocaleString()}
                           </h3>
                           <div className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-lg flex items-center space-x-1 border border-emerald-500/10">
                             <TrendingUp size={12} />
                             <span className="text-[9px] font-black">HEALTHY</span>
                           </div>
                         </div>
                       </div>
                       
                       <div className="flex items-center space-x-8">
                          <div className="space-y-1">
                             <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Inflow</p>
                             <p className="text-lg font-black text-emerald-400">₹{backendSummary?.cash_flow.total_credits.toLocaleString()}</p>
                          </div>
                          <div className="w-px h-6 bg-white/10" />
                          <div className="space-y-1">
                             <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Outflow</p>
                             <p className="text-lg font-black text-rose-400">₹{backendSummary?.cash_flow.total_debits.toLocaleString()}</p>
                          </div>
                       </div>
                     </div>

                     <div className="bg-white/5 border border-white/10 p-6 rounded-2xl flex flex-col items-center justify-center min-w-[160px]">
                        <Activity className="text-indigo-400 mb-2" size={32} strokeWidth={1.5} />
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Burn Index</p>
                        <p className="text-xl font-black mt-1">₹{backendSummary?.burn_rate.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                        <p className="text-[8px] font-bold text-slate-500 uppercase mt-1">/ Month Avg</p>
                     </div>
                   </div>
                   
                   <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-600/10 blur-[80px] -mr-24 -mt-24 rounded-full" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {/* Merchants List - Compact */}
                   <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                     <div className="flex items-center justify-between">
                       <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 flex items-center space-x-2">
                         <LayoutGrid size={12} />
                         <span>High Volume Nodes</span>
                       </h4>
                       <span className="text-[9px] font-black text-indigo-600 cursor-pointer hover:underline">DETAILS</span>
                     </div>
                     <div className="space-y-3">
                       {backendSummary?.top_merchants.map((m, i) => (
                         <div key={i} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:border-indigo-100 transition-all shadow-sm">
                            <div className="flex items-center space-x-3 overflow-hidden">
                               <div className="w-9 h-9 bg-white border border-slate-100 rounded-xl flex items-center justify-center font-black text-slate-400 text-xs shrink-0 shadow-sm">
                                  {m.merchant[0]}
                               </div>
                               <span className="font-bold text-slate-800 text-xs truncate">{m.merchant}</span>
                            </div>
                            <span className="font-black text-slate-900 text-xs shrink-0 ml-2">₹{m.amount.toLocaleString()}</span>
                         </div>
                       ))}
                     </div>
                   </div>

                   {/* Categories Spend - Compact */}
                   <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                     <div className="flex items-center justify-between">
                       <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 flex items-center space-x-2">
                         <Layers size={12} />
                         <span>Category Leakage</span>
                       </h4>
                       <Target size={12} className="text-slate-300" />
                     </div>
                     <div className="space-y-6 pt-2">
                       {backendSummary?.category_spending.map((cat, i) => {
                          const total = backendSummary.cash_flow.total_debits || 1;
                          const perc = (cat.amount / total) * 100;
                          return (
                            <div key={i} className="space-y-2">
                               <div className="flex justify-between items-end">
                                 <span className="font-bold text-[11px] text-slate-700">{cat.category}</span>
                                 <span className="text-[9px] font-black text-slate-400">₹{cat.amount.toLocaleString()}</span>
                               </div>
                               <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden p-0.5 border border-slate-200/50">
                                 <div 
                                   className="h-full rounded-full bg-indigo-600 shadow-sm transition-all duration-1000" 
                                   style={{ width: `${Math.min(perc, 100)}%` }}
                                 />
                               </div>
                            </div>
                          );
                       })}
                     </div>
                   </div>
                </div>
              </div>
            ) : activeTab === 'perks' ? (
              <div className="space-y-6 animate-in fade-in duration-500">
                 <div className="bg-indigo-600 rounded-3xl p-10 text-white relative overflow-hidden shadow-xl">
                    <div className="relative z-10 space-y-6">
                       <div className="space-y-2">
                         <p className="text-indigo-200 text-[10px] font-black uppercase tracking-[0.3em]">Cumulative Perks Balance</p>
                         <h3 className="text-5xl font-black tracking-tighter">
                           {totalPoints.toLocaleString()} <span className="text-xl font-light opacity-40">PTS</span>
                         </h3>
                       </div>
                       <div className="inline-flex items-center space-x-3 bg-white/20 border border-white/20 px-5 py-2.5 rounded-2xl backdrop-blur-md">
                         <Coins size={18} className="text-indigo-100" />
                         <span className="font-black text-xl">
                           {getCurrencySymbol(displayCurrency)}{rewardsValueInDisplay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                         </span>
                       </div>
                    </div>
                    <Trophy size={160} className="absolute -bottom-8 -right-8 text-white/10 rotate-12" />
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {rewards.map((perk) => (
                      <div key={perk.id} className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-indigo-600 transition-all flex flex-col justify-between min-h-[160px] shadow-sm">
                        <div className="flex justify-between items-start">
                           <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-400">
                              <Zap size={20} strokeWidth={2} />
                           </div>
                           <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">Live Source</span>
                        </div>
                        <div className="mt-4 flex items-end justify-between">
                           <div className="overflow-hidden">
                              <p className="text-base font-black text-slate-900 tracking-tight truncate">{perk.program_name}</p>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{perk.currency || 'INR'} Vault</p>
                           </div>
                           <div className="text-right shrink-0">
                              <p className="text-2xl font-black text-slate-900 tracking-tighter">{perk.points_balance.toLocaleString()}</p>
                              <p className="text-[9px] font-bold text-emerald-500 uppercase mt-0.5">≈ {getCurrencySymbol(perk.currency || 'INR')}{(perk.points_balance * (perk.point_value || 0.1)).toLocaleString()}</p>
                           </div>
                        </div>
                      </div>
                    ))}
                 </div>
              </div>
            ) : activeTab === 'currency' ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-8 bg-slate-900 rounded-3xl text-white shadow-xl relative overflow-hidden flex flex-col justify-center">
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-2">Net Portfolio Valuation</p>
                    <h3 className="text-4xl font-black tracking-tight">
                      {getCurrencySymbol(displayCurrency)}{totalNetWorthDisplay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </h3>
                    <Globe size={140} className="absolute -bottom-10 -right-10 opacity-5" />
                  </div>
                  <div className="p-8 bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col justify-center">
                    <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl w-fit mb-4 text-indigo-600"><BarChart3 size={24} /></div>
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1">Exposure Spread</p>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{insightsData?.breakdown.length} Active Corridors</h3>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm divide-y divide-slate-50">
                  {insightsData?.breakdown.map((curr, i) => (
                    <div key={i} className="flex items-center justify-between p-6 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center space-x-6">
                        <div className="w-12 h-12 bg-white border border-slate-200 rounded-xl flex items-center justify-center font-black text-slate-400 text-sm shadow-sm">
                          {curr.currency.slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-base font-black text-slate-900 tracking-tight">{curr.currency} Treasury</p>
                          <p className="text-[9px] text-slate-400 font-black uppercase mt-1 tracking-widest flex items-center">
                            Spot: ₹{getCurrentRateToINR(curr.currency).toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-slate-900 text-xl tracking-tight">{curr.balance.toLocaleString()} {curr.currency}</p>
                        <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mt-1">Valuation: ₹{(curr.balance * getCurrentRateToINR(curr.currency)).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in duration-500 space-y-6">
                 <div className="bg-white p-8 md:p-12 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col items-center text-center">
                    <div className="bg-indigo-600 p-6 rounded-[1.5rem] text-white mb-6 shadow-xl shadow-indigo-100">
                      <FileText size={48} strokeWidth={1.5} className="animate-pulse" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Executive Report Generator</h3>
                    <p className="text-slate-500 max-w-xs mt-2 text-[11px] font-medium leading-relaxed">
                      Select a specific month to generate a comprehensive PDF financial audit.
                    </p>

                    {/* Monthwise Selection Controls */}
                    <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm">
                       <div className="flex-1 w-full space-y-1.5">
                          <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center space-x-1">
                             <Calendar size={10} />
                             <span>Fiscal Period</span>
                          </label>
                          <select 
                            value={reportMonth}
                            onChange={(e) => setReportMonth(parseInt(e.target.value))}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-black bg-slate-50/50 outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                          >
                             {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                               <option key={m} value={m}>{getMonthName(m)}</option>
                             ))}
                          </select>
                       </div>
                       <div className="w-full sm:w-28 space-y-1.5">
                          <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Year</label>
                          <select 
                            value={reportYear}
                            onChange={(e) => setReportYear(parseInt(e.target.value))}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-black bg-slate-50/50 outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                          >
                             {[2026, 2025, 2024, 2023].map(y => (
                               <option key={y} value={y}>{y}</option>
                             ))}
                          </select>
                       </div>
                    </div>
                    
                    <button 
                      onClick={handleDownloadPdf}
                      disabled={generatingPdf}
                      className="mt-8 w-full max-w-sm bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center space-x-3 shadow-xl hover:bg-black transition-all active:scale-95 disabled:opacity-50"
                    >
                      {generatingPdf ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <>
                          <Download size={18} />
                          <span className="text-[10px]">Download {getMonthName(reportMonth)} {reportYear} Statement</span>
                        </>
                      )}
                    </button>
                    
                    <div className="flex items-center space-x-3 mt-8 opacity-40">
                       <ShieldCheck size={12} className="text-emerald-600" />
                       <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Secure PDF Generator Active</span>
                    </div>
                 </div>
              </div>
            )}
          </div>
        </div>

        {/* Intelligence Sidebar - Compact Widgets */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6 relative overflow-hidden">
            <div className="flex items-center justify-between">
               <div className="flex items-center space-x-2.5 text-indigo-700">
                <Globe size={16} strokeWidth={2.5} />
                <div>
                  <h3 className="font-black uppercase tracking-widest text-[10px]">Market Pulse</h3>
                  <div className="flex items-center space-x-1 mt-0.5 text-[8px] text-slate-400 font-bold uppercase">
                    <Clock size={8} />
                    <span>Sync: {lastUpdatedRates}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={fetchLiveRates} 
                disabled={loadingRates}
                className="p-2 hover:bg-slate-50 rounded-lg text-slate-300 hover:text-indigo-600 transition-all active:scale-90"
              >
                <RefreshCcw size={14} className={loadingRates ? 'animate-spin' : ''} />
              </button>
            </div>
            
            <div className="space-y-3">
              {liveRates.filter(r => r.code !== 'INR').map(r => (
                <div key={r.code} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-sm transition-all">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center font-black text-slate-400 text-[10px] shadow-sm">
                      {r.code[0]}
                    </div>
                    <span className="text-xs font-black text-slate-700">{r.code}/INR</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-black text-slate-900">₹{r.rate.toFixed(2)}</span>
                    <div className={`p-1 rounded-md transition-colors ${
                      r.trend === 'up' ? 'bg-emerald-50 text-emerald-500' : 
                      r.trend === 'down' ? 'bg-rose-50 text-rose-500' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {r.trend === 'up' ? <ArrowUpRight size={14} /> : 
                       r.trend === 'down' ? <ArrowDownRight size={14} /> : <div className="w-3.5 h-0.5 bg-slate-300 rounded-full mx-auto" />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#0f172a] p-8 rounded-3xl shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[350px] ring-1 ring-white/10">
             <div className="flex items-center space-x-2 text-indigo-400 mb-8">
                <Target size={16} strokeWidth={2.5} />
                <h3 className="font-black uppercase tracking-widest text-[10px]">Strategic Audit</h3>
             </div>
             
             <div className="space-y-8 relative z-10">
               <div className="space-y-3">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className="text-slate-500">Coverage</span>
                    <span className="text-emerald-400">92% SECURE</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden p-0.5 border border-white/5">
                    <div className="bg-indigo-500 h-full rounded-full transition-all duration-[2000ms]" style={{ width: '92%' }}></div>
                  </div>
               </div>
               
               <div className="p-5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between group cursor-pointer hover:bg-white/10 transition-all">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-900/40">
                      <ShieldCheck size={24} />
                    </div>
                    <div>
                      <span className="text-[11px] font-black text-white uppercase tracking-widest block">Vault Check</span>
                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 block">Compliance Active</span>
                    </div>
                  </div>
               </div>
             </div>
             
             <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 blur-[80px] -mr-24 -mt-24 rounded-full" />
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] w-full max-md shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden border border-white/20">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
               <div>
                 <h3 className="font-black text-xl tracking-tight text-slate-900">Registry Entry</h3>
                 <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Connect Asset Node</p>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-slate-900 transition-colors p-2"><X size={24} strokeWidth={2} /></button>
            </div>
            <form onSubmit={handleAddReward} className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">Program Identifier</label>
                <input type="text" required placeholder="e.g. Nexus Gold" className="w-full px-5 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 bg-slate-50/30 transition-all font-bold text-sm" value={rewardForm.program_name} onChange={e => setRewardForm({...rewardForm, program_name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">Points</label>
                  <input type="number" required placeholder="0" className="w-full px-5 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 bg-slate-50/30 transition-all font-black text-lg" value={rewardForm.points_balance} onChange={e => setRewardForm({...rewardForm, points_balance: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">Corridor</label>
                  <select className="w-full px-5 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 bg-slate-50/30 transition-all font-black" value={rewardForm.currency} onChange={e => setRewardForm({...rewardForm, currency: e.target.value})}>
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>
              <button type="submit" disabled={isSaving} className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest flex items-center justify-center space-x-3 shadow-xl hover:bg-black transition-all active:scale-[0.98]">
                {isSaving ? <Loader2 className="animate-spin" size={20} /> : (
                  <>
                    <ShieldCheck size={18} />
                    <span>Synchronize Vault</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Insights;