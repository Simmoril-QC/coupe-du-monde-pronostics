// Shim API-compat avec node:sqlite (DatabaseSync) basé sur sql.js (SQLite WASM).
// Permet de faire tourner le serveur sur Node >= 18 (sans node:sqlite),
// notamment sur DSM 7.x (glibc 2.26) / armv7.
//
// Usage :
//   const { DatabaseSync } = require('./sqlite-shim');
//   const db = await DatabaseSync.open(DB_PATH);
//   db.exec('CREATE TABLE ...');
//   const stmt = db.prepare('SELECT * FROM t WHERE x = ?');
//   stmt.get(1); stmt.all(); stmt.run(1);
//
// Persistance : réécriture du fichier après chaque écriture (debounce 300 ms)
// + persistance forcée au process.exit / SIGINT / SIGTERM.
'use strict';

const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

let sqlReady = null;
const openDbs = [];

function loadSql() {
  if (sqlReady) return sqlReady;
  sqlReady = initSqlJs({
    locateFile: (f) => path.join(__dirname, 'node_modules', 'sql.js', 'dist', f),
  });
  return sqlReady;
}

function persist(db) {
  if (db._db && db._file) {
    try {
      fs.writeFileSync(db._file, Buffer.from(db._db.export()));
    } catch (e) {
      console.error('❌ persistance SQLite impossible:', e.message);
    }
  }
}

class DatabaseSync {
  constructor(file) {
    this._file = file;
    this._db = null;
    this._timer = null;
    this._ready = (async () => {
      const S = await loadSql();
      if (file && fs.existsSync(file) && fs.statSync(file).size > 0) {
        const buf = fs.readFileSync(file);
        this._db = new S.Database(new Uint8Array(buf));
      } else {
        this._db = new S.Database();
      }
      return this;
    })();
    openDbs.push(this);
  }

  static async open(file) {
    const db = new DatabaseSync(file);
    await db._ready;
    return db;
  }

  _d() {
    if (!this._db) throw new Error('DB pas encore prête — utiliser await DatabaseSync.open(path)');
    return this._db;
  }

  _persistSoon() {
    if (this._timer) return;
    this._timer = setTimeout(() => {
      this._timer = null;
      persist(this);
    }, 300);
    if (this._timer.unref) this._timer.unref();
  }

  exec(sql) {
    // PRAGMA journal_mode n'existe pas dans sql.js (WASM) -> ignoré
    const cleaned = sql.replace(/^\s*PRAGMA\s+[^;]*;\s*$/gim, '').trim();
    if (!cleaned) return;
    this._d().exec(cleaned);
    this._persistSoon();
  }

  prepare(sql) {
    const self = this;
    const stmt = {
      _s: null,
      _norm(args) {
        if (args.length === 0) return null;
        const a = Array.from(args);
        for (let i = 0; i < a.length; i++) if (a[i] === undefined) a[i] = null;
        return a;
      },
      get(...args) {
        const s = self._d().prepare(sql);
        const v = stmt._norm(args);
        if (v) s.bind(v); else s.reset();
        const row = s.step() ? s.getAsObject() : undefined;
        s.free();
        return row;
      },
      all(...args) {
        const s = self._d().prepare(sql);
        const v = stmt._norm(args);
        if (v) s.bind(v); else s.reset();
        const out = [];
        while (s.step()) out.push(s.getAsObject());
        s.free();
        return out;
      },
      run(...args) {
        const d = self._d();
        const v = stmt._norm(args);
        // db.run(sql, params) exécute directement avec paramètres (placeholders ?)
        d.run(sql, v || []);
        const changes = d.getRowsModified();
        const id = d.exec('SELECT last_insert_rowid() AS id')[0]?.values?.[0]?.[0] ?? 0;
        self._persistSoon();
        return { changes, lastInsertRowid: id };
      },
    };
    return stmt;
  }

  close() {
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    persist(this);
    if (this._db) { this._db.close(); this._db = null; }
  }
}

// Persistance forcée à la sortie (exit est synchrone : writeFileSync ok)
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    for (const db of openDbs) { try { persist(db); } catch {} }
    process.exit(0);
  });
}
process.on('exit', () => {
  for (const db of openDbs) { try { persist(db); } catch {} }
});

module.exports = { DatabaseSync };
