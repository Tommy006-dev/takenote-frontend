import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient'; 

const EyeIcon = ({ visible }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    {visible
      ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
      : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
    }
  </svg>
);

const PasswordField = ({ label, value, onChange, visible, onToggle, placeholder, showToggle = true }) => (
  <div className="form-group">
    <label className="form-label">{label}</label>
    <div className="password-input-wrap">
      <input
        className="form-input"
        type={showToggle && visible ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        style={{ paddingRight: showToggle ? 46 : 14 }}
      />
      {showToggle && value && (
        <button type="button" className="pwd-eye-btn" aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onClick={onToggle}>
          <EyeIcon visible={visible} />
        </button>
      )}
    </div>
  </div>
);

const ProfilePage = ({ setIsAuthenticated, userInfo, setUserInfo }) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState('profile');
  const [name, setName] = useState(userInfo?.name || '');
  const [avatarPreview, setAvatarPreview] = useState(null);
  
  // State Mật khẩu
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  
  // State Thông báo
  const [pwdError, setPwdError] = useState('');
  const [pwdOk, setPwdOk] = useState('');
  const [profileOk, setProfileOk] = useState('');
  const [profileError, setProfileError] = useState('');
  const [avatarError, setAvatarError] = useState('');
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  const getInitials = (value = '') => {
    const words = value.trim().split(/\s+/).filter(Boolean);
    if (words.length >= 2) return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
    return (value.trim()[0] || 'U').toUpperCase();
  };
  const avatarUrl = avatarPreview || userInfo?.avatar || '';
  const avatarInitials = getInitials(name || userInfo?.email || 'U');

  const handleAvatarChange = e => {
    const f = e.target.files[0];
    e.target.value = '';
    setAvatarError('');
    if (!f) return;
    if (!f.type.startsWith('image/')) return setAvatarError('Vui lòng chọn đúng file ảnh!');
    if (f.size > 2 * 1024 * 1024) return setAvatarError('Ảnh đại diện nên dưới 2MB để tải nhanh hơn.');
    const r = new FileReader();
    r.onload = x => setAvatarPreview(x.target.result);
    r.readAsDataURL(f);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileOk(''); setProfileError('');
    if (!name.trim()) return;

    try {
      const response = await axiosClient.put('/user/profile', { 
        name: name.trim() 
      });
      
      if (response.success) {
        setUserInfo({ ...userInfo, name: response.user.name, avatar: avatarPreview || userInfo?.avatar || '' });
        setProfileOk('Cập nhật thông tin thành công!');
        setTimeout(() => setProfileOk(''), 3000);
      }
    } catch (error) {
      setProfileError(error.response?.data?.message || 'Đã có lỗi xảy ra khi lưu!');
    }
  };

  const handleChangePwd = async (e) => {
    e.preventDefault();
    setPwdError(''); setPwdOk('');
    
    if (!oldPwd) return setPwdError('Nhập mật khẩu hiện tại!');
    if (newPwd.length < 6) return setPwdError('Mật khẩu mới tối thiểu 6 ký tự!');
    if (newPwd !== confirmPwd) return setPwdError('Mật khẩu xác nhận không khớp!');

    try {
      const response = await axiosClient.put('/user/change-password', {
        current_password: oldPwd,          
        password: newPwd,                  
        password_confirmation: confirmPwd  
      });

      if (response.success) {
        setPwdOk('Đổi mật khẩu thành công!');
        setOldPwd(''); setNewPwd(''); setConfirmPwd('');
        setShowNewPwd(false); setShowConfirmPwd(false);
        setTimeout(() => setPwdOk(''), 3000);
      }
    } catch (error) {
      // Bắt lỗi báo sai mật khẩu từ Backend Laravel trả về
      setPwdError(error.response?.data?.message || 'Đã có lỗi xảy ra!');
    }
  };

  const handleLogout = async () => {
    try {
      await axiosClient.post('/logout');
    } catch (err) {
      console.error(err);
    } finally {
      localStorage.removeItem('token'); 
      setIsAuthenticated(false);
      navigate('/login');
    }
  };

  const TABS = [
    { key: 'profile', label: 'Hồ sơ', icon: '👤' },
    { key: 'password', label: 'Mật khẩu', icon: '🔑' },
  ];

  return (
    <div className="profile-page" style={{ backgroundColor: 'var(--bg)', minHeight: '100vh', color: 'var(--text)' }}>
      {/* Header */}
      <div className="profile-header" style={{ background: 'var(--header-bg)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
        <button
          onClick={() => navigate('/')}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: 14, cursor: 'pointer', padding: '6px 10px', borderRadius: 8, transition: 'all 0.2s' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
          Quay lại
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text)' }}>Hồ sơ</h1>
        <div />
      </div>

      <div className="profile-content">
        {/* Avatar section */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" className="profile-avatar-large" />
            ) : (
              <div className="avatar-fallback avatar-fallback-lg">{avatarInitials}</div>
            )}
            <label style={{ position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid var(--bg-white)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
              <input type="file" accept="image/*" hidden onChange={handleAvatarChange} />
            </label>
          </div>
          <div style={{ marginTop: 12, fontWeight: 700, fontSize: 20, color: 'var(--text)' }}>{name || userInfo?.name}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{userInfo?.email}</div>
          {avatarError && <div className="form-error form-alert" style={{ margin: '12px auto 0', maxWidth: 360 }}>⚠️ {avatarError}</div>}
          {(avatarPreview || userInfo?.avatar) && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ marginTop: 12 }}
              onClick={() => { setAvatarPreview(''); setUserInfo({ ...userInfo, avatar: '' }); }}
            >
              Gỡ ảnh đại diện
            </button>
          )}
        </div>

        {/* Card */}
        <div className="profile-card">
          {/* Tabs */}
          <div className="profile-tabs">
            {TABS.map(t => (
              <button key={t.key} className={`profile-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
                <span>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>

          <div className="profile-tab-body">
            {/* Profile tab */}
            {tab === 'profile' && (
              <form onSubmit={handleSaveProfile}>
                {profileError && <div style={{ marginBottom: 16, padding: '10px 14px', background: '#fee2e2', borderRadius: 10, fontSize: 13, color: '#b91c1c', fontWeight: 600 }}>⚠️ {profileError}</div>}
                {profileOk && <div style={{ marginBottom: 16, padding: '10px 14px', background: '#d1fae5', borderRadius: 10, fontSize: 13, color: '#065f46', fontWeight: 600 }}>✅ {profileOk}</div>}
                <div className="form-group">
                  <label className="form-label">Tên hiển thị</label>
                  <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Nhập tên của bạn" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email (không thể thay đổi)</label>
                  <input className="form-input" value={userInfo?.email || ''} disabled style={{ opacity: 0.6 }} />
                </div>
                <button type="submit" className="btn btn-primary">💾 Lưu thay đổi</button>
              </form>
            )}

            {/* Password tab */}
            {tab === 'password' && (
              <form onSubmit={handleChangePwd}>
                {pwdError && <div style={{ marginBottom: 16, padding: '10px 14px', background: '#fee2e2', borderRadius: 10, fontSize: 13, color: '#b91c1c', fontWeight: 600 }}>⚠️ {pwdError}</div>}
                {pwdOk && <div style={{ marginBottom: 16, padding: '10px 14px', background: '#d1fae5', borderRadius: 10, fontSize: 13, color: '#065f46', fontWeight: 600 }}>✅ {pwdOk}</div>}
                <PasswordField
                  label="Mật khẩu hiện tại"
                  value={oldPwd}
                  onChange={e => setOldPwd(e.target.value)}
                  visible={false}
                  onToggle={() => {}}
                  placeholder="Xác nhận lại mật khẩu hiện tại"
                  showToggle={false}
                />
                <PasswordField
                  label="Mật khẩu mới"
                  value={newPwd}
                  onChange={e => setNewPwd(e.target.value)}
                  visible={showNewPwd}
                  onToggle={() => setShowNewPwd(v => !v)}
                  placeholder="Tối thiểu 6 ký tự"
                />
                <PasswordField
                  label="Xác nhận mật khẩu mới"
                  value={confirmPwd}
                  onChange={e => setConfirmPwd(e.target.value)}
                  visible={showConfirmPwd}
                  onToggle={() => setShowConfirmPwd(v => !v)}
                  placeholder="Nhập lại mật khẩu mới"
                />
                <button type="submit" className="btn btn-primary">🔑 Đổi mật khẩu</button>
              </form>
            )}
          </div>
        </div>

        {/* Logout */}
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button className="btn btn-danger btn-sm" onClick={handleLogout}>
            🚪 Đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;