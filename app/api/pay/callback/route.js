// apps/api/pay/callback/route.js

export async function POST(req) {
  // 1) 인증 콜백(FormData) 파싱
  const form = await req.formData();
  const authResultCode = form.get("authResultCode"); // "0000"이면 인증성공
  const authToken      = form.get("authToken");
  const tid            = form.get("tid");
  const amountFromForm = form.get("amount");     // 문자열일 수 있음
  const goodsNameFromForm = form.get("goodsName"); // 종종 비어 올 수 있음
  const orderIdFromForm   = form.get("orderId");   // 너의 오더ID
  const secret = process.env.NICE_SECRET_BASE64;

  // [로그] 인증 콜백 원문
  try {
    console.log("[NICE AUTH CALLBACK] form", {
      authResultCode, tid, amountFromForm, goodsNameFromForm, orderIdFromForm
    });
  } catch {}

  // 2) 인증 실패/취소면 즉시 실패 페이지 + 시트에 취소 기록
  if (authResultCode !== "0000") {
    try {
      await fetch(
        "https://script.google.com/macros/s/AKfycbz_SRAMhhOT396196sgEzHeDMNk_oF7IL-M5BpAReKum04hVtkVYw0AwY71P4SyEdm-/exec",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            mode: "updatePayment",
            orderId: orderIdFromForm || "",
            payStatus: "결제취소",
          }),
        }
      );
      console.log("❎ Logger.gs 결제취소 기록 완료");
    } catch (err) {
      console.error("❌ Logger.gs 결제취소 기록 실패:", err);
    }

    // 실패 페이지는 커스텀 도메인으로 고정하는 게 UX상 깔끔
    return Response.redirect("https://www.easysaju.kr/payment-fail.html");
  }

  // 3) 승인 API 호출 (여기 응답에 goodsName이 안정적으로 포함됨)
  let result;
  try {
    const approve = await fetch(`https://api.nicepay.co.kr/v1/payments/${tid}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${secret}`,
      },
      body: JSON.stringify({ amount: Number(amountFromForm) || 0 }),
    });

    result = await approve.json();
    console.log("[NICE APPROVE RESULT]", result);
  } catch (err) {
    console.error("❌ NICE 승인 요청 실패:", err);
    // 승인요청 자체가 실패해도 고객은 실패 페이지로 안내
    return Response.redirect("https://www.easysaju.kr/payment-fail.html");
  }

  // 4) 승인 성공 처리
  if (result && result.resultCode === "0000") {
    // ✅ 상품명/주문번호/금액은 '승인 응답' 기준으로 확정
    const resolvedGoodsName =
      result.goodsName ??
      result.GoodsName ??
      result.goods_name ??
      goodsNameFromForm ??
      "이지사주 상담";

    const resolvedOrderId = result.orderId || orderIdFromForm || "";
    const resolvedAmount  = typeof result.amount === "number"
      ? result.amount
      : Number(result.amount || amountFromForm || 0);

    // (선택) 응답 서명 검증을 나중에 붙일 경우 대비하여 로그만 남김
    // const approveSig = result.signature; // 필요시 Logger.gs에 남겨서 대조

    // 4-1) 시트에 결제완료 기록
    try {
      await fetch(
        "https://script.google.com/macros/s/AKfycbz_SRAMhhOT396196sgEzHeDMNk_oF7IL-M5BpAReKum04hVtkVYw0AwY71P4SyEdm-/exec",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            mode: "updatePayment",
            orderId: resolvedOrderId,
            payStatus: "결제완료",
          }),
        }
      );
      console.log("✅ Logger.gs 결제완료 기록 성공");
    } catch (err) {
      console.error("❌ Logger.gs 결제완료 기록 실패:", err);
      // 기록 실패해도 결제 자체는 성공이므로, 고객 리다이렉트는 진행
    }

    // 4-2) 고객 Thank You 페이지로 이동 (커스텀 도메인 기준)
    const redirectUrl =
      `https://www.easysaju.kr/thankyou.html` +
      `?oid=${encodeURIComponent(resolvedOrderId)}` +
      `&product=${encodeURIComponent(resolvedGoodsName)}` +
      `&price=${encodeURIComponent(resolvedAmount)}`;

    return Response.redirect(redirectUrl);
  }

  // 5) 승인 응답이 실패인 경우 → 실패 기록 + 실패 페이지
  try {
    await fetch(
      "https://script.google.com/macros/s/AKfycbz_SRAMhhOT396196sgEzHeDMNk_oF7IL-M5BpAReKum04hVtkVYw0AwY71P4SyEdm-/exec",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          mode: "updatePayment",
          orderId: orderIdFromForm || "",
          payStatus: "결제실패",
        }),
      }
    );
    console.log("⚠️ Logger.gs 결제실패 기록 완료");
  } catch (err) {
    console.error("❌ Logger.gs 결제실패 기록 실패:", err);
  }

  return Response.redirect("https://www.easysaju.kr/payment-fail.html");
}
