// api/create-payment.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });

  try {
    const { productKey } = req.body || {};
    if (!productKey) throw new Error('productKey is required');

    const url =
      process.env.PRODUCTS_URL ||
      'https://script.google.com/macros/s/AKfycbwX6UPs_IaiyaHGMBdRrwUzoaAoe5EjM0JifNgw4K7DNPDX84QPfvwh16YAs0KhaRfx-g/exec';

    const r = await fetch(url);
    if (!r.ok) throw new Error('Failed to fetch products');

    const data = await r.json();
    const items = data.items || [];

    const product =
      items.find(it => it.id === productKey) ||
      items.find(it => it.name === productKey);

    if (!product) throw new Error(`상품을 찾을 수 없습니다: ${productKey}`);

    return res.status(200).json({
      ok: true,
      product,
      amount: product.price,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
