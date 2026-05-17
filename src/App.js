import VerifyEmail from './components/VerifyEmail';
import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';

const DEFAULT_USER = { name: 'Người dùng', email: '', isVerified: false };

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('nf_userInfo')) || DEFAULT_USER;
  } catch {
    return DEFAULT_USER;
  }
};

function App() {
  const [isAuthenticated, setAuthState] = useState(() => localStorage.getItem('nf_auth') === '1');
  const [userInfo, setUserInfoState] = useState(readStoredUser);
  const [theme, setTheme] = useState(() => localStorage.getItem('nf_theme') || 'light');
  // The font size control was removed from the UI; notes now use the large readable size by default.
  const [fontSize, setFontSize] = useState('large');

  useEffect(() => {
    localStorage.setItem('nf_theme', theme);
    localStorage.setItem('nf_fontSize', fontSize);
    document.body.className = [
      theme === 'dark' ? 'dark-mode' : '',
      `font-${fontSize || 'large'}`
    ].filter(Boolean).join(' ');
  }, [theme, fontSize]);

  const setIsAuthenticated = useCallback((next) => {
    setAuthState(Boolean(next));
    localStorage.setItem('nf_auth', next ? '1' : '0');
  }, []);

  const setUserInfo = useCallback((nextUser) => {
    setUserInfoState(prev => {
      const resolved = typeof nextUser === 'function' ? nextUser(prev) : nextUser;
      const safeUser = { ...DEFAULT_USER, ...resolved };
      localStorage.setItem('nf_userInfo', JSON.stringify(safeUser));
      return safeUser;
    });
  }, []);

  const handleLogin = useCallback((user) => {
    setUserInfo(user);
    setIsAuthenticated(true);
  }, [setIsAuthenticated, setUserInfo]);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <LoginPage onLogin={handleLogin} /> : <Navigate to="/" replace />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/" element={isAuthenticated
          ? <HomePage setIsAuthenticated={setIsAuthenticated} userInfo={userInfo} theme={theme} setTheme={setTheme} fontSize={fontSize} setFontSize={setFontSize} />
          : <Navigate to="/login" replace />}
        />
        <Route path="/profile" element={isAuthenticated
          ? <ProfilePage setIsAuthenticated={setIsAuthenticated} userInfo={userInfo} setUserInfo={setUserInfo} theme={theme} setTheme={setTheme} fontSize={fontSize} setFontSize={setFontSize} />
          : <Navigate to="/login" replace />}
        />
        <Route path="*" element={<Navigate to={isAuthenticated ? '/' : '/login'} replace />} />
      </Routes>
    </Router>
  );
}

export default App;
