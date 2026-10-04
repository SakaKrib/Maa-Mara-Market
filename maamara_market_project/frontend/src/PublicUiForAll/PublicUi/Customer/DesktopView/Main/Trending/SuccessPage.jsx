import { useLocation, useNavigate } from "react-router-dom";

export default function PaymentSuccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const order = location.state?.order || null;

  const orderId = order?.id || order?.order_id || null;
  const amount = order?.amount ?? order?.final_total ?? order?.total ?? null;
  const paymentMethod =
    order?.payment_method ||
    (order?.paypal_order_id ? "PayPal" : null) ||
    "Payment";

  return (
    <main className="mm-payment-page mm-success-page min-h-screen px-4 py-10 md:px-6 md:py-16">
      <div className="mm-container mm-success-container">
        <section className="mm-success-card" aria-labelledby="payment-success-title">
          <div className="mm-success-icon" aria-hidden="true">
            <span>✓</span>
          </div>

          <p className="mm-success-eyebrow">Payment confirmed</p>

          <h1 id="payment-success-title" className="mm-success-title">
            Thank you for your order
          </h1>

          <p className="mm-success-message">
            Your payment was successfully processed and your order has been
            received by Maa Mara Market.
          </p>

          {orderId && (
            <div className="mm-success-order">
              <div>
                <span>Order number</span>
                <strong>#{orderId}</strong>
              </div>
              {amount !== null && amount !== undefined && (
                <div>
                  <span>Amount</span>
                  <strong>KES {Number(amount).toLocaleString()}</strong>
                </div>
              )}
              <div>
                <span>Payment method</span>
                <strong>{paymentMethod}</strong>
              </div>
            </div>
          )}

          <div className="mm-success-actions">
            <button type="button" className="mm-success-primary" onClick={() => navigate("/")}>
              Continue Shopping
            </button>
            {orderId && (
              <button type="button" className="mm-success-secondary" onClick={() => navigate("/customer-order")}>
                View My Orders
              </button>
            )}
          </div>

          <p className="mm-success-note">
            Keep your order number for reference. You can view your orders from your account.
          </p>
        </section>
      </div>
    </main>
  );
}
