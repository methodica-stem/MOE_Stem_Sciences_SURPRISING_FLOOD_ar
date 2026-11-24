'use strict';
/* ===================================================================
   script.js — lomda engine (starter from the stem-lomda-builder skill)

   Distilled from the approved Flickering Lights lomda. Screens are plain
   HTML; this file reads what each screen declares and runs it:

     <section class="screen" data-screen="N" data-sid="q1" data-type="question" ...>

   data-type selects the behaviour (opening, explain, video, tiles, hub,
   question, applet, finish). Almost every screen needs NO code here. When
   one really does, add an entry to HOOKS below, keyed by its data-sid.

   QA contract — the QA system reads the page through these. Do not
   rename them, wrap this file in a function, or make it a module:
     goTo, TOTAL_SCREENS, window.lomdaState, LOMDA_SCREEN_CHANGED,
     LOMDA_COMPLETE, DEV_READY / DEV_GOTO.

   Learner-facing Hebrew lives in index.html, not here, so the translation
   export finds every string in one place.
   =================================================================== */

const TOTAL_SCREENS = 28;             // must equal the number of <section class="screen">
window.TOTAL_SCREENS = TOTAL_SCREENS;
let currentScreen = 1;

window.lomdaState = {
  score: 0,             // running grade, 0-100
  questionScores: {},   // sid -> points earned
  DONE: {}              // screen number -> true once resolved (resume lock)
};

/* Per-screen extras, keyed by data-sid. Both functions are optional.
   enter(screen, n)            runs every time the screen is entered
   resolved(screen, n, outcome) runs once a question is answered
                               ('correct' | 'partial' | 'wrong2')
   Example:
   HOOKS['q7'] = { resolved: function (screen) { screen.querySelector('.teacher').hidden = false; } };
*/
const HOOKS = {};

/* ---------------- Small helpers ---------------- */
function screenEl(n) { return document.querySelector('.screen[data-screen="' + n + '"]'); }
function screenOf(el) { return el && el.closest ? el.closest('.screen') : null; }
function screenNum(el) { return parseInt(el.getAttribute('data-screen'), 10); }
function sidOf(el) { return el.getAttribute('data-sid') || ('s' + screenNum(el)); }
function announce(msg) {
  const el = document.getElementById('a11y-status');
  if (el) { el.textContent = ''; setTimeout(function () { el.textContent = msg; }, 30); }
}
function uiText(key) {
  // Engine strings (screen-reader announcements) live once in index.html, #ui-text.
  const el = document.querySelector('#ui-text [data-key="' + key + '"]');
  return el ? el.textContent : '';
}

/* ---------------- Canvas scaling ----------------
   The design is a fixed 1920x1080 stage. A QA host embeds the page in an
   iframe whose size is not always settled when this first runs, and a parent
   resizing the iframe does not always fire 'resize' inside it — so scale on
   every signal available and re-run a few times during the first seconds. */
function scaleApp() {
  const app = document.getElementById('app');
  if (!app || !window.innerWidth || !window.innerHeight) return;
  const scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
  app.style.transform = 'scale(' + scale + ')';
  app.style.left = ((window.innerWidth - 1920 * scale) / 2) + 'px';
  app.style.top = ((window.innerHeight - 1080 * scale) / 2) + 'px';
}
function appScale() { return Math.min(window.innerWidth / 1920, window.innerHeight / 1080) || 1; }
window.addEventListener('resize', scaleApp);
window.addEventListener('load', scaleApp);
document.addEventListener('visibilitychange', function () { if (!document.hidden) scaleApp(); });
requestAnimationFrame(scaleApp);
[100, 300, 800, 1500, 3000].forEach(function (ms) { setTimeout(scaleApp, ms); });
if (window.ResizeObserver) new ResizeObserver(scaleApp).observe(document.documentElement);

/* ---------------- Navigation ---------------- */
function goTo(n) {
  if (n < 1 || n > TOTAL_SCREENS) return;
  pauseAllMedia();
  closeAllOverlays();
  document.querySelectorAll('.screen').forEach(function (s) { s.classList.remove('active'); });
  const target = screenEl(n);
  if (target) target.classList.add('active');
  currentScreen = n;
  resetScreenState(n);
  notifyScreenChanged(n);
  schedulePreload(n + 1);
  schedulePreload(n - 1);
}

/* The forward arrow is the gate. While it is hidden the learner cannot move
   on — the keyboard path (ArrowLeft) goes through here too, so it is gated. */
function advanceScreen() {
  const s = screenEl(currentScreen);
  const arrow = s && s.querySelector('.nav-next');
  if (arrow && arrow.classList.contains('hidden')) return;
  goTo(currentScreen + 1);
}
function goBack() { goTo(currentScreen - 1); }

function revealForwardNav(n) {
  const s = screenEl(n);
  const arrow = s && s.querySelector('.nav-next');
  if (arrow) { arrow.classList.remove('hidden'); arrow.classList.add('blink'); }
}
function hideForwardNav(n) {
  const s = screenEl(n);
  const arrow = s && s.querySelector('.nav-next');
  if (arrow) { arrow.classList.add('hidden'); arrow.classList.remove('blink'); }
}

function pauseAllMedia() {
  document.querySelectorAll('video, audio').forEach(function (m) { try { m.pause(); } catch (e) {} });
}

/* Warm the neighbouring screens' images while the learner reads this one.
   All screens live in the DOM at once; their <img loading="lazy"> only start
   fetching when the screen is shown, so without this every image pops in. */
const preloaded = {};
function preloadScreenImages(n) {
  if (preloaded[n]) return;
  preloaded[n] = true;
  const s = screenEl(n);
  if (!s) return;
  s.querySelectorAll('img[src]').forEach(function (img) { (new Image()).src = img.getAttribute('src'); });
}
function schedulePreload(n) {
  const run = function () { preloadScreenImages(n); };
  if (window.requestIdleCallback) requestIdleCallback(run, { timeout: 2000 }); else setTimeout(run, 500);
}

/* ---------------- QA / dev bridge ----------------
   index_dev.html and the QA system embed this page in an iframe and talk to
   it only through postMessage (file:// blocks direct access between frames). */
function notifyScreenChanged(n) {
  try { window.parent.postMessage({ type: 'LOMDA_SCREEN_CHANGED', screen: n }, '*'); } catch (e) {}
}
let handshakeAcked = false;
function announceReady() {
  if (handshakeAcked) return;
  try {
    if (window.parent && window.parent !== window) {
      const screens = Array.prototype.map.call(document.querySelectorAll('.screen'), function (s) {
        return { n: screenNum(s), sid: s.getAttribute('data-sid') || '', type: s.getAttribute('data-type') || '' };
      });
      window.parent.postMessage({ type: 'DEV_READY', total: TOTAL_SCREENS, screens: screens }, '*');
    }
  } catch (e) {}
}
/* One "ready" message can be lost if the host attaches its listener late, so
   re-announce until the host answers with a DEV_GOTO (or 20 tries pass). */
let handshakeTries = 0;
const handshakeTimer = setInterval(function () {
  announceReady();
  if (handshakeAcked || ++handshakeTries > 20) clearInterval(handshakeTimer);
}, 400);
window.addEventListener('load', announceReady);

window.addEventListener('message', function (e) {
  const d = e.data;
  if (!d || typeof d !== 'object') return;
  if (d.type === 'DEV_GOTO' && typeof d.screen === 'number') {
    handshakeAcked = true;
    goTo(d.screen);
  } else if (d.type === 'APPLET_STARTED') {
    onAppletStarted(e.source);
  }
});

/* Some hosts switch screens by toggling .active themselves instead of calling
   goTo(). Catch that and run the normal entry logic. */
(function () {
  const app = document.getElementById('app');
  if (!app || typeof MutationObserver === 'undefined') return;
  new MutationObserver(function (mutations) {
    mutations.forEach(function (m) {
      const el = m.target;
      if (!el.classList || !el.classList.contains('screen') || !el.classList.contains('active')) return;
      const n = screenNum(el);
      if (isNaN(n) || n === currentScreen) return;
      currentScreen = n;
      resetScreenState(n);
      notifyScreenChanged(n);
    });
  }).observe(app, { subtree: true, attributes: true, attributeFilter: ['class'] });
})();

/* ---------------- Screen entry ---------------- */
const ENTER = {
  opening: function () {},
  explain: enterExplain,
  video: enterVideo,
  tiles: enterTiles,
  hub: enterExplain,       // a guided hub moves on through its own button; a final hub may show the arrow
  question: enterQuestion,
  applet: enterApplet,
  finish: enterFinish
};

function resetScreenState(n) {
  const s = screenEl(n);
  if (!s) return;
  updateStepper(s);
  const type = s.getAttribute('data-type') || 'explain';
  (ENTER[type] || enterExplain)(s, n);
  const hook = HOOKS[sidOf(s)];
  if (hook && hook.enter) hook.enter(s, n);
  s.focus({ preventScroll: true });
}

/* Explanation screens: the arrow appears at once, or after data-arrow-delay seconds. */
const arrowTimers = {};
function enterExplain(s, n) {
  if (!s.querySelector('.nav-next')) return;
  const delay = parseFloat(s.getAttribute('data-arrow-delay') || '0');
  if (!delay || window.lomdaState.DONE[n]) { revealForwardNav(n); return; }
  hideForwardNav(n);
  clearTimeout(arrowTimers[n]);
  arrowTimers[n] = setTimeout(function () { window.lomdaState.DONE[n] = true; revealForwardNav(n); }, delay * 1000);
}

/* ===================================================================
   Feedback popup (one, shared, outside every screen)
   showFeedback(type, { title, body }) — type is the outcome:
   retry | retryPartial | correct | partial | wrong2.
   The popup also gets the class fb-<sid>, so a screen can move it in CSS:
     #feedback-popup.fb-q3 { left: 340px; bottom: 185px; }
   =================================================================== */
function showFeedback(type, cfg) {
  const popup = document.getElementById('feedback-popup');
  const s = screenEl(currentScreen);
  popup.className = 'show ' + type + (s ? ' fb-' + sidOf(s) : '');
  document.getElementById('fb-title').textContent = (cfg && cfg.title) || '';
  const body = document.getElementById('fb-body');
  body.innerHTML = '';
  ((cfg && cfg.body) || []).forEach(function (line) {
    if (line && line.nodeType === 1) { body.appendChild(line.cloneNode(true)); return; }
    const p = document.createElement('p');
    p.textContent = line;
    body.appendChild(p);
  });
  openOverlayFocus(popup);
}
function hideFeedback() {
  const popup = document.getElementById('feedback-popup');
  if (popup.classList.contains('show')) { popup.classList.remove('show'); returnOverlayFocus(); }
}

/* Feedback text is written in the screen itself:
     <div class="fb-src" hidden>
       <div data-fb="correct"><p class="fb-t">צדקת!</p><p>הסבר…</p></div>
     </div>
   Read it into { correct: {title, body:[<p>…]}, … }. */
function readFeedback(s) {
  const out = {};
  s.querySelectorAll('.fb-src [data-fb]').forEach(function (box) {
    const t = box.querySelector('.fb-t');
    out[box.getAttribute('data-fb')] = {
      title: t ? t.textContent.trim() : '',
      body: Array.prototype.filter.call(box.children, function (c) { return c !== t; })
    };
  });
  return out;
}

/* ---------------- Overlays + focus (a11y) ---------------- */
let lastFocusedBeforeOverlay = null;
function openOverlayFocus(el) {
  if (!el) return;
  if (!lastFocusedBeforeOverlay) lastFocusedBeforeOverlay = document.activeElement;
  el.focus({ preventScroll: true });
}
function returnOverlayFocus() {
  const el = lastFocusedBeforeOverlay;
  lastFocusedBeforeOverlay = null;
  if (el && typeof el.focus === 'function' && document.contains(el)) el.focus({ preventScroll: true });
}
function getOpenDialog() {
  const ids = ['img-zoom-modal', 'reopen-popup', 'feedback-popup'];
  for (let i = 0; i < ids.length; i++) {
    const el = document.getElementById(ids[i]);
    if (el && el.classList.contains('show')) return el;
  }
  return null;
}
function getFocusable(container) {
  return Array.prototype.slice
    .call(container.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), iframe'))
    .filter(function (el) { return el.tagName === 'IFRAME' || el.offsetParent !== null; });
}
function closeAllOverlays() {
  ['feedback-popup', 'img-zoom-modal', 'reopen-popup'].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('show');
  });
  const body = document.getElementById('reopen-popup-body');
  if (body) body.innerHTML = '';
  document.querySelectorAll('.reopen-btn.is-open').forEach(function (b) { b.classList.remove('is-open'); });
  document.querySelectorAll('.term.is-open').forEach(function (t) { t.classList.remove('is-open'); });
  returnOverlayFocus();
}

document.addEventListener('keydown', function (e) {
  const dialog = getOpenDialog();
  // Keep Tab inside an open dialog (feedback is non-modal on purpose: the
  // learner re-picks an answer while the retry message stays up).
  if (dialog && dialog.id !== 'feedback-popup' && e.key === 'Tab') {
    const f = getFocusable(dialog);
    if (!f.length) { e.preventDefault(); return; }
    const first = f[0], last = f[f.length - 1];
    if (f.indexOf(document.activeElement) === -1) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
    else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    return;
  }
  if (e.key === 'Escape') { closeAllOverlays(); return; }
  const tag = (document.activeElement && document.activeElement.tagName) || '';
  if (!dialog && tag !== 'INPUT') {
    if (e.key === 'ArrowLeft') advanceScreen();   // RTL: forward is on the left
    if (e.key === 'ArrowRight') goBack();
  }
  if (e.key === 'Enter' || e.key === ' ') {
    // div/span widgets with role=button/radio/checkbox get no native Enter/Space.
    const el = document.activeElement;
    const role = el && el.getAttribute && el.getAttribute('role');
    if (el && el.tagName !== 'BUTTON' && (role === 'button' || role === 'radio' || role === 'checkbox')) {
      e.preventDefault();
      el.click();
    }
  }
});

/* ---------------- Delegated clicks ----------------
   Markup declares intent with data-action / classes; no inline onclick. */
document.addEventListener('click', function (e) {
  const t = e.target;
  let el;
  if ((el = t.closest('.nav-next'))) { advanceScreen(); return; }
  if ((el = t.closest('.nav-prev'))) { goBack(); return; }
  if ((el = t.closest('[data-action="next"]'))) { goTo(currentScreen + 1); return; }
  if ((el = t.closest('[data-action="finish"]'))) { finishLomda(); return; }
  if ((el = t.closest('[data-action="close-lomda"]'))) { closeLomda(el); return; }
  if ((el = t.closest('.play-btn-big'))) { playVideo(screenOf(el)); return; }
  if ((el = t.closest('.q-opt'))) { qSelect(el); return; }
  if ((el = t.closest('.btn-check'))) { checkAnswer(screenOf(el)); return; }
  if ((el = t.closest('.tile'))) { revealTile(el); return; }
  if ((el = t.closest('.reopen-btn'))) { toggleReopen(el); return; }
  if ((el = t.closest('[data-zoom-src], [data-zoom-clone]'))) { openZoom(el); return; }
  if ((el = t.closest('[data-zoom-close]'))) { closeZoom(); return; }
  if ((el = t.closest('.term'))) { toggleTerm(el); return; }
  if ((el = t.closest('.dnd-chip'))) { dndChipClick(el); return; }
  if ((el = t.closest('.dnd-slot'))) { dndSlotClick(el); return; }
  if ((el = t.closest('.dnd-bank'))) { dndBankClick(); return; }
});

/* ===================================================================
   Video screens
   <div class="video-wrap">
     <video class="video-el" playsinline preload="metadata" ...><source src="assets/videos/x.mp4#t=0.001" type="video/mp4"></video>
     <div class="vcap-src" data-clear-after="21.5" hidden>
       <span data-t="0.4">first caption line</span>
       <span data-t="3.2">second caption line</span>
     </div>
     <div class="video-caption hidden"><p></p></div>
     <button class="play-btn-big" type="button" aria-label="…"></button>
   </div>
   The control bar (.vctrls) is cloned from #vctrls-tpl, so its labels exist
   once. A <video data-pending-asset> has no file yet: "playing" it unlocks
   the arrow after 1.5 s, so gating can be tested before the video arrives.
   =================================================================== */
const videoStarted = {};
const videoEnded = {};
const captionsOn = {};

function enterVideo(s, n) {
  if (videoStarted[n]) return;          // resume lock: keep the arrow if already earned
  const big = s.querySelector('.play-btn-big');
  if (big) big.classList.remove('hidden');
  hideForwardNav(n);
}

function readCues(wrap) {
  const src = wrap.querySelector('.vcap-src');
  if (!src) return [];
  const spans = Array.prototype.slice.call(src.querySelectorAll('span[data-t]'));
  const clear = parseFloat(src.getAttribute('data-clear-after') || 'Infinity');
  return spans.map(function (sp, i) {
    const start = parseFloat(sp.getAttribute('data-t'));
    const end = sp.hasAttribute('data-end') ? parseFloat(sp.getAttribute('data-end'))
      : (i + 1 < spans.length ? parseFloat(spans[i + 1].getAttribute('data-t')) : clear);
    return { start: start, end: end, el: sp };
  });
}

function formatTime(sec) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return m + ':' + (s < 10 ? '0' : '') + s;
}

function initVideo(wrap) {
  const s = screenOf(wrap), n = screenNum(s);
  const video = wrap.querySelector('video');
  if (!video) return;
  const tpl = document.getElementById('vctrls-tpl');
  if (tpl && !wrap.querySelector('.vctrls')) wrap.appendChild(tpl.content.cloneNode(true));
  const bar = wrap.querySelector('.vctrls');
  const cues = readCues(wrap);
  const capEl = wrap.querySelector('.video-caption');
  const capText = capEl && capEl.querySelector('p');
  captionsOn[n] = true;

  video.addEventListener('timeupdate', function () {
    if (capEl && capText) {
      const t = video.currentTime;
      const cue = captionsOn[n] && cues.find(function (c) { return t >= c.start && t < c.end; });
      if (cue) { capText.textContent = cue.el.textContent; capEl.classList.remove('hidden'); }
      else capEl.classList.add('hidden');
    }
    // Unlock a little before the real end: in some embeds 'ended' fires late or never.
    if (!videoEnded[n] && video.duration && video.duration - video.currentTime <= 3) onVideoEnded(n);
  });
  video.addEventListener('ended', function () { onVideoEnded(n); });
  // "Playing" hides a banner shown over the video; at the end the PLAY button comes back.
  video.addEventListener('play', function () { s.classList.add('video-playing'); });
  video.addEventListener('ended', function () {
    s.classList.remove('video-playing');
    const big = s.querySelector('.play-btn-big');
    if (big) big.classList.remove('hidden');
  });
  if (!bar) return;

  const playBtn = bar.querySelector('[data-play]');
  const curEl = bar.querySelector('[data-cur]');
  const durEl = bar.querySelector('[data-dur]');
  const seek = bar.querySelector('[data-seek]');
  const ccBtn = bar.querySelector('[data-cc]');
  const muteBtn = bar.querySelector('[data-mute]');
  const vol = bar.querySelector('[data-vol]');
  const fullBtn = bar.querySelector('[data-full]');
  let seeking = false;

  function syncPlay() { playBtn.textContent = video.paused ? '▶' : '⏸'; }
  video.addEventListener('play', syncPlay);
  video.addEventListener('pause', syncPlay);
  playBtn.addEventListener('click', function () { if (video.paused) playVideo(s); else video.pause(); });
  video.addEventListener('loadedmetadata', function () { durEl.textContent = formatTime(video.duration); });
  video.addEventListener('timeupdate', function () {
    curEl.textContent = formatTime(video.currentTime);
    if (!seeking && video.duration) seek.value = String(Math.round(video.currentTime / video.duration * 1000));
  });
  seek.addEventListener('input', function () {
    seeking = true;
    if (video.duration) curEl.textContent = formatTime(seek.value / 1000 * video.duration);
  });
  seek.addEventListener('change', function () {
    if (video.duration) video.currentTime = seek.value / 1000 * video.duration;
    seeking = false;
  });
  if (!cues.length && ccBtn) ccBtn.hidden = true;
  if (ccBtn) ccBtn.addEventListener('click', function () {
    captionsOn[n] = !captionsOn[n];
    ccBtn.classList.toggle('is-off', !captionsOn[n]);
    ccBtn.setAttribute('aria-pressed', String(captionsOn[n]));
  });
  function syncMute() {
    const muted = video.muted || video.volume === 0;
    muteBtn.textContent = muted ? '🔇' : '🔊';
    muteBtn.setAttribute('aria-pressed', String(muted));
  }
  muteBtn.addEventListener('click', function () {
    video.muted = !video.muted;
    if (!video.muted && video.volume === 0) video.volume = 1;
    vol.value = video.muted ? '0' : String(Math.round(video.volume * 100));
    syncMute();
  });
  vol.addEventListener('input', function () {
    video.volume = vol.value / 100;
    video.muted = video.volume === 0;
    syncMute();
  });
  syncMute();
  // Fullscreen only ever from the learner's own click, never automatically.
  fullBtn.addEventListener('click', function () {
    if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
    else if (wrap.requestFullscreen) wrap.requestFullscreen().catch(function () {});
  });
  document.addEventListener('fullscreenchange', function () {
    fullBtn.setAttribute('aria-pressed', String(document.fullscreenElement === wrap));
  });
}

function playVideo(s) {
  if (!s) return;
  const n = screenNum(s);
  const video = s.querySelector('.video-wrap video');
  const big = s.querySelector('.play-btn-big');
  videoStarted[n] = true;
  if (big) big.classList.add('hidden');
  if (!video) return;
  if (video.hasAttribute('data-pending-asset')) {
    setTimeout(function () { onVideoEnded(n); }, 1500);
    return;
  }
  video.play().catch(function () {});
}

function onVideoEnded(n) {
  if (videoEnded[n]) return;
  videoEnded[n] = true;
  window.lomdaState.DONE[n] = true;
  revealForwardNav(n);
}

/* ===================================================================
   Reveal tiles — click every tile; the arrow appears when all were seen.
   <div class="tiles" data-mode="grayscale-once|card-flip">
     <div class="tile" data-tile-id="noa" role="button" tabindex="0" aria-label="…">
       …tile face…
       <div class="tile-content" hidden>the text this tile reveals</div>
     </div>
   </div>
   <div class="tiles-board" aria-live="polite"></div>   (grayscale-once only)
   =================================================================== */
const tilesSeen = {};
function enterTiles(s, n) {
  if (!tilesSeen[n]) tilesSeen[n] = new Set();
  if (window.lomdaState.DONE[n]) { revealForwardNav(n); return; }
  hideForwardNav(n);
}
function revealTile(tile) {
  const s = screenOf(tile), n = screenNum(s);
  const group = tile.closest('.tiles');
  const mode = (group && group.getAttribute('data-mode')) || 'grayscale-once';
  if (!tilesSeen[n]) tilesSeen[n] = new Set();
  const content = tile.querySelector('.tile-content');
  if (mode === 'card-flip') {
    tile.classList.toggle('flipped');
  } else {
    const board = s.querySelector('.tiles-board');
    if (board && content) { board.innerHTML = content.innerHTML; board.classList.remove('empty'); }
    s.querySelectorAll('.tile.current').forEach(function (t) { t.classList.remove('current'); });
    tile.classList.add('viewed', 'current');
    if (group) group.classList.add('started');
  }
  tilesSeen[n].add(tile.getAttribute('data-tile-id'));
  if (tilesSeen[n].size >= s.querySelectorAll('.tile').length) {
    window.lomdaState.DONE[n] = true;
    revealForwardNav(n);
  }
}

/* ===================================================================
   Questions — single choice, multiple choice, drag and drop.
   Declared on the section:
     data-type="question" data-kind="single|multi|dnd" data-weight="10"
   Correct options carry data-correct; drop slots carry data-accept.
   Two attempts:
     1st wrong  -> retry message, nothing turns red, the check button hides
                   until the answer changes.
     correct, or 2nd wrong -> final feedback, answer revealed, arrow appears.
   Marks are given once; coming back shows the final state again.
   =================================================================== */
const QCONFIG = {};   // screen number -> { kind, key, weight, feedback } (read by the Arabic QA tools too)
const qState = {};    // screen number -> { attempts, done, outcome, lastWrong }

function qConfig(s) {
  const n = screenNum(s);
  if (!QCONFIG[n]) {
    QCONFIG[n] = {
      kind: s.getAttribute('data-kind') || 'single',
      key: sidOf(s),
      weight: parseFloat(s.getAttribute('data-weight') || '0'),
      maxAttempts: parseInt(s.getAttribute('data-attempts') || '2', 10),
      feedback: readFeedback(s)
    };
  }
  return QCONFIG[n];
}
function qEnsure(s) {
  const n = screenNum(s);
  if (!qState[n]) qState[n] = { attempts: 0, done: false, outcome: null, lastWrong: null };
  return qState[n];
}
function checkBtn(s) { return s.querySelector('.btn-check'); }
function setCheckable(s, can) {
  const b = checkBtn(s);
  if (!b) return;
  b.disabled = !can;   // a disabled check button is hidden by CSS, never shown faded
}

function enterQuestion(s, n) {
  const cfg = qConfig(s), st = qEnsure(s);
  if (st.done) {
    renderFinal(s, cfg, st);
    setCheckable(s, false);
    showFeedback(st.outcome, cfg.feedback[st.outcome]);
    revealForwardNav(n);
    return;
  }
  hideForwardNav(n);
  if (cfg.kind === 'dnd') dndReset(s);
  else s.querySelectorAll('.q-opt').forEach(function (o) {
    o.classList.remove('selected', 'correct', 'wrong');
    o.setAttribute('aria-checked', 'false');
  });
  st.attempts = 0;
  st.lastWrong = null;
  setCheckable(s, false);
}

function qSelect(opt) {
  const s = screenOf(opt), cfg = qConfig(s), st = qEnsure(s);
  if (st.done) return;
  if (cfg.kind === 'single') {
    s.querySelectorAll('.q-opt').forEach(function (o) {
      const on = o === opt;
      o.classList.toggle('selected', on);
      o.setAttribute('aria-checked', String(on));
    });
  } else {
    const on = !opt.classList.contains('selected');
    opt.classList.toggle('selected', on);
    opt.setAttribute('aria-checked', String(on));
  }
  updateCheckable(s);
}

function answerSnapshot(s) {
  const cfg = qConfig(s);
  if (cfg.kind === 'dnd') {
    return JSON.stringify(Array.prototype.map.call(s.querySelectorAll('.dnd-slot'), function (slot) {
      const c = slot.querySelector('.dnd-chip');
      return c ? c.getAttribute('data-chip') : '';
    }));
  }
  return JSON.stringify(Array.prototype.map.call(s.querySelectorAll('.q-opt.selected'), function (o) {
    return o.getAttribute('data-id');
  }).sort());
}
function hasAnswer(s) {
  if (qConfig(s).kind === 'dnd') {
    return Array.prototype.every.call(s.querySelectorAll('.dnd-slot'), function (sl) { return !!sl.querySelector('.dnd-chip'); });
  }
  return !!s.querySelector('.q-opt.selected');
}
function updateCheckable(s) {
  const st = qEnsure(s);
  // After a first wrong try the retry message stays up. As soon as the learner changes the answer it
  // goes away, so it never covers the check button (it sits where the button is).
  if (!st.done && st.lastWrong !== null && answerSnapshot(s) !== st.lastWrong) hideFeedback();
  setCheckable(s, !st.done && hasAnswer(s) && answerSnapshot(s) !== st.lastWrong);
}

/* -> 'correct' | 'partialClean' (only right picks, not all) | 'partialMixed' (some right + wrong) | 'wrong' */
function grade(s) {
  const cfg = qConfig(s);
  if (cfg.kind === 'dnd') {
    const slots = s.querySelectorAll('.dnd-slot');
    let right = 0;
    slots.forEach(function (sl) { if (dndSlotRight(sl)) right++; });
    return right === slots.length ? 'correct' : (right > 0 ? 'partialMixed' : 'wrong');
  }
  let rightPicked = 0, wrongPicked = 0, rightTotal = 0;
  s.querySelectorAll('.q-opt').forEach(function (o) {
    const isRight = o.hasAttribute('data-correct'), on = o.classList.contains('selected');
    if (isRight) rightTotal++;
    if (on && isRight) rightPicked++;
    if (on && !isRight) wrongPicked++;
  });
  if (rightPicked === rightTotal && wrongPicked === 0) return 'correct';
  if (rightPicked > 0 && wrongPicked === 0) return 'partialClean';
  if (rightPicked > 0) return 'partialMixed';
  return 'wrong';
}

function checkAnswer(s) {
  if (!s) return;
  const n = screenNum(s), cfg = qConfig(s), st = qEnsure(s);
  if (st.done || !hasAnswer(s)) return;
  st.attempts++;
  const g = grade(s);
  const fb = cfg.feedback;

  const retryType = ((g === 'partialClean' || g === 'partialMixed') && cfg.kind === 'multi' && fb.retryPartial) ? 'retryPartial'
    : (g === 'partialClean' && fb.retryPartial) ? 'retryPartial' : 'retry';
  if (g !== 'correct' && st.attempts < cfg.maxAttempts && fb[retryType]) {
    st.lastWrong = answerSnapshot(s);
    setCheckable(s, false);
    showFeedback(retryType, fb[retryType]);
    return;
  }

  let outcome = 'correct';
  if (g !== 'correct') outcome = (cfg.kind === 'multi' && fb.partial && g !== 'wrong') ? 'partial' : 'wrong2';
  st.done = true;
  st.outcome = outcome;
  window.lomdaState.DONE[n] = true;
  recordScore(cfg.key, outcome === 'correct' ? cfg.weight : 0);
  setCheckable(s, false);
  renderFinal(s, cfg, st, true);
  showFeedback(outcome, fb[outcome]);
  const hook = HOOKS[cfg.key];
  if (hook && hook.resolved) hook.resolved(s, n, outcome);
  revealForwardNav(n);
}

/* Mark the final state: right answers green; wrong picks marked wrong. */
function renderFinal(s, cfg, st, justChecked) {
  if (cfg.kind === 'dnd') {
    if (st.outcome === 'correct') { dndMark(s, true); dndLock(s); return; }
    dndMark(s, false);
    dndLock(s);
    const reveal = function () { dndRevealCorrect(s); dndMark(s, true); };
    if (justChecked) setTimeout(reveal, 2000); else reveal();
    return;
  }
  s.querySelectorAll('.q-opt').forEach(function (o) {
    const isRight = o.hasAttribute('data-correct'), on = o.classList.contains('selected');
    o.classList.remove('correct', 'wrong');
    if (isRight) o.classList.add('correct');
    else if (on) o.classList.add('wrong');
  });
}

/* ===================================================================
   Drag and drop — chips into slots. Pointer Events, so it works with a
   mouse, a finger and a pen; click-to-pick / click-to-place doubles as the
   keyboard path (Enter on a chip, then Enter on a slot).
   <div class="dnd-bank"> <button class="dnd-chip" type="button" data-chip="c1">word</button> … </div>
   … <span class="dnd-slot" data-accept="c1" role="button" tabindex="0" aria-label="…"></span> …
   data-accept may list several chip ids (interchangeable answers): "c1 c4".
   =================================================================== */
let dndPicked = null;     // chip chosen by click/keyboard, waiting for a slot
let dndDrag = null;       // { chip, ghost, startX, startY, moved }

function dndBank(s) { return s.querySelector('.dnd-bank'); }
function dndSlotRight(slot) {
  const chip = slot.querySelector('.dnd-chip');
  const ok = (slot.getAttribute('data-accept') || '').split(/\s+/);
  return !!chip && ok.indexOf(chip.getAttribute('data-chip')) !== -1;
}
function dndReset(s) {
  const bank = dndBank(s);
  if (!bank) return;
  const chips = Array.prototype.slice.call(s.querySelectorAll('.dnd-chip'));
  chips.sort(function (a, b) { return (+a.getAttribute('data-order') || 0) - (+b.getAttribute('data-order') || 0); });
  chips.forEach(function (c) { c.classList.remove('picked', 'locked'); c.disabled = false; bank.appendChild(c); });
  s.querySelectorAll('.dnd-slot').forEach(function (sl) {
    sl.classList.remove('correct', 'wrong', 'filled', 'drop-target');
    // an ordering question starts with its chips already in the rows: data-initial="<chip id>"
    const first = sl.getAttribute('data-initial');
    const chip = first && s.querySelector('.dnd-chip[data-chip="' + first + '"]');
    if (chip) { sl.appendChild(chip); sl.classList.add('filled'); }
  });
  s.classList.remove('dnd-locked');
}
function dndPlace(chip, slot) {
  const s = screenOf(chip);
  const prev = slot.querySelector('.dnd-chip');
  const from = chip.closest('.dnd-slot');
  if (prev && prev !== chip) (from ? from : dndBank(s)).appendChild(prev);   // swap with the chip's old slot, or send the old one back to the bank
  slot.appendChild(chip);
  s.querySelectorAll('.dnd-slot').forEach(function (sl) { sl.classList.toggle('filled', !!sl.querySelector('.dnd-chip')); });
  updateCheckable(s);
  announce(uiText('dnd-placed'));
}
function dndReturn(chip) {
  const s = screenOf(chip);
  dndBank(s).appendChild(chip);
  s.querySelectorAll('.dnd-slot').forEach(function (sl) { sl.classList.toggle('filled', !!sl.querySelector('.dnd-chip')); });
  updateCheckable(s);
}
/* Click (or Enter) on a chip picks it up; then a slot places it, and the
   bank takes it back. Clicking the picked chip again puts it down. */
function dndChipClick(chip) {
  const s = screenOf(chip);
  if (s.classList.contains('dnd-locked')) return;
  if (dndDrag && dndDrag.moved) return;               // the pointerup already handled it
  if (dndPicked === chip) { chip.classList.remove('picked'); dndPicked = null; return; }
  // A chip is waiting and this one sits in a slot: the click means "put it here".
  if (dndPicked && chip.closest('.dnd-slot')) { dndSlotClick(chip.closest('.dnd-slot')); return; }
  if (dndPicked) dndPicked.classList.remove('picked');
  dndPicked = chip;
  chip.classList.add('picked');
  announce(uiText('dnd-picked'));
}
function dndSlotClick(slot) {
  if (!dndPicked) return;
  const chip = dndPicked;
  chip.classList.remove('picked');
  dndPicked = null;
  dndPlace(chip, slot);
  chip.focus({ preventScroll: true });
}
function dndBankClick() {
  if (!dndPicked || !dndPicked.closest('.dnd-slot')) return;
  const chip = dndPicked;
  chip.classList.remove('picked');
  dndPicked = null;
  dndReturn(chip);
  chip.focus({ preventScroll: true });
}

/* Pointer dragging. The stage is scaled, so pointer positions are converted
   to stage pixels before the floating copy is placed. */
document.addEventListener('pointerdown', function (e) {
  const chip = e.target.closest && e.target.closest('.dnd-chip');
  if (!chip || e.button > 0) return;
  const s = screenOf(chip);
  if (!s || s.classList.contains('dnd-locked')) return;
  dndDrag = { chip: chip, ghost: null, startX: e.clientX, startY: e.clientY, moved: false };
  chip.setPointerCapture && chip.setPointerCapture(e.pointerId);
});
document.addEventListener('pointermove', function (e) {
  if (!dndDrag) return;
  const d = dndDrag;
  if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 6) return;
  const app = document.getElementById('app').getBoundingClientRect(), k = appScale();
  if (!d.moved) {
    d.moved = true;
    const r = d.chip.getBoundingClientRect();
    d.ghost = d.chip.cloneNode(true);
    d.ghost.classList.add('dnd-ghost');
    d.ghost.style.width = (r.width / k) + 'px';
    d.ghost.style.height = (r.height / k) + 'px';
    d.offX = (e.clientX - r.left) / k;
    d.offY = (e.clientY - r.top) / k;
    document.getElementById('app').appendChild(d.ghost);
    d.chip.classList.add('dragging');
  }
  d.ghost.style.left = ((e.clientX - app.left) / k - d.offX) + 'px';
  d.ghost.style.top = ((e.clientY - app.top) / k - d.offY) + 'px';
  const slot = dndSlotAt(screenOf(d.chip), e.clientX, e.clientY);
  screenOf(d.chip).querySelectorAll('.dnd-slot').forEach(function (sl) { sl.classList.toggle('drop-target', sl === slot); });
});
function dndEndDrag(e) {
  if (!dndDrag) return;
  const d = dndDrag;
  if (d.moved) {
    const s = screenOf(d.chip);
    const slot = dndSlotAt(s, e.clientX, e.clientY);
    s.querySelectorAll('.dnd-slot').forEach(function (sl) { sl.classList.remove('drop-target'); });
    if (slot) dndPlace(d.chip, slot);
    else if (d.chip.closest('.dnd-slot')) dndReturn(d.chip);   // dragged out of a slot -> back to the bank
    d.ghost.remove();
    d.chip.classList.remove('dragging');
    if (dndPicked) { dndPicked.classList.remove('picked'); dndPicked = null; }
    setTimeout(function () { dndDrag = null; }, 0);         // let the click that follows see .moved
  } else {
    dndDrag = null;
  }
}
document.addEventListener('pointerup', dndEndDrag);
document.addEventListener('pointercancel', dndEndDrag);

/* The slot under the pointer, or the nearest one within 90 stage px (small
   targets are hard to hit, especially with a finger). */
function dndSlotAt(s, x, y) {
  let best = null, bestD = Infinity;
  const k = appScale();
  s.querySelectorAll('.dnd-slot').forEach(function (sl) {
    const r = sl.getBoundingClientRect();
    const dx = Math.max(r.left - x, 0, x - r.right), dy = Math.max(r.top - y, 0, y - r.bottom);
    const dist = Math.hypot(dx, dy) / k;
    if (dist < bestD) { bestD = dist; best = sl; }
  });
  return bestD <= 90 ? best : null;
}
function dndMark(s, allRight) {
  s.querySelectorAll('.dnd-slot').forEach(function (sl) {
    sl.classList.remove('correct', 'wrong');
    sl.classList.add(allRight || dndSlotRight(sl) ? 'correct' : 'wrong');
  });
}
function dndLock(s) {
  s.classList.add('dnd-locked');
  s.querySelectorAll('.dnd-chip').forEach(function (c) { c.classList.add('locked'); c.classList.remove('picked'); });
}
/* Put the right chip in every slot. A slot may accept several chips; each
   chip is used once. */
function dndRevealCorrect(s) {
  const bank = dndBank(s);
  s.querySelectorAll('.dnd-chip').forEach(function (c) { bank.appendChild(c); });
  s.querySelectorAll('.dnd-slot').forEach(function (sl) {
    const ok = (sl.getAttribute('data-accept') || '').split(/\s+/);
    for (let i = 0; i < ok.length; i++) {
      const c = bank.querySelector('.dnd-chip[data-chip="' + ok[i] + '"]');
      if (c) { sl.appendChild(c); break; }
    }
    sl.classList.add('filled');
  });
}

/* ---------------- Scoring + completion ---------------- */
/* The grade is out of 100 even when the storyboard's weights do not add up
   to 100 (qa_check.py warns about that). */
function totalWeight() {
  let t = 0;
  document.querySelectorAll('.screen[data-type="question"]').forEach(function (s) {
    t += parseFloat(s.getAttribute('data-weight') || '0');
  });
  return t;
}
function recordScore(key, points) {
  window.lomdaState.questionScores[key] = points;
  let earned = 0;
  Object.keys(window.lomdaState.questionScores).forEach(function (k) { earned += window.lomdaState.questionScores[k]; });
  const total = totalWeight();
  window.lomdaState.score = total ? earned * 100 / total : 0;
}
function computeFinalGrade() { return Math.round(window.lomdaState.score); }

function enterFinish(s, n) {
  window.lomdaState.DONE[n] = true;
}
function finishLomda() {
  const grade = computeFinalGrade();
  try { window.parent.postMessage({ type: 'LOMDA_COMPLETE', score: grade }, '*'); } catch (e) {}
  goTo(currentScreen + 1);   // the black "back to Moodle" screen
}
/* Closes the window Moodle opened for the lomda. Browsers only allow
   window.close() on script-opened windows, so if it is still open a moment
   later, tell the learner to close it themselves. */
function closeLomda(btn) {
  try { window.close(); } catch (e) {}
  try { if (window.top !== window) window.top.close(); } catch (e) {}
  const hint = screenOf(btn) && screenOf(btn).querySelector('.return-hint');
  setTimeout(function () { if (hint) hint.hidden = false; }, 400);
}

/* ---------------- Question stepper (progress pills) ----------------
   Built from the data-step numbers on question screens; shown only there. */
function buildStepper() {
  const st = document.getElementById('q-stepper');
  if (!st) return;
  let max = 0;
  document.querySelectorAll('.screen[data-step]').forEach(function (s) {
    max = Math.max(max, parseInt(s.getAttribute('data-step'), 10) || 0);
  });
  st.innerHTML = '';
  for (let i = 1; i <= max; i++) {
    const pill = document.createElement('span');
    pill.className = 'q-step';
    pill.setAttribute('data-step', i);
    pill.textContent = i;
    st.appendChild(pill);
  }
}
function updateStepper(s) {
  const st = document.getElementById('q-stepper');
  if (!st) return;
  const step = parseInt(s.getAttribute('data-step') || '0', 10);
  st.classList.toggle('visible', step > 0);
  st.querySelectorAll('.q-step').forEach(function (p) {
    p.classList.toggle('active', parseInt(p.getAttribute('data-step'), 10) === step);
  });
}

/* ===================================================================
   Applets (iframes). The arrow appears N seconds after the learner starts
   the applet: the applet posts {type:'APPLET_STARTED'} to its parent.
     data-arrow-after="15"        seconds (default 15)
     data-arrow-trigger="enter"   start counting on entry instead (an
                                  applet that cannot post the message)
   =================================================================== */
const appletRevealed = {};
const appletTimer = {};
function enterApplet(s, n) {
  if (appletRevealed[n]) { revealForwardNav(n); return; }
  hideForwardNav(n);
  if (s.getAttribute('data-arrow-trigger') === 'enter') startAppletTimer(s);
}
function startAppletTimer(s) {
  const n = screenNum(s);
  if (appletTimer[n] || appletRevealed[n]) return;
  const sec = parseFloat(s.getAttribute('data-arrow-after') || '15');
  appletTimer[n] = setTimeout(function () {
    appletRevealed[n] = true;
    window.lomdaState.DONE[n] = true;
    if (currentScreen === n) revealForwardNav(n);
  }, sec * 1000);
}
function onAppletStarted(source) {
  document.querySelectorAll('.screen[data-type="applet"] iframe').forEach(function (f) {
    if (f.contentWindow === source) startAppletTimer(screenOf(f));
  });
}

/* Reopen popup: a button on a later screen shows content from an earlier
   one again (an applet, a diagram, a reminder) without copying it:
     <button class="reopen-btn" data-reopen="soil-sim">…</button>
   clones the element marked [data-reopen-content] inside the screen whose
   data-sid is "soil-sim". */
let reopenHidFeedback = false;
function toggleReopen(btn) {
  const popup = document.getElementById('reopen-popup');
  const body = document.getElementById('reopen-popup-body');
  const fb = document.getElementById('feedback-popup');
  const wasOpen = popup.classList.contains('show') && btn.classList.contains('is-open');
  document.querySelectorAll('.reopen-btn.is-open').forEach(function (b) { b.classList.remove('is-open'); });
  popup.classList.remove('show');
  body.innerHTML = '';
  if (wasOpen) {
    returnOverlayFocus();
    if (reopenHidFeedback) { fb.classList.add('show'); reopenHidFeedback = false; }
    return;
  }
  const src = document.querySelector('.screen[data-sid="' + btn.getAttribute('data-reopen') + '"] [data-reopen-content]');
  if (!src) return;
  const copy = src.cloneNode(true);
  copy.removeAttribute('data-reopen-content');
  copy.querySelectorAll('[id]').forEach(function (el) { el.removeAttribute('id'); });
  body.appendChild(copy);
  reopenHidFeedback = fb.classList.contains('show');
  if (reopenHidFeedback) fb.classList.remove('show');
  popup.classList.add('show');
  btn.classList.add('is-open');
  openOverlayFocus(popup);
}

/* ---------------- Image zoom ---------------- */
function openZoom(btn) {
  const modal = document.getElementById('img-zoom-modal');
  const body = document.getElementById('img-zoom-body');
  body.innerHTML = '';
  const cloneSel = btn.getAttribute('data-zoom-clone');
  const srcBlock = cloneSel && screenOf(btn) && screenOf(btn).querySelector(cloneSel);
  if (srcBlock) {
    // A live HTML graph: show an enlarged copy (its text stays text).
    const copy = srcBlock.cloneNode(true);
    copy.classList.add('zoom-clone');
    copy.querySelectorAll('[id]').forEach(function (el) { el.removeAttribute('id'); });
    body.appendChild(copy);
  } else {
    const img = document.createElement('img');
    img.src = btn.getAttribute('data-zoom-src');
    img.alt = btn.getAttribute('data-zoom-alt') || '';
    body.appendChild(img);
  }
  modal.classList.add('show');
  openOverlayFocus(modal.querySelector('[data-zoom-close]'));
}
function closeZoom() {
  document.getElementById('img-zoom-modal').classList.remove('show');
  returnOverlayFocus();
}

/* ---------------- Glossary terms ----------------
   <button class="term" type="button" aria-describedby="tip-x">term</button>
   <span class="term-tip" role="tooltip" id="tip-x">definition</span>
   Hover or focus shows the tip (CSS); a tap toggles it on touch screens. */
function toggleTerm(term) {
  // With a mouse the tip shows on hover only (and on keyboard focus); a click must not pin it open.
  // A tap toggles it only on touch screens, which have no hover.
  if (window.matchMedia && window.matchMedia('(hover: hover)').matches) return;
  const open = !term.classList.contains('is-open');
  document.querySelectorAll('.term.is-open').forEach(function (t) { t.classList.remove('is-open'); });
  term.classList.toggle('is-open', open);
}

/* ---------------- Start ---------------- */
document.addEventListener('DOMContentLoaded', function () {
  buildStepper();
  document.querySelectorAll('.video-wrap').forEach(initVideo);
  document.querySelectorAll('.screen').forEach(function (s) { s.classList.remove('active'); });
  // index.html#7 opens screen 7 directly (handy while building).
  const fromHash = parseInt((location.hash || '').replace('#', ''), 10);
  const first = fromHash >= 1 && fromHash <= TOTAL_SCREENS ? fromHash : 1;
  const s = screenEl(first);
  if (s) s.classList.add('active');
  currentScreen = first;
  resetScreenState(first);
  notifyScreenChanged(first);
  announceReady();
  schedulePreload(first + 1);
});
