export default async function handler(req, res) {
  try {
    const url = process.env.https://script.google.com/macros/s/AKfycbwX6UPs_IaiyaHGMBdRrwUzoaAoe5EjM0JifNgw4K7DNPDX84QPfvwh16YAs0KhaRfx-g/exec;
    if (!url) throw new Error('Missing PRODUCTS_URL');
    const r = await fetch(url, { method: 'GET', cache: 'no-store' });
    if (!r.ok) throw new Error(`Apps Script error: ${r.status}`);
    const data = await r.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}
