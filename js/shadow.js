// 쉐도잉: 세트 목록 → 한 문장씩 듣기 · 따라 말하기 · 녹음 비교 · 발음 확인

const SETS = window.SHADOW_SETS;
const SET_BY_ID = Object.fromEntries(SETS.map(s => [s.id, s]));
let shSet = null, shIdx = 0, shHide = false;

// ---------- 녹음 저장소 (기기에만, 문장마다 마지막 녹음 하나) ----------
const REC_DB = `${APP}-rec`;
function recOpen() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(REC_DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('rec');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function recPut(id, blob) {
  try {
    const d = await recOpen();
    d.transaction('rec', 'readwrite').objectStore('rec').put(blob, id);
  } catch (e) { /* 저장 못 해도 이번 화면에서는 들을 수 있어요 */ }
}
async function recGet(id) {
  try {
    const d = await recOpen();
    return await new Promise(res => {
      const q = d.transaction('rec').objectStore('rec').get(id);
      q.onsuccess = () => res(q.result || null);
      q.onerror = () => res(null);
    });
  } catch (e) { return null; }
}

// ---------- 진도 ----------
function shState(id) { return (db.shadow || {})[id]; } // 'ok' | 'again' | undefined
function setShState(id, v) {
  db.shadow = db.shadow || {};
  db.shadow[id] = v;
  persist();
}
function setDone(set) { return set.sentences.filter(s => shState(s.id) === 'ok').length; }

// ---------- 화면 ----------
RENDER.shadow = el => {
  if (shSet) return drawSentence(el);
  const group = (kind, title) => `
    <h3 class="group-title">${title}</h3>
    <div class="set-grid">${SETS.filter(s => s.kind === kind).map(s => {
      const done = setDone(s), n = s.sentences.length;
      return `<button class="set-card" data-set="${s.id}">
        <span class="set-emoji">${s.emoji}</span>
        <span class="set-main"><b>${esc(s.title)}</b><span class="hint">${esc(s.desc)}</span>
          <span class="bar thin"><i style="width:${Math.round(done / n * 100)}%"></i></span></span>
        <span class="set-count ${done === n ? 'full' : ''}">${done}/${n}</span>
      </button>`;
    }).join('')}</div>`;
  el.innerHTML = `
    ${subNav('shadow')}
    <div class="panel">
      <p><b>쉐도잉</b>은 문장을 듣고 반 박자 뒤에 그림자처럼 따라 말하는 연습이에요.
      🔊 듣고 → 🎙 따라 말하며 녹음하고 → 원문과 번갈아 들어 보세요.</p>
    </div>
    ${group('situation', '💬 상황별')}
    ${group('grammar', '🧩 문법별')}`;
  el.querySelectorAll('[data-set]').forEach(b => b.onclick = () => {
    shSet = SET_BY_ID[b.dataset.set];
    const first = shSet.sentences.findIndex(s => shState(s.id) !== 'ok');
    shIdx = first < 0 ? 0 : first;
    scrollTo(0, 0);
    render();
  });
};

function videoRow(set) {
  const link = (db.links || {})[set.id];
  const yt = `https://www.youtube.com/results?search_query=${encodeURIComponent(set.search)}`;
  return `
    <div class="video-row">
      ${link
        ? `<a class="btn" href="${esc(link)}" target="_blank" rel="noopener">▶ 내 참고 영상</a>
           <button class="icon-btn small" id="linkEdit" title="링크 바꾸기" aria-label="링크 바꾸기">✎</button>`
        : `<a class="btn" href="${yt}" target="_blank" rel="noopener">🔎 YouTube에서 찾기</a>
           <button class="btn" id="linkEdit">＋ 참고 영상 달기</button>`}
    </div>
    <form class="link-form" id="linkForm" hidden>
      <input type="url" id="linkInput" placeholder="https://youtu.be/... (시작 시각 포함 가능)" value="${esc(link || '')}">
      <button class="btn primary">저장</button>
      ${link ? '<button type="button" class="btn danger" id="linkDel">지우기</button>' : ''}
    </form>`;
}

function beatsHtml(s) {
  return esc(s.beats).replace(/ \/ /g, ' <span class="beat">/</span> ');
}

function drawSentence(el) {
  const set = shSet, s = set.sentences[shIdx], n = set.sentences.length;
  el.innerHTML = `
    <div class="session-top">
      <button class="icon-btn small" id="shBack" aria-label="세트 목록">‹</button>
      <b class="set-title">${set.emoji} ${esc(set.title)}</b>
      <span class="hint">${shIdx + 1}/${n}</span>
    </div>
    ${videoRow(set)}
    <div class="sh-dots">${set.sentences.map((x, i) =>
      `<button class="sh-dot ${shState(x.id) || ''} ${i === shIdx ? 'cur' : ''}" data-i="${i}" aria-label="${i + 1}번 문장"></button>`).join('')}</div>

    <div class="panel sh-card">
      <div class="sh-ko">${esc(s.ko)}</div>
      <div class="sh-en ${shHide ? 'blur' : ''}" id="shEn">${beatsHtml(s)}</div>
      <div class="sh-sound ${shHide ? 'blur' : ''}">${esc(s.sound).replace(/ \/ /g, ' <span class="beat">/</span> ')}</div>
      ${s.pv.length ? `<div class="rules">${s.pv.filter(id => BY_ID[id]).map(id =>
        `<button class="chip rule" data-pv="${id}">📇 ${esc(BY_ID[id].phrase)}</button>`).join('')}</div>` : ''}
      ${s.tip ? `<p class="tip">💡 ${esc(s.tip)}</p>` : ''}
      <label class="hide-toggle"><input type="checkbox" id="shHide" ${shHide ? 'checked' : ''}> 영어 가리고 듣기만</label>
    </div>

    <div class="sh-controls">
      <button class="btn" id="shSlow">🐢 천천히</button>
      <button class="btn primary" id="shPlay">🔊 듣기</button>
      <button class="btn rec" id="shRec">🎙 녹음</button>
      <button class="btn" id="shMine" disabled>▶ 내 녹음</button>
      <button class="btn" id="shBoth" disabled>🔁 번갈아</button>
      <button class="btn" id="shCheck">🗣 발음 확인</button>
    </div>
    <div class="panel check-result" id="shResult" hidden></div>

    <div class="answer-row">
      <button class="btn" id="shPrev" ${shIdx === 0 ? 'disabled' : ''}>‹ 이전</button>
      <button class="btn grade again" id="shAgain">다시 할래요</button>
      <button class="btn grade good" id="shOk">됐어요 ›</button>
    </div>`;

  const $q = sel => el.querySelector(sel);
  $q('#shBack').onclick = () => { stopRec(); shSet = null; render(); };
  el.querySelectorAll('.sh-dot').forEach(b => b.onclick = () => go(+b.dataset.i));
  el.querySelectorAll('[data-pv]').forEach(b => b.onclick = () => openCard(b.dataset.pv));
  $q('#shHide').onchange = e => { shHide = e.target.checked; render(); };
  $q('#shPlay').onclick = () => speakRate(s.en, db.settings.rate);
  $q('#shSlow').onclick = () => speakRate(s.en, 0.7);
  $q('#shRec').onclick = () => toggleRec(s.id);
  $q('#shMine').onclick = () => playMine();
  $q('#shBoth').onclick = () => playBoth(s.en);
  $q('#shCheck').onclick = () => checkSpeech(s.en);
  $q('#shPrev').onclick = () => go(shIdx - 1);
  $q('#shAgain').onclick = () => { setShState(s.id, 'again'); go(shIdx + 1); };
  $q('#shOk').onclick = () => { setShState(s.id, 'ok'); go(shIdx + 1); };

  // 참고 영상 링크
  const form = $q('#linkForm');
  $q('#linkEdit').onclick = () => { form.hidden = !form.hidden; if (!form.hidden) $q('#linkInput').focus(); };
  form.onsubmit = e => {
    e.preventDefault();
    const v = $q('#linkInput').value.trim();
    if (v && !/^https?:\/\//.test(v)) { toast('https:// 로 시작하는 링크를 넣어 주세요.'); return; }
    db.links = db.links || {};
    if (v) db.links[set.id] = v; else delete db.links[set.id];
    persist(); render(); toast(v ? '참고 영상을 달았어요.' : '링크를 지웠어요.');
  };
  const del = $q('#linkDel');
  if (del) del.onclick = () => { delete db.links[set.id]; persist(); render(); toast('링크를 지웠어요.'); };

  loadMine(s.id);
}

function go(i) {
  stopRec();
  const n = shSet.sentences.length;
  if (i >= n) {
    const done = setDone(shSet);
    toast(done === n ? `🎉 ${shSet.title} 세트를 다 했어요!` : `세트 끝! ${done}/${n} 됐어요. 다시 할 문장을 눌러 보세요.`);
    i = shSet.sentences.findIndex(s => shState(s.id) !== 'ok');
    if (i < 0) { shSet = null; render(); return; }
  }
  shIdx = Math.max(0, i);
  render();
}

function speakRate(text, rate, onend) {
  if (!('speechSynthesis' in window)) { toast('이 브라우저는 읽어주기를 지원하지 않아요.'); return; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = pickVoice();
  if (v) u.voice = v;
  u.lang = v ? v.lang : 'en-US';
  u.rate = rate;
  if (onend) u.onend = onend;
  speechSynthesis.speak(u);
}

// ---------- 녹음 ----------
let recorder = null, chunks = [], mineUrl = null, mineFor = null;

async function loadMine(id) {
  const blob = await recGet(id);
  if (shSet && shSet.sentences[shIdx].id === id) setMine(blob, id);
}
function setMine(blob, id) {
  if (mineUrl) URL.revokeObjectURL(mineUrl);
  mineUrl = blob ? URL.createObjectURL(blob) : null;
  mineFor = id;
  const on = !!mineUrl;
  const a = document.getElementById('shMine'), b = document.getElementById('shBoth');
  if (a) a.disabled = !on;
  if (b) b.disabled = !on;
}

function pickMime() {
  if (!window.MediaRecorder) return null;
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac'].find(t => MediaRecorder.isTypeSupported(t)) || '';
}

async function toggleRec(id) {
  if (recorder) { stopRec(); return; }
  const mime = pickMime();
  if (mime === null || !navigator.mediaDevices?.getUserMedia) { toast('이 브라우저에서는 녹음이 안 돼요.'); return; }
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
  catch (e) { toast('마이크 권한이 필요해요. 브라우저 설정에서 허용해 주세요.'); return; }
  speechSynthesis.cancel();
  chunks = [];
  recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  recorder.onstop = () => {
    stream.getTracks().forEach(t => t.stop());
    const blob = new Blob(chunks, { type: recorder?.mimeType || mime || 'audio/webm' });
    recorder = null;
    drawRecBtn();
    if (blob.size) { setMine(blob, id); recPut(id, blob); toast('녹음했어요. ▶ 내 녹음이나 🔁 번갈아로 들어 보세요.'); }
  };
  recorder.start();
  drawRecBtn();
  const mine = recorder;
  setTimeout(() => { if (recorder === mine) stopRec(); }, 15000); // 15초면 자동 정지
}
function stopRec() { if (recorder && recorder.state !== 'inactive') recorder.stop(); }
function drawRecBtn() {
  const b = document.getElementById('shRec');
  if (!b) return;
  b.classList.toggle('on', !!recorder);
  b.textContent = recorder ? '⏹ 멈추기' : '🎙 녹음';
}

function playMine(onend) {
  if (!mineUrl) return;
  speechSynthesis.cancel();
  const a = new Audio(mineUrl);
  if (onend) a.onended = onend;
  a.play().catch(() => toast('녹음을 재생하지 못했어요.'));
}
function playBoth(text) {
  speakRate(text, db.settings.rate, () => setTimeout(() => playMine(), 350));
}

// ---------- 발음 확인 (브라우저 음성 인식) ----------
const NORM = { gonna: 'going to', wanna: 'want to', gotta: 'got to', kinda: 'kind of', lemme: 'let me', "y'all": 'you all' };
function words(t) {
  return t.toLowerCase().replace(/[’]/g, "'").replace(/[^a-z0-9' ]+/g, ' ')
    .split(/\s+/).filter(Boolean).flatMap(w => (NORM[w] || w).split(' '));
}
// 원문 단어마다 들렸는지 표시 (LCS)
function diff(target, heard) {
  const a = words(target), b = words(heard);
  const L = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const hit = new Array(a.length).fill(false);
  for (let i = 0, j = 0; i < a.length && j < b.length;) {
    if (a[i] === b[j]) { hit[i] = true; i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) i++;
    else j++;
  }
  return { a, hit, score: a.length ? Math.round(hit.filter(Boolean).length / a.length * 100) : 0 };
}

let recog = null;
function checkSpeech(target) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const box = document.getElementById('shResult');
  if (!SR) {
    box.hidden = false;
    box.innerHTML = '<p class="hint">이 브라우저는 음성 인식을 지원하지 않아요. 크롬(안드로이드·PC)에서 써 보세요.</p>';
    return;
  }
  if (recog) { recog.stop(); return; }
  stopRec();
  speechSynthesis.cancel();
  recog = new SR();
  recog.lang = 'en-US';
  recog.interimResults = false;
  recog.maxAlternatives = 3;
  const btn = document.getElementById('shCheck');
  btn.textContent = '👂 듣는 중… (말해 보세요)';
  btn.classList.add('on');
  box.hidden = false;
  box.innerHTML = '<p class="hint">문장을 한 번 말해 보세요.</p>';
  recog.onresult = e => {
    const alts = [...e.results[0]].map(r => r.transcript);
    const best = alts.map(t => ({ t, d: diff(target, t) })).sort((x, y) => y.d.score - x.d.score)[0];
    const { a, hit, score } = best.d;
    box.innerHTML = `
      <div class="check-score ${score >= 90 ? 'ok' : score >= 60 ? 'mid' : 'low'}">${score}%</div>
      <div class="check-words">${a.map((w, i) => `<span class="${hit[i] ? 'hit' : 'miss'}">${esc(w)}</span>`).join(' ')}</div>
      <p class="hint">들린 말: “${esc(best.t)}”${score < 100 ? ' · 빨간 단어가 잘 안 들렸어요.' : ''}</p>`;
  };
  recog.onerror = e => {
    box.innerHTML = `<p class="hint">${e.error === 'not-allowed' ? '마이크 권한이 필요해요.' : e.error === 'no-speech' ? '말소리가 안 들렸어요. 다시 눌러 보세요.' : '음성 인식이 잠깐 안 돼요. 다시 시도해 주세요.'}</p>`;
  };
  recog.onend = () => {
    recog = null;
    const b = document.getElementById('shCheck');
    if (b) { b.textContent = '🗣 발음 확인'; b.classList.remove('on'); }
  };
  recog.start();
}
