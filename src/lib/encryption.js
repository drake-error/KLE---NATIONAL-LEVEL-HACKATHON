import CryptoJS from 'crypto-js';

/**
 * Encrypts a File object using AES-256 and a provided password.
 * @param {File} file - The file to encrypt.
 * @param {string} password - The encryption password.
 * @returns {Promise<Blob>} - A promise resolving to a Blob containing the encrypted data.
 */
export const encryptFile = (file, password) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const fileDataUrl = e.target.result;
        const encrypted = CryptoJS.AES.encrypt(fileDataUrl, password).toString();
        // Create a blob from the encrypted string
        const blob = new Blob([encrypted], { type: 'text/plain' });
        resolve(blob);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file); // Convert to base64 string
  });
};

/**
 * Decrypts a Blob/File containing AES-256 encrypted data.
 * @param {Blob} encryptedBlob - The encrypted file data.
 * @param {string} password - The decryption password.
 * @returns {Promise<string>} - A promise resolving to the decrypted Data URL (Base64 string) ready for download/viewing.
 */
export const decryptFile = (encryptedBlob, password) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const encryptedText = e.target.result;
        const decrypted = CryptoJS.AES.decrypt(encryptedText, password);
        const originalDataUrl = decrypted.toString(CryptoJS.enc.Utf8);
        
        if (!originalDataUrl) {
          throw new Error('Invalid password or corrupted file');
        }
        
        resolve(originalDataUrl);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsText(encryptedBlob);
  });
};
