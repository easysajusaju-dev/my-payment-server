// ✅ NICE 결제 승인 + 토큰 저장 완성본
import crypto from "crypto";

export async function POST(req) {
  const form = await req.formData();
  const authResultCode = form.get("authResultCode");
  const tid = form.get("tid");
  const amount = form.get("amount");
  const goodsName = form.get("goodsName") || "이지사주 상담";
  const orderId = form.get("orderId");

  const secret = process.env.NICE_SECRET_BASE64;
  const token = crypto.randomBytes(12).toString("base64url"); // ✅ 토큰 생성

  // ✅ 결제 승인 요청
  const approve = await fetch(`https://api.nicepay.co.kr/v1/payments/${tid}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${secret}`,
    },
    body: JSON.stringify({ amount }),
  });

  const result = await approve.json();

  // ✅ 승인 성공
  if (result.resultCode === "0000") {
    const gsURL = "https://script.google.com/macros/s/AKfycbwX6UPs_IaiyaHGMBdRrwUzoaAoe5EjM0JifNgw4K7DNPDX84QPfvwh16YAs0KhaRfx-g/exec";

    // ✅ 토큰 저장
    await fetch(gsURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "saveToken",
        token,
        orderId,
        goodsName,
        amount,
        payStatus: "결제완료",
        payDate: new Date().toISOString(),
      }),
    });

    // ✅ Thankyou로 토큰만 전달
    return Response.redirect(`https://easysaju.kr/thankyou.html?token=${token}`);
  }

  // ✅ 실패 시 fail 페이지
  return Response.redirect("https://easysaju.kr/payment-fail.html");
}
