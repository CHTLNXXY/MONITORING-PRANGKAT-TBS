const { Redis } = require('@upstash/redis');

// Vercel's Upstash integration can inject either naming convention depending on
// when the database was created — support both so this works either way.
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = (REDIS_URL && REDIS_TOKEN) ? new Redis({ url: REDIS_URL, token: REDIS_TOKEN }) : null;

const KEY = 'tcn-stock-state-v1';          // data utama (tetap sama dengan versi lama, data lama aman)
const VER_KEY = KEY + ':version';          // nomor versi, naik setiap kali data disimpan
const BACKUP_KEY = KEY + ':backup:';       // backup harian: tcn-stock-state-v1:backup:YYYY-MM-DD
const BACKUP_DAYS = 14;

// Simpan hanya kalau versi di server masih sama dengan versi yang dibaca klien.
// Kalau ada orang lain yang menyimpan lebih dulu, simpan ditolak (409) supaya data tidak saling timpa.
const SAVE_SCRIPT = `
local cur = tonumber(redis.call('GET', KEYS[2]) or '0')
local base = tonumber(ARGV[2])
if base ~= -1 and base ~= cur then
  return {0, cur}
end
redis.call('SET', KEYS[1], ARGV[1])
local nv = redis.call('INCR', KEYS[2])
return {1, nv}
`;

function todayKey() {
  // tanggal di zona WIB (UTC+7)
  const d = new Date(Date.now() + 7 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

async function readState() {
  const [data, ver] = await Promise.all([redis.get(KEY), redis.get(VER_KEY)]);
  return { value: data || null, version: Number(ver) || 0 };
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!redis) {
    res.status(500).json({
      error: 'Environment variable database Redis belum ditemukan (KV_REST_API_URL/TOKEN atau UPSTASH_REDIS_REST_URL/TOKEN). Pastikan database sudah di-Connect ke project ini di dashboard Vercel, lalu redeploy.'
    });
    return;
  }

  // Opsional: kunci aplikasi dengan PIN. Isi env APP_PIN di Vercel untuk mengaktifkan.
  const PIN = process.env.APP_PIN;
  if (PIN && req.headers['x-app-pin'] !== PIN) {
    res.status(401).json({ error: 'PIN salah atau belum diisi', needPin: true });
    return;
  }

  try {
    if (req.method === 'GET') {
      const url = new URL(req.url, 'http://x');
      const since = url.searchParams.get('since');
      if (since !== null) {
        // cek ringan: hanya kirim data kalau versinya berubah
        const ver = Number(await redis.get(VER_KEY)) || 0;
        if (String(ver) === since) {
          res.status(200).json({ changed: false, version: ver });
          return;
        }
      }
      const st = await readState();
      res.status(200).json({ changed: true, ...st });
      return;
    }

    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) {
          res.status(400).json({ error: 'Body bukan JSON yang valid' });
          return;
        }
      }
      if (!body || typeof body !== 'object') {
        res.status(400).json({ error: 'Body kosong atau tidak valid' });
        return;
      }
      // Format baru: {value, baseVersion}. Format lama (seluruh body = data) tetap diterima.
      const isNew = Object.prototype.hasOwnProperty.call(body, 'value') && Object.prototype.hasOwnProperty.call(body, 'baseVersion');
      const value = isNew ? body.value : body;
      const base = isNew && body.baseVersion !== null ? Number(body.baseVersion) : -1;
      if (!value || typeof value !== 'object' || !Array.isArray(value.realStok)) {
        res.status(400).json({ error: 'Struktur data tidak valid (realStok tidak ditemukan)' });
        return;
      }

      // Backup harian sebelum data ditimpa (sekali per hari)
      const bKey = BACKUP_KEY + todayKey();
      try {
        const exists = await redis.exists(bKey);
        if (!exists) {
          const old = await redis.get(KEY);
          if (old) await redis.set(bKey, old, { ex: BACKUP_DAYS * 86400 });
        }
      } catch (e) { console.warn('backup gagal', e); }

      const result = await redis.eval(SAVE_SCRIPT, [KEY, VER_KEY], [JSON.stringify(value), String(base)]);
      const ok = Number(result[0]) === 1;
      const version = Number(result[1]);
      if (!ok) {
        const st = await readState();
        res.status(409).json({ error: 'Data sudah diubah pengguna lain', conflict: true, ...st });
        return;
      }
      res.status(200).json({ ok: true, version });
      return;
    }

    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({ error: 'Method tidak diizinkan' });
  } catch (err) {
    console.error('Error di /api/state:', err);
    res.status(500).json({
      error: 'Terjadi kesalahan di server. Pastikan database Redis sudah dihubungkan ke project ini lewat Vercel Marketplace.',
      detail: String(err && err.message ? err.message : err)
    });
  }
};
