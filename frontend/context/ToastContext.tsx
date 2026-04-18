
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const getToastIcon = (type: ToastType) => {
    switch(type) {
      case 'success': return <CheckCircle size={18} className="text-emerald-500" />;
      case 'error': return <AlertCircle size={18} className="text-rose-500" />;
      case 'warning': return <AlertTriangle size={18} className="text-amber-500" />;
      default: return <Info size={18} className="text-blue-500" />;
    }
  };

  const getToastClass = (type: ToastType) => {
    switch(type) {
      case 'success': return 'bg-emerald-50 border-emerald-100 text-emerald-900';
      case 'error': return 'bg-rose-50 border-rose-100 text-rose-900';
      case 'warning': return 'bg-amber-50 border-amber-100 text-amber-900';
      default: return 'bg-blue-50 border-blue-100 text-blue-900';
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Container */}
      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none w-full max-w-xs md:max-w-sm">
        {toasts.map(toast => (
          <div 
            key={toast.id}
            className={`pointer-events-auto flex items-center space-x-3 px-5 py-4 rounded-2xl border shadow-xl animate-in slide-in-from-right fade-in duration-300 ${getToastClass(toast.type)}`}
          >
            <div className="shrink-0">{getToastIcon(toast.type)}</div>
            <p className="text-sm font-bold flex-1">{toast.message}</p>
            <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
