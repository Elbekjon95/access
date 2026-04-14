<template>
  <div class="login-container">
    <div class="login-box glass">
      <div class="logo">ACCSESS <span>BOOTSTRAP</span></div>
      <p class="intro">Bazada foydalanuvchilar yo'q. Birinchi admin sifatida ro'yxatdan o'ting.</p>
      <form @submit.prevent="handleRegister">
        <div class="input-group">
          <label>To'liq ismingiz</label>
          <input v-model="form.full_name" type="text" placeholder="Ism familiya..." required>
        </div>
        <div class="input-group">
          <label>Login (Username)</label>
          <input v-model="form.username" type="text" placeholder="Admin loginini tanlang" required>
        </div>
        <div class="input-group">
          <label>Parol</label>
          <input v-model="form.password" type="password" placeholder="••••••••" required>
        </div>
        <button type="submit" :disabled="loading" class="login-btn">
          {{ loading ? 'Yaratilmoqda...' : 'Adminni yaratish' }}
        </button>
        <p v-if="error" class="error-msg">{{ error }}</p>
        <p v-if="success" class="success-msg">Admin muvaffaqiyatli yaratildi! Endi kirishingiz mumkin.</p>
      </form>
      <router-link v-if="success" to="/admin/login" class="back-link">Login sahifasiga o'tish</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import axios from 'axios';

const form = ref({ full_name: '', username: '', password: '', role: 'admin' });
const loading = ref(false);
const error = ref('');
const success = ref(false);

const handleRegister = async () => {
    loading.value = true;
    error.value = '';
    try {
        await axios.post('/api/admin/users', form.value);
        success.value = true;
    } catch (e) {
        error.value = e.response?.data?.error || 'Ro\'yxatdan o\'tishda xatolik yuz berdi. Balki baza allaqachon to\'ldirilgan?';
    } finally {
        loading.value = false;
    }
};
</script>

<style scoped>
.login-container { height: 100vh; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at center, #101a30 0%, #050a14 100%); }
.login-box { width: 100%; max-width: 400px; padding: 3rem; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); text-align: center; }
.logo { font-family: 'Orbitron', sans-serif; font-size: 2rem; color: #fff; margin-bottom: 1rem; }
.logo span { color: #00ffaa; font-size: 1rem; display: block; letter-spacing: 5px; }
.intro { color: rgba(255,255,255,0.6); font-size: 0.9rem; margin-bottom: 2rem; }
.input-group { text-align: left; margin-bottom: 1.5rem; }
.input-group label { display: block; color: rgba(255,255,255,0.7); margin-bottom: 0.5rem; font-size: 0.9rem; }
.input-group input { width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 0.8rem 1rem; border-radius: 8px; color: #fff; outline: none; }
.login-btn { width: 100%; padding: 1rem; background: #00ffaa; color: #000; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
.login-btn:disabled { opacity: 0.5; }
.error-msg { color: #ff5252; margin-top: 1rem; font-size: 0.9rem; }
.success-msg { color: #00ffaa; margin-top: 1rem; font-size: 0.9rem; }
.back-link { display: block; margin-top: 1.5rem; color: #00c6ff; text-decoration: none; font-size: 0.9rem; }
</style>
