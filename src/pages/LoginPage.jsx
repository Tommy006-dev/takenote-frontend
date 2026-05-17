import axiosClient from '../api/axiosClient';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Toast from '../components/Toast';

const EyeIcon = ({ visible }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    {visible
      ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
      : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
    }
  </svg>
);

const PasswordInput = ({ value, onChange, visible, onToggle, placeholder, required = true, autoComplete }) => (
  <div className="password-input-wrap">
    <input
      className="form-input"
      type={visible ? 'text' : 'password'}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      style={{ paddingRight: 46 }}
      required={required}
      autoComplete={autoComplete}
    />
    {value && (
      <button type="button" className="pwd-eye-btn" aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onClick={onToggle}>
        <EyeIcon visible={visible} />
      </button>
    )}
  </div>
);

const LoginPage = ({ onLogin }) => {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [otpStep, setOtpStep] = useState(false);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetPwd, setResetPwd] = useState('');
  const [resetConfirmPwd, setResetConfirmPwd] = useState('');
  const [demoOtp, setDemoOtp] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [showResetPwd, setShowResetPwd] = useState(false);
  const [showResetConfirmPwd, setShowResetConfirmPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  const notify = (nextToast) => setToast({ duration: 3600, ...nextToast });

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) return setError('Vui lòng điền đầy đủ thông tin!');

    setLoading(true);
    try {
      const response = await axiosClient.post('/login', {
        email: email,
        password: password
      });

      localStorage.setItem('token', response.token); 
      setLoading(false);
      onLogin({ ...response.user, isVerified: true });
      navigate('/');
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || 'Lỗi kết nối đến máy chủ!');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (!displayName.trim()) return setError('Vui lòng nhập tên hiển thị!');
    if (!email) return setError('Vui lòng nhập email!');
    if (password.length < 6) return setError('Mật khẩu tối thiểu 6 ký tự!');
    if (password !== confirmPwd) return setError('Mật khẩu xác nhận không khớp!');
    
    setLoading(true);
    try {
      const response = await axiosClient.post('/register', {
        name: displayName.trim(),
        email: email,
        password: password,
        password_confirmation: confirmPwd 
      });
      setLoading(false);
      notify({ type: 'success', title: 'Thành công', message: response.message });
      switchMode('login');
      setPassword(''); 
      setConfirmPwd('');
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || 'Email này đã tồn tại hoặc có lỗi xảy ra!');
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setError('');

    if (!otpStep) {
      if (!email) return setError('Vui lòng nhập email đã đăng ký!');
      setLoading(true);
      try {
        const response = await axiosClient.post('/forgot-password/send-otp', { email });
        setLoading(false);
        setOtpStep(true);
        notify({ type: 'success', title: 'Thành công', message: response.message || 'Mã OTP đã được gửi vào email của bạn!' });
      } catch (err) {
        setLoading(false);
        setError(err.response?.data?.message || 'Email không tồn tại trong hệ thống! hoặc chưa xác thực');
      }
      return;
    }

    if (!resetOtp.trim()) return setError('Vui lòng nhập mã OTP!');
    if (resetPwd.length < 6) return setError('Mật khẩu mới tối thiểu 6 ký tự!');
    if (resetPwd !== resetConfirmPwd) return setError('Mật khẩu xác nhận không khớp!');

    setLoading(true);
    try {
      const response = await axiosClient.post('/forgot-password/reset', {
        email: email,
        otp: resetOtp,
        password: resetPwd
      });
      setLoading(false);
      notify({ type: 'success', title: 'Thành công', message: response.message || 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.' });
      setTimeout(() => switchMode('login'), 1500);
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || 'Mã OTP không hợp lệ hoặc đã hết hạn!');
    }
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError('');
    setOtpStep(false);
    setResetOtp('');
    setResetPwd('');
    setResetConfirmPwd('');
    setDemoOtp('');
    setShowPwd(false);
    setShowConfirmPwd(false);
    setShowResetPwd(false);
    setShowResetConfirmPwd(false);
  };

  return (
    <div className="login-page">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <div className="login-left">
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div className="login-brand-icon">📝</div>
          <div className="login-brand-name">TakeNote</div>
          <div className="login-brand-tagline">
            Quản lý ghi chú thông minh — mọi lúc, mọi nơi, trên mọi thiết bị
          </div>
          <div className="login-features">
            {[
              ['🔒', 'Bảo mật từng ghi chú riêng biệt'],
              ['🤝', 'Chia sẻ & cộng tác realtime'],
              ['📱', 'Offline PWA — dùng không cần mạng'],
              ['🏷️', 'Phân loại nhãn thông minh'],
            ].map(([icon, text]) => (
              <div className="login-feature" key={text}>
                <div className="login-feature-icon">{icon}</div>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-form-container">
          {mode === 'forgot' && (
            <>
              <div style={{ marginBottom: 28 }}>
                <button onClick={() => switchMode('login')}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 20 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
                  Quay lại đăng nhập
                </button>
                <div className="login-form-title">Khôi phục mật khẩu</div>
                <div className="login-form-sub">
                  {otpStep ? 'Nhập OTP và mật khẩu mới' : 'Nhập email để nhận mã OTP'}
                </div>
              </div>
              {error && <div className="form-error form-alert" style={{ marginBottom: 16 }}>⚠️ {error}</div>}
              <form onSubmit={handleForgot}>
                <div className="form-group">
                  <label className="form-label">Email đã đăng ký</label>
                  <input className="form-input" type="email" placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} required disabled={otpStep || loading} />
                </div>
                {otpStep && <>
                  <div className="form-group">
                    <label className="form-label">Mã OTP (6 chữ số)</label>
                    <input className="form-input otp-input" type="text" inputMode="numeric" placeholder="123456" maxLength={6} value={resetOtp} onChange={e => setResetOtp(e.target.value.replace(/\D/g, ''))} required disabled={loading} />
                    <div className="form-helper">Vui lòng kiểm tra hộp thư đến (hoặc thư rác) trong Gmail của bạn.</div>
                    {demoOtp && (
                      <div className="otp-demo-card">
                        <span>Mã OTP demo</span>
                        <code>{demoOtp}</code>
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mật khẩu mới</label>
                    <PasswordInput value={resetPwd} onChange={e => setResetPwd(e.target.value)} visible={showResetPwd} onToggle={() => setShowResetPwd(v => !v)} placeholder="Tối thiểu 6 ký tự" autoComplete="new-password" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Xác nhận mật khẩu mới</label>
                    <PasswordInput value={resetConfirmPwd} onChange={e => setResetConfirmPwd(e.target.value)} visible={showResetConfirmPwd} onToggle={() => setShowResetConfirmPwd(v => !v)} placeholder="Nhập lại mật khẩu" autoComplete="new-password" />
                  </div>
                </>}
                <button type="submit" className="btn btn-primary btn-full btn-lg" style={{ marginTop: 4 }} disabled={loading}>
                  {loading ? '⏳ Đang xử lý...' : (otpStep ? '💾 Đặt lại mật khẩu' : '📧 Gửi mã OTP')}
                </button>
              </form>
            </>
          )}

          {mode === 'register' && (
            <>
              <div style={{ marginBottom: 28 }}>
                <div className="login-form-title">Tạo tài khoản mới</div>
                <div className="login-form-sub">Tham gia TakeNote miễn phí ngay hôm nay</div>
              </div>
              {error && <div className="form-error form-alert" style={{ marginBottom: 16 }}>⚠️ {error}</div>}
              <form onSubmit={handleRegister}>
                <div className="form-group">
                  <label className="form-label">Tên hiển thị</label>
                  <input className="form-input" type="text" placeholder="Nguyễn Văn A" value={displayName} onChange={e => setDisplayName(e.target.value)} required disabled={loading} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} required disabled={loading} />
                </div>
                <div className="form-group">
                  <label className="form-label">Mật khẩu</label>
                  <PasswordInput value={password} onChange={e => setPassword(e.target.value)} visible={showPwd} onToggle={() => setShowPwd(v => !v)} placeholder="Tối thiểu 6 ký tự" autoComplete="new-password" />
                </div>
                <div className="form-group">
                  <label className="form-label">Xác nhận mật khẩu</label>
                  <PasswordInput value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} visible={showConfirmPwd} onToggle={() => setShowConfirmPwd(v => !v)} placeholder="Nhập lại mật khẩu" autoComplete="new-password" />
                </div>
                <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: 4 }}>
                  {loading ? '⏳ Đang xử lý...' : '✅ Đăng ký'}
                </button>
              </form>
              <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-muted)' }}>
                Đã có tài khoản?{' '}
                <button onClick={() => switchMode('login')} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>Đăng nhập</button>
              </div>
            </>
          )}

          {mode === 'login' && (
            <>
              <div style={{ marginBottom: 28 }}>
                <div className="login-form-title">Chào mừng trở lại! 👋</div>
                <div className="login-form-sub">Đăng nhập vào tài khoản TakeNote của bạn</div>
              </div>
              {error && <div className="form-error form-alert" style={{ marginBottom: 16 }}>⚠️ {error}</div>}
              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} required autoFocus autoComplete="email" disabled={loading} />
                </div>
                <div className="form-group">
                  <label className="form-label">Mật khẩu</label>
                  <PasswordInput value={password} onChange={e => setPassword(e.target.value)} visible={showPwd} onToggle={() => setShowPwd(v => !v)} placeholder="••••••••" autoComplete="current-password" />
                </div>
                <div style={{ textAlign: 'right', marginTop: -8, marginBottom: 16 }}>
                  <button type="button" onClick={() => switchMode('forgot')} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Quên mật khẩu?</button>
                </div>
                <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                  {loading ? '⏳ Đang đăng nhập...' : '🔑 Đăng nhập'}
                </button>
              </form>
              <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-muted)' }}>
                Chưa có tài khoản?{' '}
                <button onClick={() => switchMode('register')} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>Đăng ký miễn phí</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;