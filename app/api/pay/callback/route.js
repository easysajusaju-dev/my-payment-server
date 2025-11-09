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
    const gsURL =
      "https://script.google.com/macros/s/AKfycbwX6UPs_IaiyaHGMBdRrwUzoaAoe5EjM0JifNgw4K7DNPDX84QPfvwh16YAs0KhaRfx-g/exec"; // 🔹 Apps Script Web App URL

    try {
      // ✅ Apps Script는 JSON이 아니라 폼형식(x-www-form-urlencoded)으로 보내야 인식됨
      const bodyData = new URLSearchParams({
        mode: "saveToken",
        token,
        orderId,
        goodsName,
        amount,
      });

      const response = await fetch(gsURL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: bodyData,
      });

      console.log("✅ Google Script Response:", await response.text());
    } catch (err) {
      console.error("❌ saveToken failed:", err);
    }

    // ✅ 반드시 token 저장 이후 redirect 실행
    const redirectUrl = `https://easysaju.kr/thankyou.html?token=${token}`;
    return Response.redirect(redirectUrl);
  }

  // 승인 실패 시
  return Response.redirect("https://easysaju.kr/payment-fail.html");
}
