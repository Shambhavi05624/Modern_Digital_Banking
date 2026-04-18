
import React, { useState, useEffect } from 'react';
import { 
  Plus, Landmark, Trash2, Edit2, Loader2, RefreshCw, X, 
  CreditCard, Briefcase, Coins, ShieldCheck, AlertCircle 
} from 'lucide-react';
import { Account, AccountType } from '../types';
import { api } from '../api';
import { useToast } from '../App';

const Accounts: React.FC = () => {
  const { showToast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    bank_name: '',
    account_type: AccountType.CHECKING,
    masked_account: '',
    currency: 'INR',
    balance: '0'
  });

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const data = await api.get('/accounts');
      setAccounts(Array.isArray(data) ? data : []);
    } catch (err: any) {
      showToast(err.message || "Failed to sync assets", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAccounts(); }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case AccountType.CHECKING: return <Landmark className="text-blue-600" size={24} />;
      case AccountType.SAVINGS: return <Briefcase className="text-emerald-600" size={24} />;
      case AccountType.CREDIT_CARD: return <CreditCard className="text-rose-600" size={24} />;
      case AccountType.INVESTMENT: return <Coins className="text-amber-600" size={24} />;
      default: return <Landmark className="text-indigo-600" size={24} />;
    }
  };

  const resetForm = () => {
    setFormData({
      bank_name: '',
      account_type: AccountType.CHECKING,
      masked_account: '',
      currency: 'INR',
      balance: '0'
    });
    setEditingId(null);
  };

  const handleOpenModal = (acc?: Account) => {
    if (acc) {
      setEditingId(acc.id);
      setFormData({
        bank_name: acc.bank_name || '',
        account_type: acc.account_type || AccountType.CHECKING,
        masked_account: (acc.masked_account || '').replace('**** ', ''),
        currency: acc.currency || 'INR',
        balance: (acc.balance || 0).toString()
      });
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.bank_name || !formData.masked_account) {
      showToast("Required fields missing", "warning");
      return;
    }

    setIsProcessing(true);
    try {
      const payload = {
        bank_name: formData.bank_name,
        account_type: formData.account_type,
        currency: formData.currency,
        balance: parseFloat(formData.balance) || 0,
        masked_account: `**** ${formData.masked_account.slice(-4).padStart(4, '0')}`
      };

      if (editingId) {
        await api.put(`/accounts/${editingId}`, payload);
        showToast("Asset node updated", "success");
      } else {
        await api.post('/accounts', payload);
        showToast("New asset node connected", "success");
      }
      
      setIsModalOpen(false);
      fetchAccounts();
    } catch (err: any) {
      showToast(err.message || "Operation failed", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Disconnect this financial node?")) return;
    setIsDeleting(id);
    try {
      await api.delete(`/accounts/${id}`);
      showToast("Node successfully purged", "info");
      fetchAccounts();
    } catch (err: any) {
      showToast(err.message || "Deletion failed", "error");
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Financial Nodes</h2>
          <p className="text-slate-500 font-medium">Manage institutional asset corridors.</p>
        </div>
        <div className="flex items-center space-x-3">
           <button onClick={fetchAccounts} disabled={loading} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 transition-all shadow-sm active:scale-95">
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => handleOpenModal()} className="bg-indigo-600 text-white px-6 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-indigo-700 transition-all flex items-center space-x-2 active:scale-95">
            <Plus size={18} />
            <span>Link Asset Node</span>
          </button>
        </div>
      </div>

      {loading && accounts.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           {[1,2,3].map((i: number) => (
             <div key={i} className="bg-white h-64 rounded-[2.5rem] border border-slate-100 shadow-sm animate-pulse p-8">
                <div className="w-14 h-14 bg-slate-50 rounded-2xl mb-8" />
                <div className="w-1/2 h-6 bg-slate-50 rounded-lg mb-4" />
             </div>
           ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="bg-white p-24 rounded-[3rem] border-2 border-dashed border-slate-200 text-center flex flex-col items-center">
           <div className="bg-slate-50 p-8 rounded-full mb-6"><Landmark className="text-slate-200" size={48} /></div>
           <h3 className="text-xl font-black text-slate-900 uppercase">No Active Nodes</h3>
           <p className="text-slate-500 text-sm mt-2">Initialize your portfolio by linking a bank node.</p>
           <button onClick={() => handleOpenModal()} className="mt-8 text-indigo-600 font-black text-[10px] uppercase tracking-widest hover:underline">+ Register First Account</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {accounts.map((acc: Account) => (
            <div key={acc.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm group hover:border-indigo-200 transition-all hover:shadow-xl hover:-translate-y-1 relative overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-start mb-10">
                 <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-indigo-50 transition-colors border border-slate-50">{getIcon(acc.account_type || '')}</div>
                 <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => handleOpenModal(acc)} className="p-2.5 text-slate-300 hover:text-indigo-600 transition-all"><Edit2 size={18} /></button>
                    <button onClick={() => handleDelete(acc.id)} disabled={isDeleting === acc.id} className="p-2.5 text-slate-300 hover:text-rose-600 transition-all">{isDeleting === acc.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}</button>
                 </div>
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-xl text-slate-900 truncate">{acc.bank_name || 'Unnamed Bank'}</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{acc.masked_account || '**** 0000'}</p>
              </div>
              <div className="mt-8 pt-8 border-t border-slate-50 flex justify-between items-end">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Liquidity Pool</p>
                  <p className="text-3xl font-black text-slate-900 tracking-tighter">₹{(acc.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="text-[9px] font-black uppercase bg-slate-100 px-3 py-1.5 rounded-xl text-slate-500">{ (acc.account_type || '').replace('_', ' ') }</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden border border-white/40">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
               <div><h3 className="font-black text-xl text-slate-900">{editingId ? 'Modify Registry' : 'Link Node'}</h3></div>
               <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-slate-900 p-2"><X size={28} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <input required type="text" placeholder="Bank Name" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" value={formData.bank_name} onChange={e => setFormData({...formData, bank_name: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <select className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-black text-[11px] uppercase" value={formData.account_type} onChange={e => setFormData({...formData, account_type: e.target.value as AccountType})}>
                  {Object.values(AccountType).map((t: string) => (<option key={t} value={t}>{t.replace('_', ' ')}</option>))}
                </select>
                <input required type="text" maxLength={4} placeholder="Last 4 Digits" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-black text-center" value={formData.masked_account} onChange={e => setFormData({...formData, masked_account: e.target.value.replace(/\D/g, '')})} />
              </div>
              <input required type="number" step="0.01" placeholder="Initial Balance" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-black text-xl" value={formData.balance} onChange={e => setFormData({...formData, balance: e.target.value})} />
              <button type="submit" disabled={isProcessing} className="w-full bg-[#0f172a] text-white py-5 rounded-[1.75rem] font-black uppercase tracking-widest text-[11px] shadow-2xl hover:bg-black transition-all">
                {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <span>{editingId ? 'Update Node' : 'Initialize Connection'}</span>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Accounts;
