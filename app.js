/* ══════════════════════════════════════════════
   Neural Network Background Animation
══════════════════════════════════════════════ */
(function () {
  const canvas = document.getElementById('bg-canvas');
  const ctx    = canvas.getContext('2d');
  const TEAL   = '0, 212, 232';
  const N      = 65;
  const DIST   = 130;
  let pts      = [];

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function init() {
    pts = Array.from({ length: N }, () => ({
      x:  Math.random() * canvas.width,
      y:  Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r:  Math.random() * 1.8 + 0.8,
    }));
  }

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx   = pts[i].x - pts[j].x;
        const dy   = pts[i].y - pts[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < DIST) {
          ctx.strokeStyle = `rgba(${TEAL},${(1 - dist / DIST) * 0.28})`;
          ctx.lineWidth   = 0.6;
          ctx.beginPath();
          ctx.moveTo(pts[i].x, pts[i].y);
          ctx.lineTo(pts[j].x, pts[j].y);
          ctx.stroke();
        }
      }
    }

    pts.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${TEAL}, 0.65)`;
      ctx.fill();
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width)  p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height)  p.vy *= -1;
    });

    requestAnimationFrame(tick);
  }

  resize();
  init();
  tick();
  window.addEventListener('resize', () => { resize(); init(); });
})();

/* ══════════════════════════════════════════════
   Converter App
══════════════════════════════════════════════ */
const dropZone   = document.getElementById('dropZone');
const fileInput  = document.getElementById('fileInput');
const fileBar    = document.getElementById('fileBar');
const fName      = document.getElementById('fName');
const fMeta      = document.getElementById('fMeta');
const fileClear  = document.getElementById('fileClear');
const options    = document.getElementById('options');
const qualityRow = document.getElementById('qualityRow');
const qualSlider = document.getElementById('qualSlider');
const qualVal    = document.getElementById('qualVal');
const convertBtn = document.getElementById('convertBtn');
const result     = document.getElementById('result');
const origImg    = document.getElementById('origImg');
const convImg    = document.getElementById('convImg');
const origSize   = document.getElementById('origSize');
const convSize   = document.getElementById('convSize');
const origFmt    = document.getElementById('origFmt');
const sizeDiff   = document.getElementById('sizeDiff');
const downloadBtn = document.getElementById('downloadBtn');
const footerYear = document.getElementById('footerYear');

let currentFile  = null;
let selectedFmt  = 'image/webp';
let convertedBlob = null;

/* ── Helpers ── */
const fmtLabel = t => ({ 'image/jpeg':'JPEG','image/png':'PNG','image/webp':'WebP',
  'image/gif':'GIF','image/bmp':'BMP','image/avif':'AVIF' }[t] || t);

const fmtExt   = t => ({ 'image/webp':'webp','image/jpeg':'jpg','image/png':'png' }[t] || 'bin');

function bytes(n) {
  if (n < 1024)       return n + ' B';
  if (n < 1024*1024)  return (n/1024).toFixed(1) + ' KB';
  return (n/1024/1024).toFixed(2) + ' MB';
}

function setPct(v) {
  qualSlider.style.setProperty('--pct', v + '%');
}

function updateFooterYear() {
  if (!footerYear) return;
  footerYear.textContent = `© ${new Date().getFullYear()}`;
}

updateFooterYear();

/* ── Format buttons ── */
document.querySelectorAll('.fmt-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.fmt-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedFmt = btn.dataset.fmt;
    qualityRow.classList.toggle('show', selectedFmt !== 'image/png');
    result.classList.remove('show');
    convertedBlob = null;
  });
});

/* ── Quality slider ── */
setPct(85);
qualSlider.addEventListener('input', () => {
  qualVal.textContent = qualSlider.value + '%';
  setPct(qualSlider.value);
  result.classList.remove('show');
  convertedBlob = null;
});

/* ── Drag & Drop ── */
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('over');
  const f = e.dataTransfer.files[0];
  if (f && f.type.startsWith('image/')) loadFile(f);
});

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) loadFile(fileInput.files[0]);
});

/* ── Clear ── */
fileClear.addEventListener('click', () => {
  currentFile = null;
  fileInput.value = '';
  fileBar.classList.remove('show');
  options.classList.remove('show');
  result.classList.remove('show');
  convertedBlob = null;
});

/* ── Load file ── */
function loadFile(file) {
  currentFile = file;
  fName.textContent = file.name;
  fMeta.textContent = `${fmtLabel(file.type)} · ${bytes(file.size)}`;
  fileBar.classList.add('show');
  options.classList.add('show');
  result.classList.remove('show');
  convertedBlob = null;
}

/* ── Convert ── */
convertBtn.addEventListener('click', async () => {
  if (!currentFile) return;

  convertBtn.disabled = true;
  convertBtn.textContent = 'Converting…';

  try {
    const img = new Image();
    const url = URL.createObjectURL(currentFile);

    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      img.src = url;
    });

    const cvs = document.createElement('canvas');
    cvs.width  = img.naturalWidth;
    cvs.height = img.naturalHeight;
    const c = cvs.getContext('2d');

    // JPEG needs opaque background (no alpha support)
    if (selectedFmt === 'image/jpeg') {
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, cvs.width, cvs.height);
    }
    c.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);

    const quality = selectedFmt === 'image/png'
      ? undefined
      : parseInt(qualSlider.value) / 100;

    cvs.toBlob(blob => {
      convertedBlob = blob;

      origImg.src  = URL.createObjectURL(currentFile);
      convImg.src  = URL.createObjectURL(blob);
      origSize.textContent = bytes(currentFile.size);
      convSize.textContent = bytes(blob.size);
      origFmt.textContent  = fmtLabel(currentFile.type);

      const diff = currentFile.size - blob.size;
      if (diff > 0) {
        const pct = ((diff / currentFile.size) * 100).toFixed(1);
        sizeDiff.className   = 'size-tag smaller';
        sizeDiff.textContent = `▼ ${pct}% smaller`;
      } else if (diff < 0) {
        const pct = ((Math.abs(diff) / currentFile.size) * 100).toFixed(1);
        sizeDiff.className   = 'size-tag larger';
        sizeDiff.textContent = `▲ ${pct}% larger`;
      } else {
        sizeDiff.textContent = '';
      }

      result.classList.add('show');
      convertBtn.disabled     = false;
      convertBtn.textContent  = 'Convert Image';

      // Smooth scroll to result
      result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, selectedFmt, quality);

  } catch (err) {
    console.error(err);
    convertBtn.disabled    = false;
    convertBtn.textContent = 'Convert Image';
    alert('Could not convert this image. Please try a different file.');
  }
});

/* ── Download ── */
downloadBtn.addEventListener('click', () => {
  if (!convertedBlob || !currentFile) return;
  const base = currentFile.name.replace(/\.[^/.]+$/, '');
  const ext  = fmtExt(selectedFmt);
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(convertedBlob);
  a.download = `${base}.${ext}`;
  a.click();
});
