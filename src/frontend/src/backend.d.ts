import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;

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

export interface backendInterface {
    createRoom(playerName: string): Promise<string>;
    joinRoom(roomCode: string, playerName: string): Promise<boolean>;
    updatePosition(x: number, y: number, z: number, rotation: number): Promise<void>;
    getPlayersInRoom(roomCode: string): Promise<PlayerState[]>;
    leaveRoom(): Promise<void>;
    getMyPlayer(): Promise<Option<PlayerState>>;
    roomExists(roomCode: string): Promise<boolean>;
}
