// app/api/pay/start/route.js

export async function POST(req) {
  try {
    const { orderId, goodsName, amount, returnUrl } = await req.json();

    const payload = {
      amount,
      orderId,
      goodsName,
      returnUrl,
    };

    const rsp = await fetch("https://sandbox-api.nicepay.co.kr/v1/payments/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${process.env.NICE_SECRET_BASE64}`,
      },
      body: JSON.stringify(payload),
    }).then(r => r.json());

    return Response.json({ ok: true, redirectUrl: rsp.nextUrl });
  } catch (err) {
    console.error("❌ start/pay error:", err);
    return Response.json({ ok: false, error: "결제 요청 중 오류 발생" }, { status: 500 });
  }
}
