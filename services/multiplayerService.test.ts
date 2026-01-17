import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as service from './multiplayerService';
import * as firebaseDatabase from 'firebase/database';

// Mock firebase/database
vi.mock('firebase/database', () => {
    const pushMock = vi.fn(() => ({ key: 'mock-room-id' }));
    const refMock = vi.fn(() => ({ key: 'mock-ref' }));
    return {
        getDatabase: vi.fn(),
        ref: refMock,
        set: vi.fn(),
        push: pushMock,
        get: vi.fn(() => Promise.resolve({
            exists: () => true,
            val: () => ({ status: 'waiting' })
        })),
        update: vi.fn(),
        query: vi.fn(),
        orderByChild: vi.fn(),
        equalTo: vi.fn(),
        limitToFirst: vi.fn(),
        onValue: vi.fn(),
        off: vi.fn(),
        remove: vi.fn()
    };
});

// Mock the db instance import
vi.mock('../firebase', () => ({
    db: {}
}));

describe('Multiplayer Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should create a room', async () => {
        const hostId = 'host1';
        const hostName = 'Host';
        const settings = { difficulty: 'easy', maxPlayers: 5 };
        
        const roomId = await service.createRoom(hostId, hostName, settings, 'public');
        
        expect(firebaseDatabase.push).toHaveBeenCalled();
        expect(firebaseDatabase.set).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                hostId,
                type: 'public',
                status: 'playing',
                settings
            })
        );
        expect(roomId).toBe('mock-room-id');
    });

    it('should join a room', async () => {
        const roomId = 'room1';
        const player = { id: 'p2', name: 'Player 2', isHost: false, score: 0, status: 'connected' } as any;
        
        await service.joinRoom(roomId, player);
        
        expect(firebaseDatabase.ref).toHaveBeenCalledWith(expect.anything(), `rooms/${roomId}/players/${player.id}`);
        expect(firebaseDatabase.set).toHaveBeenCalledWith(expect.anything(), player);
    });

    it('should leave a room', async () => {
        const roomId = 'room1';
        const playerId = 'p2';
        
        await service.leaveRoom(roomId, playerId);
        
        expect(firebaseDatabase.ref).toHaveBeenCalledWith(expect.anything(), `rooms/${roomId}/players/${playerId}`);
        expect(firebaseDatabase.remove).toHaveBeenCalled();
    });

    it('should subscribe to room updates', () => {
        const roomId = 'room1';
        const callback = vi.fn();
        
        const unsubscribe = service.subscribeToRoom(roomId, callback);
        
        expect(firebaseDatabase.ref).toHaveBeenCalledWith(expect.anything(), `rooms/${roomId}`);
        expect(firebaseDatabase.onValue).toHaveBeenCalled();
        
        // Simulate callback
        const onValueCall = vi.mocked(firebaseDatabase.onValue).mock.calls[0];
        const snapshotMock = { val: () => ({ id: 'r1' }) };
        (onValueCall[1] as Function)(snapshotMock);
        
        expect(callback).toHaveBeenCalledWith({ id: 'r1' });
        
        unsubscribe();
        expect(firebaseDatabase.off).toHaveBeenCalled();
    });
});