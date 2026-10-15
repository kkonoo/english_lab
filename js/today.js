// 오늘의 학습: 구동사 · 표현 · 단어를 섞어서 복습 + 새 카드

let session = null; // { queue: [id], i, revealed, done, again: Set }

// 카드 종류: id 앞머리로 구분 (i- 표현, w- 단어, 나머지 구동사)
const KIND_LABEL = { pv: '📇 구동사', idiom: '🧩 표현', word: '🔤 단어' };
function kindOf(id) { return id.startsWith('i-') ? 'idiom' : id.startsWith('w-') ? 'word' : 'pv'; }
function itemOf(id) {
  const k = kindOf(id);
  return k === 'idiom' ? IDIOM_BY_ID[id] : k === 'word' ? WORD_BY_ID[id] : BY_ID[id];
}
function poolOf(kind) { return kind === 'idiom' ? IDS : kind === 'word' ? WORDS : ALL; }
function mix() { return { pv: true, idiom: true, word: true, ...(db.settings.mix || {}) }; }
function activeKinds() { return Object.entries(mix()).filter(([, on]) => on).map(([k]) => k); }

function buildQueue() {
  const t = today();
  const kinds = activeKinds();
  const due = kinds.flatMap(k => poolOf(k).filter(x => { const r = prog(x.id); return r.box > 0 && r.due <= t; }))
    .sort((a, b) => prog(a.id).due.localeCompare(prog(b.id).due));
  const learned = (db.log[t] || {}).learned || 0;
  const room = Math.max(0, db.settings.newPerDay - learned);
  // 종류별로 필수(빈도 1)부터 줄 세운 다음 번갈아 하나씩 뽑아요
  const lines = kinds.map(k => poolOf(k).filter(x => prog(x.id).box === 0).sort((a, b) => a.level - b.level));
  const fresh = [];
  for (let i = 0; fresh.length < room && lines.some(l => l.length); i++) {
    const l = lines[i % lines.length];
    if (l.length) fresh.push(l.shift());
  }
  return { due, fresh };
}

function counts() {
  const c = { new: 0, learning: 0, known: 0, total: 0 };
  activeKinds().forEach(k => poolOf(k).forEach(x => { c[status(x.id)]++; c.total++; }));
  return c;
}

RENDER.today = el => {
  if (session && session.i < session.queue.length) return drawSessionCard(el);
  const { due, fresh } = buildQueue();
  const c = counts(), t = db.log[today()] || { reviewed: 0, learned: 0 };
  const pct = c.total ? Math.round(c.known / c.total * 100) : 0;
  const finished = session && session.i >= session.queue.length;
  const byKind = list => activeKinds().map(k => `${KIND_LABEL[k]} ${list.filter(x => kindOf(x.id) === k).length}`).join(' · ');
  const pick = ALL[dayIndex() % ALL.length];
  el.innerHTML = `
    <div class="panel hero">
      ${finished ? `<p class="done-msg">🎉 오늘 분량 끝! ${session.done}장 봤어요.</p>` : ''}
      <div class="stats">
        <div><b>${streak()}</b><span>🔥 연속 일수</span></div>
        <div><b>${t.reviewed}</b><span>오늘 본 카드</span></div>
        <div><b>${c.known}</b><span>✅ 익힌 카드</span></div>
      </div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <p class="hint">전체 ${c.total}개 중 ${pct}% 익혔어요 · 🌱 익히는 중 ${c.learning}개</p>
      <div class="todo">
        <div>🔁 복습할 카드 <b>${due.length}</b></div>
        <div>🆕 새 카드 <b>${fresh.length}</b></div>
      </div>
      ${due.length + fresh.length ? `<p class="hint">${byKind([...due, ...fresh])}</p>` : ''}
      ${due.length + fresh.length
        ? `<button class="btn primary big" id="startBtn">시작하기</button>`
        : `<p class="hint">오늘은 더 볼 카드가 없어요. 설정에서 새 카드 수를 늘리거나 섞을 종류를 바꿔 보세요.</p>`}
      <p class="hint">⚙️ 설정에서 섞을 종류(구동사·표현·단어)와 하루 새 카드 수를 바꿀 수 있어요.</p>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>오늘의 구동사 하나</h3></div>
      ${cardBack(pick)}
    </div>`;
  const sb = el.querySelector('#startBtn');
  if (sb) sb.onclick = () => {
    session = { queue: [...due, ...fresh].map(x => x.id), i: 0, revealed: false, done: 0, again: new Set() };
    render();
  };
};

function dayIndex() {
  const d = new Date();
  return Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5) * 7;
}

// ---------- 카드 앞면 ----------
function sayText(id) {
  const x = itemOf(id), k = kindOf(id);
  return k === 'pv' || k === 'idiom' ? x.chunk : sayWord(x);
}
function frontOf(id) {
  const x = itemOf(id), k = kindOf(id), mode = db.settings.front;
  const listen = q => `
      <p class="q">🎧 ${q}</p>
      <button class="say-btn huge" data-say="${esc(sayText(id))}" aria-label="듣기">🔊</button>
      <div class="sound-ko big">${esc(x.sound)}</div>`;

  if (k === 'pv') {
    if (mode === 'sound') return listen('무슨 구동사일까요?');
    if (mode === 'phrase') return `
      <p class="q">📇 무슨 뜻일까요?</p>
      <div class="phrase big">${esc(x.phrase)}</div>
      <button class="btn" data-say="${esc(x.chunk)}">🔊 ${esc(x.chunk)}</button>`;
    return `
      <p class="q">💬 영어로 뭐라고 할까요?</p>
      <div class="meaning big">${esc(x.senses[0].ko)}</div>
      <p class="hint">${esc(x.senses[0].exKo)}</p>`;
  }
  if (k === 'idiom') {
    if (mode === 'sound') return listen('무슨 표현일까요?');
    if (mode === 'phrase') return `
      <p class="q">🧩 무슨 뜻일까요?</p>
      <div class="phrase big">${esc(x.en)}</div>
      <p class="hint">글자 그대로: ${esc(x.literal)}</p>`;
    return `
      <p class="q">💬 영어로 뭐라고 할까요?</p>
      <div class="meaning big">${esc(x.meaning)}</div>
      <p class="hint">${esc(x.exKo)}</p>`;
  }
  // 단어: 말투 사다리는 같은 세트의 다른 말을 보여주고 이 말투로 바꿔 보게 해요
  if (x.pos === 'reg') {
    const others = WORDS.filter(w => w.set === x.set && w.id !== x.id).sort((a, b) => a.rank - b.rank);
    return `
      <p class="q">🪜 같은 말을 <b>${REG[x.register][0]} ${REG[x.register][1]}</b> 말투로 하면?</p>
      <div class="reg-q">${others.map(o => `<span>${REG[o.register][0]} ${esc(o.word)}</span>`).join('')}</div>
      <p class="hint">${esc(x.meaning)}</p>`;
  }
  if (mode === 'sound') return listen('무슨 단어일까요?');
  if (mode === 'phrase') return `
      <p class="q">🔤 뜻과 뉘앙스는?</p>
      <div class="phrase big">${esc(x.word)}</div>
      <button class="btn" data-say="${esc(sayWord(x))}">🔊 ${esc(x.sound)}</button>`;
  return `
      <p class="q">💬 영어로 뭐라고 할까요?</p>
      <div class="meaning big">${esc(x.meaning)}</div>
      <p class="hint">${esc(x.exKo)}</p>`;
}

// ---------- 카드 뒷면 ----------
function backOf(id) {
  const x = itemOf(id), k = kindOf(id);
  if (k === 'pv') return cardBack(x);
  const ex = `
    <div class="ex">
      <button class="icon-btn small" data-say="${esc(x.ex)}" aria-label="예문 듣기">🔊</button>
      <div><div class="ex-en">${esc(x.ex)}</div><div class="ex-ko">${esc(x.exKo)}</div></div>
    </div>
    ${x.tip ? `<p class="tip">💡 ${esc(x.tip)}</p>` : ''}`;
  if (k === 'idiom') return `
    <div class="phrase-line"><span class="phrase">${esc(x.en)}</span> <span class="tag">${x.tag}</span> ${regChip(x.register, true)}</div>
    <p class="hint">글자 그대로: ${esc(x.literal)}</p>
    <div class="idiom-meaning">👉 ${esc(x.meaning)}</div>
    <p class="hint">왜? ${esc(x.why)}</p>
    <div class="sound">
      <button class="say-btn" data-say="${esc(x.chunk)}" aria-label="듣기">🔊</button>
      <div><div class="sound-ko">${esc(x.sound)}</div><div class="sound-en">${esc(x.chunk)}</div></div>
    </div>${ex}`;
  const set = x.pos === 'reg' ? WORDS.filter(w => w.set === x.set).sort((a, b) => a.rank - b.rank) : null;
  return `
    <div class="phrase-line"><span class="phrase">${esc(x.word)}</span> <span class="hint">${POS[x.pos]}</span> ${regChip(x.register, true)}</div>
    ${set ? `<div class="reg-q">${set.map(o => `<span class="${o.id === x.id ? 'me' : ''}">${REG[o.register][0]} ${esc(o.word)}</span>`).join('')}</div>` : ''}
    <div class="idiom-meaning">${esc(x.meaning)}</div>
    <p>${esc(x.nuance)}</p>
    <div class="sound">
      <button class="say-btn" data-say="${esc(sayWord(x))}" aria-label="듣기">🔊</button>
      <div><div class="sound-ko">${esc(x.sound)}</div><div class="stress">${esc(x.stress)}</div></div>
    </div>${ex}`;
}
function exampleOf(id) {
  const x = itemOf(id);
  return kindOf(id) === 'pv' ? x.senses[0].ex : x.ex;
}

function drawSessionCard(el) {
  const id = session.queue[session.i];
  const left = session.queue.length - session.i;
  el.innerHTML = `
    <div class="session-top">
      <button class="icon-btn small" id="quitBtn" aria-label="그만하기">✕</button>
      <div class="bar"><i style="width:${Math.round(session.i / session.queue.length * 100)}%"></i></div>
      <span class="hint">${left}장 남음</span>
    </div>
    <div class="panel study ${session.revealed ? 'revealed' : ''}">
      <div class="row"><span class="chip">${KIND_LABEL[kindOf(id)]}</span>${prog(id).box === 0 ? '<span class="chip">🆕 새 카드</span>' : ''}</div>
      ${session.revealed ? backOf(id) : `<div class="front">${frontOf(id)}</div>`}
    </div>
    <div class="answer-row">
      ${session.revealed ? `
        <button class="btn grade again" data-g="again">다시<small>1</small></button>
        <button class="btn grade hard" data-g="hard">헷갈려요<small>2</small></button>
        <button class="btn grade good" data-g="good">알아요<small>3</small></button>`
      : `<button class="btn primary big" id="revealBtn">정답 보기<small>Space</small></button>`}
    </div>`;

  el.querySelector('#quitBtn').onclick = () => { session = null; render(); };
  const rv = el.querySelector('#revealBtn');
  if (rv) rv.onclick = reveal;
  el.querySelectorAll('[data-g]').forEach(b => b.onclick = () => grade(b.dataset.g));
  if (!session.revealed && db.settings.front === 'sound' && itemOf(id).pos !== 'reg') speak(sayText(id));
}

function reveal() {
  session.revealed = true;
  render();
  speak(exampleOf(session.queue[session.i]));
}

function grade(g) {
  const id = session.queue[session.i];
  rate(id, g);
  session.done++;
  // '다시'는 이번 학습 끝에 한 번 더
  if (g === 'again' && !session.again.has(id)) { session.again.add(id); session.queue.push(id); }
  session.i++;
  session.revealed = false;
  render();
}

document.addEventListener('keydown', e => {
  if (tab !== 'today' || !session || session.i >= session.queue.length) return;
  if (document.querySelector('dialog[open]') || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
  if (!session.revealed && (e.code === 'Space' || e.key === 'Enter')) { e.preventDefault(); reveal(); }
  else if (session.revealed && ['1', '2', '3'].includes(e.key)) grade(['again', 'hard', 'good'][+e.key - 1]);
});
