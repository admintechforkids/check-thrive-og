import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';

const express = expressModule.default || expressModule;
const cors = corsModule.default || corsModule;
const mongooseURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/checkthrive';

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(cors());
app.use(express.json());

// Mongoose setup
let Task = null;
async function initMongoose() {
  try {
    await mongoose.connect(mongooseURI, { serverSelectionTimeoutMS: 5000 });
    const taskSchema = new mongoose.Schema({
      title: { type: String, required: true },
      isCompleted: { type: Boolean, default: false },
      isPrioritized: { type: Boolean, default: false }
    });
    Task = mongoose.model('Task', taskSchema);
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('Failed to connect to MongoDB. Make sure MongoDB is running or set MONGODB_URI. Falling back to in-memory store:', err.message || err);
    Task = null;
  }
}


// In-memory fallback store
let tasks = [];
let nextId = 1;

app.get('/api/message', (req, res) => {
  res.json({ text: 'Hello from backend!' });
});

// Root route to give a friendly message when visiting '/'
app.get('/', (req, res) => {
  res.send('<h1>CheckThrive backend</h1><p>API is available at <a href="/api/tasks">/api/tasks</a></p>');
});

// Get all tasks
app.get('/api/tasks', async (req, res) => {
  try {
    if (Task) {
      const docs = await Task.find({}).lean();
      return res.json(docs.map(d => ({ id: String(d._id), title: d.title, isCompleted: !!d.isCompleted, isPrioritized: !!d.isPrioritized })));
    }
    return res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a task
app.post('/api/tasks', async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || String(title).trim() === '') {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (Task) {
      const doc = await Task.create({ title: String(title), isCompleted: false, isPrioritized: false });
      return res.status(201).json({ id: String(doc._id), title: doc.title, isCompleted: doc.isCompleted, isPrioritized: doc.isPrioritized });
    }

    const task = { id: nextId++, title: String(title), isCompleted: false, isPrioritized: false };
    tasks.push(task);
    res.status(201).json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Seed / Run - create some default tasks (replaces current list)
app.post('/api/tasks/run', async (req, res) => {
  try {
    const seed = [
      { title: 'Props', isCompleted: false, isPrioritized: false },
      { title: 'State', isCompleted: false, isPrioritized: false },
      { title: 'Context', isCompleted: false, isPrioritized: false }
    ];
    if (Task) {
      await Task.deleteMany({});
      const docs = await Task.insertMany(seed);
      return res.status(201).json(docs.map(d => ({ id: String(d._id), title: d.title, isCompleted: d.isCompleted, isPrioritized: d.isPrioritized })));
    }
    tasks = seed.map(t => ({ id: nextId++, ...t }));
    return res.status(201).json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a task
app.put('/api/tasks/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { title, isCompleted, isPrioritized } = req.body;
    if (Task) {
      const update = {};
      if (title !== undefined) update.title = title;
      if (isCompleted !== undefined) update.isCompleted = isCompleted;
      if (isPrioritized !== undefined) update.isPrioritized = isPrioritized;
      const doc = await Task.findByIdAndUpdate(id, update, { new: true, runValidators: true }).lean();
      if (!doc) return res.status(404).json({ error: 'Not found' });
      return res.json({ id: String(doc._id), title: doc.title, isCompleted: doc.isCompleted, isPrioritized: doc.isPrioritized });
    }

    const numericId = Number(id);
    const task = tasks.find((t) => t.id === numericId);
    if (!task) return res.status(404).json({ error: 'Not found' });
    if (title !== undefined) task.title = title;
    if (isCompleted !== undefined) task.isCompleted = isCompleted;
    if (isPrioritized !== undefined) task.isPrioritized = isPrioritized;
    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a task
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (Task) {
      const doc = await Task.findByIdAndDelete(id);
      if (!doc) return res.status(404).json({ error: 'Not found' });
      return res.status(204).end();
    }
    const numericId = Number(id);
    const before = tasks.length;
    tasks = tasks.filter((t) => t.id !== numericId);
    if (tasks.length === before) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete all tasks
app.delete('/api/tasks', async (req, res) => {
  try {
    if (Task) {
      await Task.deleteMany({});
      return res.status(204).end();
    }
    tasks = [];
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

async function start() {
  await initMongoose();

  app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
  });
}

start();
