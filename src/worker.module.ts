import { SdkModule } from '@earnkeeper/ekp-sdk-nestjs';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BattlesModule } from './feature/battles/battles.module';
import { CardsModule } from './feature/cards/cards.module';
import { LeaderboardModule } from './feature/leaderboard/leaderboard.module';
import { StatsModule } from './feature/stats/stats.module';
import { config } from './schedule/config';

export const MODULE_DEF = {
  imports: [
    MongooseModule.forRoot(
      config('MONGO_URI', {
        default: 'mongodb://localhost:27017/splinterlands',
      }),
    ),
    BattlesModule,
    CardsModule,
    LeaderboardModule,
    SdkModule,
    StatsModule,
  ],
};

@Module(MODULE_DEF)
export class WorkerModule {}
