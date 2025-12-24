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

    // NOTE: HubSpot Commerce Payments API requires additional scopes that may not be available
    // For now, return empty array - payments would need to be tracked via:
    // 1. Custom object for payments (if created in HubSpot)
    // 2. Deal line items (if using HubSpot products)
    // 3. External payment system integration
    let payments = [];

    // Option: If you have a custom payments object, you can uncomment and use this:
    /*
    try {
      const paymentsResponse = await axios.post(
        `${HUBSPOT_API_BASE}/objects/p_{YOUR_PAYMENTS_OBJECT_ID}/search`,
        {
          filterGroups: [
            {
              filters: [
                {
                  propertyName: 'associations.contact',
                  operator: 'EQ',
                  value: contactId.toString(),
                },
                ...(dealId ? [{
                  propertyName: 'associations.deal',
                  operator: 'EQ',
                  value: dealId.toString(),
                }] : []),
              ],
            },
          ],
          properties: ['payment_number', 'amount', 'status', 'createdate', 'hs_object_id'],
          limit: 100,
        },
        {
          headers: {
            Authorization: `Bearer ${HUBSPOT_PRIVATE_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
      // Process payments...
    } catch (error) {
      console.log('Payments not available:', error.response?.data || error.message);
    }
    */

    console.log('Payments API requires Commerce Hub scopes or custom object setup. Returning empty array.');

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

    // NOTE: HubSpot Subscriptions API requires Commerce Hub scopes that may not be available
    // For now, return empty array - subscriptions would need to be tracked via:
    // 1. Custom object for subscriptions (if created in HubSpot)
    // 2. External subscription service integration (Stripe, Recurly, etc.)
    let subscriptions = [];

    // Option: If you have a custom subscriptions object, you can uncomment and use this:
    /*
    try {
      const subscriptionsResponse = await axios.post(
        `${HUBSPOT_API_BASE}/objects/p_{YOUR_SUBSCRIPTIONS_OBJECT_ID}/search`,
        {
          filterGroups: [
            {
              filters: [
                {
                  propertyName: 'associations.contact',
                  operator: 'EQ',
                  value: contactId.toString(),
                },
              ],
            },
          ],
          properties: ['status', 'last_4', 'next_billing_date', 'hs_object_id'],
          limit: 100,
        },
        {
          headers: {
            Authorization: `Bearer ${HUBSPOT_PRIVATE_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
      // Process subscriptions...
    } catch (error) {
      console.log('Subscriptions not available:', error.response?.data || error.message);
    }
    */

    console.log('Subscriptions API requires Commerce Hub scopes or custom object setup. Returning empty array.');

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

