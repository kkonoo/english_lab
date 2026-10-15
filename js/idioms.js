// 관용 표현: "하고 싶은 말"별 그룹 → 카드(글자 뜻 → 실제 뜻 → 이유) → 퀴즈

const IGROUPS = window.IDIOM_GROUPS;
const IDS = window.IDIOMS;
const IDIOM_BY_ID = Object.fromEntries(IDS.map(i => [i.id, i]));
let idGroup = null, idOpen = new Set(), idQuiz = null, idOnly1 = false, idReg = '';

const idiomsIn = g => IDS.filter(i => i.group === g).sort((a, b) => a.level - b.level);
const knownIn = g => idiomsIn(g).filter(i => status(i.id) === 'known').length;

RENDER.idioms = el => {
  if (idQuiz) return drawIdiomQuiz(el);
  if (idGroup === 'mine') return drawNotes(el);
  if (idGroup) return drawIdiomGroup(el);
  el.innerHTML = `
    <div class="panel">
      <p>관용구는 <b>글자 뜻과 실제 뜻이 어긋나서</b> 안 들려요. 하고 싶은 말별로 묶어 두었으니,
      처음 듣는 표현도 "아, 이 그룹 얘기구나"까지는 따라갈 수 있어요.</p>
      <div class="row">
        <button class="btn primary" id="idAllQuiz">🎯 전체 랜덤 퀴즈</button>
      </div>
    </div>
    <div class="set-grid">
      <button class="set-card mine" data-g="mine">
        <span class="set-emoji">📝</span>
        <span class="set-main"><b>내 표현</b><span class="hint">들은 표현을 적어 두는 곳</span></span>
        <span class="set-count">${activeNotes().length}</span>
      </button>${IGROUPS.map(g => {
      const n = idiomsIn(g.id).length, k = knownIn(g.id);
      const ex = idiomsIn(g.id).slice(0, 2).map(i => i.en).join(' · ');
      return `<button class="set-card" data-g="${g.id}">
        <span class="set-emoji">${g.emoji}</span>
        <span class="set-main"><b>${esc(g.title)}</b><span class="hint">${esc(ex)}</span>
          <span class="bar thin"><i style="width:${Math.round(k / n * 100)}%"></i></span></span>
        <span class="set-count ${k === n ? 'full' : ''}">${k}/${n}</span>
      </button>`;
    }).join('')}</div>`;
  el.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { idGroup = b.dataset.g; idOpen = new Set(); scrollTo(0, 0); render(); });
  el.querySelector('#idAllQuiz').onclick = () => startIdiomQuiz('전체 랜덤', IDS);
};

function drawIdiomGroup(el) {
  const g = IGROUPS.find(x => x.id === idGroup);
  const list = idiomsIn(g.id).filter(i => (!idOnly1 || i.level === 1) && (!idReg || i.register === idReg));
  el.innerHTML = `
    <div class="session-top">
      <button class="icon-btn small" id="idBack" aria-label="그룹 목록">‹</button>
      <b class="set-title">${g.emoji} ${esc(g.title)}</b>
      <span class="hint">${knownIn(g.id)}/${idiomsIn(g.id).length} 익힘</span>
    </div>
    <p class="hint">${esc(g.desc)} · 글자 뜻을 보고 실제 뜻을 짐작한 다음 눌러서 확인해 보세요. 점 크기 = 빈도예요.</p>
    <div class="row between">
      <div class="seg small">
        <button class="${idOnly1 ? '' : 'on'}" data-o="0">빈도 전체</button>
        <button class="${idOnly1 ? 'on' : ''}" data-o="1">필수만</button>
      </div>
      <button class="btn primary" id="idQuizBtn">🎯 이 그룹 퀴즈</button>
    </div>
    ${regSeg(idReg)}
    <div class="idiom-list">${list.map(i => idiomCard(i)).join('') || '<p class="hint">이 조건에 맞는 표현이 없어요.</p>'}</div>`;

  el.querySelector('#idBack').onclick = () => { idGroup = null; render(); };
  el.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { idOnly1 = b.dataset.o === '1'; render(); });
  el.querySelectorAll('[data-reg]').forEach(b => b.onclick = () => { idReg = b.dataset.reg; render(); });
  el.querySelector('#idQuizBtn').onclick = () => startIdiomQuiz(g.title, idiomsIn(g.id));
  el.querySelectorAll('.idiom-head').forEach(h => h.onclick = e => {
    if (e.target.closest('[data-say]')) return;
    const id = h.parentElement.dataset.id;
    idOpen.has(id) ? idOpen.delete(id) : idOpen.add(id);
    render();
  });
  el.querySelectorAll('[data-mark]').forEach(b => b.onclick = () => {
    const id = b.closest('[data-id]').dataset.id;
    if (b.dataset.mark === 'known') db.progress[id] = { ...prog(id), box: 4, due: today(INTERVAL[4]) };
    else db.progress[id] = { ...prog(id), box: 1, due: today() };
    persist(); render();
  });
}

function idiomCard(i) {
  const open = idOpen.has(i.id), st = status(i.id);
  return `
    <div class="idiom ${open ? 'open' : ''}" data-id="${i.id}">
      <div class="idiom-head" role="button" tabindex="0">
        <span class="fdot f${i.level}" title="빈도"></span>
        <div class="idiom-main">
          <div class="idiom-en">${esc(i.en)} <span class="tag">${i.tag}</span> ${regChip(i.register)}${st === 'known' ? ' <span class="chip known-chip">익힘</span>' : ''}</div>
          <div class="hint">글자 그대로: ${esc(i.literal)}</div>
        </div>
        <button class="icon-btn small" data-say="${esc(i.chunk)}" aria-label="듣기">🔊</button>
      </div>
      ${open ? `
        <div class="idiom-body">
          <div class="idiom-meaning">👉 ${esc(i.meaning)}</div>
          <p class="hint">왜? ${esc(i.why)}</p>
          <div class="sound small-sound">
            <button class="say-btn" data-say="${esc(i.chunk)}" aria-label="듣기">🔊</button>
            <div><div class="sound-ko">${esc(i.sound)}</div><div class="sound-en">${esc(i.chunk)}</div></div>
          </div>
          <div class="ex">
            <button class="icon-btn small" data-say="${esc(i.ex)}" aria-label="예문 듣기">🔊</button>
            <div><div class="ex-en">${esc(i.ex)}</div><div class="ex-ko">${esc(i.exKo)}</div></div>
          </div>
          ${i.tip ? `<p class="tip">💡 ${esc(i.tip)}</p>` : ''}
          <div class="row end">
            ${st === 'known'
              ? '<button class="btn" data-mark="again">다시 익히기</button>'
              : '<button class="btn" data-mark="again">헷갈려요</button><button class="btn primary" data-mark="known">알아요</button>'}
          </div>
        </div>` : ''}
    </div>`;
}

// ---------- 관용구 퀴즈 ----------
// 보기는 다른 그룹에서 뽑아요. 같은 그룹은 뜻이 비슷해서 정답이 여러 개가 돼요.
function startIdiomQuiz(title, pool) {
  const items = shuffle(pool).slice(0, QUIZ_LEN).map(i => {
    const others = shuffle(IDS.filter(o => o.group !== i.group));
    const picked = [];
    for (const o of others) { if (!picked.some(p => p.group === o.group)) picked.push(o); if (picked.length === 3) break; }
    return { id: i.id, type: Math.random() < 0.5 ? 'en' : 'meaning', options: shuffle([i.id, ...picked.map(o => o.id)]) };
  });
  idQuiz = { title, pool, items, i: 0, picked: null, wrong: [] };
  scrollTo(0, 0);
  render();
}

function drawIdiomQuiz(el) {
  const Q = idQuiz;
  if (Q.i >= Q.items.length) return drawIdiomQuizEnd(el);
  const q = Q.items[Q.i], it = IDIOM_BY_ID[q.id], answered = Q.picked !== null;
  const label = id => q.type === 'en' ? IDIOM_BY_ID[id].meaning : IDIOM_BY_ID[id].en;
  el.innerHTML = `
    <div class="session-top">
      <button class="icon-btn small" id="iqQuit" aria-label="그만하기">✕</button>
      <div class="bar"><i style="width:${Math.round(Q.i / Q.items.length * 100)}%"></i></div>
      <span class="hint">${esc(Q.title)} · ${Q.i + 1}/${Q.items.length}</span>
    </div>
    <div class="panel quiz-q">
      ${q.type === 'en' ? `
        <p class="q">💬 무슨 뜻일까요?</p>
        <div class="phrase big">${esc(it.en)}</div>
        <button class="btn" data-say="${esc(it.chunk)}">🔊 ${esc(it.sound)}</button>
        <p class="hint">글자 그대로: ${esc(it.literal)}</p>`
      : `
        <p class="q">🗣 이 말을 관용구로 하면?</p>
        <div class="quiz-ko">${esc(it.meaning)}</div>
        <p class="hint">${esc(it.exKo)}</p>`}
    </div>
    <div class="options single">${q.options.map((id, n) => {
      const cls = !answered ? '' : id === q.id ? 'right' : id === Q.picked ? 'wrong' : 'dim';
      return `<button class="opt ${cls}" data-opt="${id}" ${answered ? 'disabled' : ''}><small>${n + 1}</small>${esc(label(id))}</button>`;
    }).join('')}</div>
    ${answered ? `
      <div class="panel quiz-feedback ${Q.picked === q.id ? 'ok' : 'no'}">
        <p class="verdict">${Q.picked === q.id ? '⭕ 맞았어요' : `❌ 정답은 <b>${esc(label(q.id))}</b>`}</p>
        <p><b>${esc(it.en)}</b> ${it.tag} — ${esc(it.meaning)}</p>
        <p class="hint">왜? ${esc(it.why)}</p>
        <div class="ex">
          <button class="icon-btn small" data-say="${esc(it.ex)}" aria-label="예문 듣기">🔊</button>
          <div><div class="ex-en">${esc(it.ex)}</div><div class="ex-ko">${esc(it.exKo)}</div></div>
        </div>
      </div>
      <button class="btn primary big" id="iqNext">${Q.i + 1 < Q.items.length ? '다음' : '결과 보기'}<small>Enter</small></button>` : ''}`;

  el.querySelector('#iqQuit').onclick = () => { idQuiz = null; render(); };
  el.querySelectorAll('[data-opt]').forEach(b => b.onclick = () => pickIdiom(b.dataset.opt));
  const nx = el.querySelector('#iqNext');
  if (nx) nx.onclick = () => { Q.i++; Q.picked = null; render(); };
  if (!answered && q.type === 'en') speak(it.chunk);
}

function pickIdiom(id) {
  const Q = idQuiz, q = Q.items[Q.i];
  Q.picked = id;
  if (id !== q.id) Q.wrong.push(q.id);
  render();
  speak(IDIOM_BY_ID[q.id].ex);
}

function drawIdiomQuizEnd(el) {
  const Q = idQuiz, n = Q.items.length, ok = n - Q.wrong.length;
  el.innerHTML = `
    <div class="panel hero">
      <p class="done-msg">${ok === n ? '🎉 다 맞았어요!' : ok >= n * 0.7 ? '👍 잘했어요' : '💪 한 번 더 해 봐요'}</p>
      <div class="score"><b>${ok}</b> / ${n}</div>
      <p class="hint">${esc(Q.title)} 퀴즈</p>
    </div>
    ${Q.wrong.length ? `
      <div class="panel">
        <div class="panel-head"><h3>틀린 관용구</h3></div>
        <div class="rows flat">${Q.wrong.map(id => {
          const i = IDIOM_BY_ID[id];
          return `<div class="lrow"><span class="fdot f${i.level}"></span>
            <div class="lmain"><div><b>${esc(i.en)}</b> ${i.tag}</div><div class="hint">${esc(i.meaning)}</div></div>
            <button class="icon-btn small" data-say="${esc(i.chunk)}" aria-label="듣기">🔊</button></div>`;
        }).join('')}</div>
        <button class="btn" id="iqWrong">🔁 틀린 것 '헷갈려요'로 표시</button>
      </div>` : ''}
    <div class="row">
      <button class="btn primary" id="iqAgain">다시 풀기</button>
      <button class="btn" id="iqBack">돌아가기</button>
    </div>`;
  const w = el.querySelector('#iqWrong');
  if (w) w.onclick = () => {
    Q.wrong.forEach(id => { db.progress[id] = { ...prog(id), box: 1, due: today() }; });
    persist(); w.disabled = true; toast(`${Q.wrong.length}개를 표시했어요.`);
  };
  el.querySelector('#iqAgain').onclick = () => startIdiomQuiz(Q.title, Q.pool);
  el.querySelector('#iqBack').onclick = () => { idQuiz = null; render(); };
}

document.addEventListener('keydown', e => {
  if (tab !== 'idioms' || !idQuiz || idQuiz.i >= idQuiz.items.length) return;
  if (document.querySelector('dialog[open]') || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
  if (idQuiz.picked === null && ['1', '2', '3', '4'].includes(e.key)) pickIdiom(idQuiz.items[idQuiz.i].options[+e.key - 1]);
  else if (idQuiz.picked !== null && (e.key === 'Enter' || e.code === 'Space')) { e.preventDefault(); idQuiz.i++; idQuiz.picked = null; render(); }
});
