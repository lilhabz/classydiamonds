export function buildOrderDetailsHtml(order: any): string {
  const itemRows = (order.items || [])
    .map(
      (item: any) => `
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <img src="${item.image}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;" />
                  <span>${item.name}</span>
                </div>
              </td>
              <td style="padding: 8px; border: 1px solid #ddd;">x${item.quantity}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">$${(item.price * item.quantity).toFixed(2)}</td>
            </tr>`
    )
    .join("");

  const orderDate = order.createdAt
    ? new Date(order.createdAt).toLocaleString()
    : "";

  return `
    <p><strong>Order ID:</strong> ${order.orderNumber}<br>
    <strong>Stripe Session:</strong> ${order.stripeSessionId}<br>
    <strong>Order Date:</strong> ${orderDate}</p>

    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
      <thead>
        <tr style="background-color: #f2f2f2;">
          <th align="left" style="padding: 8px; border: 1px solid #ddd;">Item</th>
          <th align="left" style="padding: 8px; border: 1px solid #ddd;">Quantity</th>
          <th align="left" style="padding: 8px; border: 1px solid #ddd;">Subtotal</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <p style="margin-top: 20px;"><strong>Shipping to:</strong><br>${order.customerAddress}</p>
    <p><strong>Total:</strong> $${order.amount.toFixed(2)}</p>
  `;
}
