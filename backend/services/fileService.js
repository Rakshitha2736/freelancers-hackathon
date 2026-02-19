// backend/services/fileService.js
const fs = require('fs');
const path = require('path');

/**
 * File service for handling uploads and file processing
 */

class FileService {
  constructor() {
    this.uploadDir = path.join(__dirname, '../uploads');
    this.ensureUploadDir();
  }

  /**
   * Ensure upload directory exists
   */
  ensureUploadDir() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Save uploaded file
   */
  saveFile(file) {
    if (!file) return null;

    const timestamp = Date.now();
    const filename = `${timestamp}-${file.originalname}`;
    const filepath = path.join(this.uploadDir, filename);

    fs.writeFileSync(filepath, file.buffer);

    return {
      filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      savedAt: new Date(),
    };
  }

  /**
   * Extract text from file based on MIME type
   */
  async extractTextFromFile(filepath) {
    const ext = path.extname(filepath).toLowerCase();

    if (ext === '.txt') {
      return this.extractFromTxt(filepath);
    } else if (ext === '.pdf') {
      return this.extractFromPdf(filepath);
    } else {
      throw new Error(`Unsupported file type: ${ext}`);
    }
  }

  /**
   * Extract text from .txt file
   */
  extractFromTxt(filepath) {
    const content = fs.readFileSync(filepath, 'utf-8');
    return content;
  }

  /**
   * Extract text from .pdf file (requires pdf-parse package)
   */
  async extractFromPdf(filepath) {
    try {
      const pdf = require('pdf-parse');
      const dataBuffer = fs.readFileSync(filepath);
      const data = await pdf(dataBuffer);
      return data.text;
    } catch (error) {
      throw new Error(`Failed to extract PDF: ${error.message}`);
    }
  }

  /**
   * Delete uploaded file
   */
  deleteFile(filename) {
    const filepath = path.join(this.uploadDir, filename);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  }

  /**
   * Get file info
   */
  getFileInfo(filename) {
    const filepath = path.join(this.uploadDir, filename);
    if (!fs.existsSync(filepath)) {
      return null;
    }
    const stats = fs.statSync(filepath);
    return {
      filename,
      size: stats.size,
      createdAt: stats.birthtime,
    };
  }

  /**
   * Validate file upload
   */
  validateFile(file, maxSizeMB = 10) {
    if (!file) {
      throw new Error('No file provided');
    }

    const allowedTypes = ['text/plain', 'application/pdf'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error(`File type not supported. Allowed: ${allowedTypes.join(', ')}`);
    }

    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      throw new Error(`File size exceeds ${maxSizeMB}MB limit`);
    }

    return true;
  }
}

module.exports = new FileService();
