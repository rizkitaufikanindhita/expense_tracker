import './styles/index.css';
import { renderCamera } from './components/camera.js';
import { renderEditor } from './components/receipt-editor.js';
import { renderDashboard } from './components/dashboard.js';
import { renderHistory } from './components/history.js';

document.querySelector('#app').innerHTML = `
  <div class="app-container">
    <header class="app-header">
      <h1>Expense Tracker</h1>
    </header>
    
    <main id="router-view" class="app-main">
      <!-- Route content will be injected here -->
    </main>
    
    <nav class="bottom-nav">
      <a href="#/" class="nav-item">Dashboard</a>
      <a href="#/camera" class="nav-item">Scanner</a>
      <a href="#/history" class="nav-item">History</a>
    </nav>
  </div>
`;

let currentCleanup = null;

function handleRoute() {
  const hash = window.location.hash || '#/';
  const routerView = document.getElementById('router-view');

  if (currentCleanup && typeof currentCleanup === 'function') {
    currentCleanup();
    currentCleanup = null;
  }

  // Update active nav
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  let activePath = hash === '#/' ? '#/' : (hash.startsWith('#/camera') || hash.startsWith('#/edit') ? '#/camera' : '#/history');
  const activeNav = document.querySelector(`.nav-item[href="${activePath}"]`);
  if (activeNav) activeNav.classList.add('active');

  if (hash === '#/') {
    currentCleanup = renderDashboard(routerView);
  } else if (hash === '#/camera') {
    currentCleanup = renderCamera(routerView, (imageBlob) => {
      window.appState = window.appState || {};
      window.appState.pendingImage = imageBlob;
      window.location.hash = '#/edit/new';
    });
  } else if (hash === '#/history') {
    currentCleanup = renderHistory(routerView);
  } else if (hash.startsWith('#/edit')) {
    currentCleanup = renderEditor(routerView);
  } else {
    routerView.innerHTML = '<p class="text-center mt-10">404 Not Found</p>';
  }
}

window.addEventListener('hashchange', handleRoute);
// Initialize route
handleRoute();
