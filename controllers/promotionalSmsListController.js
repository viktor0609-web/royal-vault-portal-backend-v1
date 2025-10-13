// Get all promotional SMS lists
export const getAllPromotionalSmsLists = async (req, res) => {
  try {

    const HUBSPOT_PRIVATE_API_KEY = process.env.HUBSPOT_PRIVATE_API_KEY;
    const HUBSPOT_API_URL = "https://api.hubapi.com/crm/v3/lists/search";

    const response = await fetch(HUBSPOT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${HUBSPOT_PRIVATE_API_KEY}`,
      },
      body: JSON.stringify({ query: "", count: 500 }), // Empty query returns all lists
    });


    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    console.log(data.lists.length);

    res.status(200).json({
      message: 'Promotional SMS lists fetched successfully',
      lists: data.lists
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching promotional SMS lists' });
  }
};
