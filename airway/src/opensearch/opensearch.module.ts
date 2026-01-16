import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Client } from '@opensearch-project/opensearch';
import { OpenSearchService } from './opensearch.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'OPENSEARCH_CLIENT',
      useFactory: (configService: ConfigService) => {
        return new Client({
          node: configService.get('OPENSEARCH_NODE'),
        });
      },
      inject: [ConfigService],
    },
    OpenSearchService,
  ],
  exports: ['OPENSEARCH_CLIENT', OpenSearchService],
})
export class OpenSearchModule {}

