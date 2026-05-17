import React, { useState, useEffect } from 'react';

const PasswordDialog = ({ isOpen, onClose, onSubmit, title, errorMsg }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => { if (isOpen) { setPassword(''); setShowPassword(false); } }, [isOpen]);

  const eyeIcon = (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      {showPassword
        ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
        : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
      }
    </svg>
  );

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <span style={{ fontSize: 20 }}>🔐</span>
            Xác thực bảo mật
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.5 }}>
            Nhập mật khẩu để truy cập ghi chú{' '}
            <strong style={{ color: 'var(--text)' }}>"{title || 'Bảo mật'}"</strong>
          </p>
          <div className="password-input-wrap">
            <input
              className="form-input"
              type={showPassword ? 'text' : 'password'}
              placeholder="Nhập mật khẩu..."
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onSubmit(password)}
              autoFocus
              style={{ textAlign: 'center', letterSpacing: showPassword ? 0 : 3, paddingRight: 46 }}
            />
            <button type="button" className="pwd-eye-btn" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onClick={() => setShowPassword(v => !v)}>
              {eyeIcon}
            </button>
          </div>
          {errorMsg && (
            <div style={{ marginTop: 10, padding: '8px 12px', background: '#fee2e2', borderRadius: 8, fontSize: 13, color: '#ef4444', fontWeight: 600 }}>
              ⚠️ {errorMsg}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Hủy</button>
          <button className="btn btn-primary btn-sm" onClick={() => onSubmit(password)}>🔓 Mở khóa</button>
        </div>
      </div>
    </div>
  );
};

export default PasswordDialog;
