import axios from 'axios';
import User from '../models/User.js';

const HUBSPOT_PRIVATE_API_KEY = process.env.HUBSPOT_PRIVATE_API_KEY;
const HUBSPOT_API_BASE = 'https://api.hubapi.com/crm/v3';

/**
 * Get user's orders (HubSpot Deals that are paid or refunded)
 * GET /api/orders
 * Note: Uses HubSpot Deals API (not Commerce Orders API which requires additional scopes)
 */
export const getUserOrders = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!HUBSPOT_PRIVATE_API_KEY) {
      return res.status(500).json({ message: 'HubSpot API key not configured' });
    }

    // Get HubSpot contact ID by email
    const contactResponse = await axios.get(
      `${HUBSPOT_API_BASE}/objects/contacts/${encodeURIComponent(user.email)}?idProperty=email&properties=hs_object_id`,
      {
        headers: {
          Authorization: `Bearer ${HUBSPOT_PRIVATE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const contactId = contactResponse.data.id;

    // Get deals associated with this contact using the associations API
    // This is the correct way to get associated deals for a contact
    const associationsResponse = await axios.get(
      `${HUBSPOT_API_BASE}/objects/contacts/${contactId}/associations/deals`,
      {
        params: {
          limit: 100,
        },
        headers: {
          Authorization: `Bearer ${HUBSPOT_PRIVATE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const dealIds = (associationsResponse.data.results || []).map((assoc) => assoc.id);

    if (dealIds.length === 0) {
      return res.status(200).json({
        message: 'Orders fetched successfully',
        orders: [],
      });
    }

    // Fetch deal details - use search API with IN filter for deal IDs
    // HubSpot search API supports filtering by hs_object_id with IN operator
    const dealsBatchResponse = await axios.post(
      `${HUBSPOT_API_BASE}/objects/deals/batch/read`,
      {
        propertiesWithHistory: [],
        properties: ['dealname', 'amount', 'dealstage', 'closedate', 'createdate', 'hs_object_id'],
        inputs: dealIds.map((id) => ({ id })),
      },
      {
        headers: {
          Authorization: `Bearer ${HUBSPOT_PRIVATE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const allDeals = dealsBatchResponse.data.results || [];

    // Filter for paid or refunded deals
    // Only include deals that have a close date (indicating they're closed/completed)
    const orders = allDeals
      .filter((deal) => {
        // Only include deals that are closed (have a close date)
        // This ensures we only show completed/paid deals, not open opportunities
        return deal.properties?.closedate;
      })
      .map((deal) => {
        // Determine status based on dealstage
        // HubSpot stages can be IDs or labels, so we check both patterns
        const stage = (deal.properties?.dealstage || '').toLowerCase();

        // Common patterns: "closedwon" = paid, "closedlost" = refunded
        // Adjust these based on your actual HubSpot pipeline stage names/IDs
        const isPaid = stage.includes('won') ||
          (stage.includes('paid') && !stage.includes('refunded')) ||
          (!stage.includes('lost') && !stage.includes('refunded') && deal.properties?.closedate);

        return {
          id: deal.id,
          dealId: deal.properties?.hs_object_id,
          name: deal.properties?.dealname || 'Unnamed Deal',
          amount: deal.properties?.amount || '0',
          status: isPaid ? 'Paid' : 'Refunded',
          dealStage: deal.properties?.dealstage,
          closeDate: deal.properties?.closedate,
          createDate: deal.properties?.createdate,
        };
      })
      .sort((a, b) => {
        // Sort newest first
        const dateA = new Date(a.createDate || 0).getTime();
        const dateB = new Date(b.createDate || 0).getTime();
        return dateB - dateA;
      });

    res.status(200).json({
      message: 'Orders fetched successfully',
      orders,
    });
  } catch (error) {
    console.error('Error fetching orders:', error.response?.data || error.message);
    res.status(500).json({
      message: 'Error fetching orders',
      error: error.response?.data || error.message,
    });
  }
};

/**
 * Get payments for a specific deal or all payments for user
 * GET /api/orders/payments?dealId=xxx
 */
export const getPayments = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!HUBSPOT_PRIVATE_API_KEY) {
      return res.status(500).json({ message: 'HubSpot API key not configured' });
    }

    const { dealId } = req.query;

    // Get HubSpot contact ID
    const contactResponse = await axios.get(
      `${HUBSPOT_API_BASE}/objects/contacts/${encodeURIComponent(user.email)}?idProperty=email&properties=hs_object_id`,
      {
        headers: {
          Authorization: `Bearer ${HUBSPOT_PRIVATE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const contactId = contactResponse.data.id;

    // Use HubSpot's Commerce Payments API
    let payments = [];

    try {
      // First, get payments associated with the contact via associations API
      const paymentsAssocResponse = await axios.get(
        `${HUBSPOT_API_BASE}/objects/contacts/${contactId}/associations/commerce_payments`,
        {
          params: {
            limit: 100,
          },
          headers: {
            Authorization: `Bearer ${HUBSPOT_PRIVATE_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const paymentIds = (paymentsAssocResponse.data.results || []).map((assoc) => assoc.id);

      if (paymentIds.length === 0) {
        return res.status(200).json({
          message: 'Payments fetched successfully',
          payments: [],
        });
      }

      // Fetch payment details using batch read
      const paymentsBatchResponse = await axios.post(
        `${HUBSPOT_API_BASE}/objects/commerce_payments/batch/read`,
        {
          propertiesWithHistory: [],
          properties: ['hs_initial_amount', 'hs_payment_status', 'hs_initiated_date', 'hs_object_id'],
          inputs: paymentIds.map((id) => ({ id })),
        },
        {
          headers: {
            Authorization: `Bearer ${HUBSPOT_PRIVATE_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const allPayments = paymentsBatchResponse.data.results || [];
      console.log(allPayments);


      // Get associations for each payment to find linked deals/orders
      const paymentsWithAssociations = await Promise.all(
        allPayments.map(async (payment) => {
          try {
            // Get associated deals for this payment
            const dealAssocResponse = await axios.get(
              `${HUBSPOT_API_BASE}/objects/commerce_payments/${payment.id}/associations/deals`,
              {
                headers: {
                  Authorization: `Bearer ${HUBSPOT_PRIVATE_API_KEY}`,
                  'Content-Type': 'application/json',
                },
              }
            );

            const dealIds = (dealAssocResponse.data.results || []).map((assoc) => assoc.id);

            console.log(dealIds);

            return {
              ...payment,
              dealIds: dealIds,
            };
          } catch (assocError) {
            return {
              ...payment,
              dealIds: [],
            };
          }
        })
      );

      payments = paymentsWithAssociations
        .filter((payment) => {
          // If dealId is specified, filter by it
          if (dealId) {
            return payment.dealIds.includes(dealId.toString());
          }
          return true;
        })
        .map((payment, index) => {
          const status = payment.properties?.hs_payment_status || 'Unknown';
          const statusLower = status.toLowerCase();

          return {
            id: payment.id,
            paymentId: payment.properties?.hs_object_id,
            paymentNumber: `#${index + 1}`, // Generate payment number since HubSpot doesn't have it
            amount: payment.properties?.hs_initial_amount || '0',
            status: statusLower === 'refunded' ? 'Refunded' :
              (statusLower === 'paid' || statusLower === 'completed' ? 'Paid' : status),
            createDate: payment.properties?.hs_initiated_date,
            dealIds: payment.dealIds || [],
          };
        })
        .filter((payment) => {
          // Only show paid or refunded payments
          const status = payment.status.toLowerCase();
          return status === 'paid' || status === 'refunded' || status === 'completed';
        })
        .sort((a, b) => {
          // Sort newest first
          const dateA = new Date(a.createDate || 0).getTime();
          const dateB = new Date(b.createDate || 0).getTime();
          return dateB - dateA;
        });
    } catch (error) {
      console.log('Commerce Payments API error:', error.response?.data || error.message);
      payments = [];
    }

    res.status(200).json({
      message: 'Payments fetched successfully',
      payments,
    });
  } catch (error) {
    console.error('Error fetching payments:', error.response?.data || error.message);
    res.status(500).json({
      message: 'Error fetching payments',
      error: error.response?.data || error.message,
    });
  }
};

/**
 * Get user's subscriptions
 * GET /api/orders/subscriptions
 */
export const getSubscriptions = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!HUBSPOT_PRIVATE_API_KEY) {
      return res.status(500).json({ message: 'HubSpot API key not configured' });
    }

    // Get HubSpot contact ID
    const contactResponse = await axios.get(
      `${HUBSPOT_API_BASE}/objects/contacts/${encodeURIComponent(user.email)}?idProperty=email&properties=hs_object_id`,
      {
        headers: {
          Authorization: `Bearer ${HUBSPOT_PRIVATE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const contactId = contactResponse.data.id;

    // Use HubSpot's Subscriptions API
    let subscriptions = [];

    try {
      // Get subscriptions associated with the contact via associations API
      const subscriptionsAssocResponse = await axios.get(
        `${HUBSPOT_API_BASE}/objects/contacts/${contactId}/associations/subscriptions`,
        {
          params: {
            limit: 100,
          },
          headers: {
            Authorization: `Bearer ${HUBSPOT_PRIVATE_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const subscriptionIds = (subscriptionsAssocResponse.data.results || []).map((assoc) => assoc.id);

      if (subscriptionIds.length === 0) {
        return res.status(200).json({
          message: 'Subscriptions fetched successfully',
          subscriptions: [],
        });
      }

      // Fetch subscription details using batch read
      const subscriptionsBatchResponse = await axios.post(
        `${HUBSPOT_API_BASE}/objects/subscriptions/batch/read`,
        {
          propertiesWithHistory: [],
          properties: ['hs_status', 'hs_last_payment_amount', 'hs_next_billing_date', 'hs_object_id'],
          inputs: subscriptionIds.map((id) => ({ id })),
        },
        {
          headers: {
            Authorization: `Bearer ${HUBSPOT_PRIVATE_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const allSubscriptions = subscriptionsBatchResponse.data.results || [];

      // Get last 4 digits from payment method (if available)
      subscriptions = await Promise.all(
        allSubscriptions.map(async (subscription) => {
          let last4 = '****';

          // Try to get payment method information via associations
          try {
            const paymentMethodAssocResponse = await axios.get(
              `${HUBSPOT_API_BASE}/objects/subscriptions/${subscription.id}/associations/payment_methods`,
              {
                headers: {
                  Authorization: `Bearer ${HUBSPOT_PRIVATE_API_KEY}`,
                  'Content-Type': 'application/json',
                },
              }
            );

            const paymentMethodIds = (paymentMethodAssocResponse.data.results || []).map((assoc) => assoc.id);

            // If we have payment methods, try to get last 4 from the first one
            if (paymentMethodIds.length > 0) {
              try {
                const paymentMethodResponse = await axios.get(
                  `${HUBSPOT_API_BASE}/objects/payment_methods/${paymentMethodIds[0]}?properties=last_4,hs_last_4`,
                  {
                    headers: {
                      Authorization: `Bearer ${HUBSPOT_PRIVATE_API_KEY}`,
                      'Content-Type': 'application/json',
                    },
                  }
                );

                last4 = paymentMethodResponse.data.properties?.last_4 ||
                  paymentMethodResponse.data.properties?.hs_last_4 ||
                  '****';
              } catch (pmError) {
                // Payment method details not available
              }
            }
          } catch (pmAssocError) {
            // Payment method association might not be available
          }

          return {
            id: subscription.id,
            subscriptionId: subscription.properties?.hs_object_id,
            status: subscription.properties?.hs_status || 'Unknown',
            last4: last4,
            nextBillingDate: subscription.properties?.hs_next_billing_date,
          };
        })
      );

      subscriptions = subscriptions.sort((a, b) => {
        // Sort active subscriptions first
        if (a.status.toLowerCase() === 'active' && b.status.toLowerCase() !== 'active') return -1;
        if (a.status.toLowerCase() !== 'active' && b.status.toLowerCase() === 'active') return 1;
        return 0;
      });
    } catch (error) {
      console.log('Subscriptions API error:', error.response?.data || error.message);
      subscriptions = [];
    }

    res.status(200).json({
      message: 'Subscriptions fetched successfully',
      subscriptions,
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error.response?.data || error.message);
    res.status(500).json({
      message: 'Error fetching subscriptions',
      error: error.response?.data || error.message,
    });
  }
};

