import React, { useState } from 'react';

const ShareDialog = ({ isOpen, onClose, sharedWith = [], onAddShare, onRevokeShare, onChangePermission }) => {
  const [emailInput, setEmailInput] = useState('');
  const [permission, setPermission] = useState('read-only');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const validateEmail = (e) => /\S+@\S+\.\S+/.test(e.trim());

  const parseEmails = (raw) =>
    raw.split(/[\s,;]+/).map(e => e.trim()).filter(e => e.length > 0);

  const handleShare = () => {
    setError('');
    const emails = parseEmails(emailInput);
    if (emails.length === 0) { setError('Vui lòng nhập ít nhất một email!'); return; }
    const invalid = emails.filter(e => !validateEmail(e));
    if (invalid.length > 0) { setError(`Email không hợp lệ: ${invalid.join(', ')}`); return; }
    const already = emails.filter(e => sharedWith.some(u => u.email === e));
    if (already.length > 0) { setError(`Email đã được mời: ${already.join(', ')}`); return; }
    const list = emails.map(email => ({ email, permission, sharedAt: Date.now() }));
    onAddShare(list);
    setEmailInput('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--primary)' }}>
              <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
            </svg>
            Chia sẻ ghi chú
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {/* Multi-email input */}
          <div className="form-group">
            <label className="form-label">
              Thêm người cộng tác
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>
                (phân cách bằng dấu phẩy, dấu chấm phẩy hoặc Enter)
              </span>
            </label>
            <textarea
              className="form-input"
              placeholder={"email1@example.com, email2@example.com\nhoặc nhập mỗi email một dòng"}
              value={emailInput}
              onChange={e => { setEmailInput(e.target.value); setError(''); }}
              rows={3}
              style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: 13 }}
              onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); handleShare(); } }}
              autoFocus
            />
            {error && <div style={{ marginTop: 6, fontSize: 12, color: '#ef4444', fontWeight: 500 }}>⚠️ {error}</div>}
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
            <select
              className="form-select"
              value={permission}
              onChange={e => setPermission(e.target.value)}
              style={{ maxWidth: 160 }}
            >
              <option value="read-only">👁️ Chỉ xem</option>
              <option value="edit">✏️ Được chỉnh sửa</option>
            </select>
            <button className="btn btn-primary btn-sm" onClick={handleShare} style={{ flexShrink: 0 }}>
              Mời
            </button>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>hoặc Ctrl+Enter</span>
          </div>

          {sharedWith.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
              Chưa chia sẻ với ai
            </div>
          ) : (
            <div>
              <div className="form-label" style={{ marginBottom: 10 }}>
                Người có quyền truy cập ({sharedWith.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sharedWith.map((user, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', background: 'var(--bg)', borderRadius: 12,
                    border: '1px solid var(--border)'
                  }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: 'var(--primary)', flexShrink: 0 }}>
                      {user.email[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {user.sharedAt ? new Date(user.sharedAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>
                    </div>
                    <select
                      value={user.permission}
                      onChange={e => onChangePermission && onChangePermission(user.email, e.target.value)}
                      style={{ fontSize: 12, padding: '4px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-white)', color: user.permission === 'edit' ? '#059669' : 'var(--text-muted)', fontWeight: 600 }}
                    >
                      <option value="read-only">👁️ Chỉ xem</option>
                      <option value="edit">✏️ Được sửa</option>
                    </select>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => onRevokeShare(user.email)}
                      style={{ flexShrink: 0, padding: '5px 12px' }}
                    >Thu hồi</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
};

export default ShareDialog;
