import React, { useState, useEffect } from 'react';
import { Plus, TrendingUp, Loader2, AlertCircle, X, CheckCircle2, AlertTriangle, ChevronLeft, ChevronRight, Trash2, Calendar, FileSpreadsheet } from 'lucide-react';
import { Budget } from '../types';
import { api } from '../api';
import { useToast } from '../App';

const CATEGORIES = ["Food & Drink", "Entertainment", "Shopping", "Transport", "Utilities", "Others"];

const Budgets: React.FC = () => {
  const { showToast } = useToast();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [error, setError] = useState('');
  
  const [currentView, setCurrentView] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  const [newBudget, setNewBudget] = useState({ 
    category: CATEGORIES[0], 
    limit: '',
    month: currentView.month,
    year: currentView.year
  });

  const fetchBudgets = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/budgets?month=${currentView.month}&year=${currentView.year}`);
      setBudgets(data || []);
    } catch (err: any) {
      setError(err.message);
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBudgets(); }, [currentView]);

  // Update modal defaults when view changes
  useEffect(() => {
    setNewBudget(prev => ({
      ...prev,
      month: currentView.month,
      year: currentView.year
    }));
  }, [currentView]);

  const handleExport = async () => {
    try {
      showToast("Generating performance snapshot...", "info");
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://127.0.0.1:8000/budgets/export/csv', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `budget_summary_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast("Budget summary exported", "success");
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.post('/budgets', { 
        category: newBudget.category, 
        limit_amount: parseFloat(newBudget.limit),
        month: parseInt(newBudget.month.toString()),
        year: parseInt(newBudget.year.toString())
      });
      showToast(`${newBudget.category} budget activated for ${getMonthName(newBudget.month)}`, "success");
      setIsModalOpen(false);
      fetchBudgets();
    } catch (err: any) {
      setError(err.message);
      showToast(err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this budget category?")) return;
    setIsDeleting(id);
    try {
      await api.delete(`/budgets/${id}`);
      showToast("Budget category removed", "info");
      fetchBudgets();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsDeleting(null);
    }
  };

  const changeMonth = (offset: number) => {
    let nextMonth = currentView.month + offset;
    let nextYear = currentView.year;
    if (nextMonth > 12) { nextMonth = 1; nextYear++; }
    if (nextMonth < 1) { nextMonth = 12; nextYear--; }
    setCurrentView({ month: nextMonth, year: nextYear });
  };

  const getMonthName = (m: number) => {
    return new Date(2000, m - 1).toLocaleString('default', { month: 'long' });
  };

  const totalLimit = budgets.reduce((acc, b) => acc + b.limit_amount, 0);
  const totalSpent = budgets.reduce((acc, b) => acc + b.spent_amount, 0);
  const percentage = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;

  const monthName = getMonthName(currentView.month);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Budget Tracker</h2>
          <p className="text-slate-500">Managing goals for {monthName} {currentView.year}</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-white border border-slate-200 rounded-2xl p-1 shadow-sm">
            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors"><ChevronLeft size={20} /></button>
            <div className="px-4 font-black text-[10px] uppercase tracking-widest text-slate-600 min-w-[120px] text-center">
              {monthName} {currentView.year}
            </div>
            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors"><ChevronRight size={20} /></button>
          </div>
          
          <button 
            onClick={handleExport}
            className="flex items-center space-x-2 bg-white border border-slate-200 px-5 py-2.5 rounded-2xl text-slate-600 hover:bg-slate-50 font-bold active:scale-95 transition-all shadow-sm"
          >
            <FileSpreadsheet size={18} />
            <span>Export Analytics</span>
          </button>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-100 active:scale-95"
          >
            <Plus size={18} />
            <span>New Budget</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col items-center text-center animate-in slide-in-from-left duration-500">
          <div className="relative w-48 h-48 mb-6">
             <svg className="w-full h-full transform -rotate-90">
                <circle cx="96" cy="96" r="88" stroke="#f1f5f9" strokeWidth="12" fill="none" />
                <circle 
                  cx="96" cy="96" r="88" 
                  stroke={percentage > 90 ? "#f43f5e" : "#4f46e5"} 
                  strokeWidth="12" fill="none" 
                  strokeDasharray={552.92}
                  strokeDashoffset={552.92 * (1 - Math.min(percentage/100, 1))}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
             </svg>
             <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-4xl font-black ${percentage > 90 ? 'text-rose-600' : 'text-slate-900'}`}>{percentage}%</span>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Spent</span>
             </div>
          </div>
          <h3 className="text-xl font-bold text-slate-900">Portfolio Status</h3>
          <p className="text-slate-500 text-sm mt-2">
            Spent <span className="font-bold text-indigo-600">₹{totalSpent.toLocaleString('en-IN')}</span> of 
            <span className="font-bold text-slate-900"> ₹{totalLimit.toLocaleString('en-IN')}</span>.
          </p>
          {percentage > 90 ? (
            <div className="mt-8 w-full p-4 bg-rose-50 rounded-2xl text-rose-700 text-[10px] font-black uppercase tracking-widest flex items-center justify-center space-x-2 border border-rose-100 animate-pulse">
              <AlertTriangle size={16} />
              <span>Warning: Critical Burn</span>
            </div>
          ) : (
            <div className="mt-8 w-full p-4 bg-emerald-50 rounded-2xl text-emerald-700 text-[10px] font-black uppercase tracking-widest flex items-center justify-center space-x-2 border border-emerald-100">
              <CheckCircle2 size={16} />
              <span>Healthy Allocation</span>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          {loading ? (
             <div className="bg-white rounded-[2.5rem] border border-slate-200 p-20 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Loading Records...</p>
             </div>
          ) : budgets.length === 0 ? (
            <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 p-16 text-center flex flex-col items-center animate-in zoom-in-95">
              <div className="bg-slate-50 p-6 rounded-full mb-4"><Calendar className="text-slate-200" size={48} /></div>
              <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No plans for {monthName}</p>
              <button onClick={() => setIsModalOpen(true)} className="mt-4 text-indigo-600 font-black text-sm hover:underline">Create {monthName} Strategy +</button>
            </div>
          ) : (
            budgets.map((b) => {
              const bPerc = b.limit_amount > 0 ? (b.spent_amount / b.limit_amount) * 100 : 0;
              return (
                <div key={b.id} className="bg-white p-7 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group animate-in slide-in-from-right duration-500">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${bPerc > 100 ? 'bg-rose-50 text-rose-500' : 'bg-indigo-50 text-indigo-500'}`}>
                        <TrendingUp size={24} />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 text-lg tracking-tight">{b.category}</h4>
                        <div className="flex items-center space-x-2 mt-0.5">
                           <span className={`text-[10px] font-black uppercase tracking-wider ${bPerc > 100 ? 'text-rose-500' : 'text-slate-400'}`}>
                            {bPerc > 100 ? 'System Breach!' : `Available: ₹${(b.limit_amount - b.spent_amount).toLocaleString('en-IN')}`}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <span className="text-lg font-black text-slate-900">
                          ₹{b.spent_amount.toLocaleString('en-IN')}
                        </span>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Limit: ₹{b.limit_amount.toLocaleString('en-IN')}</p>
                      </div>
                      <button 
                        onClick={() => handleDelete(b.id)}
                        disabled={isDeleting === b.id}
                        className="p-3 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                      >
                        {isDeleting === b.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={18} />}
                      </button>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-100">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${bPerc > 100 ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]' : 'bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.3)]'}`}
                      style={{ width: `${Math.min(bPerc, 100)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl animate-in zoom-in duration-300 overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-indigo-600 text-white rounded-2xl">
                  <Plus size={24} />
                </div>
                <div>
                   <h3 className="font-black text-xl tracking-tight">Financial Objective</h3>
                   <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">New Goal Parameters</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors"><X size={32} strokeWidth={1.5} /></button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">Target Month</label>
                  <select 
                    className="w-full px-5 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 bg-slate-50/30 transition-all font-bold"
                    value={newBudget.month}
                    onChange={(e) => setNewBudget({...newBudget, month: parseInt(e.target.value)})}
                  >
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                      <option key={m} value={m}>{getMonthName(m)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">Target Year</label>
                  <select 
                    className="w-full px-5 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 bg-slate-50/30 transition-all font-bold"
                    value={newBudget.year}
                    onChange={(e) => setNewBudget({...newBudget, year: parseInt(e.target.value)})}
                  >
                    {[2023, 2024, 2025, 2026].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">Classification</label>
                <select 
                  className="w-full px-5 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 bg-slate-50/30 transition-all font-bold"
                  value={newBudget.category}
                  onChange={(e) => setNewBudget({...newBudget, category: e.target.value})}
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">Ceiling Amount (₹)</label>
                <input 
                  type="number" step="1" required
                  placeholder="e.g. 10000"
                  className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 bg-slate-50/30 outline-none transition-all font-black text-lg"
                  value={newBudget.limit}
                  onChange={(e) => setNewBudget({...newBudget, limit: e.target.value})}
                />
              </div>
              <button 
                type="submit" disabled={isSaving}
                className="w-full bg-slate-900 text-white py-5 rounded-[1.75rem] font-black uppercase tracking-widest flex items-center justify-center space-x-2 shadow-xl hover:bg-slate-800 transition-all active:scale-[0.98]"
              >
                {isSaving ? <Loader2 className="animate-spin" size={24} /> : <span>Confirm Strategy</span>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Budgets;