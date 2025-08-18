export function buildOrderDetailsHtml(order: any): string {
  const num = (v: any, d = 0): number => {
    if (v == null || v === "") return d;
    if (typeof v === "number") return Number.isFinite(v) ? v : d;
    if (typeof v === "string") {
      const cleaned = v.replace(/[^0-9.\-]/g, "");
      const n = parseFloat(cleaned);
      return Number.isFinite(n) ? n : d;
    }
    return d;
  };

  const qtySafe = (v: any) => {
    const q = Math.round(num(v, 1));
    return q > 0 ? q : 1;
  };

  const money = (dollars: number) => `$${dollars.toFixed(2)}`;

  const orderTotal = num(order?.amount, 0);
  const orderDateStr = order?.createdAt
    ? new Date(order.createdAt).toLocaleString()
    : "";
  const orderNo =
    order?.orderNumber ?? (order?._id ? String(order._id).slice(-6) : "—");
  const shipTo = order?.shipping_address_string || order?.customerAddress || "";

  const rows = (Array.isArray(order?.items) ? order.items : [])
    .map((item: any) => {
      const q = qtySafe(item?.quantity);

      // Price selection (prefer new flow)
      const unit =
        num(item?.unitPrice) ||
        num(item?.salePrice) ||
        num(item?.discountedPrice) ||
        num(item?.originalPrice) ||
        num(item?.price);

      const base = num(item?.originalPrice) || num(item?.price) || unit;

      const lineOrig = base * q;
      const lineSale = unit * q;

      const hasDiscount = unit < base;

      const name = item?.name || "Item";
      const size =
        typeof item?.size === "string" && item.size.trim().length > 0
          ? item.size
          : null;

      const img = typeof item?.image === "string" ? item.image.trim() : "";
      const imgHtml = img
        ? `<img src="${img}" alt="${name}" style="width:50px;height:50px;object-fit:cover;border-radius:4px;" />`
        : "";

      const unitLine = `<div style="font-size:12px;color:#555;margin-top:2px;">Unit: ${money(
        unit
      )}</div>`;

      const subtotalHtml = hasDiscount
        ? `<span style="text-decoration:line-through;color:#999;margin-right:6px;">${money(
            lineOrig
          )}</span><span style="color:#0a8f33;font-weight:600;">${money(
            lineSale
          )}</span>`
        : `${money(lineSale)}`;

      const sizeBadge = size
        ? `<span style="display:inline-block;font-size:12px;padding:2px 8px;border-radius:999px;background:#364763;color:#fff;margin-left:6px;">Size: ${size}</span>`
        : "";

      return `
        <tr>
          <td style="padding:8px;border:1px solid #ddd;">
            <div style="display:flex;align-items:center;gap:10px;">
              ${imgHtml}
              <div>
                <div>${name}${sizeBadge}</div>
                ${unitLine}
              </div>
            </div>
          </td>
          <td style="padding:8px;border:1px solid #ddd;">x${q}</td>
          <td style="padding:8px;border:1px solid #ddd;">${subtotalHtml}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <p><strong>Order #:</strong> ${orderNo}<br>
    <strong>Stripe Session:</strong> ${order?.stripeSessionId || "—"}<br>
    <strong>Order Date:</strong> ${orderDateStr}</p>

    <table style="width:100%;border-collapse:collapse;margin-top:20px;">
      <thead>
        <tr style="background-color:#f2f2f2;">
          <th align="left" style="padding:8px;border:1px solid #ddd;">Item</th>
          <th align="left" style="padding:8px;border:1px solid #ddd;">Quantity</th>
          <th align="left" style="padding:8px;border:1px solid #ddd;">Subtotal</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <p style="margin-top:20px;"><strong>Shipping to:</strong><br>${shipTo}</p>
    <p><strong>Total:</strong> ${money(orderTotal)}</p>
  `;
}
