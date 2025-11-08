// ===============================
// ✅ EASYSAJU x NICEPAY 콜백 처리 최종본
// Version: 2025-11-08
// Author: GPT-5
// ===============================
import { createHmac } from "crypto";

export async function POST(req) {
  try {
    const form = await req.formData();

    // NICE가 보낸 값들
    const authResultCode = form.get("authResultCode");
    const authToken      = form.get("authToken");
    const tid            = form.get("tid");
    const amount         = form.get("amount");
    const goodsName      = form.get("goodsName");
    const orderId        = form.get("orderId");

    // 1) 인증 실패면 실패 페이지
    if (authResultCode !== "0000") {
      console.warn("[NICE] auth 실패:", { authResultCode, orderId, tid });
      return Response.redirect("https://www.easysaju.kr/payment-fail.html");
    }

    // 2) 승인 API 호출
    const secret = process.env.NICE_SECRET_BASE64; // Base64 문자열(환경변수)
    const approve = await fetch(`https://api.nicepay.co.kr/v1/payments/${tid}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${secret}`,
      },
      body: JSON.stringify({ amount }),
    });

    const result = await approve.json(); // NICE 승인 응답 JSON

    // ---------------------------
    // 🔐 HMAC(서명) 검증 준비
    // ---------------------------
    const secretKey = Buffer.from(process.env.NICE_SECRET_BASE64, "base64").toString("utf8");
    const expectedSig = createHmac("sha256", secretKey)
      // 표준 조합(벤더마다 다름) : tid + amount + resultCode
      .update(String(tid) + String(amount) + String(result.resultCode))
      .digest("hex");

    const receivedSig = result.signature || ""; // NICE 응답의 서명

    // [DEBUG] 여기 추가 — 우리가 확인할 값들 전부 찍기
    console.log("[SIG DEBUG] orderId:", orderId);
    console.log("[SIG DEBUG] tid:", tid);
    console.log("[SIG DEBUG] amount:", amount);
    console.log("[SIG DEBUG] resultCode:", result.resultCode);
    console.log("[SIG DEBUG] receivedSig:", receivedSig);
    console.log("[SIG DEBUG] expectedSig:", expectedSig);

    // 3) 승인 성공 + 서명 검증
    if (result.resultCode === "0000") {
      if (receivedSig.toLowerCase() !== expectedSig.toLowerCase()) {
        console.warn("⚠️ NICEPAY 서명 불일치 (테스트용 보류 처리).");
        // 필요하면 임시로 실패 대신 통과시키기도 가능 (디버깅용)
        // return Response.redirect(`https://www.easysaju.kr/thankyou.html?oid=${encodeURIComponent(orderId)}&product=${encodeURIComponent(goodsName)}&price=${encodeURIComponent(amount)}`);

        // 지금은 보수적으로 실패 처리(원인 찾기 전)
        return Response.redirect("https://www.easysaju.kr/payment-fail.html");
      }

      // (여기서 Logger.gs 업데이트 등 부가 처리 수행 가능)
      const redirectUrl = `https://www.easysaju.kr/thankyou.html?oid=${encodeURIComponent(orderId)}&product=${encodeURIComponent(goodsName)}&price=${encodeURIComponent(amount)}`;
      return Response.redirect(redirectUrl);
    }

    // 4) 승인 실패
    console.error("[NICE] 승인 실패:", result);
    return Response.redirect("https://www.easysaju.kr/payment-fail.html");

  } catch (err) {
    console.error("[callback.js 에러]", err);
    return Response.redirect("https://www.easysaju.kr/payment-fail.html");
  }
}

