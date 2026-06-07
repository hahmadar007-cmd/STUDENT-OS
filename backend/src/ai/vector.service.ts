import { Injectable } from '@nestjs/common';
import { ChromaClient } from 'chromadb';

interface TextChunk {
  text: string;
  pageNum: number;
  documentId: string;
  courseId: string;
}

interface InMemoryEntry extends TextChunk {
  embedding: number[];
}

@Injectable()
export class VectorService {
  private chromaClient: ChromaClient | null = null;
  private chromaConnected = false;
  
  // Local in-memory fallback store
  private inMemoryStore: InMemoryEntry[] = [];

  constructor() {
    this.initChroma();
  }

  private async initChroma() {
    try {
      const chromaUrl = process.env.CHROMA_URL || 'http://localhost:8000';
      this.chromaClient = new ChromaClient({ path: chromaUrl });
      // Heartbeat check to verify connection
      await this.chromaClient.heartbeat();
      this.chromaConnected = true;
      console.log(`Successfully connected to ChromaDB at ${chromaUrl}`);
    } catch (err) {
      console.warn('ChromaDB offline. Falling back to NestJS in-memory vector store.');
      this.chromaClient = null;
      this.chromaConnected = false;
    }
  }

  // Helper: Call Gemini embedding API
  async getEmbedding(text: string, apiKey: string): Promise<number[]> {
    if (!apiKey) return [];
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'models/text-embedding-004',
            content: { parts: [{ text }] },
          }),
        },
      );
      if (response.ok) {
        const data = await response.json();
        return data.embedding?.values || [];
      } else {
        const err = await response.json().catch(() => ({}));
        console.error('Embedding API Error:', err);
      }
    } catch (err) {
      console.error('Failed to fetch embedding:', err);
    }
    return [];
  }

  // Index text chunks
  async indexChunks(
    courseId: string,
    documentId: string,
    chunks: { text: string; pageNum: number }[],
    apiKey: string,
  ) {
    console.log(`Indexing ${chunks.length} chunks for document: ${documentId} in course: ${courseId}`);
    
    // Re-verify Chroma connection status
    if (!this.chromaConnected) {
      await this.initChroma();
    }

    const entriesToSave: InMemoryEntry[] = [];

    for (const chunk of chunks) {
      const embedding = await this.getEmbedding(chunk.text, apiKey);
      if (embedding && embedding.length > 0) {
        entriesToSave.push({
          courseId,
          documentId,
          text: chunk.text,
          pageNum: chunk.pageNum,
          embedding,
        });
      }
    }

    if (this.chromaConnected && this.chromaClient) {
      try {
        const collectionName = `course-${courseId.replace(/[^a-zA-Z0-9-_]/g, '-')}`;
        const collection = await this.chromaClient.getOrCreateCollection({
          name: collectionName,
        });

        const ids = entriesToSave.map((_, idx) => `${documentId}-chunk-${idx}-${Date.now()}`);
        const documents = entriesToSave.map(e => e.text);
        const embeddings = entriesToSave.map(e => e.embedding);
        const metadatas = entriesToSave.map(e => ({
          documentId: e.documentId,
          pageNum: e.pageNum,
          courseId: e.courseId,
        }));

        await collection.add({
          ids,
          embeddings,
          metadatas,
          documents,
        });
        console.log(`Successfully indexed chunks in ChromaDB collection ${collectionName}`);
        return;
      } catch (err) {
        console.error('Failed to save in ChromaDB, falling back to memory:', err);
      }
    }

    // Save in-memory fallback
    this.inMemoryStore = [
      ...this.inMemoryStore.filter(e => e.documentId !== documentId),
      ...entriesToSave,
    ];
    console.log(`Successfully indexed chunks in NestJS in-memory vector store. Total chunks: ${this.inMemoryStore.length}`);
  }

  // Vector similarity search
  async search(
    courseId: string,
    query: string,
    apiKey: string,
    limit = 3,
  ): Promise<{ text: string; pageNum: number; documentId: string }[]> {
    if (!query.trim()) return [];

    if (!this.chromaConnected) {
      await this.initChroma();
    }

    const queryEmbedding = apiKey ? await this.getEmbedding(query, apiKey) : [];
    if (!queryEmbedding || queryEmbedding.length === 0) {
      // Keyword overlap fallback search when offline or no API key is provided
      const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      const courseEntries = this.inMemoryStore.filter(e => e.courseId === courseId);
      if (courseEntries.length === 0) return [];

      const scored = courseEntries.map(entry => {
        const entryText = entry.text.toLowerCase();
        let overlap = 0;
        queryWords.forEach(word => {
          if (entryText.includes(word)) overlap++;
        });
        return { entry, score: overlap / (queryWords.length || 1) };
      });

      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, limit).map(s => ({
        text: s.entry.text,
        pageNum: s.entry.pageNum,
        documentId: s.entry.documentId,
      }));
    }

    if (this.chromaConnected && this.chromaClient) {
      try {
        const collectionName = `course-${courseId.replace(/[^a-zA-Z0-9-_]/g, '-')}`;
        const collection = await this.chromaClient.getCollection({
          name: collectionName,
        });

        if (collection) {
          const results = await collection.query({
            queryEmbeddings: [queryEmbedding],
            nResults: limit,
          });

          const chunks: { text: string; pageNum: number; documentId: string }[] = [];
          if (results.documents && results.documents[0]) {
            results.documents[0].forEach((doc, idx) => {
              const meta = results.metadatas?.[0]?.[idx] as any;
              if (doc) {
                chunks.push({
                  text: doc,
                  pageNum: meta?.pageNum || 1,
                  documentId: meta?.documentId || 'unknown',
                });
              }
            });
          }
          return chunks;
        }
      } catch (err) {
        console.warn('ChromaDB query failed, using in-memory search instead:', err);
      }
    }

    // In-memory similarity search
    const courseEntries = this.inMemoryStore.filter(e => e.courseId === courseId);
    if (courseEntries.length === 0) return [];

    const scored = courseEntries.map(entry => {
      const score = this.cosineSimilarity(queryEmbedding, entry.embedding);
      return { entry, score };
    });

    // Sort by descending score
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, limit).map(s => ({
      text: s.entry.text,
      pageNum: s.entry.pageNum,
      documentId: s.entry.documentId,
    }));
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0.0;
    let normA = 0.0;
    let normB = 0.0;
    const length = Math.min(vecA.length, vecB.length);
    if (length === 0) return 0;
    
    for (let i = 0; i < length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
