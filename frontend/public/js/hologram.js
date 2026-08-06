import { state } from "./config.js";

export function initHologram() {
  const container = document.getElementById("hologram-container");
  if (!container) return;

  state.scene = new THREE.Scene();
  state.globeCamera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
  );
  state.globeCamera.position.z = 250;

  state.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  state.renderer.setSize(window.innerWidth, window.innerHeight);
  state.renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(state.renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  state.scene.add(ambientLight);

  const pointLight = new THREE.PointLight(0xd5a107, 1);
  pointLight.position.set(50, 50, 50);
  state.scene.add(pointLight);

  updateHologramForMode(state.transportMode || 'aviation');

  window.addEventListener("resize", onWindowResize, false);
  animate();
}



export function updateHologramForMode(mode = 'aviation') {
  if (!state.scene) return;
  
  if (state.particleSystem) {
    state.scene.remove(state.particleSystem);
    if (state.particleSystem.geometry) state.particleSystem.geometry.dispose();
    if (state.particleSystem.material) state.particleSystem.material.dispose();
    state.particleSystem = null;
  }

  let imagePath = "img/logo_hologram.png";
  if (mode === 'railway') {
    imagePath = "img/logo_temir.png";
  } else if (mode === 'bus') {
    imagePath = "img/tash_logo.png";
  }

  const loader = new THREE.TextureLoader();
  loader.load(imagePath, function (texture) {
    createHologramFromTexture(texture, mode);
  }, undefined, function (err) {
    console.error("Hologram rasm yuklashda xato:", err);
  });
}
window.updateHologramForMode = updateHologramForMode;

function createHologramFromTexture(texture, mode = 'aviation') {
  if (!state.scene) return;

  const width = 200;
  const height = 200;
  const particles = 150000;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particles * 3);
  const colors = new Float32Array(particles * 3);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  const imgEl = texture.image;
  if (!imgEl) return;

  ctx.drawImage(imgEl, 0, 0, width, height);
  const imgData = ctx.getImageData(0, 0, width, height).data;

  // PNG (alpha) yoki JPG (RGB) ekanligini aniqlaymiz
  let isAlphaImage = false;
  for (let i = 3; i < imgData.length; i += 40) {
    if (imgData[i] < 250) {
      isAlphaImage = true;
      break;
    }
  }

  let validParticles = 0;
  let attempts = 0;
  const maxAttempts = particles * 8;

  while (validParticles < particles && attempts < maxAttempts) {
    attempts++;
    const x = Math.floor(Math.random() * width);
    const y = Math.floor(Math.random() * height);
    const idx = (y * width + x) * 4;
    const r = imgData[idx];
    const g = imgData[idx + 1];
    const b = imgData[idx + 2];
    const a = imgData[idx + 3];

    let keep = false;
    if (isAlphaImage) {
      // PNG shaffof bo'lsa, faqat logo shaklidagi piksellarni olamiz
      keep = a > 80 && (r > 20 || g > 20 || b > 20);
    } else {
      // Oq yoki qora fonli rasmlar uchun
      const brightness = (r + g + b) / 3;
      keep = brightness > 30 && brightness < 240;
    }

    if (keep) {
      positions[validParticles * 3] = (x - width / 2) * 1.5;
      positions[validParticles * 3 + 1] = -(y - height / 2) * 1.5;
      positions[validParticles * 3 + 2] = (Math.random() - 0.5) * 5;

      if (mode === 'railway') {
        colors[validParticles * 3] = 0.0;     // R
        colors[validParticles * 3 + 1] = 0.9; // G (Cyan)
        colors[validParticles * 3 + 2] = 1.0; // B
      } else if (mode === 'bus') {
        colors[validParticles * 3] = 1.0;     // R (Gold/Yellow)
        colors[validParticles * 3 + 1] = 0.8; // G
        colors[validParticles * 3 + 2] = 0.0; // B
      } else {
        colors[validParticles * 3] = 0.835;   // Original Gold Hologram
        colors[validParticles * 3 + 1] = 0.631;
        colors[validParticles * 3 + 2] = 0.027;
      }

      validParticles++;
    }
  }

  const finalPositions = positions.slice(0, validParticles * 3);
  const finalColors = colors.slice(0, validParticles * 3);

  geometry.setAttribute("position", new THREE.BufferAttribute(finalPositions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(finalColors, 3));

  geometry.userData = { originalPositions: new Float32Array(finalPositions) };

  const material = new THREE.PointsMaterial({
    size: 0.7,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
  });

  state.particleSystem = new THREE.Points(geometry, material);
  state.scene.add(state.particleSystem);
}

function animate() {
  requestAnimationFrame(animate);

  if (window.pauseHologram) return;
  if (state.particleSystem) {
    const time = Date.now() * 0.001;
    state.particleSystem.rotation.y = Math.sin(time * 0.3) * (Math.PI / 8);

    const posAttr = state.particleSystem.geometry.attributes.position;
    const original = state.particleSystem.geometry.userData.originalPositions;

    let intensity = 0;
    let isSpeaking = false;

    if (
      state.outputAnalyser &&
      state.currentAudio &&
      !state.currentAudio.paused
    ) {
      state.outputAnalyser.getByteFrequencyData(state.outputDataArray);
      let sum = 0;
      for (let i = 0; i < state.outputDataArray.length; i++)
        sum += state.outputDataArray[i];
      intensity = sum / state.outputDataArray.length;
      isSpeaking = true;
    } else if (window.speechSynthesis && window.speechSynthesis.speaking) {
      intensity = 40 + Math.sin(time * 10) * 20;
      isSpeaking = true;
    }

    const scatterMultiplier = isSpeaking ? 1 : 0.1;

    for (let i = 0; i < posAttr.array.length; i += 3) {
      const idx = i / 3;
      let audioFactor = 0;
      if (
        state.outputAnalyser &&
        state.outputDataArray &&
        state.currentAudio &&
        !state.currentAudio.paused
      ) {
        const freqIdx = idx % state.outputDataArray.length;
        audioFactor = state.outputDataArray[freqIdx] / 255;
      } else if (isSpeaking) {
        audioFactor =
          (0.5 + Math.sin(time * 5 + idx * 0.1) * 0.5) * (intensity / 100);
      }

      const scatter = audioFactor * 40 * scatterMultiplier;
      const wave = Math.sin(time * 2 + idx * 0.1) * 2;

      posAttr.array[i] =
        original[i] + (Math.random() - 0.5) * scatter + wave * 0.2;
      posAttr.array[i + 1] =
        original[i + 1] + (Math.random() - 0.5) * scatter + wave * 0.2;
      posAttr.array[i + 2] =
        original[i + 2] +
        (Math.random() - 0.5) * scatter +
        Math.sin(time + idx) * 2;
    }
    posAttr.needsUpdate = true;
  }

  if (state.renderer && state.scene && state.globeCamera) {
    state.renderer.render(state.scene, state.globeCamera);
  }
}

function onWindowResize() {
  if (state.globeCamera && state.renderer) {
    state.globeCamera.aspect = window.innerWidth / window.innerHeight;
    state.globeCamera.updateProjectionMatrix();
    state.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

