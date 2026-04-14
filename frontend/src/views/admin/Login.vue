<template>
  <div class="login-container">
    <div class="login-box glass">
      <div class="logo">ACCSESS <span>ADMIN</span></div>
      <form @submit.prevent="handleLogin">
        <div class="input-group">
          <label>Login</label>
          <input v-model="username" type="text" placeholder="Admin username" required>
        </div>
        <div class="input-group">
          <label>Parol</label>
          <input v-model="password" type="password" placeholder="••••••••" required>
        </div>
        <button type="submit" :disabled="loading" class="login-btn">
          {{ loading ? 'Kirilmoqda...' : 'Kirish' }}
        </button>
        <p v-if="error" class="error-msg">{{ error }}</p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';

const router = useRouter();
const username = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

const handleLogin = async () => {
  loading.value = true;
  error.value = '';
  
  try {
    const res = await axios.post('/api/admin/login', {
        username: username.value,
        password: password.value
    });
    
    // Tokenni saqlash
    localStorage.setItem('admin_token', res.data.token);
    localStorage.setItem('admin_user', JSON.stringify(res.data.user));
    
    // Asosiy dashboardga o'tish
    router.push('/admin');
  } catch (e) {
    error.value = e.response?.data?.error || 'Kirishda xatolik yuz berdi';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.login-container {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at center, #101a30 0%, #050a14 100%);
}
.login-box {
  width: 100%;
  max-width: 400px;
  padding: 3rem;
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.1);
  text-align: center;
}
.logo { font-family: 'Orbitron', sans-serif; font-size: 2rem; color: #fff; margin-bottom: 2rem; }
.logo span { color: #00c6ff; font-size: 1.2rem; display: block; letter-spacing: 5px; }
.input-group { text-align: left; margin-bottom: 1.5rem; }
.input-group label { display: block; color: rgba(255,255,255,0.7); margin-bottom: 0.5rem; font-size: 0.9rem; }
.input-group input { width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 0.8rem 1rem; border-radius: 8px; color: #fff; outline: none; }
.login-btn { width: 100%; padding: 1rem; background: linear-gradient(45deg, #0072ff, #00c6ff); border: none; border-radius: 8px; color: #fff; font-weight: 600; cursor: pointer; }
.error-msg { color: #ff5252; margin-top: 1rem; font-size: 0.9rem; }
</style>
