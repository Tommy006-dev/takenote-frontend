const readAsDataURL = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = (event) => resolve(event.target.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

export const imageFileToOptimizedDataUrl = async (file, maxSide = 1400, quality = 0.86) => {
  if (!file || !file.type?.startsWith('image/')) return '';

  const originalDataUrl = await readAsDataURL(file);
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const largestSide = Math.max(image.width, image.height);
      if (!largestSide || largestSide <= maxSide) {
        resolve(originalDataUrl);
        return;
      }

      const scale = maxSide / largestSide;
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    image.onerror = () => resolve(originalDataUrl);
    image.src = originalDataUrl;
  });
};

export const filesToOptimizedDataUrls = async (fileList) => {
  const files = Array.from(fileList || []).filter(file => file.type?.startsWith('image/'));
  return Promise.all(files.map(file => imageFileToOptimizedDataUrl(file)));
};
