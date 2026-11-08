/* ================= local database (IndexedDB, fallback localStorage) ================= */
const KV = {
  db:null,
  open() {
    return new Promise(res => {
      try {
        const r = indexedDB.open('podhod', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('kv');
        r.onsuccess = () => { this.db = r.result; res(true); };
        r.onerror = () => res(false); r.onblocked = () => res(false);
      } catch (e) { res(false); }
    });
  },
  get(k) {
    return new Promise(res => {
      if (!this.db) { try { res(JSON.parse(localStorage.getItem('podhod:' + k) || 'null')); } catch (e) { res(null); } return; }
      try { const q = this.db.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result ?? null); q.onerror = () => res(null); } catch (e) { res(null); }
    });
  },
  set(k, v) {
    return new Promise(res => {
      if (!this.db) { try { localStorage.setItem('podhod:' + k, JSON.stringify(v)); res(true); } catch (e) { res(false); } return; }
      try { const tx = this.db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = () => res(true); tx.onerror = () => res(false); } catch (e) { res(false); }
    });
  },
  del(k) {
    return new Promise(res => {
      if (!this.db) { try { localStorage.removeItem('podhod:' + k); } catch (e) { /* ignore */ } res(true); return; }
      try { const tx = this.db.transaction('kv', 'readwrite'); tx.objectStore('kv').delete(k); tx.oncomplete = () => res(true); tx.onerror = () => res(false); } catch (e) { res(false); }
    });
  },
};

