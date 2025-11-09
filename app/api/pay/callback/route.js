// app/api/pay/callback/route.js
import crypto from "crypto";

// ★ 반드시 본인 Apps Script WebApp URL 로 교체
const GS_TOKEN_API =
  "https://script.google.com/macros/s/AKfycbwX6UPs_IaiyaHGMBdRrwUzoaAoe5EjM0JifNgw4K7DNPDX84QPfvwh16YAs0KhaRfx-g/exec";

// ★ 기존 Logger.gs (결제상태 업데이트) WebApp URL (예전부터 쓰던 것)
const GS_LOGGER =
  "https://script.google.com/macros/s/AKfycbz_SRAMhhOT396196sgEzHeDMNk_oF7IL-M5BpAReKum04hVtkVYw0AwY71P4SyEdm-/exec";

export async function POST(req) {
  try {
    const form = await req.formData();

    const authResultCode = form.get("authResultCode"); // "0000" 이어야 정상
    const authToken      = form.get("authToken");      // 참고용(미사용)
    const tid            = form.get("tid");            // 승인에 필요
    const amountFromForm = form.get("amount");         // 폼에서 넘어온 금액(문자열)
    const orderId        = form.get("orderId");        // EZ.... (필수)
    const goodsNameFromForm = form.get("goodsName");   // 폼에서 넘어온 상품명(가끔 비어있음)

    // 1) 인증 실패한 건은 즉시 실패 처리
    if (authResultCode !== "0000") {
      // 로거에 결제취소 업데이트
      try {
        await fetch(GS_LOGGER, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            mode: "updatePayment",
            orderId,
            payStatus: "결제취소",
          }),
        });
      } catch (e) {
        console.error("Logger 결제취소 기록 실패:", e);
      }
      return Response.redirect("https://www.easysaju.kr/payment-fail.html", 302);
    }

    // 2) 결제 '승인' 요청 (Server-to-Server)
    const secret = process.env.NICE_SECRET_BASE64; // "clientId:secretKey"를 base64 한 값
    const approveRes = await fetch(`https://api.nicepay.co.kr/v1/payments/${tid}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${secret}`,
      },
      body: JSON.stringify({ amount: amountFromForm }),
    });

    const result = await approveRes.json();
    // result.resultCode === "0000" 이면 승인 완료
    if (result.resultCode !== "0000") {
      // 승인 실패 → 로거 기록
      try {
        await fetch(GS_LOGGER, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            mode: "updatePayment",
            orderId,
            payStatus: "결제실패",
          }),
        });
      } catch (e) {
        console.error("Logger 결제실패 기록 실패:", e);
      }
      return Response.redirect("https://www.easysaju.kr/payment-fail.html", 302);
    }

    // 3) 승인 성공 → 토큰 생성 & Apps Script에 토큰 데이터 저장
    //    ⚠️ 여기서 상품명/금액은 '승인 응답값'을 최우선으로 씁니다.
    const token = crypto.randomBytes(12).toString("base64url");

    const savePayload = {
      mode: "saveToken",
      token,
      orderId: orderId || result.orderId,
      goodsName: (goodsNameFromForm || result.goodsName || "사주 상담"),
      amount: String(result.amount ?? amountFromForm ?? "0"),
      payDate: result.paidAt || new Date().toISOString(),
      payStatus: result.status || "paid",
      receiptUrl: result.receiptUrl || "",
    };

    // Apps Script 쪽은 JSON도 받도록 이미 만들어 두었음
    const gsResp = await fetch(GS_TOKEN_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(savePayload),
    }).catch((e) => {
      console.error("GS saveToken 호출 실패:", e);
      return null;
    });

    if (!gsResp || !gsResp.ok) {
      console.error("GS saveToken 응답 비정상:", gsResp?.status);
      // 토큰 저장 실패여도 결제는 성공 → 일단 실패페이지로 돌릴 순 없음.
      // 우선 홈으로 안내(운영 정책에 맞게 조정 가능)
      return Response.redirect("https://www.easysaju.kr/payment-fail.html", 302);
    }

    // (선택) 결제완료 상태 Logger 기록
    try {
      await fetch(GS_LOGGER, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          mode: "updatePayment",
          orderId,
          payStatus: "결제완료",
        }),
      });
    } catch (e) {
      console.error("Logger 결제완료 기록 실패:", e);
    }

    // 4) 최종 Thankyou로 리다이렉트 (token만 쿼리)
    return Response.redirect(`https://www.easysaju.kr/thankyou.html?token=${token}`, 302);

  } catch (err) {
    console.error("callback fatal error:", err);
    return Response.redirect("https://www.easysaju.kr/payment-fail.html", 302);
  }
}
