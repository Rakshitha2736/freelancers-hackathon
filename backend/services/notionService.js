// backend/services/notionService.js
const axios = require('axios');

/**
 * Notion API Service for exporting analyses to Notion databases
 */

class NotionService {
  constructor() {
    this.baseUrl = 'https://api.notion.com/v1';
    this.version = '2022-06-28';
  }

  /**
   * Set Notion API token (from user settings)
   */
  setAuthToken(token) {
    this.authToken = token;
  }

  /**
   * Get Notion API headers
   */
  getHeaders() {
    return {
      'Authorization': `Bearer ${this.authToken}`,
      'Notion-Version': this.version,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Validate API token
   */
  async validateToken(token) {
    try {
      const response = await axios.get(`${this.baseUrl}/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Notion-Version': this.version,
        },
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get user's Notion databases
   */
  async getDatabases() {
    try {
      const response = await axios.get(`${this.baseUrl}/search`, {
        headers: this.getHeaders(),
        data: {
          filter: { property: 'object', value: 'database' },
          sort: { timestamp: 'last_edited_time', direction: 'descending' },
        },
      });
      return response.data.results;
    } catch (error) {
      throw new Error(`Failed to fetch Notion databases: ${error.message}`);
    }
  }

  /**
   * Export analysis to Notion as a page with tasks as checklist
   */
  async exportAnalysisToNotion(analysisData, databaseId) {
    try {
      // Format tasks as checklist
      const taskContent = analysisData.tasks
        .map((task, idx) => ({
          object: 'block',
          type: 'to_do',
          to_do: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: `${task.description} (${task.priority}) - Owner: ${task.owner || 'Unassigned'}`,
                  link: null,
                },
              },
            ],
            checked: task.status === 'Completed',
          },
        }))
        .slice(0, 100); // Limit to 100 blocks

      // Create page in database
      const pageData = {
        parent: { database_id: databaseId },
        properties: {
          title: {
            title: [
              {
                text: {
                  content: analysisData.meetingMetadata?.title || 'New Meeting Analysis',
                },
              },
            ],
          },
          'Meeting Date': {
            date: {
              start: analysisData.meetingMetadata?.date || new Date().toISOString(),
            },
          },
          'Meeting Type': {
            select: {
              name: analysisData.meetingMetadata?.meetingType || 'Other',
            },
          },
          'Participants': {
            multi_select: (analysisData.meetingMetadata?.participants || []).map(p => ({ name: p })),
          },
        },
        children: [
          {
            object: 'block',
            type: 'heading_2',
            heading_2: {
              rich_text: [{ type: 'text', text: { content: 'Summary' } }],
            },
          },
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ type: 'text', text: { content: analysisData.summary || 'No summary available' } }],
            },
          },
          {
            object: 'block',
            type: 'heading_2',
            heading_2: {
              rich_text: [{ type: 'text', text: { content: 'Action Items' } }],
            },
          },
          ...taskContent,
        ],
      };

      const response = await axios.post(`${this.baseUrl}/pages`, pageData, {
        headers: this.getHeaders(),
      });

      return {
        success: true,
        pageId: response.data.id,
        url: response.data.url,
        exportedAt: new Date(),
      };
    } catch (error) {
      throw new Error(`Failed to export to Notion: ${error.message}`);
    }
  }

  /**
   * Create analysis database template in Notion
   */
  async createAnalysisDatabase(workspaceId) {
    try {
      const dbData = {
        parent: { workspace: true },
        title: [{ text: { content: 'Meeting Analyses' } }],
        properties: {
          'Title': { title: {} },
          'Meeting Date': { date: {} },
          'Meeting Type': { select: { options: ['Standup', 'Planning', 'Review', 'Retrospective', '1:1', 'Other'].map(t => ({ name: t })) } },
          'Participants': { multi_select: {} },
          'Summary': { rich_text: {} },
          'Status': { select: { options: ['Draft', 'Reviewed', 'Archived'].map(s => ({ name: s })) } },
        },
      };

      const response = await axios.post(`${this.baseUrl}/databases`, dbData, {
        headers: this.getHeaders(),
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to create Notion database: ${error.message}`);
    }
  }

  /**
   * Update page in Notion
   */
  async updatePage(pageId, properties) {
    try {
      const response = await axios.patch(`${this.baseUrl}/pages/${pageId}`, { properties }, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to update Notion page: ${error.message}`);
    }
  }

  /**
   * Delete page from Notion (archive it)
   */
  async archivePage(pageId) {
    try {
      const response = await axios.patch(`${this.baseUrl}/pages/${pageId}`, { archived: true }, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to archive Notion page: ${error.message}`);
    }
  }
}

module.exports = new NotionService();
