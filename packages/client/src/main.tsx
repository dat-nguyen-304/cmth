import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

// No StrictMode: the battle screen owns an imperative PixiJS canvas, and Strict
// double-mounting would init/destroy the renderer twice on every entry.
createRoot(document.getElementById('root')!).render(<App />);
