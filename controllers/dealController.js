import Deal from '../models/Deal.js';

// Create a new deal
export const createDeal = async (req, res) => {
  try {
    const { name, categoryId, subCategoryId, typeId, strategyId, requirementId, sourceId, createdBy } = req.body;

    // Validate if all necessary fields are provided
    if (!name || !categoryId || !subCategoryId || !typeId || !strategyId || !requirementId || !sourceId || !createdBy) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const deal = new Deal({
      name,
      category: categoryId,
      subCategory: subCategoryId,
      type: typeId,
      strategy: strategyId,
      requirement: requirementId,
      source: sourceId,
      createdBy
    });

    await deal.save();
    return res.status(201).json({ message: 'Deal created successfully', deal });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server Error', error });
  }
};

// Get all deals
export const getAllDeals = async (req, res) => {
  try {
    const deals = await Deal.find()
      .populate('category')
      .populate('subCategory')
      .populate('type')
      .populate('strategy')
      .populate('requirement')
      .populate('source')
      .populate('createdBy'); // Assuming createdBy is a reference to a User model

    return res.status(200).json({ message: 'Deals fetched successfully', deals });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server Error', error });
  }
};

// Get a single deal by ID
export const getDealById = async (req, res) => {
  const { dealId } = req.params;
  
  try {
    const deal = await Deal.findById(dealId)
      .populate('category')
      .populate('subCategory')
      .populate('type')
      .populate('strategy')
      .populate('requirement')
      .populate('source')
      .populate('createdBy');

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
  const { name, categoryId, subCategoryId, typeId, strategyId, requirementId, sourceId, createdBy } = req.body;

  try {
    const deal = await Deal.findById(dealId);

    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    // Update fields if provided
    deal.name = name || deal.name;
    deal.category = categoryId || deal.category;
    deal.subCategory = subCategoryId || deal.subCategory;
    deal.type = typeId || deal.type;
    deal.strategy = strategyId || deal.strategy;
    deal.requirement = requirementId || deal.requirement;
    deal.source = sourceId || deal.source;
    deal.createdBy = createdBy || deal.createdBy;

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
    const deal = await Deal.findById(dealId);

    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    await deal.remove();
    return res.status(200).json({ message: 'Deal deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server Error', error });
  }
};
