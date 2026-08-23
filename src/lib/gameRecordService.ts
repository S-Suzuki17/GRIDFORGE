'use client';

import { supabase } from './supabaseClient';
import { PieceType } from '../config/gameConfig';

export interface MoveRecord {
    turn: number;
    player: 'white' | 'black';
    tokenId: string;
    from: [number, number];
    to: [number, number];
    possibleTypes: PieceType[];
    capturedTokenId?: string;
    promotedTo?: PieceType;
}

export interface GameRecord {
    id?: string;
    created_at?: string;
    white_player: string;
    black_player: string;
    white_id?: string;
    black_id?: string;
    winner: string | null;
    mode: 'cpu' | 'private' | 'random' | 'ranked';
    cpu_level?: number;
    time_control?: string;
    moves: MoveRecord[];
    total_moves: number;
}

export interface Profile {
    id: string;
    name: string;
    rating: number;
    rating_10s: number;
    rating_3m: number;
    rating_10m: number;
}

export async function saveGameRecord(record: GameRecord): Promise<string | null> {
    const { data, error } = await supabase
        .from('game_records')
        .insert({
            white_player: record.white_player,
            black_player: record.black_player,
            white_id: record.white_id,
            black_id: record.black_id,
            winner: record.winner,
            mode: record.mode,
            cpu_level: record.cpu_level,
            time_control: record.time_control,
            moves: record.moves,
            total_moves: record.total_moves,
        })
        .select('id')
        .single();

    if (error) {
        console.error('Failed to save game record:', error);
        return null;
    }
    return data?.id ?? null;
}

export async function getGameRecords(limit: number = 20): Promise<GameRecord[]> {
    const { data, error } = await supabase
        .from('game_records')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Failed to fetch game records:', error);
        return [];
    }
    return data ?? [];
}

export async function getGameRecord(id: string): Promise<GameRecord | null> {
    const { data, error } = await supabase
        .from('game_records')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Failed to fetch game record:', error);
        return null;
    }
    return data;
}

export async function getTopProfiles(timeControl?: string): Promise<Profile[]> {
    const ratingColumn = timeControl === '10s' ? 'rating_10s' 
                       : timeControl === '3m' ? 'rating_3m' 
                       : timeControl === '10m' ? 'rating_10m'
                       : 'rating';
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order(ratingColumn, { ascending: false })
        .limit(10);
    
    if (error) {
        console.error('Failed to fetch top profiles:', error);
        return [];
    }
    return data ?? [];
}

export async function ensureProfile(id: string, name: string): Promise<Profile | null> {
    const { data: existing, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
        
    if (existing) return existing;
    
    const { data, error } = await supabase
        .from('profiles')
        .insert({ id, name, rating: 2000, rating_10s: 2000, rating_3m: 2000, rating_10m: 2000 })
        .select()
        .single();
        
    if (error) {
        console.error('Failed to create profile:', error);
        return null;
    }
    return data;
}
