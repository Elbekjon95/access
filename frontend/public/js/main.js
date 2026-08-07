import { state } from "./config.js";
window.state = state;
import { initHologram } from "./hologram.js";
import { startCamera } from "./camera.js";
import { setLanguage, initLanguageSelector, loadVoices } from "./language.js";
window.setLanguage = setLanguage;
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

window.showModal = showModal;
window.hideModal = hideModal;
window.loadFlightsToTable = loadFlightsToTable;
window.initFlightsTabs = initFlightsTabs;
window.setComplaintStatus = setComplaintStatus;
window.resetComplaintPreview = resetComplaintPreview;
window.startRecording = startRecording;
window.stopRecording = stopRecording;
window.stopAssistantVoice = stopAssistantVoice;
window.toggleAssistantVoice = toggleAssistantVoice;
window.startComplaintRecording = startComplaintRecording;
window.stopComplaintRecording = stopComplaintRecording;
export function setTransportMode(mode) {
  if (window.state) {
    window.state.transportMode = mode;
  }
  if (typeof window.clearFlightsCache === 'function') {
    window.clearFlightsCache();
  }
  if (typeof window.updateHologramForMode === 'function') {
    window.updateHologramForMode(mode);
  }
  if (typeof window.updateMapSidePanelsForMode === 'function') {
    window.updateMapSidePanelsForMode(mode);
  }

  const logoText = document.querySelector('.logo-text');
  const assistantText = document.getElementById('assistant-text');
  const mapModalTitle = document.querySelector('#map-modal header h3');
  const flightsModalTitle = document.querySelector('#flights-modal header h3');

  // Modal Tab tugmalarini yangilash
  const departureTabBtn = document.querySelector('.flight-tab-btn[data-type="departure"]');
  const arrivalTabBtn = document.querySelector('.flight-tab-btn[data-type="arrival"]');

  if (mode === 'railway') {
    if (logoText) logoText.innerHTML = `<i id="transport-header-icon" class="fas fa-train" style="margin-right: 8px; color: #00e5ff;"></i> ACCESS RAILWAY`;
    if (assistantText) assistantText.innerText = "Xush kelibsiz! Vokzal va poyezdlar jadvali bo'yicha savol berishingiz mumkin.";
    if (mapModalTitle) mapModalTitle.innerText = "Temir Yo'l Vokzali Haritasi";
    if (flightsModalTitle) flightsModalTitle.innerText = "Joriy poyezdlar jadvali";

    if (departureTabBtn) departureTabBtn.innerHTML = `<i class="fas fa-train"></i> JO'NASH POYEZDLARI`;
    if (arrivalTabBtn) arrivalTabBtn.innerHTML = `<i class="fas fa-train"></i> KELISH POYEZDLARI`;

  } else if (mode === 'bus') {
    if (logoText) logoText.innerHTML = `<i id="transport-header-icon" class="fas fa-bus" style="margin-right: 8px; color: #ffcc00;"></i> ACCESS BUS TERMINAL`;
    if (assistantText) assistantText.innerText = "Xush kelibsiz! Avtovokzal va avtobus reyslari bo'yicha savol berishingiz mumkin.";
    if (mapModalTitle) mapModalTitle.innerText = "Avtovokzal Haritasi";
    if (flightsModalTitle) flightsModalTitle.innerText = "Joriy avtobus reyslari jadvali";

    if (departureTabBtn) departureTabBtn.innerHTML = `<i class="fas fa-bus"></i> JO'NASH AVTOBUSLARI`;
    if (arrivalTabBtn) arrivalTabBtn.innerHTML = `<i class="fas fa-bus"></i> KELISH AVTOBUSLARI`;

  } else {
    if (logoText) logoText.innerHTML = `<i id="transport-header-icon" class="fas fa-plane" style="margin-right: 8px; color: #00c6ff;"></i> ACCESS AIRPORT`;
    if (assistantText) assistantText.innerText = "Xush kelibsiz! Aeroport va parvozlar bo'yicha savol berishingiz mumkin.";
    if (mapModalTitle) mapModalTitle.innerText = "Aerovokzal Haritasi";
    if (flightsModalTitle) flightsModalTitle.innerText = "Joriy reyslar jadvali";

    if (departureTabBtn) departureTabBtn.innerHTML = `<i class="fas fa-plane-departure"></i> Uchib ketish`;
    if (arrivalTabBtn) arrivalTabBtn.innerHTML = `<i class="fas fa-plane-arrival"></i> Uchib kelish`;
  }
}
window.setTransportMode = setTransportMode;

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

  // --- Boshlang'ich Til Tanlash Logikasi (Vue tomonidan bajariladi) ---
};

// Auto-initialization Vue tomonidan Kiosk.vue da boshqariladi

export function updateMapSidePanelsForMode(mode = 'aviation') {
    const leftPanel = document.querySelector('#map-modal .map-side-panel.left');
    const rightPanel = document.querySelector('#map-modal .map-side-panel.right');
    const leftHeader = document.querySelector('#map-modal .map-side-panel.left .panel-header');
    const rightHeader = document.querySelector('#map-modal .map-side-panel.right .panel-header');
    const listServices = document.getElementById("list-services");
    const listGates = document.getElementById("list-gates");

    if (!listServices || !listGates) return;

    if (mode === 'bus') {
        if (leftPanel) leftPanel.style.display = "none";
        if (rightPanel) rightPanel.style.display = "flex";

        if (rightHeader) {
            rightHeader.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:8px; width:100%;">
                    <div style="display:flex; align-items:center; justify-content:space-between; padding:4px 0;">
                        <span style="font-weight:bold; font-size:13px; color:#00e5ff; display:flex; align-items:center; gap:6px;">
                            <i class="fas fa-list"></i> Barcha Marshrutlar
                        </span>
                    </div>
                    <div id="bus-search-wrapper" style="position:relative; width:100%; display:block;">
                        <i class="fas fa-search" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); color:#00e5ff; font-size:12px;"></i>
                        <input id="bus-search-input" type="text" placeholder="Qidirish (115, 28, 40)..." style="width:100%; padding:6px 10px 6px 30px; background:rgba(0,229,255,0.12); border:1px solid rgba(0,229,255,0.4); border-radius:6px; color:#fff; font-size:12px; outline:none; font-family:inherit;" />
                    </div>
                </div>
            `;
        }

        // Direct load All Bus Routes
        loadAllBusRoutesToPanel(listGates);

    } else {
        if (leftPanel) leftPanel.style.display = "flex";
        if (rightPanel) rightPanel.style.display = "flex";

        if (mode === 'railway') {
            if (leftHeader) leftHeader.innerText = "Vokzal Xizmatlari";
            if (rightHeader) rightHeader.innerText = "Peronlar & Yo'llar";

            const railwayServices = [
                { name: "Chiptaxonalar (Kassa 1-10)", icon: "fa-ticket-alt" },
                { name: "VIP / CIP Kutish Zali", icon: "fa-couch" },
                { name: "Ona va bola xonasi", icon: "fa-baby" },
                { name: "Yuk saqlash xonasi", icon: "fa-suitcase" },
                { name: "Kutish Zali & Kafe", icon: "fa-utensils" },
                { name: "Hojatxona", icon: "fa-restroom" },
                { name: "Tibbiyot Punkt (Medpunkt)", icon: "fa-first-aid" },
                { name: "Namozxona", icon: "fa-mosque" }
            ];

            const railwayPlatforms = [
                { name: "Peron 1 (Afrosiyob Yo'li)", icon: "fa-train" },
                { name: "Peron 2 (Sharq / Express Yo'li)", icon: "fa-train" },
                { name: "Peron 3 (Vodiy Yo'nalishi)", icon: "fa-train" },
                { name: "Peron 4 (Termiz / Qarshi Yo'li)", icon: "fa-train" },
                { name: "Peron 5 (Nukus / Xiva Yo'li)", icon: "fa-train" }
            ];

            renderPanelList(listServices, railwayServices);
            renderPanelList(listGates, railwayPlatforms);

        } else {
            if (leftHeader) leftHeader.innerText = "xizmatlar";
            if (rightHeader) rightHeader.innerText = "Darvozalar";
            if (window.airportNav && window.airportNav.nodes) {
                fillSidePanels(window.airportNav.nodes);
            }
        }
    }
}

async function loadNearbyBusesToPanel(container) {
    container.innerHTML = '<div style="color:#00e5ff; padding:15px; text-align:center;"><i class="fas fa-spinner fa-spin"></i> Yaqin atrofingizdagi avtobuslar aniqlanmoqda...</div>';

    try {
        // Tashkent International Airport Terminal 2 (Islam Karimov Airport)
        const kioskLat = 41.2579;
        const kioskLng = 69.2812;
        const res = await fetch(`/api/bus/nearby?lat=${kioskLat}&lng=${kioskLng}&radius=5.0`).then(r => r.json());

        if (res.success && res.data && res.data.length > 0) {
            container.innerHTML = "";
            res.data.forEach((v, idx) => {
                const item = document.createElement("div");
                item.className = "panel-item bus-nearby-item";
                if (idx === 0) item.classList.add("active");
                item.style.display = "flex";
                item.style.flexDirection = "column";
                item.style.alignItems = "flex-start";
                item.style.gap = "4px";
                item.style.padding = "10px 12px";

                item.innerHTML = `
                    <div style="display:flex; justify-content:space-between; width:100%; font-weight:bold;">
                        <span style="color:#ffcc00;"><i class="fas fa-bus"></i> ${v.routeName}-Avtobus</span>
                        <span style="color:#00e5ff; font-size:11px;">📍 ${v.distanceMeters}m masofa</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; width:100%; font-size:11px; color:rgba(255,255,255,0.7);">
                        <span>⏱️ ~${v.etaMin} daqiqada keladi</span>
                        <span>kn ${v.govNumber || ''}</span>
                    </div>
                `;

                item.onclick = (e) => {
                    e.preventDefault();
                    document.querySelectorAll('.bus-nearby-item').forEach(el => el.classList.remove('active'));
                    item.classList.add('active');

                    if (window.airportNav && typeof window.airportNav.updateLeafletRoute === 'function') {
                        window.airportNav.updateLeafletRoute(`${v.routeName}-Avtobus`);
                    }
                };
                container.appendChild(item);
            });

            if (window.airportNav && typeof window.airportNav.updateLeafletNearbyBuses === 'function') {
                window.airportNav.updateLeafletNearbyBuses(kioskLat, kioskLng, 2.5);
            }
        } else {
            container.innerHTML = '<div style="color:rgba(255,255,255,0.6); padding:15px; text-align:center;">Yaqin atrofda avtobus topilmadi</div>';
        }
    } catch(err) {
        console.error('Nearby buses load error:', err);
        container.innerHTML = '<div style="color:#ff5252; padding:10px;">Yaqin avtobuslarni yuklashda xatolik</div>';
    }
}

let allBusRoutesList = [];

async function loadAllBusRoutesToPanel(container) {
    container.innerHTML = '<div style="color:#00e5ff; padding:15px; text-align:center;"><i class="fas fa-spinner fa-spin"></i> Marshrutlar yuklanmoqda...</div>';

    try {
        if (allBusRoutesList.length === 0) {
            const res = await fetch('/api/bus/routes').then(r => r.json());
            if (res.success && res.data) {
                const map = new Map();
                res.data.forEach(r => {
                    if (r.routeName && !map.has(String(r.routeName))) {
                        map.set(String(r.routeName), r);
                    }
                });

                allBusRoutesList = Array.from(map.values()).sort((a, b) => {
                    const numA = parseInt(a.routeName) || 999;
                    const numB = parseInt(b.routeName) || 999;
                    if (numA !== numB) return numA - numB;
                    return String(a.routeName).localeCompare(String(b.routeName));
                });
            }
        }

        renderBusRoutesList(container, allBusRoutesList);

        const searchInput = document.getElementById('bus-search-input');
        if (searchInput) {
            searchInput.value = '';
            searchInput.oninput = (e) => {
                const query = e.target.value.trim().toLowerCase();
                if (!query) {
                    renderBusRoutesList(container, allBusRoutesList);
                    return;
                }

                const numMatch = query.match(/\d+/)?.[0];
                const filtered = allBusRoutesList.filter(r => {
                    const rName = String(r.routeName || '').toLowerCase();
                    const rId = String(r.routeId || '').toLowerCase();
                    if (numMatch && rName === numMatch) return true;
                    if (numMatch && rName.includes(numMatch)) return true;
                    if (rName.includes(query) || rId.includes(query)) return true;
                    return false;
                }).sort((a, b) => {
                    if (numMatch) {
                        if (String(a.routeName) === numMatch) return -1;
                        if (String(b.routeName) === numMatch) return 1;
                    }
                    return (parseInt(a.routeName) || 999) - (parseInt(b.routeName) || 999);
                });

                renderBusRoutesList(container, filtered);
            };
        }
    } catch(err) {
        console.error('Bus routes panel load error:', err);
        container.innerHTML = '<div style="color:#ff5252; padding:10px;">Marshrutlarni yuklashda xatolik</div>';
    }
}

function renderBusRoutesList(container, routes) {
    container.innerHTML = "";
    if (routes.length === 0) {
        container.innerHTML = '<div style="color:rgba(255,255,255,0.5); padding:15px; text-align:center;">Marshrut topilmadi</div>';
        return;
    }

    routes.forEach((r, idx) => {
        const item = document.createElement("div");
        item.className = "panel-item bus-route-item";
        if (idx === 0) item.classList.add("active");
        item.innerHTML = `<i class="fas fa-bus" style="color:#ffcc00;"></i><span>${r.routeName}-Avtobus Yo'nalishi</span>`;
        item.onclick = (e) => {
            e.preventDefault();
            document.querySelectorAll('.bus-route-item').forEach(el => el.classList.remove('active'));
            item.classList.add('active');

            if (window.airportNav && typeof window.airportNav.updateLeafletRoute === 'function') {
                window.airportNav.updateLeafletRoute(`${r.routeName}-Avtobus`);
            }
        };
        container.appendChild(item);
    });
}

function renderPanelList(container, items) {
    container.innerHTML = "";
    items.forEach(itemData => {
        const item = document.createElement("div");
        item.className = "panel-item";
        item.innerHTML = `<i class="fas ${itemData.icon}"></i><span>${itemData.name}</span>`;
        item.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (window.airportNav && typeof window.airportNav.findPath === "function") {
                window.airportNav.findPath(itemData.name);
            }
        };
        container.appendChild(item);
    });
}
window.updateMapSidePanelsForMode = updateMapSidePanelsForMode;

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

