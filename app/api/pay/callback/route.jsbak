// ===============================
// callback.js (보안강화 안전버전)
// ===============================
import crypto from "crypto";

export async function POST(req) {
  try {
    const form = await req.formData();
    const authResultCode = form.get("authResultCode");
    const authToken = form.get("authToken");
    const tid = form.get("tid");
    const amount = form.get("amount");
    const goodsName = form.get("goodsName") || "사주상담";
    const orderId = form.get("orderId");
    const secretBase64 = process.env.NICE_SECRET_BASE64;
    const apiKey = process.env.GS_API_KEY || "";

    // ========================
    // 1️⃣ 결제 실패 or 취소
    // ========================
    if (authResultCode !== "0000") {
      await notifyLogger(orderId, "결제취소", apiKey);
      return Response.redirect("https://www.easysaju.kr/payment-fail.html");
    }

    // ========================
    // 2️⃣ 결제 승인 요청
    // ========================
    const approve = await fetch(`https://api.nicepay.co.kr/v1/payments/${tid}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${secretBase64}`,
      },
      body: JSON.stringify({ amount }),
    });

    const result = await approve.json();

    // ========================
    // 3️⃣ 응답 서명 검증
    // ========================
    if (result.resultCode === "0000") {
      const secretKey = Buffer.from(secretBase64, "base64").toString("utf8");
      const expectedSig = crypto
        .createHmac("sha256", secretKey)
        .update(tid + amount)
        .digest("hex");

      if (result.signature && result.signature !== expectedSig) {
        console.error("❌ NICEPAY 응답 서명 불일치");
        await notifyLogger(orderId, "서명검증실패", apiKey);
        return Response.redirect("https://www.easysaju.kr/payment-fail.html");
      }

      // ========================
      // 4️⃣ 시트 재조회로 상품 확인
      // ========================
      const verified = await verifyFromSheet(orderId);
      const verifiedName = verified?.상품명 || goodsName;
      const verifiedPrice = verified?.결제금액 || amount;

      // ✅ 정상 결제 처리
      await notifyLogger(orderId, "결제완료", apiKey);
      const redirectUrl = `https://www.easysaju.kr/thankyou.html?oid=${orderId}&product=${encodeURIComponent(
        verifiedName
      )}&price=${verifiedPrice}`;
      return Response.redirect(redirectUrl);
    }

    // ========================
    // 5️⃣ 승인 실패
    // ========================
    await notifyLogger(orderId, "결제실패", apiKey);
    return Response.redirect("https://www.easysaju.kr/payment-fail.html");
  } catch (err) {
    console.error("❌ callback.js 오류:", err);
    return Response.redirect("https://www.easysaju.kr/payment-fail.html");
  }
}

// ===============================
// 🔸 Logger.gs 호출 함수
// ===============================
async function notifyLogger(orderId, payStatus, apiKey = "") {
  try {
    await fetch(
      "https://script.google.com/macros/s/AKfycbz_SRAMhhOT396196sgEzHeDMNk_oF7IL-M5BpAReKum04hVtkVYw0AwY71P4SyEdm-/exec",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          mode: "updatePayment",
          orderId,
          payStatus,
          ...(apiKey ? { apiKey } : {}),
        }),
      }
    );
    console.log(`✅ Logger 업데이트 완료: ${orderId} → ${payStatus}`);
  } catch (e) {
    console.error("Logger 업데이트 실패:", e);
  }
}

// ===============================
// 🔸 Google Sheet에서 orderId 검증
// ===============================
async function verifyFromSheet(orderId) {
  try {
    const url =
      "https://script.google.com/macros/s/AKfycbz_SRAMhhOT396196sgEzHeDMNk_oF7IL-M5BpAReKum04hVtkVYw0AwY71P4SyEdm-/exec" +
      `?mode=getOrder&orderId=${encodeURIComponent(orderId)}`;
    const r = await fetch(url);
    const t = await r.text();
    return JSON.parse(t);
  } catch (e) {
    console.warn("시트 재조회 실패:", e);
    return null;
  }
}
