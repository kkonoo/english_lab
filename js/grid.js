// 핵심동사 × 불변사 격자

const CORE_VERBS = ['get', 'take', 'go', 'come', 'make', 'look', 'put', 'bring', 'work', 'turn', 'give', 'set',
  'pick', 'break', 'hang', 'figure', 'cut', 'show', 'keep', 'hold', 'call', 'run', 'fall'];
let gridMode = 'core', gridParticle = 'up', gridOnly1 = false; // core | all | work

const byParticle = k => ALL.filter(p => p.particle.split(' ')[0] === k);
const byVerb = v => ALL.filter(p => p.verb === v);

RENDER.grid = el => {
  if (quiz) return drawQuiz(el);
  const inMode = p => gridMode !== 'work' || p.ctx === 'work';
  const verbs = [...new Set(ALL.filter(inMode).map(p => p.verb))]
    .filter(v => gridMode !== 'core' || CORE_VERBS.includes(v));
  const cols = [...GRID_PARTICLES, '기타'];
  const cell = (v, col) => ALL.filter(p => p.verb === v && inMode(p) && (
    col === '기타' ? !GRID_PARTICLES.includes(p.particle.split(' ')[0]) : p.particle.split(' ')[0] === col));
  const pt = PARTICLES[gridParticle];

  el.innerHTML = `
    ${subNav('grid')}
    <div class="panel particle-note">
      <div class="pchips">${Object.keys(PARTICLES).map(k =>
        `<button class="chip ${k === gridParticle ? 'on' : ''}" data-p="${k}">${k}</button>`).join('')}</div>
      <p><span class="pimg">${pt.img}</span> <b>${gridParticle}</b> = ${esc(pt.core)}</p>
      <p class="hint">${esc(pt.hint)}</p>
      ${byParticle(gridParticle).length >= 4
        ? `<button class="btn primary" id="colQuizBtn">🎯 ${gridParticle} 퀴즈 (${byParticle(gridParticle).length}개 중)</button>`
        : `<p class="hint">${gridParticle} 구동사는 아직 퀴즈를 낼 만큼 많지 않아요.</p>`}
    </div>
    <div class="grid-tools">
      <div class="legends">
        <div class="legend"><span class="lg-label">색 = 진도</span>
          <span class="dot new"></span>새 카드 <span class="dot learning"></span>익히는 중 <span class="dot known"></span>익힘</div>
        <div class="legend"><span class="lg-label">크기 = 빈도</span>
          <span class="fdot f1"></span>필수 <span class="fdot f2"></span>자주 <span class="fdot f3"></span>알면 좋은</div>
      </div>
      <div class="row">
        <div class="seg small">
          <button class="${gridOnly1 ? '' : 'on'}" data-only1="0">빈도 전체</button>
          <button class="${gridOnly1 ? 'on' : ''}" data-only1="1">필수만</button>
        </div>
        <div class="seg small">
          <button class="${gridMode === 'core' ? 'on' : ''}" data-mode="core">핵심 동사</button>
          <button class="${gridMode === 'all' ? 'on' : ''}" data-mode="all">전체 동사</button>
          <button class="${gridMode === 'work' ? 'on' : ''}" data-mode="work">💼 업무·연구</button>
        </div>
      </div>
    </div>
    <div class="grid-wrap">
      <table class="pgrid ${gridOnly1 ? 'only1' : ''}">
        <thead><tr><th></th>${cols.map(c => `<th class="${c === gridParticle ? 'hl' : ''}" data-p="${c}">${c}</th>`).join('')}</tr></thead>
        <tbody>${verbs.map(v => `
          <tr><th class="vhead" data-verb="${v}" title="${v} 퀴즈">${v}${byVerb(v).length >= 4 ? ' <span class="qmark">🎯</span>' : ''}</th>${cols.map(c => `
            <td class="${c === gridParticle ? 'hl' : ''}">${cell(v, c).map(p => `
              <button class="cellbtn ${status(p.id)} f${p.level}" data-id="${p.id}" title="${esc(p.phrase)} · ${esc(p.senses[0].ko)}">${
                esc(c === '기타' || p.particle.includes(' ') ? p.particle : '')}</button>`).join('')}</td>`).join('')}
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <p class="hint">원을 누르면 카드가 열려요. 칸 위의 불변사를 누르면 핵심 이미지가 나오고, 🎯가 붙은 동사 이름을 누르면 그 동사 퀴즈가 시작돼요.</p>`;

  el.querySelectorAll('[data-p]').forEach(b => b.onclick = () => {
    if (PARTICLES[b.dataset.p]) { gridParticle = b.dataset.p; render(); }
  });
  el.querySelectorAll('[data-only1]').forEach(b => b.onclick = () => { gridOnly1 = b.dataset.only1 === '1'; render(); });
  el.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { gridMode = b.dataset.mode; render(); });
  const cq = el.querySelector('#colQuizBtn');
  if (cq) cq.onclick = () => startQuiz(`${gridParticle} 퀴즈`, byParticle(gridParticle), 'particle');
  el.querySelectorAll('.vhead').forEach(h => h.onclick = () => {
    const pool = byVerb(h.dataset.verb);
    if (pool.length >= 4) startQuiz(`${h.dataset.verb} 퀴즈`, pool, 'verb');
  });
  el.querySelectorAll('.cellbtn').forEach(b => b.onclick = () => openCard(b.dataset.id));
};
