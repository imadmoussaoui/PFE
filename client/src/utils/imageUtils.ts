// Utility functions for image processing
export const resizeImage = (
    file: File,
    maxWidth: number = 200,
    maxHeight: number = 200,
    quality: number = 0.8
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            // Calculate new dimensions while maintaining aspect ratio
            let { width, height } = img;

            if (width > height) {
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = (width * maxHeight) / height;
                    height = maxHeight;
                }
            }

            // Set canvas dimensions
            canvas.width = width;
            canvas.height = height;

            // Draw and resize the image
            ctx?.drawImage(img, 0, 0, width, height);

            // Convert to base64 with specified quality
            const resizedDataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve(resizedDataUrl);
        };

        img.onerror = () => {
            reject(new Error('Failed to load image'));
        };

        // Create object URL for the image
        img.src = URL.createObjectURL(file);
    });
};

export const validateImageFile = (file: File): boolean => {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    return validTypes.includes(file.type) && file.size <= maxSize;
};

export const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            resolve({ width: img.width, height: img.height });
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });
};