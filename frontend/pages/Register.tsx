import React, { useState } from 'react';
// Fixed: Split imports to resolve "no exported member" errors in frontend sub-app
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router';
import { Wallet, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import { api } from '../api';
import { useToast } from '../App';

const Register: React.FC = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/register', formData);
      showToast("Access granted. Please sign in.", "success");
      navigate('/login');
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="bg-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-xl">
            <Wallet size={32} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Onboarding</h1>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-2">New Operator Registration</p>
        </div>
        
        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input required type="text" placeholder="John Doe" className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-indigo-600 font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Email ID</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input required type="email" placeholder="name@nexus.pro" className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-indigo-600 font-bold" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Secret Key</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input required type="password" placeholder="••••••••" className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-indigo-600 font-bold" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black flex items-center justify-center space-x-3 shadow-lg">
              {loading ? <Loader2 className="animate-spin" /> : <><span>REQUEST ACCESS</span><ArrowRight size={20} /></>}
            </button>
          </form>
          <div className="mt-8 pt-8 border-t text-center">
            <p className="text-slate-400 text-xs font-bold">Already registered? <Link to="/login" className="text-indigo-600">Sign In</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;