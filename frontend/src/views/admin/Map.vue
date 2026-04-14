<template>
  <div class="admin-page">
    <div class="page-header">
      <h2><i class="fas fa-map-marked-alt"></i> Aerovokzal xaritasi va nuqtalarini boshqarish</h2>
      <div class="editor-modes glass">
        <button :class="{ active: mode === 'view' }" @click="mode = 'view'"><i class="fas fa-mouse-pointer"></i> Ko'rish</button>
        <button :class="{ active: mode === 'point' }" @click="mode = 'point'"><i class="fas fa-map-marker-alt"></i> Nuqta qo'shish</button>
        <button :class="{ active: mode === 'barrier' }" @click="mode = 'barrier'"><i class="fas fa-border-all"></i> To'siq chizish</button>
      </div>
    </div>

    <div class="map-editor-grid">
      <div class="map-preview" ref="container" @wheel.prevent="handleWheel" @mousedown="startPan" @mousemove="doPan" @mouseup="endPan" @mouseleave="endPan" @click="handleMapClick">
        <div v-if="!mapLoadedOnce" class="map-loader">
           <i class="fas fa-spinner fa-spin"></i> Xarita yuklanmoqda (13MB)...
        </div>
        <div class="canvas-wrapper" :style="wrapperStyle">
          <img src="/img/airport_map.jpg" alt="Map" class="base-map-img" @load="mapLoaded">
          
          <!-- Barriers layer -->
          <svg class="barriers-svg" :viewBox="`0 0 ${mapWidth} ${mapHeight}`">
            <polyline v-for="b in barriers" :key="b.id" :points="getBarrierPoints(b.barrier_data)" class="barrier-line" />
            <polyline v-if="currentBarrier.length > 0" :points="getBarrierPoints(currentBarrier)" class="current-line" />
          </svg>

          <!-- Points layer -->
          <div v-for="p in points" :key="p.id" class="map-point" :style="getPointStyle(p)" @click.stop="selectPoint(p)" :title="p.name">
            <div class="point-icon"><i class="fas fa-map-marker-alt"></i></div>
          </div>
        </div>
        
        <div class="zoom-controls glass">
          <button @click="zoomIn"><i class="fas fa-plus"></i></button>
          <button @click="resetZoom"><i class="fas fa-sync-alt"></i></button>
          <button @click="zoomOut"><i class="fas fa-minus"></i></button>
        </div>
      </div>

      <div class="points-panel glass">
        <h3>{{ mode === 'barrier' ? 'To\'siqlar' : 'Navigatsiya nuqtalari' }}</h3>
        
        <div v-if="mode !== 'barrier'" class="points-list custom-scroll">
          <!-- Yangi nuqta draw formasi -->
          <div v-if="newPointDraft" class="point-item draft">
            <div class="point-info">
              <span class="draft-label">Yangi nuqta:</span>
              <input v-model="newPointDraft.name" placeholder="Nom kiriting..." class="p-name-input draft-input" ref="draftInput" @keyup.enter="saveDraftPoint">
              <span class="p-coords">X: {{ Math.round(newPointDraft.pos_x) }}, Y: {{ Math.round(newPointDraft.pos_y) }}</span>
            </div>
            <div class="draft-actions">
              <button class="btn-xs success" @click="saveDraftPoint"><i class="fas fa-check"></i></button>
              <button class="btn-xs" @click="newPointDraft = null"><i class="fas fa-times"></i></button>
            </div>
          </div>

          <div v-for="p in points" :key="p.id" class="point-item" :class="{ selected: selectedPoint?.id === p.id }">
            <div class="point-info">
              <input v-model="p.name" @change="updatePoint(p)" class="p-name-input">
              <span class="p-coords">X: {{ Math.round(p.pos_x) }}, Y: {{ Math.round(p.pos_y) }}</span>
            </div>
            <div class="actions">
              <button class="btn-xs danger" @click="deletePoint(p.id)"><i class="fas fa-trash"></i></button>
            </div>
          </div>
        </div>

        <div v-else class="points-list custom-scroll">
          <div v-for="b in barriers" :key="b.id" class="point-item">
            <span>To'siq #{{ b.id }} ({{ JSON.parse(b.barrier_data || '[]').length }} nuqta)</span>
            <button class="btn-xs danger" @click="deleteBarrier(b.id)"><i class="fas fa-trash"></i></button>
          </div>
          <div v-if="currentBarrier.length > 0" class="current-barrier-info">
            <p>Yangi to'siq chizilmoqda... ({{ currentBarrier.length }} nuqta)</p>
            <button class="add-btn" @click="saveBarrier">Saqlash</button>
            <button class="add-btn danger" @click="currentBarrier = []">Bekor qilish</button>
          </div>
        </div>

        <p v-if="mode === 'point'" class="hint">Xaritaga bosing - nuqta o'sha yerda paydo bo'ladi.</p>
        <p v-if="mode === 'barrier'" class="hint">Xaritaga ketma-ket bosing - to'siq chiziladi. <b>Kamida 4 ta nuqta</b> bo'lishi shart. Tugatish uchun "Saqlash"ni bosing.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';

const mode = ref('view'); // 'view', 'point', 'barrier'
const points = ref([]);
const barriers = ref([]);
const mapWidth = ref(1000);
const mapHeight = ref(1000);
const mapLoadedOnce = ref(false);
const selectedPoint = ref(null);
const currentBarrier = ref([]);
const newPointDraft = ref(null);
const draftInput = ref(null);

// Transform state
const transform = ref({ x: 0, y: 0, scale: 1 });
const isPanning = ref(false);
const startPos = ref({ x: 0, y: 0 });

const container = ref(null);

const wrapperStyle = computed(() => ({
  transform: `translate(${transform.value.x}px, ${transform.value.y}px) scale(${transform.value.scale})`,
  transformOrigin: '0 0'
}));

const mapLoaded = (e) => {
  mapWidth.value = e.target.naturalWidth;
  mapHeight.value = e.target.naturalHeight;
  mapLoadedOnce.value = true;
  
  // Auto-fit logic
  if (container.value) {
    const cw = container.value.clientWidth;
    const ch = container.value.clientHeight;
    const scale = Math.min(cw / mapWidth.value, ch / mapHeight.value) * 0.95; // 5% padding
    
    transform.value = {
      scale: scale,
      x: (cw - mapWidth.value * scale) / 2,
      y: (ch - mapHeight.value * scale) / 2
    };
  }
};

const fetchData = async () => {
    try {
        const token = localStorage.getItem('admin_token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        
        const [pRes, bRes] = await Promise.all([
            axios.get('/api/admin/map/points', config),
            axios.get('/api/admin/map/barriers', config)
        ]);
        
        points.value = pRes.data;
        barriers.value = bRes.data;
    } catch (e) {
        console.error("Data fetch error", e);
    }
};

onMounted(fetchData);

// Zoom/Pan logic
const handleWheel = (e) => {
  const zoomSpeed = 0.001;
  const delta = -e.deltaY;
  const newScale = Math.min(Math.max(0.1, transform.value.scale + delta * zoomSpeed), 5);
  
  // Pivot point
  const rect = container.value.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  
  const worldX = (mouseX - transform.value.x) / transform.value.scale;
  const worldY = (mouseY - transform.value.y) / transform.value.scale;
  
  transform.value.scale = newScale;
  transform.value.x = mouseX - worldX * newScale;
  transform.value.y = mouseY - worldY * newScale;
};

const startPan = (e) => {
  // 0: Chap tugma, 1: O'rta tugma (scroll)
  if (e.button === 1 || (e.button === 0 && mode.value === 'view')) {
    isPanning.value = true;
    startPos.value = { x: e.clientX - transform.value.x, y: e.clientY - transform.value.y };
  }
};

const doPan = (e) => {
  if (!isPanning.value) return;
  transform.value.x = e.clientX - startPos.value.x;
  transform.value.y = e.clientY - startPos.value.y;
};

const endPan = () => { isPanning.value = false; };

const zoomIn = () => { zoomAtCenter(1.2); };
const zoomOut = () => { zoomAtCenter(1 / 1.2); };
const resetZoom = () => {
    if (mapWidth.value > 0) {
        const cw = container.value.clientWidth;
        const ch = container.value.clientHeight;
        const scale = Math.min(cw / mapWidth.value, ch / mapHeight.value) * 0.95;
        transform.value = {
            scale: scale,
            x: (cw - mapWidth.value * scale) / 2,
            y: (ch - mapHeight.value * scale) / 2
        };
    }
};

const zoomAtCenter = (factor) => {
    const cw = container.value.clientWidth;
    const ch = container.value.clientHeight;
    const centerX = cw / 2;
    const centerY = ch / 2;
    
    const worldX = (centerX - transform.value.x) / transform.value.scale;
    const worldY = (centerY - transform.value.y) / transform.value.scale;
    
    const newScale = transform.value.scale * factor;
    transform.value.scale = newScale;
    transform.value.x = centerX - worldX * newScale;
    transform.value.y = centerY * factor - worldY * newScale; // simplified
    // Aslida zoom logic handlingWheel dagi kabi bo'lishi kerak
    transform.value.x = centerX - worldX * newScale;
    transform.value.y = centerY - worldY * newScale;
};

// Coordinate conversion
const getScreenToWorld = (e) => {
  const rect = container.value.getBoundingClientRect();
  const x = (e.clientX - rect.left - transform.value.x) / transform.value.scale;
  const y = (e.clientY - rect.top - transform.value.y) / transform.value.scale;
  return { x, y };
};

const handleMapClick = async (e) => {
  if (isPanning.value) return;
  
  const { x, y } = getScreenToWorld(e);
  
  if (mode.value === 'point') {
     newPointDraft.value = { name: '', pos_x: x, pos_y: y, map_id: 1 };
     setTimeout(() => {
       if (draftInput.value) draftInput.value.focus();
     }, 100);
  } else if (mode.value === 'barrier') {
     currentBarrier.value.push({ x, y });
  }
};

const getPointStyle = (p) => ({
  left: `${p.pos_x}px`,
  top: `${p.pos_y}px`
});

const getBarrierPoints = (data) => {
  const arr = typeof data === 'string' ? JSON.parse(data) : data;
  return arr.map(pt => `${pt.x},${pt.y}`).join(' ');
};

const selectPoint = (p) => { selectedPoint.value = p; };

const updatePoint = async (p) => {
  try {
      const token = localStorage.getItem('admin_token');
      await axios.post('/api/admin/map/points', p, { 
          headers: { Authorization: `Bearer ${token}` } 
      });
  } catch (e) { console.error(e); }
};

const saveDraftPoint = async () => {
    if (!newPointDraft.value || !newPointDraft.value.name) return;
    try {
        const token = localStorage.getItem('admin_token');
        await axios.post('/api/admin/map/points', newPointDraft.value, { 
            headers: { Authorization: `Bearer ${token}` } 
        });
        newPointDraft.value = null;
        fetchData();
    } catch (e) { alert("Xato saqlashda"); }
};

const deletePoint = async (id) => {
    if (!confirm("O'chirilsinmi?")) return;
    try {
        const token = localStorage.getItem('admin_token');
        await axios.delete(`/api/admin/map/points/${id}`, { 
            headers: { Authorization: `Bearer ${token}` } 
        });
        fetchData();
    } catch (e) { console.error(e); }
};

const saveBarrier = async () => {
    if (currentBarrier.value.length < 4) {
        alert("To'siq kamida 4 ta nuqtadan iborat bo'lishi kerak!");
        return;
    }
    try {
        const token = localStorage.getItem('admin_token');
        await axios.post('/api/admin/map/barriers', {
            barrier_data: currentBarrier.value, map_id: 1
        }, { headers: { Authorization: `Bearer ${token}` } });
        currentBarrier.value = [];
        fetchData();
    } catch (e) { console.error(e); }
};

const deleteBarrier = async (id) => {
    if (!confirm("O'chirilsinmi?")) return;
    try {
        const token = localStorage.getItem('admin_token');
        await axios.delete(`/api/admin/map/barriers/${id}`, { 
            headers: { Authorization: `Bearer ${token}` } 
        });
        fetchData();
    } catch (e) { console.error(e); }
};
</script>

<style scoped>
.admin-page { animation: fadeIn 0.5s ease; height: 100%; display: flex; flex-direction: column; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }

.editor-modes { display: flex; gap: 5px; padding: 5px; border-radius: 12px; }
.editor-modes button { padding: 8px 15px; border: none; background: transparent; color: #fff; cursor: pointer; border-radius: 8px; font-size: 0.9rem; transition: all 0.3s; }
.editor-modes button.active { background: #00c6ff; box-shadow: 0 0 15px rgba(0, 198, 255, 0.4); }

.map-editor-grid {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 1.5rem;
  flex: 1;
  min-height: 0;
}

.map-preview {
  border-radius: 15px;
  position: relative;
  overflow: hidden;
  background: #050a14;
  cursor: crosshair;
  min-height: 500px;
  flex: 1;
  border: 1px solid rgba(255,255,255,0.05);
  display: flex;
  align-items: center;
  justify-content: center;
}

.map-loader {
    color: #00c6ff;
    font-size: 1.2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 15px;
}

.canvas-wrapper {
  position: absolute;
  top: 0; left: 0;
}

.base-map-img {
  display: block;
  pointer-events: none;
}

.barriers-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.barrier-line {
  fill: none;
  stroke: #ff5252;
  stroke-width: 4;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 0 5px rgba(255, 82, 82, 0.5));
}

.current-line {
  fill: none;
  stroke: #00ffaa;
  stroke-width: 3;
  stroke-dasharray: 10,5;
}

.map-point {
  position: absolute;
  width: 30px;
  height: 30px;
  margin-left: -15px;
  margin-top: -30px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #00c6ff;
  font-size: 24px;
  filter: drop-shadow(0 0 10px rgba(0, 198, 255, 0.6));
  cursor: pointer;
  transition: transform 0.2s;
}
.map-point:hover { transform: scale(1.2); z-index: 10; }

.zoom-controls {
  position: absolute;
  right: 20px;
  top: 20px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 5px;
  border-radius: 10px;
}

.zoom-controls button {
  width: 35px; height: 35px;
  border: none; background: rgba(255,255,255,0.05);
  color: #fff; cursor: pointer; border-radius: 5px;
}
.zoom-controls button:hover { background: rgba(0, 198, 255, 0.2); }

.points-panel {
  padding: 1.5rem;
  border-radius: 15px;
  display: flex;
  flex-direction: column;
}

.points-list {
  flex: 1;
  overflow-y: auto;
  margin-top: 1rem;
  padding-right: 5px;
}

.point-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.8rem;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 8px;
  margin-bottom: 0.8rem;
}
.point-item.selected { border-color: #00c6ff; background: rgba(0, 198, 255, 0.05); }
.point-item.draft { background: rgba(0, 255, 170, 0.05); border: 1px dashed #00ffaa; border-radius: 12px; animation: pulseGlow 2s infinite; }
.draft-label { font-size: 0.7rem; color: #00ffaa; font-weight: bold; margin-bottom: 2px; }
.draft-input { border-bottom: 1px solid #00ffaa !important; }
.draft-actions { display: flex; gap: 5px; }

.btn-xs.success { color: #00ffaa; border-color: rgba(0, 255, 170, 0.3); }
.btn-xs.success:hover { background: #00ffaa; color: #000; }

@keyframes pulseGlow {
  0% { box-shadow: 0 0 5px rgba(0, 255, 170, 0.2); }
  50% { box-shadow: 0 0 15px rgba(0, 255, 170, 0.4); }
  100% { box-shadow: 0 0 5px rgba(0, 255, 170, 0.2); }
}

.point-info { display: flex; flex-direction: column; flex: 1; }
.p-name-input { background: transparent; border: none; color: #fff; font-size: 0.9rem; font-weight: 500; outline: none; border-bottom: 1px solid transparent; }
.p-name-input:focus { border-bottom-color: #00c6ff; }
.p-coords { font-size: 0.7rem; color: rgba(255,255,255,0.4); margin-top: 3px; }

.hint { font-size: 0.8rem; color: rgba(255,255,255,0.5); font-style: italic; margin-top: 1rem; }

.current-barrier-info { margin-top: 1rem; padding: 10px; background: rgba(0, 255, 170, 0.05); border-radius: 8px; }
.add-btn { width: 100%; margin-top: 5px; padding: 8px; border-radius: 6px; cursor: pointer; border: 1px solid rgba(0, 255, 170, 0.5); background: rgba(0, 255, 170, 0.1); color: #00ffaa; }
.add-btn.danger { border-color: #ff5252; color: #ff5252; background: rgba(255, 82, 82, 0.1); }

@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>
