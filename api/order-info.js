// /api/order-info.js
import { getOrderByToken } from "./generate-token.js";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) return new Response("Token required", { status: 400 });

  const order = getOrderByToken(token);
  if (!order) return new Response("Invalid or expired token", { status: 403 });

  return Response.json({
    orderId: order.orderId,
    product: order.product,
    amount: order.amount,
  });
}
