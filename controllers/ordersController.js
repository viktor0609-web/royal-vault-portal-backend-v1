import axios from 'axios';
import User from '../models/User.js';

const HUBSPOT_PRIVATE_API_KEY = process.env.HUBSPOT_PRIVATE_API_KEY;
const HUBSPOT_API_BASE = 'https://api.hubapi.com/crm/v3';

/**
 * Get user's orders (HubSpot Deals that are paid or refunded)
 * GET /api/orders
 */
export const getUserOrders = async (req, res) => {
  try {
    // 1️⃣ Find user in DB
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (!HUBSPOT_PRIVATE_API_KEY) {
      return res.status(500).json({ message: 'HubSpot API key not configured' });
    }

    // 2️⃣ Get HubSpot contact ID by email using search API
    const contactSearchResponse = await axios.post(
      `${HUBSPOT_API_BASE}/objects/contacts/search`,
      {
        filterGroups: [
          { filters: [{ propertyName: 'email', operator: 'EQ', value: user.email }] }
        ],
        properties: ['hs_object_id'],
        limit: 1
      },
      {
        headers: {
          Authorization: `Bearer ${HUBSPOT_PRIVATE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const contactId = contactSearchResponse.data.results?.[0]?.id;
    if (!contactId) {
      return res.status(404).json({ message: 'HubSpot contact not found' });
    }

    // 3️⃣ Get deals associated with this contact
    const associationsResponse = await axios.get(
      `${HUBSPOT_API_BASE}/objects/contacts/${contactId}/associations/deals`,
      {
        params: { limit: 100 },
        headers: {
          Authorization: `Bearer ${HUBSPOT_PRIVATE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const dealIds = (associationsResponse.data.results || []).map((assoc) => assoc.id);
    if (dealIds.length === 0) {
      return res.status(200).json({ message: 'Orders fetched successfully', orders: [] });
    }

    // 4️⃣ Fetch deal details in batch
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

    console.log('allDeals', allDeals);

    // 5️⃣ Get pipeline stages to map stage IDs to names
    const stageIdToNameMap = {};
    try {
      const pipelinesResponse = await axios.get(
        'https://api.hubapi.com/crm-pipelines/v1/pipelines/deals',
        {
          headers: {
            Authorization: `Bearer ${HUBSPOT_PRIVATE_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Map all stage IDs to their labels across all pipelines
      if (pipelinesResponse.data && Array.isArray(pipelinesResponse.data.results)) {
        pipelinesResponse.data.results.forEach((pipeline) => {
          if (pipeline.stages && Array.isArray(pipeline.stages)) {
            pipeline.stages.forEach((stage) => {
              if (stage.stageId && stage.label) {
                stageIdToNameMap[stage.stageId] = stage.label;
              }
            });
          }
        });
      }
    } catch (pipelineError) {
      console.warn('Pipeline stages fetch error:', pipelineError.response?.data || pipelineError.message);
      // Continue without stage names if pipeline fetch fails
    }

    // 5️⃣ Fetch payments associated with the contact
    let paymentsByDealId = {};
    try {
      const paymentsAssocResponse = await axios.get(
        `${HUBSPOT_API_BASE}/objects/contacts/${contactId}/associations/commerce_payments`,
        {
          params: { limit: 100 },
          headers: {
            Authorization: `Bearer ${HUBSPOT_PRIVATE_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const paymentIds = (paymentsAssocResponse.data.results || []).map((assoc) => assoc.id);

      if (paymentIds.length > 0) {
        const paymentsBatchResponse = await axios.post(
          `${HUBSPOT_API_BASE}/objects/commerce_payments/batch/read`,
          {
            propertiesWithHistory: [],
            properties: ['hs_initial_amount', 'hs_payment_status', 'hs_initiated_date', 'hs_object_id', 'hs_payment_method_last_4'],
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

        console.log('allPayments -->', allPayments);

        // 6️⃣ Map payments to all associated deals
        await Promise.all(
          allPayments.map(async (payment) => {
            try {


              const dealAssocResponse = await axios.get(
                `${HUBSPOT_API_BASE}/objects/commerce_payments/${payment.id}/associations/deals`,
                {
                  headers: {
                    Authorization: `Bearer ${HUBSPOT_PRIVATE_API_KEY}`,
                    'Content-Type': 'application/json',
                  },
                }
              );

              const paymentDealIds = (dealAssocResponse.data.results || []).map((assoc) =>
                String(assoc.id)
              );

              // Get last 4 digits from payment property (directly available on payment object)
              const last4 = payment.properties?.hs_payment_method_last_4 || '****';

              const mappedPayment = {
                id: payment.id,
                paymentId: payment.properties?.hs_object_id,
                paymentNumber: `#${paymentIds.indexOf(payment.id) + 1}`,
                amount: payment.properties?.hs_initial_amount || '0',
                status: payment.properties?.hs_payment_status || '',
                createDate: payment.properties?.hs_initiated_date,
                last4: last4,
                dealIds: paymentDealIds,
              };

              paymentDealIds.forEach((dealId) => {
                if (!paymentsByDealId[dealId]) paymentsByDealId[dealId] = [];
                paymentsByDealId[dealId].push(mappedPayment);
              });
            } catch (assocError) {
              console.warn('Payment association error:', assocError.message);
            }
          })
        );

        // Sort payments per deal (newest first)
        Object.keys(paymentsByDealId).forEach((dealId) => {
          paymentsByDealId[dealId].sort(
            (a, b) => new Date(b.createDate).getTime() - new Date(a.createDate).getTime()
          );
        });
      }
    } catch (paymentError) {
      console.warn('Commerce Payments API error:', paymentError.response?.data || paymentError.message);
    }

    console.log('allDealsd -->', allDeals);

    // 7️⃣ Map deals to orders
    const orders = allDeals
      .filter((deal) => deal.properties?.closedate) // only closed deals
      .map((deal) => {
        const dealInternalId = String(deal.id);
        const orderPayments = paymentsByDealId[dealInternalId] || [];

        const dealStageId = deal.properties?.dealstage || '';
        const dealStageName = stageIdToNameMap[dealStageId] || dealStageId || '';

        return {
          id: deal.id,
          dealId: deal.properties?.hs_object_id,
          name: deal.properties?.dealname || 'Unnamed Deal',
          amount: deal.properties?.amount || '0',
          status: dealStageName,
          dealStage: dealStageName,
          closeDate: deal.properties?.closedate,
          createDate: deal.properties?.createdate,
          payments: orderPayments,
        };
      })
      .sort((a, b) => new Date(b.createDate).getTime() - new Date(a.createDate).getTime());

    res.status(200).json({ message: 'Orders fetched successfully', orders });
  } catch (error) {
    console.error('Error fetching orders:', error.response?.data || error.message);
    res.status(500).json({
      message: 'Error fetching orders',
      error: error.response?.data || error.message,
    });
  }
};

/**
 * Get current user's order count (for sidebar: hide Orders link for leads)
 * GET /api/orders/count
 */
export const getOrdersCount = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (!HUBSPOT_PRIVATE_API_KEY) {
      return res.status(500).json({ message: 'HubSpot API key not configured' });
    }

    const contactSearchResponse = await axios.post(
      `${HUBSPOT_API_BASE}/objects/contacts/search`,
      {
        filterGroups: [
          { filters: [{ propertyName: 'email', operator: 'EQ', value: user.email }] }
        ],
        properties: ['hs_object_id'],
        limit: 1
      },
      {
        headers: {
          Authorization: `Bearer ${HUBSPOT_PRIVATE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const contactId = contactSearchResponse.data.results?.[0]?.id;
    if (!contactId) {
      return res.status(200).json({ count: 0 });
    }

    const associationsResponse = await axios.get(
      `${HUBSPOT_API_BASE}/objects/contacts/${contactId}/associations/deals`,
      {
        params: { limit: 100 },
        headers: {
          Authorization: `Bearer ${HUBSPOT_PRIVATE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const dealIds = (associationsResponse.data.results || []).map((assoc) => assoc.id);
    return res.status(200).json({ count: dealIds.length });
  } catch (error) {
    console.error('Error fetching orders count:', error.response?.data || error.message);
    return res.status(500).json({ message: 'Error fetching orders count', error: error.message });
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
      console.log('allPayments', allPayments);


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

            console.log('dealIds', dealIds);

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

      console.log('paymentsWithAssociations', paymentsWithAssociations);

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
    // 1️⃣ Find user in DB
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!HUBSPOT_PRIVATE_API_KEY) {
      return res.status(500).json({ message: 'HubSpot API key not configured' });
    }

    // 2️⃣ Get HubSpot contact ID by email using search API
    const contactSearchResponse = await axios.post(
      `${HUBSPOT_API_BASE}/objects/contacts/search`,
      {
        filterGroups: [
          { filters: [{ propertyName: 'email', operator: 'EQ', value: user.email }] }
        ],
        properties: ['hs_object_id'],
        limit: 1
      },
      {
        headers: {
          Authorization: `Bearer ${HUBSPOT_PRIVATE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const contactId = contactSearchResponse.data.results?.[0]?.id;
    if (!contactId) {
      return res.status(200).json({
        message: 'Subscriptions fetched successfully',
        subscriptions: [],
      });
    }

    // 3️⃣ Get subscriptions associated with the contact
    let subscriptions = [];

    try {
      const subscriptionsAssocResponse = await axios.get(
        `${HUBSPOT_API_BASE}/objects/contacts/${contactId}/associations/subscriptions`,
        {
          params: { limit: 100 },
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

      // 4️⃣ Fetch subscription details using batch read
      const subscriptionsBatchResponse = await axios.post(
        `${HUBSPOT_API_BASE}/objects/subscriptions/batch/read`,
        {
          propertiesWithHistory: [],
          properties: ['hs_name', 'hs_status', 'hs_last_payment_amount', 'hs_next_billing_date', 'hs_next_payment_due_date', 'hs_recurring_billing_start_date', 'hs_object_id'],
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

      // 5️⃣ Get last 4 digits from associated payments
      subscriptions = await Promise.all(
        allSubscriptions.map(async (subscription) => {
          let last4 = '****';

          try {
            // Get payments associated with this subscription
            const paymentsAssocResponse = await axios.get(
              `${HUBSPOT_API_BASE}/objects/subscriptions/${subscription.id}/associations/commerce_payments`,
              {
                headers: {
                  Authorization: `Bearer ${HUBSPOT_PRIVATE_API_KEY}`,
                  'Content-Type': 'application/json',
                },
              }
            );

            const paymentIds = (paymentsAssocResponse.data.results || []).map((assoc) => assoc.id);

            if (paymentIds.length > 0) {
              // Fetch payment details to get last4
              const paymentResponse = await axios.post(
                `${HUBSPOT_API_BASE}/objects/commerce_payments/batch/read`,
                {
                  propertiesWithHistory: [],
                  properties: ['hs_payment_method_last_4'],
                  inputs: paymentIds.slice(0, 1).map((id) => ({ id })), // Just get the first payment
                },
                {
                  headers: {
                    Authorization: `Bearer ${HUBSPOT_PRIVATE_API_KEY}`,
                    'Content-Type': 'application/json',
                  },
                }
              );

              const payment = paymentResponse.data.results?.[0];
              last4 = payment?.properties?.hs_payment_method_last_4 || '****';
            }
          } catch (error) {
            console.warn('Subscription payment association error:', error.response?.data || error.message);
          }

          return {
            id: subscription.id,
            name: subscription.properties?.hs_name || '',
            subscriptionId: subscription.properties?.hs_object_id,
            status: subscription.properties?.hs_status || '',
            last4: last4,
            amount: subscription.properties?.hs_last_payment_amount || '0',
            nextBillingDate: subscription.properties?.hs_next_payment_due_date || subscription.properties?.hs_next_billing_date,
          };
        })
      );
    } catch (error) {
      console.warn('Subscriptions API error:', error.response?.data || error.message);
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

/**
 * Get orders for a specific user (Admin only)
 * GET /api/orders/admin/:userId
 */
export const getAdminUserOrders = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin' && !req.user.supaadmin) {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }

    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Find the target user
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!HUBSPOT_PRIVATE_API_KEY) {
      return res.status(500).json({ message: 'HubSpot API key not configured' });
    }

    // Use the same logic as getUserOrders but for the target user
    const contactSearchResponse = await axios.post(
      `${HUBSPOT_API_BASE}/objects/contacts/search`,
      {
        filterGroups: [
          { filters: [{ propertyName: 'email', operator: 'EQ', value: targetUser.email }] }
        ],
        properties: ['hs_object_id'],
        limit: 1
      },
      {
        headers: {
          Authorization: `Bearer ${HUBSPOT_PRIVATE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const contactId = contactSearchResponse.data.results?.[0]?.id;
    if (!contactId) {
      return res.status(200).json({ message: 'Orders fetched successfully', orders: [] });
    }

    // Get deals associated with this contact
    const associationsResponse = await axios.get(
      `${HUBSPOT_API_BASE}/objects/contacts/${contactId}/associations/deals`,
      {
        params: { limit: 100 },
        headers: {
          Authorization: `Bearer ${HUBSPOT_PRIVATE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const dealIds = (associationsResponse.data.results || []).map((assoc) => assoc.id);
    if (dealIds.length === 0) {
      return res.status(200).json({ message: 'Orders fetched successfully', orders: [] });
    }

    // Fetch deal details in batch
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

    // Get pipeline stages to map stage IDs to names
    const stageIdToNameMap = {};
    try {
      const pipelinesResponse = await axios.get(
        'https://api.hubapi.com/crm-pipelines/v1/pipelines/deals',
        {
          headers: {
            Authorization: `Bearer ${HUBSPOT_PRIVATE_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (pipelinesResponse.data && Array.isArray(pipelinesResponse.data.results)) {
        pipelinesResponse.data.results.forEach((pipeline) => {
          if (pipeline.stages && Array.isArray(pipeline.stages)) {
            pipeline.stages.forEach((stage) => {
              if (stage.stageId && stage.label) {
                stageIdToNameMap[stage.stageId] = stage.label;
              }
            });
          }
        });
      }
    } catch (pipelineError) {
      console.warn('Pipeline stages fetch error:', pipelineError.response?.data || pipelineError.message);
    }

    // Fetch payments associated with the contact
    let paymentsByDealId = {};
    try {
      const paymentsAssocResponse = await axios.get(
        `${HUBSPOT_API_BASE}/objects/contacts/${contactId}/associations/commerce_payments`,
        {
          params: { limit: 100 },
          headers: {
            Authorization: `Bearer ${HUBSPOT_PRIVATE_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const paymentIds = (paymentsAssocResponse.data.results || []).map((assoc) => assoc.id);

      if (paymentIds.length > 0) {
        const paymentsBatchResponse = await axios.post(
          `${HUBSPOT_API_BASE}/objects/commerce_payments/batch/read`,
          {
            propertiesWithHistory: [],
            properties: ['hs_initial_amount', 'hs_payment_status', 'hs_initiated_date', 'hs_object_id', 'hs_payment_method_last_4'],
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

        await Promise.all(
          allPayments.map(async (payment) => {
            try {
              const dealAssocResponse = await axios.get(
                `${HUBSPOT_API_BASE}/objects/commerce_payments/${payment.id}/associations/deals`,
                {
                  headers: {
                    Authorization: `Bearer ${HUBSPOT_PRIVATE_API_KEY}`,
                    'Content-Type': 'application/json',
                  },
                }
              );

              const paymentDealIds = (dealAssocResponse.data.results || []).map((assoc) =>
                String(assoc.id)
              );

              const last4 = payment.properties?.hs_payment_method_last_4 || '****';

              const mappedPayment = {
                id: payment.id,
                paymentId: payment.properties?.hs_object_id,
                paymentNumber: `#${paymentIds.indexOf(payment.id) + 1}`,
                amount: payment.properties?.hs_initial_amount || '0',
                status: payment.properties?.hs_payment_status || '',
                createDate: payment.properties?.hs_initiated_date,
                last4: last4,
                dealIds: paymentDealIds,
              };

              paymentDealIds.forEach((dealId) => {
                if (!paymentsByDealId[dealId]) paymentsByDealId[dealId] = [];
                paymentsByDealId[dealId].push(mappedPayment);
              });
            } catch (assocError) {
              console.warn('Payment association error:', assocError.message);
            }
          })
        );

        Object.keys(paymentsByDealId).forEach((dealId) => {
          paymentsByDealId[dealId].sort(
            (a, b) => new Date(b.createDate).getTime() - new Date(a.createDate).getTime()
          );
        });
      }
    } catch (paymentError) {
      console.warn('Commerce Payments API error:', paymentError.response?.data || paymentError.message);
    }

    // Map deals to orders
    const orders = allDeals
      .filter((deal) => deal.properties?.closedate)
      .map((deal) => {
        const dealInternalId = String(deal.id);
        const orderPayments = paymentsByDealId[dealInternalId] || [];

        const dealStageId = deal.properties?.dealstage || '';
        const dealStageName = stageIdToNameMap[dealStageId] || dealStageId || '';

        return {
          id: deal.id,
          dealId: deal.properties?.hs_object_id,
          name: deal.properties?.dealname || 'Unnamed Deal',
          amount: deal.properties?.amount || '0',
          status: dealStageName,
          dealStage: dealStageName,
          closeDate: deal.properties?.closedate,
          createDate: deal.properties?.createdate,
          payments: orderPayments,
        };
      })
      .sort((a, b) => new Date(b.createDate).getTime() - new Date(a.createDate).getTime());

    res.status(200).json({ message: 'Orders fetched successfully', orders });
  } catch (error) {
    console.error('Error fetching admin user orders:', error.response?.data || error.message);
    res.status(500).json({
      message: 'Error fetching orders',
      error: error.response?.data || error.message,
    });
  }
};

/**
 * Get subscriptions for a specific user (Admin only)
 * GET /api/orders/admin/:userId/subscriptions
 */
export const getAdminUserSubscriptions = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin' && !req.user.supaadmin) {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }

    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Find the target user
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!HUBSPOT_PRIVATE_API_KEY) {
      return res.status(500).json({ message: 'HubSpot API key not configured' });
    }

    // Use the same logic as getSubscriptions but for the target user
    const contactSearchResponse = await axios.post(
      `${HUBSPOT_API_BASE}/objects/contacts/search`,
      {
        filterGroups: [
          { filters: [{ propertyName: 'email', operator: 'EQ', value: targetUser.email }] }
        ],
        properties: ['hs_object_id'],
        limit: 1
      },
      {
        headers: {
          Authorization: `Bearer ${HUBSPOT_PRIVATE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const contactId = contactSearchResponse.data.results?.[0]?.id;
    if (!contactId) {
      return res.status(200).json({
        message: 'Subscriptions fetched successfully',
        subscriptions: [],
      });
    }

    let subscriptions = [];

    try {
      const subscriptionsAssocResponse = await axios.get(
        `${HUBSPOT_API_BASE}/objects/contacts/${contactId}/associations/subscriptions`,
        {
          params: { limit: 100 },
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

      const subscriptionsBatchResponse = await axios.post(
        `${HUBSPOT_API_BASE}/objects/subscriptions/batch/read`,
        {
          propertiesWithHistory: [],
          properties: ['hs_name', 'hs_status', 'hs_last_payment_amount', 'hs_next_billing_date', 'hs_next_payment_due_date', 'hs_recurring_billing_start_date', 'hs_object_id'],
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

      subscriptions = await Promise.all(
        allSubscriptions.map(async (subscription) => {
          let last4 = '****';

          try {
            const paymentsAssocResponse = await axios.get(
              `${HUBSPOT_API_BASE}/objects/subscriptions/${subscription.id}/associations/commerce_payments`,
              {
                headers: {
                  Authorization: `Bearer ${HUBSPOT_PRIVATE_API_KEY}`,
                  'Content-Type': 'application/json',
                },
              }
            );

            const paymentIds = (paymentsAssocResponse.data.results || []).map((assoc) => assoc.id);

            if (paymentIds.length > 0) {
              const paymentResponse = await axios.post(
                `${HUBSPOT_API_BASE}/objects/commerce_payments/batch/read`,
                {
                  propertiesWithHistory: [],
                  properties: ['hs_payment_method_last_4'],
                  inputs: paymentIds.slice(0, 1).map((id) => ({ id })),
                },
                {
                  headers: {
                    Authorization: `Bearer ${HUBSPOT_PRIVATE_API_KEY}`,
                    'Content-Type': 'application/json',
                  },
                }
              );

              const payment = paymentResponse.data.results?.[0];
              last4 = payment?.properties?.hs_payment_method_last_4 || '****';
            }
          } catch (error) {
            console.warn('Subscription payment association error:', error.response?.data || error.message);
          }

          return {
            id: subscription.id,
            name: subscription.properties?.hs_name || '',
            subscriptionId: subscription.properties?.hs_object_id,
            status: subscription.properties?.hs_status || '',
            last4: last4,
            amount: subscription.properties?.hs_last_payment_amount || '0',
            nextBillingDate: subscription.properties?.hs_next_payment_due_date || subscription.properties?.hs_next_billing_date,
          };
        })
      );
    } catch (error) {
      console.warn('Subscriptions API error:', error.response?.data || error.message);
      subscriptions = [];
    }

    res.status(200).json({
      message: 'Subscriptions fetched successfully',
      subscriptions,
    });
  } catch (error) {
    console.error('Error fetching admin user subscriptions:', error.response?.data || error.message);
    res.status(500).json({
      message: 'Error fetching subscriptions',
      error: error.response?.data || error.message,
    });
  }
};

