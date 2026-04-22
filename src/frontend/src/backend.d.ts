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
    x: number;
    y: number;
    z: number;
    id: string;
    rotation: number;
    name: string;
    roomCode: string;
    lastSeen: bigint;
}
export interface backendInterface {
    createRoom(playerName: string): Promise<string>;
    getMyPlayer(): Promise<PlayerState | null>;
    getPlayersInRoom(roomCode: string): Promise<Array<PlayerState>>;
    joinRoom(roomCode: string, playerName: string): Promise<boolean>;
    leaveRoom(): Promise<void>;
    roomExists(roomCode: string): Promise<boolean>;
    updatePosition(x: number, y: number, z: number, rotation: number): Promise<void>;
}
