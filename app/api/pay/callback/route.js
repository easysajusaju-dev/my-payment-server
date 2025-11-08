// === NICEPAY Callback (포스타트 최종 완성 서명 ediDate 포함) ===

import { createHmac } from "crypto";

const NICE_SECRET_BASE64 = process.env.NICE_SECRET_BASE64;
const SITE_DOMAIN = process.env.SITE_DOMAIN || "https://www.easysaju.kr";
const APPS_SCRIPT_URL =
  process.env.APPS_SCRIPT_URL ||
  "https://script.google.com/macros/s/AKfycbz_SRAMhhOT396196sgEzHeDMNk_oF7IL-M5BpAReKum04hVtkVYw0AwY71P4SyEdm-/exec";

function log(...args) {
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
  const form = await req.formData();
  const authResultCode = form.get("authResultCode");
  const authToken = form.get("authToken");
  const tid = form.get("tid");
  const amount = Number(form.get("amount") || 0);
  const goodsName = form.get("goodsName") || "";
  const orderId = form.get("orderId") || "";

  log("Auth result:", { authResultCode, tid, orderId, amount, goodsName });

  if (authResultCode !== "0000") {
    await updateSheet({ orderId, payStatus: "결제취소" });
    const failUrl = `${SITE_DOMAIN}/payment-fail.html`;
    log("Auth failed. Redirect:", failUrl);
    return Response.redirect(failUrl);
  }

  try {
    const secretBase64 = NICE_SECRET_BASE64;
    if (!secretBase64) throw new Error("NICE_SECRET_BASE64 is missing");

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

    if (result?.resultCode !== "0000") {
      await updateSheet({ orderId, payStatus: "결제실패" });
      const failUrl = `${SITE_DOMAIN}/payment-fail.html`;
      log("Approve failed. Redirect:", failUrl, "detail:", result);
      return Response.redirect(failUrl);
    }

    // ✅ 서명 검증 (최종 확정: tid + orderId + amount + ediDate)
    const merchantKey = Buffer.from(secretBase64, "base64").toString("utf8");
    const ediDate = result.ediDate || "";
    const combined = `${result.tid}${result.orderId}${result.amount}${ediDate}`;
    const expectedSig = createHmac("sha256", merchantKey).update(combined).digest("hex");
    const receivedSig = result.signature;

    log("[SIG DEBUG] combined:", combined);
    log("[SIG DEBUG] ediDate:", ediDate);
    log("[SIG DEBUG] receivedSig:", receivedSig);
    log("[SIG DEBUG] expectedSig:", expectedSig);

    if (!receivedSig || receivedSig !== expectedSig) {
      await updateSheet({ orderId, payStatus: "서명불일치" });
      const failUrl = `${SITE_DOMAIN}/payment-fail.html`;
      log("Signature mismatch. Redirect:", failUrl);
      return Response.redirect(failUrl);
    }

    // ✅ 결제 성공 처리
    await updateSheet({ orderId, payStatus: "결제완료" });

    const finalGoods = (result.goodsName || goodsName || "사주상담").trim();
    const price = Number(result.amount || amount || 0);

    const thankUrl = `${SITE_DOMAIN}/thankyou.html?oid=${encodeURIComponent(
      orderId
    )}&product=${encodeURIComponent(finalGoods)}&price=${encodeURIComponent(price)}`;

    log("Redirect to Thankyou:", thankUrl);
    return Response.redirect(thankUrl);
  } catch (err) {
    log("Callback error:", err?.message || err);
    await updateSheet({ orderId, payStatus: "결제실패" });
    const failUrl = `${SITE_DOMAIN}/payment-fail.html`;
    return Response.redirect(failUrl);
  }
}
