import { describe, it, expect } from 'vitest';
import { Room, Player, GameState } from './multiplayer';

describe('Multiplayer Interfaces', () => {
    it('should compile a valid Player object', () => {
        const player: Player = {
            id: 'p1',
            name: 'Test',
            isHost: true,
            score: 0,
            status: 'connected'
        };
        expect(player.id).toBe('p1');
    });

    it('should compile a valid Room object', () => {
         const room: Room = {
            id: 'r1',
            hostId: 'p1',
            code: '1234',
            status: 'waiting',
            createdAt: 123456,
            settings: {
                difficulty: 'baby',
                maxPlayers: 5
            },
            players: {},
            gameState: {
                currentWord: 'test',
                currentWordIndex: 0,
                startTime: 123456
            }
         };
         expect(room.status).toBe('waiting');
    });
});
