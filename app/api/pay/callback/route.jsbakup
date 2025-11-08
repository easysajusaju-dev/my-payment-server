// === NICEPAY 공식 가이드 기반 완성 버전 ===
// 단계 요약:
// 1️⃣ 인증 응답 검증 (AuthToken + MID + Amt + MerchantKey)
// 2️⃣ 승인 요청용 서명 생성 (AuthToken + MID + Amt + EdiDate + MerchantKey)
// 3️⃣ 승인 응답 검증 (TID + MID + Amt + MerchantKey)

import { createHash } from "crypto";

const NICE_CLIENT_ID = process.env.NICE_CLIENT_ID;   // 가맹점 ID (MID)
const NICE_SECRET_KEY = process.env.NICE_SECRET_KEY; // 가맹점 Key (MerchantKey)
const SITE_DOMAIN = process.env.SITE_DOMAIN || "https://www.easysaju.kr";
const APPS_SCRIPT_URL =
  process.env.APPS_SCRIPT_URL ||
  "https://script.google.com/macros/s/AKfycbz_SRAMhhOT396196sgEzHeDMNk_oF7IL-M5BpAReKum04hVtkVYw0AwY71P4SyEdm-/exec";

function log(...args) {
  console.log("[PAY-CALLBACK]", ...args);
}

// ✅ SHA256 해시 생성 함수
function sha256(str) {
  return createHash("sha256").update(str, "utf8").digest("hex");
}

// ✅ 구글 시트 업데이트 함수
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

  const authResultCode = form.get("AuthResultCode");
  const authResultMsg = form.get("AuthResultMsg");
  const authToken = form.get("AuthToken");
  const payMethod = form.get("PayMethod");
  const mid = form.get("MID");
  const orderId = form.get("Moid");
  const amount = form.get("Amt");
  const signature = form.get("Signature");
  const nextAppURL = form.get("NextAppURL");
  const netCancelURL = form.get("NetCancelURL");
  const tid = form.get("TxTid");

  log("== [STEP1] AUTH RESPONSE ==", {
    authResultCode,
    authResultMsg,
    authToken,
    mid,
    orderId,
    amount,
    signature,
    nextAppURL,
  });

  // 1️⃣ 인증 실패 처리
  if (authResultCode !== "0000") {
    await updateSheet({ orderId, payStatus: "결제취소" });
    const failUrl = `${SITE_DOMAIN}/payment-fail.html`;
    log("❌ Auth failed:", authResultMsg);
    return Response.redirect(failUrl);
  }

  // 2️⃣ 인증 응답 서명 검증 (AuthToken + MID + Amt + MerchantKey)
  const localSig = sha256(authToken + NICE_CLIENT_ID + amount + NICE_SECRET_KEY);
  if (localSig !== signature) {
    await updateSheet({ orderId, payStatus: "서명불일치" });
    const failUrl = `${SITE_DOMAIN}/payment-fail.html`;
    log("❌ Signature mismatch!");
    log("Expected:", localSig);
    log("Received:", signature);
    return Response.redirect(failUrl);
  }

  // 3️⃣ 승인 요청 (NextAppURL)
  try {
    const ediDate = new Date()
      .toISOString()
      .replace(/[-T:.Z]/g, "")
      .slice(0, 14); // YYYYMMDDHHMMSS

    const signData = sha256(
      authToken + NICE_CLIENT_ID + amount + ediDate + NICE_SECRET_KEY
    );

    const approveParams = new URLSearchParams({
      TID: tid,
      AuthToken: authToken,
      MID: NICE_CLIENT_ID,
      Amt: amount,
      EdiDate: ediDate,
      CharSet: "utf-8",
      EdiType: "JSON",
      SignData: signData,
    });

    log("== [STEP2] APPROVE REQUEST ==", approveParams.toString());

    const approveRes = await fetch(nextAppURL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: approveParams,
    });

    const resultText = await approveRes.text();
    let result;
    try {
      result = JSON.parse(resultText);
    } catch {
      log("Fallback: Non-JSON response", resultText);
      result = {};
    }

    log("== [STEP3] APPROVE RESPONSE ==", result);

    const resultCode = result?.ResultCode;
    const resultMsg = result?.ResultMsg;
    const resultTid = result?.TID;
    const resultAmt = result?.Amt;
    const resultSig = result?.Signature;

    // 4️⃣ 승인 응답 서명 검증 (TID + MID + Amt + MerchantKey)
    const verifyResultSig = sha256(resultTid + NICE_CLIENT_ID + resultAmt + NICE_SECRET_KEY);
    if (verifyResultSig !== resultSig) {
      await updateSheet({ orderId, payStatus: "승인서명불일치" });
      const failUrl = `${SITE_DOMAIN}/payment-fail.html`;
      log("❌ Approve signature mismatch!");
      return Response.redirect(failUrl);
    }

    // 5️⃣ 승인 성공 여부 판단
    const successCodes = ["3001", "4000", "4100", "A000"];
    if (!successCodes.includes(resultCode)) {
      await updateSheet({ orderId, payStatus: "결제실패" });
      const failUrl = `${SITE_DOMAIN}/payment-fail.html`;
      log("❌ Approve failed:", resultMsg);
      return Response.redirect(failUrl);
    }

    // ✅ 성공 처리
    await updateSheet({ orderId, payStatus: "결제완료" });

    const finalGoods = (result?.GoodsName || "사주상담").trim();
    const price = Number(resultAmt || amount || 0);

    const thankUrl = `${SITE_DOMAIN}/thankyou.html?oid=${encodeURIComponent(
      orderId
    )}&product=${encodeURIComponent(finalGoods)}&price=${encodeURIComponent(price)}`;

    log("✅ Payment success:", thankUrl);
    return Response.redirect(thankUrl);
  } catch (error) {
    // ⚠️ 승인 실패 시 망취소 시도
    log("❌ Approve Exception:", error.message);
    try {
      const ediDate = new Date()
        .toISOString()
        .replace(/[-T:.Z]/g, "")
        .slice(0, 14);
      const cancelSign = sha256(
        authToken + NICE_CLIENT_ID + amount + ediDate + NICE_SECRET_KEY
      );
      const cancelParams = new URLSearchParams({
        TID: tid,
        AuthToken: authToken,
        MID: NICE_CLIENT_ID,
        Amt: amount,
        EdiDate: ediDate,
        NetCancel: "1",
        CharSet: "utf-8",
        EdiType: "JSON",
        SignData: cancelSign,
      });
      await fetch(netCancelURL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: cancelParams,
      });
      log("망취소 요청 완료");
    } catch (e2) {
      log("망취소 실패:", e2.message);
    }
    await updateSheet({ orderId, payStatus: "결제실패" });
    const failUrl = `${SITE_DOMAIN}/payment-fail.html`;
    return Response.redirect(failUrl);
  }
}
