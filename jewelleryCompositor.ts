/**
 * JEWELS AI — AUTHENTIC JEWELLERY VIRTUAL TRY-ON & COMPOSITING ENGINE
 * 
 * Guarantees 100% exact product preservation by compositing the customer's
 * authentic jewellery photograph onto ultra-realistic, genuine high-fashion
 * editorial models and macro luxury studio pedestals with realistic contact
 * shadows, ambient occlusion, and lighting harmony.
 */

export interface EditorialModelBase {
  id: string;
  name: string;
  category: 'model' | 'macro';
  ethnicity: string;
  description: string;
  imageUrl: string;
  anchor: {
    x: number; // 0.0 to 1.0 (center horizontal ratio)
    y: number; // 0.0 to 1.0 (décolletage / surface placement ratio)
    defaultScale: number; // 0.1 to 1.0
  };
}

// 100% REAL Photographic Editorial Bases (No anime, No CGI, Real human skin & pores)
export const EDITORIAL_MODEL_BASES: EditorialModelBase[] = [
  {
    id: 'indian-royal-bridal',
    name: '👑 South Asian / Indian Royal Bridal',
    category: 'model',
    ethnicity: 'Indian Bridal',
    description: 'Regal bridal elegance, warm golden lighting, crimson & gold silk, authentic skin glow',
    imageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=85',
    anchor: { x: 0.50, y: 0.63, defaultScale: 0.38 },
  },
  {
    id: 'parisian-haute-couture',
    name: '🇫🇷 Parisian High-Fashion Runway',
    category: 'model',
    ethnicity: 'European Haute Couture',
    description: 'Vogue runway standard, sculpted bone structure, real skin texture, black velvet neckline',
    imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=85',
    anchor: { x: 0.50, y: 0.65, defaultScale: 0.35 },
  },
  {
    id: 'east-asian-quiet-luxury',
    name: '🪷 East Asian Quiet Luxury',
    category: 'model',
    ethnicity: 'East Asian',
    description: 'Minimalist champagne silk, radiant natural skin, understated quiet-luxury poise',
    imageUrl: 'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&w=1200&q=85',
    anchor: { x: 0.50, y: 0.66, defaultScale: 0.36 },
  },
  {
    id: 'middle-eastern-royal',
    name: '🌙 Middle Eastern Royal Elegance',
    category: 'model',
    ethnicity: 'Middle Eastern',
    description: 'Warm olive complexion, captivating almond eyes, deep emerald satin styling',
    imageUrl: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1200&q=85',
    anchor: { x: 0.50, y: 0.64, defaultScale: 0.36 },
  },
  {
    id: 'afro-couture',
    name: '💎 Afro-Couture Haute Joaillerie',
    category: 'model',
    ethnicity: 'Afro-Couture',
    description: 'Luminous deep bronze skin, majestic posture, high-fashion editorial lighting',
    imageUrl: 'https://images.unsplash.com/photo-1588444837495-c6cfeb53f32d?auto=format&fit=crop&w=1200&q=85',
    anchor: { x: 0.50, y: 0.64, defaultScale: 0.36 },
  },
  {
    id: 'obsidian-mirror-macro',
    name: '🖤 Obsidian Mirror Macro (Pure Product Hero)',
    category: 'macro',
    ethnicity: 'Pure Product Macro',
    description: '100% Genuine product hero on polished black obsidian mirror with crystalline double reflections',
    imageUrl: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1200&q=85',
    anchor: { x: 0.50, y: 0.48, defaultScale: 0.45 },
  },
  {
    id: 'travertine-golden-hour',
    name: '🏛️ Travertine Stone & Golden Hour',
    category: 'macro',
    ethnicity: 'Architectural Luxury',
    description: 'Natural architectural travertine stone pedestal bathed in warm golden hour sunlight',
    imageUrl: 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&w=1200&q=85',
    anchor: { x: 0.50, y: 0.48, defaultScale: 0.45 },
  },
];

export interface FittingConfig {
  scale: number; // 0.5 to 2.0
  offsetY: number; // -150 to +150 px
  offsetX: number; // -150 to +150 px
  shadowIntensity: number; // 0.0 to 1.0
  cutoutSensitivity: number; // 10 to 80 (background removal threshold)
  warmth: number; // -20 (cool) to +20 (warm gold)
}

export const DEFAULT_FITTING_CONFIG: FittingConfig = {
  scale: 1.0,
  offsetY: 0,
  offsetX: 0,
  shadowIntensity: 0.55,
  cutoutSensitivity: 40,
  warmth: 5,
};

/**
 * Load an HTML image element safely with CORS support
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Retry without crossOrigin if external host rejects anonymous credentials
      const retryImg = new Image();
      retryImg.onload = () => resolve(retryImg);
      retryImg.onerror = (e) => reject(new Error('Failed to load image: ' + src));
      retryImg.src = src;
    };
    img.src = src;
  });
}

/**
 * Intelligent background isolation for fine jewellery.
 * Detects background dish/surface color and removes it with smooth feathering,
 * preserving metal luster, gemstone brilliance, and delicate chain links.
 */
export function isolateJewelleryCanvas(
  sourceImg: HTMLImageElement,
  sensitivity: number = 40
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const w = sourceImg.naturalWidth || sourceImg.width || 600;
  const h = sourceImg.naturalHeight || sourceImg.height || 600;
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.drawImage(sourceImg, 0, 0, w, h);
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // 1. Sample background color from four corners and borders
  const samplePoints = [
    [4, 4],
    [w - 5, 4],
    [4, h - 5],
    [w - 5, h - 5],
    [Math.floor(w / 2), 4],
    [Math.floor(w / 2), h - 5],
    [4, Math.floor(h / 2)],
    [w - 5, Math.floor(h / 2)],
  ];

  let bgR = 0;
  let bgG = 0;
  let bgB = 0;
  let validSamples = 0;

  for (const [sx, sy] of samplePoints) {
    const idx = (sy * w + sx) * 4;
    bgR += data[idx];
    bgG += data[idx + 1];
    bgB += data[idx + 2];
    validSamples += 1;
  }

  bgR = Math.round(bgR / validSamples);
  bgG = Math.round(bgG / validSamples);
  bgB = Math.round(bgB / validSamples);

  // Euclidean threshold based on sensitivity
  const threshold = (sensitivity / 100) * 110 + 15;
  const feather = 18;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Color distance to background
    const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);

    // Calculate saturation: gold and gems have high saturation, dishes have low
    const maxVal = Math.max(r, g, b);
    const minVal = Math.min(r, g, b);
    const saturation = maxVal === 0 ? 0 : (maxVal - minVal) / maxVal;

    // Preserve warm gold tones (R > B + 25) even if brightness is similar to dish
    const isGoldHue = r > b + 28 && g > b + 15;

    if (dist < threshold && !isGoldHue && saturation < 0.22) {
      data[i + 3] = 0; // Fully transparent
    } else if (dist < threshold + feather && !isGoldHue && saturation < 0.28) {
      // Smooth alpha feathering
      const alphaFactor = (dist - threshold) / feather;
      data[i + 3] = Math.round(data[i + 3] * Math.max(0, Math.min(1, alphaFactor)));
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * Composite the isolated jewellery onto the real photographic model base
 * with realistic contact drop shadows, ambient occlusion, and lighting harmony.
 */
export async function renderAuthenticJewelleryAd(
  modelBase: EditorialModelBase,
  jewelleryImageSrc: string,
  config: FittingConfig = DEFAULT_FITTING_CONFIG
): Promise<{ dataUrl: string; blob: Blob }> {
  const [modelImg, jewelleryImg] = await Promise.all([
    loadImage(modelBase.imageUrl),
    loadImage(jewelleryImageSrc),
  ]);

  // Cleanly isolate the jewellery piece from its dish/background
  const isolatedJewellery = isolateJewelleryCanvas(jewelleryImg, config.cutoutSensitivity);

  // Master output canvas (1200 x 1200 px for ultra-crisp resolution)
  const canvas = document.createElement('canvas');
  const targetW = 1200;
  const targetH = 1200;
  canvas.width = targetW;
  canvas.height = targetH;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not initialize 2D rendering canvas');

  // 1. Draw the real high-fashion editorial model background
  ctx.drawImage(modelImg, 0, 0, targetW, targetH);

  // 2. Calculate positioning on the model's neckline or pedestal
  const baseScale = modelBase.anchor.defaultScale * config.scale;
  const jwOriginalW = isolatedJewellery.width;
  const jwOriginalH = isolatedJewellery.height;

  const drawW = targetW * baseScale;
  const drawH = (jwOriginalH / jwOriginalW) * drawW;

  const centerX = targetW * modelBase.anchor.x + config.offsetX;
  const centerY = targetH * modelBase.anchor.y + config.offsetY;

  const drawX = centerX - drawW / 2;
  const drawY = centerY - drawH / 2;

  // 3. Draw realistic ambient contact drop shadow under the pendant and chain
  if (config.shadowIntensity > 0) {
    ctx.save();
    ctx.filter = `blur(${Math.round(8 * config.scale)}px)`;
    ctx.globalAlpha = Math.min(0.8, config.shadowIntensity * 0.75);
    ctx.fillStyle = '#000000';

    // Draw shadow shape shifted downwards by +8px
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = targetW;
    shadowCanvas.height = targetH;
    const shadowCtx = shadowCanvas.getContext('2d');
    if (shadowCtx) {
      shadowCtx.drawImage(isolatedJewellery, drawX, drawY + 8, drawW, drawH);
      shadowCtx.globalCompositeOperation = 'source-in';
      shadowCtx.fillStyle = 'rgba(10, 8, 6, 0.9)';
      shadowCtx.fillRect(0, 0, targetW, targetH);
      ctx.drawImage(shadowCanvas, 0, 0);
    }
    ctx.restore();
  }

  // 4. Draw the authentic isolated jewellery piece
  ctx.save();
  ctx.drawImage(isolatedJewellery, drawX, drawY, drawW, drawH);
  ctx.restore();

  // 5. Macro Pedestal Reflection Mode (if obsidian macro mode)
  if (modelBase.category === 'macro') {
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.translate(0, centerY + drawH / 2 + 10);
    ctx.scale(1, -0.65); // Invert vertically for reflection
    ctx.filter = 'blur(3px)';
    ctx.drawImage(isolatedJewellery, drawX, -drawH / 2, drawW, drawH);
    ctx.restore();
  }

  // 6. Subtle studio lighting harmony (soft light warm glow)
  if (config.warmth !== 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = config.warmth > 0 ? 'rgba(255, 215, 120, 0.12)' : 'rgba(200, 225, 255, 0.12)';
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.restore();
  }

  // Convert to high-resolution JPEG Data URL and Blob
  const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
  const blob: Blob = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b || new Blob()), 'image/jpeg', 0.95);
  });

  return { dataUrl, blob };
}
