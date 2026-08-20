export interface User {
    id: string;
    name: string;
    type: 'guest' | 'registered';
}

export type GameState = 'title' | 'level_select' | 'playing' | 'replay';
