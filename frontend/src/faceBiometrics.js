// 🧠 Client-Side Facial Biometrics & Feature Vector Extraction Module
// Provides normalized 32-dimensional facial embedding extraction and cosine similarity verification

export function extractFaceEmbedding(imageSrc) {
  return new Promise((resolve, reject) => {
    if (!imageSrc) return resolve(null);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const W = 100;
        const H = 100;
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return resolve(null);

        // Crop central 75% where the face resides
        const cropW = img.naturalWidth * 0.75;
        const cropH = img.naturalHeight * 0.75;
        const cropX = (img.naturalWidth - cropW) / 2;
        const cropY = (img.naturalHeight - cropH) / 2;

        ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, W, H);
        const imgData = ctx.getImageData(0, 0, W, H);
        const data = imgData.data;

        const vector = [];

        // 1. Regional 4x4 Luminance Grid (16 features)
        const cellW = Math.floor(W / 4);
        const cellH = Math.floor(H / 4);
        for (let row = 0; row < 4; row++) {
          for (let col = 0; col < 4; col++) {
            let sumLum = 0;
            let count = 0;
            for (let y = row * cellH; y < (row + 1) * cellH; y++) {
              for (let x = col * cellW; x < (col + 1) * cellW; x++) {
                const idx = (y * W + x) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                const lum = 0.299 * r + 0.587 * g + 0.114 * b;
                sumLum += lum;
                count++;
              }
            }
            vector.push(count > 0 ? (sumLum / count) / 255.0 : 0);
          }
        }

        // 2. Average Skin Undertone Chrominance Cb & Cr (4 features)
        let sumCb = 0, sumCr = 0, sumR = 0, sumG = 0;
        const totalPixels = W * H;
        for (let i = 0; i < totalPixels; i++) {
          const idx = i * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
          const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
          sumCb += cb;
          sumCr += cr;
          sumR += r;
          sumG += g;
        }
        vector.push((sumCb / totalPixels) / 255.0);
        vector.push((sumCr / totalPixels) / 255.0);
        vector.push((sumR / totalPixels) / 255.0);
        vector.push((sumG / totalPixels) / 255.0);

        // 3. Horizontal Projection Profile: 6 vertical bands (6 features)
        const bandH = Math.floor(H / 6);
        for (let b = 0; b < 6; b++) {
          let bLum = 0, bCount = 0;
          for (let y = b * bandH; y < (b + 1) * bandH; y++) {
            for (let x = 0; x < W; x++) {
              const idx = (y * W + x) * 4;
              bLum += (data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114);
              bCount++;
            }
          }
          vector.push(bCount > 0 ? (bLum / bCount) / 255.0 : 0);
        }

        // 4. Vertical Projection Profile: 6 horizontal bands (6 features)
        const bandW = Math.floor(W / 6);
        for (let b = 0; b < 6; b++) {
          let bLum = 0, bCount = 0;
          for (let y = 0; y < H; y++) {
            for (let x = b * bandW; x < (b + 1) * bandW; x++) {
              const idx = (y * W + x) * 4;
              bLum += (data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114);
              bCount++;
            }
          }
          vector.push(bCount > 0 ? (bLum / bCount) / 255.0 : 0);
        }

        // 5. Zero-Center (Mean Subtraction) and L2 Normalization
        // This removes constant background brightness and isolates unique facial contour ratios
        const mean = vector.reduce((acc, v) => acc + v, 0) / vector.length;
        const zeroCentered = vector.map(v => v - mean);

        let normSq = 0;
        for (let i = 0; i < zeroCentered.length; i++) {
          normSq += zeroCentered[i] * zeroCentered[i];
        }
        const norm = Math.sqrt(normSq) || 1;
        const normalized = zeroCentered.map(v => v / norm);

        resolve(normalized);
      } catch (err) {
        console.error('Error generating face embedding:', err);
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = imageSrc;
  });
}

export function compareFaceEmbeddings(embeddingA, embeddingB, threshold = 70.0) {
  if (!embeddingA || !embeddingB || embeddingA.length !== embeddingB.length) {
    return { matched: false, similarity: 0.0, threshold };
  }

  // Cosine similarity between unit-normalized, zero-centered biometric vectors
  let dotProduct = 0;
  for (let i = 0; i < embeddingA.length; i++) {
    dotProduct += embeddingA[i] * embeddingB[i];
  }

  // Map [-1, 1] cosine range to [0, 100]% similarity score
  const scaledSimilarity = ((dotProduct + 1) / 2) * 100;
  const similarity = parseFloat(Math.max(0, Math.min(100, scaledSimilarity)).toFixed(1));
  const matched = similarity >= threshold;

  return { matched, similarity, threshold };
}

export async function compareFaceImages(livePhoto, registeredPhoto, threshold = 70.0) {
  if (!livePhoto || !registeredPhoto) {
    return { matched: false, similarity: 0.0, threshold, reason: 'Missing photo data' };
  }

  const [embLive, embRef] = await Promise.all([
    extractFaceEmbedding(livePhoto),
    extractFaceEmbedding(registeredPhoto)
  ]);

  if (!embLive || !embRef) {
    return { matched: false, similarity: 0.0, threshold, reason: 'Failed to process face images' };
  }

  return compareFaceEmbeddings(embLive, embRef, threshold);
}

// Retrieve registered photo from localStorage / profile
export function getRegisteredStudentPhoto(user) {
  if (!user) return null;

  // 1. Check direct keys
  if (user.id) {
    const p = localStorage.getItem(`geoattend_face_${user.id}`);
    if (p && p.startsWith('data:image')) return p;
  }
  if (user.email) {
    const p = localStorage.getItem(`geoattend_face_${user.email.toLowerCase().trim()}`);
    if (p && p.startsWith('data:image')) return p;
  }
  if (user.usn) {
    const p = localStorage.getItem(`geoattend_face_${user.usn.toLowerCase().trim()}`);
    if (p && p.startsWith('data:image')) return p;
  }
  if (user.face_image && user.face_image.startsWith('data:image')) {
    return user.face_image;
  }

  // 2. Check custom registered users
  try {
    const customUsers = JSON.parse(localStorage.getItem('geoattend_custom_users') || '[]');
    const cleanEmail = (user.email || '').toLowerCase().trim();
    const cleanUsn = (user.usn || '').toLowerCase().trim();
    const match = customUsers.find(u =>
      (cleanEmail && u.email && u.email.toLowerCase().trim() === cleanEmail) ||
      (cleanUsn && u.usn && u.usn.toLowerCase().trim() === cleanUsn) ||
      (user.id && u.id && String(u.id) === String(user.id))
    );
    if (match) {
      if (match.face_image && match.face_image.startsWith('data:image')) return match.face_image;
      if (match.id) {
        const byMatchId = localStorage.getItem(`geoattend_face_${match.id}`);
        if (byMatchId && byMatchId.startsWith('data:image')) return byMatchId;
      }
    }
  } catch (e) {}

  return null;
}

// Save student face photo and update user record
export async function saveRegisteredStudentPhoto(user, photoBase64) {
  if (!user || !photoBase64) return false;

  try {
    if (user.id) localStorage.setItem(`geoattend_face_${user.id}`, photoBase64);
    if (user.email) localStorage.setItem(`geoattend_face_${user.email.toLowerCase().trim()}`, photoBase64);
    if (user.usn) localStorage.setItem(`geoattend_face_${user.usn.toLowerCase().trim()}`, photoBase64);

    // Also precompute and cache the 32-d embedding
    const embedding = await extractFaceEmbedding(photoBase64);
    if (embedding) {
      if (user.id) localStorage.setItem(`geoattend_emb_${user.id}`, JSON.stringify(embedding));
      if (user.email) localStorage.setItem(`geoattend_emb_${user.email.toLowerCase().trim()}`, JSON.stringify(embedding));
    }

    // Update custom users list
    try {
      const customUsers = JSON.parse(localStorage.getItem('geoattend_custom_users') || '[]');
      const cleanEmail = (user.email || '').toLowerCase().trim();
      const updated = customUsers.map(u => {
        if ((cleanEmail && u.email && u.email.toLowerCase().trim() === cleanEmail) || (user.id && u.id === user.id)) {
          return { ...u, face_image: photoBase64, face_registered: true };
        }
        return u;
      });
      localStorage.setItem('geoattend_custom_users', JSON.stringify(updated));
    } catch (e) {}

    // Update active user in localStorage if matching
    try {
      const activeUser = JSON.parse(localStorage.getItem('user') || '{}');
      if (activeUser.id === user.id || (activeUser.email && user.email && activeUser.email.toLowerCase() === user.email.toLowerCase())) {
        activeUser.face_image = photoBase64;
        activeUser.face_registered = true;
        localStorage.setItem('user', JSON.stringify(activeUser));
      }
    } catch (e) {}

    return true;
  } catch (err) {
    console.error('Failed to save student photo:', err);
    return false;
  }
}
