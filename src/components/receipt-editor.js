import { parseReceiptWithGemini, getApiKey, setApiKey } from '../services/gemini.js';
import { addTransaction } from '../services/db.js';

export function renderEditor(container, imageBlob = null) {
  let receiptData = { store: '', date: '', items: [], total: 0 };
  let originalImageBlob = imageBlob;

  container.innerHTML = `
    <div class="editor-layout skeleton" id="editor-loading">
      <div class="flex flex-col items-center justify-center h-full p-8 text-center" style="min-height: 60vh;">
        <div class="spinner mb-4" style="width: 48px; height: 48px; border: 4px solid var(--border-subtle); border-top-color: var(--accent-primary); border-radius: 50%; animation: spin 1s linear infinite;"></div>
        <h2 class="text-lg font-semibold mb-2" id="loading-title">Memproses Struk...</h2>
        <p class="text-secondary text-sm" id="ocr-status">Menyiapkan AI...</p>
        <style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>
      </div>
    </div>
    
    <div id="apikey-prompt" class="modal-overlay" style="display: none; align-items:flex-start; padding-top:20vh;">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Google Gemini API Key</h2>
        </div>
        <div class="modal-body">
          <p class="text-sm text-secondary mb-4">Aplikasi ini membutuhkan API Key Gemini (gratis) untuk membaca struk dengan sangat cepat dan akurat.</p>
          <div class="input-group">
            <input type="password" id="api-key-input" class="input-control" placeholder="AIzaSy...">
          </div>
          <p class="text-xs text-secondary mt-2">Dapatkan di: <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:var(--accent-primary)">Google AI Studio</a></p>
        </div>
        <div class="modal-footer">
          <button id="save-key-btn" class="btn btn-primary">Simpan & Lanjutkan</button>
        </div>
      </div>
    </div>
    
    <div id="editor-content" class="editor-layout" style="display: none;">
      <div class="editor-header glass-panel mb-4 p-4">
        <h2 class="text-lg font-semibold">Cek & Edit Data</h2>
        <p class="text-sm text-secondary">Pastikan data dari AI sudah benar</p>
      </div>

      <div class="card mb-4" id="receipt-preview-card" style="display: none;">
        <img id="receipt-img-preview" src="" alt="Struk" class="w-full" style="border-radius: var(--radius-sm); max-height: 200px; object-fit: contain; background: black;">
      </div>

      <form id="receipt-form" class="card mb-4">
        <div class="input-group">
          <label for="store-input">Nama Toko</label>
          <input type="text" id="store-input" class="input-control" required>
        </div>
        
        <div class="input-group">
          <label for="date-input">Tanggal</label>
          <input type="date" id="date-input" class="input-control" required>
        </div>

        <div class="items-section mt-4 relative">
          <div class="flex justify-between items-center mb-2">
            <label class="font-semibold text-sm">Daftar Barang</label>
            <button type="button" id="add-item-btn" class="btn btn-secondary text-xs" style="padding: 4px 8px;">+ Tambah</button>
          </div>
          
          <div id="items-list" class="flex flex-col gap-2"></div>
        </div>

        <div class="input-group mt-6 pt-4" style="border-top: 1px solid var(--border-subtle);">
          <label for="total-input" class="text-lg font-bold text-gradient">Total Belanja</label>
          <div style="position: relative;">
            <span style="position: absolute; left: 14px; top: 12px; color: var(--text-secondary); font-weight: bold;">Rp</span>
            <input type="number" id="total-input" class="input-control font-bold" style="font-size: 1.25rem; padding-left: 45px;" required>
          </div>
        </div>
        
        <button type="submit" class="btn btn-primary w-full mt-6" style="padding: 16px; font-size: 1.1rem;">Simpan Transaksi</button>
      </form>
    </div>
  `;

  const loadingView = container.querySelector('#editor-loading');
  const contentView = container.querySelector('#editor-content');
  const statusText = container.querySelector('#ocr-status');
  const apiKeyModal = container.querySelector('#apikey-prompt');

  if (!imageBlob && window.appState && window.appState.pendingImage) {
    imageBlob = window.appState.pendingImage;
    originalImageBlob = imageBlob;
    window.appState.pendingImage = null; // consume
  }

  if (imageBlob) {
    const previewImg = container.querySelector('#receipt-img-preview');
    const url = URL.createObjectURL(imageBlob);
    previewImg.src = url;
    container.querySelector('#receipt-preview-card').style.display = 'block';

    startProcessingFlow(imageBlob);
  } else {
    loadingView.style.display = 'none';
    contentView.style.display = 'block';
    renderItems();
  }

  function startProcessingFlow(blob) {
    if (!getApiKey()) {
      loadingView.style.display = 'none';
      apiKeyModal.style.display = 'flex';

      container.querySelector('#save-key-btn').onclick = () => {
        const val = container.querySelector('#api-key-input').value.trim();
        if (val) {
          setApiKey(val);
          apiKeyModal.style.display = 'none';
          loadingView.style.display = 'block';
          processImageWithAI(blob);
        }
      };
    } else {
      processImageWithAI(blob);
    }
  }

  async function processImageWithAI(blob) {
    try {
      statusText.textContent = "Mengunggah gambar ke AI...";

      const parsedData = await parseReceiptWithGemini(blob, (progressMsg) => {
        statusText.textContent = progressMsg;
      });

      // Merge with default struct in case LLM misses something
      receiptData = { ...receiptData, ...parsedData };
      if (!receiptData.items) receiptData.items = [];

      populateForm();

      loadingView.style.display = 'none';
      contentView.style.display = 'block';
      showToast('Data berhasil dibaca AI. Silakan periksa kembali.');

    } catch (err) {
      console.error(err);
      if (err.message === 'API_KEY_MISSING' || String(err).includes('API_KEY_INVALID')) {
        setApiKey(''); // clear bad key
        alert('API Key invalid atau belum dikonfigurasi.');
        startProcessingFlow(blob); // ask again
        return;
      }

      alert('Gagal memproses struk dengan AI. Silakan isi manual.');
      loadingView.style.display = 'none';
      contentView.style.display = 'block';
      renderItems();
    }
  }

  function populateForm() {
    container.querySelector('#store-input').value = receiptData.store;

    // Check if valid yyyy-mm-dd
    const dateInputStr = receiptData.date || new Date().toISOString().split('T')[0];
    container.querySelector('#date-input').value = dateInputStr.slice(0, 10);

    container.querySelector('#total-input').value = receiptData.total;
    renderItems();
  }

  function renderItems() {
    const list = container.querySelector('#items-list');
    list.innerHTML = '';

    if (receiptData.items.length === 0) {
      list.innerHTML = '<div class="text-center p-4 text-tertiary text-sm" style="border: 1px dashed var(--border-subtle); border-radius: var(--radius-sm);">Belum ada barang</div>';
      return;
    }

    receiptData.items.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'flex gap-2 items-center mb-2';
      row.innerHTML = `
        <input type="text" class="input-control flex-1" placeholder="Nama Barang" value="\${item.name || ''}" data-idx="\${index}" data-field="name" style="padding: 10px;">
        <input type="number" class="input-control" placeholder="Qty" value="\${item.qty || 1}" min="1" data-idx="\${index}" data-field="qty" style="width: 60px; padding: 10px; text-align: center;">
        <input type="number" class="input-control" placeholder="Harga" value="\${item.price || 0}" data-idx="\${index}" data-field="price" style="width: 100px; padding: 10px;">
        <button type="button" class="btn btn-danger delete-item-btn" data-idx="\${index}" style="padding: 10px;">✕</button>
      `;
      list.appendChild(row);
    });

    list.querySelectorAll('input').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = e.target.getAttribute('data-idx');
        const field = e.target.getAttribute('data-field');
        receiptData.items[idx][field] = field === 'name' ? e.target.value : Number(e.target.value);
        updateTotal();
      });
    });

    list.querySelectorAll('.delete-item-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = e.target.getAttribute('data-idx');
        receiptData.items.splice(idx, 1);
        renderItems();
        updateTotal();
      });
    });
  }

  function updateTotal() {
    const newTotal = receiptData.items.reduce((sum, item) => sum + (item.price * item.qty), 0);
    container.querySelector('#total-input').value = newTotal;
    receiptData.total = newTotal;
  }

  container.querySelector('#add-item-btn').addEventListener('click', () => {
    receiptData.items.push({ id: Date.now().toString(), name: '', qty: 1, price: 0 });
    renderItems();
  });

  container.querySelector('#receipt-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const transaction = {
      store: container.querySelector('#store-input').value,
      date: container.querySelector('#date-input').value,
      total: Number(container.querySelector('#total-input').value),
      items: receiptData.items,
      imageBlob: originalImageBlob
    };

    try {
      const btn = container.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Menyimpan...';

      await addTransaction(transaction);
      showToast('Transaksi Berhasil Disimpan!');

      setTimeout(() => {
        window.location.hash = '#/history';
      }, 1000);

    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan transaksi');
      container.querySelector('button[type="submit"]').disabled = false;
    }
  });

  return function cleanup() {
    // cleanup
  };
}

function showToast(message) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span style="background: var(--accent-success); border-radius: 50%; width: 16px; height: 16px; display: inline-block; box-shadow: 0 0 10px var(--accent-success);"></span> \${message}`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideDown 0.3s reverse forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
