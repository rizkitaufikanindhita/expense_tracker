const GEMINI_API_KEY = localStorage.getItem('GEMINI_API_KEY') || '';

export function getApiKey() {
    return localStorage.getItem('GEMINI_API_KEY') || '';
}

export function setApiKey(key) {
    localStorage.setItem('GEMINI_API_KEY', key);
}

/**
 * Converts a Blob to a base64 string
 */
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(blob);
    });
}

/**
 * Parse image using Gemini 1.5 Flash API
 * @param {Blob} imageBlob 
 * @param {Function} onProgress Callback for status updates
 * @returns {Promise<Object>} The parsed receipt data
 */
export async function parseReceiptWithGemini(imageBlob, onProgress) {
    const apiKey = getApiKey();

    if (!apiKey) {
        throw new Error('API_KEY_MISSING');
    }

    try {
        if (onProgress) onProgress('Menyiapkan gambar...');
        const base64Data = await blobToBase64(imageBlob);

        // We can use gemini-1.5-flash for fast and cheap multimodal tasks
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        const prompt = `
      Ini adalah struk belanja berbahasa Indonesia.
      Tolong ekstrak informasi berikut dan HANYA KEMBALIKAN RAW JSON tanpa markdown blocks atau teks penjelasan apapun:
      {
        "store": "Nama toko",
        "date": "Tanggal struk dalam format YYYY-MM-DD",
        "items": [
          {
            "name": "Nama barang (huruf kapital)",
            "qty": jumlah qty (angka),
            "price": harga asli (angka, tanpa titik ribuan)
          }
        ],
        "total": total belanja keseluruhan (angka)
      }
      Pastikan JSON terstruktur dengan benar dan angka tidak mengandung simbol mata uang.
    `;

        const requestBody = {
            contents: [{
                parts: [
                    { text: prompt },
                    {
                        inline_data: {
                            mime_type: imageBlob.type || 'image/jpeg',
                            data: base64Data
                        }
                    }
                ]
            }],
            generationConfig: {
                temperature: 0.1, // low temp for deterministic parsing
                responseMimeType: "application/json"
            }
        };

        if (onProgress) onProgress('Mengirim ke Gemini API...');

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            console.error('Gemini API Error:', errData);
            throw new Error(errData?.error?.message || `Gagal terhubung ke API: ${response.status}`);
        }

        if (onProgress) onProgress('Memproses JSON response...');
        const result = await response.json();

        // Extract JSON string from Gemini's response structure
        let jsonString = result.candidates[0].content.parts[0].text;

        // Parse to object
        const pData = JSON.parse(jsonString);

        // Normalize data slightly just in case
        return {
            store: pData.store || 'Unknown',
            date: pData.date || new Date().toISOString().split('T')[0],
            items: Array.isArray(pData.items) ? pData.items : [],
            total: Number(pData.total) || 0
        };

    } catch (err) {
        console.error('OCR Error:', err);
        throw err;
    }
}
