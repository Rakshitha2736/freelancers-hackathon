// backend/routes/integrations.js
const express = require('express');
const authenticate = require('../middleware/auth');
const notionService = require('../services/notionService');
const Analysis = require('../models/Analysis');
const User = require('../models/User');

const router = express.Router();

/**
 * Validate Notion API token
 * POST /api/integrations/notion/validate
 */
router.post('/notion/validate', authenticate, async (req, res) => {
  try {
    const token = req.body.notionToken || req.body.token;

    if (!token) {
      return res.status(400).json({ error: 'Notion API token is required' });
    }

    const isValid = await notionService.validateToken(token);

    if (isValid) {
      // Save encrypted token to user settings (in real app, use encryption)
      // For now, we'll just validate
      res.json({
        success: true,
        message: 'Notion API token is valid',
      });
    } else {
      res.status(401).json({ error: 'Invalid Notion API token' });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get Notion databases
 * GET /api/integrations/notion/databases
 */
router.get('/notion/databases', authenticate, async (req, res) => {
  try {
    const token = req.query.token || req.query.notionToken || req.headers['x-notion-token'];

    if (!token) {
      return res.status(400).json({ error: 'Notion API token is required' });
    }

    notionService.setAuthToken(token);
    const databases = await notionService.getDatabases();

    res.json({
      success: true,
      databases: databases.map(db => ({
        id: db.id,
        title: db.title?.[0]?.plain_text || 'Untitled',
        icon: db.icon,
      })),
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Export analysis to Notion
 * POST /api/integrations/notion/export
 */
router.post('/notion/export', authenticate, async (req, res) => {
  try {
    const { analysisId, databaseId, notionToken } = req.body;

    if (!analysisId || !databaseId || !notionToken) {
      return res.status(400).json({
        error: 'analysisId, databaseId, and notionToken are required',
      });
    }

    // Get analysis
    const analysis = await Analysis.findById(analysisId);
    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    // Check ownership
    if (analysis.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Set Notion token
    notionService.setAuthToken(notionToken);

    // Export to Notion
    const result = await notionService.exportAnalysisToNotion(analysis, databaseId);

    // Update analysis with export status
    analysis.integrations.notion = {
      exported: true,
      pageId: result.pageId,
      exportedAt: result.exportedAt,
      exportStatus: 'success',
    };

    await analysis.save();

    res.json({
      success: true,
      message: 'Analysis exported to Notion successfully',
      pageId: result.pageId,
      url: result.url,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get Notion export status
 * GET /api/integrations/notion/status/:analysisId
 */
router.get('/notion/status/:analysisId', authenticate, async (req, res) => {
  try {
    const analysis = await Analysis.findById(req.params.analysisId);

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    if (analysis.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json({
      notionStatus: analysis.integrations.notion,
      trelloStatus: analysis.integrations.trello,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Revoke Notion integration
 * DELETE /api/integrations/notion
 */
router.delete('/notion', authenticate, async (req, res) => {
  try {
    // In a real app, you would revoke OAuth token and clear from database
    res.json({
      success: true,
      message: 'Notion integration revoked',
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Export to Trello (placeholder for future implementation)
 * POST /api/integrations/trello/export
 */
router.post('/trello/export', authenticate, async (req, res) => {
  try {
    const { analysisId, boardId, trelloToken } = req.body;

    if (!analysisId || !boardId || !trelloToken) {
      return res.status(400).json({
        error: 'analysisId, boardId, and trelloToken are required',
      });
    }

    const analysis = await Analysis.findById(analysisId);
    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    if (analysis.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // TODO: Implement Trello API integration
    // For now, return placeholder response
    res.json({
      success: true,
      message: 'Trello export coming soon',
      status: 'pending',
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
