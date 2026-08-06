export function typewriterEffect(element, html, speed = 15) {
  if (!element || !html) return;
  element.innerHTML = "";
  element.classList.add("typing");
  
  // Tag-larni saqlab qolish uchun vaqtinchalik div-dan foydalanamiz
  const temp = document.createElement("div");
  temp.innerHTML = html;
  const nodes = Array.from(temp.childNodes);
  
  let nodeIdx = 0;
  let charIdx = 0;
  
  const typeChar = () => {
    if (nodeIdx < nodes.length) {
      const node = nodes[nodeIdx];
      if (node.nodeType === Node.TEXT_NODE) {
        if (charIdx < node.textContent.length) {
          element.innerHTML += node.textContent.charAt(charIdx);
          charIdx++;
          setTimeout(typeChar, speed);
        } else {
          nodeIdx++;
          charIdx = 0;
          setTimeout(typeChar, 0);
        }
      } else {
        // Element tugunini (span, strong va h.k.) birdaniga qo'shamiz
        element.appendChild(node.cloneNode(true));
        nodeIdx++;
        setTimeout(typeChar, speed * 2);
      }
    } else {
      element.classList.remove("typing");
    }
  };
  typeChar();
}

/**
 * Global inline navigation handler
 */
window.handleInlineRoute = function(counterRange) {
    console.log("✈️ Inline route triggered for counter:", counterRange);
    // window.routeToCheckinCounter api.js da global qilingan
    if (window.routeToCheckinCounter) {
        window.routeToCheckinCounter(counterRange, "INLINE");
    }
};

export function showModal(id) {
  const modal = typeof id === "string" ? document.getElementById(id) : id;
  if (!modal) return;
  modal.classList.remove("hide");
  window.pauseHologram = true; // Modal ochiqligida hologramni to'xtatish
  if (modal.id === "earth-modal") window.pauseEarth = false;
  const content = modal.querySelector(".modal-content") || modal;
  if (typeof window.gsap !== "undefined") {
    window.gsap.fromTo(
      content,
      { opacity: 0, y: 50, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: "power3.out" },
    );
  }
}

export function hideModal(id) {
  const modal = typeof id === "string" ? document.getElementById(id) : id;
  if (!modal || modal.classList.contains("hide")) return;
  const content = modal.querySelector(".modal-content") || modal;
  if (typeof window.gsap !== "undefined") {
    window.gsap.to(content, {
      opacity: 0,
      y: -20,
      scale: 0.95,
      duration: 0.3,
      ease: "power2.in",
      onComplete: () => {
        modal.classList.add("hide");
        if (modal.querySelector(".modal-content")) {
            modal.querySelector(".modal-content").style = "";
        } else {
            modal.style.opacity = "";
            modal.style.transform = "";
        }
        checkOpenModalsForHologram();
      },
    });
  } else {
    modal.classList.add("hide");
    checkOpenModalsForHologram();
  }
}

function checkOpenModalsForHologram() {
  setTimeout(() => {
    const openModals = document.querySelectorAll(".modal:not(.hide)");
    if (openModals.length === 0) {
      window.pauseHologram = false;
    }
  }, 100);
  window.pauseEarth = true; // Yopilganda earth ni pause qilish
}

export function setComplaintStatus(text, isError = false) {
  const el = document.getElementById("complaint-status");
  if (!el) return;
  el.textContent = text;
  el.style.color = isError ? "#ff7a7a" : "";
}

export function resetComplaintPreview() {
  const preview = document.getElementById("complaint-audio-preview");
  if (!preview) return;
  preview.pause();
  preview.removeAttribute("src");
  preview.style.display = "none";
}

let cachedFlightsData = null;
let cachedTransportMode = null;

export function clearFlightsCache() {
  cachedFlightsData = null;
  cachedTransportMode = null;
}
window.clearFlightsCache = clearFlightsCache;

export async function loadFlightsToTable(filterType = "departure") {
  const tbody = document.getElementById("flights-body");
  if (!tbody) return;
  tbody.innerHTML =
    '<tr><td colspan="6" style="text-align:center;">Yuklanmoqda...</td></tr>';

  const mode = window.state?.transportMode || "aviation";

  // Table header larni dinamik yangilash
  const tableHeaderRow = document.querySelector("#flights-table thead tr");
  if (tableHeaderRow) {
    if (mode === "railway") {
      tableHeaderRow.innerHTML = `<th>Poyezd №</th><th>Yo'nalish</th><th>Vaqt</th><th>Peron</th><th>Vagon / Kassa</th><th>Holat</th>`;
    } else if (mode === "bus") {
      tableHeaderRow.innerHTML = `<th>Avtobus №</th><th>Yo'nalish</th><th>Vaqt</th><th>Platforma</th><th>Chiptaxona</th><th>Holat</th>`;
    } else {
      tableHeaderRow.innerHTML = `<th>Reys №</th><th>Yo'nalish</th><th>Vaqt</th><th>Gate</th><th>Stoyka</th><th>Holat</th>`;
    }
  }

  try {
    let flights = cachedFlightsData;
    if (!flights || cachedTransportMode !== mode) {
      const response = await fetch(`api/flights?mode=${mode}`);
      flights = await response.json();
      cachedFlightsData = flights;
      cachedTransportMode = mode;
    }

    tbody.innerHTML = "";
    if (flights && flights.error) {
      tbody.innerHTML =
        '<tr><td colspan="6" style="text-align:center; color:#ff5252;">API xatosi: ' +
        flights.error +
        "</td></tr>";
      return;
    }
    if (Array.isArray(flights)) {
      const filteredFlights = flights.filter((f) => {
        const isArr =
          f.type === "arrival" ||
          f.movement === "ARRIVAL" ||
          (f.to && (f.to.includes("TAS") || f.to.includes("Toshkent Shimoliy") || f.to.includes("Toshkent Central")));
        return filterType === "arrival" ? isArr : !isArr;
      });

      if (filteredFlights.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Hozircha ${filterType === "arrival" ? "keladigan" : "ketadigan"} reyslar yo'q.</td></tr>`;
      } else {
        filteredFlights.forEach((f) => {
          const tr = document.createElement("tr");

          let directionBadge = "";
          let routeHtml = "";
          let iconClass = "fa-plane";
          if (mode === "railway") iconClass = "fa-train";
          else if (mode === "bus") iconClass = "fa-bus";
          else iconClass = f.type === "arrival" ? "fa-plane-arrival" : "fa-plane-departure";

          const isArr = f.type === "arrival" || f.movement === "ARRIVAL";
          if (isArr) {
            directionBadge = '<span style="color:#00e5ff; font-weight:bold;">[KELISH]</span>';
            routeHtml = `<strong>${f.from}</strong> <i class="fas ${iconClass}" style="margin:0 5px;color:#00e5ff"></i> ${f.to}`;
          } else {
            directionBadge = '<span style="color:#ffcc00; font-weight:bold;">[JO\'NASH]</span>';
            routeHtml = `${f.from} <i class="fas ${iconClass}" style="margin:0 5px;color:#ffcc00"></i> <strong>${f.to}</strong>`;
          }

          const statusClass =
            f.status && (f.status.toLowerCase().includes("uchib") || f.status.toLowerCase().includes("yo'lga"))
              ? 'style="background:rgba(255,82,82,0.2);"'
              : 'style="background:rgba(0,198,255,0.2);"';

          tr.innerHTML = `
                <td style="font-weight:bold; color:var(--secondary-blue);">${directionBadge} <br/> ${f.flight_no}</td>
                <td>${routeHtml}</td>
                <td>${f.time}</td>
                <td>${f.gate || "N/A"}</td>
                <td>${f.checkin_counters || "N/A"}</td>
                <td><span ${statusClass} class="status-badge">${f.status || "N/A"}</span></td>
            `;
          tbody.appendChild(tr);
        });
      }

      if (typeof window.gsap !== "undefined") {
        window.gsap.fromTo(
          "#flights-body tr",
          { opacity: 0, x: -20 },
          {
            opacity: 1,
            x: 0,
            duration: 0.4,
            stagger: 0.05,
            ease: "power2.out",
          },
        );
      }
    } else {
      tbody.innerHTML =
        '<tr><td colspan="6" style="text-align:center;">Ma\'lumot topilmadi.</td></tr>';
    }
  } catch (err) {
    console.error(err);
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align:center; color:#ff5252;">Yuklashda xato yuz berdi.</td></tr>';
  }
}

export function initFlightsTabs() {
  const tabBtns = document.querySelectorAll(".flight-tab-btn");
  if (!tabBtns.length) return;

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      tabBtns.forEach((b) => b.classList.remove("active"));
      e.target.classList.add("active");
      const type = e.target.getAttribute("data-type") || "departure";
      loadFlightsToTable(type);
    });
  });
}
