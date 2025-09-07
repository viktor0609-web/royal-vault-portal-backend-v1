import Source from '../models/Source.js';

// Create a new source
export const createSource = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const source = new Source({ name });
    await source.save();

    return res.status(201).json({ message: 'Source created successfully', source });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server Error', error });
  }
};

// Get all sources
export const getAllSources = async (req, res) => {
  try {
    const sources = await Source.find();
    return res.status(200).json({ message: 'Sources fetched successfully', sources });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server Error', error });
  }
};

// Get a single source by ID
export const getSourceById = async (req, res) => {
  const { sourceId } = req.params;
  try {
    const source = await Source.findById(sourceId);
    if (!source) {
      return res.status(404).json({ message: 'Source not found' });
    }

    return res.status(200).json({ message: 'Source fetched successfully', source });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server Error', error });
  }
};

// Update a source by ID
export const updateSource = async (req, res) => {
  const { sourceId } = req.params;
  const { name } = req.body;

  try {
    const source = await Source.findById(sourceId);
    if (!source) {
      return res.status(404).json({ message: 'Source not found' });
    }

    source.name = name || source.name;
    await source.save();

    return res.status(200).json({ message: 'Source updated successfully', source });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server Error', error });
  }
};

// Delete a source by ID
export const deleteSource = async (req, res) => {
  const { sourceId } = req.params;

  try {
    const source = await Source.findById(sourceId);
    if (!source) {
      return res.status(404).json({ message: 'Source not found' });
    }

    await source.remove();
    return res.status(200).json({ message: 'Source deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server Error', error });
  }
};
