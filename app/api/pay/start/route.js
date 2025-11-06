// app/api/pay/start/route.js

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// ✅ OPTIONS (CORS Preflight) 처리
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

// ✅ POST 처리
export async function POST(req) {
  try {
    const body = await req.json();
    const { orderId, goodsName, returnUrl } = body || {};

    if (!goodsName) {
      const res = new Response(
        JSON.stringify({ ok: false, error: "상품명이 누락되었습니다." }),
        { status: 400 }
      );
      Object.entries(corsHeaders).forEach(([k, v]) => res.headers.append(k, v));
      return res;
    }

    // ✅ 시트에서 검증
    const base =
      process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ||
      "https://my-payment-server.vercel.app";

    const verifyRes = await fetch(`${base}/api/pay/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goodsName }),
    });

    const verifyData = await verifyRes.json();
    if (!verifyData.ok) {
      const res = new Response(
        JSON.stringify({
          ok: false,
          error: "상품 검증 실패",
          detail: verifyData,
        }),
        { status: 400 }
      );
      Object.entries(corsHeaders).forEach(([k, v]) => res.headers.append(k, v));
      return res;
    }

    const verifiedAmount = Number(verifyData.verifiedAmount);
    if (!verifiedAmount) {
      const res = new Response(
        JSON.stringify({ ok: false, error: "금액 오류" }),
        { status: 400 }
      );
      Object.entries(corsHeaders).forEach(([k, v]) => res.headers.append(k, v));
      return res;
    }

    // ✅ NICEPAY 결제 요청
    const payload = {
      amount: verifiedAmount,
      orderId,
      goodsName,
      returnUrl:
        returnUrl ||
        process.env.DEFAULT_RETURN_URL ||
        `${base}/api/pay/callback`,
    };

    const rsp = await fetch("https://api.nicepay.co.kr/v1/payments/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${process.env.NICE_SECRET_BASE64}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await rsp.json();

    const res = new Response(
      JSON.stringify({
        ok: true,
        redirectUrl: data.nextUrl || data.redirectUrl,
        verifiedAmount,
      }),
      { status: 200 }
    );
    Object.entries(corsHeaders).forEach(([k, v]) => res.headers.append(k, v));
    return res;
  } catch (err) {
    const res = new Response(
      JSON.stringify({
        ok: false,
        error: "서버 오류",
        detail: String(err.message || err),
      }),
      { status: 500 }
    );
    Object.entries(corsHeaders).forEach(([k, v]) => res.headers.append(k, v));
    return res;
  }
}
