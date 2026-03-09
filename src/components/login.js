import { supabase } from '../services/supabase.js';

export function renderLogin(container) {
  let isRegistering = false;

  const renderForm = () => {
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center p-6 h-full min-h-[80vh]">
        <div class="w-full max-w-sm">
          <div class="text-center mb-8">
            <h1 class="text-3xl font-bold text-gradient mb-2">Finance Tracker</h1>
            <p class="text-secondary text-sm">Masuk untuk mengelola keuangan Anda</p>
          </div>

          <div class="card p-6 glass-panel mb-4">
            <h2 class="text-xl font-bold mb-4">${isRegistering ? 'Buat Akun Baru' : 'Masuk ke Akun'}</h2>
            
            <form id="auth-form" class="flex flex-col gap-4">
              <div class="input-group">
                <label for="email">Email</label>
                <input type="email" id="email" class="input-control" placeholder="nama@email.com" required>
              </div>
              
              <div class="input-group">
                <label for="password">Password</label>
                <input type="password" id="password" class="input-control" placeholder="Min. 6 karakter" required minlength="6">
              </div>

              <div id="error-msg" class="text-danger text-sm hidden bg-danger-transparent p-2 rounded"></div>
              
              <button type="submit" class="btn btn-primary w-full mt-2" id="submit-btn">
                ${isRegistering ? 'Daftar Sekarang' : 'Masuk'}
              </button>
            </form>
          </div>

          <div class="text-center">
            <button id="toggle-opt" class="text-sm text-secondary hover:text-white" style="background:transparent; border:none; padding:10px;">
              ${isRegistering ? 'Sudah punya akun? Masuk di sini' : 'Daftar akun baru'}
            </button>
          </div>
        </div>
      </div>
    `;

    // Attach listeners
    container.querySelector('#toggle-opt').addEventListener('click', () => {
      isRegistering = !isRegistering;
      renderForm(); // re-render
    });

    container.querySelector('#auth-form').addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = container.querySelector('#email').value;
      const password = container.querySelector('#password').value;
      const errorDiv = container.querySelector('#error-msg');
      const submitBtn = container.querySelector('#submit-btn');

      errorDiv.classList.add('hidden');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Memproses...';

      try {
        let error;

        if (isRegistering) {
          const res = await supabase.auth.signUp({ email, password });
          error = res.error;
          if (!error && res.data?.user?.identities?.length === 0) {
            // Jika email sudah terdaftar dan konfigurasi Supabase tidak mencegahnya
            error = { message: "Email ini sudah terdaftar." };
          } else if (!error) {
            alert('Pendaftaran berhasil! Silakan langsung login atau cek email Anda untuk verifikasi (jika diaktifkan).');
            isRegistering = false;
            renderForm();
            return;
          }
        } else {
          const res = await supabase.auth.signInWithPassword({ email, password });
          error = res.error;
          if (!error) {
            // Berhasil login
            window.location.hash = '#/';
            return;
          }
        }

        if (error) throw error;
      } catch (err) {
        console.error('Auth Error:', err);
        errorDiv.textContent = err.message || 'Terjadi kesalahan. Silakan coba lagi.';
        errorDiv.classList.remove('hidden');
        submitBtn.disabled = false;
        submitBtn.textContent = isRegistering ? 'Daftar Sekarang' : 'Masuk';
      }
    });
  };

  renderForm();

  return function cleanup() {
    // any cleanup
  };
}
