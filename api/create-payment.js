// 파일: api/create-payment.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  try {
    const { productId, productKey } = req.body || {};
    const key = String(productId ?? productKey ?? '').trim();
    if (!key) throw new Error('productKey is required');

    // 상품 목록 가져오기
    const url =
      process.env.PRODUCTS_URL ||
      'https://script.google.com/macros/s/AKfycbwX6UPs_IaiyaHGMBdRrwUzoaAoe5EjM0JifNgw4K7DNPDX84QPfvwh16YAs0KhaRfx-g/exec';

    const r = await fetch(url, { method: 'GET', cache: 'no-store' });
    if (!r.ok) throw new Error(`Apps Script error: ${r.status}`);
    
    const data = await r.json();
    if (!data.ok) throw new Error(data.error || 'products fetch failed');

    const items = Array.isArray(data.items) ? data.items : [];

    // ✅ name으로만 매칭
    const product = items.find(it => String(it.name).trim() === key);

    if (!product) throw new Error(`상품을 찾을 수 없습니다: ${key}`);

    return res.status(200).json({
      ok: true,
      product,
      amount: product.price
    });

  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
