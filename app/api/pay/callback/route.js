// app/api/pay/callback/route.js
import crypto from "crypto";

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", process.env.TOKEN_SECRET || "dev-secret")
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}

export async function POST(req) {
  try {
    const form = await req.formData();
    const authResultCode = form.get("authResultCode");
    const tid = form.get("tid");
    const amount = form.get("amount");
    const orderId = form.get("orderId");
    const secret = process.env.NICE_SECRET_BASE64;
    const GAS_TOKEN_URL = process.env.GAS_TOKEN_URL;

    // 인증 실패 시 바로 실패 페이지로 리다이렉트
    if (authResultCode !== "0000") {
      return Response.redirect("https://www.easysaju.kr/payment-fail.html");
    }

    // NICEPAY 승인 API 요청
    const approve = await fetch(`https://api.nicepay.co.kr/v1/payments/${tid}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${secret}`,
      },
      body: JSON.stringify({ amount }),
    });

    const result = await approve.json();

    // 승인 성공 시
    if (result.resultCode === "0000") {
      const payload = {
        mode: "saveToken",
        orderId,
        goodsName: result.goodsName || "상품명없음",
        amount: result.amount || amount || 0,
        payDate: result.paidAt || new Date().toISOString(),
        payStatus: "결제완료",
        receiptUrl: result.receiptUrl || "",
      };

      // 1) 시트 기록
      await fetch(GAS_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // 2) thankyou 토큰 생성
      const thankyouToken = sign(payload);

      // 3) 성공 페이지 이동
      return Response.redirect(
        `https://www.easysaju.kr/thankyou.html?token=${thankyouToken}`
      );
    }

    // 승인 실패 시
    return Response.redirect("https://www.easysaju.kr/payment-fail.html");

  } catch (err) {
    console.error("callback error:", err);
    return Response.redirect("https://www.easysaju.kr/payment-fail.html");
  }
}
