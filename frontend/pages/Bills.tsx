import React, { useState, useEffect } from 'react';
import { Calendar, Bell, ShieldCheck, ArrowUpRight, CreditCard, Plus, Loader2, X, Trash2, AlertTriangle, CheckCircle, Edit2, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../api';
import { Bill, BillStatus } from '../types';
import { useToast } from '../App';

const Bills: React.FC = () => {
  const { showToast } = useToast();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [currentView, setCurrentView] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  const [formData, setFormData] = useState({
    biller_name: '',
    amount_due: '',
    due_date: '',
    category: 'Utility',
    auto_pay: false
  });

  // Set default date when modal opens based on current view
  useEffect(() => {
    if (isModalOpen && !editingId) {
      const defaultDate = new Date(currentView.year, currentView.month - 1, 15);
      setFormData(prev => ({
        ...prev,
        due_date: defaultDate.toISOString().split('T')[0]
      }));
    }
  }, [isModalOpen, currentView, editingId]);

  const fetchBills = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/bills?month=${currentView.month}&year=${currentView.year}`);
      setBills(data || []);
    } catch (err: any) {
      showToast("Sync failed: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, [currentView]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const payload = {
        ...formData,
        amount_due: parseFloat(formData.amount_due),
        due_date: new Date(formData.due_date).toISOString()
      };

      if (editingId) {
        await api.put(`/bills/${editingId}`, payload);
        showToast("Bill updated successfully", "success");
      } else {
        await api.post('/bills', payload);
        showToast(`Bill scheduled for ${formData.biller_name}`, "success");
      }
      
      closeModal();
      fetchBills();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const openEdit = (bill: Bill) => {
    setEditingId(bill.id);
    setFormData({
      biller_name: bill.biller_name,
      amount_due: bill.amount_due.toString(),
      due_date: new Date(bill.due_date).toISOString().split('T')[0],
      category: bill.category || 'Utility',
      auto_pay: bill.auto_pay
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ biller_name: '', amount_due: '', due_date: '', category: 'Utility', auto_pay: false });
  };

  const handlePay = async (billId: number) => {
    try {
      showToast("Processing payment...", "info");
      await api.post(`/bills/${billId}/pay`, {});
      showToast("Payment confirmed and recorded", "success");
      fetchBills();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleDelete = async (billId: number) => {
    if (!window.confirm("Remove this bill record?")) return;
    try {
      await api.delete(`/bills/${billId}`);
      showToast("Bill record removed", "info");
      fetchBills();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const changeMonth = (offset: number) => {
    let nextMonth = currentView.month + offset;
    let nextYear = currentView.year;
    if (nextMonth > 12) { nextMonth = 1; nextYear++; }
    if (nextMonth < 1) { nextMonth = 12; nextYear--; }
    setCurrentView({ month: nextMonth, year: nextYear });
  };

  const getDaysUntil = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dateStr);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const upcomingAmount = bills
    .filter(b => b.status === 'upcoming')
    .reduce((sum, b) => sum + b.amount_due, 0);

  const upcomingCount = bills.filter(b => b.status === 'upcoming').length;
  const overdueCount = bills.filter(b => b.status === 'overdue').length;

  const monthName = new Date(currentView.year, currentView.month - 1).toLocaleString('en-IN', { month: 'long' });

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Bills & Utilities</h2>
          <p className="text-slate-500">Scheduled obligations for {monthName} {currentView.year}</p>
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
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-100 flex items-center space-x-2 active:scale-95"
          >
            <Plus size={18} />
            <span>New Bill</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-indigo-600 p-7 rounded-[2.5rem] text-white shadow-xl shadow-indigo-100 relative overflow-hidden animate-in slide-in-from-left duration-500">
          <div className="relative z-10">
            <p className="text-indigo-200 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Total Pending</p>
            <h3 className="text-4xl font-black mb-6 tracking-tighter">₹{upcomingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
            <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest bg-white/20 px-4 py-2 rounded-full w-fit">
              <Calendar size={14} />
              <span>{upcomingCount} Bills Enroute</span>
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 text-white/10 opacity-20">
            <CreditCard size={140} />
          </div>
        </div>

        <div className={`p-7 rounded-[2.5rem] border border-slate-200 flex flex-col justify-center animate-in zoom-in-95 duration-500 shadow-sm transition-all ${overdueCount > 0 ? 'bg-rose-50 border-rose-200' : 'bg-white'}`}>
          <div className={`flex items-center space-x-3 mb-2 ${overdueCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
            <AlertTriangle size={20} className={overdueCount > 0 ? 'animate-pulse' : ''} />
            <span className="font-black uppercase text-[10px] tracking-[0.2em]">Overdue Counter</span>
          </div>
          <p className={`text-2xl font-black ${overdueCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {overdueCount} Priority Alerts
          </p>
          <p className="text-slate-400 text-[10px] font-black uppercase mt-1 tracking-widest">Immediate action required</p>
        </div>

        <div className="bg-white p-7 rounded-[2.5rem] border border-slate-200 flex flex-col justify-center animate-in zoom-in-95 duration-500 shadow-sm">
          <div className="flex items-center space-x-3 text-emerald-600 mb-2">
            <ShieldCheck size={20} />
            <span className="font-black uppercase text-[10px] tracking-[0.2em]">Scheduler Status</span>
          </div>
          <p className="text-2xl font-black text-slate-900">
            {bills.filter(b => b.auto_pay).length} Auto-cleared
          </p>
          <p className="text-slate-400 text-[10px] font-black uppercase mt-1 tracking-widest">Hands-free management</p>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-bottom duration-700">
        <div className="p-8 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center">
          <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400">Payment Order: Priority High to Low</h3>
          <div className="flex space-x-4 text-[10px] font-black uppercase tracking-widest">
            <span className="text-rose-500">● OVERDUE</span>
            <span className="text-amber-500">● UPCOMING</span>
            <span className="text-emerald-500">● PAID</span>
          </div>
        </div>
        
        {loading ? (
          <div className="p-24 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Fetching Ledger...</p>
          </div>
        ) : bills.length === 0 ? (
          <div className="p-24 text-center flex flex-col items-center opacity-60">
            <div className="bg-slate-100 p-8 rounded-[2.5rem] mb-6">
              <Calendar className="text-slate-300" size={64} strokeWidth={1} />
            </div>
            <p className="text-slate-900 font-black text-xl tracking-tight">No obligations for {monthName}.</p>
            <p className="text-slate-400 text-sm font-bold mt-2">Historical data or future schedules will appear here.</p>
            <button onClick={() => setIsModalOpen(true)} className="mt-8 text-indigo-600 font-black text-sm hover:underline uppercase tracking-widest">Schedule New +</button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {bills.map((bill) => {
              const daysLeft = getDaysUntil(bill.due_date);
              const isOverdue = bill.status === 'overdue';
              
              return (
                <div key={bill.id} className={`flex items-center justify-between p-8 hover:bg-slate-50/80 transition-all group ${isOverdue ? 'bg-rose-50/30' : ''} animate-in fade-in duration-300`}>
                  <div className="flex items-center space-x-6">
                    <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-all group-hover:scale-105 group-hover:rotate-3 shadow-sm ${
                      bill.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 
                      isOverdue ? 'bg-rose-50 text-rose-600 animate-pulse border border-rose-100' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {bill.status === 'paid' ? <CheckCircle size={32} strokeWidth={1.5} /> : isOverdue ? <AlertTriangle size={32} strokeWidth={1.5} /> : <ArrowUpRight size={32} strokeWidth={1.5} />}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 flex items-center space-x-3 text-xl tracking-tight">
                        <span>{bill.biller_name}</span>
                        {bill.auto_pay && (
                          <span title="Auto-pay active">
                            <ShieldCheck size={18} className="text-indigo-500 fill-indigo-50" />
                          </span>
                        )}
                      </h4>
                      <div className="flex items-center space-x-4 mt-2">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg ${isOverdue ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'}`}>
                          {bill.category}
                        </span>
                        <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-500">
                          <Clock size={14} className="text-slate-300" />
                          <span>{new Date(bill.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          {bill.status === 'upcoming' && (
                            <span className={`ml-2 font-black ${daysLeft <= 3 ? 'text-amber-500' : 'text-slate-400'}`}>
                              ({daysLeft === 0 ? 'DUE TODAY' : `${daysLeft}D REMAINING`})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-10">
                    <div className="text-right">
                      <p className="font-black text-slate-900 text-2xl tracking-tighter">₹{bill.amount_due.toLocaleString('en-IN')}</p>
                      <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-3.5 py-1.5 rounded-full border ${
                        bill.status === 'overdue' ? 'bg-rose-600 text-white border-rose-600 shadow-lg shadow-rose-100' : 
                        bill.status === 'paid' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {bill.status}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {bill.status !== 'paid' && (
                        <button 
                          onClick={() => handlePay(bill.id)}
                          className="bg-slate-900 hover:bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95"
                        >
                          Clear Payment
                        </button>
                      )}
                      <button 
                        onClick={() => openEdit(bill)}
                        className="p-3.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all"
                        title="Edit Record"
                      >
                        <Edit2 size={20} />
                      </button>
                      <button 
                        onClick={() => handleDelete(bill.id)}
                        className="p-3.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all"
                        title="Purge Record"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl animate-in zoom-in duration-300 overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100">
                  <Plus size={24} />
                </div>
                <div>
                   <h3 className="font-black text-xl tracking-tight">{editingId ? 'Modify Ledger' : 'New Obligation'}</h3>
                   <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Recurring Clearing</p>
                </div>
              </div>
              <button onClick={closeModal} className="text-slate-300 hover:text-slate-900 p-2 transition-colors"><X size={32} strokeWidth={1.5} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">Payee Entity</label>
                <input 
                  type="text" required placeholder="e.g. Jio Fiber, Tata Power"
                  className="w-full px-5 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 bg-slate-50/30 transition-all font-bold"
                  value={formData.biller_name}
                  onChange={e => setFormData({...formData, biller_name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">Invoice Value</label>
                  <input 
                    type="number" required step="0.01" placeholder="0.00"
                    className="w-full px-5 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 bg-slate-50/30 transition-all font-black text-lg"
                    value={formData.amount_due}
                    onChange={e => setFormData({...formData, amount_due: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">Account Class</label>
                  <select 
                    className="w-full px-5 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 bg-slate-50/30 transition-all font-bold"
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                  >
                    <option>Utility</option>
                    <option>Insurance</option>
                    <option>Entertainment</option>
                    <option>Rent</option>
                    <option>Credit Card</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">Deadline Date</label>
                <input 
                  type="date" required
                  className="w-full px-5 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 bg-slate-50/30 transition-all font-bold"
                  value={formData.due_date}
                  onChange={e => setFormData({...formData, due_date: e.target.value})}
                />
              </div>
              
              <div className="p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100">
                <label className="flex items-center space-x-4 cursor-pointer">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      className="peer sr-only"
                      checked={formData.auto_pay}
                      onChange={e => setFormData({...formData, auto_pay: e.target.checked})}
                    />
                    <div className="w-12 h-7 bg-slate-200 rounded-full peer peer-checked:bg-indigo-600 transition-all after:content-[''] after:absolute after:top-1 after:left-[4px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5"></div>
                  </div>
                  <div>
                     <p className="text-xs font-black text-slate-900 uppercase tracking-widest">Auto-pay Engine</p>
                     <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Enable automated clearing</p>
                  </div>
                </label>
              </div>
              
              <button 
                type="submit" disabled={isProcessing}
                className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest flex items-center justify-center space-x-3 shadow-xl hover:bg-black transition-all active:scale-[0.98] mt-4"
              >
                {isProcessing ? <Loader2 className="animate-spin" size={24} /> : (
                  <>
                    <ShieldCheck size={20} />
                    <span>{editingId ? 'Commit Changes' : 'Post Schedule'}</span>
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

export default Bills;