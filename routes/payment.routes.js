const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const auth = require('../middleware/auth');
const UserModel = require('../models/User');
const admin = require('firebase-admin');
const router = express.Router();

// Define the product and price IDs for each plan
const PRODUCT_PRICES = {
  basic: 'price_1RBPzmKFLhrvSzkgdvOEiKzU', 
  pro: 'price_1RBQ0hKFLhrvSzkg3lUpn1V2'    
};

// GET /api/payment/plans - Fetch available subscription plans
router.get('/plans', async (req, res) => {
  try {
    const plans = {};
    
    // Fetch the price info from Stripe using the IDs
    for (const [plan, priceId] of Object.entries(PRODUCT_PRICES)) {
      try {
        const price = await stripe.prices.retrieve(priceId);
        plans[plan] = {
          id: price.id,
          name: plan.charAt(0).toUpperCase() + plan.slice(1),
          amount: price.unit_amount,
          currency: price.currency
        };
      } catch (err) {
        console.error(`Error fetching price for ${plan}:`, err);
      }
    }
    
    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription plans'
    });
  }
});

// POST /api/payment/checkout
router.post('/checkout', auth, async (req, res) => {
  try {
    const { plan } = req.body;
    const userId = req.user.id;
    const email = req.user.email;

    // Validate plan
    if (!['basic', 'pro'].includes(plan)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription plan'
      });
    }

    // Fetch user
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    let stripeCustomerId = user.stripeCustomerId;

    // Create Stripe customer if not exists
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { userId }
      });

      stripeCustomerId = customer.id;

      // Save new customer ID in DB immediately after creation
      await UserModel.update(userId, { stripeCustomerId });
    }

    // Get Stripe price ID
    const priceId = PRODUCT_PRICES[plan];
    if (!priceId) {
      return res.status(404).json({
        success: false,
        message: `Price ID not found for plan: ${plan}`
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${process.env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/payment/cancel`,
      metadata: { userId, plan }
    });

    res.json({
      success: true,
      data: { url: session.url }
    });

  } catch (error) {
    console.error('Stripe checkout error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to create checkout session'
    });
  }
});



// POST /api/payment/webhook
router.post('/webhook', async (req, res) => {
  const signature = req.headers['stripe-signature'];
  
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }
  
  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      console.log(`Checkout session completed for user ${session.metadata?.userId}`);

      try {
        if (session.metadata?.userId && session.metadata?.plan) {
          await UserModel.update(session.metadata.userId, {
            subscription: session.metadata.plan,
          });
          console.log(`User ${session.metadata.userId} subscription updated to ${session.metadata.plan}`);
        }
      } catch (err) {
        console.error('Failed to update user subscription:', err);
      }
      break;
    }

    case 'customer.subscription.created': {
      const subscription = event.data.object;
      console.log(`Subscription created for customer ${subscription.customer}`);
      const session = event.data.object;
      const product = {
        name: session.metadata.plan
      };
      
      // Create subscription data in the required format
      const subscriptionData = {
        id: session.id,
        status: 'active',
        plan: product.name,
        cancel_at_period_end: false
      };
      // Update user's subscription status in your DB
      try {
        const userId = subscription.metadata?.userId; // You should add metadata to the subscription if possible
        if (userId) {
          await UserModel.update(userId, {
            subscription: subscriptionData 
          });
          console.log(`User ${userId} subscription activated.`);
        }
      } catch (err) {
        console.error('Error saving new subscription:', err);
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      console.log(`Subscription updated for customer ${subscription.customer}`);

      try {
        const userId = subscription.metadata?.userId;
        if (userId) {
          await UserModel.update(userId, {
            subscriptionStatus: subscription.status,
          });
          console.log(`User ${userId} subscription status updated to ${subscription.status}`);
        }
      } catch (err) {
        console.error('Error updating subscription status:', err);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      console.log(`Subscription cancelled for customer ${subscription.customer}`);

      try {
        const userId = subscription.metadata?.userId;
        if (userId) {
          await UserModel.update(userId, {
            subscriptionStatus: 'cancelled',
          });
          console.log(`User ${userId} subscription marked as cancelled`);
        }
      } catch (err) {
        console.error('Error updating subscription cancellation:', err);
      }
      break;
    }

    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object;
      console.log(`PaymentIntent succeeded for customer ${paymentIntent.customer}`);
      break;
    }

    default:
      console.log(`Unhandled event type ${event.type}`);
  }
  
  res.status(200).json({ received: true });
});

// GET /api/payment/verify
router.get('/verify', auth, async (req, res) => {
  try {
    const { session_id } = req.query;
    
    if (!session_id) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }
    
    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    // Check if payment was successful
    if (session.payment_status === 'paid') {
      // Update user subscription status
      try {
        if (session.metadata.userId && session.metadata.plan) {
          // Get the product details
          const product = {
            name: session.metadata.plan
          };
          
          // Create subscription data in the required format
          const subscriptionData = {
            id: session.id,
            status: 'active',
            plan: product.name,
            cancel_at_period_end: false
          };
          
          await UserModel.update(session.metadata.userId, { 
            subscription: subscriptionData 
          });
          console.log(`User ${session.metadata.userId} subscription verified and updated to ${session.metadata.plan}`);
        }
      } catch (error) {
        console.error('Error updating user subscription during verification:', error);
      }
      
      return res.json({
        success: true,
        data: {
          paid: true,
          plan: session.metadata.plan
        }
      });
    }
    
    return res.json({
      success: true,
      data: {
        paid: false
      }
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment'
    });
  }
});

// POST /api/payment/unsubscribe


router.post('/unsubscribe', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Retrieve the user from Firebase
    const userRef = admin.database().ref(`users/${userId}`);
    const snapshot = await userRef.once('value');
    const user = snapshot.val();

    if (!user || !user.stripeCustomerId) {
      return res.status(400).json({
        success: false,
        message: 'No active subscription found for this user'
      });
    }

    // Fetch active Stripe subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: 'active',
      limit: 1
    });

    if (subscriptions.data.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active subscription found for this user on Stripe'
      });
    }

    const subscriptionId = subscriptions.data[0].id;

    // Immediately cancel the subscription
    const canceledSubscription = await stripe.subscriptions.cancel(subscriptionId);

    // Update Firebase Realtime DB
    await userRef.update({
      subscription: {
        plan: 'free',
        status: 'canceled',
        endsAt: null
      }
    });

    res.json({
      success: true,
      message: 'Subscription cancelled successfully',
      stripeStatus: canceledSubscription.status
    });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription'
    });
  }
});




module.exports = router;
