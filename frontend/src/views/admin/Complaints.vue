<template>
  <div class="admin-page">
    <div class="page-header">
      <h2><i class="fas fa-exclamation-triangle"></i> Shikoyat va takliflar</h2>
      <button @click="loadComplaints" class="refresh-btn"><i class="fas fa-sync-alt"></i> Yangilash</button>
    </div>

    <div class="table-container glass">
      <table class="admin-table">
        <thead>
          <tr>
            <th>F.I.O</th>
            <th>Kontakt</th>
            <th>Xabar / Shikoyat</th>
            <th>Vaqt</th>
            <th>Holat</th>
            <th>Amallar</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="comp in complaints" :key="comp.id">
            <td><strong>{{ comp.full_name || 'Anonim' }}</strong></td>
            <td>{{ comp.contact || 'Noma\'lum' }}</td>
            <td class="msg-text">{{ comp.message }}</td>
            <td class="date-col">{{ formatFullDate(comp.created_at) }}</td>
            <td>
              <span :class="['status-badge', comp.status]">
                {{ formatStatus(comp.status) }}
              </span>
            </td>
            <td>
              <div class="action-row">
                <button v-if="comp.status === 'new'" @click="updateStatus(comp.id, 'seen')" class="btn-sm" title="O'qildi deb belgilash"><i class="fas fa-check"></i></button>
                <button v-if="comp.status !== 'resolved'" @click="updateStatus(comp.id, 'resolved')" class="btn-sm success" title="Yopish"><i class="fas fa-check-double"></i></button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="loading" class="loader">Yuklanmoqda...</div>
      <div v-if="!loading && complaints.length === 0" class="no-data">Hozircha shikoyatlar yo'q.</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const complaints = ref([]);
const loading = ref(false);

const loadComplaints = async () => {
  loading.value = true;
  try {
    const token = localStorage.getItem('admin_token');
    const res = await axios.get('/api/admin/complaints', {
        headers: { Authorization: `Bearer ${token}` }
    });
    complaints.value = res.data;
  } catch (e) {
    console.error('Shikoyatlarni yuklashda xato:', e);
  } finally {
    loading.value = false;
  }
};

const updateStatus = async (id, status) => {
  try {
    const token = localStorage.getItem('admin_token');
    await axios.post(`/api/admin/complaints/${id}/status`, 
      { status },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    loadComplaints();
  } catch (e) {
    alert('Holatni yangilashda xato yuz berdi');
  }
};

const formatFullDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleString();
};

const formatStatus = (status) => {
  const map = { 'new': 'Yangi', 'seen': 'O\'qildi', 'resolved': 'Yopildi' };
  return map[status] || status;
};

onMounted(loadComplaints);
</script>

<style scoped>
.admin-page { animation: fadeIn 0.5s ease; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.refresh-btn { background: rgba(0, 198, 255, 0.1); border: 1px solid rgba(0, 198, 255, 0.3); color: #00c6ff; padding: 0.6rem 1.2rem; border-radius: 8px; cursor: pointer; }
.table-container { border-radius: 15px; overflow: hidden; padding: 1rem; }
.admin-table { width: 100%; border-collapse: collapse; }
.admin-table th { text-align: left; padding: 1.2rem; color: rgba(255,255,255,0.5); font-size: 0.85rem; border-bottom: 1px solid rgba(255,255,255,0.05); }
.admin-table td { padding: 1.2rem; font-size: 0.9rem; border-bottom: 1px solid rgba(255,255,255,0.03); }
.msg-text { max-width: 400px; line-height: 1.4; color: rgba(255,255,255,0.9); }
.date-col { font-size: 0.8rem; color: rgba(255,255,255,0.6); }

.status-badge { padding: 4px 10px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
.status-badge.new { background: rgba(255, 82, 82, 0.2); color: #ff5252; }
.status-badge.seen { background: rgba(255, 215, 0, 0.2); color: #ffd700; }
.status-badge.resolved { background: rgba(0, 255, 170, 0.2); color: #00ffaa; }

.action-row { display: flex; gap: 8px; }
.btn-sm { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 6px 10px; border-radius: 4px; cursor: pointer; }
.btn-sm:hover { background: #00c6ff; border-color: #00c6ff; }
.btn-sm.success:hover { background: #00ffaa; border-color: #00ffaa; color: #000; }

.loader, .no-data { text-align: center; padding: 3rem; color: rgba(255,255,255,0.5); }

@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>
