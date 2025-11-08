// === NICEPAY Callback (For 포스타트) ===
// - NICE 결제 완료 후 호출되는 콜백 처리
// - 승인 검증, 서명 확인, 시트 업데이트, 리디렉트

import { createHmac } from "crypto";

const NICE_SECRET_BASE64 = process.env.NICE_SECRET_BASE64; // 포스타트에서 제공된 Base64 Secret
const SITE_DOMAIN = process.env.SITE_DOMAIN || "https://www.easysaju.kr"; // 고객이 보는 페이지(감사페이지 등)
const APPS_SCRIPT_URL =
  process.env.APPS_SCRIPT_URL ||
  "https://script.google.com/macros/s/AKfycbz_SRAMhhOT396196sgEzHeDMNk_oF7IL-M5BpAReKum04hVtkVYw0AwY71P4SyEdm-/exec";

// ======= 내부 로깅 함수 =======
function log(...args) {
  console.log("[PAY-CALLBACK]", ...args);
}

// ======= 구글시트 업데이트 함수 =======
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

// ======= 메인 콜백 함수 =======
export async function POST(req) {
  // 1️⃣ NICE에서 전달한 인증 데이터 수신
  const form = await req.formData();
  const authResultCode = form.get("authResultCode");
  const authToken = form.get("authToken");
  const tid = form.get("tid");
  const amount = Number(form.get("amount") || 0);
  const goodsName = form.get("goodsName") || "";
  const orderId = form.get("orderId") || "";

  log("Auth result:", { authResultCode, tid, orderId, amount, goodsName });

  // 2️⃣ 인증 실패 (사용자 취소 포함)
  if (authResultCode !== "0000") {
    await updateSheet({ orderId, payStatus: "결제취소" });
    const failUrl = `${SITE_DOMAIN}/payment-fail.html`;
    log("Auth failed. Redirect:", failUrl);
    return Response.redirect(failUrl);
  }

  // 3️⃣ 결제 승인 요청
  try {
    const secretBase64 = NICE_SECRET_BASE64;
    if (!secretBase64) throw new Error("NICE_SECRET_BASE64 is missing");

    // NICE 포스타트 승인 API
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

    // 4️⃣ 승인 실패 시
    if (result?.resultCode !== "0000") {
      await updateSheet({ orderId, payStatus: "결제실패" });
      const failUrl = `${SITE_DOMAIN}/payment-fail.html`;
      log("Approve failed. Redirect:", failUrl, "detail:", result);
      return Response.redirect(failUrl);
    }

    // 5️⃣ ✅ 서명 검증 (포스타트용)
    const merchantKey = Buffer.from(secretBase64, "base64").toString("utf8");
    const combined = `${result.tid}${result.amount}`;
    const expectedSig = createHmac("sha256", merchantKey).update(combined).digest("hex");
    const receivedSig = result.signature;

    log("[SIG DEBUG] combined:", combined);
    log("[SIG DEBUG] receivedSig:", receivedSig);
    log("[SIG DEBUG] expectedSig:", expectedSig);

    if (!receivedSig || receivedSig !== expectedSig) {
      await updateSheet({ orderId, payStatus: "서명불일치" });
      const failUrl = `${SITE_DOMAIN}/payment-fail.html`;
      log("Signature mismatch. Redirect:", failUrl);
      return Response.redirect(failUrl);
    }

    // 6️⃣ 결제 성공 처리
    await updateSheet({ orderId, payStatus: "결제완료" });

    const finalGoods = (result.goodsName || goodsName || "사주상담").trim();
    const price = Number(result.amount || amount || 0);

    const thankUrl = `${SITE_DOMAIN}/thankyou.html?oid=${encodeURIComponent(
      orderId
    )}&product=${encodeURIComponent(finalGoods)}&price=${encodeURIComponent(price)}`;

    log("Redirect to Thankyou:", thankUrl);
    return Response.redirect(thankUrl);
  } catch (err) {
    // 7️⃣ 예외 발생 시
    log("Callback error:", err?.message || err);
    await updateSheet({ orderId, payStatus: "결제실패" });
    const failUrl = `${SITE_DOMAIN}/payment-fail.html`;
    return Response.redirect(failUrl);
  }
}
