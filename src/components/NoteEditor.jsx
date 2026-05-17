import React, { useState, useEffect, useRef, useCallback } from 'react';
import PasswordSetupDialog from './PasswordSetupDialog';
import ShareDialog from './ShareDialog';
import { getReadableNoteVars } from '../utils/color';
import { filesToOptimizedDataUrls } from '../utils/image';
import axiosClient from '../api/axiosClient';

import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
window.Pusher = Pusher;

const isHexColor = (value = '') => /^#[0-9A-Fa-f]{6}$/.test(value);
const DEFAULT_PICKER_COLOR = '#6366f1';
const DEFAULT_PICKER_TONE = 50;

const clamp = (value, min, max) => Math.min(Math.max(Number(value) || 0, min), max);

const hexToRgb = (hex) => {
  if (!isHexColor(hex)) return null;
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};

const rgbToHex = ({ r, g, b }) => '#' + [r, g, b].map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');

const mixRgb = (a, b, amount) => ({
  r: a.r + (b.r - a.r) * amount,
  g: a.g + (b.g - a.g) * amount,
  b: a.b + (b.b - a.b) * amount,
});

const applyToneToColor = (hex, tone = DEFAULT_PICKER_TONE) => {
  const rgb = hexToRgb(hex) || hexToRgb(DEFAULT_PICKER_COLOR);
  const level = clamp(tone, 0, 100);
  if (level < 50) return rgbToHex(mixRgb(rgb, { r: 255, g: 255, b: 255 }, (50 - level) / 50 * 0.78));
  if (level > 50) return rgbToHex(mixRgb(rgb, { r: 0, g: 0, b: 0 }, (level - 50) / 50 * 0.55));
  return rgbToHex(rgb);
};

const escapeHtml = (text = '') => text
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const linkifyPlainText = (text = '') => escapeHtml(text)
  .replace(/(https?:\/\/[^\s<]+)/gi, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
  .replace(/\n/g, '<br>');

const PinIcon = ({ slashed = false }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" fill="currentColor"/>
    {slashed && <path d="M4 4l16 16" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/>}
  </svg>
);

const NoteEditor = ({ currentNote, availableLabels = [], theme, onCloseEditor, onAutoSave, onNotify, onUpdateNoteState }) => {
  
  const handleNotify = useCallback((msg) => {
    if (onNotify) onNotify(msg);
    else alert(`${msg.title}: ${msg.message}`);
  }, [onNotify]);

  const defaults = {
    id: null, title: '', content: '', contentHTML: '', images: [], labels: [],
    isPasswordProtected: false, notePassword: '', isPinned: false,
    isShared: false, sharedWith: [], backgroundColor: '', backgroundBaseColor: DEFAULT_PICKER_COLOR, backgroundTone: DEFAULT_PICKER_TONE
  };

  const [note, setNote] = useState(defaults);
  const [showPwdSetup, setShowPwdSetup] = useState(false);
  const [setupPwdError, setSetupPwdError] = useState(''); 
  const [showShare, setShowShare] = useState(false);
  const [zoomImg, setZoomImg] = useState(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [activeFormats, setActiveFormats] = useState({});
  const [collabCount, setCollabCount] = useState(0);

  const contentRef = useRef(null);
  const colorPickerRef = useRef(null);
  
  const noteRef = useRef(note);
  useEffect(() => {
    noteRef.current = note;
  }, [note]);

  useEffect(() => {
    if (!note.id) return; 

    const token = localStorage.getItem('token');
    if (!token) return;
    
    const echo = new Echo({
        broadcaster: 'reverb',
        key: 'g23x0h0mzxj', 
        wsHost: 'localhost',
        wsPort: 8080,
        wssPort: 8080,
        forceTLS: false,
        enabledTransports: ['ws', 'wss'],
        authEndpoint: 'http://localhost:8000/api/broadcasting/auth',
        auth: {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
            }
        }
    });

    const channel = echo.join(`note.${note.id}`)
      .here((users) => {
          setCollabCount(users.length);
      })
      .joining((user) => {
          setCollabCount(prev => prev + 1);
          handleNotify({ type: 'info', title: 'Cộng tác viên', message: `${user.name} vừa vào xem ghi chú.` });
      })
      .leaving((user) => {
          setCollabCount(prev => prev - 1);
      })
      .listen('NoteUpdated', (e) => {
          if (contentRef.current && e.content !== contentRef.current.innerHTML) {
              contentRef.current.innerHTML = e.content;
          }
          setNote(prev => ({ 
            ...prev, 
            title: e.title, 
            contentHTML: e.content, 
            backgroundColor: e.color || prev.backgroundColor 
          }));
      });

    return () => {
        echo.leave(`note.${note.id}`);
        echo.disconnect();
    };
  }, [note.id, handleNotify]);

  // Khởi tạo dữ liệu khi mở ghi chú
  useEffect(() => {
    const init = currentNote ? { 
      ...defaults, 
      ...currentNote,
      isPinned: currentNote.is_pinned !== undefined ? currentNote.is_pinned : false,
      isPasswordProtected: currentNote.isPasswordProtected !== undefined ? currentNote.isPasswordProtected : (currentNote.is_protected || !!currentNote.password || false),
      backgroundColor: currentNote.color || '',
      contentHTML: currentNote.content || '',
      images: currentNote.images || []
    } : defaults;
    
    setNote(init);
    
    if (contentRef.current) {
      contentRef.current.innerHTML = init.contentHTML || (init.content ? linkifyPlainText(init.content) : '');
    }
  }, [currentNote?.id]);

  useEffect(() => {
    const handler = (e) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target)) {
        setShowColorPicker(false);
      }
    };
    if (showColorPicker) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showColorPicker]);

  // ĐÃ XÓA DEBOUNCE: Hàm change giờ chỉ thay đổi state cục bộ trên màn hình
  const change = useCallback((fields) => {
    setNote(prev => ({ ...prev, ...fields }));
  }, []);

  const isReadOnly = note.isOwner === false && note.myPermission === 'read-only';

  // ĐÃ XÓA DEBOUNCE: Hàm nhập liệu chỉ cập nhật chữ lên màn hình, không tự lưu ngầm nữa
  const handleContentInput = useCallback(() => {
    if (!contentRef.current) return;
    const html = contentRef.current.innerHTML;
    const text = contentRef.current.innerText || contentRef.current.textContent || '';
    setNote(prev => ({ ...prev, contentHTML: html, content: text }));
  }, []);

  const handlePaste = useCallback((event) => {
    if (isReadOnly) return;
    const text = event.clipboardData?.getData('text/plain') || '';
    if (!text) return;
    event.preventDefault();
    const html = linkifyPlainText(text);
    document.execCommand('insertHTML', false, html);
    handleContentInput();
  }, [handleContentInput, isReadOnly]);

  const handleRichContentClick = useCallback((event) => {
    const link = event.target.closest?.('a[href]');
    if (!link) return;
    event.preventDefault();
    event.stopPropagation();
    window.open(link.href, '_blank', 'noopener,noreferrer');
  }, []);

  const updateActiveFormats = () => {
    try {
      setActiveFormats({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strikethrough: document.queryCommandState('strikeThrough'),
      });
    } catch {}
  };

  const execFormat = (cmd, value = null) => {
    contentRef.current?.focus();
    document.execCommand(cmd, false, value);
    handleContentInput();
    updateActiveFormats();
  };
  
  const formatBlock = (tag) => execFormat('formatBlock', tag);

  const clearFormatting = () => {
    contentRef.current?.focus();
    document.execCommand('removeFormat', false, null);
    document.execCommand('formatBlock', false, 'p');
    handleContentInput();
    updateActiveFormats();
  };

  const handleImages = async (e) => {
    const imgs = await filesToOptimizedDataUrls(e.target.files);
    if (imgs.length) change({ images: [...(noteRef.current.images || []), ...imgs] });
    e.target.value = '';
  };

  const isDark = theme === 'dark';
  const selectedBaseColor = isHexColor(note.backgroundBaseColor)
    ? note.backgroundBaseColor
    : (isHexColor(note.backgroundColor) ? note.backgroundColor : DEFAULT_PICKER_COLOR);
  const activeTone = clamp(note.backgroundTone ?? DEFAULT_PICKER_TONE, 0, 100);
  const currentToneColor = applyToneToColor(selectedBaseColor, activeTone);
  const bgColor = note.backgroundColor || (isDark ? 'var(--card-bg)' : '#ffffff');
  const readableNoteVars = getReadableNoteVars(bgColor);
  const readableTextColor = readableNoteVars['--note-text'] || (isDark ? '#f8fafc' : '#0f172a');
  const colorInputValue = selectedBaseColor;
  
  const applyCustomColor = (value) => {
    change({ backgroundBaseColor: value, backgroundTone: activeTone, backgroundColor: applyToneToColor(value, activeTone) });
  };
  const applyToneColor = (value) => {
    const nextTone = clamp(value, 0, 100);
    change({ backgroundBaseColor: selectedBaseColor, backgroundTone: nextTone, backgroundColor: applyToneToColor(selectedBaseColor, nextTone) });
  };
  const resetBackgroundColor = () => {
    change({ backgroundColor: '', backgroundBaseColor: DEFAULT_PICKER_COLOR, backgroundTone: DEFAULT_PICKER_TONE });
    setShowColorPicker(false);
  };
  const formatEditTime = (ts) => {
    if (!ts) return null;
    const d = new Date(ts);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `Đã chỉnh sửa: ${day}/${month}/${year}, ${hh}:${mm}`;
  };

  // ==================== 🛠️ ĐIỂM CẢI TIẾN CHÍNH HÀM ĐỐNG ====================
  const handleClose = async () => {
    // 1. Tắt khung editor ngay lập tức trên màn hình (Tốc độ phản hồi 0ms)
    onCloseEditor?.();
    
    // 2. Kích hoạt hàm lưu dữ liệu lên MySQL bằng dữ liệu nằm trong noteRef.current
    // Truyền cờ hiệu `true` để thông báo cho HomePage biết đây là lệnh Đóng
    await onAutoSave?.(noteRef.current, true);
  };

  return (
    <>
      {zoomImg && (
        <div className="zoom-overlay" onClick={() => setZoomImg(null)}>
          <img src={zoomImg} alt="zoom" />
          <button className="zoom-close" onClick={() => setZoomImg(null)}>✕</button>
        </div>
      )}

      <PasswordSetupDialog
  isOpen={showPwdSetup}
  onClose={() => {
    setShowPwdSetup(false);
    setSetupPwdError(''); 
  }}
  onSave={async (newPassword, oldPassword) => { 
    if (!note.id) {
      return handleNotify({ type: 'warning', title: 'Lưu ý', message: 'Vui lòng gõ nội dung ghi chú trước khi đặt mật khẩu!' });
    }
    setSetupPwdError('');
    try {
      const res = await axiosClient.post(`/notes/${note.id}/setup-password`, { 
        old_password: oldPassword,
        new_password: newPassword 
      });
      
      if (res.success) {
        const hasPass = !!newPassword;
        setNote(prev => ({ ...prev, isPasswordProtected: hasPass })); 
        onAutoSave?.(res.data || note);
        setShowPwdSetup(false);
        handleNotify({ type: 'success', title: 'Thành công', message: hasPass ? 'Đã khóa bảo mật ghi chú thành công!' : 'Đã gỡ bỏ mật khẩu bảo mật' });
        
        onUpdateNoteState?.(note.id, { isPasswordProtected: hasPass });

        window.location.reload();
      }
    } catch (error) {
      setSetupPwdError(error.response?.data?.message || 'Có lỗi xảy ra khi cấu hình mật khẩu!');
    }
  }}
  hasPassword={note.isPasswordProtected}
/>

      <ShareDialog
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        sharedWith={note.sharedWith || []}
        
        onAddShare={async (list) => {
          if (!note.id) {
             return handleNotify({ type: 'warning', title: 'Lưu ý', message: 'Vui lòng gõ một vài chữ trước khi chia sẻ ghi chú!' });
          }
          for (let item of list) {
            try {
              const res = await axiosClient.post(`/notes/${note.id}/share`, {
                email: item.email,
                permission: item.permission
              });
              if (res.success) {
                change({ sharedWith: res.sharedWith, isShared: true });
              }
            } catch (err) {
              handleNotify({ type: 'danger', title: 'Lỗi', message: err.response?.data?.message || 'Lỗi chia sẻ email' });
            }
          }
        }}

        onRevokeShare={async (email) => {
          try {
            const res = await axiosClient.delete(`/notes/${note.id}/share`, { data: { email } });
            if (res.success) {
              change({ sharedWith: res.sharedWith, isShared: res.sharedWith.length > 0 });
            }
          } catch (err) {
            console.error(err);
          }
        }}

        onChangePermission={async (email, newPerm) => {
          try {
            const res = await axiosClient.put(`/notes/${note.id}/share`, {
              email: email,
              permission: newPerm
            });
            if (res.success) {
              change({ sharedWith: res.sharedWith });
            }
          } catch (err) {
            console.error(err);
          }
        }}
      />

      <div className="note-editor" style={{ backgroundColor: bgColor, ...readableNoteVars, color: readableTextColor }}>
        
        {collabCount > 1 && (
          <div style={{ padding: '6px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <div className="collab-indicator">
              <div className="collab-dot" />
              {collabCount} người đang cùng xem & chỉnh sửa
            </div>
          </div>
        )}

        {note.images?.length > 0 && (
          <div className="editor-images">
            {note.images.map((img, i) => (
              <div key={i} className="editor-image-wrap">
                <img src={img} alt="" onClick={() => setZoomImg(img)} title="Bấm để phóng to" />
                {!isReadOnly && (
                  <button className="editor-image-remove" onClick={e => { e.stopPropagation(); change({ images: note.images.filter((_, idx) => idx !== i) }); }}>✕</button>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'flex-start', padding: '14px 16px 0' }}>
          <input
            className="editor-title"
            style={{ flex: 1, padding: 0, color: readableTextColor, WebkitTextFillColor: readableTextColor }}
            placeholder="Tiêu đề"
            value={note.title}
            onChange={e => change({ title: e.target.value })}
            disabled={isReadOnly}
          />
          <button
            className={`tool-btn pin-toggle-btn ${note.isPinned ? 'active' : ''}`}
            style={{ marginTop: 2, flexShrink: 0 }}
            title={note.isPinned ? 'Bỏ ghim' : 'Ghim ghi chú'}
            onClick={() => change({ isPinned: !note.isPinned, pinnedAt: !note.isPinned ? Date.now() : null })}
          >
            <PinIcon slashed={note.isPinned} />
          </button>
        </div>

        {!isReadOnly && (
          <div className="format-toolbar">
            <button className="fmt-btn" title="Tiêu đề 1" onMouseDown={e => e.preventDefault()} onClick={() => formatBlock('h1')}>
              <strong style={{ fontSize: 12 }}>H1</strong>
            </button>
            <button className="fmt-btn" title="Tiêu đề 2" onMouseDown={e => e.preventDefault()} onClick={() => formatBlock('h2')}>
              <strong style={{ fontSize: 12 }}>H2</strong>
            </button>
            <button className="fmt-btn" title="Đoạn văn bình thường" onMouseDown={e => e.preventDefault()} onClick={() => formatBlock('p')}>
              <span style={{ fontSize: 12 }}>Aa</span>
            </button>
            <div className="fmt-divider" />
            <button className={`fmt-btn ${activeFormats.bold ? 'fmt-active' : ''}`} title="In đậm (Ctrl+B)" onMouseDown={e => e.preventDefault()} onClick={() => execFormat('bold')}>
              <strong>B</strong>
            </button>
            <button className={`fmt-btn ${activeFormats.italic ? 'fmt-active' : ''}`} title="In nghiêng (Ctrl+I)" onMouseDown={e => e.preventDefault()} onClick={() => execFormat('italic')}>
              <em style={{ fontStyle: 'italic' }}>I</em>
            </button>
            <button className={`fmt-btn ${activeFormats.underline ? 'fmt-active' : ''}`} title="Gạch dưới (Ctrl+U)" onMouseDown={e => e.preventDefault()} onClick={() => execFormat('underline')}>
              <span style={{ textDecoration: 'underline' }}>U</span>
            </button>
            <button className="fmt-btn" title="Xóa định dạng" onMouseDown={e => e.preventDefault()} onClick={clearFormatting}>
              <span style={{ fontWeight: 700 }}>Tx</span>
            </button>
          </div>
        )}

        <div
          ref={contentRef}
          className="editor-content-rich"
          contentEditable={!isReadOnly}
          suppressContentEditableWarning
          data-placeholder="Viết ghi chú của bạn..."
          onInput={handleContentInput}
          onPaste={handlePaste}
          onClick={handleRichContentClick}
          onKeyUp={updateActiveFormats}
          onMouseUp={updateActiveFormats}
        />

        {availableLabels.length > 0 && (
          <div className="editor-labels">
            {availableLabels.map(l => {
              const sel = note.labels?.some(x => x.id === l.id);
              return (
                <span
                  key={l.id}
                  className={`editor-label-chip ${sel ? 'selected' : ''}`}
                  onClick={() => {
                    if (isReadOnly) return;
                    const newLabels = sel ? (note.labels || []).filter(x => x.id !== l.id) : [...(note.labels || []), l];
                    change({ labels: newLabels });
                  }}
                >
                  {sel && '✓ '}{l.name}
                </span>
              );
            })}
          </div>
        )}

        <div className="editor-toolbar">
          <div className="editor-tools">
            {!isReadOnly && (
              <>
                <button className={`tool-btn ${note.isShared ? 'active' : ''}`} title="Chia sẻ" onClick={() => setShowShare(true)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>
                </button>

                <button
                  className={`tool-btn ${note.isPasswordProtected ? 'active' : ''}`}
                  title={note.isPasswordProtected ? 'Quản lý mật khẩu' : 'Thêm mật khẩu'}
                  onClick={() => setShowPwdSetup(true)}
                  style={{ color: note.isPasswordProtected ? '#ef4444' : undefined }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d={note.isPasswordProtected
                      ? "M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"
                      : "M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h2c0-1.66 1.34-3 3-3s3 1.34 3 3v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"
                    }/>
                  </svg>
                </button>

                <label className="tool-btn" style={{ cursor: 'pointer' }} title="Thêm ảnh">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
                  <input type="file" multiple accept="image/*" hidden onChange={handleImages} />
                </label>

                <div style={{ position: 'relative' }} ref={colorPickerRef}>
                  <button
                    className="tool-btn"
                    title="Màu nền ghi chú"
                    style={{ color: note.backgroundColor ? 'var(--primary)' : undefined }}
                    onClick={() => setShowColorPicker(v => !v)}
                  >
                    {note.backgroundColor ? (
                      <span style={{ width: 14, height: 14, borderRadius: '50%', background: note.backgroundColor, display: 'inline-block', border: '1.5px solid var(--border)', flexShrink: 0 }} />
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 22C6.49 22 2 17.51 2 12S6.49 2 12 2s10 4.04 10 9c0 3.31-2.69 6-6 6h-1.77c-.28 0-.5.22-.5.5 0 .12.05.23.13.33.41.47.64 1.06.64 1.67A2.5 2.5 0 0 1 12 22zm0-18c-4.41 0-8 3.59-8 8s3.59 8 8 8c.28 0 .5-.22.5-.5a.54.54 0 0 0-.14-.35c-.41-.46-.63-1.05-.63-1.65a2.5 2.5 0 0 1 2.5-2.5H16c2.21 0 4-1.79 4-4 0-3.86-3.59-7-8-7z"/>
                      </svg>
                    )}
                  </button>
                  {showColorPicker && (
                    <div className="color-picker-dropdown enhanced-color-picker">
                      <div className="color-picker-header">
                        <div>
                          <div className="color-picker-label">Màu nền ghi chú</div>
                          <div className="color-picker-subtitle">Chọn màu bất kỳ rồi kéo thanh để chỉnh độ đậm nhạt</div>
                        </div>
                      </div>

                      <div className="color-tone-preview" style={{ background: note.backgroundColor || currentToneColor }} />

                      <label className="color-control-label">Độ đậm nhạt</label>
                      <input
                        className="color-tone-slider"
                        type="range"
                        min="0"
                        max="100"
                        value={activeTone}
                        onChange={e => applyToneColor(e.target.value)}
                      />

                      <div className="color-picker-actions">
                        <button
                          type="button"
                          className={`color-default-btn ${!note.backgroundColor ? 'selected' : ''}`}
                          onClick={resetBackgroundColor}
                        >
                          Mặc định
                        </button>
                        <label className="color-custom-picker">
                          <span>Chọn màu bất kỳ</span>
                          <input
                            type="color"
                            value={colorInputValue}
                            onChange={e => applyCustomColor(e.target.value)}
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 2, marginLeft: 4, borderLeft: '1px solid var(--border)', paddingLeft: 4 }}>
                  <button
                    className="tool-btn"
                    title="Hoàn tác (Ctrl+Z)"
                    onClick={() => { contentRef.current?.focus(); document.execCommand('undo'); handleContentInput(); }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/></svg>
                  </button>
                  <button
                    className="tool-btn"
                    title="Làm lại (Ctrl+Y)"
                    onClick={() => { contentRef.current?.focus(); document.execCommand('redo'); handleContentInput(); }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z"/></svg>
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="editor-meta">
            {note.updatedAt && (
              <span className="save-time" title={formatEditTime(note.updatedAt)}>
                ✓ {formatEditTime(note.updatedAt)}
              </span>
            )}
            <button className="btn-close-editor" onClick={handleClose}>Đóng</button>
          </div>
        </div>
      </div>
    </>
  );
};

export default NoteEditor;