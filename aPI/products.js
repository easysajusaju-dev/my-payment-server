export default async function handler(req, res) {
  try {
    const url = process.env.PRODUCTS_URL;
    if (!url) throw new Error('Missing PRODUCTS_URL');
    const r = await fetch(url, { method: 'GET', cache: 'no-store' });
    if (!r.ok) throw new Error(`Apps Script error: ${r.status}`);
    const data = await r.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}
