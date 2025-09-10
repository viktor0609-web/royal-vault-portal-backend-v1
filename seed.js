// seed.js
import mongoose from 'mongoose';
import Category from './models/Category.js';
import Requirement from './models/Requirement.js';
import Source from './models/Source.js';
import Strategy from './models/Strategy.js';
import SubCategory from './models/SubCategory.js';
import Type from './models/Type.js';

const seedData = async () => {
  try {
    // MongoDB connection string
    await mongoose.connect(
      'mongodb+srv://Viktor:Viktor@viktorclientportal.dxcos6d.mongodb.net/?retryWrites=true&w=majority&appName=ViktorClientPortal'
    );
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      Category.deleteMany({}),
      Requirement.deleteMany({}),
      Source.deleteMany({}),
      Strategy.deleteMany({}),
      SubCategory.deleteMany({}),
      Type.deleteMany({}),
    ]);
    console.log('🗑️ Cleared existing data');

    // Seed Categories
    await Category.insertMany([
      { name: 'Machinery' },
      { name: 'Real Estate' },
      { name: 'Energy' },
      { name: 'Algo Trading' },
      { name: 'Business' },
    ]);
    console.log('📂 Categories seeded');

    // Seed Requirements
    await Requirement.insertMany([
      { name: 'Qualified Investors' },
      { name: 'Real Estate Professional' },
      { name: 'Accredited Investors' },
    ]);
    console.log('📋 Requirements seeded');

    // Seed Sources
    await Source.insertMany([{ name: 'Royal Sourced' }, { name: 'Client Sourced' }]);
    console.log('🔗 Sources seeded');

    // Seed Strategies
    await Strategy.insertMany([{ name: 'Cash Flow' }, { name: 'Depreciation' }]);
    console.log('📈 Strategies seeded');

    // Seed SubCategories
    await SubCategory.insertMany([
      { name: 'Multi-Family' },
      { name: 'Oil & Gas' },
      { name: 'Car Wash' },
      { name: 'Equipment' },
      { name: 'Farmland' },
      { name: 'Self Storage' },
      { name: 'Rentals' },
      { name: 'RV Parks' },
      { name: 'Forex' },
      { name: 'Single Family' },
      { name: 'Flips' },
      { name: 'Mobile Homes' },
      { name: 'ATM funds' },
      { name: 'Private Credit Funds' },
      { name: 'Distressed Debt' },
      { name: 'Industrial' },
      { name: 'Senior Housing' },
      { name: 'Commercial' },
      { name: 'Student Housing' },
      { name: 'Small Business' },
      { name: 'Land Development' },
    ]);
    console.log('📂 SubCategories seeded');

    // Seed Types
    await Type.insertMany([{ name: 'Syndication' }, { name: 'Turnkey' }, { name: 'Algo Trading' }]);
    console.log('🏷️ Types seeded');

    console.log('✅ Database seeding completed!');
    mongoose.connection.close();
  } catch (err) {
    console.error('❌ Seeding error:', err);
    mongoose.connection.close();
  }
};

seedData();
