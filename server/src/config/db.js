const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/paytrack';
    
    // Connect without hardcoded credentials
    const conn = await mongoose.connect(uri);

    console.log(`[MongoDB Connected]: Host: ${conn.connection.host}, DB: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[MongoDB Connection Error]: ${error.message}`);
    // Do not crash silently; allow calling code to see error
    process.exit(1);
  }
};

module.exports = connectDB;
