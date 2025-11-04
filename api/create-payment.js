// 파일: api/create-payment.js
export default async function handler(req, res) {
  // CORS 허용 (깃헙 페이지에서도 호출 가능)
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

    // 시트에서 상품 목록 재조회
    const url =
      process.env.PRODUCTS_URL ||
      'https://script.google.com/macros/s/AKfycbwX6UPs_IaiyaHGMBdRrwUzoaAoe5EjM0JifNgw4K7DNPDX84QPfvwh16YAs0KhaRfx-g/exec'; // 필요시 하드코딩
    const r = await fetch(url, { method: 'GET', cache: 'no-store' });
    if (!r.ok) throw new Error(`Apps Script error: ${r.status}`);
    const data = await r.json();
    if (!data.ok) throw new Error(data.error || 'products fetch failed');

    // 이름 또는 ID로 매칭 (select에 value 없는 경우 옵션 텍스트로 넘어옵니다)
    const items = Array.isArray(data.items) ? data.items : [];
    const product =
      items.find(it => String(it.id) === key) ||
      items.find(it => String(it.name) === key);

    if (!product) throw new Error(`상품을 찾을 수 없습니다: ${key}`);

    // 아직 PG 연동 전: 서버가 시트 기준 가격을 확정해서 돌려줌
    return res.status(200).json({
      ok: true,
      product,           // {id, name, price, desc}
      amount: product.price
      // 다음 단계에서: 이 금액으로 나이스페이 결제창 파라미터 생성 → 반환
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
