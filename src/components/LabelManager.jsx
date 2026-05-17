import React, { useState } from 'react';

const LabelManager = ({ labels, onAddLabel, onDeleteLabel, onEditLabel, onSelectLabel, activeLabel, onNotify, onRequestDelete }) => {
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');

  const handleAdd = () => {
    const t = newName.trim();
    if (!t) return;
    if (labels.some(l => l.name.toLowerCase() === t.toLowerCase())) {
      onNotify?.({ type: 'warning', title: 'Nhãn đã tồn tại', message: 'Vui lòng chọn tên nhãn khác.' }); return;
    }
    onAddLabel(t); setNewName('');
  };

  const saveEdit = (id) => {
    const t = editName.trim();
    if (!t) { setEditId(null); return; }
    if (labels.some(l => l.name.toLowerCase() === t.toLowerCase() && l.id !== id)) {
      onNotify?.({ type: 'warning', title: 'Tên nhãn đã tồn tại', message: 'Vui lòng chọn tên nhãn khác.' }); return;
    }
    onEditLabel(id, t); setEditId(null);
  };

  const TagIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.63 5.84C17.27 5.33 16.67 5 16 5L5 5.01C3.9 5.01 3 5.9 3 7v10c0 1.1.9 1.99 2 1.99L16 19c.67 0 1.27-.33 1.63-.84L22 12l-4.37-6.16z"/>
    </svg>
  );

  return (
    <>
      <div className="sidebar-divider" />
      <div className="sidebar-section-title">🏷️ Nhãn</div>

      <div className="sidebar-label-input">
        <input
          placeholder="Thêm nhãn mới..."
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button onClick={handleAdd} title="Thêm nhãn">+</button>
      </div>

      {labels.map(l => (
        <div
          key={l.id}
          className={`sidebar-item ${activeLabel?.id === l.id ? 'active' : ''}`}
          onClick={() => onSelectLabel(activeLabel?.id === l.id ? null : l)}
          style={{ paddingRight: 8 }}
        >
          <span className="item-icon"><TagIcon /></span>

          {editId === l.id ? (
            <input
              style={{ flex: 1, border: 'none', background: 'transparent', color: 'var(--text)', fontFamily: 'inherit', fontSize: 14, outline: 'none' }}
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onClick={e => e.stopPropagation()}
              onBlur={() => saveEdit(l.id)}
              onKeyDown={e => { if (e.key === 'Enter') saveEdit(l.id); if (e.key === 'Escape') setEditId(null); }}
              autoFocus
            />
          ) : (
            <span className="item-label" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {l.name}
            </span>
          )}

          <div style={{ display: 'flex', gap: 2 }} onClick={e => e.stopPropagation()}>
            <button
              title="Sửa nhãn"
              onClick={e => { e.stopPropagation(); setEditId(l.id); setEditName(l.name); }}
              style={{ width: 24, height: 24, border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, transition: 'all 0.2s' }}
              onMouseEnter={e => e.target.style.background = 'var(--primary-light)'}
              onMouseLeave={e => e.target.style.background = 'transparent'}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
            </button>
            <button
              title="Xóa nhãn"
              onClick={e => { e.stopPropagation(); onRequestDelete ? onRequestDelete(l) : onDeleteLabel(l.id); }}
              style={{ width: 24, height: 24, border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            </button>
          </div>
        </div>
      ))}
    </>
  );
};

export default LabelManager;
