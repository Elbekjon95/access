<script setup>
import { onMounted } from 'vue';
import '../style.css'; 

onMounted(() => {
  if (typeof window.initLegacyApp === 'function') {
      window.initLegacyApp();
  }
});
</script>

<template>
  <div id="hologram-container"></div>

  <main id="main-ui">
    <header>
      <div class="logo-text">ACCESS</div>
      <div id="status-bar">
        <button id="weather-temp-btn" class="weather-temp-btn">
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
                  <span class="flag-icon">
                      <svg width="24" height="16" viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="15" cy="10" r="9" fill="#0aa0ff" />
                          <path d="M6 10h18M15 1v18M9 4c2 2 2 10 0 12M21 4c-2 2-2 10 0 12" stroke="#ffffff" stroke-width="1" />
                      </svg>
                  </span>
                  <span>Auto</span>
              </button>
              <button type="button" class="lang-option" role="option" data-value="uz" data-label="O'zbek">
                  <span class="flag-icon">
                      <svg width="24" height="16" viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg">
                          <rect width="30" height="20" fill="#1eb6ff" />
                          <rect y="7" width="30" height="6" fill="#ffffff" />
                          <rect y="13" width="30" height="7" fill="#1eb53a" />
                          <rect y="6.5" width="30" height="1" fill="#ce1126" />
                          <rect y="12.5" width="30" height="1" fill="#ce1126" />
                      </svg>
                  </span>
                  <span>O'zbek</span>
              </button>
              <button type="button" class="lang-option" role="option" data-value="ru" data-label="Русский">
                  <span class="flag-icon">
                      <svg width="24" height="16" viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg">
                          <rect width="30" height="20" fill="#ffffff" />
                          <rect y="7" width="30" height="6" fill="#0039a6" />
                          <rect y="13" width="30" height="7" fill="#d52b1e" />
                      </svg>
                  </span>
                  <span>Русский</span>
              </button>
              <button type="button" class="lang-option" role="option" data-value="en" data-label="English">
                  <span class="flag-icon">
                      <svg width="24" height="16" viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg">
                          <rect width="30" height="20" fill="#012169" />
                          <rect y="8" width="30" height="4" fill="#ffffff" />
                          <rect x="13" width="4" height="20" fill="#ffffff" />
                          <rect y="9" width="30" height="2" fill="#c8102e" />
                          <rect x="14" width="2" height="20" fill="#c8102e" />
                      </svg>
                  </span>
                  <span>English</span>
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
      <button id="btn-map" class="nav-btn">Harita</button>
      <button id="btn-call" class="nav-btn" title="Operatorga qo'ng'iroq"><i class="fas fa-phone-alt"></i></button>
      <div class="voice-controls">
        <button id="btn-pause-voice" class="action-btn" title="Pause/Resume"><i class="fas fa-pause"></i></button>
        <button id="btn-voice" class="nav-btn mic-btn pulsing">
          <i class="fas fa-microphone"></i>
        </button>
        <button id="btn-stop-voice" class="action-btn" title="Stop"><i class="fas fa-stop"></i></button>
      </div>
      <button id="btn-flights" class="nav-btn">Reyslar</button>
      <button id="btn-complaint" class="nav-btn" style="background: rgba(255,82,82,0.2); border-color: #ff5252;">E'tiroz va taklif</button>
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
      
      <button class="close-modal" id="map-close-btn">&times;</button>
      
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
        <button class="close-modal">&times;</button>
      </header>
      <div id="flights-table-container">
        <div class="flights-tabs">
          <button class="flight-tab-btn active" data-type="departure">
            <i class="fas fa-plane-departure"></i> Uchib ketish
          </button>
          <button class="flight-tab-btn" data-type="arrival">
            <i class="fas fa-plane-arrival"></i> Uchib kelish
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
        <button class="close-modal">&times;</button>
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
        <button class="close-modal">&times;</button>
      </header>
      <div style="padding: 1rem;">
        <input type="text" id="comp-name" placeholder="Ismingiz" class="nav-btn" style="width: 100%; margin-bottom: 1rem; text-align: left;">
        <input type="text" id="comp-contact" placeholder="Telefon yoki Email" class="nav-btn" style="width: 100%; margin-bottom: 1rem; text-align: left;">
        <button id="btn-complaint-record" class="nav-btn" style="width: 100%; background: var(--secondary-blue); margin-bottom: 0.8rem;">OVOZLI SHIKOYATNI BOSHLASH</button>
        <div id="complaint-status" style="font-size: 0.9rem; opacity: 0.85; margin-bottom: 0.8rem;">Yozuv tugagach shikoyat avtomatik yuboriladi.</div>
        <audio id="complaint-audio-preview" controls style="width: 100%; display: none;"></audio>
      </div>
    </div>
  </div>

  <div id="weather-modal" class="modal hide">
    <div class="modal-content glass" style="max-width: 800px; height: 80vh;">
      <header>
        <h3>🌍 Manzil Shaharlar Ob-havosi</h3>
        <button class="close-modal">&times;</button>
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

  <!-- Boshlang'ich Til Tanlash Modali -->
  <div id="lang-selection-modal" class="modal lang-modal-overlay">
    <div class="lang-selection-content glass">
      <div class="lang-header">
        <h2>TILNI TANLANG / ВЫБЕРИТЕ ЯЗЫК / SELECT LANGUAGE</h2>
        <div class="header-line"></div>
      </div>
      
      <div class="lang-grid">
        <button class="lang-card" data-lang="uz"><div class="flag"><img src="/img/flags/uz.svg" width="60" alt="UZ"></div><div class="name">O'zbekcha</div><div class="desc">Asosiy menyu</div></button>
        <button class="lang-card" data-lang="ru"><div class="flag"><img src="/img/flags/ru.svg" width="60" alt="RU"></div><div class="name">Русский</div><div class="desc">Основное menyu</div></button>
        <button class="lang-card" data-lang="en"><div class="flag"><img src="/img/flags/us.svg" width="60" alt="US"></div><div class="name">English</div><div class="desc">Main Menu</div></button>
        <button class="lang-card" data-lang="tr"><div class="flag"><img src="/img/flags/tr.svg" width="60" alt="TR"></div><div class="name">Türkçe</div><div class="desc">Ana Menü</div></button>
        <button class="lang-card" data-lang="ar"><div class="flag"><img src="/img/flags/sa.svg" width="60" alt="SA"></div><div class="name">العربية</div><div class="desc">القائمة الرئيسية</div></button>
        
        <button class="lang-card" data-lang="zh"><div class="flag"><img src="/img/flags/cn.svg" width="60" alt="CN"></div><div class="name">中文</div><div class="desc">主菜单</div></button>
        <button class="lang-card" data-lang="ko"><div class="flag"><img src="/img/flags/kr.svg" width="60" alt="KR"></div><div class="name">한국어</div><div class="desc">메인 메뉴</div></button>
        <button class="lang-card" data-lang="ja"><div class="flag"><img src="/img/flags/jp.svg" width="60" alt="JP"></div><div class="name">日本語</div><div class="desc">Main Menu</div></button>
        <button class="lang-card" data-lang="de"><div class="flag"><img src="/img/flags/de.svg" width="60" alt="DE"></div><div class="name">Deutsch</div><div class="desc">Hauptmenü</div></button>
        <button class="lang-card" data-lang="fr"><div class="flag"><img src="/img/flags/fr.svg" width="60" alt="FR"></div><div class="name">Français</div><div class="desc">Menu Principal</div></button>
        
        <button class="lang-card" data-lang="es"><div class="flag"><img src="/img/flags/es.svg" width="60" alt="ES"></div><div class="name">Español</div><div class="desc">Menú Principal</div></button>
        <button class="lang-card" data-lang="it"><div class="flag"><img src="/img/flags/it.svg" width="60" alt="IT"></div><div class="name">Italiano</div><div class="desc">Menu Principale</div></button>
        <button class="lang-card" data-lang="pt"><div class="flag"><img src="/img/flags/pt.svg" width="60" alt="PT"></div><div class="name">Português</div><div class="desc">Menu Principal</div></button>
        <button class="lang-card" data-lang="tg"><div class="flag"><img src="/img/flags/tj.svg" width="60" alt="TJ"></div><div class="name">Тоҷикӣ</div><div class="desc">Менюи асосӣ</div></button>
        <button class="lang-card" data-lang="kk"><div class="flag"><img src="/img/flags/kz.svg" width="60" alt="KZ"></div><div class="name">Қазақша</div><div class="desc">Негізгі мәзір</div></button>
        
        <button class="lang-card" data-lang="ky"><div class="flag"><img src="/img/flags/kg.svg" width="60" alt="KG"></div><div class="name">Кыргызcha</div><div class="desc">Башкы menyu</div></button>
        <button class="lang-card" data-lang="tk"><div class="flag"><img src="/img/flags/tm.svg" width="60" alt="TM"></div><div class="name">Türkmençe</div><div class="desc">Esasy menýu</div></button>
        <button class="lang-card" data-lang="hi"><div class="flag"><img src="/img/flags/in.svg" width="60" alt="IN"></div><div class="name">हिन्दी</div><div class="desc">Muxay Menyu</div></button>
        <button class="lang-card" data-lang="ur"><div class="flag"><img src="/img/flags/pk.svg" width="60" alt="PK"></div><div class="name">اردو</div><div class="desc">مین mену</div></button>
        <button class="lang-card" data-lang="az"><div class="flag"><img src="/img/flags/az.svg" width="60" alt="AZ"></div><div class="name">Azərbaycanca</div><div class="desc">Ana menyu</div></button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Scoped style kiosk uchun */
</style>
