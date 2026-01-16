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
    await this.client.delete({
      index: indexName,
      id,
    });
  }

  getClient(): Client {
    return this.client;
  }
}

