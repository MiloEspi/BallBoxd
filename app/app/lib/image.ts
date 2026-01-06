// Client-side image helpers for square cropping and resizing.
export const processSquareImage = (
  file: File,
  minSize: number = 800,
): Promise<string> => {
  if (!file.type.startsWith('image/')) {
    return Promise.reject(new Error('El archivo no es una imagen.'));
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    const cleanup = () => {
      URL.revokeObjectURL(url);
    };

    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      if (width < minSize || height < minSize) {
        cleanup();
        reject(new Error(`Minimo ${minSize}x${minSize}px.`));
        return;
      }

      const cropSize = Math.min(width, height);
      const sx = Math.floor((width - cropSize) / 2);
      const sy = Math.floor((height - cropSize) / 2);

      const canvas = document.createElement('canvas');
      canvas.width = minSize;
      canvas.height = minSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        cleanup();
        reject(new Error('No pudimos procesar la imagen.'));
        return;
      }

      ctx.drawImage(img, sx, sy, cropSize, cropSize, 0, 0, minSize, minSize);
      cleanup();
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };

    img.onerror = () => {
      cleanup();
      reject(new Error('No pudimos leer la imagen.'));
    };

    img.src = url;
  });
};
