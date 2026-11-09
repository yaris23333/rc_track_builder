import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Icon } from './Icons';

export function Toast() {
  const toast = useStore((state) => state.toast);
  const clearToast = useStore((state) => state.clearToast);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(clearToast, toast.tone === 'error' ? 4200 : 2800);
    return () => window.clearTimeout(timer);
  }, [toast, clearToast]);

  if (!toast) return null;

  return (
    <div className={`toast toast-${toast.tone}`} key={toast.id} role="status">
      <Icon
        name={toast.tone === 'success' ? 'check' : toast.tone === 'error' ? 'alert' : 'info'}
        size={16}
      />
      <span>{toast.message}</span>
    </div>
  );
}
