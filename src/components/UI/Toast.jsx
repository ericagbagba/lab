import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export const Toast = ({ message, type = 'success', onClose, duration = 4000 }) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const icons = {
    success: <CheckCircle className="h-5 w-5 text-emerald-500" />,
    error: <XCircle className="h-5 w-5 text-rose-500" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-500" />,
    info: <Info className="h-5 w-5 text-sky-500" />
  };

  const bgColors = {
    success: 'bg-emerald-50 border-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-300',
    error: 'bg-rose-50 border-rose-100 text-rose-800 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-300',
    warning: 'bg-amber-50 border-amber-100 text-amber-800 dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-300',
    info: 'bg-sky-50 border-sky-100 text-sky-800 dark:bg-sky-950/20 dark:border-sky-900/30 dark:text-sky-300'
  };

  return (
    <div className="fixed bottom-20 right-4 z-50 max-w-sm rounded-xl border p-4 shadow-lg animate-slide-up backdrop-blur-md flex items-start space-x-3 transition-all duration-300 bg-white dark:bg-slate-900">
      <div className={`flex items-center justify-center rounded-lg p-1.5 ${bgColors[type]}`}>
        {icons[type]}
      </div>
      <div className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-100">
        {message}
      </div>
      <button
        onClick={onClose}
        className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default Toast;
