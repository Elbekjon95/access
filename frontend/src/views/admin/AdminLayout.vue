<template>
  <div class="admin-layout">
    <aside class="sidebar">
      <div class="sidebar-logo">
        ACCSESS <span>ADMIN</span>
      </div>
      <nav class="sidebar-nav">
        <router-link to="/admin" class="nav-item" active-class="active">
          <i class="fas fa-chart-line"></i> Dashboard
        </router-link>
        <router-link to="/admin/chats" class="nav-item" active-class="active">
          <i class="fas fa-comments"></i> Chatlar
        </router-link>
        <router-link to="/admin/map" class="nav-item" active-class="active">
          <i class="fas fa-map-marked-alt"></i> Harita tahriri
        </router-link>
        <router-link to="/admin/complaints" class="nav-item" active-class="active">
          <i class="fas fa-exclamation-triangle"></i> Shikoyatlar
        </router-link>
        <router-link to="/admin/users" class="nav-item" active-class="active">
          <i class="fas fa-users-cog"></i> Adminlar
        </router-link>
      </nav>
      <div class="sidebar-footer">
        <router-link to="/" class="kiosk-btn">
          <i class="fas fa-desktop"></i> Kioskga o'tish
        </router-link>
        <button @click="logout" class="logout-btn">
          <i class="fas fa-sign-out-alt"></i> Chiqish
        </button>
      </div>
    </aside>
    
    <main class="content-area">
      <header class="top-header">
        <div class="breadcrumb">Bosh sahifa / {{ currentRouteName }}</div>
        <div class="user-info">
          <div class="user-text">
             <span class="user-name">{{ user.full_name || 'Administrator' }}</span>
             <span class="user-role">{{ user.role || 'Admin' }}</span>
          </div>
          <img :src="`https://ui-avatars.com/api/?name=${user.full_name}&background=00c6ff&color=fff`" alt="Avatar">
        </div>
      </header>
      <section class="page-content">
        <router-view />
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();
const user = ref({});

const currentRouteName = computed(() => {
    return route.name || 'Dashboard';
});

const logout = () => {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_user');
  router.push('/admin/login');
};

onMounted(() => {
    const userData = localStorage.getItem('admin_user');
    if (userData) user.value = JSON.parse(userData);
});
</script>

<style scoped>
.admin-layout { display: flex; height: 100vh; background: #050a14; color: #fff; overflow: hidden; }
.sidebar { width: 260px; background: rgba(255,255,255,0.03); border-right: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column; }
.sidebar-logo { padding: 2rem; font-family: 'Orbitron', sans-serif; font-size: 1.4rem; font-weight: bold; }
.sidebar-logo span { color: #00c6ff; font-size: 0.8rem; display: block; }
.sidebar-nav { flex: 1; padding: 1rem; }
.nav-item { display: flex; align-items: center; padding: 0.8rem 1.2rem; color: rgba(255,255,255,0.6); text-decoration: none; border-radius: 8px; margin-bottom: 0.5rem; transition: 0.3s; }
.nav-item i { margin-right: 12px; width: 20px; text-align: center; }
.nav-item:hover, .nav-item.active { background: rgba(0, 198, 255, 0.1); color: #00c6ff; }
.sidebar-footer { padding: 1.5rem; border-top: 1px solid rgba(255,255,255,0.05); }
.logout-btn { width: 100%; padding: 0.8rem; background: rgba(255, 82, 82, 0.1); border: 1px solid rgba(255, 82, 82, 0.2); color: #ff5252; border-radius: 8px; cursor: pointer; transition: 0.3s; }
.logout-btn:hover { background: #ff5252; color: #fff; }

.kiosk-btn { 
    display: flex; align-items: center; justify-content: center; gap: 10px;
    width: 100%; padding: 0.8rem; background: rgba(0, 198, 255, 0.1); 
    border: 1px solid rgba(0, 198, 255, 0.2); color: #00c6ff; 
    border-radius: 8px; text-decoration: none; margin-bottom: 0.8rem;
    font-size: 0.9rem; font-weight: 500; transition: 0.3s;
}
.kiosk-btn:hover { background: #00c6ff; color: #fff; }
.content-area { flex: 1; display: flex; flex-direction: column; overflow-y: auto; }
.top-header { height: 70px; padding: 0 2rem; display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.02); border-bottom: 1px solid rgba(255,255,255,0.05); position: sticky; top: 0; z-index: 10; }
.user-info { display: flex; align-items: center; gap: 12px; }
.user-text { text-align: right; display: flex; flex-direction: column; }
.user-name { font-weight: 600; font-size: 0.95rem; }
.user-role { font-size: 0.75rem; color: #00c6ff; opacity: 0.8; }
.user-info img { width: 38px; height: 38px; border-radius: 50%; border: 2px solid #00c6ff; }
.page-content { flex: 1; padding: 2rem; display: flex; flex-direction: column; min-height: 0; }
</style>
