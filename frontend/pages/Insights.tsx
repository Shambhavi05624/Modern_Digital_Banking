
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Trophy, TrendingUp, Target, Zap, Globe, Loader2, Plus, X, 
  Coins, Activity, PieChart, FileText, Download,
  BarChart3, Layers, LayoutGrid, Clock, RefreshCcw, ArrowUpRight, ArrowDownRight,
  ArrowRightLeft, Scale, Calendar
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
  const [loading, setLoading] = useState(true);
  const [loadingRates, setLoadingRates] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  
  const [displayCurrency, setDisplayCurrency] = useState<'INR' | 'USD' | 'EUR' | 'GBP'>('INR');

  // Report Period Selection
  const now = new Date();
  const [reportMonth, setReportMonth] = useState<number>(now.getMonth() + 1);
  const [reportYear, setReportYear] = useState<number>(now.getFullYear());

  const [rewardForm, setRewardForm] = useState({
    program_name: '',
    points_balance: '',
    currency: 'INR',
    point_value: '0.1' 
  });

  const [transferForm, setTransferForm] = useState({
    targetCurrency: 'USD',
    estimatedPoints: 0
  });

  const fetchLiveRates = useCallback(async () => {
    setLoadingRates(true);
    try {
      const response = await fetch(`https://api.frankfurter.app/latest?from=INR&to=USD,EUR,GBP`);
      const data = await response.json();
      if (data && data.rates) {
        setLiveRates([
          { code: 'USD', rate: 1 / data.rates.USD, trend: 'stable' },
          { code: 'EUR', rate: 1 / data.rates.EUR, trend: 'stable' },
          { code: 'GBP', rate: 1 / data.rates.GBP, trend: 'stable' },
        ]);
      }
    } catch (err) {
      console.error("Live rates failed", err);
    } finally {
      setLoadingRates(false);
    }
  }, []);

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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const getCurrencySymbol = (curr: string) => {
    switch(curr) {
      case 'INR': return '₹';
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      default: return curr;
    }
  };

  const getMonthName = (m: number) => {
    return new Date(2000, m - 1).toLocaleString('default', { month: 'long' });
  };

  const handleDownloadPdf = async () => {
    setGeneratingPdf(true);
    try {
      showToast(`Generating audit for ${getMonthName(reportMonth)} ${reportYear}...`, "info");
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/reports/monthly-pdf?month=${reportMonth}&year=${reportYear}`, {
        headers: { 
          'Authorization': `Bearer ${token}` 
        }
      });
      
      if (!response.ok) throw new Error("Report generation failed at source");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Institutional_Audit_${reportYear}_${reportMonth}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      showToast("Audit successfully synchronized and downloaded", "success");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const currentRateToINR = useMemo(() => {
    if (displayCurrency === 'INR') return 1;
    const rateObj = liveRates.find(r => r.code === displayCurrency);
    return rateObj ? rateObj.rate : (insightsData?.rates[displayCurrency] || 1);
  }, [displayCurrency, liveRates, insightsData]);

  const convertedRewardsValue = useMemo(() => {
    if (!insightsData) return 0;
    return insightsData.reward_worth_inr / currentRateToINR;
  }, [insightsData, currentRateToINR]);

  const convertedNetWorth = useMemo(() => {
    if (!insightsData) return 0;
    return insightsData.total_inr / currentRateToINR;
  }, [insightsData, currentRateToINR]);

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
      showToast(`${rewardForm.program_name} synchronized`, "success");
      setIsModalOpen(false);
      setRewardForm({ program_name: '', points_balance: '', currency: 'INR', point_value: '0.1' });
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTransferInit = (reward: Reward) => {
    setSelectedReward(reward);
    setTransferForm({ targetCurrency: reward.currency === 'USD' ? 'INR' : 'USD', estimatedPoints: 0 });
    setIsTransferModalOpen(true);
  };

  const calculateConversion = () => {
    if (!selectedReward || !insightsData) return 0;
    const sourceRate = insightsData.rates[selectedReward.currency || 'INR'] || 1;
    const valueInINR = selectedReward.points_balance * (selectedReward.point_value || 0.1) * sourceRate;
    const targetRate = insightsData.rates[transferForm.targetCurrency] || 1;
    const valueInTarget = valueInINR / targetRate;
    return Math.floor(valueInTarget / (selectedReward.point_value || 0.1));
  };

  const handleConfirmTransfer = async () => {
    if (!selectedReward) return;
    setIsSaving(true);
    try {
      const newPoints = calculateConversion();
      await api.post('/rewards', {
        program_name: selectedReward.program_name,
        points_balance: newPoints,
        currency: transferForm.targetCurrency,
        point_value: selectedReward.point_value || 0.1
      });
      showToast(`Corridor switched to ${transferForm.targetCurrency}`, "success");
      setIsTransferModalOpen(false);
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading && !insightsData) {
    return <div className="flex flex-col items-center justify-center h-[50vh]"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10 animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Intelligence Node</h2>
          <p className="text-slate-400 text-xs font-medium">Consolidated monitoring of global asset corridors.</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="bg-white border border-slate-200 p-1 rounded-xl flex items-center shadow-sm">
            {(['INR', 'USD', 'EUR', 'GBP'] as const).map((curr) => (
              <button key={curr} onClick={() => setDisplayCurrency(curr)} className={`px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all ${displayCurrency === curr ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>{curr}</button>
            ))}
          </div>
          <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center space-x-2">
            <Plus size={14} />
            <span>Link Reward</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-slate-100/80 backdrop-blur-sm p-1 rounded-2xl flex items-center shadow-inner border border-slate-200">
            {[
              { id: 'analytics', label: 'Executive Pulse', icon: PieChart },
              { id: 'perks', label: 'Loyalty Vault', icon: Trophy },
              { id: 'currency', label: 'Market', icon: Globe },
              { id: 'reports', label: 'Fiscal Audit', icon: FileText }
            ].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center space-x-2 transition-all ${activeTab === tab.id ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>
                <tab.icon size={12} strokeWidth={2.5} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="animate-in slide-in-from-bottom-2 duration-500">
            {activeTab === 'analytics' ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#0f172a] rounded-3xl p-6 text-white shadow-xl relative overflow-hidden ring-1 ring-white/10">
                    <p className="text-indigo-400 text-[8px] font-black uppercase tracking-[0.3em] mb-2">Net Capital Retention</p>
                    <h3 className="text-2xl font-black tracking-tight">{getCurrencySymbol(displayCurrency)} {convertedNetWorth.toLocaleString(undefined, { maximumFractionDigits: 2 })}</h3>
                    <div className="mt-4 flex items-center space-x-2 text-emerald-400">
                      <TrendingUp size={12} />
                      <span className="text-[8px] font-black uppercase tracking-widest">Surplus Protocol Active</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-center">
                    <p className="text-slate-400 text-[8px] font-black uppercase tracking-[0.3em] mb-1">Burn Velocity Index</p>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{getCurrencySymbol(displayCurrency)} {(backendSummary?.burn_rate || 0 / currentRateToINR).toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
                    <p className="text-[8px] font-bold text-slate-300 uppercase mt-1">/ Monthly Avg ({displayCurrency})</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <h4 className="font-black text-[9px] uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center"><LayoutGrid size={12} className="mr-2" /> Top Nodes</h4>
                    <div className="space-y-3">
                      {backendSummary?.top_merchants.map((m, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:border-indigo-100 transition-all border border-transparent">
                          <span className="font-bold text-slate-700 text-xs truncate max-w-[120px]">{m.merchant}</span>
                          <span className="font-black text-slate-900 text-xs">₹{m.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <h4 className="font-black text-[9px] uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center"><Layers size={12} className="mr-2" /> Leakage Map</h4>
                    <div className="space-y-4">
                      {backendSummary?.category_spending.map((cat, i) => {
                        const perc = (cat.amount / (backendSummary.cash_flow.total_debits || 1)) * 100;
                        return (
                          <div key={i} className="space-y-1.5">
                            <div className="flex justify-between text-[8px] font-black uppercase"><span className="text-slate-500">{cat.category}</span><span className="text-indigo-600">{perc.toFixed(1)}%</span></div>
                            <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden"><div className="bg-indigo-600 h-full transition-all duration-1000" style={{ width: `${perc}%` }} /></div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ) : activeTab === 'perks' ? (
              <div className="space-y-6">
                <div className="bg-indigo-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
                  <div className="flex justify-between items-start relative z-10">
                    <div>
                      <p className="text-indigo-200 text-[8px] font-black uppercase tracking-[0.3em] mb-2">Perks Vault Inventory ({displayCurrency})</p>
                      <h3 className="text-4xl font-black tracking-tighter">
                        {getCurrencySymbol(displayCurrency)} {convertedRewardsValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </h3>
                      <div className="mt-3 flex items-center space-x-2">
                        <span className="bg-white/20 text-[8px] font-black uppercase px-2 py-1 rounded-lg border border-white/10">Live Exchange Adjusted</span>
                        <span className="text-[10px] font-bold text-indigo-100">Across {rewards.length} Programs</span>
                      </div>
                    </div>
                  </div>
                  <Trophy size={120} className="absolute -bottom-6 -right-6 text-white/10 rotate-12" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rewards.length === 0 ? (
                    <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-dashed border-slate-200 flex flex-col items-center">
                       <Zap className="text-slate-200 mb-4" size={40} />
                       <p className="text-slate-400 font-bold text-sm">No Reward Programs Synced</p>
                       <button onClick={() => setIsModalOpen(true)} className="mt-4 text-indigo-600 font-black text-[9px] uppercase tracking-widest hover:underline">+ Add First Vault</button>
                    </div>
                  ) : rewards.map(r => {
                    const programValueInINR = r.points_balance * (r.point_value || 0.1) * (insightsData?.rates[r.currency || 'INR'] || 1);
                    const programValueInDisplay = programValueInINR / currentRateToINR;
                    
                    return (
                      <div key={r.id} className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-indigo-600 transition-all flex flex-col justify-between min-h-[140px]">
                        <div className="flex justify-between items-start">
                          <div className="overflow-hidden">
                            <p className="font-black text-slate-900 text-sm truncate">{r.program_name}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">{r.points_balance.toLocaleString()} accumulated ({r.currency})</p>
                          </div>
                          <button onClick={() => handleTransferInit(r)} className="p-2 bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors" title="Transfer Currency Corridor">
                            <ArrowRightLeft size={14} />
                          </button>
                        </div>
                        <div className="flex justify-between items-end mt-4">
                          <span className="text-xs font-black text-emerald-600">≈ {getCurrencySymbol(displayCurrency)} {programValueInDisplay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          <div className="text-[8px] font-black uppercase bg-slate-100 px-2 py-1 rounded text-slate-500">{r.currency} BASE</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : activeTab === 'currency' ? (
              <div className="space-y-6">
                <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
                  <p className="text-indigo-400 text-[8px] font-black uppercase tracking-[0.3em] mb-2">Consolidated Valuation</p>
                  <h3 className="text-4xl font-black tracking-tight">{getCurrencySymbol(displayCurrency)} {convertedNetWorth.toLocaleString(undefined, { maximumFractionDigits: 2 })}</h3>
                  <Globe size={100} className="absolute -bottom-6 -right-6 opacity-10" />
                </div>
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden divide-y divide-slate-50">
                  {insightsData?.breakdown.map((curr, i) => (
                    <div key={i} className="flex items-center justify-between p-5 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center font-black text-slate-400 text-[10px]">{curr.currency}</div>
                        <div>
                          <p className="font-black text-slate-900 text-sm">{curr.balance.toLocaleString()} {curr.currency}</p>
                          <p className="text-[8px] font-black text-slate-300 uppercase">INR Valuation: ₹{(curr.balance * curr.rate_to_inr).toLocaleString()}</p>
                        </div>
                      </div>
                      <span className="text-[8px] font-black text-indigo-600 uppercase bg-indigo-50 px-2 py-1 rounded">Spot: {curr.rate_to_inr.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white p-8 md:p-12 rounded-[2.5rem] border border-slate-200 text-center animate-in zoom-in-95 flex flex-col items-center">
                <div className="p-6 bg-slate-50 rounded-[2rem] mb-6 shadow-inner">
                  <FileText size={48} className="text-indigo-600" />
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Portfolio Audit Statement</h3>
                <p className="text-slate-400 text-xs mt-2 max-w-xs mx-auto font-medium">Generate a comprehensive PDF reconciliation of your fiscal position by period.</p>
                
                <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-sm">
                  <div className="space-y-1.5 text-left">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1 flex items-center space-x-1">
                      <Calendar size={10} />
                      <span>Audit Month</span>
                    </label>
                    <select 
                      value={reportMonth}
                      onChange={(e) => setReportMonth(parseInt(e.target.value))}
                      className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-100 transition-all font-bold text-sm"
                    >
                      {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                        <option key={m} value={m}>{getMonthName(m)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5 text-left">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Year</label>
                    <select 
                      value={reportYear}
                      onChange={(e) => setReportYear(parseInt(e.target.value))}
                      className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-100 transition-all font-bold text-sm"
                    >
                      {[2024, 2025, 2026].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button 
                  onClick={handleDownloadPdf}
                  disabled={generatingPdf} 
                  className="mt-8 w-full max-w-sm bg-[#0f172a] text-white py-5 rounded-[1.5rem] font-black uppercase text-[11px] tracking-widest hover:bg-black shadow-xl disabled:opacity-50 transition-all flex items-center justify-center space-x-3"
                >
                  {generatingPdf ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                  <span>{generatingPdf ? 'Processing Node...' : 'Initialize Secure Audit'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
               <div className="flex items-center space-x-2 text-indigo-700">
                <Globe size={14} strokeWidth={2.5} />
                <h3 className="font-black uppercase tracking-widest text-[9px]">Market Pulse</h3>
              </div>
              <button onClick={fetchLiveRates} disabled={loadingRates} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-300 hover:text-indigo-600 active:scale-90 transition-all">
                <RefreshCcw size={14} className={loadingRates ? 'animate-spin' : ''} />
              </button>
            </div>
            
            <div className="space-y-2.5">
              {liveRates.map(r => (
                <div key={r.code} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-black text-slate-700">{r.code}/INR</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-black text-slate-900">₹{r.rate.toFixed(2)}</span>
                    <ArrowUpRight size={12} className="text-emerald-500" />
                  </div>
                </div>
              ))}
              <p className="text-[8px] font-bold text-slate-400 uppercase text-center mt-2 flex items-center justify-center space-x-1">
                <Clock size={8} /> <span>Powered by Frankfurter API</span>
              </p>
            </div>
          </div>

          <div className="bg-indigo-600 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[280px]">
             <Target size={120} className="absolute -bottom-8 -right-8 opacity-10 rotate-12" />
             <div className="relative z-10">
               <h4 className="font-black uppercase tracking-widest text-[10px] text-indigo-200 mb-4">Strategic Forecast</h4>
               <p className="text-sm font-medium leading-relaxed">Based on your 30-day burn index, your liquidity is healthy for the next 4 months.</p>
             </div>
             <div className="relative z-10 bg-white/10 border border-white/10 p-4 rounded-2xl flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-widest">Health Index</span>
                <span className="text-emerald-400 text-xs font-black">94% OPTIMAL</span>
             </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden border border-white/20">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
               <div>
                 <h3 className="font-black text-lg tracking-tight text-slate-900">Register Perk</h3>
                 <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Asset Registry Node</p>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-slate-900 p-2"><X size={24} /></button>
            </div>
            <form onSubmit={handleAddReward} className="p-8 space-y-5">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Program Name</label>
                <input type="text" required placeholder="e.g. Nexus Platinum" className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-100 transition-all font-bold text-sm" value={rewardForm.program_name} onChange={e => setRewardForm({...rewardForm, program_name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Points Balance</label>
                  <input type="number" required placeholder="0" className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-100 transition-all font-black text-lg" value={rewardForm.points_balance} onChange={e => setRewardForm({...rewardForm, points_balance: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Corridor</label>
                  <select className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-100 transition-all font-black text-xs uppercase" value={rewardForm.currency} onChange={e => setRewardForm({...rewardForm, currency: e.target.value})}>
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>
              <button type="submit" disabled={isSaving} className="w-full bg-[#0f172a] text-white py-4.5 rounded-[1.25rem] font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-black transition-all flex items-center justify-center space-x-2">
                {isSaving ? <Loader2 className="animate-spin" size={16} /> : <span>Synchronize Vault Entry</span>}
              </button>
            </form>
          </div>
        </div>
      )}

      {isTransferModalOpen && selectedReward && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden border border-white/20">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50">
               <div className="flex items-center space-x-3 text-indigo-600">
                 <ArrowRightLeft size={20} />
                 <div>
                   <h3 className="font-black text-lg tracking-tight text-slate-900">Currency Bridge</h3>
                   <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Re-base Reward Corridor</p>
                 </div>
               </div>
               <button onClick={() => setIsTransferModalOpen(false)} className="text-slate-300 hover:text-slate-900 p-2"><X size={24} /></button>
            </div>
            
            <div className="p-8 space-y-8">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center">
                 <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Source Accumulated</p>
                 <h4 className="text-2xl font-black text-slate-900">{selectedReward.points_balance.toLocaleString()} PTS</h4>
                 <p className="text-[10px] font-bold text-indigo-600 uppercase mt-1">IN {selectedReward.currency || 'INR'} VALUATION</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Target Corridor</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['INR', 'USD', 'EUR', 'GBP'] as const).map(curr => (
                      <button 
                        key={curr} 
                        onClick={() => setTransferForm({...transferForm, targetCurrency: curr})}
                        className={`py-2.5 rounded-xl text-[10px] font-black border transition-all ${transferForm.targetCurrency === curr ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-200 hover:border-indigo-300'}`}
                      >
                        {curr}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-indigo-600 p-6 rounded-2xl text-white shadow-xl shadow-indigo-100 text-center">
                   <p className="text-[9px] font-black uppercase text-indigo-200 tracking-widest mb-1">Bridge Estimate</p>
                   <h4 className="text-3xl font-black">{calculateConversion().toLocaleString()} PTS</h4>
                   <p className="text-[10px] font-bold text-white/60 uppercase mt-1">SETTLEMENT IN {transferForm.targetCurrency}</p>
                </div>
              </div>

              <button 
                onClick={handleConfirmTransfer} 
                disabled={isSaving || transferForm.targetCurrency === selectedReward.currency} 
                className="w-full bg-[#0f172a] text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-[11px] shadow-2xl hover:bg-black transition-all flex items-center justify-center space-x-3 disabled:opacity-30"
              >
                {isSaving ? <Loader2 className="animate-spin" size={20} /> : (
                  <>
                    <Zap size={16} />
                    <span>Confirm Corridor Bridge</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Insights;
