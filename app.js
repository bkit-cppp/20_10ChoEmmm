(() => {
  'use strict';
  const config = window.GIFT_CONFIG;
  const $ = (id) => document.getElementById(id);
  const sceneNames = ['intro', 'card', 'memories', 'sphere', 'gallery', 'envelope'];
  const sceneLabels = ['Màn hoa', 'Thiệp 20/10', 'Không gian kỷ niệm', 'Quả cầu ảnh', 'Bộ ảnh', 'Lá thư'];
  const canvas = $('universe'), ctx = canvas.getContext('2d');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const puzzleEffect = window.GiftEffects.createPuzzle($('puzzle'), reduceMotion);
  const photoEffect = window.GiftEffects.createPhotoWorld(reduceMotion);
  const memoryEffect = window.createMemoryWorld({reduced: reduceMotion, wishes: config.wishes});
  let previousScene = 0;
  let width = 0, height = 0, dpr = 1, current = 0, sceneStart = performance.now();
  let timer, curtainTimer, images = [], autoPlay = config.autoPlay && !reduceMotion, scheduleToken = 0;
  let dragRotation = 0, dragging = false, lastX = 0, lastY = 0;
  const messageKey = `gift-message-${config.contentVersion || 'default'}`;
  const signatureKey = `gift-signature-${config.contentVersion || 'default'}`;
  let message = localStorage.getItem(messageKey) || config.message;
  let signature = localStorage.getItem(signatureKey) || config.signature;
  let musicOn = false, lastFrame = 0, showLetterTimer;
  const objectUrls = [];

  let seed = 20102026;
  function random() { 
    seed = (seed * 1664525 + 1013904223) >>> 0; 
    return seed / 4294967296; }
  const stars = Array.from({ length: 390 }, () => ({ x: random(), y: random(), r: random() * 1.2 + .2, phase: random() * Math.PI * 2, speed: random() * .5 + .3 }));
  function resize() {
    width = innerWidth; height = innerHeight; dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  addEventListener('resize', resize); resize();
  function syncLetter() { $('letter-text').textContent = message; $('letter-signature').textContent = signature; }
  syncLetter();
  function schedule() {
    const token = ++scheduleToken;
    clearTimeout(timer); clearTimeout(curtainTimer); clearTimeout(showLetterTimer);
    if (current === 0 && autoPlay) window.BloomIntro.ready.then(() => {
      if (token === scheduleToken && current === 0 && autoPlay) curtainTimer = setTimeout(openCurtain, config.durations.intro);
    });
    if (autoPlay && current > 0 && current < 5) timer = setTimeout(() => go(current + 1), config.durations[sceneNames[current]]);
    if (autoPlay && current === 5) showLetterTimer = setTimeout(openLetter, config.durations.envelope);
  }
  function go(index) {
    clearTimeout(timer); clearTimeout(curtainTimer); clearTimeout(showLetterTimer);
    previousScene = current;
    current = (index + sceneNames.length) % sceneNames.length;
    dragging = false;
    document.body.classList.toggle('memory-3d', current === 2);
    if (current === 2) memoryEffect.reset();
    $('gallery').classList.toggle('world-transition', current === 4 && previousScene === 3 && !reduceMotion);
    sceneStart = performance.now();
    sceneNames.forEach((name, i) => { const el = $(name); el.hidden = i !== current; el.classList.toggle('active', i === current); });
    $('intro').classList.remove('opening');
    if (current === 0) window.BloomIntro.start();
    else window.BloomIntro.stop();
    document.querySelectorAll('.scene-dots button').forEach((dot, i) => { dot.classList.toggle('current', i === current); dot.setAttribute('aria-current', i === current ? 'step' : 'false'); });
    if (current === 1) drawPuzzle();
    schedule();
  }
  function openCurtain() {
    if (current !== 0 || $('intro').classList.contains('opening')) return;
    clearTimeout(timer); clearTimeout(curtainTimer);
    $('card').hidden = false; $('card').classList.add('active'); drawPuzzle();
    $('intro').classList.add('opening');
    window.BloomIntro.open();
    timer = setTimeout(() => go(1), reduceMotion ? 150 : 2600);
  }
  function tryMusic() {
    if (musicOn) return;
    $('music').play().then(() => { musicOn = true; updateMusic(); }).catch(() => {});
  }
  function updateMusic() {
    $('music-toggle').setAttribute('aria-pressed', String(musicOn));
    $('music-toggle').setAttribute('aria-label', musicOn ? 'Tắt nhạc' : 'Bật nhạc');
    $('music-toggle').title = musicOn ? 'Tắt nhạc' : 'Bật nhạc';
    $('music-toggle').textContent = musicOn ? '♫' : '♪';
  }
  $('open-curtain').addEventListener('click', () => { tryMusic(); openCurtain(); });
  $('heart-button').addEventListener('click', () => { tryMusic(); go(2); });
  $('next').addEventListener('click', () => go(current + 1));
  $('previous').addEventListener('click', () => go(current - 1));
  document.querySelectorAll('[data-next]').forEach(el => el.addEventListener('click', () => go(sceneNames.indexOf(el.dataset.next))));
  sceneLabels.forEach((label, i) => { const button = document.createElement('button'); button.title = label; button.setAttribute('aria-label', label); button.addEventListener('click', () => go(i)); $('scene-dots').append(button); });
  $('music-toggle').addEventListener('click', () => { if (musicOn) { $('music').pause(); musicOn = false; updateMusic(); } else tryMusic(); });
  $('music').addEventListener('error', () => { musicOn = false; updateMusic(); });
  $('fullscreen').addEventListener('click', async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch {} });
  addEventListener('keydown', e => { if (document.querySelector('dialog[open]') || /INPUT|TEXTAREA/.test(e.target.tagName)) return; if (e.key === 'ArrowRight') go(current + 1); if (e.key === 'ArrowLeft') go(current - 1); });
  function openLetter() { clearTimeout(showLetterTimer); syncLetter(); if (!$('letter-dialog').open) $('letter-dialog').showModal(); }
  $('envelope-button').addEventListener('click', () => { tryMusic(); openLetter(); });
  document.querySelector('.close-letter').addEventListener('click', () => $('letter-dialog').close());
  document.querySelector('.close-photo').addEventListener('click', () => $('photo-dialog').close());
  ['letter-dialog', 'photo-dialog', 'settings-dialog'].forEach(id => $(id).addEventListener('click', e => { if (e.target === $(id)) { const rect = $(id).getBoundingClientRect(); if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) $(id).close(); } }));
  function showPhoto(index) { clearTimeout(timer); $('large-photo').src = images[index % images.length].src; $('photo-dialog').showModal(); }
  $('photo-dialog').addEventListener('close', schedule);
  function fillPhotos() {
    $('gallery-grid').replaceChildren(); $('floating-photos').replaceChildren();
    for (let i = 0; i < 9; i++) { const button = document.createElement('button'); button.setAttribute('aria-label', `Xem ảnh kỷ niệm ${i + 1}`); const img = document.createElement('img'); img.src = images[i % images.length].src; img.alt = `Kỷ niệm ${i + 1}`; button.append(img); button.addEventListener('click', () => showPhoto(i)); $('gallery-grid').append(button); }
    for (let i = 0; i < 6; i++) { const img = document.createElement('img'); img.src = images[(i + 2) % images.length].src; img.alt = ''; img.style.setProperty('--delay', `${-i * .8}s`); $('floating-photos').append(img); }
    puzzleEffect.setImages(images); photoEffect.setImages(images); memoryEffect.setImages(images);
    drawPuzzle();
  }
  async function loadImages(paths) { images = await Promise.all(paths.map(src => new Promise(resolve => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => resolve(img); img.src = src; }))); fillPhotos(); }
  const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  weekdays.forEach(day => { const span = document.createElement('span'); span.className = 'weekday'; span.textContent = day; $('calendar').append(span); });
  for (let i = 0; i < new Date(2026, 9, 1).getDay(); i++) $('calendar').append(document.createElement('span'));
  for (let day = 1; day <= 31; day++) { const span = document.createElement('span'); span.textContent = day; if (day === 20) { span.className = 'special'; span.setAttribute('aria-label', 'Ngày Phụ nữ Việt Nam, 20 tháng 10'); } $('calendar').append(span); }
  for (let i = 0; i < 18; i++) { const flower = document.createElement('i'); flower.className = 'little-flower'; flower.style.setProperty('--height', `${25 + random() * 45}%`); flower.style.setProperty('--color', ['#f8edb1', '#e9dca0', '#8ba3d0', '#f5eac9'][i % 4]); flower.style.setProperty('--delay', `${-i * .5}s`); $('flower-border').append(flower); }
  function cover(context, image, x, y, w, h) {
    if (!image?.naturalWidth) { context.fillStyle = '#9d6a83'; context.fillRect(x, y, w, h); return; }
    const s = Math.max(w / image.naturalWidth, h / image.naturalHeight), sw = w / s, sh = h / s;
    context.drawImage(image, (image.naturalWidth - sw) / 2, (image.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
  }
  function drawPuzzle() {
    puzzleEffect.draw(current === 1 ? (performance.now() - sceneStart) / 1000 : 0);
  }
  function background(t) {
    ctx.clearRect(0, 0, width, height);
    const glow = ctx.createRadialGradient(width * .5, height * .7, 0, width * .5, height * .7, Math.max(width, height) * .65);
    glow.addColorStop(0, current >= 2 ? '#281036' : '#160d1e'); glow.addColorStop(.6, '#0c0711'); glow.addColorStop(1, '#030205'); ctx.fillStyle = glow; ctx.fillRect(0, 0, width, height);
    for (const star of stars) { const alpha = .18 + (Math.sin(t * star.speed + star.phase) + 1) * .22; ctx.fillStyle = `rgba(235,216,246,${alpha})`; ctx.beginPath(); ctx.arc(star.x * width, (star.y * height + (reduceMotion ? 0 : t * star.speed * 2)) % height, star.r, 0, 6.283); ctx.fill(); }
  }
  function drawMemories(t, elapsed, opacity = 1) {
    memoryEffect.draw(ctx, {width, height, t, elapsed, opacity});
  }
  function drawSphere(t, elapsed) {
    if (previousScene === 2 && elapsed < 1.1 && !reduceMotion) {
      drawMemories(t, 1.8, Math.max(0, 1 - elapsed / 1.1));
    }
    photoEffect.drawSphere(ctx, {width, height, elapsed, drag: dragRotation});
  }
  function drawGallery(elapsed) {
    if (!$('gallery').classList.contains('world-transition')) return;
    const targets = [...$('gallery-grid').children].map(el => el.getBoundingClientRect());
    if (photoEffect.drawGallery(ctx, {width, height, elapsed, targets})) $('gallery').classList.remove('world-transition');
  }
  // Rotate the memory world or the photo globe with mouse/touch dragging.
  addEventListener('pointerdown', e => {
    if ((current === 2 || current === 3) && !e.target.closest('button,nav,dialog')) {
      e.preventDefault();
      dragging = true; lastX = e.clientX; lastY = e.clientY; clearTimeout(timer);
    }
  });
  addEventListener('pointermove', e => {
    if (current === 2 && !dragging) memoryEffect.aim((e.clientX / width - .5) * 2, (e.clientY / height - .5) * 2);
    if (!dragging) return;
    if (current === 2) memoryEffect.drag(e.clientX - lastX, e.clientY - lastY);
    else if (current === 3) dragRotation += (e.clientX - lastX) * .006;
    lastX = e.clientX; lastY = e.clientY;
  });
  const releaseDrag = () => { if (dragging) { dragging = false; schedule(); } };
  addEventListener('pointerup', releaseDrag); addEventListener('pointercancel', releaseDrag);
  addEventListener('wheel', e => {
    if (current === 2 && !document.querySelector('dialog[open]') && !e.target.closest('nav,button')) { e.preventDefault(); memoryEffect.zoom(e.deltaY); }
  }, {passive: false});
  function frame(now) {
    requestAnimationFrame(frame);
    const interval = reduceMotion ? 100 : current === 0 && !$('intro').classList.contains('opening') ? 100 : 28;
    if (document.hidden || now-lastFrame < interval) return;
    lastFrame=now; const t=reduceMotion ? 0 : now/1000, elapsed=(now-sceneStart)/1000;
    background(t);
    if(current===1)drawPuzzle();
    if(current===2)drawMemories(t,elapsed);
    if(current===3)drawSphere(t,elapsed);
    if(current===4)drawGallery(elapsed);
  }
  $('settings-toggle').addEventListener('click',()=>{++scheduleToken;clearTimeout(timer);clearTimeout(curtainTimer);clearTimeout(showLetterTimer);$('message-input').value=message;$('signature-input').value=signature;$('auto-input').checked=autoPlay;$('settings-dialog').showModal();});
  $('settings-dialog').addEventListener('close',()=>{if($('settings-dialog').returnValue==='save'){message=$('message-input').value.trim()||config.message;signature=$('signature-input').value.trim()||config.signature;autoPlay=$('auto-input').checked;try{localStorage.setItem(messageKey,message);localStorage.setItem(signatureKey,signature);}catch{}syncLetter();}schedule();});
  $('photo-input').addEventListener('change',async e=>{const files=[...e.target.files].filter(f=>f.type.startsWith('image/'));if(!files.length)return;const paths=files.map(file=>{const url=URL.createObjectURL(file);objectUrls.push(url);return url;});await loadImages(paths);});
  $('audio-input').addEventListener('change',e=>{const file=e.target.files[0];if(!file)return;$('music').pause();musicOn=false;const url=URL.createObjectURL(file);objectUrls.push(url);$('music').src=url;tryMusic();});
  addEventListener('beforeunload',()=>objectUrls.forEach(url=>URL.revokeObjectURL(url)));
  loadImages(config.photos);go(0);requestAnimationFrame(frame);
})();
