
import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Upload, Loader2, Plus, X, Landmark, FileDown, 
  Trash2, Filter, ArrowUpRight, ArrowDownLeft, FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { Transaction, Account } from '../types';
import { api } from '../api';
import { useToast } from '../App';

const CATEGORIES = ["Food & Drink", "Entertainment", "Shopping", "Transport", "Utilities", "Income", "Others"];

const Transactions: React.FC = () => {
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    merchant: '',
    description: '',
    amount: '',
    txn_type: 'debit',
    category: 'Others',
    currency: 'INR',
    account_id: '',
    txn_date: new Date().toISOString().split('T')[0]
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [txData, accData] = await Promise.all([
        api.get('/transactions'),
        api.get('/accounts')
      ]);
      setTransactions(Array.isArray(txData) ? txData : []);
      setAccounts(Array.isArray(accData) ? accData : []);
    } catch (err: any) {
      showToast(err.message || "Failed to fetch ledger", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      showToast("Only CSV files are accepted", "warning");
      return;
    }

    setUploading(true);
    const data = new FormData();
    data.append('file', file);

    try {
      const res = await api.post('/transactions/upload', data, { isUpload: true });
      showToast(res.message || "Ledger successfully synchronized", "success");
      fetchData();
    } catch (err: any) {
      showToast(err.message || "CSV Import failed", "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.account_id) {
      showToast("Please select a source account", "warning");
      return;
    }

    setIsSaving(true);
    try {
      await api.post('/transactions', { 
        ...formData, 
        amount: parseFloat(formData.amount), 
        account_id: parseInt(formData.account_id),
        txn_date: new Date(formData.txn_date).toISOString()
      });
      showToast("Transaction successfully committed", "success");
      setIsModalOpen(false);
      setFormData({
        merchant: '',
        description: '',
        amount: '',
        txn_type: 'debit',
        category: 'Others',
        currency: 'INR',
        account_id: '',
        txn_date: new Date().toISOString().split('T')[0]
      });
      fetchData();
    } catch (err: any) {
      showToast(err.message || "Transaction failure", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Permanently purge this entry from the ledger?")) return;
    setIsDeleting(id);
    try {
      await api.delete(`/transactions/${id}`);
      showToast("Entry purged", "info");
      setTransactions(prev => prev.filter((t: Transaction) => t.id !== id));
    } catch (err: any) {
      showToast("Deletion failed", "error");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleExport = async () => {
    try {
      showToast("Generating CSV snapshot...", "info");
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/transactions/export/csv', { 
        headers: { 'Authorization': `Bearer ${token}` } 
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); 
      a.href = url; 
      a.download = `Nexus_Ledger_${new Date().toISOString().split('T')[0]}.csv`; 
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      showToast("Export engine failure", "error");
    }
  };

  const filtered = transactions.filter((tx: Transaction) => 
    tx.merchant.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-10">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Institutional Ledger</h2>
          <p className="text-slate-500 font-medium">Real-time monitoring of all capital movements.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".csv" />
          
          <button onClick={handleExport} className="px-5 py-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 font-black text-[10px] uppercase tracking-widest shadow-sm transition-all flex items-center space-x-2 active:scale-95">
            <FileDown size={16} />
            <span>Export CSV</span>
          </button>

          <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="px-5 py-3 bg-white border border-slate-200 rounded-2xl text-indigo-600 hover:bg-indigo-50 font-black text-[10px] uppercase tracking-widest shadow-sm transition-all flex items-center space-x-2 active:scale-95 disabled:opacity-50">
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            <span>{uploading ? 'Processing...' : 'Import CSV'}</span>
          </button>

          <button onClick={() => setIsModalOpen(true)} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center space-x-2 active:scale-95">
            <Plus size={16} />
            <span>Record Entry</span>
          </button>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b bg-slate-50/30 flex flex-col sm:flex-row items-center gap-4">
           <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 transition-all font-bold text-sm" 
                placeholder="Search ledger by entity or classification..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
              />
           </div>
           <div className="flex items-center space-x-2 px-4 py-2 bg-indigo-50 rounded-xl text-indigo-600 font-black text-[10px] uppercase tracking-widest border border-indigo-100">
             <Filter size={12} />
             <span>Active Scan: {filtered.length} Nodes</span>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] border-b border-slate-100">
                <th className="px-10 py-5">Entity / Correlation</th>
                <th className="px-10 py-5">Classification</th>
                <th className="px-10 py-5">Timestamp</th>
                <th className="px-10 py-5 text-right">Settlement Value</th>
                <th className="px-10 py-5 text-center">Protocol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-24 text-center">
                    <div className="flex flex-col items-center space-y-4">
                      <Loader2 className="animate-spin text-indigo-600" size={32} />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Synchronizing Ledger Data</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-24 text-center">
                    <div className="flex flex-col items-center opacity-40">
                      <FileSpreadsheet size={48} className="text-slate-300 mb-4" />
                      <p className="text-sm font-bold text-slate-500 uppercase">No matching audit records found</p>
                      <button onClick={() => setSearchTerm('')} className="text-indigo-600 text-xs font-black mt-2 hover:underline">RESET FILTERS</button>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((tx: Transaction) => (
                  <tr key={tx.id} className="group hover:bg-slate-50/80 transition-all duration-300">
                    <td className="px-10 py-6">
                      <div className="flex items-center space-x-4">
                         <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm border ${tx.txn_type === 'credit' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                            {tx.txn_type === 'credit' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                         </div>
                         <div className="overflow-hidden">
                            <p className="font-black text-slate-900 tracking-tight truncate max-w-[200px]">{tx.merchant}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 truncate">{tx.description || 'Institutional Clearing'}</p>
                         </div>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <span className="text-[9px] font-black uppercase bg-slate-100 px-3 py-1.5 rounded-lg text-slate-500 border border-slate-200">
                        {tx.category}
                      </span>
                    </td>
                    <td className="px-10 py-6">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-700">{new Date(tx.txn_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{new Date(tx.txn_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td className={`px-10 py-6 text-right font-black text-lg tracking-tighter ${tx.txn_type === 'credit' ? 'text-emerald-600' : 'text-slate-900'}`}>
                      {tx.txn_type === 'credit' ? '+' : '-'} ₹{Math.abs(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-10 py-6 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button 
                          onClick={() => handleDelete(tx.id)} 
                          disabled={isDeleting === tx.id}
                          className="p-2.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 active:scale-90"
                        >
                          {isDeleting === tx.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-xl shadow-[0_50px_100px_-20px_rgba(0,0,0,0.2)] animate-in zoom-in-95 duration-300 overflow-hidden border border-white/40">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
               <div>
                 <h3 className="font-black text-2xl text-slate-900 tracking-tight">Ledger Entry</h3>
                 <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Manual Audit Registration</p>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-slate-900 transition-colors p-2"><X size={32} strokeWidth={1.5} /></button>
            </div>
            
            <form onSubmit={handleManualSubmit} className="p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Entity / Payee</label>
                  <input required placeholder="Merchant Identifier" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 font-bold" value={formData.merchant} onChange={e => setFormData({...formData, merchant: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Capital Value</label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-400">₹</span>
                    <input required type="number" step="0.01" placeholder="0.00" className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 font-black text-xl" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Source Account</label>
                  <select required className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 font-bold" value={formData.account_id} onChange={e => setFormData({...formData, account_id: e.target.value})}>
                    <option value="">Select Financial Node</option>
                    {accounts.map((acc: Account) => (
                      <option key={acc.id} value={acc.id}>{acc.bank_name} ({acc.masked_account})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Classification</label>
                  <select className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 font-bold" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                    {CATEGORIES.map((c: string) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Posting Date</label>
                    <input type="date" required className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 font-bold" value={formData.txn_date} onChange={e => setFormData({...formData, txn_date: e.target.value})} />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Entry Protocol</label>
                    <div className="flex p-1 bg-slate-100 rounded-2xl">
                      <button type="button" onClick={() => setFormData({...formData, txn_type: 'debit'})} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${formData.txn_type === 'debit' ? 'bg-white shadow-sm text-rose-600' : 'text-slate-400'}`}>Debit</button>
                      <button type="button" onClick={() => setFormData({...formData, txn_type: 'credit'})} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${formData.txn_type === 'credit' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400'}`}>Credit</button>
                    </div>
                 </div>
              </div>

              <button type="submit" disabled={isSaving} className="w-full bg-[#0f172a] text-white py-6 rounded-[1.75rem] font-black uppercase tracking-widest text-[11px] shadow-2xl hover:bg-black transition-all active:scale-[0.98]">
                {isSaving ? <Loader2 className="animate-spin mx-auto" /> : 'Confirm Ledger Entry'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
