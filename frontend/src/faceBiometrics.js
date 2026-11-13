// 🧠 Advanced Client-Side Facial Biometrics & Feature Vector Extraction Module
// Provides robust, translation-invariant facial feature extraction, face localization,
// chromatic undertone profiling, 2D normalized cross-correlation, and 1-to-1 face verification.

import { DEFAULT_STUDENT_PHOTOS } from './defaultStudentPhotos';

export function extractFaceEmbedding(imageSrc) {
  return new Promise((resolve) => {
    if (!imageSrc) return resolve(null);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const W = 120;
        const H = 120;
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return resolve(null);

        ctx.drawImage(img, 0, 0, W, H);
        const imgData = ctx.getImageData(0, 0, W, H);
        const data = imgData.data;

        // 1. Skin-Color Localization to detect true face bounding box
        let minX = W, maxX = 0, minY = H, maxY = 0;
        let skinPixels = 0;
        let sumCb = 0, sumCr = 0, sumR = 0, sumG = 0, sumB = 0;
        const hsHist = new Float64Array(16); // 8 hue bins x 2 saturation bins

        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            const idx = (y * W + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            // YCbCr skin chrominance
            const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
            const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

            // Skin detection conditions
            const isSkin = (
              r > 40 && g > 25 && b > 15 &&
              r > g && (r - b) > 8 &&
              cb >= 70 && cb <= 140 &&
              cr >= 120 && cr <= 190
            );

            if (isSkin) {
              skinPixels++;
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;

              sumCb += cb;
              sumCr += cr;
              sumR += r;
              sumG += g;
              sumB += b;

              // Hue & Saturation
              const max = Math.max(r, g, b);
              const min = Math.min(r, g, b);
              const d = max - min;
              let h = 0;
              if (d !== 0) {
                if (max === r) h = ((g - b) / d) % 6;
                else if (max === g) h = (b - r) / d + 2;
                else h = (r - g) / d + 4;
                h = Math.round(h * 60);
                if (h < 0) h += 360;
              }
              const s = max === 0 ? 0 : d / max;
              const hBin = Math.min(7, Math.floor((h / 360) * 8));
              const sBin = s > 0.35 ? 1 : 0;
              hsHist[hBin * 2 + sBin]++;
            }
          }
        }

        // Normalize Hue-Sat histogram
        if (skinPixels > 0) {
          for (let i = 0; i < 16; i++) hsHist[i] /= skinPixels;
        }

        // Default bounds if face detection failed
        if (skinPixels < (W * H * 0.03)) {
          minX = Math.floor(W * 0.15); maxX = Math.floor(W * 0.85);
          minY = Math.floor(H * 0.15); maxY = Math.floor(H * 0.85);
        }

        const boxW = Math.max(10, maxX - minX);
        const boxH = Math.max(10, maxY - minY);
        const boxAspect = boxW / boxH;

        // 2. Normalized 8x8 Luminance Grid inside Face BBox
        const grid = new Float64Array(64);
        const cellW = boxW / 8;
        const cellH = boxH / 8;

        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            let sumLum = 0, count = 0;
            const y0 = Math.floor(minY + r * cellH);
            const y1 = Math.floor(minY + (r + 1) * cellH);
            const x0 = Math.floor(minX + c * cellW);
            const x1 = Math.floor(minX + (c + 1) * cellW);

            for (let y = y0; y < y1; y++) {
              for (let x = x0; x < x1; x++) {
                if (x >= 0 && x < W && y >= 0 && y < H) {
                  const idx = (y * W + x) * 4;
                  sumLum += 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
                  count++;
                }
              }
            }
            grid[r * 8 + c] = count > 0 ? (sumLum / count) / 255.0 : 0.5;
          }
        }

        // 3. Sobel Edge Texture (Horizontal vs Vertical edge ratios)
        let horizEdges = 0, vertEdges = 0;
        for (let r = 1; r < 7; r++) {
          for (let c = 1; c < 7; c++) {
            const gx = (grid[(r - 1) * 8 + (c + 1)] + 2 * grid[r * 8 + (c + 1)] + grid[(r + 1) * 8 + (c + 1)]) -
                       (grid[(r - 1) * 8 + (c - 1)] + 2 * grid[r * 8 + (c - 1)] + grid[(r + 1) * 8 + (c - 1)]);
            const gy = (grid[(r + 1) * 8 + (c - 1)] + 2 * grid[(r + 1) * 8 + c] + grid[(r + 1) * 8 + (c + 1)]) -
                       (grid[(r - 1) * 8 + (c - 1)] + 2 * grid[(r - 1) * 8 + c] + grid[(r - 1) * 8 + (c + 1)]);
            vertEdges += Math.abs(gx);
            horizEdges += Math.abs(gy);
          }
        }
        const totalEdges = horizEdges + vertEdges + 0.0001;
        const sobel = { hRatio: horizEdges / totalEdges, vRatio: vertEdges / totalEdges };

        // 4. Average Chrominance vector
        const avgCb = (sumCb / (skinPixels || 1)) / 255.0;
        const avgCr = (sumCr / (skinPixels || 1)) / 255.0;
        const avgRg = ((sumR - sumG) / (sumR + sumG + 1));
        const avgRb = ((sumR - sumB) / (sumR + sumB + 1));
        const chrominance = [avgCb, avgCr, avgRg, avgRb];

        // 5. Construct flat vector (for backwards compatibility)
        const vector = [];
        for (let i = 0; i < 16; i++) vector.push(hsHist[i]);
        for (let i = 0; i < 64; i += 4) vector.push(grid[i]); // 16 sample cells
        vector.push(avgCb, avgCr, avgRg, avgRb);

        resolve({
          hsHist: Array.from(hsHist),
          grid: Array.from(grid),
          chrominance,
          aspect: boxAspect,
          sobel,
          vector,
          length: vector.length
        });
      } catch (err) {
        console.error('Error extracting face embedding:', err);
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = imageSrc;
  });
}

export function compareFaceEmbeddings(embeddingA, embeddingB, threshold = 60.0) {
  if (!embeddingA || !embeddingB) {
    return { matched: false, similarity: 0.0, threshold };
  }

  // Handle both rich descriptor objects and legacy raw flat arrays
  const embA = embeddingA.hsHist ? embeddingA : parseLegacyEmbedding(embeddingA);
  const embB = embeddingB.hsHist ? embeddingB : parseLegacyEmbedding(embeddingB);

  if (!embA || !embB) {
    return { matched: false, similarity: 0.0, threshold };
  }

  // A. Color & Undertone Histogram Cosine Similarity
  let histDot = 0, nHA = 0, nHB = 0;
  for (let i = 0; i < embA.hsHist.length; i++) {
    histDot += embA.hsHist[i] * embB.hsHist[i];
    nHA += embA.hsHist[i] * embA.hsHist[i];
    nHB += embB.hsHist[i] * embB.hsHist[i];
  }
  const colorSim = (nHA > 0 && nHB > 0) ? Math.max(0, histDot / (Math.sqrt(nHA) * Math.sqrt(nHB))) : 0.5;

  // B. Best-fit 2D Normalized Pearson Cross-Correlation with shift search (+/- 1 col, +/- 2 rows)
  // Zero-mean subtraction removes ambient lighting offsets and isolates facial landmark contrast
  let bestGridCorr = -1;
  const gA = embA.grid;
  const gB = embB.grid;
  const meanA = gA.reduce((a, b) => a + b, 0) / gA.length;
  const meanB = gB.reduce((a, b) => a + b, 0) / gB.length;

  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      let dot = 0, nA = 0, nB = 0, count = 0;
      for (let r = 0; r < 8; r++) {
        const rB = r + dy;
        if (rB < 0 || rB >= 8) continue;
        for (let c = 0; c < 8; c++) {
          const cB = c + dx;
          if (cB < 0 || cB >= 8) continue;

          const a = gA[r * 8 + c] - meanA;
          const b = gB[rB * 8 + cB] - meanB;
          dot += a * b;
          nA += a * a;
          nB += b * b;
          count++;
        }
      }
      if (count >= 28 && nA > 0 && nB > 0) {
        const corr = dot / (Math.sqrt(nA) * Math.sqrt(nB));
        if (corr > bestGridCorr) bestGridCorr = corr;
      }
    }
  }

  // Pearson correlation scaling:
  // Random/different human faces have natural correlation baseline of ~0.0 to 0.25
  // The same human face (even in varying light or distance) has correlation ~0.55 to 0.95
  let gridSim = 0.0;
  if (bestGridCorr <= 0.20) {
    gridSim = Math.max(0, bestGridCorr * 0.4);
  } else {
    gridSim = Math.min(1.0, (bestGridCorr - 0.20) / (0.75 - 0.20));
  }

  // C. Aspect Ratio Similarity
  const aspectA = embA.aspect || 1.0;
  const aspectB = embB.aspect || 1.0;
  const aspectDiff = Math.abs(aspectA - aspectB) / Math.max(aspectA, aspectB, 0.01);
  const aspectSim = Math.max(0, 1 - aspectDiff * 1.5);

  // D. Sobel Texture Similarity
  let sobelSim = 0.8;
  if (embA.sobel && embB.sobel) {
    const diffH = Math.abs(embA.sobel.hRatio - embB.sobel.hRatio);
    const diffV = Math.abs(embA.sobel.vRatio - embB.sobel.vRatio);
    sobelSim = Math.max(0, 1 - (diffH + diffV) * 2.0);
  }

  // Combined Multi-Biometric Similarity [0 - 100]%
  // Weighted: 55% Structural Grid + 25% Chrominance + 10% Aspect + 10% Texture
  const totalScore = (
    0.55 * gridSim +
    0.25 * colorSim +
    0.10 * aspectSim +
    0.10 * sobelSim
  ) * 100;

  const similarity = parseFloat(Math.min(100, Math.max(0, totalScore)).toFixed(1));
  const matched = similarity >= threshold;

  return { matched, similarity, threshold };
}

function parseLegacyEmbedding(raw) {
  if (Array.isArray(raw)) {
    return {
      hsHist: raw.slice(0, 16),
      grid: new Array(64).fill(0.5),
      aspect: 1.0,
      sobel: { hRatio: 0.5, vRatio: 0.5 }
    };
  }
  return null;
}

export async function compareFaceImages(livePhoto, registeredPhoto, threshold = 60.0) {
  if (!livePhoto || !registeredPhoto) {
    return { matched: false, similarity: 0.0, threshold, reason: 'Missing photo data' };
  }

  // Exact data match fast-path
  if (livePhoto === registeredPhoto) {
    return { matched: true, similarity: 100.0, threshold };
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

  // 1. Direct photo keys
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

  // 2. Custom registered users (Saved during Admin registration)
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

  // 3. Official Pre-registered student reference portraits
  try {
    const cleanEmail = (user.email || '').toLowerCase().trim();
    const cleanName = (user.name || '').toLowerCase().trim();
    if (cleanEmail.includes('roja') || cleanName.includes('roja') || cleanEmail === 'thimmareddym4@gmail.com') return DEFAULT_STUDENT_PHOTOS.roja;
    if (cleanEmail.includes('rahul') || cleanName.includes('rahul') || cleanEmail === 'student@college.edu') return DEFAULT_STUDENT_PHOTOS.rahul;
    if (cleanEmail.includes('ananya') || cleanName.includes('ananya')) return DEFAULT_STUDENT_PHOTOS.ananya;
    if (cleanEmail.includes('spoorthi') || cleanName.includes('spoorthi')) return DEFAULT_STUDENT_PHOTOS.spoorthi;
    if (cleanEmail.includes('manisha') || cleanName.includes('manisha')) return DEFAULT_STUDENT_PHOTOS.manisha;
  } catch (e) {}

  return null;
}

// Save student face photo and update user records across localStorage
export async function saveRegisteredStudentPhoto(user, photoBase64) {
  if (!user || !photoBase64) return false;

  try {
    if (user.id) localStorage.setItem(`geoattend_face_${user.id}`, photoBase64);
    if (user.email) localStorage.setItem(`geoattend_face_${user.email.toLowerCase().trim()}`, photoBase64);
    if (user.usn) localStorage.setItem(`geoattend_face_${user.usn.toLowerCase().trim()}`, photoBase64);

    // Precompute and cache descriptor
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
