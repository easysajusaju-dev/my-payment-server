// /api/products/route.js
export async function GET() {
  try {
    // ✅ 상품조회용 Apps Script 주소 (Saju-Products-API)
    const url = "https://script.google.com/macros/s/AKfycbwX6UPs_IaiyaHGMBdRrwUzoaAoe5EjM0JifNgw4K7DNPDX84QPfvwh16YAs0KhaRfx-g/exec";

    const res = await fetch(url);
    const text = await res.text();

    if (!text.startsWith("{")) throw new Error("Invalid JSON: " + text.slice(0, 100));
    const data = JSON.parse(text);

    return Response.json(data);
  } catch (err) {
    console.error("products error:", err);
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
