/**
 * Koneksi SQLite untuk sesi WhatsApp TANPA modul native (better-sqlite3).
 *
 * better-sqlite3 harus di-compile saat "npm install" dan sering gagal di
 * panel / VPS (tidak ada python, make, g++) atau saat versi Node berganti.
 * Sebagai gantinya:
 *   - Node 22.13+ : node:sqlite, sudah bawaan Node
 *   - Node 20     : node-sqlite3-wasm, SQLite versi WebAssembly (tanpa build)
 *
 * Keduanya membaca/menulis file .sqlite yang sama, jadi sesi lama tetap bisa
 * dipakai walau versi Node diganti.
 */
import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

/** Buka node:sqlite kalau versi Node ini punya (tanpa memunculkan ExperimentalWarning) */
function bukaNodeSqlite(file) {
  const asli = process.emitWarning;
  process.emitWarning = (warning, ...sisa) => {
    if (String(warning?.message ?? warning).includes('SQLite')) return;
    return asli.call(process, warning, ...sisa);
  };

  let DatabaseSync;
  try {
    ({ DatabaseSync } = require('node:sqlite'));
  } catch {
    return null; // Node 20 / Node 22 lama: tidak ada node:sqlite
  } finally {
    process.emitWarning = asli;
  }

  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA busy_timeout=5000;');

  return {
    driver: 'node:sqlite',
    db,
    prepare: (sql) => {
      const stmt = db.prepare(sql);
      return {
        run: (params) => stmt.run(...params),
        get: (params) => stmt.get(...params),
        all: (params) => stmt.all(...params),
        finalize() {},
      };
    },
  };
}

/** Buka SQLite versi WebAssembly, jalan di Node 20 ke atas tanpa build apa pun */
function bukaWasmSqlite(file) {
  const { Database } = require('node-sqlite3-wasm');

  // Versi WASM mengunci database dengan folder "<file>.lock". Kalau bot
  // dimatikan paksa (tombol Stop/Restart panel), folder itu tertinggal dan
  // database dianggap terkunci selamanya. Sesi hanya dipakai satu proses bot,
  // jadi kunci yang ada saat start pasti sisa proses sebelumnya.
  fs.rmSync(`${file}.lock`, { recursive: true, force: true });

  const db = new Database(file);

  // Versi WASM tidak punya shared memory untuk mode WAL. Dengan locking_mode
  // EXCLUSIVE, file WAL peninggalan better-sqlite3 tetap bisa dibaca, lalu
  // diubah ke journal biasa supaya aman.
  db.exec('PRAGMA locking_mode=EXCLUSIVE; PRAGMA journal_mode=DELETE; PRAGMA synchronous=NORMAL;');

  return {
    driver: 'node-sqlite3-wasm',
    db,
    prepare: (sql) => {
      const stmt = db.prepare(sql);
      const nilai = (params) => (params.length ? params : undefined);
      return {
        run: (params) => stmt.run(nilai(params)),
        get: (params) => stmt.get(nilai(params)),
        all: (params) => stmt.all(nilai(params)),
        finalize: () => stmt.finalize(),
      };
    },
  };
}

/**
 * Buka file SQLite dan kembalikan objek koneksi yang diterima
 * createSqliteStore({ connection }) dari @zapo-js/store-sqlite.
 */
export function openSqlite(file) {
  // SQLITE_DRIVER=wasm memaksa versi WASM (mis. untuk menguji perilaku Node 20)
  const pakaiWasm = process.env.SQLITE_DRIVER === 'wasm';
  const { driver, db, prepare } = (!pakaiWasm && bukaNodeSqlite(file)) || bukaWasmSqlite(file);

  const cache = new Map();
  let tertutup = false;
  let antrian = Promise.resolve();

  const statement = (sql) => {
    if (tertutup) throw new Error('sqlite connection is closed');
    let stmt = cache.get(sql);
    if (!stmt) {
      stmt = prepare(sql);
      cache.set(sql, stmt);
    }
    return stmt;
  };

  const rollback = () => {
    try {
      db.exec('ROLLBACK');
    } catch {
      // tidak ada transaksi yang aktif
    }
  };

  return {
    driver,
    exec(sql) {
      if (tertutup) throw new Error('sqlite connection is closed');
      db.exec(sql);
    },
    run(sql, params = []) {
      statement(sql).run(params);
    },
    get(sql, params = []) {
      return statement(sql).get(params) ?? null;
    },
    all(sql, params = []) {
      const rows = statement(sql).all(params);
      return Array.isArray(rows) ? rows : [];
    },
    // Transaksi dijalankan berurutan, callback wajib sinkron (sama seperti store aslinya)
    runInTransaction(fn) {
      const hasil = antrian.then(() => {
        db.exec('BEGIN');
        try {
          const nilai = fn();
          if (nilai && typeof nilai.then === 'function') {
            throw new Error('sqlite transaction callback must be synchronous');
          }
          db.exec('COMMIT');
          return nilai;
        } catch (error) {
          rollback();
          throw error;
        }
      });
      antrian = hasil.catch(() => {});
      return hasil;
    },
    close() {
      if (tertutup) return;
      tertutup = true;
      for (const stmt of cache.values()) stmt.finalize();
      cache.clear();
      db.close();
    },
  };
}
