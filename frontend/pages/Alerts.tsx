
import React, { useState, useEffect } from 'react';
import { 
  Bell, ShieldAlert, CheckCircle, AlertTriangle, AlertCircle, 
  Trash2, Filter, Loader2, RefreshCw, Clock, X, Info 
} from 'lucide-react';
import { api } from '../api';
import { useToast } from '../App';

interface ServerNotification {
  id: number;
  title: string;
  message: string;
  alert_type: 'low_balance' | 'bill_due' | 'budget_exceeded' | null;
  type: 'info' | 'warning' | 'critical';
  created_at: string;
  is_read: boolean;
}

const Alerts: React.FC = () => {
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState<ServerNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');

  const fetchData = async () => {
    try {
      const data = await api.get('/notifications');
      setNotifications(data || []);
    } catch (err) {
      console.error("Failed to fetch alerts", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleMarkRead = async (id: number) => {
    try {
      await api.post(`/notifications/${id}/read`, {});
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleReadAll = async () => {
    try {
      await api.post('/notifications/read-all', {});
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      showToast("Audit logs cleared", "success");
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const triggerSync = async () => {
    setSyncing(true);
    try {
      await api.post('/notifications/trigger-sync', {});
      showToast("Manual audit task triggered...", "info");
      setTimeout(fetchData, 2000);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSyncing(false);
    }
  };

  const getAlertIcon = (type: string, alertType: string | null) => {
    if (type === 'critical') return <AlertTriangle className="text-rose-600" size={24} />;
    if (type === 'warning') return <AlertCircle className="text-amber-600" size={24} />;
    return <Info className="text-indigo-600" size={24} />;
  };

  const filtered = notifications.filter(n => filter === 'all' || n.type === filter);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Financial Guard</h2>
          <p className="text-slate-500 font-medium">Infrastructure monitoring and anomaly detection logs.</p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={triggerSync} disabled={syncing} className="p-3.5 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 transition-all shadow-sm active:scale-95">
            <RefreshCw size={20} className={syncing ? 'animate-spin' : ''} />
          </button>
          <button onClick={handleReadAll} disabled={unreadCount === 0} className="bg-slate-900 text-white px-6 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-black transition-all active:scale-95 disabled:opacity-50">
            Acknowledge All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm">
             <h3 className="font-black text-[9px] uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center">
                <Filter size={14} className="mr-2" /> Categorical Filters
             </h3>
             <div className="space-y-1.5">
                {[
                  { id: 'all', label: 'Universal Feed', color: 'bg-indigo-600' },
                  { id: 'critical', label: 'Critical Risks', color: 'bg-rose-600' },
                  { id: 'warning', label: 'Advisory Alerts', color: 'bg-amber-600' },
                  { id: 'info', label: 'System Reports', color: 'bg-blue-600' }
                ].map(f => (
                  <button key={f.id} onClick={() => setFilter(f.id as any)} className={`w-full flex items-center justify-between p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${filter === f.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
                    <span>{f.label}</span>
                    {filter === f.id && <div className={`w-1.5 h-1.5 rounded-full ${f.color} animate-pulse`} />}
                  </button>
                ))}
             </div>
          </div>
          
          <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
             <ShieldAlert size={100} className="absolute -bottom-10 -right-10 text-white/10 opacity-10 rotate-12" />
             <h4 className="font-black text-lg mb-2 relative z-10">Real-time Watch</h4>
             <p className="text-xs text-indigo-100/80 leading-relaxed relative z-10">Core audit performs balance checks and budget surveillance every hour.</p>
          </div>
        </div>

        <div className="lg:col-span-9 space-y-4">
          {loading ? (
             <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-indigo-600" /></div>
          ) : filtered.length === 0 ? (
            <div className="bg-white p-24 rounded-[3rem] border-2 border-dashed border-slate-200 text-center flex flex-col items-center opacity-50">
               <CheckCircle size={48} className="text-emerald-500 mb-4" />
               <h3 className="text-xl font-black text-slate-900 uppercase">Perimeter Clear</h3>
               <p className="text-slate-400 text-xs font-bold mt-1">No active anomalies detected in current audit period.</p>
            </div>
          ) : (
            filtered.map(note => (
              <div key={note.id} className={`bg-white border rounded-[2rem] p-8 transition-all relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 ${note.is_read ? 'opacity-40 border-slate-100 grayscale hover:grayscale-0 hover:opacity-100' : 'border-slate-200 shadow-sm'}`}>
                <div className="flex items-start space-x-6">
                   <div className={`p-4 rounded-2xl shrink-0 ${note.type === 'critical' ? 'bg-rose-50' : note.type === 'warning' ? 'bg-amber-50' : 'bg-indigo-50'}`}>
                      {getAlertIcon(note.type, note.alert_type)}
                   </div>
                   <div>
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-black text-slate-900">{note.title}</h4>
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${note.type === 'critical' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                          {note.alert_type?.replace('_', ' ') || 'SYSTEM'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 font-medium max-w-2xl leading-relaxed">{note.message}</p>
                   </div>
                </div>

                <div className="flex flex-col items-end shrink-0 gap-3">
                   {!note.is_read && (
                     <button onClick={() => handleMarkRead(note.id)} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-black shadow-lg">
                        Acknowledge
                     </button>
                   )}
                   <span className="text-[9px] font-bold text-slate-300 uppercase">{new Date(note.created_at).toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Alerts;
