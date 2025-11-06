// app/api/pay/start/route.js
export async function POST(req) {
  // ✅ ① CORS 허용 (GitHub Pages → Vercel 간 호출 가능하게)
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // ✅ ② 브라우저 사전요청(OPTIONS) 처리
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  try {
    // ✅ 요청 본문 읽기
    const body = await req.json();
    const { orderId, goodsName, returnUrl } = body || {};

    if (!goodsName) {
      return Response.json({ ok: false, error: "상품명이 누락되었습니다." }, { status: 400, headers });
    }

    // ✅ 시트에서 금액 검증 (항상 서버에서 가격 확인)
    const base = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || "https://my-payment-server.vercel.app";

    const verifyRes = await fetch(`${base}/api/pay/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goodsName }),
    });

    const verifyData = await verifyRes.json();
    if (!verifyData.ok) {
      return Response.json(
        { ok: false, error: "상품 검증 실패", detail: verifyData },
        { status: 400, headers }
      );
    }

    const verifiedAmount = Number(verifyData.verifiedAmount);
    if (!verifiedAmount) {
      return Response.json({ ok: false, error: "유효하지 않은 금액" }, { status: 400, headers });
    }

    // ✅ PG사로 결제 요청 (검증된 금액 사용)
    const payload = {
      amount: verifiedAmount,
      orderId,
      goodsName,
      returnUrl: returnUrl || process.env.DEFAULT_RETURN_URL || `${base}/api/pay/callback`,
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

    // ✅ ③ 응답 반환 (결제창으로 리디렉션 URL)
    return Response.json(
      { ok: true, redirectUrl: data.nextUrl || data.redirectUrl, verifiedAmount },
      { headers }
    );

  } catch (err) {
    console.error("❌ 결제 시작 오류:", err);
    return Response.json(
      { ok: false, error: "결제 시작 중 서버 오류 발생", detail: err.message },
      { status: 500, headers }
    );
  }
}
