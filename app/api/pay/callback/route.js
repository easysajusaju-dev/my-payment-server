// /app/api/pay/callback/route.js
import { NextResponse } from "next/server";

export async function POST(req) {
  const body = await req.formData();

  const authResultCode = body.get("authResultCode");
  const authToken = body.get("authToken");
  const tid = body.get("tid");
  const amount = body.get("amount");

  // 실패라면 실패 페이지로
  if (authResultCode !== "0000") {
    return NextResponse.redirect(
      "https://easysajusaju-dev.github.io/payment-fail.html"
    );
  }

  const res = await fetch(`https://api.nicepay.co.kr/v1/payments/${tid}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${process.env.NICE_SECRET_BASE64}`,
    },
    body: JSON.stringify({ amount }),
  });

  const data = await res.json();

  if (data.resultCode === "0000") {
    return NextResponse.redirect(
      `https://easysajusaju-dev.github.io/thankyou.html?oid=${data.orderId}&amount=${data.amount}`
    );
  } else {
    return NextResponse.redirect(
      "https://easysajusaju-dev.github.io/payment-fail.html"
    );
  }
}
