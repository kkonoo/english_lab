// 격자 퀴즈: 한 열(같은 불변사) 또는 한 행(같은 동사) 안에서 4지선다
// 보기를 같은 열·행에서 뽑아서, 열 퀴즈는 동사를, 행 퀴즈는 불변사를 구별하게 돼요.

const QUIZ_LEN = 10;
let quiz = null; // { title, pool, kind, items: [{ id, type, sense, options }], i, picked, wrong: [] }

function shuffle(a) {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function startQuiz(title, pool, kind) {
  const items = shuffle(pool).slice(0, QUIZ_LEN).map(p => ({
    id: p.id,
    type: Math.random() < 0.5 ? 'meaning' : 'sound',
    sense: Math.floor(Math.random() * p.senses.length),
    options: shuffle([p.id, ...shuffle(pool.filter(o => o.id !== p.id)).slice(0, 3).map(o => o.id)]),
  }));
  quiz = { title, pool, kind, items, i: 0, picked: null, wrong: [] };
  scrollTo(0, 0);
  render();
}

function drawQuiz(el) {
  if (quiz.i >= quiz.items.length) return drawQuizEnd(el);
  const q = quiz.items[quiz.i], p = BY_ID[q.id], s = p.senses[q.sense];
  const answered = quiz.picked !== null;
  const ask = quiz.kind === 'particle' ? '어떤 동사일까요?' : '어떤 불변사일까요?';

  el.innerHTML = `
    <div class="session-top">
      <button class="icon-btn small" id="quizQuit" aria-label="그만하기">✕</button>
      <div class="bar"><i style="width:${Math.round(quiz.i / quiz.items.length * 100)}%"></i></div>
      <span class="hint">${esc(quiz.title)} · ${quiz.i + 1}/${quiz.items.length}</span>
    </div>
    <div class="panel quiz-q">
      ${q.type === 'sound' ? `
        <p class="q">🎧 이렇게 들렸어요. ${ask}</p>
        <button class="say-btn huge" data-say="${esc(p.chunk)}" aria-label="듣기">🔊</button>
        <div class="sound-ko big">${esc(p.sound)}</div>`
      : `
        <p class="q">💬 이 말을 영어로 하면? ${ask}</p>
        <div class="quiz-ko">${esc(s.exKo)}</div>
        <p class="hint">${esc(s.ko)}</p>`}
    </div>
    <div class="options">${q.options.map((id, n) => {
      const cls = !answered ? '' : id === q.id ? 'right' : id === quiz.picked ? 'wrong' : 'dim';
      return `<button class="opt ${cls}" data-opt="${id}" ${answered ? 'disabled' : ''}><small>${n + 1}</small>${esc(BY_ID[id].phrase)}</button>`;
    }).join('')}</div>
    ${answered ? `
      <div class="panel quiz-feedback ${quiz.picked === q.id ? 'ok' : 'no'}">
        <p class="verdict">${quiz.picked === q.id ? '⭕ 맞았어요' : `❌ 정답은 <b>${esc(p.phrase)}</b>`}</p>
        <div class="ex">
          <button class="icon-btn small" data-say="${esc(s.ex)}" aria-label="예문 듣기">🔊</button>
          <div><div class="ex-en">${esc(s.ex)}</div><div class="ex-ko">${esc(s.exKo)}</div></div>
        </div>
        <p class="hint">${esc(p.chunk)} → <b class="lsound">${esc(p.sound)}</b> · ${esc(s.ko)}</p>
      </div>
      <button class="btn primary big" id="quizNext">${quiz.i + 1 < quiz.items.length ? '다음' : '결과 보기'}<small>Enter</small></button>` : ''}`;

  el.querySelector('#quizQuit').onclick = () => { quiz = null; render(); };
  el.querySelectorAll('[data-opt]').forEach(b => b.onclick = () => pickOption(b.dataset.opt));
  const nx = el.querySelector('#quizNext');
  if (nx) nx.onclick = nextQuestion;
  if (!answered && q.type === 'sound') speak(p.chunk);
}

function pickOption(id) {
  const q = quiz.items[quiz.i];
  quiz.picked = id;
  if (id !== q.id) quiz.wrong.push(q.id);
  render();
  speak(BY_ID[q.id].senses[q.sense].ex);
}

function nextQuestion() {
  quiz.i++;
  quiz.picked = null;
  render();
}

function drawQuizEnd(el) {
  const n = quiz.items.length, ok = n - quiz.wrong.length;
  el.innerHTML = `
    <div class="panel hero">
      <p class="done-msg">${ok === n ? '🎉 다 맞았어요!' : ok >= n * 0.7 ? '👍 잘했어요' : '💪 한 번 더 해 봐요'}</p>
      <div class="score"><b>${ok}</b> / ${n}</div>
      <p class="hint">${esc(quiz.title)}</p>
    </div>
    ${quiz.wrong.length ? `
      <div class="panel">
        <div class="panel-head"><h3>틀린 구동사</h3></div>
        <div class="rows flat">${quiz.wrong.map(id => {
          const p = BY_ID[id];
          return `<div class="lrow" data-id="${id}" role="button" tabindex="0">
            <span class="dot ${status(id)}"></span>
            <div class="lmain"><div><b>${esc(p.phrase)}</b> <span class="lsound">${esc(p.sound)}</span></div>
            <div class="hint">${esc(p.senses.map(s => s.ko).join(' / '))}</div></div>
          </div>`;
        }).join('')}</div>
        <button class="btn" id="wrongToReview">🔁 틀린 것 오늘 복습에 넣기</button>
      </div>` : ''}
    <div class="row">
      <button class="btn primary" id="quizAgain">다시 풀기</button>
      <button class="btn" id="quizBack">격자로 돌아가기</button>
    </div>`;

  el.querySelectorAll('[data-id]').forEach(r => r.onclick = () => openCard(r.dataset.id));
  const wr = el.querySelector('#wrongToReview');
  if (wr) wr.onclick = () => {
    quiz.wrong.forEach(id => { db.progress[id] = { ...prog(id), box: 1, due: today() }; });
    persist();
    wr.disabled = true;
    toast(`${quiz.wrong.length}개를 오늘 복습에 넣었어요.`);
  };
  el.querySelector('#quizAgain').onclick = () => startQuiz(quiz.title, quiz.pool, quiz.kind);
  el.querySelector('#quizBack').onclick = () => { quiz = null; render(); };
}

document.addEventListener('keydown', e => {
  if (tab !== 'grid' || !quiz || quiz.i >= quiz.items.length) return;
  if (document.querySelector('dialog[open]') || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
  if (quiz.picked === null && ['1', '2', '3', '4'].includes(e.key)) pickOption(quiz.items[quiz.i].options[+e.key - 1]);
  else if (quiz.picked !== null && (e.key === 'Enter' || e.code === 'Space')) { e.preventDefault(); nextQuestion(); }
});
