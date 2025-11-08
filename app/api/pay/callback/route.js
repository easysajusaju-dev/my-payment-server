// ===============================
// ✅ EASYSAJU x NICEPAY 콜백 처리 최종본
// Version: 2025-11-08
// Author: GPT-5
// ===============================

import crypto from "crypto";

// ✅ POST 엔드포인트
export async function POST(req) {
  try {
    // -------------------------------
    // 1️⃣ 콜백 데이터 수신
    // -------------------------------
    const bodyText = await req.text();
    const params = Object.fromEntries(new URLSearchParams(bodyText));

    console.log("=== NICEPAY CALLBACK RECEIVED ===");
    console.log(params);

    const resultCode = params.resultCode || params.resultcode;
    const resultMsg = params.resultMsg || params.resultmsg;
    const tid = params.tid;
    const orderId = params.orderId;
    const amount = params.amount;
    const goodsName = params.goodsName || "사주상담";
    const receivedSig = params.signature;

    // -------------------------------
    // 2️⃣ 서명 검증
    // -------------------------------
    if (resultCode === "0000") {
      // (1) 시크릿키 Base64 → UTF-8 디코드
      const secretKey = Buffer.from(
        process.env.NICEPAY_SECRET_BASE64,
        "base64"
      ).toString("utf8");

      // (2) HMAC-SHA256 계산 (포스타트 규칙)
      const expectedSig = crypto
        .createHmac("sha256", secretKey)
        .update(tid + amount + resultCode)
        .digest("hex");

      // (3) 검증
      if (receivedSig !== expectedSig) {
        console.error("❌ NICEPAY 서명 불일치");
        await notifyLogger(orderId, "서명검증실패");
        return Response.redirect("https://www.easysaju.kr/payment-fail.html");
      }

      // -------------------------------
      // 3️⃣ 결제 성공 처리
      // -------------------------------
      console.log("✅ 서명 검증 통과 - 결제 성공");

      // Google Apps Script 로거 업데이트
      await notifyLogger(orderId, "결제완료");

      // Thankyou 페이지로 리다이렉트
      const redirectUrl = `https://www.easysaju.kr/thankyou.html?oid=${encodeURIComponent(
        orderId
      )}&product=${encodeURIComponent(goodsName)}&price=${encodeURIComponent(
        amount
      )}`;

      console.log("Redirect →", redirectUrl);
      return Response.redirect(redirectUrl);
    }

    // -------------------------------
    // 4️⃣ 결제 실패 처리
    // -------------------------------
    console.error(`❌ 결제 실패 (${resultCode}) ${resultMsg}`);
    await notifyLogger(orderId, "결제실패");
    return Response.redirect("https://www.easysaju.kr/payment-fail.html");

  } catch (err) {
    // -------------------------------
    // 5️⃣ 예외 처리
    // -------------------------------
    console.error("🔥 콜백 처리 중 오류:", err);
    return Response.redirect("https://www.easysaju.kr/payment-fail.html");
  }
}

// ===============================
// ✅ Google Apps Script 로거 연동
// ===============================
async function notifyLogger(orderId, status) {
  try {
    const logUrl =
      "https://script.google.com/macros/s/AKfycbz_SRAMhhOT396196sgEzHeDMNk_oF7IL-M5BpAReKum04hVtkVYw0AwY71P4SyEdm-/exec";

    const form = new URLSearchParams();
    form.append("mode", "updatePayment");
    form.append("orderId", orderId || "");
    form.append("payStatus", status || "");

    const res = await fetch(logUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });

    console.log(`🧾 Logger updated [${status}]`, await res.text());
  } catch (e) {
    console.error("Logger update failed:", e);
  }
}
