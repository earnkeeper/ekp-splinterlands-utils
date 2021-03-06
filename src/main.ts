import { Cluster } from '@earnkeeper/ekp-sdk-nestjs';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as cluster from 'cluster';
import 'module-alias/register';
import { join } from 'path';
import { GatewayModule } from './gateway.module';
import processBattleStats from './schedule/processBattleStats';
import { WorkerModule } from './worker.module';

const gatewayBootstrap = async () => {
  const app = await NestFactory.create<NestExpressApplication>(GatewayModule);
  app.enableCors();
  app.useStaticAssets(join(__dirname, '..', 'public'));
  app.enableShutdownHooks();
  await app.listen(3001);
};

const workerBootstrap = async () => {
  const app = await NestFactory.create(WorkerModule);
  app.enableShutdownHooks();
  await app.init();
};

const scheduleBootstrap = async () => {
  processBattleStats();
};

switch (process.env.PROCESS_TYPE) {
  case 'GATEWAY':
    Cluster.register(16, gatewayBootstrap);
    break;
  case 'WORKER':
    Cluster.register(16, workerBootstrap);
    break;
  case 'SCHEDULE':
    scheduleBootstrap();
    break;
  default:
    const combinedBootstrap = async () => {
      if (cluster.default.isPrimary) {
        await gatewayBootstrap();
      } else {
        await workerBootstrap();
      }
    };

    Cluster.register(16, combinedBootstrap);
    break;
}
