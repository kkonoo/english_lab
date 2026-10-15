// 상태 · 저장 · 설정 · 탭 · 공통 도구
const APP = 'english_lab';
const VERSION = 1;
const ALL = window.PHRASALS;
const BY_ID = Object.fromEntries(ALL.map(p => [p.id, p]));
const INTERVAL = { 1: 1, 2: 3, 3: 7, 4: 14, 5: 30 }; // 상자 번호 → 다음 복습까지 일수

let db = freshDb();

function freshDb() {
  return {
    version: VERSION,
    progress: {},   // id → { box, due, lapses, seen }
    starred: {},    // id → true
    log: {},        // 'YYYY-MM-DD' → { reviewed, learned }
    shadow: {},     // 쉐도잉 문장 id → 'ok' | 'again'
    links: {},      // 쉐도잉 세트 id → 참고 영상 URL
    notes: {},      // 내 표현: id → { text, memo, t, del }
    settings: { newPerDay: 10, front: 'sound', rate: 1, voice: '' },
  };
}

// ---------- 저장 (IndexedDB, 실패하면 localStorage) ----------
const IDB_NAME = APP, IDB_STORE = 'kv', KEY = 'db';

function idbOpen() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(IDB_NAME, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(IDB_STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function idbGet() {
  const d = await idbOpen();
  return new Promise((res, rej) => {
    const q = d.transaction(IDB_STORE).objectStore(IDB_STORE).get(KEY);
    q.onsuccess = () => res(q.result);
    q.onerror = () => rej(q.error);
  });
}
async function idbPut(v) {
  const d = await idbOpen();
  return new Promise((res, rej) => {
    const t = d.transaction(IDB_STORE, 'readwrite');
    t.objectStore(IDB_STORE).put(v, KEY);
    t.oncomplete = res;
    t.onerror = () => rej(t.error);
  });
}

const dbReady = (async () => {
  let saved = null;
  try { saved = await idbGet(); } catch (e) {
    try { saved = JSON.parse(localStorage.getItem(`${APP}-db`) || 'null'); } catch (e2) {}
  }
  if (saved && typeof saved === 'object') db = migrate(saved);
})();

function migrate(d) {
  const base = freshDb();
  return { ...base, ...d, settings: { ...base.settings, ...(d.settings || {}) }, version: VERSION };
}

function persist() {
  const snap = JSON.parse(JSON.stringify(db));
  idbPut(snap).catch(() => {
    try { localStorage.setItem(`${APP}-db`, JSON.stringify(snap)); } catch (e) {}
  });
  window.onSave?.();
}

// ---------- 작은 선호 설정 (테마·글씨·마지막 탭) ----------
function prefs() {
  try { return JSON.parse(localStorage.getItem(`${APP}-prefs`) || '{}'); } catch (e) { return {}; }
}
function setPref(k, v) {
  const p = prefs(); p[k] = v;
  try { localStorage.setItem(`${APP}-prefs`, JSON.stringify(p)); } catch (e) {}
}
function applyPrefs() {
  const p = prefs();
  document.documentElement.style.setProperty('--fs', p.fs || 1);
  if (p.theme) document.documentElement.dataset.theme = p.theme;
  else delete document.documentElement.dataset.theme;
}
applyPrefs();

// ---------- 날짜 ----------
function today(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ---------- 간격 복습 ----------
function prog(id) { return db.progress[id] || { box: 0, due: null, lapses: 0, seen: 0 }; }
function status(id) {
  const b = prog(id).box;
  return b === 0 ? 'new' : b >= 4 ? 'known' : 'learning';
}
function logToday(field) {
  const t = today();
  db.log[t] = db.log[t] || { reviewed: 0, learned: 0 };
  db.log[t][field]++;
}

// grade: 'again' | 'hard' | 'good'
function rate(id, grade) {
  const p = { ...prog(id) };
  if (p.box === 0) logToday('learned');
  logToday('reviewed');
  p.seen++;
  if (grade === 'again') { p.box = 1; p.lapses++; p.due = today(); }
  else if (grade === 'hard') { p.box = Math.max(1, p.box); p.due = today(1); }
  else { p.box = Math.min(5, p.box + 1); p.due = today(INTERVAL[p.box]); }
  db.progress[id] = p;
  persist();
}

function streak() {
  let n = 0;
  for (let i = 0; ; i--) {
    const l = db.log[today(i)];
    if (l && l.reviewed) n++;
    else if (i < 0) break;
  }
  return n;
}

// ---------- 읽어주기 (브라우저 음성 합성) ----------
let voices = [];
function loadVoices() {
  if (!('speechSynthesis' in window)) return;
  voices = speechSynthesis.getVoices().filter(v => /^en(-|_)/i.test(v.lang));
}
if ('speechSynthesis' in window) {
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
}
function pickVoice() {
  const want = db.settings.voice;
  return voices.find(v => v.name === want)
    || voices.find(v => /en.US/i.test(v.lang) && /google|samantha|natural|aria|jenny/i.test(v.name))
    || voices.find(v => /en.US/i.test(v.lang))
    || voices[0];
}
function speak(text) {
  if (!('speechSynthesis' in window)) { toast('이 브라우저는 읽어주기를 지원하지 않아요.'); return; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = pickVoice();
  if (v) u.voice = v;
  u.lang = v ? v.lang : 'en-US';
  u.rate = db.settings.rate;
  speechSynthesis.speak(u);
}

// ---------- 공통 UI ----------
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
let toastTimer;
function toast(text) {
  const t = document.getElementById('toast');
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}
// 말하기 버튼: data-say="문장"
document.addEventListener('click', e => {
  const b = e.target.closest('[data-say]');
  if (b) { e.stopPropagation(); speak(b.dataset.say); }
  const sub = e.target.closest('[data-sub]');
  if (sub) showTab(sub.dataset.sub);
  const c = e.target.closest('[data-close]');
  if (c) c.closest('dialog').close();
});

// ---------- 탭 ----------
// 구동사 탭 안의 격자 / 목록 전환
const SUBNAVS = {
  grid: [['grid', '🔲 격자'], ['list', '📋 목록']],
  shadow: [['shadow', '🎬 쉐도잉'], ['sounds', '🔊 소리 규칙']],
};
const NAV_PARENT = { list: 'grid', sounds: 'shadow' };
function subNav(cur) {
  const items = SUBNAVS[NAV_PARENT[cur] || cur];
  return `<div class="seg subnav">${items.map(([id, label]) =>
    `<button data-sub="${id}" class="${cur === id ? 'on' : ''}">${label}</button>`).join('')}</div>`;
}

// 예의 정도
const REG = {
  formal: ['🎩', '격식', '회의·업무 메일·윗사람에게도 OK, 친구끼리는 딱딱해요'],
  neutral: ['🙂', '무난', '어디서나 써요'],
  casual: ['👟', '캐주얼', '친구·친한 동료끼리, 공식 자리에선 피해요'],
  rude: ['⚠️', '주의', '비속어가 섞였거나 무례하게 들릴 수 있어요'],
};
function regChip(r, always) {
  if (!REG[r] || (r === 'neutral' && !always)) return '';
  return `<span class="chip reg reg-${r}" title="${REG[r][2]}">${REG[r][0]} ${REG[r][1]}</span>`;
}
function regSeg(cur) {
  return `<div class="seg small reg-seg">
    <button data-reg="" class="${!cur ? 'on' : ''}">말투 전체</button>${Object.entries(REG).map(([k, v]) =>
    `<button data-reg="${k}" class="${cur === k ? 'on' : ''}" title="${v[2]}">${v[0]} ${v[1]}</button>`).join('')}</div>`;
}
let tab = prefs().tab || 'today';
const RENDER = {}; // 각 화면 파일이 RENDER.<tab> 등록

function showTab(name) {
  if (tab === 'shadow' && name !== 'shadow' && typeof stopRec === 'function') stopRec();
  tab = name;
  setPref('tab', name);
  document.querySelectorAll('#tabs button').forEach(b =>
    b.classList.toggle('on', b.dataset.tab === (NAV_PARENT[name] || name)));
  document.querySelectorAll('.view').forEach(v => { v.hidden = v.id !== `view-${name}`; });
  render();
}
document.getElementById('tabs').addEventListener('click', e => {
  const b = e.target.closest('button[data-tab]');
  if (b) { history.pushState({ tab: b.dataset.tab }, ''); showTab(b.dataset.tab); }
});

function render() {
  (RENDER[tab] || (() => {}))(document.getElementById(`view-${tab}`));
}

// ---------- 설정 ----------
const $ = id => document.getElementById(id);
$('settingsBtn').addEventListener('click', () => {
  const s = db.settings, p = prefs();
  $('setNew').value = s.newPerDay;
  const m = { pv: true, idiom: true, word: true, ...(s.mix || {}) };
  $('mixPv').checked = m.pv; $('mixIdiom').checked = m.idiom; $('mixWord').checked = m.word;
  $('setFront').value = s.front;
  $('setRate').value = s.rate;
  $('setFs').value = p.fs || 1;
  $('setTheme').value = p.theme || '';
  loadVoices();
  $('setVoice').innerHTML = '<option value="">기본 (미국 영어)</option>' +
    voices.map(v => `<option ${v.name === s.voice ? 'selected' : ''}>${esc(v.name)}</option>`).join('');
  $('settingsDlg').showModal();
});
$('setNew').onchange = e => { db.settings.newPerDay = +e.target.value; persist(); render(); };
['mixPv', 'mixIdiom', 'mixWord'].forEach(cid => $(cid).onchange = () => {
  const m = { pv: $('mixPv').checked, idiom: $('mixIdiom').checked, word: $('mixWord').checked };
  if (!m.pv && !m.idiom && !m.word) { $(cid).checked = true; toast('하나는 골라야 해요.'); return; }
  db.settings.mix = m; persist(); render();
});
$('setFront').onchange = e => { db.settings.front = e.target.value; persist(); render(); };
$('setRate').onchange = e => { db.settings.rate = +e.target.value; persist(); speak('Hang on, let me figure it out.'); };
$('setVoice').onchange = e => { db.settings.voice = e.target.value; persist(); speak('Hang on, let me figure it out.'); };
$('setFs').onchange = e => { setPref('fs', +e.target.value); applyPrefs(); };
$('setTheme').onchange = e => { setPref('theme', e.target.value); applyPrefs(); };

$('exportBtn').onclick = () => {
  const blob = new Blob([JSON.stringify(db, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${APP}-${today()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast('백업 파일을 저장했어요.');
};
$('importInput').onchange = async e => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  try {
    const d = JSON.parse(await f.text());
    if (!d.progress) throw new Error('형식 오류');
    if (!confirm('지금 기록을 백업 파일 내용으로 바꿀까요?')) return;
    db = migrate(d); persist(); render();
    toast('불러왔어요.');
  } catch (err) {
    toast('이 파일은 잉글리시 랩 백업 파일이 아니에요.');
  }
};
$('resetBtn').onclick = () => {
  if (!confirm('공부 기록을 모두 지울까요? 되돌릴 수 없어요.')) return;
  const s = db.settings;
  db = freshDb(); db.settings = s; persist(); render();
  toast('기록을 지웠어요.');
};

// ---------- 휴대폰 뒤로 가기 ----------
let backArmed = false;
history.replaceState({ tab }, '');
history.pushState({ tab }, '');
addEventListener('popstate', () => {
  const open = document.querySelector('dialog[open]');
  if (open) { open.close(); history.pushState({ tab }, ''); return; }
  if (tab !== 'today') { showTab('today'); history.pushState({ tab }, ''); return; }
  if (backArmed) { history.back(); return; }
  backArmed = true;
  toast('한 번 더 누르면 종료돼요.');
  setTimeout(() => { backArmed = false; }, 2000);
  history.pushState({ tab }, '');
});

addEventListener('DOMContentLoaded', () => dbReady.then(() => showTab(tab)));

// sync.js(모듈)가 쓰는 연결점
window.app = { get db() { return db; }, persist, render };

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
