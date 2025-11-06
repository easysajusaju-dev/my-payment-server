// api/products.js
export default async function handler(req, res) {
  // ✅ CORS 허용
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const url =
      process.env.PRODUCTS_URL ||
      'https://script.google.com/macros/s/AKfycbwX6UPs_IaiyaHGMBdRrwUzoaAoe5EjM0JifNgw4K7DNPDX84QPfvwh16YAs0KhaRfx-g/exec';

    const r = await fetch(url, { method: 'GET', cache: 'no-store' });
    if (!r.ok) throw new Error(`Apps Script error: ${r.status}`);

    const data = await r.json();
    if (!data.ok) throw new Error(data.error || 'products fetch failed');

    let items = Array.isArray(data.items) ? data.items : [];

    // ✅ category로 필터 (기존 랜딩폼 유지)
    const category = req.query.category;
    if (category) {
      items = items.filter(
        it => String(it.category).trim() === String(category).trim()
      );
    }

    // ✅ goodsName(상품명)으로 필터 (결제 서버에서 사용)
    // 예: /api/products?goodsName=종합사주
    const goodsName = req.query.goodsName;
    if (goodsName) {
      const target = String(goodsName).trim();
      items = items.filter(it => {
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


    return res.status(200).json({ ok: true, items });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}

