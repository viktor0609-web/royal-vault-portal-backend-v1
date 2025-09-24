import PromotionalSmsList from '../models/PromotionalSmsList.js';

// Get all promotional SMS lists
export const getAllPromotionalSmsLists = async (req, res) => {
  try {
    const { isActive = true } = req.query;
    
    const query = {};
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    const lists = await PromotionalSmsList.find(query)
      .select('name description isActive')
      .lean();
    
    res.status(200).json({ 
      message: 'Promotional SMS lists fetched successfully', 
      lists 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching promotional SMS lists' });
  }
};

// Create a new promotional SMS list
export const createPromotionalSmsList = async (req, res) => {
  try {
    const { name, description } = req.body;
    const createdBy = req.user.id;

    const newList = new PromotionalSmsList({
      name,
      description,
      createdBy,
    });

    await newList.save();
    res.status(201).json({ 
      message: 'Promotional SMS list created successfully', 
      list: newList 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating promotional SMS list' });
  }
};

// Update a promotional SMS list
export const updatePromotionalSmsList = async (req, res) => {
  try {
    const { listId } = req.params;
    const { name, description, isActive } = req.body;

    const updatedList = await PromotionalSmsList.findByIdAndUpdate(
      listId,
      { name, description, isActive },
      { new: true }
    );

    if (!updatedList) {
      return res.status(404).json({ message: 'Promotional SMS list not found' });
    }

    res.status(200).json({ 
      message: 'Promotional SMS list updated successfully', 
      list: updatedList 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating promotional SMS list' });
  }
};

// Delete a promotional SMS list
export const deletePromotionalSmsList = async (req, res) => {
  try {
    const { listId } = req.params;

    const deletedList = await PromotionalSmsList.findByIdAndDelete(listId);

    if (!deletedList) {
      return res.status(404).json({ message: 'Promotional SMS list not found' });
    }

    res.status(200).json({ message: 'Promotional SMS list deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting promotional SMS list' });
  }
};
