import React, { useState } from 'react';
import { getReadableNoteVars } from '../utils/color';

const stripHtml = (html = '') => {
  if (!html) return '';
  return html
    .replace(/<\/?(div|p|h1|h2|h3|li|ul|ol)[^>]*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .split('\n')
    .map(line => line.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
    .trim();
};


const PinIcon = ({ slashed = false }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" fill="currentColor"/>
    {slashed && <path d="M4 4l16 16" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"/>}
  </svg>
);

const NoteList = ({ notes, isGridView, onEditNote, onDeleteClick, onTogglePin }) => {
  const pinned = notes.filter(n => n.isPinned);
  const others = notes.filter(n => !n.isPinned);

  if (notes.length === 0) return null;

  const formatEditTime = (ts) => {
    if (!ts) return null;
    const d = new Date(ts);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year}, ${hh}:${mm}`;
  };

  const NoteCard = ({ note }) => {
    const [hovered, setHovered] = useState(false);
    const ts = note.updatedAt || note.createdAt;
    const previewText = note.isPasswordProtected ? '' : stripHtml(note.contentHTML || note.content || '');

    const bgStyle = !note.isPasswordProtected && note.backgroundColor
      ? { backgroundColor: note.backgroundColor, ...getReadableNoteVars(note.backgroundColor) }
      : {};

    return (
      <div
        className={`note-card ${note.isPinned ? 'pinned' : ''}`}
        style={bgStyle}
        onClick={() => onEditNote(note)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {onTogglePin && hovered && (
          <button
            className={`note-hover-pin ${note.isPinned ? 'pinned' : ''}`}
            title={note.isPinned ? 'Bỏ ghim' : 'Ghim ghi chú'}
            onClick={e => { e.stopPropagation(); onTogglePin(note); }}
          >
            <PinIcon slashed={note.isPinned} />
          </button>
        )}

        {!hovered && (
          <div className="note-status-icons">
            {note.isPinned && <span className="status-badge" title="Đã ghim">📌</span>}
            {note.isPasswordProtected && <span className="status-badge" title="Bảo mật">🔒</span>}
            {note.isShared && (
              <span className="status-badge" title="Đã chia sẻ">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'currentColor' }}>
                  <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
                </svg>
              </span>
            )}
            {note.isOwner === false && (
              <span className="status-badge" title="Chia sẻ với bạn">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'currentColor' }}>
                  <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                </svg>
              </span>
            )}
          </div>
        )}

        <div className="note-card-body">
          {note.isPasswordProtected ? (
            <>
              {note.title && <div className="note-card-title">{note.title}</div>}
              <div className="note-locked-body">
                <div className="lock-icon">🔐</div>
                <div className="lock-text">Nội dung được bảo mật</div>
              </div>
            </>
          ) : (
            <>
              {note.images?.length > 0 && (
                <div className="note-card-img-strip note-card-img-top">
                  {note.images.slice(0, 3).map((img, i) => (
                    <img key={i} src={img} alt="" style={{ pointerEvents: 'none' }} />
                  ))}
                  {note.images.length > 3 && (
                    <div className="note-card-img-more">+{note.images.length - 3}</div>
                  )}
                </div>
              )}

              {note.title && <div className="note-card-title">{note.title}</div>}
              {previewText && (
                <div className={`note-card-content ${isGridView ? 'grid-clamp' : 'list-clamp'}`}>
                  {previewText}
                </div>
              )}

              {note.labels?.length > 0 && (
                <div className="note-card-labels">
                  {note.labels.map(l => (
                    <span key={l.id} className="note-label-pill">{l.name}</span>
                  ))}
                </div>
              )}

              {note.isOwner === false && (
                <div className="note-shared-info">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                  <span>{note.sharedBy || 'Người dùng'}</span>
                  <span>•</span>
                  <span style={{ color: 'var(--note-control-text, var(--text-muted))', fontWeight: 700 }}>
                    {note.myPermission === 'edit' ? '✏️ Được sửa' : '👁️ Chỉ xem'}
                  </span>
                  {note.sharedAt && (
                    <><span>•</span><span>{new Date(note.sharedAt).toLocaleDateString('vi-VN')}</span></>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="note-card-footer">
          {ts && (
            <span className="note-edit-time" title={`Đã chỉnh sửa: ${formatEditTime(ts)}`}>
              Đã chỉnh sửa: {formatEditTime(ts)}
            </span>
          )}
          <button
            className="card-action-btn"
            title="Xóa ghi chú"
            onClick={e => onDeleteClick(e, note)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
          </button>
        </div>
      </div>
    );
  };

  const SectionLabel = ({ children }) => (
    <div className="notes-section-label">{children}</div>
  );

  const containerClass = isGridView ? 'notes-grid' : 'notes-list';

  return (
    <>
      {pinned.length > 0 && (
        <>
          <SectionLabel>📌 Đã ghim</SectionLabel>
          <div className={containerClass}>
            {pinned.map(n => <NoteCard key={n.id} note={n} />)}
          </div>
        </>
      )}
      {others.length > 0 && (
        <>
          {pinned.length > 0 && <SectionLabel>Các ghi chú khác</SectionLabel>}
          <div className={containerClass}>
            {others.map(n => <NoteCard key={n.id} note={n} />)}
          </div>
        </>
      )}
    </>
  );
};

export default NoteList;