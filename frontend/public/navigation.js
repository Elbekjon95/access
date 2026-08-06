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
    if (currentMode === 'railway') {
      if (this.railwayMapImage && this.railwayMapImage.complete && this.railwayMapImage.naturalWidth !== 0) {
        this.ctx.drawImage(this.railwayMapImage, 0, 0, wW, wH);
      } else {
        this.drawRailwayStationMap(wW, wH);
      }
    } else if (currentMode === 'bus') {
      this.drawLiveTashkentCityBusMap(wW, wH);
    } else {
      this.ctx.drawImage(this.backgroundImage, 0, 0);
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

  drawLiveTashkentCityBusMap(wW, wH) {
    const ctx = this.ctx;

    if (!this.tashkentBuses) {
      this.tashkentBuses = [
        {
          id: '28', name: '28-Avtobus (Toshkent Vokzali - Yunusobod)',
          route: [{x: 500, y: 650}, {x: 500, y: 480}, {x: 500, y: 300}, {x: 480, y: 150}],
          progress: 0.1, speed: 0.0018, color: '#00e5ff', nextStop: 'Amir Temur Xiyoboni', eta: '2 min', currentSpeed: 38
        },
        {
          id: '51', name: '51-Avtobus (Yunusobod 6-mavze - Chorsu Bozori)',
          route: [{x: 480, y: 150}, {x: 360, y: 280}, {x: 280, y: 420}, {x: 250, y: 550}],
          progress: 0.45, speed: 0.0022, color: '#ffcc00', nextStop: 'Oloy Bozori', eta: '1 min', currentSpeed: 42
        },
        {
          id: '14', name: '14-Avtobus (Toshkent Vokzali - TTZ)',
          route: [{x: 500, y: 650}, {x: 620, y: 500}, {x: 740, y: 360}, {x: 820, y: 220}],
          progress: 0.72, speed: 0.0019, color: '#00e676', nextStop: 'Buyuk Ipak Yo\'li', eta: '4 min', currentSpeed: 35
        },
        {
          id: '38', name: '38-Avtobus (Chilonzor 25-mavze - Buyuk Ipak Yo\'li)',
          route: [{x: 220, y: 640}, {x: 360, y: 520}, {x: 500, y: 480}, {x: 740, y: 360}],
          progress: 0.28, speed: 0.0015, color: '#ff5252', nextStop: 'Bunyodkor Metro', eta: '3 min', currentSpeed: 30
        },
        {
          id: '91', name: '91-Avtobus (Yunusobod 15-mavze - Qo\'yliq bozori)',
          route: [{x: 480, y: 150}, {x: 600, y: 340}, {x: 650, y: 520}, {x: 720, y: 680}],
          progress: 0.58, speed: 0.0017, color: '#e040fb', nextStop: 'Qo\'yliq 5-bekat', eta: '5 min', currentSpeed: 40
        },
        {
          id: '115', name: '115-Avtobus (Qoraqamysh - Sergeli 7-mavze)',
          route: [{x: 250, y: 200}, {x: 300, y: 380}, {x: 380, y: 580}, {x: 420, y: 720}],
          progress: 0.35, speed: 0.0014, color: '#ff9100', nextStop: 'Chorsu Bozori', eta: '2 min', currentSpeed: 36
        }
      ];
    }

    ctx.fillStyle = "#0c131d";
    ctx.fillRect(0, 0, wW, wH);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
    ctx.lineWidth = 1;
    for (let x = 0; x < wW; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, wH); ctx.stroke();
    }
    for (let y = 0; y < wH; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(wW, y); ctx.stroke();
    }

    const roads = [
      { name: "Amir Temur shoh ko'chasi", points: [{x: 500, y: 50}, {x: 500, y: 750}], width: 14, color: "rgba(255, 255, 255, 0.25)" },
      { name: "Navoiy ko'chasi", points: [{x: 100, y: 480}, {x: 900, y: 480}], width: 12, color: "rgba(255, 255, 255, 0.2)" },
      { name: "Bunyodkor shoh ko'chasi", points: [{x: 150, y: 700}, {x: 500, y: 480}], width: 12, color: "rgba(255, 255, 255, 0.2)" },
      { name: "Mustaqillik ko'chasi", points: [{x: 500, y: 480}, {x: 880, y: 200}], width: 12, color: "rgba(255, 255, 255, 0.2)" },
      { name: "Kichik Halqa Yo'li", points: [{x: 250, y: 200}, {x: 750, y: 200}, {x: 820, y: 650}, {x: 250, y: 650}, {x: 250, y: 200}], width: 8, color: "rgba(0, 198, 255, 0.15)" }
    ];

    roads.forEach(r => {
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      r.points.forEach((p, idx) => {
        if (idx === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    });

    const landmarks = [
      { name: "🏛️ Amir Temur Xiyoboni", x: 500, y: 480, type: "hub" },
      { name: "🛍️ Chorsu Bozori", x: 250, y: 550, type: "hub" },
      { name: "🚉 Toshkent Vokzali", x: 500, y: 650, type: "hub" },
      { name: "🏪 Oloy Bozori", x: 500, y: 380, type: "stop" },
      { name: "🏘️ Yunusobod 6-mavze", x: 480, y: 150, type: "stop" },
      { name: "🏢 Chilonzor Metro", x: 220, y: 640, type: "stop" },
      { name: "🌳 Buyuk Ipak Yo'li", x: 740, y: 360, type: "stop" },
      { name: "🚌 TTZ Avtovokzal", x: 820, y: 220, type: "stop" },
      { name: "🛒 Qo'yliq Bozori", x: 720, y: 680, type: "stop" }
    ];

    landmarks.forEach(lm => {
      ctx.fillStyle = lm.type === 'hub' ? "#ffcc00" : "#00e5ff";
      ctx.beginPath();
      ctx.arc(lm.x, lm.y, lm.type === 'hub' ? 8 : 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px Orbitron, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(lm.name, lm.x, lm.y - 12);
    });

    const now = Date.now() * 0.001;

    this.tashkentBuses.forEach(bus => {
      bus.progress += bus.speed;
      if (bus.progress >= 1) bus.progress = 0;

      const pos = getPointAlongRoute(bus.route, bus.progress);

      ctx.strokeStyle = bus.color;
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      bus.route.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
      ctx.setLineDash([]);

      const pulseSize = 12 + Math.sin(now * 4 + Number(bus.id)) * 6;
      ctx.fillStyle = bus.color;
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, pulseSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;

      ctx.fillStyle = bus.color;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(pos.x - 32, pos.y - 14, 64, 28, 8); else ctx.rect(pos.x - 32, pos.y - 14, 64, 28);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "#000000";
      ctx.font = "bold 11px Orbitron, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`🚌 ${bus.id}`, pos.x, pos.y + 4);

      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.strokeStyle = bus.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(pos.x - 65, pos.y - 38, 130, 20, 5); else ctx.rect(pos.x - 65, pos.y - 38, 130, 20);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "10px sans-serif";
      ctx.fillText(`${bus.nextStop} • ${bus.eta}`, pos.x, pos.y - 24);
    });

    ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
    ctx.strokeStyle = "#00e5ff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(40, 25, wW - 80, 45, 10); else ctx.rect(40, 25, wW - 80, 45);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ffcc00";
    ctx.font = "bold 13px Orbitron, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("🚦 TOSHKENT YO'LLARI TIRBANDLIGI: 3 ball (Erkin harakat)", 60, 52);

    ctx.fillStyle = "#00e5ff";
    ctx.textAlign = "right";
    ctx.fillText("📡 LIVE GPS: 24 TA AVTOBUS HARAKATDA", wW - 60, 52);
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
