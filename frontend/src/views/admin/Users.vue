<template>
  <div class="admin-page">
    <div class="page-header">
      <h2><i class="fas fa-users-cog"></i> Tizim adminlari</h2>
      <button class="add-user-btn" @click="showModal = true"><i class="fas fa-user-plus"></i> Yangi admin</button>
    </div>

    <div class="table-container glass">
      <table class="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>F.I.O</th>
            <th>Username</th>
            <th>Role</th>
            <th>Qo'shilgan vaqti</th>
            <th>Amallar</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td>#{{ user.id }}</td>
            <td><strong>{{ user.full_name }}</strong></td>
            <td><code>{{ user.username }}</code></td>
            <td><span class="role-badge">{{ user.role }}</span></td>
            <td class="date-col">{{ formatFullDate(user.created_at) }}</td>
            <td>
              <div class="action-row">
                <button class="btn-sm" title="Tahrirlash"><i class="fas fa-edit"></i></button>
                <button 
                  class="btn-sm danger" 
                  v-if="user.username !== 'admin'" 
                  @click="deleteUser(user.id)"
                  title="O'chirish"
                >
                  <i class="fas fa-trash-alt"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Yangi admin qo'shish modali -->
    <div v-if="showModal" class="modal-overlay">
      <div class="modal glass">
        <h3>Yangi admin qo'shish</h3>
        <form @submit.prevent="addUser">
          <div class="form-group">
            <label>F.I.O</label>
            <input v-model="newUser.full_name" type="text" placeholder="Ism familiya..." required>
          </div>
          <div class="form-group">
            <label>Username</label>
            <input v-model="newUser.username" type="text" placeholder="Login..." required>
          </div>
          <div class="form-group">
            <label>Parol</label>
            <input v-model="newUser.password" type="password" placeholder="Maxfiy kod..." required>
          </div>
          <div class="modal-actions">
            <button type="button" @click="showModal = false" class="btn-cancel">Bekor qilish</button>
            <button type="submit" class="btn-save">Saqlash</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const users = ref([]);
const showModal = ref(false);
const newUser = ref({ full_name: '', username: '', password: '', role: 'admin' });

const loadUsers = async () => {
    try {
        const token = localStorage.getItem('admin_token');
        const res = await axios.get('/api/admin/users', {
            headers: { Authorization: `Bearer ${token}` }
        });
        users.value = res.data;
    } catch (e) {
        console.error('Foydalanuvchilarni yuklashda xato:', e);
    }
};

const addUser = async () => {
    try {
        const token = localStorage.getItem('admin_token');
        await axios.post('/api/admin/users', newUser.value, {
            headers: { Authorization: `Bearer ${token}` }
        });
        showModal.value = false;
        newUser.value = { full_name: '', username: '', password: '', role: 'admin' };
        loadUsers();
    } catch (e) {
        alert('Xato: ' + (e.response?.data?.error || e.message));
    }
};

const deleteUser = async (id) => {
    if (!confirm('Ushbu adminni o\'chirishga ishonchingiz komilmi?')) return;
    try {
        const token = localStorage.getItem('admin_token');
        await axios.delete(`/api/admin/users/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        loadUsers();
    } catch (e) {
        alert('O\'chirishda xato: ' + (e.response?.data?.error || e.message));
    }
};

const formatFullDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString();
};

onMounted(loadUsers);
</script>

<style scoped>
.admin-page { animation: fadeIn 0.5s ease; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.add-user-btn { background: #00c6ff; border: none; color: #fff; padding: 0.8rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; transition: 0.3s; }
.add-user-btn:hover { background: #0072ff; transform: scale(1.05); }

.table-container { border-radius: 15px; overflow: hidden; padding: 1rem; }
.admin-table { width: 100%; border-collapse: collapse; }
.admin-table th { text-align: left; padding: 1.2rem; color: rgba(255,255,255,0.5); font-size: 0.85rem; border-bottom: 1px solid rgba(255,255,255,0.05); }
.admin-table td { padding: 1.2rem; font-size: 0.9rem; border-bottom: 1px solid rgba(255,255,255,0.03); }

.role-badge { background: rgba(0, 198, 255, 0.1); color: #00c6ff; padding: 4px 10px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; text-transform: uppercase; }
.date-col { font-size: 0.8rem; color: rgba(255,255,255,0.6); }

.action-row { display: flex; gap: 8px; }
.btn-sm { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 6px 10px; border-radius: 4px; cursor: pointer; }
.btn-sm.danger:hover { background: #ff5252; border-color: #ff5252; }

/* Modal Styles */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { width: 400px; padding: 2rem; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); }
.modal h3 { margin-bottom: 1.5rem; }
.form-group { margin-bottom: 1.2rem; }
.form-group label { display: block; margin-bottom: 0.5rem; font-size: 0.9rem; color: rgba(255,255,255,0.7); }
.form-group input { width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 0.8rem; border-radius: 8px; }

.modal-actions { display: flex; gap: 10px; margin-top: 2rem; }
.btn-cancel { flex: 1; background: none; border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 0.8rem; border-radius: 8px; cursor: pointer; }
.btn-save { flex: 1; background: #00ffaa; border: none; color: #000; font-weight: bold; padding: 0.8rem; border-radius: 8px; cursor: pointer; }

@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>
