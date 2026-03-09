import { getTransactions, deleteTransaction } from '../services/db.js';

export async function renderHistory(container) {
    container.innerHTML = `
    <div class="mb-4">
      <h2 class="text-xl font-bold mb-2">Riwayat Transaksi</h2>
      <input type="text" id="search-input" class="input-control text-sm" placeholder=" Cari nama toko...">
    </div>
    <div id="transactions-list" class="flex flex-col gap-3 pb-8">
      <!-- Loading Skeleton -->
      <div class="skeleton h-20 w-full mb-2"></div>
      <div class="skeleton h-20 w-full mb-2"></div>
      <div class="skeleton h-20 w-full mb-2"></div>
    </div>
  `;

    const listContainer = container.querySelector('#transactions-list');
    const searchInput = container.querySelector('#search-input');

    let allTxs = [];

    try {
        allTxs = await getTransactions();
        renderList(allTxs);

        searchInput.addEventListener('input', (e) => {
            const qs = e.target.value.toLowerCase();
            const filtered = allTxs.filter(tx => tx.store.toLowerCase().includes(qs));
            renderList(filtered);
        });

    } catch (err) {
        console.error(err);
        listContainer.innerHTML = '<p class="text-danger text-center py-4">Gagal memuat history</p>';
    }

    function renderList(txs) {
        if (txs.length === 0) {
            listContainer.innerHTML = `
        <div class="text-center py-10">
          <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;">🧾</div>
          <p class="text-secondary text-sm">Belum ada transaksi.</p>
        </div>
      `;
            return;
        }

        listContainer.innerHTML = txs.map(tx => `
      <div class="card p-4 flex justify-between items-center no-select" style="cursor: pointer;" data-id="${tx.id}">
        <div class="flex-1 min-w-0 pr-4">
          <h3 class="font-semibold text-base truncate">${tx.store}</h3>
          <p class="text-xs text-secondary mt-1">${formatDate(tx.date)} • ${tx.items ? tx.items.length : 0} Barang</p>
        </div>
        <div class="text-right flex-shrink-0">
          <p class="font-bold text-gradient">Rp ${tx.total.toLocaleString('id-ID')}</p>
        </div>
      </div>
    `).join('');

        listContainer.querySelectorAll('.card').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.getAttribute('data-id');
                const tx = txs.find(t => t.id === id);
                if (tx) showDetailModal(tx);
            });
        });
    }

    function formatDate(ymd) {
        try {
            const d = new Date(ymd);
            return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
        } catch {
            return ymd;
        }
    }

    function showDetailModal(tx) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';

        const itemsHtml = tx.items ? tx.items.map(item => `
      <div class="flex justify-between items-center mb-2 pb-2" style="border-bottom: 1px dashed var(--border-subtle)">
        <div class="min-w-0 pr-2 flex-1">
          <p class="text-sm truncate">${item.name}</p>
          <p class="text-xs text-secondary">${item.qty} x Rp ${item.price.toLocaleString('id-ID')}</p>
        </div>
        <p class="font-medium text-sm text-right flex-shrink-0">Rp ${(item.qty * item.price).toLocaleString('id-ID')}</p>
      </div>
    `).join('') : '<p class="text-center text-sm text-secondary">Tidak ada detail barang</p>';

        modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Detail Transaksi</h2>
          <button class="btn btn-secondary text-lg close-btn" style="padding: 4px 10px; border:none; background:transparent">✕</button>
        </div>
        <div class="modal-body">
          <div class="text-center mb-6">
            <h3 class="text-xl font-bold">${tx.store}</h3>
            <p class="text-sm text-secondary">${formatDate(tx.date)}</p>
          </div>
          
          <div class="items-list mb-6">
            ${itemsHtml}
          </div>
          
          <div class="flex justify-between items-center text-lg font-bold" style="border-top: 1px solid var(--border-subtle); padding-top: 16px;">
            <span>Total</span>
            <span class="text-gradient">Rp ${tx.total.toLocaleString('id-ID')}</span>
          </div>
          
          ${tx.imageBlob ? '<div class="mt-6 text-center"><button class="btn btn-secondary text-xs show-receipt-btn">Lihat Foto Struk</button></div>' : ''}
        </div>
        <div class="modal-footer">
          <button class="btn btn-danger delete-btn" style="padding: 8px 16px;">Hapus Data</button>
        </div>
      </div>
    `;

        document.body.appendChild(modal);

        const closeModal = () => modal.remove();
        modal.querySelector('.close-btn').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

        modal.querySelector('.delete-btn').addEventListener('click', async () => {
            if (confirm('Yakin ingin menghapus riwayat ini?')) {
                await deleteTransaction(tx.id);
                closeModal();
                allTxs = allTxs.filter(t => t.id !== tx.id);
                renderList(allTxs);
            }
        });

        if (tx.imageBlob) {
            modal.querySelector('.show-receipt-btn').addEventListener('click', () => {
                const imgUrl = URL.createObjectURL(tx.imageBlob);
                const imgWin = window.open('', '_blank');
                imgWin.document.write('<img src="' + imgUrl + '" style="max-width:100%;"><' + 'script>window.onbeforeunload=()=>URL.revokeObjectURL("' + imgUrl + '")<' + '/script>');
            });
        }
    }
}
