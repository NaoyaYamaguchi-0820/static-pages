// =============================================================
//  three.js フリーアセット図鑑 のデモ部分
//   - 画面に入ったセクションから順に初期化する（最初に全部落とさない）
//   - アセットは three.js リポジトリの examples/ を CDN 経由で読む
//   - 1つのCDNが落ちても、もう一方に切り替える
//  assets.html 側で importmap を差し込んでから読み込まれる。
// =============================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

// npm版 three（build と examples/jsm、examples/fonts が入っている）
const NPM = window.__THREE_BASE__;

// モデルとテクスチャは npm 版に含まれないので、GitHub をそのまま配信するCDNから読む
const REPOS = [
  'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/',
  'https://raw.githubusercontent.com/mrdoob/three.js/r160/examples/',
];
const ex = (path) => REPOS.map((base) => base + path);

// -------------------------------------------------------------
// 小道具
// -------------------------------------------------------------
const $ = (sel) => document.querySelector(sel);

// URL候補を順に試す。ぜんぶ失敗したら最後のエラーを投げる
async function loadAny(loader, urls, onProgress) {
  let lastError;
  for (const url of urls) {
    try {
      return await loader.loadAsync(url, onProgress);
    } catch (e) { lastError = e; }
  }
  throw lastError;
}

function setProgress(stageEl, ratio) {
  const overlay = stageEl.querySelector('.overlay');
  overlay.classList.remove('hidden');
  const bar = overlay.querySelector('.bar i');
  if (bar) bar.style.width = Math.round(Math.max(0.03, ratio) * 100) + '%';
}

function hideOverlay(stageEl) {
  stageEl.querySelector('.overlay').classList.add('hidden');
}

function showError(stageEl, text) {
  const overlay = stageEl.querySelector('.overlay');
  overlay.classList.remove('hidden');
  overlay.innerHTML = '<b>読み込めませんでした</b><span>' + text + '</span>';
}

// 読み込みで実際に流れたバイト数（配信元が Timing-Allow-Origin を返す場合に取れる）
function transferredSince(t0) {
  if (!performance.getEntriesByType) return 0;
  return performance.getEntriesByType('resource')
    .filter((r) => r.startTime >= t0 && REPOS.some((base) => r.name.startsWith(base)))
    .reduce((sum, r) => sum + (r.encodedBodySize || r.transferSize || 0), 0);
}
const formatSize = (bytes) => (bytes > 0 ? (bytes / 1048576).toFixed(1) + ' MB' : null);

// 進捗コールバック（合計サイズが分からないときは動かさない）
const progressOf = (stageEl) => (e) => {
  if (e && e.lengthComputable && e.total > 0) setProgress(stageEl, e.loaded / e.total);
};

// -------------------------------------------------------------
// 描画の土台。画面に入っているステージだけ描く
// -------------------------------------------------------------
const stages = [];

function makeStage(stageEl) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearAlpha(0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  stageEl.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1.6, 0.05, 500);
  camera.position.set(0, 1, 5);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;

  const resize = () => {
    const w = stageEl.clientWidth, h = stageEl.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(stageEl);
  resize();

  const stage = { el: stageEl, renderer, scene, camera, controls, clock: new THREE.Clock(), visible: true, tick: null };
  stages.push(stage);
  return stage;
}

function loop() {
  requestAnimationFrame(loop);
  for (const s of stages) {
    const dt = s.clock.getDelta();
    if (!s.visible) continue;
    if (s.tick) s.tick(dt);
    s.controls.update();
    s.renderer.render(s.scene, s.camera);
  }
}
requestAnimationFrame(loop);

// 室内スタジオ相当の環境光。HDRIを落とさなくても金属がきれいに出る
function roomEnvironment(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const texture = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  pmrem.dispose();
  return texture;
}

// 対象がちょうど収まる位置にカメラを置く
function frameObject(object, stage, dir = new THREE.Vector3(0.7, 0.4, 1)) {
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return;
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const fov = THREE.MathUtils.degToRad(stage.camera.fov);
  const dist = (maxDim / 2 / Math.tan(fov / 2)) * 1.7;

  stage.camera.near = Math.max(dist / 200, 0.01);
  stage.camera.far = dist * 100;
  stage.camera.updateProjectionMatrix();
  stage.camera.position.copy(center).addScaledVector(dir.clone().normalize(), dist);
  stage.controls.target.copy(center);
  stage.controls.minDistance = dist * 0.25;
  stage.controls.maxDistance = dist * 4;
  stage.controls.update();
}

function disposeTree(object) {
  object.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    const mats = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
    for (const m of mats) {
      for (const key of Object.keys(m)) {
        const v = m[key];
        if (v && v.isTexture) v.dispose();
      }
      m.dispose();
    }
  });
}

// ボタン列を作る
function makeChips(container, items, onPick) {
  container.textContent = '';
  const buttons = items.map((item, i) => {
    const b = document.createElement('button');
    b.textContent = item.label;
    b.setAttribute('aria-pressed', String(i === 0));
    b.addEventListener('click', () => {
      for (const other of buttons) other.setAttribute('aria-pressed', 'false');
      b.setAttribute('aria-pressed', 'true');
      onPick(item);
    });
    container.appendChild(b);
    return b;
  });
  return buttons;
}

// セクションが画面に入ったら1回だけ初期化。以後は表示中だけ描画する
function whenVisible(stageEl, init) {
  let started = false;
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting && !started) {
        started = true;
        try { init(); } catch (e) {
          console.error(e);
          showError(stageEl, 'このブラウザではデモを表示できませんでした。');
        }
      }
      const stage = stages.find((s) => s.el === stageEl);
      if (stage) stage.visible = entry.isIntersecting;
    }
  }, { rootMargin: '120px' });
  io.observe(stageEl);
}

// =============================================================
// ① 3Dモデル
// =============================================================
const MODELS = [
  {
    label: '🦩 フラミンゴ', file: 'models/gltf/Flamingo.glb',
    desc: 'モーフターゲットで羽ばたく軽量モデル。形が1つでも、頂点の変形だけでアニメーションできる例。',
    from: 'mirada / rome（three.js examples 収録）',
  },
  {
    label: '🦜 オウム', file: 'models/gltf/Parrot.glb',
    desc: 'フラミンゴと同じシリーズ。ローポリ＋頂点カラーで、テクスチャ画像なしでも色がつく。',
    from: 'mirada / rome（three.js examples 収録）',
  },
  {
    label: '🤖 ロボット', file: 'models/gltf/RobotExpressive/RobotExpressive.glb',
    desc: 'ボーン入り＋「歩く・踊る・驚く」など十数本のクリップを内蔵。AnimationMixer の練習にちょうどいい。',
    from: 'Tomás Laulhé 作／Don McCurdy 改変（CC0）',
  },
  {
    label: '🪖 兵士', file: 'models/gltf/Soldier.glb',
    desc: 'Idle / Walk / Run を持つスキンドメッシュ。人型モーションの合成を試すときの定番サンプル。',
    from: 'Mixamo 由来（three.js examples 収録）',
  },
  {
    label: '🪐 ヘルメット', file: 'models/gltf/DamagedHelmet/glTF/DamagedHelmet.gltf',
    desc: 'PBRの効きを見るための世界的な定番。色・法線・金属粗さ・AO・発光の5枚が入り、テクスチャは別ファイルで配信される形（.gltf＋.bin＋.jpg×5）。',
    from: 'theblueturtle_ 作（CC BY-NC 4.0／非商用のみ）',
  },
  {
    label: '🏎️ フェラーリ', file: 'models/gltf/ferrari.glb',
    desc: '車体の塗装や窓ガラスなど、透過と映り込みを含むマテリアル構成の例。Draco で圧縮されている。',
    from: 'Ferrari 458 Italia by vicent091036（three.js examples 収録）',
  },
  {
    label: '🏙️ 街（Draco圧縮）', file: 'models/gltf/LittlestTokyo.glb',
    desc: 'Draco で圧縮された大きめのシーン。DRACOLoader を差し込まないと読めない＝圧縮の実例。',
    from: 'Glen Fox 作（CC Attribution）',
  },
];

function initModels() {
  const stageEl = $('#stage-models');
  const meta = $('#meta-models');
  const stage = makeStage(stageEl);
  stage.scene.environment = roomEnvironment(stage.renderer);

  const gltfLoader = new GLTFLoader();
  const draco = new DRACOLoader().setDecoderPath(NPM + 'examples/jsm/libs/draco/gltf/');
  gltfLoader.setDRACOLoader(draco);

  let current = null;
  let mixer = null;
  let token = 0;

  async function show(item) {
    const mine = ++token;
    const t0 = performance.now();
    setProgress(stageEl, 0.03);
    meta.innerHTML = '<b>' + item.label + '</b><span class="row">読み込み中…</span>';
    try {
      const gltf = await loadAny(gltfLoader, ex(item.file), progressOf(stageEl));
      if (mine !== token) { disposeTree(gltf.scene); return; }

      if (current) { stage.scene.remove(current); disposeTree(current); }
      if (mixer) { mixer.stopAllAction(); mixer = null; }

      current = gltf.scene;
      stage.scene.add(current);
      frameObject(current, stage);

      const clips = gltf.animations || [];
      if (clips.length) {
        mixer = new THREE.AnimationMixer(current);
        mixer.clipAction(clips[0]).play();
      }
      stage.tick = (dt) => {
        if (mixer) mixer.update(dt);
        if (!mixer && current) current.rotation.y += dt * 0.25;
      };

      let triangles = 0;
      current.traverse((o) => {
        if (o.isMesh && o.geometry) {
          const g = o.geometry;
          triangles += (g.index ? g.index.count : g.attributes.position.count) / 3;
        }
      });

      const size = formatSize(transferredSince(t0));
      meta.innerHTML =
        '<b>' + item.label + '</b>' +
        '<span class="row">' + item.desc + '</span>' +
        '<span class="row">出典: ' + item.from +
        (size ? ' ／ 転送量 ' + size : '') +
        ' ／ 約 ' + Math.round(triangles).toLocaleString('ja-JP') + ' 三角形' +
        ' ／ アニメーション ' + clips.length + ' 本</span>';
      hideOverlay(stageEl);
    } catch (e) {
      console.error(e);
      if (mine !== token) return;
      showError(stageEl, 'このモデルの配信元に接続できませんでした。ほかのモデルを選んでみてください。');
      meta.innerHTML = '<b>' + item.label + '</b><span class="row">読み込みに失敗しました。</span>';
    }
  }

  makeChips($('#chips-models'), MODELS, show);
  show(MODELS[0]);
}

// =============================================================
// ② HDRI 環境マップ
// =============================================================
const HDRIS = [
  { label: '⛪ 大聖堂の前', file: 'textures/equirectangular/royal_esplanade_1k.hdr', desc: '晴天の屋外。影がはっきりして、金属に周囲の建物が映り込む。' },
  { label: '🌇 ベネチアの夕暮れ', file: 'textures/equirectangular/venice_sunset_1k.hdr', desc: 'オレンジ寄りの低い太陽。同じ白い球でも、全体が暖色に染まる。' },
  { label: '⛰️ 採石場', file: 'textures/equirectangular/quarry_01_1k.hdr', desc: '曇天の屋外。光がやわらかく回り、影の縁がぼける。' },
  { label: '🌉 高架下', file: 'textures/equirectangular/pedestrian_overpass_1k.hdr', desc: '上が塞がった屋外。上下で明るさの差が大きく、立体感が出る。' },
];

function initHdri() {
  const stageEl = $('#stage-hdri');
  const meta = $('#meta-hdri');
  const stage = makeStage(stageEl);
  stage.camera.position.set(0, 0.6, 6);

  const pmrem = new THREE.PMREMGenerator(stage.renderer);
  pmrem.compileEquirectangularShader();

  const roughs = [0.02, 0.28, 0.75];
  const spheres = roughs.map((roughness, i) => {
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), mat);
    mesh.position.x = (i - 1) * 2.5;
    stage.scene.add(mesh);
    return mesh;
  });
  stage.controls.target.set(0, 0, 0);

  let envTexture = null;
  let showBackground = true;
  let token = 0;

  function applyBackground() {
    stage.scene.background = (showBackground && envTexture) ? envTexture : null;
  }

  async function show(item) {
    const mine = ++token;
    setProgress(stageEl, 0.03);
    try {
      const hdr = await loadAny(new RGBELoader(), ex(item.file), progressOf(stageEl));
      if (mine !== token) { hdr.dispose(); return; }
      const target = pmrem.fromEquirectangular(hdr);
      hdr.dispose();
      if (envTexture) envTexture.dispose();
      envTexture = target.texture;
      stage.scene.environment = envTexture;
      applyBackground();
      meta.innerHTML =
        '<b>' + item.label + '</b>' +
        '<span class="row">' + item.desc + '</span>' +
        '<span class="row">左からツルツル（roughness 0.02）・半ツヤ（0.28）・マット（0.75）。' +
        '配布元は HDRI Haven（現 Poly Haven／CC0）。Web では 1k 版で十分で、1枚 1〜2 MB 程度です。</span>';
      hideOverlay(stageEl);
    } catch (e) {
      console.error(e);
      if (mine !== token) return;
      showError(stageEl, 'HDRIの配信元に接続できませんでした。');
    }
  }

  $('#hdri-bg').addEventListener('change', (e) => { showBackground = e.target.checked; applyBackground(); });
  $('#hdri-metal').addEventListener('change', (e) => {
    for (const s of spheres) { s.material.metalness = e.target.checked ? 1 : 0; s.material.needsUpdate = true; }
  });

  stage.tick = () => {};
  makeChips($('#chips-hdri'), HDRIS, show);
  show(HDRIS[0]);
}

// =============================================================
// ③ PBRテクスチャ
// =============================================================
const TEXSETS = [
  {
    label: '🪵 木の床', repeat: 3, desc: 'カラー＋バンプ＋ラフネスの3枚組。板目の溝が凹凸で、ニスのムラがざらつきで表現されている。',
    maps: { map: 'textures/hardwood2_diffuse.jpg', bumpMap: 'textures/hardwood2_bump.jpg', roughnessMap: 'textures/hardwood2_roughness.jpg' },
  },
  {
    label: '🧱 レンガ', repeat: 3, desc: '目地の深さはバンプだけで作っている。形状は平らなまま、光の当たり方で凹凸に見える。',
    maps: { map: 'textures/brick_diffuse.jpg', bumpMap: 'textures/brick_bump.jpg', roughnessMap: 'textures/brick_roughness.jpg' },
  },
  {
    label: '🧶 カーボン', repeat: 6, desc: 'ノーマルマップで織り目の向きを表現。凹凸を切ると、ただの黒い面になるのが分かりやすい。',
    maps: { map: 'textures/carbon/Carbon.png', normalMap: 'textures/carbon/Carbon_Normal.png' },
  },
  {
    label: '🌍 地球', repeat: 1, desc: '球に貼る前提の1枚もの。海だけがツヤを持つよう、ラフネスマップで陸と海を塗り分けている。',
    maps: { map: 'textures/planets/earth_atmos_2048.jpg', normalMap: 'textures/planets/earth_normal_2048.jpg', roughnessMap: 'textures/planets/earth_specular_2048.jpg' },
    sphereOnly: true,
  },
];

function initTextures() {
  const stageEl = $('#stage-tex');
  const meta = $('#meta-tex');
  const stage = makeStage(stageEl);
  stage.camera.position.set(0, 1.6, 4.6);
  stage.scene.environment = roomEnvironment(stage.renderer);

  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0.05 });
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(1.1, 64, 32), material);
  sphere.position.y = 1.15;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), material);
  floor.rotation.x = -Math.PI / 2;
  stage.scene.add(sphere, floor);
  stage.controls.target.set(0, 1.0, 0);
  stage.controls.update();

  const loader = new THREE.TextureLoader();
  let loaded = {};
  let token = 0;

  function applyToggles() {
    material.map = $('#tex-map').checked ? (loaded.map || null) : null;
    const bumpOn = $('#tex-bump').checked;
    material.bumpMap = bumpOn ? (loaded.bumpMap || null) : null;
    material.normalMap = bumpOn ? (loaded.normalMap || null) : null;
    material.roughnessMap = $('#tex-rough').checked ? (loaded.roughnessMap || null) : null;
    material.color.set(material.map ? 0xffffff : 0xb9bcd8);
    material.needsUpdate = true;
  }

  async function show(item) {
    const mine = ++token;
    setProgress(stageEl, 0.03);
    try {
      const entries = Object.entries(item.maps);
      const next = {};
      let done = 0;
      for (const [slot, path] of entries) {
        const tex = await loadAny(loader, ex(path));
        if (mine !== token) { tex.dispose(); return; }
        tex.colorSpace = (slot === 'map') ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.anisotropy = Math.min(8, stage.renderer.capabilities.getMaxAnisotropy());
        next[slot] = tex;
        setProgress(stageEl, ++done / entries.length);
      }
      for (const t of Object.values(loaded)) t.dispose();
      loaded = next;

      floor.visible = !item.sphereOnly;
      for (const [slot, tex] of Object.entries(loaded)) {
        tex.repeat.set(item.repeat, item.repeat);
      }
      material.bumpScale = item.maps.bumpMap ? 0.35 : 1;
      applyToggles();

      meta.innerHTML =
        '<b>' + item.label + '</b>' +
        '<span class="row">' + item.desc + '</span>' +
        '<span class="row">使用マップ: ' + Object.keys(item.maps).map((k) => '<code>' + k + '</code>').join(' / ') +
        ' ／ 球と床は同じマテリアルです。</span>';
      hideOverlay(stageEl);
    } catch (e) {
      console.error(e);
      if (mine !== token) return;
      showError(stageEl, 'テクスチャの配信元に接続できませんでした。');
    }
  }

  for (const id of ['#tex-map', '#tex-bump', '#tex-rough']) {
    $(id).addEventListener('change', applyToggles);
  }
  stage.tick = (dt) => { sphere.rotation.y += dt * 0.18; };
  makeChips($('#chips-tex'), TEXSETS, show);
  show(TEXSETS[0]);
}

// =============================================================
// ⑤ 3Dテキスト用フォント
// =============================================================
const FONTS = [
  { label: 'Helvetiker', file: 'helvetiker_regular.typeface.json', desc: 'three.js の既定書体。サンセリフで、どんな題材にも無難に合う。' },
  { label: 'Helvetiker Bold', file: 'helvetiker_bold.typeface.json', desc: '太字版。押し出すと面が広く、金属マテリアルが映えやすい。' },
  { label: 'Optimer', file: 'optimer_regular.typeface.json', desc: '線の太さに強弱があり、やや上品な印象になる。' },
  { label: 'Gentilis', file: 'gentilis_regular.typeface.json', desc: 'セリフ（ひげ）付き。細部が多いぶんポリゴン数は増える。' },
  { label: 'Droid Sans', file: 'droid/droid_sans_regular.typeface.json', desc: 'Android由来の書体。字幅が広く、小さくても読みやすい。' },
];

function initFonts() {
  const stageEl = $('#stage-font');
  const meta = $('#meta-font');
  const input = $('#font-text');
  const stage = makeStage(stageEl);
  stage.camera.position.set(0, 0, 9);
  stage.scene.environment = roomEnvironment(stage.renderer);

  const material = new THREE.MeshStandardMaterial({ color: 0xbdb2ff, metalness: 0.7, roughness: 0.25 });
  const group = new THREE.Group();
  stage.scene.add(group);

  const loader = new FontLoader();
  const cache = new Map();
  let currentFont = null;
  let currentItem = FONTS[0];

  function rebuild() {
    if (!currentFont) return;
    for (const child of [...group.children]) { group.remove(child); disposeTree(child); }
    const text = (input.value || 'three.js').slice(0, 14);
    let geometry;
    try {
      geometry = new TextGeometry(text, {
        font: currentFont, size: 1, height: 0.32,
        curveSegments: 6, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.02, bevelSegments: 3,
      });
    } catch (e) {
      meta.innerHTML = '<b>' + currentItem.label + '</b><span class="row">この書体に含まれない文字が入っています（英数字のみ対応）。</span>';
      return;
    }
    geometry.center();
    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);
    frameObject(group, stage, new THREE.Vector3(0, 0.18, 1));

    const count = geometry.attributes.position.count;
    meta.innerHTML =
      '<b>' + currentItem.label + '</b>' +
      '<span class="row">' + currentItem.desc + '</span>' +
      '<span class="row">' + count.toLocaleString('ja-JP') + ' 頂点 ／ ' +
      '<code>' + currentItem.file + '</code>（three.js 同梱。npm版にも入っているのでCDNから直接読めます）</span>';
  }

  async function show(item) {
    currentItem = item;
    setProgress(stageEl, 0.05);
    try {
      if (!cache.has(item.file)) {
        cache.set(item.file, await loader.loadAsync(NPM + 'examples/fonts/' + item.file));
      }
      currentFont = cache.get(item.file);
      rebuild();
      hideOverlay(stageEl);
    } catch (e) {
      console.error(e);
      showError(stageEl, 'フォントを読み込めませんでした。');
    }
  }

  let timer = null;
  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(rebuild, 260); });

  stage.tick = (dt) => { group.rotation.y = Math.sin(performance.now() / 3400) * 0.45; };
  makeChips($('#chips-font'), FONTS, show);
  show(FONTS[0]);
}

// =============================================================
// 起動
// =============================================================
whenVisible($('#stage-models'), initModels);
whenVisible($('#stage-hdri'), initHdri);
whenVisible($('#stage-tex'), initTextures);
whenVisible($('#stage-font'), initFonts);
