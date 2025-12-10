import Deal from '../models/Deal.js';
import UserDealFavorite from '../models/UserDealFavorite.js';

// Create a new deal
export const createDeal = async (req, res) => {
  try {
    const {
      name,
      categoryIds,
      subCategoryIds,
      typeIds,
      strategyIds,
      requirementIds,
      sourceId,
      createdBy,
      url,
      image,
      isRoyalVetted,
      currentOffering
    } = req.body;

    // Only validate that createdBy exists (can come from req.body or req.user)
    const dealCreatorId = req.user?.id || createdBy;
    if (!dealCreatorId) {
      return res.status(400).json({ message: 'User authentication required' });
    }

    const deal = new Deal({
      name: name || '',
      category: categoryIds || [],
      subCategory: subCategoryIds || [],
      type: typeIds || [],
      strategy: strategyIds || [],
      requirement: requirementIds || [],
      source: sourceId || null,
      url: url || '',
      image: image || '',
      createdBy: dealCreatorId,
      displayOnPublicPage: req.body.displayOnPublicPage || false,
      isRoyalVetted: isRoyalVetted || false,
      currentOffering: currentOffering || null,
    });

    await deal.save();
    return res.status(201).json({ message: 'Deal created successfully', deal });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server Error', error });
  }
};

// Get all deals - OPTIMIZED VERSION
export const getAllDeals = async (req, res) => {
  try {
    const { fields = 'basic', sortBy = 'name', order = 'asc', publicOnly = 'false' } = req.query;
    const isPublicOnly = publicOnly === 'true';

    // Build query with public pages filter
    const query = {};
    if (isPublicOnly) {
      query.displayOnPublicPage = true;
    }

    let populateFields = [];
    if (fields === 'basic') {
      populateFields = [
        { path: 'category', select: 'name' },
        { path: 'subCategory', select: 'name' },
        { path: 'type', select: 'name' },
        { path: 'strategy', select: 'name' },
        { path: 'requirement', select: 'name' },
        { path: 'source', select: 'name' },
        { path: 'createdBy', select: 'name' }
      ];
    } else if (fields === 'detailed' || fields === 'full') {
      populateFields = [
        { path: 'category' },
        { path: 'subCategory' },
        { path: 'type' },
        { path: 'strategy' },
        { path: 'requirement' },
        { path: 'source' },
        { path: 'createdBy' }
      ];
    }

    // Fetch all deals with populated fields
    const deals = await Deal.find(query)
      .populate(populateFields)
      .lean();

    // Sort deals: Royal Vetted first, then Royal Sourced, then Client Sourced, then by name within each group
    deals.sort((a, b) => {
      // First priority: Royal Vetted deals come first
      if (a.isRoyalVetted && !b.isRoyalVetted) return -1;
      if (!a.isRoyalVetted && b.isRoyalVetted) return 1;

      // Get source names (handle null/undefined sources)
      const sourceA = a.source?.name || '';
      const sourceB = b.source?.name || '';

      // Define source priority: Royal Sourced = 0, Client Sourced = 1, others = 2
      const getSourcePriority = (sourceName) => {
        if (sourceName === 'Royal Sourced') return 0;
        if (sourceName === 'Client Sourced') return 1;
        return 2;
      };

      const priorityA = getSourcePriority(sourceA);
      const priorityB = getSourcePriority(sourceB);

      // Second priority: sort by source priority
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // If same source priority, sort by name
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });

    return res
      .status(200)
      .json({ message: 'Deals fetched successfully', deals });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server Error', error });
  }
};

// Get a single deal by ID - OPTIMIZED VERSION
export const getDealById = async (req, res) => {
  const { dealId } = req.params;
  const { fields = 'full' } = req.query;

  try {
    let populateFields = [];
    if (fields === 'basic') {
      populateFields = [
        { path: 'category', select: 'name' },
        { path: 'subCategory', select: 'name' },
        { path: 'type', select: 'name' },
        { path: 'strategy', select: 'name' },
        { path: 'requirement', select: 'name' },
        { path: 'source', select: 'name' },
        { path: 'createdBy', select: 'name' }
      ];
    } else {
      populateFields = [
        { path: 'category' },
        { path: 'subCategory' },
        { path: 'type' },
        { path: 'strategy' },
        { path: 'requirement' },
        { path: 'source' },
        { path: 'createdBy' }
      ];
    }

    const deal = await Deal.findById(dealId)
      .populate(populateFields);

    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    return res.status(200).json({ message: 'Deal fetched successfully', deal });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server Error', error });
  }
};

// Update a deal by ID
export const updateDeal = async (req, res) => {
  const { dealId } = req.params;
  const {
    name,
    categoryIds,
    subCategoryIds,
    typeIds,
    strategyIds,
    requirementIds,
    sourceId,
    url,
    image,
    isRoyalVetted,
    currentOffering
  } = req.body;

  try {
    const deal = await Deal.findById(dealId);

    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    // Update fields - allow empty values to be set explicitly
    // Use hasOwnProperty to differentiate between undefined (not provided) and empty string/array (intentionally empty)
    if (req.body.hasOwnProperty('name')) deal.name = name || '';
    if (req.body.hasOwnProperty('categoryIds')) deal.category = categoryIds || [];
    if (req.body.hasOwnProperty('subCategoryIds')) deal.subCategory = subCategoryIds || [];
    if (req.body.hasOwnProperty('typeIds')) deal.type = typeIds || [];
    if (req.body.hasOwnProperty('strategyIds')) deal.strategy = strategyIds || [];
    if (req.body.hasOwnProperty('requirementIds')) deal.requirement = requirementIds || [];
    if (req.body.hasOwnProperty('sourceId')) deal.source = sourceId || null;
    if (req.body.hasOwnProperty('url')) deal.url = url || '';
    if (req.body.hasOwnProperty('image')) deal.image = image || '';
    if (req.body.hasOwnProperty('displayOnPublicPage')) deal.displayOnPublicPage = req.body.displayOnPublicPage === true;
    if (req.body.hasOwnProperty('isRoyalVetted')) deal.isRoyalVetted = isRoyalVetted === true;
    if (req.body.hasOwnProperty('currentOffering')) deal.currentOffering = currentOffering || null;

    await deal.save();
    return res.status(200).json({ message: 'Deal updated successfully', deal });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server Error', error });
  }
};

// Delete a deal by ID
export const deleteDeal = async (req, res) => {
  const { dealId } = req.params;

  try {
    const deal = await Deal.findByIdAndDelete(dealId);

    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    return res.status(200).json({ message: 'Deal deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server Error', error });
  }
};

// Filter deals - OPTIMIZED VERSION
export const filterDeals = async (req, res) => {
  try {
    const {
      name,
      categoryId,
      subCategoryId,
      typeId,
      strategyId,
      requirementId,
      sourceId,
      createdBy,
      fields = 'basic',
      publicOnly = 'false',
      isRoyalVetted
    } = req.query;
    const isPublicOnly = publicOnly === 'true';

    const filter = {};
    console.log("req.query", req.query);

    // Add public pages filter if needed
    if (isPublicOnly) {
      filter.displayOnPublicPage = true;
    }

    if (name) {
      filter.name = { $regex: name, $options: 'i' }; // case-insensitive search
    }
    if (categoryId) filter.category = categoryId;
    if (subCategoryId) filter.subCategory = subCategoryId;
    if (typeId) filter.type = typeId;
    if (strategyId) filter.strategy = strategyId;
    if (requirementId) filter.requirement = requirementId;
    if (sourceId) filter.source = sourceId;
    if (createdBy) filter.createdBy = createdBy;
    if (isRoyalVetted === 'true') filter.isRoyalVetted = true; // Filter for Royal Vetted deals

    let populateFields = [];
    if (fields === 'basic') {
      populateFields = [
        { path: 'category', select: 'name' },
        { path: 'subCategory', select: 'name' },
        { path: 'type', select: 'name' },
        { path: 'strategy', select: 'name' },
        { path: 'requirement', select: 'name' },
        { path: 'source', select: 'name' },
        { path: 'createdBy', select: 'name' }
      ];
    } else {
      populateFields = [
        { path: 'category' },
        { path: 'subCategory' },
        { path: 'type' },
        { path: 'strategy' },
        { path: 'requirement' },
        { path: 'source' },
        { path: 'createdBy' }
      ];
    }

    const deals = await Deal.find(filter)
      .populate(populateFields)
      .lean();

    return res.status(200).json({ message: 'Filtered deals fetched successfully', deals });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server Error', error });
  }
};

// Get user's starred deals
export const getStarredDeals = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User authentication required' });
    }

    const { fields = 'basic' } = req.query;

    // Get all deal IDs that the user has starred
    const favorites = await UserDealFavorite.find({ user: userId }).select('deal');
    const dealIds = favorites.map(fav => fav.deal);

    if (dealIds.length === 0) {
      return res.status(200).json({ message: 'Starred deals fetched successfully', deals: [] });
    }

    // Build populate fields based on field selection
    let populateFields = [];
    if (fields === 'basic') {
      populateFields = [
        { path: 'category', select: 'name' },
        { path: 'subCategory', select: 'name' },
        { path: 'type', select: 'name' },
        { path: 'strategy', select: 'name' },
        { path: 'requirement', select: 'name' },
        { path: 'source', select: 'name' },
        { path: 'createdBy', select: 'name' }
      ];
    } else {
      populateFields = [
        { path: 'category' },
        { path: 'subCategory' },
        { path: 'type' },
        { path: 'strategy' },
        { path: 'requirement' },
        { path: 'source' },
        { path: 'createdBy' }
      ];
    }

    // Fetch the deals
    const deals = await Deal.find({ _id: { $in: dealIds } })
      .populate(populateFields)
      .lean();

    // Sort deals: Royal Vetted first, then by name
    deals.sort((a, b) => {
      if (a.isRoyalVetted && !b.isRoyalVetted) return -1;
      if (!a.isRoyalVetted && b.isRoyalVetted) return 1;
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });

    return res.status(200).json({ message: 'Starred deals fetched successfully', deals });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server Error', error });
  }
};

// Star a deal
export const starDeal = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User authentication required' });
    }

    const { dealId } = req.params;

    // Check if deal exists
    const deal = await Deal.findById(dealId);
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    // Check if already starred
    const existingFavorite = await UserDealFavorite.findOne({ user: userId, deal: dealId });
    if (existingFavorite) {
      return res.status(200).json({ message: 'Deal already starred', data: deal });
    }

    // Create favorite
    const favorite = new UserDealFavorite({
      user: userId,
      deal: dealId,
    });

    await favorite.save();
    return res.status(200).json({ message: 'Deal starred successfully', data: deal });
  } catch (error) {
    console.error(error);
    if (error.code === 11000) {
      // Duplicate key error (shouldn't happen due to check, but handle it)
      return res.status(200).json({ message: 'Deal already starred' });
    }
    return res.status(500).json({ message: 'Server Error', error });
  }
};

// Unstar a deal
export const unstarDeal = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User authentication required' });
    }

    const { dealId } = req.params;

    // Remove favorite
    const favorite = await UserDealFavorite.findOneAndDelete({ user: userId, deal: dealId });

    if (!favorite) {
      return res.status(404).json({ message: 'Deal not found in favorites' });
    }

    return res.status(200).json({ message: 'Deal unstarred successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server Error', error });
  }
};
