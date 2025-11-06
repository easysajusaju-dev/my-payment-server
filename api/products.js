// api/products.js
export default async function handler(req, res) {
  // ✅ CORS 허용
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const url = process.env.PRODUCTS_URL 
      || 'https://script.google.com/macros/s/AKfycbwX6UPs_IaiyaHGMBdRrwUzoaAoe5EjM0JifNgw4K7DNPDX84QPfvwh16YAs0KhaRfx-g/exec';

    const r = await fetch(url, { method: 'GET', cache: 'no-store' });
    if (!r.ok) throw new Error(`Apps Script error: ${r.status}`);

    const data = await r.json();
    if (!data.ok) throw new Error(data.error || 'products fetch failed');

    let items = Array.isArray(data.items) ? data.items : [];

    // ✅ URL 파라미터에서 category 읽기 (기존)
    const category = req.query.category;
    if (category) {
      items = items.filter(it => String(it.category).trim() === String(category).trim());
    }

    // ✅ URL 파라미터에서 goodsName 읽기 (새로 추가)
    // 예: /api/products?goodsName=사주상담A
    const goodsName = req.query.goodsName;
    if (goodsName) {
      const target = String(goodsName).trim();
      items = items.filter(it => {
        // 가능한 필드명들로 비교: name, goodsName, productName 등 (내부 데이터 형식에 맞춰 확장)
        const candidates = [
          it.name,
          it.goodsName,
          it.productName,
          it.title
        ].filter(Boolean);
        return candidates.some(c => String(c).trim() === target);
      });
    }

    return res.status(200).json({ ok: true, items });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}

