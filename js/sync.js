// Google 로그인 + Firestore 동기화
// users/{uid}/progress/{카드 id}  → { box, due, lapses, seen, t }   카드마다 문서 하나, 나중에 바뀐 쪽이 이겨요
// users/{uid}/meta/state          → { settings, starred, log, shadow, links, notes, t }
import { firebaseConfig } from './firebase-config.js';

const V = '12.19.0';
const btn = document.getElementById('accountBtn');

if (!firebaseConfig) {
  btn.hidden = true;
} else {
  start().catch(err => {
    console.error(err);
    toast('동기화를 시작하지 못했어요. 이 기기에만 저장돼요.');
  });
}

async function start() {
  const [{ initializeApp }, A, F] = await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`),
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`),
  ]);
  await dbReady;
  const fb = initializeApp(firebaseConfig);
  const auth = A.getAuth(fb);
  const fs = F.initializeFirestore(fb, {
    localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }),
  });

  let user = null, unsubs = [], sent = {}, sentMeta = '', applying = false;
  const clean = v => JSON.parse(JSON.stringify(v));
  const metaOf = d => JSON.stringify({ settings: d.settings, starred: d.starred, log: d.log, shadow: d.shadow, links: d.links, notes: d.notes });

  btn.hidden = false;
  drawBtn();
  btn.onclick = async () => {
    if (!user) {
      try { await A.signInWithPopup(auth, new A.GoogleAuthProvider()); }
      catch (e) {
        if (!['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(e.code)) toast('로그인하지 못했어요. 다시 시도해 주세요.');
      }
    } else if (confirm(`${user.email}에서 로그아웃할까요? 기록은 이 기기에도 남아 있어요.`)) {
      await A.signOut(auth);
    }
  };

  A.onAuthStateChanged(auth, u => {
    user = u;
    drawBtn();
    unsubs.forEach(f => f()); unsubs = [];
    if (u) connect(u.uid);
  });

  function drawBtn() {
    if (user) {
      btn.className = 'avatar';
      btn.textContent = (user.displayName || user.email || '?').trim()[0].toUpperCase();
      btn.title = `${user.email} · 동기화 중`;
    } else {
      btn.className = 'btn';
      btn.textContent = '로그인';
      btn.title = '로그인하면 폰과 PC에서 같은 기록을 볼 수 있어요';
    }
  }

  function connect(uid) {
    const progCol = F.collection(fs, 'users', uid, 'progress');
    const metaDoc = F.doc(fs, 'users', uid, 'meta', 'state');
    let firstProg = true, firstMeta = true;

    unsubs.push(F.onSnapshot(progCol, snap => {
      const db = window.app.db;
      let changed = false;
      snap.docChanges().forEach(ch => {
        if (ch.type === 'removed') return;
        const r = ch.doc.data(), id = ch.doc.id, l = db.progress[id];
        if (!l || (r.t || 0) > (l.t || 0)) {
          db.progress[id] = { box: r.box, due: r.due, lapses: r.lapses || 0, seen: r.seen || 0, t: r.t || 0 };
          changed = true;
        }
        sent[id] = JSON.stringify(db.progress[id]);
      });
      if (firstProg) { firstProg = false; upload(uid); }
      if (changed) applyRemote();
    }));

    unsubs.push(F.onSnapshot(metaDoc, snap => {
      const db = window.app.db;
      const r = snap.data();
      if (r) {
        const mine = JSON.parse(metaOf(db));
        // 공부 기록은 날짜별로 큰 값을 남기고, 설정·즐겨찾기는 나중에 바꾼 쪽을 따라요
        const log = { ...mine.log };
        Object.entries(r.log || {}).forEach(([d, v]) => {
          const m = log[d] || { reviewed: 0, learned: 0 };
          log[d] = { reviewed: Math.max(m.reviewed, v.reviewed || 0), learned: Math.max(m.learned, v.learned || 0) };
        });
        db.log = log;
        if ((r.t || 0) > (db.metaT || 0)) {
          db.settings = { ...db.settings, ...(r.settings || {}) };
          db.starred = r.starred || {};
          db.shadow = r.shadow || db.shadow || {};
          db.links = r.links || db.links || {};
          db.metaT = r.t;
        }
        // 내 표현은 항목마다 나중에 바뀐 쪽을 남겨요 (지운 것도 표시로 남김)
        const notes = { ...(db.notes || {}) };
        Object.entries(r.notes || {}).forEach(([id, v]) => { if (!notes[id] || (v.t || 0) > (notes[id].t || 0)) notes[id] = v; });
        db.notes = notes;
        sentMeta = JSON.stringify(notes) === JSON.stringify(r.notes || {}) ? metaOf(db) : '';
        applyRemote();
        if (!sentMeta) upload(uid);
      }
      if (firstMeta) { firstMeta = false; upload(uid); }
    }));

    window.onSave = () => { if (!applying) upload(uid); };
  }

  function applyRemote() {
    applying = true;
    window.app.persist();
    applying = false;
    window.app.render();
  }

  let timer;
  function upload(uid) {
    clearTimeout(timer);
    timer = setTimeout(() => doUpload(uid).catch(e => console.error(e)), 600);
  }

  async function doUpload(uid) {
    if (!user || user.uid !== uid) return;
    const db = window.app.db, now = Date.now();
    const ids = Object.keys(db.progress).filter(id => JSON.stringify(db.progress[id]) !== sent[id]);
    for (let i = 0; i < ids.length; i += 400) {
      const b = F.writeBatch(fs);
      ids.slice(i, i + 400).forEach(id => {
        const rec = { ...db.progress[id], t: Math.max(now, (db.progress[id].t || 0) + 1) };
        db.progress[id] = rec;
        sent[id] = JSON.stringify(rec);
        b.set(F.doc(fs, 'users', uid, 'progress', id), clean(rec));
      });
      await b.commit();
    }
    const meta = metaOf(db), metaChanged = meta !== sentMeta;
    if (metaChanged) {
      db.metaT = now;
      sentMeta = meta;
      await F.setDoc(F.doc(fs, 'users', uid, 'meta', 'state'), clean({ ...JSON.parse(meta), t: now }));
    }
    if (ids.length || metaChanged) { applying = true; window.app.persist(); applying = false; }
  }
}
