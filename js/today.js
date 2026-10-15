// 오늘의 학습: 복습 + 새 카드

let session = null; // { queue: [id], i, revealed, done, again: Set }

function buildQueue() {
  const t = today();
  const due = ALL.filter(p => { const r = prog(p.id); return r.box > 0 && r.due <= t; })
    .sort((a, b) => prog(a.id).due.localeCompare(prog(b.id).due));
  const learned = (db.log[t] || {}).learned || 0;
  const fresh = ALL.filter(p => prog(p.id).box === 0)
    .sort((a, b) => a.level - b.level)
    .slice(0, Math.max(0, db.settings.newPerDay - learned));
  return { due, fresh };
}

function counts() {
  const c = { new: 0, learning: 0, known: 0 };
  ALL.forEach(p => c[status(p.id)]++);
  return c;
}

RENDER.today = el => {
  if (session && session.i < session.queue.length) return drawSessionCard(el);
  const { due, fresh } = buildQueue();
  const c = counts(), t = db.log[today()] || { reviewed: 0, learned: 0 };
  const pct = Math.round(c.known / ALL.length * 100);
  const finished = session && session.i >= session.queue.length;
  el.innerHTML = `
    <div class="panel hero">
      ${finished ? `<p class="done-msg">🎉 오늘 분량 끝! ${session.done}장 봤어요.</p>` : ''}
      <div class="stats">
        <div><b>${streak()}</b><span>🔥 연속 일수</span></div>
        <div><b>${t.reviewed}</b><span>오늘 본 카드</span></div>
        <div><b>${c.known}</b><span>✅ 익힌 구동사</span></div>
      </div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <p class="hint">전체 ${ALL.length}개 중 ${pct}% 익혔어요 · 🌱 익히는 중 ${c.learning}개</p>
      <div class="todo">
        <div>🔁 복습할 카드 <b>${due.length}</b></div>
        <div>🆕 새 카드 <b>${fresh.length}</b></div>
      </div>
      ${due.length + fresh.length
        ? `<button class="btn primary big" id="startBtn">시작하기</button>`
        : `<p class="hint">오늘은 더 볼 카드가 없어요. 격자나 목록에서 둘러보거나 설정에서 새 카드 수를 늘려 보세요.</p>`}
    </div>
    <div class="panel">
      <div class="panel-head"><h3>오늘의 표현 하나</h3></div>
      ${cardBack(ALL[dayIndex() % ALL.length])}
    </div>`;
  const sb = el.querySelector('#startBtn');
  if (sb) sb.onclick = () => {
    session = { queue: [...due, ...fresh].map(p => p.id), i: 0, revealed: false, done: 0, again: new Set() };
    render();
  };
};

function dayIndex() {
  const d = new Date();
  return Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5) * 7;
}

function drawSessionCard(el) {
  const id = session.queue[session.i], p = BY_ID[id];
  const front = db.settings.front;
  const left = session.queue.length - session.i;
  let face;
  if (front === 'sound') face = `
      <p class="q">🎧 무슨 구동사일까요?</p>
      <button class="say-btn huge" data-say="${esc(p.chunk)}" aria-label="듣기">🔊</button>
      <div class="sound-ko big">${esc(p.sound)}</div>`;
  else if (front === 'phrase') face = `
      <p class="q">📇 무슨 뜻일까요?</p>
      <div class="phrase big">${esc(p.phrase)}</div>
      <button class="btn" data-say="${esc(p.chunk)}">🔊 ${esc(p.chunk)}</button>`;
  else face = `
      <p class="q">💬 영어로 뭐라고 할까요?</p>
      <div class="meaning big">${esc(p.senses[0].ko)}</div>
      <p class="hint">${esc(p.senses[0].exKo)}</p>`;

  el.innerHTML = `
    <div class="session-top">
      <button class="icon-btn small" id="quitBtn" aria-label="그만하기">✕</button>
      <div class="bar"><i style="width:${Math.round(session.i / session.queue.length * 100)}%"></i></div>
      <span class="hint">${left}장 남음</span>
    </div>
    <div class="panel study ${session.revealed ? 'revealed' : ''}">
      ${prog(id).box === 0 ? '<span class="chip">🆕 새 카드</span>' : ''}
      ${session.revealed ? cardBack(p) : `<div class="front">${face}</div>`}
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
  if (!session.revealed && front === 'sound') speak(p.chunk);
}

function reveal() {
  session.revealed = true;
  render();
  speak(BY_ID[session.queue[session.i]].senses[0].ex);
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
