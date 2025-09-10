import SubCategory from '../models/SubCategory.js';

// Create a new subcategory
export const createSubCategory = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const existing = await SubCategory.findOne({ name });
    if (existing) {
      return res.status(409).json({ message: 'SubCategory already exists' });
    }

    const subCategory = new SubCategory({ name });
    await subCategory.save();

    return res.status(201).json({ message: 'SubCategory created successfully', subCategory });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server Error', error });
  }
};

// Get all subcategories
export const getAllSubCategories = async (req, res) => {
  try {
    const subCategories = await SubCategory.find();
    return res.status(200).json({ message: 'SubCategories fetched successfully', subCategories });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server Error', error });
  }
};

// Get a single subcategory by ID
export const getSubCategoryById = async (req, res) => {
  const { subCategoryId } = req.params;
  try {
    const subCategory = await SubCategory.findById(subCategoryId);
    if (!subCategory) {
      return res.status(404).json({ message: 'SubCategory not found' });
    }

    return res.status(200).json({ message: 'SubCategory fetched successfully', subCategory });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server Error', error });
  }
};

// Update a subcategory by ID
export const updateSubCategory = async (req, res) => {
  const { subCategoryId } = req.params;
  const { name } = req.body;

  try {
    const subCategory = await SubCategory.findById(subCategoryId);
    if (!subCategory) {
      return res.status(404).json({ message: 'SubCategory not found' });
    }

    subCategory.name = name || subCategory.name;
    await subCategory.save();

    return res.status(200).json({ message: 'SubCategory updated successfully', subCategory });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server Error', error });
  }
};

// Delete a subcategory by ID
export const deleteSubCategory = async (req, res) => {
  const { subCategoryId } = req.params;

  try {
    const subCategory = await SubCategory.findById(subCategoryId);

    if (!subCategory) {
      return res.status(404).json({ message: 'SubCategory not found' });
    }

    await subCategory.deleteOne();
    return res.status(200).json({ message: 'SubCategory deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server Error', error });
  }
};
