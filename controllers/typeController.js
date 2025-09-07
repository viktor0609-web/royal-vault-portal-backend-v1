import Type from '../models/Type.js';

// Create a new type
export const createType = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const type = new Type({ name });
    await type.save();

    return res.status(201).json({ message: 'Type created successfully', type });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server Error', error });
  }
};

// Get all types
export const getAllTypes = async (req, res) => {
  try {
    const types = await Type.find();
    return res.status(200).json({ message: 'Types fetched successfully', types });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server Error', error });
  }
};

// Get a single type by ID
export const getTypeById = async (req, res) => {
  const { typeId } = req.params;
  try {
    const type = await Type.findById(typeId);
    if (!type) {
      return res.status(404).json({ message: 'Type not found' });
    }

    return res.status(200).json({ message: 'Type fetched successfully', type });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server Error', error });
  }
};

// Update a type by ID
export const updateType = async (req, res) => {
  const { typeId } = req.params;
  const { name } = req.body;

  try {
    const type = await Type.findById(typeId);
    if (!type) {
      return res.status(404).json({ message: 'Type not found' });
    }

    type.name = name || type.name;
    await type.save();

    return res.status(200).json({ message: 'Type updated successfully', type });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server Error', error });
  }
};

// Delete a type by ID
export const deleteType = async (req, res) => {
  const { typeId } = req.params;

  try {
    const type = await Type.findById(typeId);

    if (!type) {
      return res.status(404).json({ message: 'Type not found' });
    }

    await type.remove();
    return res.status(200).json({ message: 'Type deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server Error', error });
  }
};
