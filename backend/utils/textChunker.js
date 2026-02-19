/**
 * Text Chunking Utility for Large Meeting Transcripts
 * 
 * This module handles splitting large meeting transcripts into manageable chunks
 * to avoid API token limits and improve processing accuracy.
 */

/**
 * Split text into chunks based on character count and natural boundaries
 * 
 * @param {string} text - The full meeting transcript
 * @param {number} maxChunkSize - Maximum characters per chunk (default: 15000)
 * @returns {Array<{chunk: string, index: number, startChar: number, endChar: number}>}
 */
function chunkText(text, maxChunkSize = 15000) {
  const chunks = [];
  
  if (text.length <= maxChunkSize) {
    // Text is small enough, return as single chunk
    return [{
      chunk: text,
      index: 0,
      startChar: 0,
      endChar: text.length,
      totalChunks: 1
    }];
  }

  // Split by paragraphs (double newlines) or single newlines
  const paragraphs = text.split(/\n\n+/);
  
  let currentChunk = '';
  let chunkIndex = 0;
  let startChar = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];
    const potentialChunk = currentChunk + (currentChunk ? '\n\n' : '') + paragraph;

    if (potentialChunk.length > maxChunkSize && currentChunk.length > 0) {
      // Current chunk is full, save it
      chunks.push({
        chunk: currentChunk.trim(),
        index: chunkIndex,
        startChar: startChar,
        endChar: startChar + currentChunk.length,
        totalChunks: 0 // Will be set after all chunks are created
      });
      
      chunkIndex++;
      startChar += currentChunk.length;
      currentChunk = paragraph;
    } else {
      currentChunk = potentialChunk;
    }
  }

  // Add the last chunk
  if (currentChunk.trim()) {
    chunks.push({
      chunk: currentChunk.trim(),
      index: chunkIndex,
      startChar: startChar,
      endChar: startChar + currentChunk.length,
      totalChunks: 0
    });
  }

  // Set total chunks count for all chunks
  const totalChunks = chunks.length;
  chunks.forEach(chunk => {
    chunk.totalChunks = totalChunks;
  });

  return chunks;
}

/**
 * Merge analysis results from multiple chunks
 * 
 * @param {Array<Object>} chunkResults - Array of analysis results from each chunk
 * @returns {Object} - Merged analysis with combined summary, decisions, and tasks
 */
function mergeChunkResults(chunkResults) {
  if (chunkResults.length === 0) {
    return {
      summary: '',
      decisions: [],
      tasks: []
    };
  }

  if (chunkResults.length === 1) {
    return chunkResults[0];
  }

  // Merge summaries with chunk indicators
  const summaries = chunkResults
    .map((result, index) => `[Part ${index + 1}/${chunkResults.length}] ${result.summary}`)
    .join('\n\n');

  // Combine all decisions (remove duplicates)
  const allDecisions = chunkResults.flatMap(result => result.decisions || []);
  const uniqueDecisions = [...new Set(allDecisions)];

  // Combine all tasks (with chunk reference)
  const allTasks = chunkResults.flatMap((result, chunkIndex) => 
    (result.tasks || []).map(task => ({
      ...task,
      fromChunk: chunkIndex + 1,
      description: task.description // Keep original description
    }))
  );

  // Remove duplicate tasks based on description similarity
  const uniqueTasks = [];
  const seenDescriptions = new Set();

  for (const task of allTasks) {
    const normalizedDesc = task.description.toLowerCase().trim();
    if (!seenDescriptions.has(normalizedDesc)) {
      uniqueTasks.push(task);
      seenDescriptions.add(normalizedDesc);
    }
  }

  return {
    summary: summaries,
    decisions: uniqueDecisions,
    tasks: uniqueTasks,
    chunked: true,
    totalChunks: chunkResults.length
  };
}

/**
 * Estimate processing time based on text length
 * 
 * @param {string} text - The text to be processed
 * @returns {number} - Estimated time in seconds
 */
function estimateProcessingTime(text) {
  const words = text.split(/\s+/).length;
  const baseTimePerWord = 0.01; // 10ms per word
  const chunks = Math.ceil(text.length / 15000);
  const overhead = chunks * 2; // 2 seconds overhead per chunk
  
  return Math.ceil(words * baseTimePerWord + overhead);
}

module.exports = {
  chunkText,
  mergeChunkResults,
  estimateProcessingTime
};
