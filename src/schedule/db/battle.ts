import { PlayerDto, TeamDetailedDto } from '@/shared/api';
import { model, Schema } from 'mongoose';

interface IBattle {
  readonly id: string;
  readonly version: number;
  readonly blockNumber: number;
  readonly timestamp: number;
  readonly manaCap: number;
  readonly ruleset?: string;
  readonly rulesets: string[];
  readonly cardHashes: string[];
  readonly timestampDate: Date;
  readonly fetched: number;
  readonly fetchedDate: Date;
  readonly source: string;
  readonly winner: string;
  readonly loser: string;
  readonly leagueGroup: string;
  readonly players: PlayerDto[];
  readonly team1: TeamDetailedDto;
  readonly team2: TeamDetailedDto;
}

export const battleSchema = new Schema({
  id: String,
  version: Number,
  blockNumber: Number,
  timestamp: Number,
  manaCap: Number,
  rulesets: [String],
  cardHashes: [String],
  timestampDate: Date,
  fetched: Number,
  fetchedDate: Date,
  souce: String,
  winner: String,
  loser: String,
  leagueGroup: String,
  players: Array,
  team1: Array,
  team2: Array,
})
  .index({ timestamp: 1 })
  .index({ source: 1, timestampDate: 1 })
  .index({ source: 1, leagueGroup: 1 })
  .index({ source: 1, manaCap: 1 });

export const Battle = model<IBattle>('battles_v7', battleSchema);
