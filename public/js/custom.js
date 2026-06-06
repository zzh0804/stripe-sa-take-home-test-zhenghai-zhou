/**
 * Clientside helper functions
 */

$(document).ready(async function () {
  // Keep existing amount formatting
  var amounts = document.getElementsByClassName("amount");
  for (var i = 0; i < amounts.length; i++) {
    var amount = amounts[i].getAttribute("data-amount") / 100;
    amounts[i].innerHTML = amount.toFixed(2);
  }

  // Only run Stripe checkout logic on checkout page
  var paymentElementContainer = document.getElementById("payment-element");
  if (!paymentElementContainer) return;

  var form = document.querySelector('form[name="payment-form"]');
  var errorEl = document.getElementById("payment-errors");

  // Read values rendered by server onto DOM via data-attributes
  var publishableKey = paymentElementContainer.getAttribute(
    "data-publishable-key",
  );
  var amountCents = Number(paymentElementContainer.getAttribute("data-amount"));
  var currency = paymentElementContainer.getAttribute("data-currency") || "usd";

  const stripe = Stripe(publishableKey);

  // Create PaymentIntent
  const intentRes = await fetch("/create-payment-intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount: amountCents, currency: currency }),
  });

  const intentData = await intentRes.json();

  if (!intentRes.ok || !intentData.clientSecret) {
    errorEl.textContent = intentData.error || "Unable to initialize payment.";
    return;
  }

  // Initialize Elements
  const elements = stripe.elements({ clientSecret: intentData.clientSecret });
  const paymentElement = elements.create("payment");
  paymentElement.mount("#payment-element");

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    errorEl.textContent = "";

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + "/success",
      },
    });

    // If redirect does not happen and there is an immediate error
    if (error) {
      errorEl.textContent = error.message || "Payment failed.";
    }
  });
});
