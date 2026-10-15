// 소리 규칙

RENDER.sounds = el => {
  el.innerHTML = `
    ${subNav('sounds')}
    <div class="panel">
      <p>원어민 말이 안 들리는 건 단어를 몰라서보다 <b>소리가 철자와 달라서</b>인 경우가 많아요.
      아래 여섯 가지만 알아도 구동사 대부분이 설명돼요.</p>
      <p class="hint">🔊 읽어주기는 기기 음성이라 실제 원어민보다 덜 뭉개져요. 한글 표기를 보면서 "이렇게 들리는구나"를 먼저 익히고, 영상에서 실제 소리를 확인해 보세요.</p>
    </div>
    ${Object.entries(SOUND_RULES).map(([k, R]) => {
      const cards = ALL.filter(p => p.rules.includes(k));
      return `
      <div class="panel rule-card">
        <div class="panel-head"><h3>${R.emoji} ${esc(R.name)}</h3><span class="chip">${cards.length}개 카드</span></div>
        <p>${esc(R.what)}</p>
        <p class="hint">👉 ${esc(R.how)}</p>
        <div class="rule-ex">${R.ex.map(([en, ko]) => `
          <button class="ex-pill" data-say="${esc(en)}">🔊 <b>${esc(en)}</b> <span>${esc(ko)}</span></button>`).join('')}
        </div>
        ${cards.length ? `<div class="rule-cards">${cards.slice(0, 16).map(p =>
          `<button class="chip" data-id="${p.id}">${esc(p.chunk)} · ${esc(p.sound)}</button>`).join('')}${
          cards.length > 16 ? `<span class="hint">외 ${cards.length - 16}개</span>` : ''}</div>` : ''}
      </div>`;
    }).join('')}`;
  el.querySelectorAll('[data-id]').forEach(b => b.onclick = () => openCard(b.dataset.id));
};
