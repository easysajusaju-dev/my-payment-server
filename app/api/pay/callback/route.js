import crypto from "crypto";

export async function POST(req) {
  const form = await req.formData();
  const authResultCode = form.get("authResultCode");
  const tid = form.get("tid");
  const amount = form.get("amount");
  const goodsName = form.get("goodsName");
  const orderId = form.get("orderId");

  const secret = process.env.NICE_SECRET_BASE64;
  const token = crypto.randomBytes(12).toString("base64url"); // ✅ 토큰 생성

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

  // [2] 승인 성공 시 token 저장
  if (result.resultCode === "0000") {
    const gsURL = "https://script.google.com/macros/s/XXXX/exec"; // 🧩 여기에 Saju-Products-API URL 넣기

    await fetch(gsURL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        mode: "saveToken",
        token,
        orderId,
        goodsName,
        amount,
      }),
    });

    const redirectUrl = `https://easysaju.kr/thankyou.html?token=${token}`;
    return Response.redirect(redirectUrl);
  }

  return Response.redirect("https://easysaju.kr/payment-fail.html");
}
