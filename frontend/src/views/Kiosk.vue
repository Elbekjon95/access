<script setup>
import { onMounted } from 'vue';
import '../style.css'; 

onMounted(() => {
  if (typeof window.initLegacyApp === 'function') {
      window.initLegacyApp();
  }
  if (typeof window.initWeather === 'function') {
      window.initWeather();
  }
  if (typeof window.initFlightsTabs === 'function') {
      window.initFlightsTabs();
  }
});

const handleLangSelect = (lang) => {
  if (window.state) window.state.currentLanguage = lang;
  if (typeof window.setLanguage === 'function') {
      window.setLanguage(lang);
  }
  const modal = document.getElementById("lang-selection-modal");
  if (modal) modal.classList.add("hide");
};

const handleTransportSelect = (mode) => {
  if (typeof window.setTransportMode === 'function') {
    window.setTransportMode(mode);
  }
  const transportModal = document.getElementById("transport-selection-modal");
  if (transportModal) transportModal.classList.add("hide");

  const langModal = document.getElementById("lang-selection-modal");
  if (langModal) langModal.classList.remove("hide");
};

const openTransportModal = () => {
  const transportModal = document.getElementById("transport-selection-modal");
  if (transportModal) transportModal.classList.remove("hide");
};

const handleMap = () => {
  if (typeof window.updateMapSidePanelsForMode === 'function') {
    window.updateMapSidePanelsForMode(window.state?.transportMode || 'aviation');
  }
  if (typeof window.showModal === 'function') {
    window.showModal("map-modal");
  }
};

const handleFlights = () => {
  if (typeof window.setTransportMode === 'function') {
    window.setTransportMode(window.state?.transportMode || 'aviation');
  }
  if (typeof window.loadFlightsToTable === 'function') {
    window.loadFlightsToTable();
  }
  if (typeof window.showModal === 'function') {
    window.showModal("flights-modal");
  }
};

const handleVoice = () => {
  if (window.state && typeof window.startRecording === 'function' && typeof window.stopRecording === 'function') {
    window.state.isRecording ? window.stopRecording() : window.startRecording();
  }
};

const handleComplaint = () => {
  if (typeof window.showModal === 'function') {
    window.showModal("complaint-modal");
  }
  if (typeof window.resetComplaintPreview === 'function') {
    window.resetComplaintPreview();
  }
  if (typeof window.setComplaintStatus === 'function') {
    window.setComplaintStatus("Yozuv tugagach shikoyat avtomatik yuboriladi.");
  }
};

const handleComplaintRecord = () => {
  if (window.state && typeof window.startComplaintRecording === 'function' && typeof window.stopComplaintRecording === 'function') {
    window.state.isComplaintRecording ? window.stopComplaintRecording() : window.startComplaintRecording();
  }
};

const handleVoiceStop = () => { if (typeof window.stopAssistantVoice === 'function') window.stopAssistantVoice(); };
const handleVoicePause = () => { if (typeof window.toggleAssistantVoice === 'function') window.toggleAssistantVoice(); };
const handleCall = () => { alert("Operatorga qo'ng'iroq: +998 78 140-28-77\n(Kanselyariya)"); };
const handleWeather = () => { if (typeof window.showModal === 'function') window.showModal("weather-modal"); };
const hideModal = (e) => {
  const modal = e.target.closest(".modal");
  if (modal && typeof window.hideModal === 'function') {
    window.hideModal(modal);
  }
};
</script>

<template>
  <div id="hologram-container"></div>

  <main id="main-ui">
    <header>
      <div class="logo-text">ACCESS</div>
      <div id="status-bar">
        <button type="button" class="transport-switch-btn" @click="openTransportModal" title="Transport turini o'zgartirish">
          <i class="fas fa-route"></i> Yo'nalish
        </button>
        <button id="weather-temp-btn" class="weather-temp-btn" @click="handleWeather">
          <i class="fas fa-cloud-sun"></i>
          <span id="toshkent-temp">--°C</span>
        </button>
        <span id="ai-status">Tizim tayyor</span>
        <div id="time-display"></div>
        <div id="lang-dropdown" class="lang-dropdown" data-value="auto">
          <button type="button" class="lang-toggle" aria-haspopup="listbox" aria-expanded="false">
            <span class="lang-flag" aria-hidden="true"></span>
            <span class="lang-label">Auto</span>
            <span class="lang-caret">▾</span>
          </button>
          <div class="lang-menu" role="listbox" aria-label="Tilni tanlash">
              <button type="button" class="lang-option" role="option" data-value="auto" data-label="Auto">
                  <span class="flag-icon"><i class="fas fa-globe"></i></span>
                  <span>Auto</span>
              </button>
              <button type="button" class="lang-option" role="option" data-value="uz" data-label="O'zbek">
                  <span class="flag-icon"><img src="/img/flags/uz.svg" width="20"></span>
                  <span>O'zbek</span>
              </button>
              <button type="button" class="lang-option" role="option" data-value="ru" data-label="Русский">
                  <span class="flag-icon"><img src="/img/flags/ru.svg" width="20"></span>
                  <span>Русский</span>
              </button>
              <button type="button" class="lang-option" role="option" data-value="en" data-label="English">
                  <span class="flag-icon"><img src="/img/flags/us.svg" width="20"></span>
                  <span>English</span>
              </button>
              <button type="button" class="lang-option" role="option" data-value="tr" data-label="Türkçe">
                  <span class="flag-icon"><img src="/img/flags/tr.svg" width="20"></span>
                  <span>Türkçe</span>
              </button>
              <button type="button" class="lang-option" role="option" data-value="ar" data-label="العربية">
                  <span class="flag-icon"><img src="/img/flags/sa.svg" width="20"></span>
                  <span>العربية</span>
              </button>
              <button type="button" class="lang-option" role="option" data-value="zh" data-label="中文">
                  <span class="flag-icon"><img src="/img/flags/cn.svg" width="20"></span>
                  <span>中文</span>
              </button>
          </div>
        </div>
        <div class="admin-link">
          <router-link to="/admin/login" title="Admin Panel" style="color: rgba(255,255,255,0.2); font-size: 0.8rem; margin-left: 10px;">
            <i class="fas fa-cog"></i>
          </router-link>
        </div>
      </div>
    </header>

    <section id="interaction-area">
      <div id="voice-waves">
        <div class="bar"></div>
        <div class="bar"></div>
        <div class="bar"></div>
        <div class="bar"></div>
        <div class="bar"></div>
      </div>
      <div id="chat-output" class="glass-panel">
        <p id="assistant-text">Xush kelibsiz! Menga savol berishingiz mumkin.</p>
      </div>
    </section>

    <nav id="bottom-nav">
      <button id="btn-map" class="nav-btn" @click="handleMap">Harita</button>
      <button id="btn-call" class="nav-btn" title="Operatorga qo'ng'iroq" @click="handleCall"><i class="fas fa-phone-alt"></i></button>
      <div class="voice-controls">
        <button id="btn-pause-voice" class="action-btn" title="Pause/Resume" @click="handleVoicePause"><i class="fas fa-pause"></i></button>
        <button id="btn-voice" class="nav-btn mic-btn pulsing" @click="handleVoice">
          <i class="fas fa-microphone"></i>
        </button>
        <button id="btn-stop-voice" class="action-btn" title="Stop" @click="handleVoiceStop"><i class="fas fa-stop"></i></button>
      </div>
      <button id="btn-flights" class="nav-btn" @click="handleFlights">Reyslar</button>
      <button id="btn-complaint" class="nav-btn" style="background: rgba(255,82,82,0.2); border-color: #ff5252;" @click="handleComplaint">E'tiroz va taklif</button>
    </nav>
  </main>

  <div id="qr-container" class="hide">
    <div class="qr-content">
      <button id="close-qr">&times;</button>
      <img id="qr-image" src="" alt="QR Code">
      <div id="qr-label"></div>
    </div>
  </div>

  <!-- Modallar -->
  <div id="map-modal" class="modal hide">
    <div class="modal-content glass-map">
      <header class="map-header-overlay">
        <h3>Aerovokzal Haritasi</h3>
      </header>
      
      <button class="close-modal" id="map-close-btn" @click="hideModal">&times;</button>
      
      <!-- Chap panel: Xizmatlar -->
      <aside class="map-side-panel left">
        <div class="panel-header">xizmatlar</div>
        <div id="list-services" class="panel-list custom-scroll">
          <!-- Dinamik to'ldiriladi -->
        </div>
      </aside>

      <!-- Markaz: Xarita -->
      <div id="map-canvas-container">
        <canvas id="map-canvas"></canvas>
        <div id="leaflet-bus-map" style="display:none; position:absolute; top:0; left:0; width:100%; height:100%; z-index:10; border-radius:12px; overflow:hidden;"></div>
        <div id="bus-info-card-left" style="display:none; position:absolute; top:70px; left:20px; width:300px; background:rgba(15,23,42,0.95); backdrop-filter:blur(12px); border:1.5px solid #00e5ff; border-radius:14px; padding:16px; color:#fff; z-index:1000; box-shadow:0 10px 30px rgba(0,0,0,0.6);"></div>
      </div>

      <!-- O'ng panel: Darvozalar -->
      <aside class="map-side-panel right">
        <div class="panel-header">Darvozalar</div>
        <div id="list-gates" class="panel-list custom-scroll">
          <!-- Dinamik to'ldiriladi -->
        </div>
      </aside>
    </div>
  </div>

  <div id="flights-modal" class="modal hide">
    <div class="modal-content glass">
      <header>
        <h3>Joriy reyslar jadvali</h3>
        <button class="close-modal" @click="hideModal">&times;</button>
      </header>
      <div id="flights-table-container">
        <div class="flights-tabs">
          <button class="flight-tab-btn active" data-type="departure">
            <i class="fas fa-plane-departure"></i> Uchib ketish
          </button>
          <button class="flight-tab-btn" data-type="arrival">
            <i class="fas fa-plane-arrival"></i> Uchib kelish
          </button>
          <button class="flight-tab-btn" data-type="schedule" style="display: none;">
            <i class="fas fa-route"></i> Yo'nalishlar Grafigi
          </button>
        </div>
        <table id="flights-table">
          <thead>
            <tr><th>Reys</th><th>Yo'nalish</th><th>Vaqt</th><th>Gate</th><th>Stoyka</th><th>Holat</th></tr>
          </thead>
          <tbody id="flights-body"></tbody>
        </table>
      </div>
    </div>
  </div>

  <div id="earth-modal" class="modal hide">
    <div class="modal-content glass" style="max-width: 95vw; max-height: 95vh; padding: 0; display: flex; flex-direction: column;">
      <header style="padding: 1rem; border-bottom: 1px solid var(--glass-border);">
        <h3 style="margin: 0;">🌍 Reys yo'nalishi</h3>
        <button class="close-modal" @click="hideModal">&times;</button>
      </header>
      <div style="display: flex; flex: 1; overflow: hidden;">
        <div id="earth-container" style="flex: 1; position: relative; min-width: 60%;"></div>
        <div class="earth-flight-info-panel">
          <div class="terminal-header"><span>/// FLIGHT INFORMATION ///</span></div>
          <div class="terminal-text" id="terminal-text">Reys ma'lumotlari yuklanmoqda...</div>
          <div id="earth-system-note" class="system-note-area"></div>
          <div class="earth-route-actions" id="earth-route-actions"></div>
        </div>
      </div>
      <div style="padding: 0.8rem; text-align: center; color: rgba(255,255,255,0.5); border-top: 1px solid var(--glass-border); font-size: 0.85rem;">
        <small>🟢 Toshkent (TAS) &nbsp;|&nbsp; 🔴 Manzil</small>
      </div>
    </div>
  </div>

  <div id="complaint-modal" class="modal hide">
    <div class="modal-content glass" style="max-width: 500px; height: auto;">
      <header>
        <h3>Shikoyat yoki Taklif</h3>
        <button class="close-modal" @click="hideModal">&times;</button>
      </header>
      <div style="padding: 1rem;">
        <input type="text" id="comp-name" placeholder="Ismingiz" class="nav-btn" style="width: 100%; margin-bottom: 1rem; text-align: left;">
        <input type="text" id="comp-contact" placeholder="Telefon yoki Email" class="nav-btn" style="width: 100%; margin-bottom: 1rem; text-align: left;">
        <button id="btn-complaint-record" class="nav-btn" style="width: 100%; background: var(--secondary-blue); margin-bottom: 0.8rem;" @click="handleComplaintRecord">OVOZLI SHIKOYATNI BOSHLASH</button>
        <div id="complaint-status" style="font-size: 0.9rem; opacity: 0.85; margin-bottom: 0.8rem;">Yozuv tugagach shikoyat avtomatik yuboriladi.</div>
        <audio id="complaint-audio-preview" controls style="width: 100%; display: none;"></audio>
      </div>
    </div>
  </div>

  <div id="weather-modal" class="modal hide">
    <div class="modal-content glass" style="max-width: 800px; height: 80vh;">
      <header>
        <h3>🌍 Manzil Shaharlar Ob-havosi</h3>
        <button class="close-modal" @click="hideModal">&times;</button>
      </header>
      <div id="weather-grid" class="weather-grid" style="flex: 1; overflow-y: auto; padding: 1.5rem; display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1.5rem;">
        <div class="loader-container" style="grid-column: 1/-1; text-align: center; padding: 3rem;">
          <i class="fas fa-circle-notch fa-spin fa-2x"></i>
          <p style="margin-top: 1rem;">Yuklanmoqda...</p>
        </div>
      </div>
    </div>
  </div>

  <video id="webcam" autoplay muted playsinline style="display:none;"></video>
  <canvas id="recognition-overlay" style="display:none;"></canvas>

  <!-- Boshlang'ich Transport Yo'nalishini Tanlash Modali -->
  <div id="transport-selection-modal" class="modal lang-modal-overlay">
    <div class="transport-selection-content glass">
      <div class="lang-header">
        <h2>TRANSPORT YO'NALISHINI TANLANG</h2>
        <p style="opacity: 0.7; font-size: 0.95rem; margin-top: 5px;">Kerakli transport turini belgilang</p>
        <div class="header-line"></div>
      </div>
      
      <div class="transport-grid">
        <button class="transport-card aviation-card" @click="handleTransportSelect('aviation')">
          <div class="transport-icon-box">
            <i class="fas fa-plane"></i>
          </div>
          <div class="transport-name">1. Aviatsiya</div>
          <div class="transport-desc">Aeroport va parvozlar jadvali (TAS)</div>
        </button>

        <button class="transport-card railway-card" @click="handleTransportSelect('railway')">
          <div class="transport-icon-box">
            <i class="fas fa-train"></i>
          </div>
          <div class="transport-name">2. Temir Yo'llari</div>
          <div class="transport-desc">Vokzal va poyezdlar jadvali (Afrosiyob, Sharq)</div>
        </button>

        <button class="transport-card bus-card" @click="handleTransportSelect('bus')">
          <div class="transport-icon-box">
            <i class="fas fa-bus"></i>
          </div>
          <div class="transport-name">3. Avtobuslar</div>
          <div class="transport-desc">Avtovokzal va shaharlararo reyslar</div>
        </button>
      </div>
    </div>
  </div>

  <!-- Til Tanlash Modali -->
  <div id="lang-selection-modal" class="modal lang-modal-overlay hide">
    <div class="lang-selection-content glass">
      <div class="lang-header">
        <h2>TILNI TANLANG / ВЫБЕРИТЕ ЯЗЫК / SELECT LANGUAGE</h2>
        <div class="header-line"></div>
      </div>
      
      <div class="lang-grid">
        <button class="lang-card" @click="handleLangSelect('uz')"><div class="flag"><img src="/img/flags/uz.svg" width="60" alt="UZ"></div><div class="name">O'zbekcha</div><div class="desc">Asosiy menyu</div></button>
        <button class="lang-card" @click="handleLangSelect('ru')"><div class="flag"><img src="/img/flags/ru.svg" width="60" alt="RU"></div><div class="name">Русский</div><div class="desc">Основное menyu</div></button>
        <button class="lang-card" @click="handleLangSelect('en')"><div class="flag"><img src="/img/flags/us.svg" width="60" alt="US"></div><div class="name">English</div><div class="desc">Main Menu</div></button>
        <button class="lang-card" @click="handleLangSelect('tr')"><div class="flag"><img src="/img/flags/tr.svg" width="60" alt="TR"></div><div class="name">Türkçe</div><div class="desc">Ana Menü</div></button>
        <button class="lang-card" @click="handleLangSelect('ar')"><div class="flag"><img src="/img/flags/sa.svg" width="60" alt="SA"></div><div class="name">العربية</div><div class="desc">القائمة الرئيسية</div></button>
        
        <button class="lang-card" @click="handleLangSelect('zh')"><div class="flag"><img src="/img/flags/cn.svg" width="60" alt="CN"></div><div class="name">中文</div><div class="desc">主菜单</div></button>
        <button class="lang-card" @click="handleLangSelect('ko')"><div class="flag"><img src="/img/flags/kr.svg" width="60" alt="KR"></div><div class="name">한국어</div><div class="desc">메인 메뉴</div></button>
        <button class="lang-card" @click="handleLangSelect('ja')"><div class="flag"><img src="/img/flags/jp.svg" width="60" alt="JP"></div><div class="name">日本語</div><div class="desc">Main Menu</div></button>
        <button class="lang-card" @click="handleLangSelect('de')"><div class="flag"><img src="/img/flags/de.svg" width="60" alt="DE"></div><div class="name">Deutsch</div><div class="desc">Hauptmenü</div></button>
        <button class="lang-card" @click="handleLangSelect('fr')"><div class="flag"><img src="/img/flags/fr.svg" width="60" alt="FR"></div><div class="name">Français</div><div class="desc">Menu Principal</div></button>
        
        <button class="lang-card" @click="handleLangSelect('es')"><div class="flag"><img src="/img/flags/es.svg" width="60" alt="ES"></div><div class="name">Español</div><div class="desc">Menú Principal</div></button>
        <button class="lang-card" @click="handleLangSelect('it')"><div class="flag"><img src="/img/flags/it.svg" width="60" alt="IT"></div><div class="name">Italiano</div><div class="desc">Menu Principale</div></button>
        <button class="lang-card" @click="handleLangSelect('pt')"><div class="flag"><img src="/img/flags/pt.svg" width="60" alt="PT"></div><div class="name">Português</div><div class="desc">Menu Principal</div></button>
        <button class="lang-card" @click="handleLangSelect('tg')"><div class="flag"><img src="/img/flags/tj.svg" width="60" alt="TJ"></div><div class="name">Тоҷикӣ</div><div class="desc">Менюи асосӣ</div></button>
        <button class="lang-card" @click="handleLangSelect('kk')"><div class="flag"><img src="/img/flags/kz.svg" width="60" alt="KZ"></div><div class="name">Қазақша</div><div class="desc">Негізгі мәзір</div></button>
        
        <button class="lang-card" @click="handleLangSelect('ky')"><div class="flag"><img src="/img/flags/kg.svg" width="60" alt="KG"></div><div class="name">Кыргызcha</div><div class="desc">Башкы menyu</div></button>
        <button class="lang-card" @click="handleLangSelect('tk')"><div class="flag"><img src="/img/flags/tm.svg" width="60" alt="TM"></div><div class="name">Türkmençe</div><div class="desc">Esasy menýu</div></button>
        <button class="lang-card" @click="handleLangSelect('hi')"><div class="flag"><img src="/img/flags/in.svg" width="60" alt="IN"></div><div class="name">हिन्दी</div><div class="desc">Muxay Menyu</div></button>
        <button class="lang-card" @click="handleLangSelect('ur')"><div class="flag"><img src="/img/flags/pk.svg" width="60" alt="PK"></div><div class="name">اردو</div><div class="desc">مین mену</div></button>
        <button class="lang-card" @click="handleLangSelect('az')"><div class="flag"><img src="/img/flags/az.svg" width="60" alt="AZ"></div><div class="name">Azərbaycanca</div><div class="desc">Ana menyu</div></button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Scoped style kiosk uchun */
</style>
