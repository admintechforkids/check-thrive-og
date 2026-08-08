import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [tasks, setTasks] = useState([]);
  const [newTitle, setNewTitle] = useState('');

  async function updateTask(taskId, updates) {
    const normalizedTaskId = String(taskId);

    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        String(task.id) === normalizedTaskId ? { ...task, ...updates } : task
      )
    );

    const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to update task');
    }

    await fetchTasks();
  }

  async function completeTask(taskId) {
    await updateTask(taskId, { isCompleted: true });
  }

  async function decompleteTask(taskId) {
    await updateTask(taskId, { isCompleted: false });
  }

  async function prioritizeTask(taskId) {
    await updateTask(taskId, { isPrioritized: true });
  }

  async function deprioritizeTask(taskId) {
    await updateTask(taskId, { isPrioritized: false });
  }

  function filterSearchTasks(searchTerm) {
    setSearchTerm(searchTerm);
  }
  const [searchTerm, setSearchTerm] = useState('');
  const API_BASE = '/api';

  async function fetchTasks() {
    try {
      const res = await fetch(`${API_BASE}/tasks`);
      const data = await res.json();
      setTasks(data);
    } catch (err) {
      console.error('Failed to fetch tasks', err);
    }
  }

  useEffect(() => { fetchTasks(); }, []);
  function createTask(title) {
    // create on backend
    return fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title })
    }).then(async (res) => {
      if (res.status === 400) {
        const err = await res.json();
        throw new Error(err.error || 'Bad Request');
      }
      await fetchTasks();
    });
  }

  async function deleteTask(taskId) {
    await fetch(`${API_BASE}/tasks/${taskId}`, { method: 'DELETE' });
    await fetchTasks();
  }

  const filteredTasks = tasks.filter((t) => t.title.toLowerCase().includes(searchTerm.toLowerCase()));
  const activeTasks = filteredTasks.filter((t) => !t.isCompleted);
  const prioritizedTasks = activeTasks.filter((t) => t.isPrioritized);
  const otherTasks = activeTasks.filter((t) => !t.isPrioritized);
  const completedTasks = filteredTasks.filter((t) => t.isCompleted);
  const hasPrioritized = prioritizedTasks.length > 0;

  return (
    <>
      <section className='task-filter'>
        <div className='filter-bar'>
          <input
            type="text"
            placeholder="Search tasks by name..."
            value={searchTerm}
            onChange={(e) => filterSearchTasks(e.target.value)}
          />
        </div>
        <div style={{ marginTop: 8 }}>
          <input placeholder="New task title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
          <button onClick={async () => {
            try {
              await createTask(newTitle);
              setNewTitle('');
            } catch (err) {
              alert(err.message);
            }
          }}>Create new task</button>
          <button onClick={async () => { await fetch(`${API_BASE}/tasks`, { method: 'DELETE' }); fetchTasks(); }}>DELETE All</button>
        </div>
      </section>

      <section className='top-section'>
        <h3>Checkthrive ✔</h3>
        <h4>{hasPrioritized ? 'Prioritized' : ''}</h4>
        {(hasPrioritized ? prioritizedTasks : activeTasks).map((task) => (
          <article className={`task-card ${task.isCompleted ? 'completed' : ''} ${task.isPrioritized ? 'prioritized' : ''}`} key={task.id}>
            <div>
              <h2>{task.title}</h2>
              <p>Status: {task.isCompleted ? 'Completed' : 'Not yet'}</p>
            </div>

            <button
              className='btn-complete'
              onClick={() => completeTask(task.id)}
            >
              Complete
            </button>
            <button
              className='btn-decomplete'
              onClick={() => decompleteTask(task.id)}
            >
              Undo
            </button>
            <button
              className='btn-prioritize'
              onClick={() => prioritizeTask(task.id)}
            >
              Prioritize
            </button>
            <button
              className='btn-deprioritize'
              onClick={() => deprioritizeTask(task.id)}
            >
              Deprioritize
            </button>
            <button
              className='btn-deletetask'
              onClick={async () => {
                await fetch(`${API_BASE}/tasks/${task.id}`, { method: 'DELETE' });
                fetchTasks();
              }}
            >
              Delete
            </button>
          </article>
        ))}
      </section>

      {hasPrioritized && (
        <section className='not-prioritized-section'>
          <h3>Not Prioritized</h3>
          {otherTasks.map((task) => (
            <article className={`task-card ${task.isCompleted ? 'completed' : ''}`} key={`n-${task.id}`}>
              <div>
                <h2>{task.title}</h2>
                <p>Status: {task.isCompleted ? 'Completed' : 'Not yet'}</p>
              </div>

              <button className='btn-complete' onClick={() => completeTask(task.id)}>
                Complete
              </button>
              <button className='btn-decomplete' onClick={() => decompleteTask(task.id)}>
                Undo
              </button>
              <button className='btn-prioritize' onClick={() => prioritizeTask(task.id)}>
                Prioritize
              </button>
              <button className='btn-deprioritize' onClick={() => deprioritizeTask(task.id)}>
                Deprioritize
              </button>
              <button className='btn-deletetask' onClick={() => deleteTask(task.id)}>
                Delete
              </button>
            </article>
          ))}
        </section>
      )}

      {completedTasks.length > 0 && (
        <section className='completed-section'>
          <h3>Completed</h3>
          {completedTasks.map((task) => (
            <article className='task-card completed' key={`c-${task.id}`}>
              <div>
                <h2>{task.title}</h2>
                <p>Status: Completed</p>
              </div>

              <button className='btn-decomplete' onClick={() => decompleteTask(task.id)}>
                Undo
              </button>
              <button className='btn-deletetask' onClick={() => deleteTask(task.id)}>
                Delete
              </button>
            </article>
          ))}
        </section>
      )}

    </>
  )
}

export default App
