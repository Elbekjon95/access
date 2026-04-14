<template>
  <div class="admin-page">
    <div class="page-header">
      <h2><i class="fas fa-comments"></i> Mijozlar bilan suhbatlar</h2>
      <button @click="loadChats" class="refresh-btn"><i class="fas fa-sync-alt"></i> Yangilash</button>
    </div>

    <div class="table-container glass">
      <table class="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Vaqt</th>
            <th>Mijoz savoli</th>
            <th>Sun'iy Intellekt javobi</th>
            <th>Til</th>
            <th>Amallar</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="chat in chats" :key="chat.id">
            <td>#{{ chat.id }}</td>
            <td class="date-col">{{ formatFullDate(chat.created_at) }}</td>
            <td class="msg-text">{{ chat.user_message }}</td>
            <td class="msg-text">{{ chat.ai_response }}</td>
            <td><span class="lang-badge">{{ chat.language }}</span></td>
            <td>
              <button class="icon-btn" title="Batafsil"><i class="fas fa-eye"></i></button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="loading" class="loader">Yuklanmoqda...</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const chats = ref([]);
const loading = ref(false);

const loadChats = async () => {
  loading.value = true;
  try {
    const token = localStorage.getItem('admin_token');
    const res = await axios.get('/api/admin/chats', {
        headers: { Authorization: `Bearer ${token}` }
    });
    chats.value = res.data;
  } catch (e) {
    console.error('Chatlarni yuklashda xato:', e);
  } finally {
    loading.value = false;
  }
};

const formatFullDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleString();
};

onMounted(loadChats);
</script>

<style scoped>
.admin-page {
  animation: fadeIn 0.5s ease;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.refresh-btn {
  background: rgba(0, 198, 255, 0.1);
  border: 1px solid rgba(0, 198, 255, 0.3);
  color: #00c6ff;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  cursor: pointer;
  transition: 0.3s;
}

.refresh-btn:hover {
  background: #00c6ff;
  color: #fff;
}

.table-container {
  border-radius: 15px;
  overflow: hidden;
  padding: 1rem;
}

.admin-table {
  width: 100%;
  border-collapse: collapse;
}

.admin-table th {
  text-align: left;
  padding: 1.2rem;
  color: rgba(255,255,255,0.5);
  font-size: 0.85rem;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.admin-table td {
  padding: 1.2rem;
  font-size: 0.9rem;
  border-bottom: 1px solid rgba(255,255,255,0.03);
  vertical-align: top;
}

.date-col { font-size: 0.8rem; color: rgba(255,255,255,0.6); }

.msg-text {
  max-width: 300px;
  line-height: 1.4;
}

.lang-badge {
  background: rgba(255,255,255,0.05);
  padding: 4px 10px;
  border-radius: 4px;
  text-transform: uppercase;
  font-size: 0.75rem;
}

.icon-btn {
  background: none;
  border: none;
  color: #00c6ff;
  cursor: pointer;
}

.loader { text-align: center; padding: 2rem; }

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
