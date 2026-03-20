const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB using the service name "mongo" as the host
mongoose.connect('mongodb://mongo:27017/myapp')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB error:', err));

// A simple schema to store messages
const Message = mongoose.model('Message', { text: String });

// Save a message
app.post('/messages', async (req, res) => {
  const msg = await Message.create({ text: req.body.text });
  res.json(msg);
});

// Get all messages
app.get('/messages', async (req, res) => {
  const msgs = await Message.find();
  res.json(msgs);
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));