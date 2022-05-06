import Redis from 'ioredis';
import _ from 'lodash';
import moment from 'moment';
import { connect } from 'mongoose';
import { BattlesByLeagueDocument } from '../feature/stats/ui/battles-by-league.document';
import { BattlesByManaCapDocument } from '../feature/stats/ui/battles-by-mana-cap.document';
import { BattlesByTimestampDocument } from '../feature/stats/ui/battles-by-timestamp.document';
import { StatsViewBagDocument } from '../feature/stats/ui/stats-view-bag.document';
import { LEAGUES } from '../shared/game';
import {
  CACHE_STATS_BATTLES_BY_LEAGUE,
  CACHE_STATS_BATTLES_BY_MANA_CAP,
  CACHE_STATS_BATTLES_BY_TIMESTAMP,
  CACHE_STATS_VIEW_BAG,
} from '../util';
import { config } from './config';
import { Battle } from './db/battle';

export default async function processBattleStats() {
  const mongoose = await connect(
    config('MONGO_URI', {
      default: 'mongodb://localhost:27017/splinterlands-data',
    }),
  );

  console.log('Mongodb connected');

  const redis = new Redis({
    port: config('REDIS_PORT', { cast: 'number', default: 6379 }),
    host: config('REDIS_HOST', { default: '127.0.0.1' }),
    username: config('REDIS_USERNAME', { required: false }),
    password: config('REDIS_PASSWORD', { required: false }),
    db: config('REDIS_DB', { default: 0, cast: 'number' }),
  });

  console.log('Redis connected');

  await Promise.all([
    getViewBag().then((result) =>
      redis.set(CACHE_STATS_VIEW_BAG, JSON.stringify(result)),
    ),
    getBattlesByLeague().then((result) =>
      redis.set(CACHE_STATS_BATTLES_BY_LEAGUE, JSON.stringify(result)),
    ),
    getBattlesByTimestamp().then((result) =>
      redis.set(CACHE_STATS_BATTLES_BY_TIMESTAMP, JSON.stringify(result)),
    ),
    getBattlesByManaCap().then((result) =>
      redis.set(CACHE_STATS_BATTLES_BY_MANA_CAP, JSON.stringify(result)),
    ),
  ]);

  await redis.quit();
  console.log('Redis disconnected');
  await mongoose.connection.close();
  console.log('Mongoose disconnected');
}

async function getViewBag(): Promise<StatsViewBagDocument> {
  console.log('Processing View Bag');

  await Battle.find({});

  const [totalBattles, oldestBattle, latestBattle] = await Promise.all([
    Battle.count(),
    Battle.find()
      .sort('timestamp')
      .limit(1)
      .exec()
      .then((results) => results[0]),
    Battle.find()
      .sort('-timestamp')
      .limit(1)
      .exec()
      .then((results) => results[0]),
  ]);

  console.log('Processing View Bag Done');

  return {
    id: '0',
    updated: moment().unix(),
    totalBattles,
    oldestBattle: oldestBattle?.timestamp,
    latestBattle: latestBattle?.timestamp,
  };
}

async function getBattlesByLeague(): Promise<BattlesByLeagueDocument[]> {
  console.log('Processing Battles By League');

  const fromTransactions = await Battle.aggregate([
    {
      $match: { source: 'transaction' },
    },
    {
      $group: {
        _id: '$leagueGroup',
        count: { $sum: 1 },
      },
    },
  ]);

  const fromPlayerHistory = await Battle.aggregate([
    {
      $match: { source: 'playerHistory' },
    },
    {
      $group: {
        _id: '$leagueGroup',
        count: { $sum: 1 },
      },
    },
  ]);

  const now = moment().unix();

  const documents: BattlesByLeagueDocument[] = _.chain(LEAGUES)
    .sortBy((league) => {
      return league.number;
    })
    .map((league) => league.group)
    .uniq()
    .map((leagueGroup) => {
      const resultFromTransactions = fromTransactions.find(
        (it) => it._id === leagueGroup,
      );
      const resultFromPlayerHistory = fromPlayerHistory.find(
        (it) => it._id === leagueGroup,
      );

      const document: BattlesByLeagueDocument = {
        id: leagueGroup,
        updated: now,
        leagueGroup,
        fromTransactions: resultFromTransactions?.count ?? 0,
        fromPlayerHistory: resultFromPlayerHistory?.count ?? 0,
      };

      return document;
    })
    .value();

  console.log('Processing Battles By League Done');

  return documents;
}

async function getBattlesByTimestamp(): Promise<BattlesByTimestampDocument[]> {
  console.log('Processing Battles By Timestamp');

  const fromTransactions = await Battle.aggregate([
    {
      $match: { source: 'transaction' },
    },
    {
      $group: {
        _id: { $dayOfYear: '$timestampDate' },
        count: { $sum: 1 },
      },
    },
  ]);

  const fromPlayerHistory = await Battle.aggregate([
    {
      $match: { source: 'playerHistory' },
    },
    {
      $group: {
        _id: { $dayOfYear: '$timestampDate' },
        count: { $sum: 1 },
      },
    },
  ]);

  const days = _.chain([...fromTransactions, ...fromPlayerHistory])
    .map((it) => it._id)
    .uniq()
    .value();

  const now = moment().unix();

  const documents: BattlesByTimestampDocument[] = _.chain(days)
    .sort()
    .map((dayOfYear) => {
      const resultFromTransactions = fromTransactions.find(
        (it) => it._id === dayOfYear,
      );
      const resultFromPlayerHistory = fromPlayerHistory.find(
        (it) => it._id === dayOfYear,
      );

      const document: BattlesByTimestampDocument = {
        id: dayOfYear.toString(),
        updated: now,
        timestamp: moment().dayOfYear(dayOfYear).unix(),
        fromTransactions: resultFromTransactions?.count ?? 0,
        fromPlayerHistory: resultFromPlayerHistory?.count ?? 0,
      };

      return document;
    })
    .value();

  console.log('Processing Battles By Timestamp Done');

  return documents;
}

async function getBattlesByManaCap(): Promise<BattlesByManaCapDocument[]> {
  console.log('Processing Battles By Mana Cap');

  const fromTransactions = await Battle.aggregate([
    {
      $match: { source: 'transaction' },
    },
    {
      $group: {
        _id: '$manaCap',
        count: { $sum: 1 },
      },
    },
  ]);

  const fromPlayerHistory = await Battle.aggregate([
    {
      $match: { source: 'playerHistory' },
    },
    {
      $group: {
        _id: '$manaCap',
        count: { $sum: 1 },
      },
    },
  ]);

  const manaCaps = _.chain([...fromTransactions, ...fromPlayerHistory])
    .map((it) => it._id)
    .uniq()
    .value();

  const now = moment().unix();

  const documents: BattlesByManaCapDocument[] = _.chain(manaCaps)
    .sort()
    .map((manaCap) => {
      const resultFromTransactions = fromTransactions.find(
        (it) => it._id === manaCap,
      );
      const resultFromPlayerHistory = fromPlayerHistory.find(
        (it) => it._id === manaCap,
      );

      const document: BattlesByManaCapDocument = {
        id: manaCap.toString(),
        updated: now,
        manaCap,
        fromTransactions: resultFromTransactions?.count ?? 0,
        fromPlayerHistory: resultFromPlayerHistory?.count ?? 0,
      };

      return document;
    })
    .value();

  console.log('Processing Battles By Mana Cap Done');

  return documents;
}
