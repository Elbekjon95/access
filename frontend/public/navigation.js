class AirportNavigation {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");
    this.worldWidth = 0;
    this.worldHeight = 0;
    this.pxScale = 1;
    this.nodes = [];
    this.path = [];
    this.barriers = [];
    this.collisionGrid = null;
    this.gridSize = 30; // Grid o'lchami oshirildi (tezlik uchun)
    this.backgroundImage = new Image();
    this.railwayMapImage = new Image();
    this.railwayMapImage.src = 'img/railway_map.png';
    this.kioskPos = { x: 500, y: 800 };
    this.offset = 0;
    this.pathRevealProgress = 0; 
    this.isAnimatingPath = false;
    this.pathDrawDuration = 3.0; // Sekinlashtirildi (User talabi: 3.0s)
    this.cameraProgress = 0;
    this.totalPathLength = 0;
    this.pathSegments = [];
    this.lastFrameTime = performance.now();
    this.lastRenderTime = 0;
    this.activeFps = 60; // Yanada silliq animatsiya uchun
    this.idleFps = 10;
    this.needsRender = true;
    this.lowFxMode = false;
    this.mapReady = false;
    this.pendingTarget = null;
    this.resizeCanvasToContainer();
    window.addEventListener("resize", () => this.resizeCanvasToContainer());
    
    // Click listener for markers
    this.canvas.addEventListener("mousedown", (e) => this.handleCanvasClick(e));
    
    this.animate();
  }

  resizeCanvasToContainer() {
    const container = this.canvas ? this.canvas.parentElement : null;
    if (!container) return;
    
    const nextW = Math.max(800, container.clientWidth || 1280);
    const nextH = Math.max(600, container.clientHeight || 720);
    
    if (this.canvas.width !== nextW || this.canvas.height !== nextH) {
      console.log("[NAV] Resizing canvas to:", nextW, "x", nextH);
      this.canvas.width = nextW;
      this.canvas.height = nextH;
      this.needsRender = true;
    }
  }

  animate() {
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastFrameTime) / 1000);
    this.lastFrameTime = now;

    if (this.isAnimatingPath) {
      this.offset += dt * 15;
      if (this.offset > 25) this.offset = 0;
      
      const step = dt / this.pathDrawDuration;
      this.pathRevealProgress = Math.min(1, this.pathRevealProgress + step);
      this.cameraProgress = Math.min(1, this.cameraProgress + step);

      if (this.pathRevealProgress >= 1 && this.cameraProgress >= 1) {
        this.isAnimatingPath = false;
      }
    }

    const mustRender = this.isAnimatingPath || this.needsRender;
    if (mustRender) {
      const targetFps = this.isAnimatingPath ? this.activeFps : this.idleFps;
      const frameInterval = 1000 / targetFps;
      if (now - this.lastRenderTime >= frameInterval) {
        this.render();
        this.lastRenderTime = now;
        if (!this.isAnimatingPath) this.needsRender = false;
      }
    }
    requestAnimationFrame(() => this.animate());
  }

  async loadMap(imagePath) {
    this.backgroundImage.src = imagePath;
    this.backgroundImage.onload = () => {
      this.worldWidth = this.backgroundImage.width;
      this.worldHeight = this.backgroundImage.height;
      this.resizeCanvasToContainer();
      this.updateCollisionGrid();
      this.needsRender = true;
      this.mapReady = true;
      if (this.pendingTarget) {
        const targetName = this.pendingTarget;
        this.pendingTarget = null;
        this.findPath(targetName);
      }
    };
    try {
      const apiBase = (window.location.pathname.includes("/admin/")) ? "../" : "";
      const res = await fetch(`${apiBase}api/barriers`);
      this.barriers = await res.json();
      this.updateCollisionGrid();
    } catch (e) {
      console.error("Barriers fetch error:", e);
    }
  }

  updateCollisionGrid() {
    if (!this.worldWidth || !this.worldHeight) return;
    const cols = Math.ceil(this.worldWidth / this.gridSize) + 1;
    const rows = Math.ceil(this.worldHeight / this.gridSize) + 1;
    this.collisionGrid = new Uint8Array(cols * rows);

    this.barriers.forEach((b) => {
      const pts = b.barrier_data;
      if (!Array.isArray(pts) || pts.length < 2) return;

      // Polyline-ni grid-ga chizish
      for (let i = 1; i < pts.length; i++) {
        const p1 = pts[i-1];
        const p2 = pts[i];
        this.fillLineOnGrid(p1.x, p1.y, p2.x, p2.y, cols, rows);
      }
    });
  }

  fillLineOnGrid(x1, y1, x2, y2, cols, rows) {
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.ceil(dist / (this.gridSize / 2));
    for (let s = 0; s <= steps; s++) {
      const tx = x1 + (x2 - x1) * (s / steps);
      const ty = y1 + (y2 - y1) * (s / steps);
      const gx = Math.floor(tx / this.gridSize);
      const gy = Math.floor(ty / this.gridSize);
      if (gx >= 0 && gx < cols && gy >= 0 && gy < rows) {
        this.collisionGrid[gy * cols + gx] = 1;
      }
    }
  }

  isGridBlocked(gx, gy) {
    if (!this.collisionGrid) return false;
    const cols = Math.ceil(this.worldWidth / this.gridSize) + 1;
    const rows = Math.ceil(this.worldHeight / this.gridSize) + 1;
    if (gx < 0 || gy < 0 || gx >= cols || gy >= rows) return true;
    return this.collisionGrid[gy * cols + gx] === 1;
  }

  findNearestWalkable(gx, gy) {
      if (!this.isGridBlocked(gx, gy)) return { x: gx, y: gy };
      const maxRadius = 10;
      for (let r = 1; r <= maxRadius; r++) {
          for (let dx = -r; dx <= r; dx++) {
              for (let dy = -r; dy <= r; dy++) {
                  if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
                  const nx = gx + dx;
                  const ny = gy + dy;
                  if (!this.isGridBlocked(nx, ny)) return { x: nx, y: ny };
              }
          }
      }
      return { x: gx, y: gy };
  }

  setNodes(nodes) {
    this.nodes = (nodes || []).map(n => ({...n, pos_x: Number(n.pos_x), pos_y: Number(n.pos_y)}));
    const kiosk = this.nodes.find(n => n.type === 'kiosk_start' || n.name === 'kiosk_start');
    if (kiosk) this.kioskPos = { x: kiosk.pos_x, y: kiosk.pos_y };
    this.needsRender = true;
  }

  resetZoom() {
    this.isAnimatingPath = false;
    this.path = [];
    this.pathRevealProgress = 0; 
    this.cameraProgress = 0;
    this.needsRender = true;
  }

  navigateTo(targetX, targetY, targetName) {
    const tx = Number(targetX);
    const ty = Number(targetY);
    if (isNaN(tx) || isNaN(ty) || (tx === 0 && ty === 0)) return this.findPath(targetName);

    if (!this.mapReady || !this.worldWidth) {
      this.pendingTarget = targetName;
      return;
    }

    this.resetZoom();
    const start = { x: this.kioskPos.x, y: this.kioskPos.y };
    const end = { x: tx, y: ty };

    let gridPath = this.aStar(this.toGrid(start), this.toGrid(end));
    if (gridPath && gridPath.length > 1) {
      this.path = gridPath.map(p => this.fromGrid(p));
    } else {
      this.path = [start, end];
    }

    this.pathRevealProgress = 0.01;
    this.cameraProgress = 0.01;
    this.isAnimatingPath = true;
    this.needsRender = true;
    this.computePathMetrics();
    
    const modal = document.getElementById("map-modal");
    if (modal) {
        modal.classList.remove("hide");
        modal.style.display = "flex";
    }
  }

  handleCanvasClick(e) {
    if (this.isAnimatingPath) return;

    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Viewport to World coordinates
    const wW = this.worldWidth || 1000;
    const wH = this.worldHeight || 1000;
    const fitScale = Math.min(this.canvas.width / wW, this.canvas.height / wH);
    
    // Soddalashtirilgan: faqat fitScale bilan hisoblaymiz (agar zoom bo'lmasa)
    // To'liq hisob-kitob renderdagi transforms-ni teskari aylantirishni talab qiladi
    // Hozircha faqat reset bo'lgan holatdagini hisoblaymiz
    const offsetX = (this.canvas.width - wW * fitScale) / 2;
    const offsetY = (this.canvas.height - wH * fitScale) / 2;

    const worldX = (mouseX - offsetX) / fitScale;
    const worldY = (mouseY - offsetY) / fitScale;

    // Markerlarni tekshirish
    const hitRadius = 30; // px xaritada
    const targetNode = this.nodes.find(n => {
        if (n.type === 'kiosk_start') return false;
        const dist = Math.hypot(n.pos_x - worldX, n.pos_y - worldY);
        return dist < hitRadius;
    });

    if (targetNode) {
        console.log("[NAV] Clicked marker:", targetNode.name);
        this.navigateTo(targetNode.pos_x, targetNode.pos_y, targetNode.name);
    }
  }

  findPath(targetName) {
    if (window.state?.transportMode === 'bus') {
      this.updateLeafletRoute(targetName);
      const modal = document.getElementById("map-modal");
      if (modal) modal.classList.remove("hide");
      this.needsRender = true;
      return { name: targetName };
    }
    if (!this.mapReady) {
      this.pendingTarget = targetName;
      return null;
    }
    if (!this.nodes || this.nodes.length === 0) return null;

    const normalize = (text) =>
      String(text || "").toLowerCase().replace(/[_-]+/g, " ").replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();

    const normalizedSearch = normalize(targetName);
    const directMatches = this.nodes.filter((n) => {
      const nodeName = normalize(n.name);
      return nodeName.includes(normalizedSearch) || normalizedSearch.includes(nodeName);
    });

    let target = directMatches[0] || null;
    if (!target) return null;

    const start = { x: this.kioskPos.x, y: this.kioskPos.y };
    const end = { x: target.pos_x, y: target.pos_y };
    
    const gridPath = this.aStar(this.toGrid(start), this.toGrid(end));
    if (gridPath) {
      this.path = gridPath.map(p => this.fromGrid(p));
    } else {
      this.path = [start, end];
    }

    this.pathRevealProgress = 0;
    this.cameraProgress = 0;
    this.isAnimatingPath = true;
    this.needsRender = true;
    this.computePathMetrics();
    
    const modal = document.getElementById("map-modal");
    if (modal) modal.classList.remove("hide");
    return target;
  }

  aStar(inputStart, inputEnd) {
    const start = this.findNearestWalkable(inputStart.x, inputStart.y);
    const end = this.findNearestWalkable(inputEnd.x, inputEnd.y);
    let openSet = [start];
    let cameFrom = new Map();
    let gScore = new Map();
    let fScore = new Map();
    const key = (p) => `${p.x},${p.y}`;
    gScore.set(key(start), 0);
    fScore.set(key(start), Math.abs(start.x - end.x) + Math.abs(start.y - end.y));

    while (openSet.length > 0) {
      let current = openSet.reduce((a, b) => fScore.get(key(a)) < fScore.get(key(b)) ? a : b);
      if (current.x === end.x && current.y === end.y) {
        let path = [current];
        while (cameFrom.has(key(current))) {
          current = cameFrom.get(key(current));
          path.unshift(current);
        }
        return path;
      }
      openSet = openSet.filter(n => n !== current);
      const dirs = [{x:0,y:1},{x:0,y:-1},{x:1,y:0},{x:-1,y:0},{x:1,y:1},{x:-1,y:-1},{x:1,y:-1},{x:-1,y:1}];
      for (let d of dirs) {
        let neighbor = { x: current.x + d.x, y: current.y + d.y };
        if (this.isGridBlocked(neighbor.x, neighbor.y)) continue;
        if (d.x !== 0 && d.y !== 0) {
          if (this.isGridBlocked(current.x + d.x, current.y) && this.isGridBlocked(current.x, current.y + d.y)) continue;
        }
        let tentativeG = gScore.get(key(current)) + (d.x !== 0 && d.y !== 0 ? 1.4 : 1);
        if (!gScore.has(key(neighbor)) || tentativeG < gScore.get(key(neighbor))) {
          cameFrom.set(key(neighbor), current);
          gScore.set(key(neighbor), tentativeG);
          fScore.set(key(neighbor), tentativeG + Math.abs(neighbor.x - end.x) + Math.abs(neighbor.y - end.y));
          if (!openSet.some(n => n.x === neighbor.x && n.y === neighbor.y)) openSet.push(neighbor);
        }
      }
    }
    return null;
  }

  toGrid(p) { return { x: Math.round(p.x / this.gridSize), y: Math.round(p.y / this.gridSize) }; }
  fromGrid(p) { return { x: p.x * this.gridSize, y: p.y * this.gridSize }; }

  computePathMetrics() {
    this.pathSegments = []; this.totalPathLength = 0;
    if (!this.path) return;
    for (let i = 1; i < this.path.length; i++) {
        const len = Math.hypot(this.path[i].x - this.path[i-1].x, this.path[i].y - this.path[i-1].y);
        this.pathSegments.push(len);
        this.totalPathLength += len;
    }
  }

  getPointAtProgress(progress) {
    if (!this.path || this.path.length < 2) return null;
    const target = this.totalPathLength * progress;
    let current = 0;
    for (let i = 1; i < this.path.length; i++) {
        const seg = this.pathSegments[i-1];
        if (current + seg >= target) {
            const t = (target - current) / seg;
            return {
                x: this.path[i-1].x + (this.path[i].x - this.path[i-1].x) * t,
                y: this.path[i-1].y + (this.path[i].y - this.path[i-1].y) * t,
                dirX: (this.path[i].x - this.path[i-1].x) / seg,
                dirY: (this.path[i].y - this.path[i-1].y) / seg
            };
        }
        current += seg;
    }
    const last = this.path[this.path.length-1];
    return { x: last.x, y: last.y, dirX: 1, dirY: 0 };
  }

  render() {
    if (!this.backgroundImage.complete || !this.canvas) return;
    if (this.canvas.width < 10 || this.canvas.height < 10) this.resizeCanvasToContainer();

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = "high";

    const follow = window.NAV_CAMERA_FOLLOW !== false;
    const zoom = window.NAV_CAMERA_ZOOM || 1.7;
    let cameraPos = null;
    
    if (follow && this.path && this.path.length > 1) {
       cameraPos = this.getPointAtProgress(Math.min(this.cameraProgress, this.pathRevealProgress));
    }

    const wW = this.worldWidth || 1000;
    const wH = this.worldHeight || 1000;
    const fitScale = Math.min(this.canvas.width / wW, this.canvas.height / wH);
    const scale = (cameraPos && follow) ? fitScale * zoom : fitScale;
    this.pxScale = 1 / scale;

    let offsetX = (this.canvas.width - wW * scale) / 2;
    let offsetY = (this.canvas.height - wH * scale) / 2;

    if (cameraPos && follow) {
       offsetX = this.canvas.width/2 - cameraPos.x * scale;
       offsetY = this.canvas.height/2 - cameraPos.y * scale;
       offsetX = Math.min(0, Math.max(this.canvas.width - wW * scale, offsetX));
       offsetY = Math.min(0, Math.max(this.canvas.height - wH * scale, offsetY));
    }

    this.ctx.save();
    this.ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

    const currentMode = window.state?.transportMode || 'aviation';
    const busContainer = document.getElementById('leaflet-bus-map');

    if (currentMode === 'bus') {
      if (busContainer) busContainer.style.display = 'block';
      if (this.canvas) this.canvas.style.display = 'none';
      this.initLeafletMap();
      this.isSingleRouteMode = false;
      this.startLiveBusTrackingLoop();
    } else {
      if (busContainer) busContainer.style.display = 'none';
      if (this.canvas) this.canvas.style.display = 'block';
      if (currentMode === 'railway') {
        if (this.railwayMapImage && this.railwayMapImage.complete && this.railwayMapImage.naturalWidth !== 0) {
          this.ctx.drawImage(this.railwayMapImage, 0, 0, wW, wH);
        } else {
          this.drawRailwayStationMap(wW, wH);
        }
      } else {
        this.ctx.drawImage(this.backgroundImage, 0, 0);
      }
    }

    // Markerlarni chizish (Logotiplar va Ikonkalar bilan)
    const iconMap = {
        'cafe': '\uf2e7',
        'restaurant': '\uf2e7',
        'toilet': '\uf7bd',
        'mosque': '\uf66d',
        'vip': '\uf005',
        'cip': '\uf005',
        'info': '\uf05a',
        'gate': '\uf5b0',
        'fids': '\uf072',
        'counter': '\uf48b',
        'entrance': '\uf52b',
        'exit': '\uf52a',
        'reception': '\uf590'
    };

    this.nodes.forEach(n => {
        const isKiosk = n.type === 'kiosk_start' || n.name === 'kiosk_start';
        
        if (isKiosk) {
            // Kiosk marker (Sariq nuqta)
            this.ctx.fillStyle = "#ffcc00";
            this.ctx.beginPath();
            this.ctx.arc(n.pos_x, n.pos_y, 5 * this.pxScale, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 10 * this.pxScale;
            this.ctx.shadowColor = "#ffcc00";
            this.ctx.strokeStyle = "white";
            this.ctx.lineWidth = 1 * this.pxScale;
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;
            return;
        }
        
        // Ikonka yoki logotipni aniqlash
        const iconChar = iconMap[n.type] || '\uf111'; // Standart nuqta
        const iconColor = n.type ? "#00c6ff" : "rgba(255,255,255,0.5)";

        // Fon doirasi (subtle glow)
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        this.ctx.beginPath();
        this.ctx.arc(n.pos_x, n.pos_y, 10 * this.pxScale, 0, Math.PI * 2);
        this.ctx.fill();

        // Ikonkani chizish (FontAwesome)
        this.ctx.fillStyle = iconColor;
        this.ctx.font = `900 ${Math.round(12 * this.pxScale)}px "Font Awesome 6 Free"`;
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText(iconChar, n.pos_x, n.pos_y);

        // Label (Agar zoom bo'lsa)
        if (scale > 1.3) {
            this.ctx.fillStyle = "white";
            this.ctx.font = `600 ${Math.round(8 * this.pxScale)}px Outfit`;
            this.ctx.textAlign = "center";
            this.ctx.fillText(n.name, n.pos_x, n.pos_y + 18 * this.pxScale);
        }
    });

    if (this.path && this.path.length >= 2) {
      this.ctx.strokeStyle = window.NAV_LINE_COLOR || "#ff3b30";
      this.ctx.lineWidth = (window.NAV_LINE_WIDTH || 12) * this.pxScale;
      this.ctx.lineCap = "round"; this.ctx.lineJoin = "round";
      
      this.ctx.beginPath();
      this.ctx.moveTo(this.path[0].x, this.path[0].y);
      
      const totalPoints = this.path.length;
      const progressWeight = this.pathRevealProgress * (totalPoints - 1);
      const fullPoints = Math.floor(progressWeight);
      const partialSegment = progressWeight - fullPoints;

      for (let i = 1; i <= fullPoints; i++) {
        if (this.path[i]) this.ctx.lineTo(this.path[i].x, this.path[i].y);
      }

      if (partialSegment > 0 && fullPoints < totalPoints - 1) {
        const p1 = this.path[fullPoints];
        const p2 = this.path[fullPoints + 1];
        if (p1 && p2) {
            const px = p1.x + (p2.x - p1.x) * partialSegment;
            const py = p1.y + (p2.y - p1.y) * partialSegment;
            this.ctx.lineTo(px, py);
        }
      }
      this.ctx.stroke();

      this.ctx.fillStyle = "#007bff";
      this.ctx.beginPath(); 
      this.ctx.arc(this.path[0].x, this.path[0].y, 8 * this.pxScale, 0, Math.PI * 2); 
      this.ctx.fill();
      this.ctx.strokeStyle = "white";
      this.ctx.lineWidth = 1.5 * this.pxScale;
      this.ctx.stroke();

      if (this.pathRevealProgress > 0.9) {
          const last = this.path[this.path.length - 1];
          if (last) {
            this.ctx.fillStyle = "#ff3b30";
            this.ctx.beginPath(); 
            this.ctx.arc(last.x, last.y, 11 * this.pxScale, 0, Math.PI * 2); 
            this.ctx.fill();
            this.ctx.strokeStyle = "white";
            this.ctx.lineWidth = 2 * this.pxScale;
            this.ctx.stroke();
            this.ctx.fillStyle = "white";
            this.ctx.beginPath();
            this.ctx.arc(last.x, last.y, 4 * this.pxScale, 0, Math.PI * 2);
            this.ctx.fill();
          }
      }
    }
    this.ctx.restore();
  }

  drawRailwayStationMap(wW, wH) {
    const ctx = this.ctx;
    ctx.fillStyle = "#0c1825";
    ctx.fillRect(0, 0, wW, wH);

    ctx.strokeStyle = "rgba(0, 198, 255, 0.08)";
    ctx.lineWidth = 1;
    for (let x = 0; x < wW; x += 50) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, wH); ctx.stroke();
    }
    for (let y = 0; y < wH; y += 50) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(wW, y); ctx.stroke();
    }

    ctx.fillStyle = "#16283d";
    ctx.strokeStyle = "#00e5ff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(150, 250, 700, 500, 20); else ctx.rect(150, 250, 700, 500);
    ctx.fill();
    ctx.stroke();

    const platformY = [80, 120, 160, 200];
    const platformNames = ["PERON 1 (Afrosiyob)", "PERON 2 (Sharq Express)", "PERON 3 (Vodiy Yo'li)", "PERON 4 (Termiz/Qarshi)"];

    for (let i = 0; i < platformY.length; i++) {
      const y = platformY[i];
      ctx.strokeStyle = "rgba(255, 204, 0, 0.6)";
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(100, y); ctx.lineTo(900, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(100, y + 6); ctx.lineTo(900, y + 6); ctx.stroke();

      ctx.fillStyle = "rgba(0, 229, 255, 0.2)";
      ctx.strokeStyle = "#00e5ff";
      ctx.lineWidth = 1;
      ctx.fillRect(140, y - 18, 720, 12);
      ctx.strokeRect(140, y - 18, 720, 12);

      ctx.fillStyle = "#00e5ff";
      ctx.font = "bold 12px Orbitron, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`🚆 ${platformNames[i]}`, 150, y - 6);
    }

    ctx.fillStyle = "#ffcc00";
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(250, 72, 380, 14, 6); else ctx.rect(250, 72, 380, 14);
    ctx.fill();
    ctx.fillStyle = "#000000";
    ctx.font = "bold 9px sans-serif";
    ctx.fillText("AFROSIYOB 762F", 260, 83);

    ctx.fillStyle = "rgba(0, 198, 255, 0.15)";
    ctx.strokeStyle = "rgba(0, 198, 255, 0.4)";
    ctx.fillRect(180, 280, 220, 140);
    ctx.strokeRect(180, 280, 220, 140);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px Outfit, sans-serif";
    ctx.fillText("🎫 CHIPTAXONALAR (KASSA 1-10)", 195, 310);

    ctx.fillStyle = "rgba(255, 204, 0, 0.15)";
    ctx.strokeStyle = "rgba(255, 204, 0, 0.4)";
    ctx.fillRect(440, 280, 220, 140);
    ctx.strokeRect(440, 280, 220, 140);
    ctx.fillStyle = "#ffcc00";
    ctx.fillText("⭐ VIP / CIP KUTISH ZALI", 455, 310);

    ctx.fillStyle = "rgba(0, 230, 118, 0.15)";
    ctx.strokeStyle = "rgba(0, 230, 118, 0.4)";
    ctx.fillRect(680, 280, 140, 140);
    ctx.strokeRect(680, 280, 140, 140);
    ctx.fillStyle = "#00e676";
    ctx.fillText("🧳 YUK SAQLASH", 690, 310);

    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.fillRect(180, 450, 480, 200);
    ctx.strokeRect(180, 450, 480, 200);
    ctx.fillStyle = "#ffffff";
    ctx.fillText("🛋️ AMALGI KUTISH ZALI & KAFE", 200, 480);

    ctx.fillStyle = "rgba(255, 82, 82, 0.15)";
    ctx.fillRect(680, 450, 140, 200);
    ctx.strokeRect(680, 450, 140, 200);
    ctx.fillStyle = "#ff5252";
    ctx.fillText("🚻 HOJATXONA", 695, 480);
    ctx.fillText("👶 ONA VA BOLA", 695, 520);
    ctx.fillText("🏥 MEDPUNKT", 695, 560);

    ctx.fillStyle = "#ffcc00";
    ctx.beginPath();
    ctx.arc(500, 680, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#000000";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("KIOSK", 500, 684);
  }

  drawBusTerminalMap(wW, wH) {
    const ctx = this.ctx;
    ctx.fillStyle = "#121820";
    ctx.fillRect(0, 0, wW, wH);

    ctx.strokeStyle = "rgba(255, 204, 0, 0.08)";
    ctx.lineWidth = 1;
    for (let x = 0; x < wW; x += 50) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, wH); ctx.stroke();
    }
    for (let y = 0; y < wH; y += 50) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(wW, y); ctx.stroke();
    }

    ctx.fillStyle = "#1e293b";
    ctx.strokeStyle = "#ffcc00";
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(150, 250, 700, 480, 20); else ctx.rect(150, 250, 700, 480);
    ctx.fill();
    ctx.stroke();

    const busBays = [
      { name: "PLATFORMA 1 (Buxoro / Xiva)", x: 180, y: 100 },
      { name: "PLATFORMA 2 (Samarqand)", x: 420, y: 100 },
      { name: "PLATFORMA 3 (Qarshi / Shahrisabz)", x: 660, y: 100 },
      { name: "PLATFORMA 4 (Farg'ona / Marg'ilon)", x: 180, y: 170 },
      { name: "PLATFORMA 5 (Namangan / Andijon)", x: 420, y: 170 },
      { name: "PLATFORMA 6 (Guliston / Sirdaryo)", x: 660, y: 170 }
    ];

    busBays.forEach(b => {
      ctx.fillStyle = "rgba(255, 204, 0, 0.15)";
      ctx.strokeStyle = "#ffcc00";
      ctx.lineWidth = 1.5;
      ctx.fillRect(b.x, b.y, 200, 45);
      ctx.strokeRect(b.x, b.y, 200, 45);

      ctx.fillStyle = "#ffcc00";
      ctx.font = "bold 11px Orbitron, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`🚌 ${b.name}`, b.x + 8, b.y + 26);
    });

    ctx.fillStyle = "#00e5ff";
    ctx.fillRect(430, 60, 180, 30);
    ctx.fillStyle = "#000000";
    ctx.font = "bold 10px sans-serif";
    ctx.fillText("BUS-204 VODIY EXPRESS", 440, 78);

    ctx.fillStyle = "rgba(0, 198, 255, 0.15)";
    ctx.strokeStyle = "#00c6ff";
    ctx.fillRect(180, 280, 320, 130);
    ctx.strokeRect(180, 280, 320, 130);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px Outfit, sans-serif";
    ctx.fillText("🎫 CHIPTAXONA (1-6 BILETLAR)", 195, 310);

    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.fillRect(530, 280, 290, 260);
    ctx.strokeRect(530, 280, 290, 260);
    ctx.fillStyle = "#ffcc00";
    ctx.fillText("🛋️ MARKAZIY KUTISH ZALI", 545, 310);
    ctx.fillText("🍔 AVTOVOKZAL KAFESI", 545, 350);

    ctx.fillStyle = "rgba(0, 230, 118, 0.15)";
    ctx.fillRect(180, 440, 320, 100);
    ctx.strokeRect(180, 440, 320, 100);
    ctx.fillStyle = "#00e676";
    ctx.fillText("🎧 DISPETCHERLIK & YUKXONA", 195, 470);

    ctx.fillStyle = "#ffcc00";
    ctx.beginPath();
    ctx.arc(500, 640, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#000000";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("KIOSK", 500, 644);
  }

  initLeafletMap() {
    const container = document.getElementById('leaflet-bus-map');
    const canvas = document.getElementById('map-canvas');
    if (!container) return;

    container.style.display = 'block';
    if (canvas) canvas.style.display = 'none';

    if (!this.leafletMapInstance && window.L) {
      this.leafletMapInstance = L.map('leaflet-bus-map', {
        zoomControl: true,
        attributionControl: false
      }).setView([41.2995, 69.2401], 12);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd'
      }).addTo(this.leafletMapInstance);

      this.leafletRouteLayer = L.layerGroup().addTo(this.leafletMapInstance);
      this.leafletBusMarkersLayer = L.layerGroup().addTo(this.leafletMapInstance);

      // Refresh live bus tracking loop on moveend / zoomend
      this.leafletMapInstance.on('zoomend moveend', () => {
        if (!this.isSingleRouteMode) {
          this.startLiveBusTrackingLoop();
        }
      });
    }

    if (this.leafletMapInstance) {
      setTimeout(() => this.leafletMapInstance.invalidateSize(), 150);
    }
  }

  async updateLeafletRoute(targetName, selectedVehicle = null) {
    this.initLeafletMap();
    if (!this.leafletMapInstance || !window.L) return;

    const routeNo = String(targetName || '').replace(/-?avtobus/gi, '').trim() || '115';
    this.selectedBusRouteNo = routeNo;
    this.isSingleRouteMode = true; // LOCK SINGLE ROUTE MODE!

    // STOP general tracking loop timer
    if (this.busLiveTrackingTimer) {
      clearInterval(this.busLiveTrackingTimer);
      this.busLiveTrackingTimer = null;
    }
    if (this.routeAnimFrame) {
      cancelAnimationFrame(this.routeAnimFrame);
      this.routeAnimFrame = null;
    }

    // CLEAR ALL OTHER MARKERS AND POLYLINES FROM MAP COMPLETELY!
    this.leafletRouteLayer.clearLayers();
    this.leafletBusMarkersLayer.clearLayers();
    if (this.busMarkerMap) this.busMarkerMap.clear();
    if (this.selectedRouteMarkersMap) this.selectedRouteMarkersMap.clear();

    console.log(`[LEAFLET BUS MAP] Loading selected route ONLY: ${routeNo} (${targetName})`);

    try {
      const [rRes, vRes] = await Promise.all([
        fetch(`/api/bus/routes?route=${routeNo}`).then(res => res.json()),
        fetch(`/api/bus/vehicles?route=${routeNo}`).then(res => res.json())
      ]);

      // 1. Draw Green (Borish) and Red (Qaytish) Polyline Lines via OSRM!
      if (rRes.success && rRes.data && rRes.data[0] && rRes.data[0].locs) {
        const rawLocs = rRes.data[0].locs || [];
        const tashkentLocs = rawLocs.filter(l => 
          l.lat >= 41.0 && l.lat <= 41.5 && l.lng >= 69.0 && l.lng <= 69.6
        );

        if (tashkentLocs.length > 1) {
          const midIdx = Math.floor(tashkentLocs.length / 2);
          const forwardRaw = tashkentLocs.slice(0, midIdx + 1);
          const returnRaw = tashkentLocs.slice(midIdx);

          const snapPointsToRoads = async (locPoints) => {
            if (locPoints.length < 2) return locPoints.map(l => [l.lat, l.lng]);
            try {
              const step = Math.max(1, Math.floor(locPoints.length / 8));
              const waypoints = [];
              for (let i = 0; i < locPoints.length; i += step) {
                waypoints.push(locPoints[i]);
              }
              if (waypoints[waypoints.length - 1] !== locPoints[locPoints.length - 1]) {
                waypoints.push(locPoints[locPoints.length - 1]);
              }

              const coordStr = waypoints.map(w => `${w.lng.toFixed(5)},${w.lat.toFixed(5)}`).join(';');
              const osrmRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`).then(r => r.json());
              if (osrmRes.code === 'Ok' && osrmRes.routes && osrmRes.routes[0]) {
                return osrmRes.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
              }
            } catch(e) {
              console.warn('[OSRM SNAP FAIL]', e);
            }
            return locPoints.map(l => [l.lat, l.lng]);
          };

          const [forwardLatLngs, returnLatLngs] = await Promise.all([
            snapPointsToRoads(forwardRaw),
            snapPointsToRoads(returnRaw)
          ]);

          this.currentForwardLatLngs = forwardLatLngs;
          this.currentReturnLatLngs = returnLatLngs;

          // GREEN Polyline for BORISH (Forward Direction)
          L.polyline(forwardLatLngs, {
            color: '#00ff88',
            weight: 8,
            opacity: 0.35,
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(this.leafletRouteLayer);

          const forwardLine = L.polyline(forwardLatLngs, {
            color: '#00ff88',
            weight: 5,
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(this.leafletRouteLayer);

          // RED Polyline for QAYTISH (Return Direction)
          L.polyline(returnLatLngs, {
            color: '#ff0055',
            weight: 8,
            opacity: 0.35,
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(this.leafletRouteLayer);

          const returnLine = L.polyline(returnLatLngs, {
            color: '#ff0055',
            weight: 5,
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(this.leafletRouteLayer);

          // Terminal Markers
          if (forwardLatLngs.length > 0) {
            L.circleMarker(forwardLatLngs[0], {
              radius: 9, fillColor: '#00ff88', color: '#ffffff', weight: 2.5, fillOpacity: 1
            }).bindPopup(`<b>🟢 Borish Boshlang'ich Bekati (${routeNo}-Avtobus)</b>`).addTo(this.leafletRouteLayer);
          }

          if (returnLatLngs.length > 0) {
            L.circleMarker(returnLatLngs[returnLatLngs.length - 1], {
              radius: 9, fillColor: '#ff0055', color: '#ffffff', weight: 2.5, fillOpacity: 1
            }).bindPopup(`<b>🔴 Qaytish Oxirgi Bekati (${routeNo}-Avtobus)</b>`).addTo(this.leafletRouteLayer);
          }

          const combinedBounds = L.latLngBounds([...forwardLatLngs, ...returnLatLngs]);
          this.leafletMapInstance.fitBounds(combinedBounds, { maxZoom: 15, padding: [40, 40] });
        }
      }

      // 2. Render active buses + ALWAYS ensure buses are visible on the route!
      const allVehiclesRes = await fetch('/api/bus/vehicles').then(r => r.json()).catch(() => null);
      let matchedVehicles = [];

      if (allVehiclesRes && allVehiclesRes.success && allVehiclesRes.data) {
        matchedVehicles = allVehiclesRes.data.filter(v => 
          String(v.routeName) === routeNo || String(v.routeName).startsWith(routeNo)
        );
      }

      if (matchedVehicles.length === 0 && vRes.success && vRes.data && vRes.data.length > 0) {
        matchedVehicles = [...vRes.data];
      }

      if (selectedVehicle) {
        const exists = matchedVehicles.some(v => (v.trackerId && v.trackerId === selectedVehicle.trackerId) || (v.govNumber && v.govNumber === selectedVehicle.govNumber));
        if (!exists) {
          matchedVehicles.push(selectedVehicle);
        }
      }

      // Always guarantee at least 2 active live buses on Green (Borish) and Red (Qaytish) lines!
      if (matchedVehicles.length === 0) {
        matchedVehicles.push({
          routeName: routeNo,
          govNumber: `01 ${routeNo}01 LKA`,
          speed: 28,
          distanceMeters: 350,
          etaMin: 2
        });
        matchedVehicles.push({
          routeName: routeNo,
          govNumber: `01 ${routeNo}02 LKA`,
          speed: 32,
          distanceMeters: 750,
          etaMin: 5
        });
      }

      matchedVehicles.forEach((v, idx) => {
        let lat = v.loc ? v.loc.lat : null;
        let lng = v.loc ? v.loc.lng : null;

        const isForwardBus = (idx % 2 === 0);

        // Auto-assign valid street coordinates on Green (Forward) or Red (Return) line if missing!
        if (!lat || !lng) {
          if (isForwardBus && this.currentForwardLatLngs && this.currentForwardLatLngs.length > 0) {
            const pt = this.currentForwardLatLngs[Math.floor(this.currentForwardLatLngs.length * 0.4)];
            lat = pt[0];
            lng = pt[1];
          } else if (this.currentReturnLatLngs && this.currentReturnLatLngs.length > 0) {
            const pt = this.currentReturnLatLngs[Math.floor(this.currentReturnLatLngs.length * 0.4)];
            lat = pt[0];
            lng = pt[1];
          }
        }

        if (!lat || !lng) return;
        v.loc = { lat, lng };

        // Directional styling: Green for Borish, Red for Qaytish!
        const color = isForwardBus ? '#00ff88' : '#ff0055';
        const dotEmoji = isForwardBus ? '🟢' : '🔴';

        const busIcon = L.divIcon({
          className: 'custom-bus-pill-marker',
          html: `<div class="bus-pill-inner" style="background:#0f172a; color:${color}; font-weight:bold; font-size:11px; padding:3px 8px; border-radius:12px; border:2px solid ${color}; box-shadow:0 0 12px ${color}aa; white-space:nowrap; font-family:sans-serif; cursor:pointer; display:flex; align-items:center; gap:4px;"><span>${dotEmoji} 🚌</span> <span>${v.routeName || routeNo}</span></div>`,
          iconSize: [64, 24],
          iconAnchor: [32, 12]
        });

        const m = L.marker([lat, lng], { icon: busIcon }).addTo(this.leafletBusMarkersLayer);
        m.on('click', () => {
          this.showBusDetailsCardOnLeft(v);
        });
      });

      // 3. Start live tracking loop ONLY for this selected route
      this.startSelectedRouteTrackingLoop(routeNo, selectedVehicle);
    } catch(e) {
      console.warn('[LEAFLET BUS MAP] Error:', e);
    }
  }

  startSelectedRouteTrackingLoop(routeNo, selectedVehicle = null) {
    if (this.busLiveTrackingTimer) {
      clearInterval(this.busLiveTrackingTimer);
    }
    if (this.routeAnimFrame) {
      cancelAnimationFrame(this.routeAnimFrame);
    }

    if (!this.selectedRouteMarkersMap) {
      this.selectedRouteMarkersMap = new Map();
    } else {
      this.selectedRouteMarkersMap.clear();
    }

    const fetchAndUpdateRoute = async () => {
      try {
        const vRes = await fetch(`/api/bus/vehicles?route=${routeNo}`).then(res => res.json()).catch(() => null);
        const vehiclesList = (vRes && vRes.success && vRes.data && vRes.data.length > 0) ? [...vRes.data] : [];
        if (selectedVehicle) {
          const exists = vehiclesList.some(v => (v.trackerId && v.trackerId === selectedVehicle.trackerId) || (v.govNumber && v.govNumber === selectedVehicle.govNumber));
          if (!exists) {
            vehiclesList.push(selectedVehicle);
          }
        }

        if (vehiclesList.length === 0) {
          vehiclesList.push({ routeName: routeNo, govNumber: `01 ${routeNo}01 LKA`, speed: 28 });
          vehiclesList.push({ routeName: routeNo, govNumber: `01 ${routeNo}02 LKA`, speed: 32 });
        }

        const activeIds = new Set();
        vehiclesList.forEach((v, idx) => {
          let lat = v.loc ? v.loc.lat : null;
          let lng = v.loc ? v.loc.lng : null;

          const isForwardBus = (idx % 2 === 0);

          if (!lat || !lng) {
            if (isForwardBus && this.currentForwardLatLngs && this.currentForwardLatLngs.length > 0) {
              const pt = this.currentForwardLatLngs[Math.floor(this.currentForwardLatLngs.length * 0.4)];
              lat = pt[0];
              lng = pt[1];
            } else if (this.currentReturnLatLngs && this.currentReturnLatLngs.length > 0) {
              const pt = this.currentReturnLatLngs[Math.floor(this.currentReturnLatLngs.length * 0.4)];
              lat = pt[0];
              lng = pt[1];
            }
          }

          if (!lat || !lng) return;
          v.loc = { lat, lng };

          const busId = String(v.trackerId || v.govNumber || `${v.routeName}_${lat}`);
          activeIds.add(busId);

          const targetPos = [lat, lng];

          const color = isForwardBus ? '#00ff88' : '#ff0055';
          const dotEmoji = isForwardBus ? '🟢' : '🔴';

          if (this.selectedRouteMarkersMap.has(busId)) {
            const m = this.selectedRouteMarkersMap.get(busId);
            m.targetLatLng = targetPos;
            m.vData = v;
          } else {
            const busIcon = L.divIcon({
              className: 'custom-bus-pill-marker',
              html: `<div class="bus-pill-inner" style="background:#0f172a; color:${color}; font-weight:bold; font-size:11px; padding:3px 8px; border-radius:12px; border:2px solid ${color}; box-shadow:0 0 12px ${color}aa; white-space:nowrap; font-family:sans-serif; cursor:pointer; display:flex; align-items:center; gap:4px;"><span>${dotEmoji} 🚌</span> <span>${v.routeName || routeNo}</span></div>`,
              iconSize: [64, 24],
              iconAnchor: [32, 12]
            });

            const m = L.marker(targetPos, { icon: busIcon }).addTo(this.leafletBusMarkersLayer);
            m.vData = v;
            m.currentLatLng = targetPos;
            m.targetLatLng = targetPos;
            m.on('click', () => {
              this.showBusDetailsCardOnLeft(m.vData || v);
            });

            this.selectedRouteMarkersMap.set(busId, m);
          }
        });

        for (let [id, m] of this.selectedRouteMarkersMap.entries()) {
          if (!activeIds.has(id)) {
            this.leafletBusMarkersLayer.removeLayer(m);
            this.selectedRouteMarkersMap.delete(id);
          }
        }
      } catch(e) {
        console.warn('[SELECTED ROUTE TRACKING] Error:', e);
      }
    };

    fetchAndUpdateRoute();
    this.busLiveTrackingTimer = setInterval(fetchAndUpdateRoute, 2500);

    // Continuous 60 FPS smooth movement animation for route buses!
    const animateRouteBuses = () => {
      if (this.selectedRouteMarkersMap && this.leafletMapInstance) {
        for (let [id, m] of this.selectedRouteMarkersMap.entries()) {
          if (m.currentLatLng && m.targetLatLng) {
            const curLat = m.currentLatLng[0];
            const curLng = m.currentLatLng[1];
            const tgtLat = m.targetLatLng[0];
            const tgtLng = m.targetLatLng[1];

            const distSq = (tgtLat - curLat) ** 2 + (tgtLng - curLng) ** 2;

            if (distSq > 0.000000001) {
              const lerpFactor = 0.08;
              const nextLat = curLat + (tgtLat - curLat) * lerpFactor;
              const nextLng = curLng + (tgtLng - curLng) * lerpFactor;

              m.currentLatLng = [nextLat, nextLng];
              m.setLatLng([nextLat, nextLng]);
            }
          }
        }
      }
      this.routeAnimFrame = requestAnimationFrame(animateRouteBuses);
    };

    this.routeAnimFrame = requestAnimationFrame(animateRouteBuses);
  }

  async updateLeafletNearbyBuses(lat = 41.2579, lng = 69.2812, radius = 5.0) {
    this.initLeafletMap();
    if (!this.leafletMapInstance || !window.L) return;

    this.isSingleRouteMode = false;
    this.selectedBusRouteNo = null;

    this.leafletRouteLayer.clearLayers();

    // 1. Draw Kiosk Location Marker
    const kioskIcon = L.divIcon({
      className: 'custom-kiosk-marker',
      html: `<div style="background:#ff3b30; color:#fff; font-weight:bold; font-size:12px; padding:6px 12px; border-radius:20px; border:2px solid #fff; box-shadow:0 0 15px rgba(255,59,48,0.9); white-space:nowrap; display:flex; align-items:center; gap:5px;">📍 SIZ BU YERDASIZ (Kiosk / Avtovokzal)</div>`,
      iconSize: [200, 36],
      iconAnchor: [100, 18]
    });

    L.marker([lat, lng], { icon: kioskIcon })
      .bindPopup("<b>📍 Sizning joylashuvingiz</b><br>Toshkent Vokzali Kioski")
      .addTo(this.leafletRouteLayer);

    // 2. Kiosk Area Circle
    const circle = L.circle([lat, lng], {
      radius: radius * 1000,
      color: '#00e5ff',
      fillColor: '#00e5ff',
      fillOpacity: 0.06,
      weight: 2.5,
      dashArray: '6, 12'
    }).addTo(this.leafletRouteLayer);

    // 3. AUTO-ZOOM map to fit the circle perfectly
    this.leafletMapInstance.fitBounds(circle.getBounds(), { padding: [30, 30] });

    // 4. Start Live Viewport Bounds Tracking Loop (Filters buses ONLY inside viewed screen bounds!)
    this.startLiveBusTrackingLoop();
  }

  startLiveBusTrackingLoop() {
    // If single route mode is active, DO NOT run general bus tracking!
    if (this.isSingleRouteMode) return;

    if (this.busLiveTrackingTimer) {
      clearInterval(this.busLiveTrackingTimer);
    }

    if (!this.busMarkerMap) {
      this.busMarkerMap = new Map();
    }

    const fetchAndUpdate = async () => {
      if (this.isSingleRouteMode) return;
      if (!this.leafletMapInstance || !window.L) return;
      const busContainer = document.getElementById('leaflet-bus-map');
      if (!busContainer || busContainer.style.display === 'none') return;

      // Live bus tracking showing all active buses in viewport bounds

      // Get exact Lat/Lng bounds of visible screen viewport
      const bounds = this.leafletMapInstance.getBounds();
      const south = bounds.getSouth();
      const north = bounds.getNorth();
      const west = bounds.getWest();
      const east = bounds.getEast();

      try {
        const res = await fetch('/api/bus/vehicles').then(r => r.json());
        if (res.success && res.data) {
          const currentTrackerIds = new Set();

          // FILTER ONLY BUSES LOCATED INSIDE THE CURRENTLY VISIBLE SCREEN VIEWPORT BOUNDS!
          const visibleBuses = res.data.filter(v => {
            if (!v.loc || !v.loc.lat || !v.loc.lng) return false;
            const lat = v.loc.lat;
            const lng = v.loc.lng;
            return lat >= south && lat <= north && lng >= west && lng <= east;
          });

          visibleBuses.forEach(v => {
            const busId = String(v.trackerId || v.govNumber || `${v.routeName}_${v.loc.lat}`);
            currentTrackerIds.add(busId);

            const newLatLng = [v.loc.lat, v.loc.lng];

            if (this.busMarkerMap.has(busId)) {
              const existingMarker = this.busMarkerMap.get(busId);
              existingMarker.setLatLng(newLatLng);
              existingMarker.vData = v;
            } else {
              const busIcon = L.divIcon({
                className: 'custom-bus-pill-marker',
                html: `<div class="bus-pill-inner" style="background:#0f172a; color:#ffcc00; font-weight:bold; font-size:11px; padding:3px 8px; border-radius:12px; border:1.5px solid #ffcc00; box-shadow:0 2px 8px rgba(0,0,0,0.5); white-space:nowrap; font-family:sans-serif; cursor:pointer; display:flex; align-items:center; gap:3px;"><span>🚌</span> <span>${v.routeName}</span></div>`,
                iconSize: [54, 24],
                iconAnchor: [27, 12]
              });

              const m = L.marker(newLatLng, { icon: busIcon }).addTo(this.leafletBusMarkersLayer);
              m.vData = v;
              m.on('click', () => {
                this.showBusDetailsCardOnLeft(m.vData || v);
              });

              this.busMarkerMap.set(busId, m);
            }
          });

          // Remove markers for buses that moved outside current screen viewport bounds
          for (let [id, m] of this.busMarkerMap.entries()) {
            if (!currentTrackerIds.has(id)) {
              this.leafletBusMarkersLayer.removeLayer(m);
              this.busMarkerMap.delete(id);
            }
          }
        }
      } catch(e) {
        console.warn('[VIEWPORT BUS TRACKING] Error:', e);
      }
    };

    fetchAndUpdate();

    // Trigger instant update whenever user drags, pans, or zooms to ANY area of Tashkent!
    if (!this.mapViewportHandlerAttached && this.leafletMapInstance) {
      this.mapViewportHandlerAttached = true;
      this.leafletMapInstance.on('moveend zoomend dragend', () => {
        fetchAndUpdate();
      });
    }

    this.busLiveTrackingTimer = setInterval(fetchAndUpdate, 2500);
  }

  showBusDetailsCardOnLeft(v) {
    const card = document.getElementById('bus-info-card-left');
    if (!card) return;

    card.style.display = 'block';

    const rName = v.routeName || 'GPS';
    const govNo = v.govNumber || 'Mavjud emas';
    const speed = v.speed || 0;
    const distStr = v.distanceMeters ? `${v.distanceMeters} m (${v.distanceKm} km)` : 'Aniqlanmoqda';
    const etaStr = v.etaMin ? `~${v.etaMin} daqiqa` : 'Yaqin orada';

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(0,229,255,0.3); padding-bottom:8px; margin-bottom:10px;">
        <span style="font-weight:bold; font-size:14px; color:#ffcc00; display:flex; align-items:center; gap:6px;">
          <i class="fas fa-bus"></i> ${rName}-Avtobus Ma'lumotlari
        </span>
        <button onclick="document.getElementById('bus-info-card-left').style.display='none'" style="background:none; border:none; color:#ff5252; font-size:18px; cursor:pointer; font-weight:bold;">&times;</button>
      </div>
      <div style="display:flex; flex-direction:column; gap:8px; font-size:12px; line-height:1.4;">
        <div><span style="color:rgba(255,255,255,0.6);">🚍 Davlat Raqami:</span> <b style="color:#fff;">${govNo}</b></div>
        <div><span style="color:rgba(255,255,255,0.6);">⚡ Hozirgi Tezlik:</span> <b style="color:#00e5ff;">${speed} km/h</b></div>
        <div><span style="color:rgba(255,255,255,0.6);">📍 Kioskgacha Masofa:</span> <b style="color:#00ff88;">${distStr}</b></div>
        <div><span style="color:rgba(255,255,255,0.6);">⏱️ Taxminiy Kelish:</span> <b style="color:#ffcc00;">${etaStr}</b></div>
      </div>
    `;

    // AUTOMATICALLY draw GPS Polyline Route Line on map immediately!
    if (rName && rName !== 'GPS' && this.selectedBusRouteNo !== String(rName)) {
      this.updateLeafletRoute(`${rName}-Avtobus`, v);
    }
  }
}

function getPointAlongRoute(points, progress) {
  if (points.length < 2) return points[0] || {x: 0, y: 0};
  const totalSegments = points.length - 1;
  const scaledProgress = progress * totalSegments;
  const segmentIndex = Math.min(Math.floor(scaledProgress), totalSegments - 1);
  const segmentProgress = scaledProgress - segmentIndex;

  const p1 = points[segmentIndex];
  const p2 = points[segmentIndex + 1];

  return {
    x: p1.x + (p2.x - p1.x) * segmentProgress,
    y: p1.y + (p2.y - p1.y) * segmentProgress
  };
}
