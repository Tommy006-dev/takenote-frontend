import React, { useState, useEffect, useMemo, useRef } from 'react';
import { debounce } from 'lodash';
import { useNavigate } from 'react-router-dom';
import NoteEditor from '../components/NoteEditor';
import NoteList from '../components/NoteList';
import LabelManager from '../components/LabelManager';
import PasswordDialog from '../components/PasswordDialog';
import ConfirmDialog from '../components/ConfirmDialog';
import Toast from '../components/Toast';
import { filesToOptimizedDataUrls } from '../utils/image';
import axiosClient from '../api/axiosClient';

const normalizeText = (value) => {
  if (!value) return ''; 
  return value
    .toString()
    .toLocaleLowerCase('vi-VN')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

const HomePage = ({ setIsAuthenticated, userInfo = { name: 'User', email: '' }, theme, setTheme, fontSize }) => {
  const navigate = useNavigate();
  const [isGridView, setIsGridView] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingNote, setEditingNote] = useState(null);
  const [notes, setNotes] = useState([]);
  const [filteredNotes, setFilteredNotes] = useState([]);
  const [labels, setLabels] = useState([]);
  const [selectedLabel, setSelectedLabel] = useState(null);
  const [activeTab, setActiveTab] = useState('notes');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showPwdDialog, setShowPwdDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [pwdError, setPwdError] = useState('');
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const avatarMenuRef = useRef(null);

  const [isResending, setIsResending] = useState(false);

  const notify = (nextToast) => setToast({ duration: 3200, ...nextToast });

  const showActivationBanner = userInfo && (userInfo.email_verified_at === null || userInfo.isVerified === false);

  useEffect(() => {
    document.body.className = [
      theme === 'dark' ? 'dark-mode' : '',
      `font-${fontSize || 'large'}`
    ].filter(Boolean).join(' ');
  }, [theme, fontSize]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target)) {
        setAvatarMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const formatNote = (n) => ({
    ...n,
    isPinned: n.is_pinned,
    isPasswordProtected: n.isPasswordProtected !== undefined ? n.isPasswordProtected : (n.is_protected || !!n.password),
    backgroundColor: n.color,
    updatedAt: n.updated_at,
    createdAt: n.created_at,
    contentHTML: n.content,
    images: n.images || [],
    isOwner: n.is_owner !== undefined ? n.is_owner : true, 
    sharedBy: n.owner_name || n.owner_email || 'Người dùng', 
    myPermission: n.pivot?.permission || n.permission || 'read-only',
    sharedAt: n.pivot?.created_at || n.shared_at,
    sharedWith: n.shared_with || []
  });

// 1. TÁCH HÀM RA RIÊNG: Đặt ngay vị trí cũ của useEffect
  const refreshData = async () => {
    try {
      const [notesRes, labelsRes] = await Promise.all([
        axiosClient.get('/notes'),
        axiosClient.get('/labels')
      ]);
      if (notesRes.success) setNotes(notesRes.data.map(formatNote));
      if (labelsRes.success) setLabels(labelsRes.data);
    } catch (err) {
      console.error('Không thể tải dữ liệu:', err);
    }
  };

  // 2. USEEFFECT MỚI: Rất ngắn gọn, chỉ dùng để gọi hàm refreshData ở trên khi vừa mở web
  useEffect(() => {
    let mounted = true;
    
    if (mounted) {
      refreshData();
    }
    
    return () => { mounted = false; };
  }, []);

  const handleAutoSave = async (savedNote, isClosing = false) => {
    const payload = {
      title: savedNote.title || '',
      content: savedNote.contentHTML || savedNote.content || '',
      color: savedNote.backgroundColor || savedNote.backgroundBaseColor || '#ffffff',
      is_pinned: savedNote.isPinned || false,
      labels: savedNote.labels?.map(l => l.id) || [], 
      images: savedNote.images || []
    };

    if (savedNote.notePassword !== undefined) {
      payload.password = savedNote.notePassword;
    }

    try {
      if (savedNote.id) {
        const updated = { ...savedNote, updatedAt: Date.now() };
        setNotes(prev => prev.map(n => n.id === savedNote.id ? updated : n));
        
        await axiosClient.put(`/notes/${savedNote.id}`, payload);
      } else {
        if (!payload.title && !payload.content && payload.images.length === 0) return;

        const res = await axiosClient.post('/notes', payload);
        if (res.success) {
          const newNote = formatNote(res.data);
          setNotes(prev => [newNote, ...prev]);
          if (!isClosing) {
            setEditingNote(newNote); 
          }
        }
      }
    } catch (error) {
      console.error('Lỗi lưu ghi chú:', error);
    }
  };

  const handleTogglePin = async (note) => {
    try {
      const isPinnedNow = !note.isPinned;
      setNotes(notes.map(n => n.id === note.id ? { ...n, isPinned: isPinnedNow, pinnedAt: isPinnedNow ? Date.now() : null } : n));
      await axiosClient.put(`/notes/${note.id}`, { is_pinned: isPinnedNow });
    } catch (err) { console.error(err); }
  };

  const executeDelete = async (id) => {
    try {
      await axiosClient.delete(`/notes/${id}`);
      const target = notes.find(n => n.id === id);
      setNotes(prev => prev.filter(n => n.id !== id));
      if (editingNote?.id === id) setEditingNote(null);
      notify({ type: 'success', title: 'Đã xóa ghi chú', message: target?.title ? `"${target.title}" đã được xóa.` : 'Ghi chú đã được xóa.' });
    } catch (err) {
      notify({ type: 'danger', title: 'Thất bại', message: 'Không thể xóa ghi chú.' });
    }
  };

  const submitPassword = async (pwd) => {
    try {
      const response = await axiosClient.post(`/notes/${pendingAction.note.id}/verify-password`, { password: pwd });
      if (response.success) {
        const unlockedNote = formatNote(response.data);
        setPwdError('');
        setShowPwdDialog(false);
        if (pendingAction.type === 'edit') setEditingNote(unlockedNote);
        else requestDeleteNote(unlockedNote);
        setPendingAction(null);
      }
    } catch (error) {
      setPwdError(error.response?.data?.message || 'Mật khẩu không chính xác!');
    }
  };

  const handleAddLabel = async (name) => {
    if (labels.some(l => l.name.toLocaleLowerCase('vi-VN') === name.toLocaleLowerCase('vi-VN'))) {
      notify({ type: 'warning', title: 'Nhãn đã tồn tại', message: 'Vui lòng chọn tên nhãn khác.' }); return;
    }
    try {
      const res = await axiosClient.post('/labels', { name });
      if (res.success) {
        setLabels([...labels, res.data]);
        notify({ type: 'success', title: 'Đã thêm nhãn', message: `Nhãn "${name}" đã sẵn sàng để gắn vào ghi chú.` });
      }
    } catch (e) { notify({ type: 'danger', title: 'Lỗi', message: 'Không thể thêm nhãn.' }); }
  };

  const handleEditLabel = async (id, newName) => {
    try {
      const res = await axiosClient.put(`/labels/${id}`, { name: newName });
      if (res.success) {
        setLabels(labels.map(l => l.id === id ? res.data : l));
        setNotes(notes.map(n => ({ ...n, labels: n.labels?.map(l => l.id === id ? res.data : l) })));
        notify({ type: 'success', title: 'Đã đổi tên nhãn', message: `Nhãn được cập nhật thành "${newName}".` });
      }
    } catch (e) { notify({ type: 'danger', title: 'Lỗi', message: 'Không thể đổi tên nhãn.' }); }
  };

  const handleDeleteLabel = async (id) => {
    try {
      await axiosClient.delete(`/labels/${id}`);
      setLabels(prev => prev.filter(l => l.id !== id));
      if (selectedLabel?.id === id) setSelectedLabel(null);
      setNotes(notes.map(n => ({ ...n, labels: n.labels?.filter(l => l.id !== id) })));
      notify({ type: 'success', title: 'Đã xóa nhãn', message: 'Nhãn đã được gỡ.' });
    } catch (e) { notify({ type: 'danger', title: 'Lỗi', message: 'Không thể xóa nhãn.' }); }
  };

  const handleResendEmail = async () => {
    if (isResending) return;
    setIsResending(true);
    try {
      const response = await axiosClient.post('/email/resend-verification');
      if (response.success) {
        notify({ type: 'success', title: 'Đã gửi lại email', message: 'Vui lòng kiểm tra hộp thư để kích hoạt tài khoản.' });
      }
    } catch (error) {
      notify({ type: 'danger', title: 'Lỗi', message: error.response?.data?.message || 'Không thể gửi lại email.' });
    } finally {
      setIsResending(false);
    }
  };

  const handleLogout = async () => {
    setAvatarMenuOpen(false);
    try { await axiosClient.post('/logout'); } catch(e){}
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    navigate('/login');
  };

  const requestDeleteLabel = (label) => {
    setConfirmState({
      tone: 'danger',
      title: 'Xóa nhãn này?',
      message: `Nhãn "${label.name}" sẽ được gỡ khỏi các ghi chú liên quan nhưng ghi chú vẫn được giữ lại.`,
      confirmText: 'Xóa nhãn',
      onConfirm: () => { setConfirmState(null); handleDeleteLabel(label.id); }
    });
  };

  const requestDeleteNote = (note) => {
    setConfirmState({
      tone: 'danger',
      title: 'Xóa ghi chú này?',
      message: `Ghi chú "${note.title || 'Không có tiêu đề'}" sẽ bị xóa khỏi hệ thống. Hành động này không thể hoàn tác.`,
      confirmText: 'Xóa ghi chú',
      onConfirm: () => { setConfirmState(null); executeDelete(note.id); }
    });
  };

  const handleProtectedAction = (action, note) => {
    if (note.isPasswordProtected) {
      setPendingAction({ type: action, note });
      setPwdError('');
      setShowPwdDialog(true);
    } else {
      if (action === 'edit') setEditingNote(note);
      else requestDeleteNote(note);
    }
  };

  const debouncedFilter = useMemo(() => debounce((q, lbl, tab, data) => {
    let res = data.filter(n => tab === 'shared' ? n.isOwner === false : n.isOwner !== false);
    if (lbl) res = res.filter(n => n.labels?.some(l => l.id === lbl.id));
    if (q.trim()) {
      const query = normalizeText(q);
      res = res.filter(n => {
        const searchable = [
          n.title,
          n.content,
          ...(n.labels || []).map(label => label.name),
        ].map(normalizeText).join(' ');
        return searchable.includes(query);
      });
    }
    res.sort((a, b) => {
      if (a.isPinned && b.isPinned) return (b.pinnedAt || 0) - (a.pinnedAt || 0);
      if (a.isPinned) return -1;
      if (b.isPinned) return 1;
      return (b.updatedAt || b.createdAt || b.id || 0) - (a.updatedAt || a.createdAt || a.id || 0);
    });
    setFilteredNotes(res);
  }, 300), []);

  useEffect(() => {
    debouncedFilter(searchQuery, selectedLabel, activeTab, notes);
  }, [searchQuery, selectedLabel, activeTab, notes, debouncedFilter]);

  useEffect(() => () => debouncedFilter.cancel(), [debouncedFilter]);

  const getInitials = (value = '') => {
    const words = value.trim().split(/\s+/).filter(Boolean);
    if (words.length >= 2) return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
    return (value.trim()[0] || 'U').toUpperCase();
  };
  const avatarInitials = getInitials(userInfo.name || userInfo.email || 'U');
  const hasAvatarImage = Boolean(userInfo.avatar);

  const closeSidebar = () => setSidebarOpen(false);

  const GridIcon = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 0h8v8h-8z" opacity=".7"/></svg>;
  const ListIcon = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h2v2H3zm4 0h14v2H7zM3 9h2v2H3zm4 0h14v2H7zM3 14h2v2H3zm4 0h14v2H7zM3 19h2v2H3zm4 0h14v2H7z"/></svg>;
  const MoonIcon = ({ size = 18 }) => <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><path d="M20.3 14.9A8.2 8.2 0 0 1 9.1 3.7 8.8 8.8 0 1 0 20.3 14.9z" fill="#fbbf24" stroke="#92400e" strokeWidth="1.4" strokeLinejoin="round"/></svg>;
  const SunIcon = ({ size = 18 }) => <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.4" fill="#facc15" stroke="#ca8a04" strokeWidth="1.4"/><g stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"><path d="M12 2.7v2.1M12 19.2v2.1M4.8 4.8l1.5 1.5M17.7 17.7l1.5 1.5M2.7 12h2.1M19.2 12h2.1M4.8 19.2l1.5-1.5M17.7 6.3l1.5-1.5"/></g></svg>;
  const NoteIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>;
  const SharedIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)' }}>
      <Toast toast={toast} onClose={() => setToast(null)} />
      <ConfirmDialog
        isOpen={!!confirmState}
        title={confirmState?.title}
        message={confirmState?.message}
        confirmText={confirmState?.confirmText}
        tone={confirmState?.tone}
        onCancel={() => setConfirmState(null)}
        onConfirm={confirmState?.onConfirm}
      />
      <PasswordDialog
        isOpen={showPwdDialog}
        onClose={() => { setShowPwdDialog(false); setPendingAction(null); }}
        onSubmit={submitPassword}
        title={pendingAction?.note?.title}
        errorMsg={pwdError}
      />

      {/* Lớp mờ ở dưới NoteEditor */}
      {editingNote && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.25)', zIndex: 1030, backdropFilter: 'blur(2px)' }}
          onClick={() => setEditingNote(null)}
        />
      )}

      <div className={`sidebar-mobile-overlay ${sidebarOpen ? 'show' : ''}`} onClick={closeSidebar} />

      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="hbtn mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)} title="Menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>
          </button>
          <div className="header-logo" onClick={() => { setSelectedLabel(null); setActiveTab('notes'); setSearchQuery(''); }}>
            <div className="header-logo-icon">📝</div>
            <span className="header-logo-text">TakeNote</span>
          </div>
        </div>

        <div className="header-search">
          <div className="search-box">
            <span className="search-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </span>
            <input type="text" placeholder="Tìm kiếm ghi chú..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: '2px 4px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
              </button>
            )}
          </div>
        </div>

        <div className="header-actions">
          <button className="hbtn" onClick={() => setIsGridView(!isGridView)} title={isGridView ? 'Danh sách' : 'Lưới'}>
            {isGridView ? <ListIcon /> : <GridIcon />}
          </button>
          <button className="hbtn colorful-theme-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>

          <div className="dropdown profile-dropdown" ref={avatarMenuRef}>
            <button type="button" className="avatar-btn colorful-avatar-btn" onClick={() => setAvatarMenuOpen(open => !open)}>
              {hasAvatarImage ? <img src={userInfo.avatar} alt="avatar" /> : <span className="avatar-initials">{avatarInitials}</span>}
            </button>
            <ul className={`dropdown-menu custom-profile-menu dropdown-menu-end ${avatarMenuOpen ? 'show' : ''}`}>
              <li style={{ padding: '10px 14px 8px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{userInfo.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{userInfo.email}</div>
              </li>
              <li><button className="dropdown-item" onClick={() => { setAvatarMenuOpen(false); navigate('/profile'); }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg> Hồ sơ
              </button></li>
              <li style={{ borderTop: '1px solid var(--border)', marginTop: 4, paddingTop: 4 }}>
                <button className="dropdown-item danger-item" onClick={handleLogout}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg> Đăng xuất
                </button>
              </li>
            </ul>
          </div>
        </div>
      </header>

      {showActivationBanner && (
        <div className="activation-banner">
          <span>📧 Tài khoản chưa xác thực. Kiểm tra email để kích hoạt</span>
          <button style={{ background: 'none', border: 'none', color: 'inherit', fontWeight: 700, cursor: isResending ? 'wait' : 'pointer', fontSize: 13, textDecoration: 'underline', flexShrink: 0, opacity: isResending ? 0.7 : 1 }}
            disabled={isResending} onClick={handleResendEmail}>
            {isResending ? 'Đang gửi...' : 'Gửi lại'}
          </button>
        </div>
      )}

      <div className="app-layout">
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className={`sidebar-item ${activeTab === 'notes' && !selectedLabel ? 'active' : ''}`} onClick={() => { setActiveTab('notes'); setSelectedLabel(null); closeSidebar(); }}>
            <span className="item-icon"><NoteIcon /></span>
            <span className="item-label">Ghi chú của tôi</span>
            {notes.filter(n => n.isOwner !== false).length > 0 && <span className="item-badge">{notes.filter(n => n.isOwner !== false).length}</span>}
          </div>

          <div className={`sidebar-item ${activeTab === 'shared' ? 'active' : ''}`} onClick={() => { setActiveTab('shared'); setSelectedLabel(null); closeSidebar(); }}>
            <span className="item-icon"><SharedIcon /></span>
            <span className="item-label">Được chia sẻ với tôi</span>
            {notes.filter(n => n.isOwner === false).length > 0 && <span className="item-badge">{notes.filter(n => n.isOwner === false).length}</span>}
          </div>

          <LabelManager
            labels={labels}
            onAddLabel={handleAddLabel}
            onDeleteLabel={handleDeleteLabel}
            onEditLabel={handleEditLabel}
            onSelectLabel={l => { setSelectedLabel(l); setActiveTab('notes'); closeSidebar(); }}
            activeLabel={selectedLabel}
            onNotify={notify}
            onRequestDelete={requestDeleteLabel}
          />
        </aside>

        <main className="main-content">
          <section className="workspace-head">
            <div>
              {activeTab !== 'shared' && <div className="eyebrow">Không gian làm việc</div>}
              <h1>{activeTab === 'shared' ? 'Ghi chú được chia sẻ' : selectedLabel ? `Nhãn: ${selectedLabel.name}` : 'Ghi chú của tôi'}</h1>
              <p>{activeTab === 'shared' ? 'Theo dõi những ghi chú người khác chia sẻ với bạn.' : 'Tạo, ghim, khóa, gắn nhãn và tìm kiếm ghi chú thật nhanh.'}</p>
            </div>
            <div className="workspace-stats">
              <div><strong>{notes.filter(n => n.isOwner !== false).length}</strong><span>Của tôi</span></div>
              <div><strong>{notes.filter(n => n.isPinned).length}</strong><span>Đã ghim</span></div>
              <div><strong>{labels.length}</strong><span>Nhãn</span></div>
            </div>
          </section>

          {activeTab === 'shared' && (
            <div className="shared-tab-header">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
              <span>Ghi chú người khác chia sẻ với bạn — quyền hạn và người chia sẻ hiển thị trên từng thẻ</span>
            </div>
          )}

          {/* CHỈ HIỆN THANH "TẠO MỚI" Ở TAB CỦA TÔI VÀ KHI CHƯA MỞ NOTE NÀO */}
          {activeTab === 'notes' && !editingNote && (
            <div className="note-editor-wrap" style={{ position: 'relative', zIndex: 1 }}>
              <div className="create-note-bar" onClick={() => setEditingNote({ id: null, title: '', content: '', labels: selectedLabel ? [selectedLabel] : [] })}>
                <span className="placeholder-text">Tạo ghi chú mới...</span>
                <div className="create-note-actions">
                  <label className="create-note-btn" title="Thêm ảnh" onClick={e => e.stopPropagation()}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
                    <input type="file" multiple accept="image/*" hidden
                      onChange={e => {
                        filesToOptimizedDataUrls(e.target.files).then(imgs => {
                          if (imgs.length) setEditingNote({ id: null, title: '', content: '', images: imgs, labels: selectedLabel ? [selectedLabel] : [] });
                          e.target.value = '';
                        });
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* HIỆN KHUNG XEM/SỬA NOTE Ở TẤT CẢ CÁC TAB KHI ĐƯỢC CLICK */}
          {editingNote && (
            <div className="note-editor-wrap" style={{ position: 'relative', zIndex: 1035 }}>
              <div onClick={e => e.stopPropagation()}>
                <NoteEditor
                  currentNote={editingNote}
                  onAutoSave={handleAutoSave}
                  onRefreshData={refreshData}
                  availableLabels={labels}
                  theme={theme}
                  onCloseEditor={() => setEditingNote(null)}
                  onNotify={notify}
                />
              </div>
            </div>
          )}

          {selectedLabel && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <div className="filter-chip">🏷️ {selectedLabel.name} <button className="filter-chip-close" onClick={() => setSelectedLabel(null)}>✕</button></div>
            </div>
          )}

          {filteredNotes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">{activeTab === 'shared' ? '🤝' : selectedLabel ? '🏷️' : searchQuery ? '🔍' : '📝'}</div>
              <div className="empty-title">
                {activeTab === 'shared' ? 'Chưa có ghi chú được chia sẻ' : searchQuery ? 'Không tìm thấy kết quả' : selectedLabel ? `Không có ghi chú nào với nhãn "${selectedLabel.name}"` : 'Chưa có ghi chú nào'}
              </div>
              <div className="empty-desc">
                {activeTab === 'notes' && !searchQuery && !selectedLabel && 'Bấm vào ô phía trên để tạo ghi chú đầu tiên của bạn!'}
              </div>
            </div>
          ) : (
            <NoteList notes={filteredNotes} isGridView={isGridView} onEditNote={n => handleProtectedAction('edit', n)} onDeleteClick={(e, n) => { e.stopPropagation(); handleProtectedAction('delete', n); }} onTogglePin={handleTogglePin} activeTab={activeTab} />
          )}
        </main>
      </div>
    </div>
  );
};

export default HomePage;