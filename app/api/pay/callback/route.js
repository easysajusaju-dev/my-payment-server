import crypto from "crypto";

export async function POST(req) {
  const form = await req.formData();

  // NICE 1차 응답 항목 (혹시 모를 누락 대비용)
  const authResultCode = form.get("authResultCode");
  const tid            = form.get("tid");
  const orderId        = form.get("orderId");

  const secret = process.env.NICE_SECRET_BASE64;

  // 1) NICE 최종 승인
  const approve = await fetch(`https://api.nicepay.co.kr/v1/payments/${tid}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${secret}`,
    },
    body: JSON.stringify({ amount: Number(form.get("amount") || 0) }),
  });

  const result = await approve.json();

  if (result?.resultCode === "0000") {
    // NICE 최종 응답이 가진 값을 신뢰(상품명/금액 등)
    const amount     = Number(result.amount || 0);
    const goodsName  = String(result.goodsName || "상품명없음");
    const paidAtISO  = new Date(result.paidAt || Date.now()).toISOString();
    const receiptUrl = String(result.receiptUrl || "");
    const token      = crypto.randomBytes(12).toString("base64url");

    // 2) TokenStore 저장 (Apps Script: Saju-Products-API)
    const tokenAPI = "https://script.google.com/macros/s/AKfycbwX6UPs_IaiyaHGMBdRrwUzoaAoe5EjM0JifNgw4K7DNPDX84QPfvwh16YAs0KhaRfx-g/exec";
    await fetch(tokenAPI, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        mode: "saveToken",
        token,
        orderId: orderId || result.orderId,
        goodsName,
        amount: String(amount),
        payDate: paidAtISO,
        payStatus: "paid",
        receiptUrl,
      }),
    });

    // 3) Logger.gs (기존 로거) 결제완료 업데이트 호출
    // ✦ 여기엔 "기존에 쓰던 Logger 웹앱 주소"를 넣어줘
    const loggerURL = "https://script.google.com/macros/s/AKfycbz_SRAMhhOT396196sgEzHeDMNk_oF7IL-M5BpAReKum04hVtkVYw0AwY71P4SyEdm-/exec";
    await fetch(loggerURL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        mode: "updatePayment",
        orderId: orderId || result.orderId,
        payStatus: "결제완료",
        payDate: paidAtISO,
        receiptUrl,
      }),
    });

    // 4) 고지 페이지로 리디렉트 (토큰만)
    return Response.redirect(`https://easysaju.kr/thankyou.html?token=${token}`);
  }

  return Response.redirect("https://easysaju.kr/payment-fail.html");
}
