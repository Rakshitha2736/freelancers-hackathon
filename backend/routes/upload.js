// backend/routes/upload.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authenticate = require('../middleware/auth');
const fileService = require('../services/fileService');
const Analysis = require('../models/Analysis');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['text/plain', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only .txt and .pdf are allowed.'));
    }
  },
});

/**
 * Upload meeting transcript file
 * POST /api/upload
 */
router.post('/', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate file
    fileService.validateFile(req.file);

    // Save file info
    const fileInfo = fileService.saveFile(req.file);

    // Extract text based on file type
    let extractedText = '';
    const uploadDir = path.join(__dirname, '../uploads');
    const filepath = path.join(uploadDir, fileInfo.filename);

    if (req.file.mimetype === 'text/plain') {
      extractedText = fileService.extractFromTxt(filepath);
    } else if (req.file.mimetype === 'application/pdf') {
      extractedText = await fileService.extractFromPdf(filepath);
    }

    // Create analysis record
    const analysis = new Analysis({
      userId: req.user._id,
      rawText: extractedText,
      file: {
        storedName: fileInfo.filename,
        originalName: fileInfo.originalName,
        mimeType: fileInfo.mimeType,
        size: fileInfo.size,
        uploadedAt: fileInfo.savedAt,
      },
      meetingMetadata: {
        title: req.body.title || '',
        date: req.body.date ? new Date(req.body.date) : new Date(),
        participants: req.body.participants ? JSON.parse(req.body.participants) : [],
        meetingType: req.body.meetingType || 'Other',
        location: req.body.location || '',
        duration: req.body.duration ? parseInt(req.body.duration) : 0,
      },
      metadata: {
        textLength: extractedText.length,
        wordCount: extractedText.split(/\s+/).length,
        processedAt: new Date(),
      },
    });

    await analysis.save();

    res.status(201).json({
      success: true,
      analysisId: analysis._id,
      message: 'File uploaded successfully',
      fileName: fileInfo.originalName,
      textLength: extractedText.length,
      wordCount: analysis.metadata.wordCount,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get upload progress (for large files)
 * GET /api/upload/progress/:analysisId
 */
router.get('/progress/:analysisId', authenticate, async (req, res) => {
  try {
    const analysis = await Analysis.findById(req.params.analysisId);
    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    if (analysis.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json({
      progress: analysis.metadata.processedAt ? 100 : 0,
      textLength: analysis.metadata.textLength,
      wordCount: analysis.metadata.wordCount,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Delete uploaded file
 * DELETE /api/upload/:analysisId
 */
router.delete('/:analysisId', authenticate, async (req, res) => {
  try {
    const analysis = await Analysis.findById(req.params.analysisId);
    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    if (analysis.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (analysis.file && (analysis.file.storedName || analysis.file.originalName)) {
      const uploadDir = path.join(__dirname, '../uploads');
      const filename = analysis.file.storedName || analysis.file.originalName;
      const filepath = path.join(uploadDir, filename);
      fileService.deleteFile(filepath);
    }

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
