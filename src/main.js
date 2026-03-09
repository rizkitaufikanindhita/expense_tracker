import './styles/index.css';
import { renderCamera } from './components/camera.js';
import { renderEditor } from './components/receipt-editor.js';
import { renderDashboard } from './components/dashboard.js';
import { renderHistory } from './components/history.js';
import { renderLogin } from './components/login.js';
import { supabase } from './services/supabase.js';

document.querySelector('#app').innerHTML = `
  <div class="app-container">
    <header class="app-header flex justify-between items-center">
      <h1>Expense Tracker</h1>
      <button id="logout-btn" class="text-xs btn btn-secondary hidden" style="padding: 4px 8px;">Logout</button>
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
const bottomNav = document.querySelector('.bottom-nav');
const logoutBtn = document.querySelector('#logout-btn');

logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.hash = '#/login';
});

async function handleRoute() {
  const hash = window.location.hash || '#/';
  const routerView = document.getElementById('router-view');

  // Cek Auth Session Supabase
  const { data: { session } } = await supabase.auth.getSession();

  if (!session && hash !== '#/login') {
    // Redirect ke login jika belum login
    window.location.hash = '#/login';
    return; // handleRoute akan terpanggil lagi via hashchange
  }

  if (session && hash === '#/login') {
    // Jika sudah login tapi akses halaman login, lempar ke dashboard
    window.location.hash = '#/';
    return;
  }

  // UI Toggles
  if (hash === '#/login') {
    bottomNav.style.display = 'none';
    logoutBtn.classList.add('hidden');
  } else {
    bottomNav.style.display = 'flex';
    logoutBtn.classList.remove('hidden');
  }

  if (currentCleanup && typeof currentCleanup === 'function') {
    currentCleanup();
    currentCleanup = null;
  }

  // Update active nav
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  let activePath = hash === '#/' ? '#/' : (hash.startsWith('#/camera') || hash.startsWith('#/edit') ? '#/camera' : '#/history');
  const activeNav = document.querySelector(`.nav-item[href="\${activePath}"]`);
  if (activeNav) activeNav.classList.add('active');

  if (hash === '#/login') {
    currentCleanup = renderLogin(routerView);
  } else if (hash === '#/') {
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

// Dengarkan perubahan auth state (misal login/logout via tab lain)
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    if (window.location.hash === '#/login' || window.location.hash === '') {
      window.location.hash = '#/';
    }
  } else if (event === 'SIGNED_OUT') {
    window.location.hash = '#/login';
  }
});

window.addEventListener('hashchange', handleRoute);
// Initialize route
handleRoute();
