import Deal from '../models/Deal.js';

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
      image
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
    const { fields = 'basic' } = req.query;

    let populateFields = [];
    if (fields === 'basic') {
      // For basic list view - only essential fields
      populateFields = [
        { path: 'category', select: 'name' },
        { path: 'subCategory', select: 'name' },
        { path: 'type', select: 'name' },
        { path: 'strategy', select: 'name' },
        { path: 'requirement', select: 'name' },
        { path: 'source', select: 'name' },
        { path: 'createdBy', select: 'name' }
      ];
    } else if (fields === 'detailed') {
      // For detailed view - all fields but no deep population
      populateFields = [
        { path: 'category' },
        { path: 'subCategory' },
        { path: 'type' },
        { path: 'strategy' },
        { path: 'requirement' },
        { path: 'source' },
        { path: 'createdBy' }
      ];
    } else if (fields === 'full') {
      // For admin view - all fields with full population
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

    const deals = await Deal.find()
      .populate(populateFields)
      .lean();
    return res.status(200).json({ message: 'Deals fetched successfully', deals });
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
    image
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
      fields = 'basic'
    } = req.query;

    const filter = {};
    console.log("req.query", req.query);

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
