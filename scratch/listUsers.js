const mongoose = require('mongoose');
const uri = 'mongodb://127.0.0.1:27017/paytrack';
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const collection = mongoose.connection.db.collection('users');
    const users = await collection.find({}).toArray();
    console.log('Users:', JSON.stringify(users, null, 2));
    await mongoose.disconnect();
  })
  .catch(err => {
    console.error('Connection error:', err);
    process.exit(1);
  });

