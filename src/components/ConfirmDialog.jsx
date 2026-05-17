import React, { useEffect } from 'react';

const ConfirmDialog = ({ isOpen, title, message, confirmText = 'Xác nhận', cancelText = 'Hủy', tone = 'danger', onConfirm, onCancel }) => {
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onCancel?.();
      if (event.key === 'Enter') onConfirm?.();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onCancel, onConfirm]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay confirm-overlay" onClick={onCancel}>
      <div className="modal-box sm confirm-box" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <div className={`confirm-mark ${tone}`} aria-hidden="true">{tone === 'danger' ? '!' : '?'}</div>
        <div className="confirm-title" id="confirm-title">{title}</div>
        <div className="confirm-message">{message}</div>
        <div className="confirm-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>{cancelText}</button>
          <button type="button" className={`btn btn-sm ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
