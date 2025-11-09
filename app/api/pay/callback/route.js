// /api/pay/callback/route.js
import crypto from "crypto";

export async function POST(req) {
  const form = await req.formData();
  const authResultCode = form.get("authResultCode");
  const tid = form.get("tid");
  const amount = form.get("amount");
  const goodsName = form.get("goodsName");
  const orderId = form.get("orderId");

  const secret = process.env.NICE_SECRET_BASE64;
  const token = crypto.randomBytes(12).toString("base64url");

  // [1] 결제 승인 요청
  const approve = await fetch(`https://api.nicepay.co.kr/v1/payments/${tid}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${secret}`,
    },
    body: JSON.stringify({ amount }),
  });

  const result = await approve.json();

  // [2] 승인 성공 시 토큰 저장
  if (result.resultCode === "0000") {
    // ✅ 토큰 저장용 Apps Script (Token-Handler-API)
    const tokenURL = "https://script.google.com/macros/s/AKfycbwNEW_TOKEN_HANDLER_URL/exec";

    const payload = {
      mode: "saveToken",
      token,
      orderId: result.orderId,
      goodsName: result.goodsName,
      amount: result.amount,
      payDate: result.paidAt,
      payStatus: result.status,
      receiptUrl: result.receiptUrl,
    };

    await fetch(tokenURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // ✅ 결제 완료 후 리디렉트
    const redirectUrl = `https://easysaju.kr/thankyou.html?token=${token}`;
    return Response.redirect(redirectUrl);
  }

  return Response.redirect("https://easysaju.kr/payment-fail.html");
}
