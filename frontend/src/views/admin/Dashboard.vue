<template>
  <div class="dashboard-grid">
    <div class="stat-card glass">
      <div class="icon" style="color: #00c6ff;"><i class="fas fa-comments"></i></div>
      <div class="info">
        <h3>Jami savollar</h3>
        <p class="value">{{ stats.total_chats || 0 }}</p>
        <span class="trend">Barcha silsila</span>
      </div>
    </div>
    <div class="stat-card glass">
      <div class="icon" style="color: #ff5252;"><i class="fas fa-exclamation-circle"></i></div>
      <div class="info">
        <h3>Yangi shikoyatlar</h3>
        <p class="value">{{ stats.new_complaints || 0 }}</p>
        <span class="trend">Ko'rib chiqilmagan</span>
      </div>
    </div>
    <div class="stat-card glass">
      <div class="icon" style="color: #ffd700;"><i class="fas fa-users-cog"></i></div>
      <div class="info">
        <h3>Adminlar</h3>
        <p class="value">{{ stats.total_users || 0 }}</p>
        <span class="trend">Tizimda</span>
      </div>
    </div>
    <div class="stat-card glass">
      <div class="icon" style="color: #00ffaa;"><i class="fas fa-bolt"></i></div>
      <div class="info">
        <h3>Tizim holati</h3>
        <p class="value">Online</p>
        <span class="trend">Node.js API</span>
      </div>
    </div>

    <!-- Infografika va Live Feed -->
    <div class="chart-container glass">
      <h3>Muloqotlar statistikasi (Oxirgi 7 kun)</h3>
      <div class="canvas-wrap">
        <canvas id="chatsChart"></canvas>
      </div>
    </div>

    <div class="chart-container glass" style="grid-column: span 3;">
      <h3>So'nggi suhbatlar (Live Feed)</h3>
      <div class="recent-table-wrap">
        <table class="recent-table">
          <thead>
            <tr>
              <th>Vaqt</th>
              <th>Mijoz</th>
              <th>Javob</th>
              <th>Til</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="chat in stats.recent_chats" :key="chat.id">
              <td>{{ formatDate(chat.created_at) }}</td>
              <td class="msg-cut">{{ chat.user_message }}</td>
              <td class="msg-cut">{{ chat.ai_response }}</td>
              <td><span class="lang-tag">{{ chat.language }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="recent-list glass" style="grid-column: span 1;">
      <h3>Xavfsizlik</h3>
      <div class="security-info">
        <p><i class="fas fa-shield-alt"></i> JWT xavfsizligi faol</p>
        <p><i class="fas fa-lock"></i> SSL (Staging)</p>
        <p><i class="fas fa-database"></i> Postgres Live</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import axios from 'axios';

const stats = ref({
  total_chats: 0,
  new_complaints: 0,
  total_users: 0,
  recent_chats: [],
  daily_stats: []
});

let myChart = null;

const loadStats = async () => {
  try {
    const token = localStorage.getItem('admin_token');
    const res = await axios.get('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` }
    });
    stats.value = res.data;
    
    // Grafikni yangilash
    await nextTick();
    renderChart();
  } catch (e) {
    console.error('Statistika yuklanmadi', e);
  }
};

const renderChart = () => {
    const ctx = document.getElementById('chatsChart');
    if (!ctx || !stats.value.daily_stats.length) return;

    if (myChart) myChart.destroy();

    const labels = stats.value.daily_stats.map(s => s.date);
    const data = stats.value.daily_stats.map(s => s.count);

    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Kunlik savollar',
                data: data,
                borderColor: '#00c6ff',
                backgroundColor: 'rgba(0, 198, 255, 0.1)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#00c6ff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: 'rgba(255,255,255,0.5)' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: 'rgba(255,255,255,0.5)' }
                }
            }
        }
    });
};

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

onMounted(loadStats);
</script>

<style scoped>
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;
}

.stat-card {
  padding: 1.5rem;
  border-radius: 15px;
  display: flex;
  align-items: center;
  gap: 1.2rem;
  border: 1px solid rgba(255,255,255,0.05);
}

.stat-card .icon {
  font-size: 2rem;
  background: rgba(255,255,255,0.03);
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}

.info h3 {
  font-size: 0.9rem;
  color: rgba(255,255,255,0.6);
  margin-bottom: 0.3rem;
}

.info .value {
  font-size: 1.5rem;
  font-weight: bold;
}

.trend {
  font-size: 0.75rem;
  color: #00ffaa;
}

.chart-container {
  grid-column: span 3;
  padding: 1.5rem;
  border-radius: 15px;
  min-height: 300px;
}

.recent-table-wrap {
    margin-top: 1rem;
    overflow-x: auto;
}

.recent-table {
    width: 100%;
    border-collapse: collapse;
}

.recent-table th {
    text-align: left;
    padding: 1rem;
    color: rgba(255,255,255,0.5);
    font-size: 0.85rem;
    border-bottom: 1px solid rgba(255,255,255,0.05);
}

.recent-table td {
    padding: 1rem;
    font-size: 0.9rem;
    border-bottom: 1px solid rgba(255,255,255,0.03);
}

.msg-cut {
    max-width: 250px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.lang-tag {
    background: rgba(0,198,255,0.1);
    color: #00c6ff;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.75rem;
    text-transform: uppercase;
}

.recent-list {
  grid-column: span 1;
  padding: 1.5rem;
  border-radius: 15px;
}

.security-info {
    margin-top: 1.5rem;
}

.security-info p {
    margin-bottom: 1rem;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    gap: 10px;
}

.security-info p i { color: #00ffaa; }
</style>
