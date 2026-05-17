import React, { useState, useEffect } from 'react';

const EyeIcon = ({ visible }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    {visible
      ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
      : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
    }
  </svg>
);

const PasswordField = ({ label, value, onChange, visible, onToggle, placeholder, autoFocus, onKeyDown }) => (
  <div className="form-group">
    <label className="form-label">{label}</label>
    <div className="password-input-wrap">
      <input
        className="form-input"
        type={visible ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoFocus={autoFocus}
        onKeyDown={onKeyDown}
        autoComplete="new-password" 
        style={{ paddingRight: 46 }}
      />
      <button type="button" className="pwd-eye-btn" aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onClick={onToggle}>
        <EyeIcon visible={visible} />
      </button>
    </div>
  </div>
);

const PasswordSetupDialog = ({ isOpen, onClose, onSave, hasPassword, backendError }) => {
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showOldPwd, setShowOldPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (backendError) setError(backendError);
  }, [backendError]);

  useEffect(() => {
    if (isOpen) {
      setOldPwd(''); setNewPwd(''); setConfirmPwd(''); setError('');
      setShowOldPwd(false); setShowNewPwd(false); setShowConfirmPwd(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const title = hasPassword ? '🔐 Quản lý bảo mật' : '🔐 Cài đặt mật khẩu';

  const handleSave = () => {
    setError('');
    if (hasPassword && !oldPwd) return setError('Vui lòng nhập mật khẩu hiện tại!');
    if (!newPwd) return setError('Vui lòng nhập mật khẩu mới!');
    if (newPwd.length < 4) return setError('Mật khẩu phải có ít nhất 4 ký tự!');
    if (newPwd !== confirmPwd) return setError('Mật khẩu xác nhận không khớp!');
    onSave(newPwd, oldPwd);
  };

  const handleRemove = () => {
    setError('');
    if (!oldPwd) return setError('Vui lòng nhập mật khẩu hiện tại để gỡ bảo mật!');
    
    onSave('', oldPwd); 
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box md" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {hasPassword && (
            <div style={{ padding: '10px 14px', background: '#e0f2fe', borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#0369a1', lineHeight: 1.5 }}>
              💡 Ghi chú này đang được khóa. Bạn có thể nhập mật khẩu mới để đổi, hoặc nhập mật khẩu cũ rồi bấm <b>"Gỡ bảo mật"</b>.
            </div>
          )}

          {hasPassword && (
            <PasswordField
              label="Mật khẩu hiện tại"
              value={oldPwd}
              onChange={e => setOldPwd(e.target.value)}
              visible={showOldPwd}
              onToggle={() => setShowOldPwd(v => !v)}
              placeholder="••••••••"
              autoFocus
            />
          )}

          <PasswordField
            label={hasPassword ? "Mật khẩu mới (Nếu muốn đổi)" : "Mật khẩu mới"}
            value={newPwd}
            onChange={e => setNewPwd(e.target.value)}
            visible={showNewPwd}
            onToggle={() => setShowNewPwd(v => !v)}
            placeholder="Tối thiểu 4 ký tự"
            autoFocus={!hasPassword}
          />

          <PasswordField
            label="Xác nhận mật khẩu mới"
            value={confirmPwd}
            onChange={e => setConfirmPwd(e.target.value)}
            visible={showConfirmPwd}
            onToggle={() => setShowConfirmPwd(v => !v)}
            placeholder="Nhập lại mật khẩu mới"
            onKeyDown={e => e.key === 'Enter' && handleSave()}
          />

          {error && <div style={{ padding: '8px 12px', background: '#fee2e2', borderRadius: 8, fontSize: 13, color: '#ef4444', fontWeight: 600, marginTop: 10 }}>⚠️ {error}</div>}
        </div>
        
        <div className="modal-footer" style={{ display: 'flex', justifyContent: hasPassword ? 'space-between' : 'flex-end' }}>
          {hasPassword ? (
            <button className="btn btn-danger btn-sm" onClick={handleRemove}>🗑️ Gỡ bảo mật</button>
          ) : <div></div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={onClose}>Hủy</button>
            <button className="btn btn-primary btn-sm" onClick={handleSave}>💾 Lưu</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordSetupDialog;