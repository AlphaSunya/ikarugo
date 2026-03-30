const { ipcRenderer } = require('electron');

const petC = document.getElementById('pet');
const ctx = petC.getContext('2d');
const fxC = document.getElementById('fx');
const fxCtx = fxC.getContext('2d');
const bubC = document.getElementById('bub');
const bctx = bubC.getContext('2d');

// window: 120x120px
// bub canvas: 120x30 real pixels
// pet canvas: 20x20 logical -> 80x80 display
// fx canvas: same as pet

let screenW = 1920;
let screenH = 1040;
ipcRenderer.send('get-screen-size');
ipcRenderer.on('screen-size', (_, s) => {
  screenW = s.width;
  screenH = s.height;
});

let winX = 0;
let winY = 0;
ipcRenderer.send('get-window-pos');
ipcRenderer.on('window-pos', (_, p) => {
  winX = p.x;
  winY = p.y;
});

function fx(cmd) {
  ipcRenderer.send('fx-cmd', cmd);
}

const FRAME_MS = 1000 / 60;
const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;

const SLEEP_DELAY_MS = 3 * MINUTE_MS;
const IDLE_MIN_MS = 14 * SECOND_MS;
const IDLE_MAX_MS = 28 * SECOND_MS;
const FISH_FIRST_DELAY_MS = 45 * SECOND_MS;
const FISH_IDLE_MIN_MS = 75 * SECOND_MS;
const FISH_IDLE_MAX_MS = 135 * SECOND_MS;
const WATER_REMINDER_MS = 60 * MINUTE_MS;
const COMBO_RESET_MS = 1500;
const HAPPY_STATE_MS = 1200;
const POKED_STATE_MS = 1200;
const EYE_TRACK_INTERVAL_MS = 3 * FRAME_MS;
const IDLE_WANDER_CHANCE = 0.14;
const IDLE_CHAT_CHANCE = 0.12;
const IDLE_SPECIAL_CHANCE = 0.18;
const FISH_SWIM_MS = 1800;
const FISH_STALK_MS = 700;
const FISH_LUNGE_TRAVEL_MS = 560;
const FISH_CATCH_HOLD_MS = 320;
const FISH_RETURN_MS = 900;
const IDLE_SPECIAL_POOL = ['rock', 'watergun', 'rock', 'ink'];

function framesToMs(frames) {
  return frames * FRAME_MS;
}

function msToFrames(ms) {
  return ms / FRAME_MS;
}

function randomIdleDelayMs() {
  return IDLE_MIN_MS + Math.random() * (IDLE_MAX_MS - IDLE_MIN_MS);
}

function randomFishDelayMs() {
  return FISH_IDLE_MIN_MS + Math.random() * (FISH_IDLE_MAX_MS - FISH_IDLE_MIN_MS);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function normalizeCoord(v) {
  return Object.is(v, -0) ? 0 : v;
}

function getDragMotion(f) {
  const stride = Math.sin(f / 4.7);
  const drift = Math.sin(f / 10.3 + Math.PI / 5) * 0.35;
  const swing = stride * 0.85 + drift;
  const armWave = Math.sin(f / 4.7 + Math.PI / 2) + Math.sin(f / 10.3 + Math.PI / 3) * 0.2;
  const footShift = swing > 0.45 ? 1 : (swing < -0.45 ? -1 : 0);
  const leftArmLift = armWave > 0.18 ? 1 : 0;
  return {
    footShift,
    footWidth: Math.abs(swing) > 0.62 ? 3 : 2,
    leftArmLift,
    rightArmLift: leftArmLift ? 0 : 1
  };
}

function clampWindowPos(x, y) {
  const safeX = Number.isFinite(x) ? x : winX;
  const safeY = Number.isFinite(y) ? y : winY;
  const safeScreenW = Number.isFinite(screenW) ? screenW : window.screen.width;
  const safeScreenH = Number.isFinite(screenH) ? screenH : window.screen.height;
  const nextX = normalizeCoord(Math.round(Math.max(-60, Math.min(safeScreenW - 60, safeX))));
  const nextY = normalizeCoord(Math.round(Math.max(-30, Math.min(safeScreenH - 100, safeY))));
  return {
    x: nextX,
    y: nextY
  };
}

function setWindowPos(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  const next = clampWindowPos(x, y);
  if (next.x === winX && next.y === winY) return;
  winX = next.x;
  winY = next.y;
  ipcRenderer.send('set-window-pos', next.x, next.y);
}

const RED = '#cc2233';
const RED2 = '#aa1122';
const RED3 = '#dd4455';
const RED4 = '#bb3344';
const HAT = '#d4b896';
const HAT2 = '#c4a886';
const HATRIM = '#b89878';
const POM = '#f0e0c8';
const EYE = '#ff3366';
const EYEHL = '#ffffff';
const EYEDARK = '#cc0033';
const BLK = '#111111';
const BLUSH = '#ff5577';
const WGUN = '#4488cc';
const WGUN2 = '#2266aa';

let bubText = '';
let bubUntil = 0;

function showBubble(text, durationMs = framesToMs(110)) {
  bubText = text;
  bubUntil = performance.now() + durationMs;
  drawBubble();
}

function hideBubble() {
  bubText = '';
  bubUntil = 0;
  bctx.clearRect(0, 0, 120, 30);
}

function drawBubble() {
  bctx.clearRect(0, 0, 120, 30);
  if (!bubText) return;
  bctx.font = 'bold 11px monospace';
  const tw = bctx.measureText(bubText).width;
  const pad = 8;
  const bw = Math.min(116, tw + pad * 2);
  const bx = Math.round((120 - bw) / 2);
  const by = 4;
  const bh = 20;

  bctx.fillStyle = '#1a0a10';
  bctx.fillRect(bx, by, bw, bh);

  bctx.strokeStyle = '#cc3355';
  bctx.lineWidth = 1.5;
  bctx.strokeRect(bx + 0.75, by + 0.75, bw - 1.5, bh - 1.5);

  bctx.fillStyle = '#cc3355';
  bctx.beginPath();
  bctx.moveTo(58, by + bh);
  bctx.lineTo(62, by + bh);
  bctx.lineTo(60, by + bh + 5);
  bctx.fill();

  bctx.fillStyle = '#ffaacc';
  bctx.textBaseline = 'middle';
  bctx.fillText(bubText, bx + pad, by + bh / 2);
}

function p(x, y, c) {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, 1, 1);
}

function r(x, y, w, h, c) {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
}

function breatheVal(f) {
  return Math.sin((f / 60) * Math.PI) * 0.5 + 0.5;
}

function blinkVal(f) {
  const period = 300;
  const phase = f % period;
  const doBlink2 = Math.floor(f / period) % 3 === 0;
  if (phase < 6) return phase / 6;
  if (phase < 12) return 1 - (phase - 6) / 6;
  if (doBlink2) {
    if (phase >= 22 && phase < 28) return (phase - 22) / 6;
    if (phase >= 28 && phase < 34) return 1 - (phase - 28) / 6;
  }
  return 0;
}

function drawFeet(mode, f) {
  if (mode === 'drag') {
    const drag = getDragMotion(f);
    const leftTipX = 3 + drag.footShift;
    const rightTipX = 17 - leftTipX;
    r(4, 16, 2, 1, RED2);
    r(14, 16, 2, 1, RED2);
    r(leftTipX, 17, drag.footWidth, 1, RED2);
    r(rightTipX, 17, drag.footWidth, 1, RED2);
  } else if (mode === 'hang') {
    const s = Math.round(Math.sin(f / 25) * 1);
    r(4, 16, 3, 1, RED2);
    r(13, 16, 3, 1, RED2);
    r(4 + s, 17, 2, 1, RED2);
    r(14 - s, 17, 2, 1, RED2);
  } else {
    r(4, 16, 3, 1, RED2);
    r(13, 16, 3, 1, RED2);
    r(3, 17, 3, 1, RED2);
    r(14, 17, 3, 1, RED2);
  }
  r(6, 18, 8, 1, '#220010');
}

function drawPom() {
  p(9, 0, POM);
  p(8, 1, POM);
  p(10, 1, POM);
  p(9, 2, POM);
}

let eyeX = 0.5;
let eyeY = 0.5;

function drawEyes(f, ex, ey, face) {
  eyeX += (ex - eyeX) * 0.05;
  eyeY += (ey - eyeY) * 0.05;
  const lx = 4;
  const rx = 12;
  const ey0 = 7;

  if (face === 'grabbed') {
    p(lx + 1, ey0, BLK);
    p(lx + 2, ey0 + 1, BLK);
    p(lx + 1, ey0 + 2, BLK);
    p(rx + 1, ey0, BLK);
    p(rx, ey0 + 1, BLK);
    p(rx + 1, ey0 + 2, BLK);
    r(7, 12, 6, 1, RED2);
    return;
  }

  if (face === 'sleeping') {
    r(lx, ey0 + 3, 4, 1, RED2);
    r(rx, ey0 + 3, 4, 1, RED2);
    p(17, 4, '#ffaacc');
    p(18, 2, '#ffaacc');
    return;
  }

  if (face === 'poked') {
    p(lx, ey0, BLK);
    p(lx + 2, ey0, BLK);
    p(lx + 1, ey0 + 1, BLK);
    p(lx, ey0 + 2, BLK);
    p(lx + 2, ey0 + 2, BLK);
    p(rx, ey0, BLK);
    p(rx + 2, ey0, BLK);
    p(rx + 1, ey0 + 1, BLK);
    p(rx, ey0 + 2, BLK);
    p(rx + 2, ey0 + 2, BLK);
    r(7, 13, 6, 1, RED2);
    return;
  }

  if (face === 'ink') {
    r(lx, ey0, 4, 4, EYE);
    r(rx, ey0, 4, 4, EYE);
    r(lx + 1, ey0 + 1, 2, 2, BLK);
    r(rx + 1, ey0 + 1, 2, 2, BLK);
    p(lx + 1, ey0 + 1, EYEHL);
    p(rx + 1, ey0 + 1, EYEHL);
    return;
  }

  if (face === 'watergun') {
    r(lx, ey0 + 1, 4, 1, BLK);
    r(rx, ey0 + 1, 4, 1, BLK);
    r(7, 12, 6, 1, RED2);
    p(7, 11, RED2);
    p(12, 11, RED2);
    return;
  }

  if (face === 'rock') {
    r(lx, ey0 + 1, 4, 2, EYE);
    r(rx, ey0 + 1, 4, 2, EYE);
    r(lx + 1, ey0 + 1, 2, 2, BLK);
    r(rx + 1, ey0 + 1, 2, 2, BLK);
    p(lx + 1, ey0 + 1, EYEHL);
    p(rx + 1, ey0 + 1, EYEHL);
    return;
  }

  if (face === 'happy') {
    p(lx + 1, ey0, BLK);
    p(lx, ey0 + 1, BLK);
    p(lx + 2, ey0 + 1, BLK);
    p(rx + 1, ey0, BLK);
    p(rx, ey0 + 1, BLK);
    p(rx + 2, ey0 + 1, BLK);
    r(7, 12, 6, 1, RED2);
    p(7, 11, RED2);
    p(12, 11, RED2);
    return;
  }

  r(lx, ey0, 4, 4, EYE);
  r(rx, ey0, 4, 4, EYE);
  r(lx, ey0, 4, 1, EYEDARK);
  r(lx, ey0 + 3, 4, 1, EYEDARK);
  r(lx, ey0, 1, 4, EYEDARK);
  r(lx + 3, ey0, 1, 4, EYEDARK);
  r(rx, ey0, 4, 1, EYEDARK);
  r(rx, ey0 + 3, 4, 1, EYEDARK);
  r(rx, ey0, 1, 4, EYEDARK);
  r(rx + 3, ey0, 1, 4, EYEDARK);

  const clamp = v => Math.max(-1, Math.min(1, v));
  const pox = clamp(Math.round((eyeX - 0.5) * 1.5));
  const poy = clamp(Math.round((eyeY - 0.5) * 1.5));
  r(lx + 1 + pox, ey0 + 1 + poy, 2, 2, BLK);
  r(rx + 1 + pox, ey0 + 1 + poy, 2, 2, BLK);
  p(lx + 1, ey0 + 1, EYEHL);
  p(rx + 1, ey0 + 1, EYEHL);

  const bv = blinkVal(f);
  if (bv > 0) {
    const cov = Math.min(4, Math.round(bv * 5));
    if (cov >= 1) {
      r(lx, ey0, 4, cov, RED);
      r(rx, ey0, 4, cov, RED);
      r(lx, ey0 + cov - 1, 4, 1, RED4);
      r(rx, ey0 + cov - 1, 4, 1, RED4);
    }
  }
}

function drawPet(f, ex, ey, currentState, currentHangMode, dragging, subT) {
  ctx.clearRect(0, 0, 20, 20);
  fxCtx.clearRect(0, 0, 20, 20);

  let face = dragging ? 'grabbed' : currentState;
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const doRot = currentHangMode === 'left' || currentHangMode === 'right';
  if (doRot) {
    ctx.translate(10, 10);
    ctx.rotate(currentHangMode === 'left' ? Math.PI / 2 : -Math.PI / 2);
    ctx.translate(-10, -10);
  }

  const chestUp = dragging || currentState === 'hanging' ? 0 : (breatheVal(f) > 0.65 ? 1 : 0);
  drawFeet(dragging ? 'drag' : (currentState === 'hanging' ? 'hang' : 'normal'), f);

  const bt = 6 - chestUp;
  r(3, bt, 14, 10 + chestUp, RED);
  r(5, bt, 10, 10 + chestUp, RED);
  r(3, 10, 14, 5, RED);
  r(5, bt, 5, 3, RED3);
  r(4, 14, 12, 2, RED2);
  r(3, 13, 14, 2, RED2);
  p(4, 11, BLUSH);
  p(5, 11, BLUSH);
  p(14, 11, BLUSH);
  p(15, 11, BLUSH);
  r(4, 2, 12, 3, HAT);
  r(3, 4, 14, 2, HAT2);
  r(2, 5, 16, 2, HATRIM);
  r(3, 3, 14, 1, '#dcc898');
  drawPom();

  if (dragging) {
    const drag = getDragMotion(f);
    r(0, 9 + drag.leftArmLift, 3, 2, RED);
    r(17, 9 + drag.rightArmLift, 3, 2, RED);
    if (f % 18 < 11) {
      p(17, 5, '#aaddff');
      p(17, 6, '#aaddff');
      p(16, 6, '#aaddff');
    }
    r(7, 12, 6, 1, RED2);
  } else if (currentState === 'fishing') {
    face = 'happy';
    r(0, 8, 3, 2, RED);
    r(17, 8, 3, 2, RED);
    p(0, 7, RED);
    p(19, 7, RED);
    r(7, 12, 6, 1, RED2);
    p(7, 11, RED2);
    p(12, 11, RED2);
  } else if (currentState === 'watergun') {
    r(0, 12, 3, 2, RED);
    r(15, 8, 3, 2, RED);
    r(17, 7, 3, 2, WGUN);
    r(17, 9, 1, 1, WGUN2);
    r(19, 8, 1, 1, WGUN2);
    r(7, 12, 6, 1, RED2);
    p(7, 11, RED2);
    p(12, 11, RED2);
  } else if (currentState === 'ink') {
    face = 'ink';
    if (subT < 40) {
      const pf = Math.round(Math.sin((subT / 40) * Math.PI));
      r(3, 9 - pf, 14, 7 + pf * 2, RED);
    }
    r(0, 9, 3, 2, RED);
    r(17, 9, 3, 2, RED);
    r(7, 12, 6, 1, RED2);
  } else if (currentState === 'rock') {
    face = 'rock';
    r(0, 8, 3, 2, RED);
    r(17, 8, 3, 2, RED);
    r(7, 12, 6, 1, RED2);
  } else if (currentState === 'hanging') {
    r(0, 12, 3, 2, RED);
    r(17, 12, 3, 2, RED);
    r(7, 12, 6, 1, RED2);
  } else if (currentState === 'happy') {
    r(0, 9, 3, 2, RED);
    r(17, 9, 3, 2, RED);
    p(0, 8, RED);
    p(19, 8, RED);
    r(7, 12, 6, 1, RED2);
    p(7, 11, RED2);
    p(12, 11, RED2);
  } else {
    r(0, 12, 3, 2, RED);
    r(17, 12, 3, 2, RED);
    if (currentState !== 'poked') r(7, 12, 6, 1, RED2);
  }

  drawEyes(f, ex, ey, face);

  if (doRot) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (currentHangMode === 'left') {
      r(0, 4, 2, 2, RED2);
      r(0, 13, 2, 2, RED2);
    } else {
      r(18, 4, 2, 2, RED2);
      r(18, 13, 2, 2, RED2);
    }
  }
}

const initialNow = performance.now();

let state = 'idle';
let animClock = 0;
let stateSince = initialNow;
let stateUntil = 0;
let lastTickAt = initialNow;
let lastInteractionAt = initialNow;
let lastEyeUpdateAt = initialNow;
let lastClickAt = 0;
let clickCount = 0;
let isDragging = false;
let lastMX = 0;
let lastMY = 0;
let hangMode = 'none';
let idleCountdownMs = randomIdleDelayMs();
let nextFishAt = initialNow + FISH_FIRST_DELAY_MS;
let waterReminderAt = initialNow + WATER_REMINDER_MS;
let teleported = false;
let inkBurstShown = false;
let inkPopShown = false;
let rockBubbleShown = false;
let nextWaterDropAt = 0;
let hangJustSet = 0;
let fishAction = null;

const msgs = ['...', '(._.)', 'Killua?', '(^_^)', 'Hi!', 'Hm?', 'Nom'];
const grabMsgs = ['Eeek!', '(>_<)', 'Hey!!', 'Noooo', '(o_o)'];

function setState(nextState, options = {}) {
  const now = options.now ?? performance.now();
  const durationMs = options.durationMs ?? 0;
  const prevState = state;

  if (prevState === 'ink' && nextState !== 'ink') {
    petC.style.opacity = '1';
  }
  if (prevState === 'rock' && nextState !== 'rock') {
    fx({ type: 'clearRocks' });
  }
  if (prevState === 'fishing' && nextState !== 'fishing') {
    fx({ type: 'clearFish' });
    if (fishAction) {
      setWindowPos(fishAction.baseX, fishAction.baseY);
    }
    fishAction = null;
  }

  state = nextState;
  stateSince = now;
  stateUntil = durationMs > 0 ? now + durationMs : 0;
  teleported = false;
  inkBurstShown = false;
  inkPopShown = false;
  rockBubbleShown = false;
  nextWaterDropAt = nextState === 'watergun' ? now + framesToMs(20) : 0;
}

function setTimedState(nextState, durationMs, now = performance.now()) {
  setState(nextState, { now, durationMs });
}

function updateFishFx(x, y, dir) {
  if (!fishAction) return;
  const nextX = normalizeCoord(Math.round(x));
  const nextY = normalizeCoord(Math.round(y));
  if (fishAction.renderedFishX === nextX && fishAction.renderedFishY === nextY) return;
  fishAction.renderedFishX = nextX;
  fishAction.renderedFishY = nextY;
  fx({ type: 'fish', x: nextX, y: nextY, dir, active: true });
}

function noteInteraction(now = performance.now()) {
  lastInteractionAt = now;
  idleCountdownMs = randomIdleDelayMs();
  nextFishAt = now + randomFishDelayMs();
  if (state === 'sleeping') {
    setState('idle', { now });
  }
}

function triggerWaterReminder(now) {
  waterReminderAt = now + WATER_REMINDER_MS;
  showBubble('Drink water!', 2500);
  if (hangMode === 'none' && (state === 'idle' || state === 'sleeping')) {
    setTimedState('happy', HAPPY_STATE_MS, now);
  }
}

function triggerNextIdle(now) {
  const pick = IDLE_SPECIAL_POOL[Math.floor(Math.random() * IDLE_SPECIAL_POOL.length)];
  if (pick === 'watergun') {
    setState('watergun', { now });
    showBubble('Pew pew!', framesToMs(180));
  } else if (pick === 'ink') {
    setState('ink', { now });
    showBubble('...', framesToMs(55));
  } else {
    setState('rock', { now });
    showBubble('Hmm...', framesToMs(140));
  }
}

function startFishing(now) {
  nextFishAt = now + randomFishDelayMs();
  const fishFromLeft = Math.random() < 0.5;
  const fishDir = fishFromLeft ? 1 : -1;
  const petCenterX = winX + 60;
  const fishStartX = fishFromLeft ? 18 : screenW - 18;
  const fishY = Math.round(Math.max(56, Math.min(screenH - 72, winY + 42 + (Math.random() * 16 - 8))));
  const nearFishX = Math.round(Math.max(42, Math.min(screenW - 42, petCenterX + (fishFromLeft ? -82 : 82))));
  const catchFishX = Math.round(Math.max(42, Math.min(screenW - 42, nearFishX + (fishFromLeft ? 18 : -18))));
  const targetCenterX = catchFishX + (fishFromLeft ? 16 : -16);
  const target = clampWindowPos(targetCenterX - 60, fishY - 66);

  fishAction = {
    baseX: winX,
    baseY: winY,
    targetX: target.x,
    targetY: target.y,
    fishStartX,
    nearFishX,
    catchFishX,
    fishY,
    fishDir,
    renderedFishX: null,
    renderedFishY: null,
    caught: false
  };

  updateFishFx(fishStartX, fishY, fishDir);
  setState('fishing', { now });
  showBubble('Fish!', FISH_SWIM_MS + FISH_STALK_MS);
}

function handleWatergun(now) {
  const stateAgeMs = now - stateSince;
  if (stateAgeMs >= framesToMs(240)) {
    setState('idle', { now });
    showBubble('Hehe~', framesToMs(80));
    return;
  }

  const dropEndAt = stateSince + framesToMs(220);
  if (stateAgeMs > framesToMs(20) && stateAgeMs < framesToMs(220)) {
    while (now >= nextWaterDropAt && nextWaterDropAt < dropEndAt) {
      fx({ type: 'drops', x: winX + 88, y: winY + 62 });
      nextWaterDropAt += framesToMs(8);
    }
  }
}

function handleInk(now) {
  const subT = msToFrames(now - stateSince);

  if (!inkBurstShown && subT >= 60) {
    inkBurstShown = true;
    fx({ type: 'ink', x: winX + 60, y: winY + 70 });
    showBubble('Poof!', framesToMs(75));
  }

  const hide = subT > 60 && subT < 120;
  petC.style.opacity = hide ? '0' : '1';

  if (!teleported && subT >= 90) {
    teleported = true;
    const minD = 300;
    let nx;
    let tries = 0;
    do {
      nx = 30 + Math.random() * (screenW - 150);
      tries += 1;
    } while (Math.abs(nx - winX) < minD && tries < 40);

    const dy = (screenH - 160) - winY;
    const dx = nx - winX;
    ipcRenderer.send('move-window-by', dx, dy);
    setTimeout(() => ipcRenderer.send('get-window-pos'), 100);
  }

  if (!inkPopShown && subT >= 120) {
    inkPopShown = true;
    fx({ type: 'popInk', x: winX + 60, y: winY + 70 });
  }

  if (now - stateSince >= framesToMs(160)) {
    petC.style.opacity = '1';
    setState('idle', { now });
    showBubble('(^_^)', framesToMs(100));
  }
}

function handleRock(now) {
  const subT = msToFrames(now - stateSince);
  fx({ type: 'rocks', petX: winX + 20, petY: winY + 30, subT });

  if (!rockBubbleShown && subT >= 180) {
    rockBubbleShown = true;
    showBubble('(^.^)', framesToMs(120));
  }

  if (now - stateSince >= framesToMs(240)) {
    setState('idle', { now });
  }
}

function handleFishing(now) {
  if (!fishAction) {
    setState('idle', { now });
    return;
  }

  const age = now - stateSince;
  const swimEnd = FISH_SWIM_MS;
  const stalkEnd = swimEnd + FISH_STALK_MS;
  const lungeEnd = stalkEnd + FISH_LUNGE_TRAVEL_MS;
  const catchEnd = lungeEnd + FISH_CATCH_HOLD_MS;
  const returnEnd = catchEnd + FISH_RETURN_MS;

  if (age < swimEnd) {
    const t = easeInOutQuad(age / FISH_SWIM_MS);
    const fishX = lerp(fishAction.fishStartX, fishAction.nearFishX, t);
    updateFishFx(fishX, fishAction.fishY, fishAction.fishDir);
    setWindowPos(fishAction.baseX, fishAction.baseY);
  } else if (age < stalkEnd) {
    updateFishFx(fishAction.nearFishX, fishAction.fishY, fishAction.fishDir);
    setWindowPos(fishAction.baseX, fishAction.baseY);
  } else if (age < lungeEnd) {
    const t = easeOutCubic((age - stalkEnd) / FISH_LUNGE_TRAVEL_MS);
    const fishX = lerp(fishAction.nearFishX, fishAction.catchFishX, t);
    updateFishFx(fishX, fishAction.fishY, fishAction.fishDir);
    setWindowPos(
      lerp(fishAction.baseX, fishAction.targetX, t),
      lerp(fishAction.baseY, fishAction.targetY, t)
    );
  } else if (age < catchEnd) {
    updateFishFx(fishAction.catchFishX, fishAction.fishY, fishAction.fishDir);
    setWindowPos(fishAction.targetX, fishAction.targetY);
  } else if (age < returnEnd) {
    if (!fishAction.caught) {
      fishAction.caught = true;
      fx({ type: 'clearFish' });
      showBubble('Nom!', framesToMs(90));
    }

    const t = easeInOutQuad((age - catchEnd) / FISH_RETURN_MS);
    setWindowPos(
      lerp(fishAction.targetX, fishAction.baseX, t),
      lerp(fishAction.targetY, fishAction.baseY, t)
    );
  } else {
    setWindowPos(fishAction.baseX, fishAction.baseY);
    setState('idle', { now });
  }
}

petC.addEventListener('mousedown', e => {
  const now = performance.now();

  if (hangMode !== 'none') {
    hangMode = 'none';
    setState('idle', { now });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, 20, 20);
  }

  if (['sleeping', 'watergun', 'ink', 'rock', 'fishing'].includes(state)) {
    setState('idle', { now });
  }

  noteInteraction(now);
  isDragging = true;
  petC.style.cursor = 'grabbing';
  lastMX = e.screenX;
  lastMY = e.screenY;
  ipcRenderer.send('drag-lock', true);
  showBubble(grabMsgs[Math.floor(Math.random() * grabMsgs.length)], framesToMs(999));
  e.preventDefault();
});

window.addEventListener('mousemove', e => {
  if (!isDragging) return;
  const dx = e.screenX - lastMX;
  const dy = e.screenY - lastMY;
  lastMX = e.screenX;
  lastMY = e.screenY;
  if (dx || dy) ipcRenderer.send('move-window-by', dx, dy);
});

window.addEventListener('mouseup', () => {
  if (!isDragging) return;
  isDragging = false;
  petC.style.cursor = 'grab';
  hideBubble();
  ipcRenderer.send('drag-lock', false);
  ipcRenderer.send('drag-end');
});

ipcRenderer.on('drag-end-result', (_, result) => {
  const now = performance.now();
  if (result === 'left' || result === 'right') {
    hangMode = result;
    setState('hanging', { now });
    showBubble('Peek!', framesToMs(130));
    hangJustSet = now;
  } else {
    hangMode = 'none';
    setState('idle', { now });
  }
  setTimeout(() => ipcRenderer.send('get-window-pos'), 80);
});

petC.addEventListener('click', e => {
  if (isDragging) return;

  const now = performance.now();

  if (hangMode !== 'none') {
    if (now - hangJustSet < 700) return;
    noteInteraction(now);
    hangMode = 'none';
    setState('idle', { now });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, 20, 20);
    ipcRenderer.send('jump-off-wall');
    setTimeout(() => {
      const jumpNow = performance.now();
      setTimedState('happy', HAPPY_STATE_MS, jumpNow);
      showBubble('(^_^)', framesToMs(90));
    }, 200);
    return;
  }

  noteInteraction(now);
  if (now - lastClickAt > COMBO_RESET_MS) clickCount = 0;
  clickCount += 1;
  lastClickAt = now;

  if (clickCount >= 5) {
    clickCount = 0;
    setTimedState('poked', POKED_STATE_MS, now);
    showBubble('(-_-)', framesToMs(110));
  } else {
    setTimedState('happy', HAPPY_STATE_MS, now);
    showBubble(msgs[Math.floor(Math.random() * msgs.length)], framesToMs(90));
  }

  e.preventDefault();
});

petC.addEventListener('contextmenu', e => {
  e.preventDefault();
  if (state === 'quitting') return;

  const now = performance.now();
  noteInteraction(now);
  setState('quitting', { now });
  showBubble('Bye~', framesToMs(999));
  fx({ type: 'ink', x: winX + 60, y: winY + 70 });

  setTimeout(() => {
    petC.style.opacity = '0';
    fx({ type: 'ink', x: winX + 60, y: winY + 70 });
  }, 300);

  setTimeout(() => {
    ipcRenderer.send('quit-app');
  }, 800);
});

let eyeTX = 0.5;
let eyeTY = 0.5;

function updateEyes() {
  ipcRenderer.send('get-cursor');
}

ipcRenderer.on('cursor-pos', (_, c) => {
  const pcx = winX + 60;
  const pcy = winY + 70;
  const ang = Math.atan2(c.y - pcy, c.x - pcx);
  eyeTX = (Math.cos(ang) + 1) / 2;
  eyeTY = (Math.sin(ang) + 1) / 2;
});

function tick(now) {
  requestAnimationFrame(tick);

  const deltaMs = Math.max(0, now - lastTickAt);
  lastTickAt = now;
  animClock += deltaMs;

  if (now - lastEyeUpdateAt >= EYE_TRACK_INTERVAL_MS) {
    updateEyes();
    lastEyeUpdateAt = now;
  }

  if (bubText && !isDragging && now >= bubUntil) {
    hideBubble();
  }

  if (clickCount > 0 && now - lastClickAt >= COMBO_RESET_MS) {
    clickCount = 0;
  }

  if (
    stateUntil > 0 &&
    now >= stateUntil &&
    !['hanging', 'watergun', 'ink', 'rock', 'quitting'].includes(state)
  ) {
    setState('idle', { now });
  }

  if (state !== 'quitting' && !isDragging && now >= waterReminderAt) {
    triggerWaterReminder(now);
  }

  if (
    state !== 'quitting' &&
    !isDragging &&
    hangMode === 'none' &&
    now >= nextFishAt &&
    ['idle', 'sleeping'].includes(state)
  ) {
    startFishing(now);
  }

  if (state === 'idle' && !isDragging && now - lastInteractionAt >= SLEEP_DELAY_MS) {
    setState('sleeping', { now });
  }

  if (state === 'watergun') {
    handleWatergun(now);
  } else if (state === 'ink') {
    handleInk(now);
  } else if (state === 'rock') {
    handleRock(now);
  } else if (state === 'fishing') {
    handleFishing(now);
  }

  if (!isDragging && hangMode === 'none' && state === 'idle') {
    idleCountdownMs -= deltaMs;
    if (idleCountdownMs <= 0) {
      idleCountdownMs = randomIdleDelayMs();
      const rr = Math.random();
      const wanderCutoff = IDLE_WANDER_CHANCE;
      const chatCutoff = wanderCutoff + IDLE_CHAT_CHANCE;
      const specialCutoff = chatCutoff + IDLE_SPECIAL_CHANCE;
      if (rr < wanderCutoff) {
        const n = Math.random() < 0.5 ? -1 : 1;
        ipcRenderer.send('move-window-by', n * (50 + Math.random() * 90), 0);
        setTimeout(() => ipcRenderer.send('get-window-pos'), 100);
      } else if (rr < chatCutoff) {
        setTimedState('happy', HAPPY_STATE_MS, now);
        showBubble(msgs[Math.floor(Math.random() * msgs.length)], framesToMs(85));
      } else if (rr < specialCutoff) {
        triggerNextIdle(now);
      }
    }
  }

  const animFrame = msToFrames(animClock);
  const subT = msToFrames(now - stateSince);
  drawPet(animFrame, eyeTX, eyeTY, state, hangMode, isDragging, subT);
}

requestAnimationFrame(tick);
