// =============================================================
//  3Dページ共通のしかけ
//   - CDNからのライブラリ読み込み（1つ落ちても別CDNへ切り替える）
//   - レンダラ／シーン／描画ループの土台
//   - おとボタン・🏠ボタン・ヒント・おいわい演出
//  各ゲームのHTMLから import して使う。ビルドは不要。
// =============================================================

const CDN = {
  three: [
    'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js',
    'https://unpkg.com/three@0.160.0/build/three.module.js',
  ],
  cannon: [
    'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js',
    'https://unpkg.com/cannon-es@0.20.0/dist/cannon-es.js',
    'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/+esm',
  ],
};

async function loadModule(urls) {
  let lastError;
  for (const url of urls) {
    try { return await import(url); } catch (e) { lastError = e; }
  }
  throw lastError;
}

// ---------------------------------------------------------------
// 共通スタイル（1回だけ差し込む）
// ---------------------------------------------------------------
const STYLE = `
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html, body {
    margin: 0; padding: 0; height: 100%; overflow: hidden; overscroll-behavior: none;
    user-select: none; -webkit-user-select: none; touch-action: none;
    font-family: "Hiragino Maru Gothic ProN", "ヒラギノ丸ゴ ProN W4", "Yu Gothic", system-ui, sans-serif;
  }
  canvas { display: block; touch-action: none; }

  .k3d-btn {
    position: fixed; top: max(10px, env(safe-area-inset-top)); z-index: 30;
    width: 52px; height: 52px; border-radius: 50%; border: 0; padding: 0; cursor: pointer;
    background: rgba(255,255,255,.88); color: #5a4a6a; font-size: 22px; line-height: 1;
    display: grid; place-items: center; overflow: hidden; box-shadow: 0 2px 0 rgba(0,0,0,.14);
    font-family: "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif;
  }
  .k3d-home { left: 10px; }
  .k3d-sound { left: 72px; }
  .k3d-btn i { position: absolute; inset: 0; background: #c9b6ff; transform: scaleY(0); transform-origin: bottom; }
  .k3d-btn span { position: relative; }
  .k3d-sound.waiting { animation: k3dWait 1.2s ease-in-out infinite; }
  @keyframes k3dWait { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.14); } }
  @media (prefers-reduced-motion: reduce) { .k3d-sound.waiting { animation: none; outline: 3px solid #fff; } }

  .k3d-hint {
    position: fixed; left: 50%; translate: -50% 0; bottom: max(14px, env(safe-area-inset-bottom)); z-index: 20;
    background: rgba(255,255,255,.82); color: #5a4a6a; font-size: 15px; font-weight: 700;
    padding: 8px 20px; border-radius: 99px; pointer-events: none; white-space: nowrap;
    transition: opacity .6s ease; max-width: calc(100vw - 28px); overflow: hidden; text-overflow: ellipsis;
  }

  .k3d-cheer {
    position: fixed; left: 50%; top: 26%; translate: -50% -50%; z-index: 25;
    pointer-events: none; white-space: nowrap; opacity: 0; scale: .6;
    font-size: clamp(2rem, 10vw, 4.4rem); font-weight: 800; letter-spacing: .06em;
    color: #fff; text-shadow: 0 4px 0 rgba(0,0,0,.18);
  }
  .k3d-cheer.on { animation: k3dCheer 1.2s cubic-bezier(.2,1.4,.4,1) forwards; }
  @keyframes k3dCheer {
    0% { opacity: 0; scale: .6; }
    25% { opacity: 1; scale: 1.12; }
    72% { opacity: 1; scale: 1; }
    100% { opacity: 0; scale: 1; translate: -50% -80%; }
  }

  .k3d-confetti {
    position: fixed; z-index: 24; pointer-events: none; width: 12px; height: 16px; border-radius: 3px;
  }

  .k3d-overlay {
    position: fixed; inset: 0; z-index: 50; display: grid; place-items: center;
    background: #14142a; color: #e8e9f5; text-align: center; padding: 24px;
    transition: opacity .4s ease; font-size: .9rem;
  }
  .k3d-overlay.hidden { opacity: 0; pointer-events: none; }
  .k3d-overlay .mark { font-size: 3rem; animation: k3dBounce 1s infinite ease-in-out; }
  @keyframes k3dBounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
  .k3d-overlay p { margin: 14px 0 0; color: #a4a7c9; line-height: 1.8; }
  .k3d-overlay code { background: #26264a; padding: 1px 6px; border-radius: 5px; }
`;

let styleInjected = false;
function injectStyle() {
  if (styleInjected) return;
  styleInjected = true;
  const el = document.createElement('style');
  el.textContent = STYLE;
  document.head.appendChild(el);
}

// ---------------------------------------------------------------
// 読み込み中のおおいと、ライブラリの取得
// ---------------------------------------------------------------
function makeOverlay(mark) {
  injectStyle();
  const el = document.createElement('div');
  el.className = 'k3d-overlay';
  el.innerHTML = `<div><div class="mark">${mark}</div><p id="k3dMsg">よみこみちゅう…</p></div>`;
  document.body.appendChild(el);
  return {
    hide() { el.classList.add('hidden'); setTimeout(() => el.remove(), 500); },
    fail() {
      el.querySelector('.mark').style.animation = 'none';
      el.querySelector('#k3dMsg').innerHTML =
        'ライブラリをよみこめませんでした。<br>ネットワーク（<code>cdn.jsdelivr.net</code> / <code>unpkg.com</code>）をたしかめてください。';
    },
  };
}

/** ライブラリを読み込む。physics:true で cannon-es も一緒に取る */
export async function boot({ physics = false, mark = '🎮' } = {}) {
  const overlay = makeOverlay(mark);
  try {
    const jobs = [loadModule(CDN.three)];
    if (physics) jobs.push(loadModule(CDN.cannon));
    const [THREE, CANNON] = await Promise.all(jobs);
    overlay.hide();
    return { THREE, CANNON };
  } catch (e) {
    overlay.fail();
    throw e;
  }
}

// ---------------------------------------------------------------
// レンダラ・シーン・カメラ・描画ループ
// ---------------------------------------------------------------
export function makeStage(THREE, opts = {}) {
  const {
    bg = '#101024', fog = null, fov = 55, near = 0.1, far = 400, shadows = true,
  } = opts;

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  if (shadows) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(bg);
  if (fog) scene.fog = new THREE.Fog(fog.color || bg, fog.near, fog.far);

  const camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, near, far);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const clock = new THREE.Clock();
  function run(step) {
    const loop = () => {
      requestAnimationFrame(loop);
      const dt = Math.min(clock.getDelta(), 0.1);
      if (step) step(dt, clock.elapsedTime);
      renderer.render(scene, camera);
    };
    loop();
  }

  return { renderer, scene, camera, run };
}

/** やわらかい標準ライト一式。戻り値の sun で影の範囲を調整できる */
export function addLights(THREE, scene, opts = {}) {
  const {
    sky = '#cfe4ff', ground = '#6b4a2f', hemi = 1.1, sun: power = 2.4,
    from = [6, 12, 8], at = [0, 1, 0], span = 10,
  } = opts;

  scene.add(new THREE.HemisphereLight(sky, ground, hemi));
  scene.add(new THREE.AmbientLight('#ffffff', 0.22));

  const sun = new THREE.DirectionalLight('#fff6e6', power);
  sun.position.set(from[0], from[1], from[2]);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 60;
  sun.shadow.camera.left = -span;
  sun.shadow.camera.right = span;
  sun.shadow.camera.top = span;
  sun.shadow.camera.bottom = -span;
  sun.shadow.bias = -0.0008;
  sun.target.position.set(at[0], at[1], at[2]);
  scene.add(sun, sun.target);
  return sun;
}

/** 画面の座標から3Dのものを拾うための道具 */
export function makePicker(THREE, camera, dom) {
  const ray = new THREE.Raycaster();
  const v = new THREE.Vector2();
  return function pick(clientX, clientY, objects, recursive = true) {
    const r = dom.getBoundingClientRect();
    v.x = ((clientX - r.left) / r.width) * 2 - 1;
    v.y = -((clientY - r.top) / r.height) * 2 + 1;
    ray.setFromCamera(v, camera);
    return ray.intersectObjects(objects, recursive);
  };
}

// ---------------------------------------------------------------
// 音（Web Audio で合成。音声ファイルは持たない）
// ---------------------------------------------------------------
/** どの順番で鳴らしても濁らないヨナ抜き（ペンタトニック）音階 */
export const SCALE = [262, 294, 330, 392, 440, 523, 587, 659, 784, 880, 1046];

export function makeSound() {
  let ctx = null;
  let onChange = () => {};

  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        ctx = new AC();
        ctx.addEventListener('statechange', () => onChange());
      }
    }
    // 自動再生の制限で止まっているときは、ここで解除をこころみる
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone({ freq = 440, type = 'sine', dur = 0.3, gain = 0.22, sweep = 0, delay = 0 }) {
    const a = ac();
    if (!a) return;
    const t = a.currentTime + delay;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (sweep) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * sweep), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  /** ざらっとした音（はじける・ぶつかる） */
  function noise({ dur = 0.16, gain = 0.2, cut = 1400, delay = 0 }) {
    const a = ac();
    if (!a) return;
    const t = a.currentTime + delay;
    const len = Math.max(1, Math.floor(a.sampleRate * dur));
    const buf = a.createBuffer(1, len, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = a.createBufferSource();
    src.buffer = buf;
    const f = a.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(cut, t);
    const g = a.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(a.destination);
    src.start(t);
  }

  /** 音階を順に鳴らす */
  function arp(freqs, { gap = 0.08, type = 'sine', dur = 0.35, gain = 0.2 } = {}) {
    freqs.forEach((f, i) => tone({ freq: f, type, dur, gain, delay: i * gap }));
  }

  function fanfare() {
    arp([523, 659, 784, 1046], { gap: 0.09, dur: 0.5, gain: 0.2 });
  }

  return {
    tone, noise, arp, fanfare,
    unlock: ac,
    ready: () => !!ctx && ctx.state === 'running',
    watch: (fn) => { onChange = fn; },
  };
}

// ---------------------------------------------------------------
// 画面に置くもの
// ---------------------------------------------------------------
/** 🏠 ながおしでもどるボタン（小さい子の誤操作よけ） */
export function addHomeButton(href = 'index.html') {
  injectStyle();
  const b = document.createElement('button');
  b.className = 'k3d-btn k3d-home';
  b.setAttribute('aria-label', 'ホームにもどる（ながおし）');
  b.innerHTML = '<i></i><span>🏠</span>';
  document.body.appendChild(b);

  const fill = b.querySelector('i');
  let timer = null;
  b.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    fill.style.transition = 'transform .9s linear';
    fill.style.transform = 'scaleY(1)';
    timer = setTimeout(() => { location.href = href; }, 900);
  });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) {
    b.addEventListener(ev, () => {
      clearTimeout(timer);
      fill.style.transition = 'transform .2s ease';
      fill.style.transform = 'scaleY(0)';
    });
  }
  return b;
}

/**
 * 🔇/🔊 おとボタン。
 * AudioContext はユーザー操作があるまで suspended なので、
 * 「押せば必ず音が出る」入口をひとつ置き、いまの状態も見せる。
 */
export function addSoundButton(sound) {
  injectStyle();
  const b = document.createElement('button');
  b.className = 'k3d-btn k3d-sound';
  b.innerHTML = '<span>🔇</span>';
  document.body.appendChild(b);
  const icon = b.querySelector('span');

  function refresh() {
    const ready = sound.ready();
    icon.textContent = ready ? '🔊' : '🔇';
    b.classList.toggle('waiting', !ready);
    b.setAttribute('aria-label', ready ? 'おとがでています' : 'タップしておとをだす');
  }

  b.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    sound.unlock();
    // suspended のまま予約しても、解除された瞬間に鳴る
    sound.arp([523, 784], { gap: 0.09, dur: 0.45, gain: 0.22 });
    refresh();
  });

  sound.watch(refresh);
  document.addEventListener('visibilitychange', refresh);
  refresh();
  return b;
}

/** 下に出るちいさな案内。しばらくすると薄くなる */
export function addHint(text, { fadeAfter = 9000 } = {}) {
  injectStyle();
  const el = document.createElement('div');
  el.className = 'k3d-hint';
  el.textContent = text;
  document.body.appendChild(el);
  let timer = setTimeout(() => { el.style.opacity = '0'; }, fadeAfter);
  return {
    set(t, keep = 5000) {
      el.textContent = t;
      el.style.opacity = '1';
      clearTimeout(timer);
      timer = setTimeout(() => { el.style.opacity = '0'; }, keep);
    },
    hide() { clearTimeout(timer); el.style.opacity = '0'; },
  };
}

/** まんなかに大きく出るおいわいの文字 */
export function addCheer() {
  injectStyle();
  const el = document.createElement('div');
  el.className = 'k3d-cheer';
  document.body.appendChild(el);
  return function cheer(text, color = '#fff') {
    el.textContent = text;
    el.style.color = color;
    el.classList.remove('on');
    void el.offsetWidth; // アニメーションを再生し直す
    el.classList.add('on');
  };
}

const CONFETTI_COLORS = ['#ff8fa3', '#ffd166', '#8ecae6', '#95d5b2', '#cdb4db', '#ffb4a2'];

/** 紙吹雪。count枚をばらまいて、終わったら自分で片づける */
export function confetti(count = 60) {
  injectStyle();
  const w = window.innerWidth;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'k3d-confetti';
    p.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    p.style.left = (Math.random() * w) + 'px';
    p.style.top = '-24px';
    document.body.appendChild(p);
    const fall = 400 + Math.random() * 500;
    const drift = (Math.random() - 0.5) * 260;
    const spin = (Math.random() - 0.5) * 900;
    const dur = 1700 + Math.random() * 1400;
    const anim = p.animate(
      [
        { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${drift}px, ${window.innerHeight + fall}px) rotate(${spin}deg)`, opacity: 0.9 },
      ],
      { duration: dur, easing: 'cubic-bezier(.3,.1,.6,1)', fill: 'forwards' }
    );
    anim.onfinish = () => p.remove();
  }
}

/** かんたんな乱数ヘルパー */
export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
