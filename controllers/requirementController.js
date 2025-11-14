import Requirement from '../models/Requirement.js';

// Create a new requirement
export const createRequirement = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const requirement = new Requirement({ name });
    await requirement.save();

    return res.status(201).json({ message: 'Requirement created successfully', requirement });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server Error', error });
  }
};

// Get all requirements
export const getAllRequirements = async (req, res) => {
  try {
    const requirements = await Requirement.find();
    return res.status(200).json({ message: 'Requirements fetched successfully', requirements });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server Error', error });
  }
};

// Get a single requirement by ID
export const getRequirementById = async (req, res) => {
  const { requirementId } = req.params;
  try {
    const requirement = await Requirement.findById(requirementId);
    if (!requirement) {
      return res.status(404).json({ message: 'Requirement not found' });
    }

    return res.status(200).json({ message: 'Requirement fetched successfully', requirement });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server Error', error });
  }
};

// Update a requirement by ID
export const updateRequirement = async (req, res) => {
  const { requirementId } = req.params;
  const { name } = req.body;

  try {
    const requirement = await Requirement.findById(requirementId);
    if (!requirement) {
      return res.status(404).json({ message: 'Requirement not found' });
    }

    requirement.name = name || requirement.name;
    await requirement.save();

    return res.status(200).json({ message: 'Requirement updated successfully', requirement });
  } catch (error) {

    console.error(error);
    return res.status(500).json({ message: 'Server Error', error });
  }
};

// Delete a requirement by ID
export const deleteRequirement = async (req, res) => {
  const { requirementId } = req.params;

  try {
    const requirement = await Requirement.findById(requirementId);
    if (!requirement) {
      return res.status(404).json({ message: 'Requirement not found' });
    }

    await requirement.remove();
    return res.status(200).json({ message: 'Requirement deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server Error', error });
  }
};
