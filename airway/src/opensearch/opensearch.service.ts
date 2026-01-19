import { Injectable, Inject } from '@nestjs/common';
import { Client } from '@opensearch-project/opensearch';

@Injectable()
export class OpenSearchService {
  constructor(@Inject('OPENSEARCH_CLIENT') private readonly client: Client) {}

  async createIndex(indexName: string, mappings: any): Promise<void> {
    const exists = await this.client.indices.exists({ index: indexName });
    if (!exists.body) {
      await this.client.indices.create({
        index: indexName,
        body: {
          mappings,
        },
      });
    }
  }

  async indexDocument(indexName: string, id: string, document: any): Promise<void> {
    await this.client.index({
      index: indexName,
      id,
      body: document,
    });
  }

  async search(indexName: string, query: any): Promise<any> {
    const result = await this.client.search({
      index: indexName,
      body: query,
    });
    return result.body || result;
  }

  async deleteDocument(indexName: string, id: string): Promise<void> {
    try {
      await this.client.delete({
        index: indexName,
        id,
      });
    } catch (error: any) {
      // If document doesn't exist (404), that's fine - it's already deleted
      if (error.statusCode !== 404) {
        throw error;
      }
    }
  }

  /**
   * Get all document IDs from an index
   * Uses scroll API to handle large indices efficiently
   */
  async getAllDocumentIds(indexName: string): Promise<string[]> {
    const ids: string[] = [];
    let scrollId: string | undefined;
    const scrollSize = 1000; // Process 1000 documents at a time

    try {
      // Initial search with scroll
      const initialResponse = await this.client.search({
        index: indexName,
        body: {
          size: scrollSize,
          _source: false, // Don't return document content, just IDs
        },
        scroll: '1m', // Keep scroll context alive for 1 minute
      });

      const body: any = initialResponse.body || initialResponse;
      scrollId = body._scroll_id;

      // Process initial batch
      let hits: any[] = body.hits?.hits || [];
      hits.forEach((hit: any) => {
        const id = hit._id || hit._source?.id;
        if (id) {
          ids.push(id);
        }
      });

      // Continue scrolling until no more results
      while (hits.length > 0) {
        const scrollResponse = await this.client.scroll({
          scroll_id: scrollId!,
          scroll: '1m',
        });

        const scrollBody: any = scrollResponse.body || scrollResponse;
        hits = scrollBody.hits?.hits || [];
        
        hits.forEach((hit: any) => {
          const id = hit._id || hit._source?.id;
          if (id) {
            ids.push(id);
          }
        });
      }

      // Clear scroll context
      if (scrollId) {
        try {
          await this.client.clearScroll({ scroll_id: scrollId });
        } catch (error) {
          // Ignore errors when clearing scroll
        }
      }

      return ids;
    } catch (error: any) {
      // If index doesn't exist, return empty array
      if (error.statusCode === 404) {
        return [];
      }
      throw error;
    }
  }

  getClient(): Client {
    return this.client;
  }
}

