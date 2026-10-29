export const paperSizes = { A4: [595.28, 841.89], Letter: [612, 792], A5: [419.53, 595.28] };
export function pageLayout(iw, ih, settings = {}) {
  let [width, height] = paperSizes[settings.paper] || paperSizes.A4;
  if (settings.orientation === 'landscape' || (settings.orientation === 'auto' && iw > ih)) [width, height] = [height, width];
  const margin = Math.min(30, Math.max(0, Number(settings.margin) || 0)) * 72 / 25.4;
  const scale = Math.min((width - margin * 2) / iw, (height - margin * 2) / ih);
  const imageWidth = iw * scale, imageHeight = ih * scale;
  return { width, height, x: (width - imageWidth) / 2, y: (height - imageHeight) / 2, imageWidth, imageHeight, margin };
}
export function resizeDimensions(w, h, s) {
  let ratio = s.resizeMode === 'box' ? Math.min(s.width / w, s.height / h) : s.edge / Math.max(w, h);
  if (!s.upscale) ratio = Math.min(1, ratio);
  return { width: Math.max(1, Math.round(w * ratio)), height: Math.max(1, Math.round(h * ratio)) };
}
