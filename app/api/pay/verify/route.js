// app/api/pay/start/route.js

// 🔐 GitHub Pages → Vercel API 호출 허용 CORS 헤더
const corsHeaders = {
  // 필요하면 "*" 대신 정확한 오리진을 넣어도 됩니다.
  // "Access-Control-Allow-Origin": "https://easysajusaju-dev.github.io",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// ✅ App Router에서는 OPTIONS를 "별도"로 export 해야 CORS preflight가 통과됩니다.
export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { orderId, goodsName, returnUrl } = body || {};

    if (!goodsName) {
      return Response.json(
        { ok: false, error: "상품명이 누락되었습니다." },
        { status: 400, headers: corsHeaders }
      );
    }

    // 1) 시트 가격 확인
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
      return Response.json(
        { ok: false, error: "상품 검증 실패", detail: verifyData },
        { status: 400, headers: corsHeaders }
      );
    }

    const verifiedAmount = Number(verifyData.verifiedAmount);
    if (!Number.isFinite(verifiedAmount) || verifiedAmount <= 0) {
      return Response.json(
        { ok: false, error: "유효하지 않은 금액" },
        { status: 400, headers: corsHeaders }
      );
    }

    // 2) 검증 금액으로만 PG 요청
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

    if (!rsp.ok) {
      const txt = await rsp.text().catch(() => "");
      return Response.json(
        { ok: false, error: "PG 요청 실패", detail: txt },
        { status: 502, headers: corsHeaders }
      );
    }

    const data = await rsp.json();

    // 3) 프론트로 결제창 URL 반환
    return Response.json(
      {
        ok: true,
        redirectUrl: data.nextUrl || data.redirectUrl,
        verifiedAmount,
      },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error("❌ /api/pay/start error:", err);
    return Response.json(
      { ok: false, error: "서버 오류", detail: String(err?.message || err) },
      { status: 500, headers: corsHeaders }
    );
  }
}
