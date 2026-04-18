import React, { useState, useEffect } from 'react';
// Fixed: Explicitly import Link from react-router-dom
import { Link } from 'react-router-dom';
import { 
  Wallet, 
  Mail, 
  Lock, 
  ArrowRight, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw,
  Cpu,
  Fingerprint
} from 'lucide-react';
import { api } from '../api';
import { useToast } from '../App';

interface LoginProps {
  onLogin: (token: string, name: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [systemHealth, setSystemHealth] = useState<'checking' | 'healthy' | 'error'>('checking');

  const checkHealth = async () => {
    setSystemHealth('checking');
    try {
      await api.get('/health');
      setSystemHealth('healthy');
    } catch (err: any) {
      setSystemHealth('error');
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const data = await api.post('/auth/login', {
        username: formData.email,
        password: formData.password
      }, { isForm: true });
      
      if (data && data.access_token) {
        onLogin(data.access_token, data.user_name);
      }
    } catch (err: any) {
      setError(err.message);
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-[#FDFDFF] overflow-hidden p-4 font-sans">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-100/50 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-50/50 rounded-full blur-[120px]" />
      
      {/* SVG Grid Pattern */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: `radial-gradient(#4f46e5 0.5px, transparent 0.5px)`, backgroundSize: '24px 24px' }} />

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-10 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="inline-flex items-center justify-center relative">
            <div className="absolute inset-0 bg-indigo-600 blur-2xl opacity-20 animate-pulse" />
            <div className="bg-indigo-600 p-4 rounded-[1.75rem] shadow-[0_20px_50px_rgba(79,70,229,0.3)] relative border border-white/20">
              <Wallet className="text-white" size={36} strokeWidth={1.5} />
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">
              DigitalBank <span className="text-indigo-600">Pro</span>
            </h1>
            <p className="text-slate-400 font-semibold text-sm uppercase tracking-[0.2em]">Institutional Access</p>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-2xl p-10 rounded-[2.5rem] border border-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] animate-in zoom-in-95 duration-500">
          {error && (
            <div className="mb-8 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 text-sm flex items-start space-x-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <span className="font-bold leading-snug">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Terminal ID</label>
              <div className="relative group">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" size={18} />
                <input 
                  type="email" 
                  required
                  placeholder="name@nexus.com"
                  className="w-full pl-14 pr-6 py-4.5 bg-slate-50/50 border border-slate-100 rounded-[1.25rem] outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 focus:bg-white transition-all font-semibold text-slate-900 placeholder:text-slate-300"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center px-1">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Security Phrase</label>
                <a href="#" className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 transition-colors">FORGOT KEY?</a>
              </div>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" size={18} />
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  className="w-full pl-14 pr-6 py-4.5 bg-slate-50/50 border border-slate-100 rounded-[1.25rem] outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 focus:bg-white transition-all font-semibold text-slate-900 placeholder:text-slate-300"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading || systemHealth === 'error'}
              className="w-full relative group"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
              <div className="relative flex items-center justify-center space-x-3 bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-2xl font-black text-lg transition-all active:scale-[0.98] disabled:opacity-50">
                {isLoading ? (
                  <RefreshCw className="animate-spin" size={24} />
                ) : (
                  <>
                    <span>INITIALIZE ACCESS</span>
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </div>
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-slate-100">
            <div className="flex flex-col items-center space-y-6">
              <p className="text-slate-400 text-sm font-bold tracking-tight">
                New to the platform? {' '}
                <Link to="/register" className="text-indigo-600 hover:text-indigo-700 underline underline-offset-4 decoration-2">Request Onboarding</Link>
              </p>
              
              <div className="flex items-center space-x-6 opacity-30 grayscale hover:grayscale-0 transition-all">
                {/* Fixed: Wrapped icons in span elements with title attributes to avoid TypeScript error on Lucide icons while maintaining tooltips */}
                <span title="PCI-DSS Compliant"><ShieldCheck size={20} /></span>
                <span title="Biometric Ready"><Fingerprint size={20} /></span>
                <span title="Quantum Encryption"><Cpu size={20} /></span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <div className={`inline-flex items-center space-x-3 px-5 py-2 rounded-full border text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-500 shadow-sm ${
            systemHealth === 'healthy' ? 'bg-emerald-50 text-emerald-600 border-emerald-100/50' :
            systemHealth === 'error' ? 'bg-rose-50 text-rose-600 border-rose-100/50' :
            'bg-slate-50 text-slate-400 border-slate-100'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              systemHealth === 'healthy' ? 'bg-emerald-500 animate-pulse' :
              systemHealth === 'error' ? 'bg-rose-500' :
              'bg-slate-300 animate-pulse'
            }`} />
            <span>
              {systemHealth === 'checking' ? 'Connecting...' : 
               systemHealth === 'healthy' ? 'Core Securely Online' : 'Core Connection Failure'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;