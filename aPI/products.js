// /api/products.js
export default async function handler(req, res) {
  try {
    const base = process.env.PRODUCTS_URL;
    if (!base) throw new Error('Missing PRODUCTS_URL');

    const url = new URL(base);
    const token = process.env.PRODUCTS_TOKEN || '';
    if (token) url.searchParams.set('token', token);

    const r = await fetch(url.toString(), { method: 'GET', cache: 'no-store' });
    if (!r.ok) throw new Error(`Apps Script error: ${r.status}`);
    const data = await r.json();

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ ok:false, error: err.message });
  }
}
