import axios from 'axios';

const axiosClient = axios.create({
    // Đổi port 8000 thành port mà Laravel của bạn đang chạy
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api', 
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

// Thêm Interceptors (Tùy chọn nâng cao)
// Dùng để tự động đính kèm Token đăng nhập vào mỗi request sau này
axiosClient.interceptors.request.use(async (config) => {
    const token = localStorage.getItem('token'); // Lấy token từ LocalStorage
    if (token) {
        config.headers.Authorization = `Bearer ${token}`; // Đính kèm token
    }

    if (window.Echo && window.Echo.socketId()) {
    config.headers['X-Socket-ID'] = window.Echo.socketId();
  }
    return config;
});

axiosClient.interceptors.response.use((response) => {
    if (response && response.data) {
        return response.data;
    }
    return response;
}, (error) => {
    // Xử lý lỗi chung tại đây (ví dụ: văng ra trang login nếu lỗi 401)
    throw error;
});

export default axiosClient;
