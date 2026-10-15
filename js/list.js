// 전체 목록 · 검색

let listQ = '', listF = 'all', listLv = 0;

RENDER.list = el => {
  if (!el.querySelector('#listSearch')) {
    el.innerHTML = `
      ${subNav('list')}
      <div class="list-tools">
        <input type="search" id="listSearch" placeholder="구동사·뜻·소리로 찾기 (예: 끊다, 피키럽)" autocomplete="off">
        <div class="seg small" id="listFilter">
          <button data-f="all">전체</button><button data-f="new">🆕 새</button>
          <button data-f="learning">🌱 익히는 중</button><button data-f="known">✅ 익힘</button><button data-f="star">⭐</button><button data-f="work">💼 업무</button>
        </div>
        <div class="seg small" id="listLevel">
          <button data-lv="0">빈도 전체</button><button data-lv="1">●●● 필수</button>
          <button data-lv="2">●●○ 자주</button><button data-lv="3">●○○ 알면 좋은</button>
        </div>
      </div>
      <p class="hint" id="listCount"></p>
      <div id="listRows" class="rows"></div>`;
    el.querySelector('#listSearch').oninput = e => { listQ = e.target.value.trim().toLowerCase(); drawRows(el); };
    el.querySelector('#listFilter').onclick = e => { const b = e.target.closest('button'); if (b) { listF = b.dataset.f; drawRows(el); } };
    el.querySelector('#listLevel').onclick = e => { const b = e.target.closest('button'); if (b) { listLv = +b.dataset.lv; drawRows(el); } };
    el.querySelector('#listRows').onclick = e => {
      const r = e.target.closest('[data-id]');
      if (r && !e.target.closest('[data-say]')) openCard(r.dataset.id);
    };
  }
  drawRows(el);
};

function drawRows(el) {
  el.querySelectorAll('#listFilter button').forEach(b => b.classList.toggle('on', b.dataset.f === listF));
  el.querySelectorAll('#listLevel button').forEach(b => b.classList.toggle('on', +b.dataset.lv === listLv));
  const rows = ALL.filter(p => {
    if (listLv && p.level !== listLv) return false;
    if (listF === 'star' ? !db.starred[p.id] : listF === 'work' ? p.ctx !== 'work' : listF !== 'all' && status(p.id) !== listF) return false;
    if (!listQ) return true;
    const hay = [p.phrase, p.chunk, p.sound, p.tip, ...p.senses.flatMap(s => [s.ko, s.ex, s.exKo])].join(' ').toLowerCase();
    return hay.includes(listQ);
  });
  el.querySelector('#listCount').textContent = `${rows.length}개`;
  el.querySelector('#listRows').innerHTML = rows.map(p => `
    <div class="lrow" data-id="${p.id}" role="button" tabindex="0">
      <span class="dot ${status(p.id)}"></span>
      <div class="lmain">
        <div><b>${esc(p.phrase)}</b> ${db.starred[p.id] ? '⭐' : ''} <span class="lsound">${esc(p.sound)}</span></div>
        <div class="hint">${esc(p.senses.map(s => s.ko).join(' / '))}</div>
      </div>
      <button class="icon-btn small" data-say="${esc(p.chunk)}" aria-label="듣기">🔊</button>
    </div>`).join('') || '<p class="hint">찾는 표현이 없어요.</p>';
}
