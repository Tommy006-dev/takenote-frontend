import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('Đang tiến hành xác thực tài khoản của bạn...');
  const navigate = useNavigate();

  useEffect(() => {
    const backendUrl = searchParams.get('url');
    if (!backendUrl) {
      setStatus('error');
      setMessage('Đường dẫn xác thực thiếu thông số, vui lòng kiểm tra lại thư Gmail!');
      return;
    }

    // Gửi cái url mã hóa nhận được lên API Laravel xử lý
    axiosClient.post('/email/verify-api', { url: backendUrl })
      .then(res => {
        if (res.success) {
          setStatus('success');
          setMessage('Chúc mừng! Tài khoản của bạn đã được kích hoạt thành công.');
        } else {
          setStatus('error');
          setMessage(res.message);
        }
      })
      .catch(err => {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Có lỗi xảy ra trong quá trình kích hoạt.');
      });
  }, [searchParams]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg)' }}>
      <div className="card" style={{ padding: 30, textAlign: 'center', maxWidth: 450, borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>
          {status === 'loading' ? '⏳' : status === 'success' ? '✅' : '❌'}
        </div>
        <h2 style={{ marginBottom: 10, color: 'var(--text)' }}>
          {status === 'loading' ? 'Đang xác thực' : status === 'success' ? 'Thành công!' : 'Thất bại'}
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>{message}</p>
        
        {status !== 'loading' && (
          <button className="btn btn-primary" onClick={() => navigate('/login')}>Quay lại trang Đăng nhập</button>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;