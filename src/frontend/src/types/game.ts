// ── Multiplayer Game Types ──────────────────────────────────────────────────

export interface PlayerState {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  rotation: number;
  roomCode: string;
  lastSeen: bigint;
}

export interface Room {
  code: string;
  players: PlayerState[];
  createdAt: bigint;
}

export type Option<T> = { __kind__: "Some"; value: T } | { __kind__: "None" };

/** Actor interface expected by the game's multiplayer logic */
export interface GameActor {
  createRoom(playerName: string): Promise<string>;
  joinRoom(roomCode: string, playerName: string): Promise<boolean>;
  updatePosition(
    x: number,
    y: number,
    z: number,
    rotation: number,
  ): Promise<void>;
  getPlayersInRoom(roomCode: string): Promise<PlayerState[]>;
  leaveRoom(): Promise<void>;
  getMyPlayer(): Promise<Option<PlayerState>>;
  roomExists(roomCode: string): Promise<boolean>;
}
