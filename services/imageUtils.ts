
/**
 * Fetches an image from a URL and converts it to a base64 string using a canvas.
 * This method is more reliable than a CORS proxy for handling cross-origin images.
 * @param url The URL of the image to fetch.
 * @returns A promise that resolves to an object containing the base64 data and its MIME type.
 */
export const imageUrlToBase64 = (url: string): Promise<{ data: string; mimeType: string; }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Setting crossOrigin to 'Anonymous' is crucial for loading cross-domain images
    // into a canvas without "tainting" it, which would otherwise block data extraction.
    img.crossOrigin = 'Anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Could not get 2D context from canvas.'));
      }
      
      ctx.drawImage(img, 0, 0);
      
      try {
        // toDataURL() will throw a security error if the canvas is tainted.
        const dataUrl = canvas.toDataURL(); // Defaults to 'image/png'
        const mimeType = dataUrl.substring(dataUrl.indexOf(':') + 1, dataUrl.indexOf(';'));
        const data = dataUrl.substring(dataUrl.indexOf(',') + 1);
        resolve({ data, mimeType });
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error("Canvas toDataURL error:", e);
        reject(new Error(`Could not convert canvas to data URL due to a security restriction (tainted canvas). ${errorMessage}`));
      }
    };

    img.onerror = () => {
      // This error often fires for CORS issues when crossOrigin is set.
      reject(new Error(`Failed to load image from URL: ${url}. This is likely a CORS issue. Check the browser's console for more details.`));
    };

    // The request to fetch the image is sent when setting the 'src' attribute.
    img.src = url;
  });
};
