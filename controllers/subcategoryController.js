import SubCategory from '../models/SubCategory.js';
import Category from '../models/Category.js';

// Create a new subcategory
export const createSubCategory = async (req, res) => {
  try {
    const { name, categoryId } = req.body;

    if (!name || !categoryId) {
      return res.status(400).json({ message: 'Name and Category ID are required' });
    }

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const subCategory = new SubCategory({ name, category: categoryId });
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
    const subCategories = await SubCategory.find().populate('category');
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
    const subCategory = await SubCategory.findById(subCategoryId).populate('category');
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
  const { name, categoryId } = req.body;

  try {
    const subCategory = await SubCategory.findById(subCategoryId);
    if (!subCategory) {
      return res.status(404).json({ message: 'SubCategory not found' });
    }

    subCategory.name = name || subCategory.name;
    if (categoryId) {
      const category = await Category.findById(categoryId);
      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }
      subCategory.category = categoryId;
    }

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

    await subCategory.remove();
    return res.status(200).json({ message: 'SubCategory deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server Error', error });
  }
};
