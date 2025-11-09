import crypto from "crypto";

export async function POST(req) {
  const form = await req.formData();
  const authResultCode = form.get("authResultCode");
  const tid = form.get("tid");
  const amount = form.get("amount");
  const orderId = form.get("orderId");

  const secret = process.env.NICE_SECRET_BASE64;
  const token = crypto.randomBytes(12).toString("base64url");

  // 1️⃣ NICEPAY 결제 승인
  const approve = await fetch(`https://api.nicepay.co.kr/v1/payments/${tid}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${secret}`,
    },
    body: JSON.stringify({ amount }),
  });

  const result = await approve.json();

  // 2️⃣ 승인 성공 시 Google Apps Script로 전송
  if (result.resultCode === "0000") {
    const gsURL = "https://script.google.com/macros/s/AKfycbwX6UPs_IaiyaHGMBdRrwUzoaAoe5EjM0JifNgw4K7DNPDX84QPfvwh16YAs0KhaRfx-g/exec";

    // ✅ goodsName, paidAt 등 승인 응답에서 직접 추출
    const goodsName = result.goodsName || "상품명없음";
    const payDate = result.paidAt || new Date().toISOString();
    const payStatus = result.status || "paid";
    const receiptUrl = result.receiptUrl || "";

    try {
      const bodyData = new URLSearchParams({
        mode: "saveToken",
        token,
        orderId,
        goodsName,
        amount,
        payDate,
        payStatus,
        receiptUrl,
      });

      const response = await fetch(gsURL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: bodyData.toString(),
      });

      console.log("✅ Google Script Response:", await response.text());
    } catch (err) {
      console.error("❌ Google Script 호출 실패:", err);
    }

    // ✅ Thankyou 페이지로 이동
    return new Response(null, {
      status: 302,
      headers: {
        Location: `https://easysaju.kr/thankyou.html?token=${token}`,
      },
    });
  }

  // 실패시
  return new Response(null, {
    status: 302,
    headers: { Location: "https://easysaju.kr/payment-fail.html" },
  });
}
