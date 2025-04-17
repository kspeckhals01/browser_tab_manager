import Stripe from "https://esm.sh/stripe@12.6.0?bundle";
export const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2022-11-15",
});