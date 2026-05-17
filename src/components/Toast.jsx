import React, { useEffect } from 'react';

const ICONS = {
  success: '✓',
  error: '!',
  warning: '!',
  info: 'i',
};

const Toast = ({ toast, onClose }) => {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(onClose, toast.duration || 3200);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const type = toast.type || 'info';
  return (
    <div className={`app-toast ${type}`} role="status" aria-live="polite">
      <div className="toast-icon" aria-hidden="true">{ICONS[type] || ICONS.info}</div>
      <div className="toast-content">
        {toast.title && <div className="toast-title">{toast.title}</div>}
        <div className="toast-message">{toast.message}</div>
      </div>
      <button type="button" className="toast-close" onClick={onClose} aria-label="Đóng thông báo">×</button>
    </div>
  );
};

export default Toast;
