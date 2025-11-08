// === NICEPAY Callback (Full Replace) ===
// - 승인요청 -> 응답검증(서명) -> 시트 업데이트(선택) -> 리디렉트
// - 포스타트 서명 규칙: sha256(tid + orderId + amount + ediDate, merchantKey)
//   * merchantKey = base64 디코딩(NICE_SECRET_BASE64)

import { createHmac } from "crypto";

const NICE_SECRET_BASE64 = process.env.NICE_SECRET_BASE64; // 기본인증 + 서명키(베이스64)
const SITE_DOMAIN = process.env.SITE_DOMAIN || "https://www.easysaju.kr"; // thankyou.html이 있는 사이트
const APPS_SCRIPT_URL =
  process.env.APPS_SCRIPT_URL ||
  "https://script.google.com/macros/s/AKfycbz_SRAMhhOT396196sgEzHeDMNk_oF7IL-M5BpAReKum04hVtkVYw0AwY71P4SyEdm-/exec";

function log(...args) {
  // Vercel 로그에서 보기 좋게
  console.log("[PAY-CALLBACK]", ...args);
}

async function updateSheet({ orderId, payStatus }) {
  if (!APPS_SCRIPT_URL) return;
  try {
    await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        mode: "updatePayment",
        orderId: String(orderId || ""),
        payStatus: String(payStatus || ""),
      }),
    });
    log("Sheet updated:", orderId, payStatus);
  } catch (e) {
    log("Sheet update failed:", e?.message || e);
  }
}

export async function POST(req) {
  // 1) NICE 인증 결과 수신
  const form = await req.formData();
  const authResultCode = form.get("authResultCode");
  const authToken = form.get("authToken");
  const tid = form.get("tid");
  const amount = Number(form.get("amount") || 0);
  const goodsName = form.get("goodsName") || ""; // 결제창에서 넘어온 상품명
  const orderId = form.get("orderId") || "";     // 주문번호(우리가 생성한 값)

  log("Auth result:", { authResultCode, tid, orderId, amount, goodsName });

  // 2) 인증 실패(사용자 취소 포함) -> 실패 페이지
  if (authResultCode !== "0000") {
    await updateSheet({ orderId, payStatus: "결제취소" });
    const failUrl = `${SITE_DOMAIN}/payment-fail.html`;
    log("Auth failed. Redirect:", failUrl);
    return Response.redirect(failUrl);
  }

  // 3) 승인 요청
  try {
    const secretBase64 = NICE_SECRET_BASE64;
    if (!secretBase64) {
      throw new Error("NICE_SECRET_BASE64 is missing");
    }

    // (포스타트) 승인 API: /v1/payments/{tid}  POST { amount }
    const approveRes = await fetch(`https://api.nicepay.co.kr/v1/payments/${tid}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${secretBase64}`,
      },
      body: JSON.stringify({ amount }),
    });

    const result = await approveRes.json();
    log("Approve resultCode:", result?.resultCode, "orderId:", result?.orderId);

    // 4) 승인 실패 -> 실패 페이지
    if (result?.resultCode !== "0000") {
      await updateSheet({ orderId, payStatus: "결제실패" });
      const failUrl = `${SITE_DOMAIN}/payment-fail.html`;
      log("Approve failed. Redirect:", failUrl, "detail:", result);
      return Response.redirect(failUrl);
    }

    // 5) 서명 검증 (포스타트 서명 규칙)
    // receivedSig: result.signature (응답에 포함)
    // expectedSig = HMAC-SHA256( tid + orderId + amount + ediDate, merchantKey )
    const merchantKey = Buffer.from(secretBase64, "base64").toString("utf8"); // base64 디코딩
    const combined = `${result.tid}${result.orderId}${result.amount}${result.ediDate}`;
    const expectedSig = createHmac("sha256", merchantKey).update(combined).digest("hex");
    const receivedSig = result.signature;

    log("[SIG DEBUG] combined:", combined);
    log("[SIG DEBUG] receivedSig:", receivedSig);
    log("[SIG DEBUG] expectedSig:", expectedSig);

    if (!receivedSig || receivedSig !== expectedSig) {
      // 서명 불일치 -> 보안상 실패 처리
      await updateSheet({ orderId, payStatus: "서명불일치" });
      const failUrl = `${SITE_DOMAIN}/payment-fail.html`;
      log("Signature mismatch. Redirect:", failUrl);
      return Response.redirect(failUrl);
    }

    // 6) 성공 처리: 시트 업데이트 + 고객 리디렉트
    await updateSheet({ orderId, payStatus: "결제완료" });

    // 상품명: 우선 응답 goodsName, 없으면 폼에서 받은 값
    const finalGoods = (result.goodsName || goodsName || "사주상담").trim();
    const price = Number(result.amount || amount || 0);

    const thankUrl = `${SITE_DOMAIN}/thankyou.html?oid=${encodeURIComponent(
      orderId
    )}&product=${encodeURIComponent(finalGoods)}&price=${encodeURIComponent(price)}`;

    log("Redirect to Thankyou:", thankUrl);
    return Response.redirect(thankUrl);
  } catch (err) {
    // 7) 예외(네트워크 등) -> 실패 페이지
    log("Callback error:", err?.message || err);
    await updateSheet({ orderId, payStatus: "결제실패" });
    const failUrl = `${SITE_DOMAIN}/payment-fail.html`;
    return Response.redirect(failUrl);
  }
}
