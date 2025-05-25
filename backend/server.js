require('dotenv').config();
const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// Job scheduling
const scheduledJobsPath = path.join(__dirname, 'scheduledJobs.json');

// Load scheduled jobs from file or initialize empty array
let scheduledJobs = [];
try {
  if (fs.existsSync(scheduledJobsPath)) {
    scheduledJobs = JSON.parse(fs.readFileSync(scheduledJobsPath, 'utf8'));
    console.log(`Loaded ${scheduledJobs.length} scheduled refund jobs`);
  }
} catch (err) {
  console.error('Error loading scheduled jobs:', err);
}

// Save scheduled jobs to file
const saveScheduledJobs = () => {
  fs.writeFileSync(scheduledJobsPath, JSON.stringify(scheduledJobs, null, 2), 'utf8');
};

// Routes
app.get('/', (req, res) => {
  res.send('Blocker App Payment Server is running');
});

// Create a payment intent
app.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount, userId, appId, unlockDuration } = req.body;
    
    // Validate required fields
    if (!amount || !userId || !appId || !unlockDuration) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Create a payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount, // amount in cents
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        userId,
        appId,
        unlockDuration,
        // Include refund policy in metadata
        refundPolicy: '90% refund after 7 days'
      }
    });
    
    // Return the client secret
    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: error.message });
  }
});

// Webhook handler for payment events
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Handle specific events
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`);
      
      // Schedule refund for 7 days later
      const { userId, appId } = paymentIntent.metadata;
      scheduleRefund(paymentIntent.id, userId, appId);
      break;
      
    case 'payment_intent.payment_failed':
      console.log('Payment failed:', event.data.object);
      break;
      
    default:
      console.log(`Unhandled event type ${event.type}`);
  }
  
  // Return a response to acknowledge receipt of the event
  res.json({ received: true });
});

// Helper function to schedule a refund
const scheduleRefund = (paymentIntentId, userId, appId) => {
  // Calculate refund date (7 days from now)
  const refundDate = new Date();
  refundDate.setDate(refundDate.getDate() + 7);
  
  // Add job to scheduler
  const job = {
    id: `refund-${paymentIntentId}`,
    paymentIntentId,
    userId,
    appId,
    refundDate: refundDate.toISOString(),
    processed: false
  };
  
  scheduledJobs.push(job);
  saveScheduledJobs();
  
  console.log(`Scheduled refund for payment ${paymentIntentId} on ${refundDate.toISOString()}`);
};

// Process scheduled refunds (run daily)
cron.schedule('0 0 * * *', async () => {
  console.log('Running scheduled refund task');
  const now = new Date();
  let jobsUpdated = false;
  
  for (const job of scheduledJobs) {
    // Skip already processed jobs
    if (job.processed) continue;
    
    // Check if it's time to process the refund
    const refundDate = new Date(job.refundDate);
    if (now >= refundDate) {
      try {
        console.log(`Processing scheduled refund for ${job.paymentIntentId}`);
        
        // Get the payment intent to find the payment
        const paymentIntent = await stripe.paymentIntents.retrieve(job.paymentIntentId);
        const paymentId = paymentIntent.latest_charge;
        
        // Process the refund (90% of the original amount)
        const originalAmount = paymentIntent.amount;
        const refundAmount = Math.floor(originalAmount * 0.9); // 90% refund
        
        const refund = await stripe.refunds.create({
          charge: paymentId,
          amount: refundAmount,
          metadata: {
            userId: job.userId,
            appId: job.appId,
            originalAmount,
            refundPercentage: '90%'
          }
        });
        
        console.log(`Processed refund: ${refund.id} for user ${job.userId}, app ${job.appId}`);
        
        // Mark job as processed
        job.processed = true;
        job.processedDate = now.toISOString();
        job.refundId = refund.id;
        jobsUpdated = true;
      } catch (error) {
        console.error(`Error processing refund for ${job.paymentIntentId}:`, error);
        // Mark as failed but keep for retry
        job.lastError = error.message;
        job.lastErrorDate = now.toISOString();
        jobsUpdated = true;
      }
    }
  }
  
  // Save updated job status
  if (jobsUpdated) {
    saveScheduledJobs();
  }
});

// Start server
app.listen(port, () => {
  console.log(`Blocker App Payment Server running on port ${port}`);
});
