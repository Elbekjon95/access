import { state } from "./config.js";
window.state = state;
import { initHologram } from "./hologram.js";
import { startCamera } from "./camera.js";
import { initLanguageSelector, loadVoices } from "./language.js";
// map.js o'rniga navigation.js dagi AirportNavigation ishlatiladi
// window.airportNav = new AirportNavigation("map-canvas"); // Bu index.php da navigation.js yuklanganidan keyin amalga oshiriladi

import {
  showModal,
  hideModal,
  loadFlightsToTable,
  initFlightsTabs,
  setComplaintStatus,
  resetComplaintPreview,
} from "./ui.js";
import {
  startRecording,
  stopRecording,
  stopAssistantVoice,
  toggleAssistantVoice,
  startComplaintRecording,
  stopComplaintRecording,
} from "./voice.js?v=2";
import { initWeather } from "./weather.js";

const mapViewState = {
  scale: 1,
  panX: 0,
  panY: 0,
};

function applyMapTransform() {
  // CSS transform o'rniga navigation.js ning ichki renderidan foydalanamiz
  // Bu yerda faqat kerak bo'lsa canvas elementining o'zini markazlashtirish mantiqi qolishi mumkin
}

function initMapPanZoom() {
    // CSS-ga asoslangan Pan/Zoom hozircha o'chirildi, chunki u navigation.js bilan ziddiyatga kelmoqda.
    // Navigatsiya paytida navigation.js avtomatik "Follow" (kamera kuzatish) funksiyasini bajaradi.
}

function resetMapView() {
  if (window.airportNav) {
    if (typeof window.airportNav.resizeCanvasToContainer === "function") {
      window.airportNav.resizeCanvasToContainer();
    }
    window.airportNav.resetZoom();
    window.airportNav.path = [];
    window.airportNav.isAnimatingPath = false;
    window.airportNav.needsRender = true;
    
    // Manual state ham reset
    mapViewState.scale = 1;
    mapViewState.panX = 0;
    mapViewState.panY = 0;
    applyMapTransform();
  }
}
window.resetMapView = resetMapView;

// Inactivity Reset (5 minut)
let inactivityTimer;
const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 daqiqa

function resetInactivityTimer() {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        console.log("Inactivity timeout reached. Reloading...");
        window.location.reload();
    }, INACTIVITY_TIMEOUT);
}

// Barcha interaksiyalarni kuzatish
['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(name => {
    document.addEventListener(name, resetInactivityTimer, true);
});

// Dastlabki ishga tushirish
resetInactivityTimer();

setInterval(() => {
  const now = new Date();
  const timeDisplay = document.getElementById("time-display");
  if (timeDisplay)
    timeDisplay.innerText = now.toLocaleTimeString("uz-UZ", { hour12: false });
}, 1000);

window.initLegacyApp = () => {
  initFlightsTabs();
  initHologram(); // LOGO SHU YERDA ISHGA TUSHADI
  startCamera(); // Kamera faqat rasm olish uchun
  initLanguageSelector();
  loadVoices();
  initMapPanZoom();
  initWeather();

  // AirportNavigation initialize
  if (typeof AirportNavigation !== "undefined") {
    window.airportNav = new AirportNavigation("map-canvas");
    
    // Xarita sozlamalarini va ma'lumotlarini yuklash
    Promise.all([
        fetch("/api/map_settings").then(r => r.json()),
        fetch("/api/scanner").then(r => r.json()),
        fetch("/api/barriers").then(r => r.json())
    ]).then(([settings, nodes, barriers]) => {
        // 1. Xarita rasmini yuklash
        const finalPath = (settings && settings.path) ? settings.path : "img/airport_map.jpg";
        window.airportNav.loadMap(finalPath);

        // 2. Nuqtalarni yuklash
        if (Array.isArray(nodes)) {
            window.airportNav.setNodes(nodes);
            fillSidePanels(nodes);
        }

        // 3. To'siqlarni yuklash
        if (Array.isArray(barriers)) {
            window.airportNav.barriers = barriers;
            window.airportNav.updateCollisionGrid();
        }
    }).catch(err => {
        console.error("[NAV] Data fetch error:", err);
        window.airportNav.loadMap("img/airport_map.jpg"); // Fallback
    });
  }

  const mapModal = document.getElementById("map-modal");
  const flightsModal = document.getElementById("flights-modal");
  const btnMap = document.getElementById("btn-map");
  const btnFlights = document.getElementById("btn-flights");
  const btnVoice = document.getElementById("btn-voice");

  if (btnMap)
    btnMap.onclick = () => {
      showModal(mapModal);
      resetMapView();
    };
  if (btnFlights)
    btnFlights.onclick = () => {
      loadFlightsToTable();
      showModal(flightsModal);
    };

  if (btnVoice) {
    btnVoice.onclick = () =>
      state.isRecording ? stopRecording() : startRecording();
  }

  const btnStopVoice = document.getElementById("btn-stop-voice");
  if (btnStopVoice) btnStopVoice.onclick = stopAssistantVoice;

  const btnPauseVoice = document.getElementById("btn-pause-voice");
  if (btnPauseVoice) btnPauseVoice.onclick = toggleAssistantVoice;

  // Telefon tugmasi (kelajakda operatorga qo'ng'iroq)
  const btnCall = document.getElementById("btn-call");
  if (btnCall) {
    btnCall.onclick = () => {
      // Kelajakda tel:// yoki WebRTC orqali qo'ng'iroq qilish mumkin
      alert("Operatorga qo'ng'iroq: +998 78 140-28-77\n(Kanselyariya)");
    };
  }

  const btnComplaint = document.getElementById("btn-complaint");
  if (btnComplaint)
    btnComplaint.onclick = () => {
      showModal("complaint-modal");
      resetComplaintPreview();
      setComplaintStatus("Yozuv tugagach shikoyat avtomatik yuboriladi.");
    };

  const btnComplaintRecord = document.getElementById("btn-complaint-record");
  if (btnComplaintRecord) {
    btnComplaintRecord.onclick = () => {
      if (state.isComplaintRecording) stopComplaintRecording();
      else startComplaintRecording();
    };
  }

  document.querySelectorAll(".close-modal").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const modal = e.target.closest(".modal");
      if (modal) hideModal(modal);
      
      if (state.isComplaintRecording) {
        stopComplaintRecording();
      }
      if (window.airportNav && typeof window.airportNav.resetZoom === "function") {
        window.airportNav.resetZoom();
      }
    });
  });

  const btnCloseQR = document.getElementById("close-qr");
  if (btnCloseQR) {
    btnCloseQR.onclick = () => {
      if (typeof window.hideQR === "function") window.hideQR();
    };
  }

  // --- Boshlang'ich Til Tanlash Logikasi ---
  const langModal = document.getElementById("lang-selection-modal");
  if (langModal) {
    const cards = langModal.querySelectorAll(".lang-card");
    cards.forEach(card => {
      card.onclick = () => {
        const lang = card.dataset.lang;
        console.log("[LANG] Selected:", lang);
        
        // Tanlangan tilni o'rnatish
        state.language = lang;
        localStorage.setItem("kiosk_lang", lang);
        
        // UI dagi dropdownni ham yangilab qo'yamiz (agar mavjud bo'lsa)
        const dropdown = document.getElementById("lang-dropdown");
        if (dropdown) {
          const opt = Array.from(dropdown.querySelectorAll(".lang-option")).find(o => o.dataset.value === lang);
          if (opt) opt.click();
        }

        // Modalni yopish
        langModal.classList.add("hide");
        
        // Xush kelibsiz xabari (ovozsiz, faqat terminalda)
        const terminal = document.getElementById("terminal-text");
        if (terminal) {
          const welcome = {
            uz: "Xush kelibsiz! Qanday yordam bera olaman?",
            ru: "Добро пожаловать! Чем я могу вам помочь?",
            en: "Welcome! How can I help you?"
          };
          terminal.innerText = welcome[lang] || welcome.uz;
        }
      };
    });
  }
};

// Auto-initialization Vue tomonidan Kiosk.vue da boshqariladi

/**
 * Xarita yon panellarini nuqtalar bilan to'ldirish
 */
function fillSidePanels(processedNodes) {
    const listServices = document.getElementById("list-services");
    const listGates = document.getElementById("list-gates");
    if (!listServices || !listGates) return;

    listServices.innerHTML = "";
    listGates.innerHTML = "";

    const gateTypes = ["gate", "entrance", "exit"];
    
    // Alifbo bo'yicha tartiblaymiz
    const sortedNodes = [...processedNodes].sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    sortedNodes.forEach(node => {
        if (node.type === "kiosk_start") return; 

        const item = document.createElement("div");
        item.className = "panel-item";
        
        let icon = "fa-map-marker-alt";
        if (node.type === "toilet") icon = "fa-restroom";
        if (node.type === "cafe" || node.type === "restaurant") icon = "fa-utensils";
        if (node.type === "gate") icon = "fa-plane-departure";
        if (node.type === "reception" || node.type === "info" || node.type === "counter") icon = "fa-info-circle";
        if (node.type === "mosque") icon = "fa-mosque";
        if (node.type === "shop") icon = "fa-shopping-cart";
        if (node.type === "cip" || node.type === "vip") icon = "fa-couch";

        item.innerHTML = `<i class="fas ${icon}"></i><span>${node.name}</span>`;
        
        item.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const px = Number(node.pos_x);
            const py = Number(node.pos_y);
            
            console.log("[UI] Clicked:", node.name, "| Coords:", px, py);
            
            // Tugma bosilganini vizual ko'rsatish
            item.style.background = "rgba(0, 198, 255, 0.3)";
            setTimeout(() => { item.style.background = ""; }, 200);

            if (window.airportNav && typeof window.airportNav.navigateTo === 'function') {
                window.airportNav.navigateTo(px, py, node.name);
            } else {
                console.error("[UI] window.airportNav.navigateTo topilmadi!");
            }
        };

        if (gateTypes.includes(node.type) || (node.name && node.name.toLowerCase().includes("gate"))) {
            listGates.appendChild(item);
        } else {
            listServices.appendChild(item);
        }
    });
    console.log("[UI] Side panels filled with", sortedNodes.length, "nodes");
}

