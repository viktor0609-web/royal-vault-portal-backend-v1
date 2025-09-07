import Strategy from '../models/Strategy.js';

// Create a new strategy
export const createStrategy = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const strategy = new Strategy({ name });
    await strategy.save();

    return res.status(201).json({ message: 'Strategy created successfully', strategy });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server Error', error });
  }
};

// Get all strategies
export const getAllStrategies = async (req, res) => {
  try {
    const strategies = await Strategy.find();
    return res.status(200).json({ message: 'Strategies fetched successfully', strategies });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server Error', error });
  }
};

// Get a single strategy by ID
export const getStrategyById = async (req, res) => {
  const { strategyId } = req.params;
  try {
    const strategy = await Strategy.findById(strategyId);
    if (!strategy) {
      return res.status(404).json({ message: 'Strategy not found' });
    }

    return res.status(200).json({ message: 'Strategy fetched successfully', strategy });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server Error', error });
  }
};

// Update a strategy by ID
export const updateStrategy = async (req, res) => {
  const { strategyId } = req.params;
  const { name } = req.body;

  try {
    const strategy = await Strategy.findById(strategyId);
    if (!strategy) {
      return res.status(404).json({ message: 'Strategy not found' });
    }

    strategy.name = name || strategy.name;
    await strategy.save();

    return res.status(200).json({ message: 'Strategy updated successfully', strategy });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server Error', error });
  }
};

// Delete a strategy by ID
export const deleteStrategy = async (req, res) => {
  const { strategyId } = req.params;

  try {
    const strategy = await Strategy.findById(strategyId);
    if (!strategy) {
      return res.status(404).json({ message: 'Strategy not found' });
    }

    await strategy.remove();
    return res.status(200).json({ message: 'Strategy deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server Error', error });
  }
};
