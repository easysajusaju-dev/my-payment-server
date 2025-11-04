// api/create-payment.js
export default async function handler(req, res) {
  // ✅ CORS 허용
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });

  try {
    const { productId, productKey, buyerName, phone } = req.body || {};
    const key = String(productId ?? productKey ?? '').trim();

    if (!key) throw new Error('상품값(productKey) 필요');

    // ✅ 한글 상품명 → 상품ID 매핑
    const NAME_TO_ID = {
      "종합사주 미니": "P001",
      "신년운세": "P002",
      "종합사주": "P003",
      "재물사주": "P004",
      "결혼사주": "P005",
      "연애사주": "P006",
      "연애패키지": "P007",
      "타이밍패키지": "P008",
      "인생패키지": "P009"
    };

    const normalizedKey = NAME_TO_ID[key] || key;

    // ✅ 상품 목록 다시 가져오기
    const url =
      process.env.PRODUCTS_URL ||
      'https://script.google.com/macros/s/AKfycbwX6UPs_IaiyaHGMBdRrwUzoaAoe5EjM0JifNgw4K7DNPDX84QPfvwh16YAs0KhaRfx-g/exec';

    const r = await fetch(url, { method: 'GET', cache: 'no-store' });
    if (!r.ok) throw new Error(`Apps Script error: ${r.status}`);

    const data = await r.json();
    if (!data.ok) throw new Error(data.error || '상품 조회 실패');

    const items = Array.isArray(data.items) ? data.items : [];

    // ✅ 상품 찾기 (ID 우선, 이름도 백업)
    const product =
      items.find(it => String(it.id) === normalizedKey) ||
      items.find(it => String(it.name) === key);

    if (!product) throw new Error(`상품을 찾을 수 없습니다: ${key}`);

    // ✅ Vercel 로그
    console.log("✅ 상품 확인 성공:", product);

    // ✅ 응답 (PG 파라미터는 다음 단계)
    return res.status(200).json({
      ok: true,
      product,
      buyerName,
      phone,
      amount: product.price
    });

  } catch (err) {
    console.error("❌ create-payment 오류:", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
