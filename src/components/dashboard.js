import { getStats } from '../services/db.js';

export async function renderDashboard(container) {
  // Show skeleton loading initially
  container.innerHTML = `
    <div class="p-4 skeleton h-32 mb-4"></div>
    <div class="p-4 skeleton h-24 mb-4"></div>
    <div class="p-4 flex gap-4">
      <div class="skeleton h-24 flex-1"></div>
      <div class="skeleton h-24 flex-1"></div>
    </div>
  `;

  try {
    const stats = await getStats();

    container.innerHTML = `
      <div class="dashboard-header mb-6">
        <h2 class="text-secondary text-sm mb-1">Total Pengeluaran Bulan Ini</h2>
        <h1 class="text-3xl font-bold text-gradient">Rp ${stats.totalThisMonth.toLocaleString('id-ID')}</h1>
      </div>

      <div class="card mb-4 bg-gradient" style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%); border-color: var(--border-focus);">
        <h3 class="font-semibold mb-2 flex items-center gap-2"><span class="icon">📊</span> Ringkasan</h3>
        <div class="flex justify-between items-end">
          <div>
            <p class="text-xs text-secondary mb-1">Total Keseluruhan</p>
            <p class="font-medium">Rp ${stats.totalOverall.toLocaleString('id-ID')}</p>
          </div>
          <div class="text-right">
            <p class="text-xs text-secondary mb-1">Jumlah Transaksi</p>
            <p class="font-medium">${stats.transactionsCount} Struk</p>
          </div>
        </div>
      </div>

      <div class="flex gap-4 mb-6">
        <div class="card flex-1 p-3 text-center">
          <p class="text-xs text-secondary mb-1">Toko Terfavorit</p>
          <p class="font-semibold text-sm truncate">${stats.topStore}</p>
        </div>
        <a href="#/camera" class="btn btn-primary flex-1 shadow-glow" style="text-decoration:none;">
          Pindai Struk
        </a>
      </div>
      
      <!-- <div class="glass-panel p-4">
        <h3 class="font-semibold text-sm mb-3">Grafik Pengeluaran (Demo)</h3>
        <canvas id="expense-chart" height="150" class="w-full"></canvas>
      </div> -->
    `;

    // Draw simple bar chart
    // drawChart(container.querySelector('#expense-chart'));

  } catch (err) {
    console.error(err);
    container.innerHTML = '<p class="text-danger text-center mt-10">Gagal memuat dashboard</p>';
  }
}

function drawChart(canvas) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = rect.height;

  // Dummy data
  const data = [40, 70, 45, 90, 60, 110, 85];
  const max = Math.max(...data);
  const barWidth = 20;
  const spacing = (width - (data.length * barWidth)) / (data.length + 1);

  ctx.clearRect(0, 0, width, height);

  data.forEach((val, i) => {
    const h = (val / max) * (height - 20);
    const x = spacing + (i * (barWidth + spacing));
    const y = height - h;

    // Gradient bar
    const grad = ctx.createLinearGradient(0, y, 0, height);
    grad.addColorStop(0, '#6366f1');
    grad.addColorStop(1, '#8b5cf6');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, h, [4, 4, 0, 0]);
    ctx.fill();

    // Default baseline
    ctx.fillStyle = '#3f3f46';
    ctx.fillRect(0, height - 1, width, 1);
  });
}
