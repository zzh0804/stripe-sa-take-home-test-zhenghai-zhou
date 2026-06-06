const express = require("express");
const path = require("path");
const exphbs = require("express-handlebars");
require("dotenv").config();
const Stripe = require("stripe");

var app = express();

// Stripe initialization
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// view engine setup (Handlebars)
app.engine(
  "hbs",
  exphbs({
    defaultLayout: "main",
    extname: ".hbs",
  }),
);
app.set("view engine", "hbs");
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json({}));

/**
 * Home route
 */
app.get("/", function (req, res) {
  res.render("index");
});

/**
 * Checkout route
 */
app.get("/checkout", function (req, res) {
  // Just hardcoding amounts here to avoid using a database
  const item = req.query.item;
  let title, amount, error;

  switch (item) {
    case "1":
      title = "The Art of Doing Science and Engineering";
      amount = 2300;
      break;
    case "2":
      title = "The Making of Prince of Persia: Journals 1985-1993";
      amount = 2500;
      break;
    case "3":
      title = "Working in Public: The Making and Maintenance of Open Source";
      amount = 2800;
      break;
    default:
      // Included in layout view, feel free to assign error
      error = "No item selected";
      break;
  }

  res.render("checkout", {
    title: title,
    amount: amount,
    error: error,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY, // adding Stripe publishable key so the frontent component can initialize Stripe
    currency: "usd",
  });
});

/**
 * Success route
 * Added paymentintent id handling
 */
app.get("/success", async function (req, res) {
  try {
    const paymentIntentId = req.query.payment_intent;

    if (!paymentIntentId) {
      return res.render("success", {
        error: "Missing payment reference.",
      });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    const amount = (paymentIntent.amount / 100).toFixed(2);
    const currency = (paymentIntent.currency || "usd").toUpperCase();

    return res.render("success", {
      paymentIntentId: paymentIntent.id,
      amount,
      currency,
    });
  } catch (err) {
    console.error(err);

    return res.render("success", {
      error: "Unable to retrieve payment details.",
    });
  }
});

// create paymentintent
app.post("/create-payment-intent", async (req, res) => {
  try {
    const { amount, currency } = req.body;

    if (!amount || !currency) {
      return res.status(400).json({
        error: "Amount and currency are required",
      });
    }

    const parsedAmount = Number(amount);

    if (!Number.isInteger(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        error:
          "Amount must be a positive integer in the smallest currency unit",
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: parsedAmount,
      currency: currency.toLowerCase(),
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Failed to create PaymentIntent",
    });
  }
});

/**
 * Start server
 */
app.listen(3000, () => {
  console.log("Getting served on port 3000");
});
