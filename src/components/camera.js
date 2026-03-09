export function renderCamera(container, onCapture) {
    container.innerHTML = `
    <div class="camera-layout">
      <!-- Video Preview -->
      <div class="video-container">
        <video id="camera-stream" autoplay playsinline></video>
        <div class="scan-overlay">
          <div class="scan-frame"></div>
        </div>
      </div>
      
      <!-- Controls -->
      <div class="camera-controls">
        <p class="text-secondary text-sm mb-4">Posisikan struk belanja di dalam kotak.</p>
        <button id="capture-btn" class="capture-btn">
          <div class="capture-inner"></div>
        </button>
        
        <div class="flex justify-between w-full mt-4" style="max-width: 250px;">
          <label class="btn btn-secondary text-sm">
            <span class="icon">📁</span> Galeri
            <input type="file" id="file-input" accept="image/*" class="d-none" style="display: none;" />
          </label>
          <button id="flip-btn" class="btn btn-secondary text-sm">
            <span class="icon">🔄</span> Putar
          </button>
        </div>
      </div>
      
      <canvas id="camera-canvas" style="display: none;"></canvas>
    </div>
  `;

    // Apply some specific styles inline or assume it's in components
    // Wait, I should add these specific styles to a style tag here or in main
    const style = document.createElement('style');
    style.id = 'camera-styles';
    style.textContent = `
    .camera-layout {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: #000;
      margin: -20px; /* offset main padding */
      position: relative;
    }
    .video-container {
      flex: 1;
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #camera-stream {
      min-width: 100%;
      min-height: 100%;
      object-fit: cover;
    }
    .scan-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }
    .scan-frame {
      width: 80%;
      height: 70%;
      border: 2px solid rgba(255, 255, 255, 0.8);
      border-radius: var(--radius-md);
      box-shadow: 0 0 0 2000px rgba(0, 0, 0, 0.5); /* Dim rest */
      position: relative;
    }
    .scan-frame::before, .scan-frame::after {
      content: '';
      position: absolute;
      width: 30px; height: 30px;
      border-color: var(--accent-primary);
      border-style: solid;
    }
    .scan-frame::before {
      top: -2px; left: -2px;
      border-width: 4px 0 0 4px;
      border-radius: var(--radius-md) 0 0 0;
    }
    .camera-controls {
      height: 200px;
      background: var(--bg-primary);
      border-top-left-radius: var(--radius-lg);
      border-top-right-radius: var(--radius-lg);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
      position: relative;
    }
    .capture-btn {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: none;
      border: 4px solid white;
      padding: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform var(--transition-fast);
    }
    .capture-btn:active {
      transform: scale(0.9);
    }
    .capture-inner {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: white;
      transition: all var(--transition-fast);
    }
    .capture-btn:active .capture-inner {
      transform: scale(0.85);
    }
  `;
    if (!document.getElementById('camera-styles')) {
        document.head.appendChild(style);
    }

    const video = document.getElementById('camera-stream');
    const captureBtn = document.getElementById('capture-btn');
    const fileInput = document.getElementById('file-input');
    const flipBtn = document.getElementById('flip-btn');
    const canvas = document.getElementById('camera-canvas');
    const ctx = canvas.getContext('2d');

    let currentStream = null;
    let facingMode = 'environment'; // default back camera

    async function startCamera() {
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: facingMode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            });
            currentStream = stream;
            video.srcObject = stream;
            await video.play();
        } catch (err) {
            console.error('Layar kamera tidak bisa dibuka', err);
            alert('Gagal mengakses kamera. Mohon pastikan izin kamera diberikan atau gunakan opsi upload dari galeri.');
        }
    }

    // Start immediately
    startCamera();

    flipBtn.addEventListener('click', () => {
        facingMode = facingMode === 'environment' ? 'user' : 'environment';
        startCamera();
    });

    captureBtn.addEventListener('click', () => {
        // Shutter animation
        const flash = document.createElement('div');
        flash.style.cssText = 'position: absolute; inset: 0; background: white; z-index: 50; opacity: 1; transition: opacity 0.5s;';
        container.querySelector('.video-container').appendChild(flash);
        setTimeout(() => { flash.style.opacity = '0'; setTimeout(() => flash.remove(), 500); }, 50);

        // Capture logic
        if (video.videoWidth > 0) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            canvas.toBlob((blob) => {
                stopCamera();
                if (onCapture) onCapture(blob); // Pass blob to next step
            }, 'image/jpeg', 0.95);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            stopCamera();
            if (onCapture) onCapture(e.target.files[0]);
        }
    });

    function stopCamera() {
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
        }
    }

    // Return cleanup function to be called when navigating away
    return function cleanup() {
        stopCamera();
    };
}
