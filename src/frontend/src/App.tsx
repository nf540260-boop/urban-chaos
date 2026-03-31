import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { PlayerState } from "./backend.d";
import { useActor } from "./hooks/useActor";

// ── Types ──────────────────────────────────────────────────────────────────
interface CarState {
  x: number;
  z: number;
  angle: number;
  speed: number;
  wheelRot: number;
}

interface Controls {
  gas: boolean;
  brake: boolean;
  left: boolean;
  right: boolean;
}

type CameraMode = "follow" | "front" | "left" | "right" | "top";

// ── Seeded RNG ─────────────────────────────────────────────────────────────
function makeRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ── Random 3D Shape Cars (parked decoration) ───────────────────────────────
function RandomShapeCar({
  position,
  rotation,
  colorSeed,
}: {
  position: [number, number, number];
  rotation: number;
  colorSeed: number;
}) {
  const rng = makeRng(colorSeed * 1234);
  const hue = Math.floor(rng() * 360);
  const color = `hsl(${hue}, 70%, 50%)`;
  const shapeType = Math.floor(rng() * 4);

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {shapeType === 0 && (
        <>
          <mesh position={[0, 0.5, 0]} castShadow>
            <boxGeometry args={[3.5, 0.7, 1.8]} />
            <meshStandardMaterial
              color={color}
              metalness={0.6}
              roughness={0.3}
            />
          </mesh>
          <mesh position={[0.2, 1.1, 0]} castShadow>
            <sphereGeometry args={[0.6, 8, 6]} />
            <meshStandardMaterial
              color={color}
              metalness={0.5}
              roughness={0.35}
            />
          </mesh>
        </>
      )}
      {shapeType === 1 && (
        <>
          <mesh position={[0, 0.45, 0]} castShadow>
            <boxGeometry args={[4.0, 0.5, 1.9]} />
            <meshStandardMaterial
              color={color}
              metalness={0.7}
              roughness={0.2}
            />
          </mesh>
          <mesh position={[0, 0.9, 0]} castShadow>
            <cylinderGeometry args={[0.7, 0.9, 0.55, 8]} />
            <meshStandardMaterial
              color={color}
              metalness={0.6}
              roughness={0.25}
            />
          </mesh>
        </>
      )}
      {shapeType === 2 && (
        <>
          <mesh position={[0, 0.42, 0]} castShadow>
            <boxGeometry args={[3.8, 0.45, 2.0]} />
            <meshStandardMaterial
              color={color}
              metalness={0.8}
              roughness={0.15}
            />
          </mesh>
          <mesh position={[0.1, 0.85, 0]} castShadow>
            <boxGeometry args={[1.8, 0.5, 1.75]} />
            <meshStandardMaterial
              color={color}
              metalness={0.75}
              roughness={0.18}
            />
          </mesh>
        </>
      )}
      {shapeType === 3 && (
        <>
          <mesh position={[0, 0.55, 0]} castShadow>
            <cylinderGeometry args={[0.9, 1.1, 0.8, 8]} />
            <meshStandardMaterial
              color={color}
              metalness={0.6}
              roughness={0.3}
            />
          </mesh>
          <mesh position={[0, 1.1, 0]} castShadow>
            <coneGeometry args={[0.7, 0.8, 6]} />
            <meshStandardMaterial
              color={color}
              metalness={0.5}
              roughness={0.35}
            />
          </mesh>
        </>
      )}
      {(
        [
          [1.2, 0.9],
          [1.2, -0.9],
          [-1.2, 0.9],
          [-1.2, -0.9],
        ] as [number, number][]
      ).map(([wx, wz]) => (
        <mesh
          key={`w${wx}-${wz}`}
          position={[wx, 0.32, wz]}
          rotation={[0, 0, Math.PI / 2]}
          castShadow
        >
          <cylinderGeometry args={[0.32, 0.32, 0.24, 10]} />
          <meshStandardMaterial color="#111111" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

// ── Generic Car ───────────────────────────────────────────────────────────
function GenericCar({
  carRef,
  position,
  rotation,
  color,
}: {
  carRef?: React.MutableRefObject<CarState>;
  position?: [number, number, number];
  rotation?: number;
  color?: string;
}) {
  const bodyColor = color ?? "#4488cc";
  const groupRef = useRef<THREE.Group>(null);
  const wheelRefs = useRef<THREE.Mesh[]>([]);
  const setWheelRef = (i: number) => (el: THREE.Mesh | null) => {
    if (el) wheelRefs.current[i] = el;
  };

  useFrame(() => {
    if (!groupRef.current) return;
    if (carRef) {
      const state = carRef.current;
      groupRef.current.position.set(state.x, 0, state.z);
      groupRef.current.rotation.y = state.angle + Math.PI / 2;
      for (const w of wheelRefs.current)
        if (w) w.rotation.x -= state.speed * 0.05;
    }
  });

  return (
    <group
      ref={groupRef}
      position={carRef ? undefined : position}
      rotation={carRef ? undefined : [0, rotation ?? 0, 0]}
    >
      {/* Car body */}
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[4.5, 0.6, 2.0]} />
        <meshStandardMaterial
          color={bodyColor}
          metalness={0.7}
          roughness={0.25}
        />
      </mesh>
      {/* Cabin */}
      <mesh position={[0.1, 0.98, 0]} castShadow>
        <boxGeometry args={[2.4, 0.65, 1.72]} />
        <meshStandardMaterial
          color={bodyColor}
          metalness={0.6}
          roughness={0.3}
        />
      </mesh>
      {/* Hood */}
      <mesh position={[1.6, 0.55, 0]} castShadow>
        <boxGeometry args={[1.4, 0.12, 1.9]} />
        <meshStandardMaterial
          color={bodyColor}
          metalness={0.7}
          roughness={0.25}
        />
      </mesh>
      {/* Front bumper */}
      <mesh position={[2.32, 0.28, 0]} castShadow>
        <boxGeometry args={[0.18, 0.28, 2.1]} />
        <meshStandardMaterial color="#5a6070" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Rear bumper */}
      <mesh position={[-2.32, 0.28, 0]} castShadow>
        <boxGeometry args={[0.18, 0.28, 2.1]} />
        <meshStandardMaterial color="#5a6070" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Windshield */}
      <mesh position={[1.18, 0.96, 0]} rotation={[0, 0, -0.42]}>
        <boxGeometry args={[0.06, 0.68, 1.62]} />
        <meshStandardMaterial
          color="#88aacc"
          transparent
          opacity={0.45}
          metalness={0.1}
          roughness={0.05}
        />
      </mesh>
      {/* Rear window */}
      <mesh position={[-1.08, 0.96, 0]} rotation={[0, 0, 0.42]}>
        <boxGeometry args={[0.06, 0.62, 1.58]} />
        <meshStandardMaterial
          color="#88aacc"
          transparent
          opacity={0.4}
          metalness={0.1}
          roughness={0.05}
        />
      </mesh>
      {/* Headlights */}
      <mesh position={[2.24, 0.52, 0.72]}>
        <boxGeometry args={[0.12, 0.15, 0.32]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffcc"
          emissiveIntensity={3}
        />
      </mesh>
      <mesh position={[2.24, 0.52, -0.72]}>
        <boxGeometry args={[0.12, 0.15, 0.32]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffcc"
          emissiveIntensity={3}
        />
      </mesh>
      {/* Taillights */}
      <mesh position={[-2.24, 0.52, 0.72]}>
        <boxGeometry args={[0.12, 0.14, 0.44]} />
        <meshStandardMaterial
          color="#ff2222"
          emissive="#ff0000"
          emissiveIntensity={2}
        />
      </mesh>
      <mesh position={[-2.24, 0.52, -0.72]}>
        <boxGeometry args={[0.12, 0.14, 0.44]} />
        <meshStandardMaterial
          color="#ff2222"
          emissive="#ff0000"
          emissiveIntensity={2}
        />
      </mesh>
      {/* Undercarriage */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[4.2, 0.1, 1.8]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
      </mesh>
      {/* Wheels */}
      {(
        [
          [1.55, 1.05],
          [1.55, -1.05],
          [-1.55, 1.05],
          [-1.55, -1.05],
        ] as [number, number][]
      ).map(([wx, wz], i) => (
        <group key={`${wx}-${wz}`} position={[wx, 0.38, wz]}>
          <mesh ref={setWheelRef(i)} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.38, 0.38, 0.25, 16]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.24, 0.24, 0.26, 8]} />
            <meshStandardMaterial
              color="#888888"
              metalness={0.8}
              roughness={0.3}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ── Parked cars data ───────────────────────────────────────────────────────
const CAR_COLORS = [
  "#cc2222",
  "#2244cc",
  "#228844",
  "#cc8822",
  "#882299",
  "#cccc22",
  "#226688",
  "#cc4488",
];
const PARKED_CARS = (() => {
  const rng = makeRng(77);
  const cars: Array<{
    x: number;
    z: number;
    rotation: number;
    color: string;
    shapeVariant: boolean;
  }> = [];
  for (let i = 0; i < 20; i++) {
    let x = 0;
    let z = 0;
    do {
      x = (rng() - 0.5) * 180;
      z = (rng() - 0.5) * 180;
    } while (Math.abs(x) < 25 && Math.abs(z) < 25);
    const color = CAR_COLORS[Math.floor(rng() * CAR_COLORS.length)];
    const shapeVariant = rng() > 0.65;
    cars.push({ x, z, rotation: rng() * Math.PI * 2, color, shapeVariant });
  }
  return cars;
})();

function ParkedCars() {
  return (
    <>
      {PARKED_CARS.map((c, i) =>
        c.shapeVariant ? (
          <RandomShapeCar
            key={`s-${c.x.toFixed(1)}-${c.z.toFixed(1)}`}
            position={[c.x, 0, c.z]}
            rotation={c.rotation}
            colorSeed={i + 100}
          />
        ) : (
          <GenericCar
            key={`c-${c.x.toFixed(1)}-${c.z.toFixed(1)}`}
            color={c.color}
            position={[c.x, 0, c.z]}
            rotation={c.rotation}
          />
        ),
      )}
    </>
  );
}

// ── Near-car highlight indicator ───────────────────────────────────────────
function NearCarIndicator({
  carX,
  carZ,
  active,
}: { carX: number; carZ: number; active: boolean }) {
  if (!active) return null;
  return (
    <mesh position={[carX, 2.5, carZ]}>
      <sphereGeometry args={[0.3, 8, 8]} />
      <meshStandardMaterial
        color="#00ff88"
        emissive="#00ff44"
        emissiveIntensity={3}
      />
    </mesh>
  );
}

// ── Buildings with windows ─────────────────────────────────────────────────
const BUILDING_DATA = (() => {
  const buildings: Array<{
    x: number;
    z: number;
    w: number;
    d: number;
    h: number;
    color: string;
  }> = [];
  const colors = [
    "#c4b89a",
    "#d4c8b4",
    "#4a5560",
    "#e8dcc8",
    "#8a7868",
    "#b8a890",
    "#6a7880",
    "#c8b8a0",
  ];
  const rng = makeRng(42);
  for (let i = 0; i < 40; i++) {
    let x = 0;
    let z = 0;
    do {
      x = (rng() - 0.5) * 180;
      z = (rng() - 0.5) * 180;
    } while (Math.abs(x) < 22 && Math.abs(z) < 22);
    const w = 5 + rng() * 10;
    const d = 5 + rng() * 10;
    const h = 4 + rng() * 26;
    buildings.push({
      x,
      z,
      w,
      d,
      h,
      color: colors[Math.floor(rng() * colors.length)],
    });
  }
  return buildings;
})();

function BuildingWithWindows({
  x,
  z,
  w,
  d,
  h,
  color,
}: { x: number; z: number; w: number; d: number; h: number; color: string }) {
  // Generate window grid for front and side faces
  const windowsX: React.ReactElement[] = [];
  const colsX = Math.max(1, Math.floor(w / 2.5));
  const rows = Math.max(1, Math.floor(h / 3));
  for (let c = 0; c < colsX; c++) {
    for (let r = 0; r < rows; r++) {
      const wx = -w / 2 + (c + 0.5) * (w / colsX);
      const wy = 1.5 + r * (h / rows);
      if (wy > h - 0.5) continue;
      windowsX.push(
        <mesh key={`f${c}-${r}`} position={[wx, wy, d / 2 + 0.05]}>
          <boxGeometry args={[0.7, 0.9, 0.05]} />
          <meshStandardMaterial
            color="#fffaa0"
            emissive="#ffee55"
            emissiveIntensity={1.2}
          />
        </mesh>,
      );
      windowsX.push(
        <mesh key={`b${c}-${r}`} position={[wx, wy, -d / 2 - 0.05]}>
          <boxGeometry args={[0.7, 0.9, 0.05]} />
          <meshStandardMaterial
            color="#fffaa0"
            emissive="#ffee55"
            emissiveIntensity={1.2}
          />
        </mesh>,
      );
    }
  }
  const colsZ = Math.max(1, Math.floor(d / 2.5));
  for (let c = 0; c < colsZ; c++) {
    for (let r = 0; r < rows; r++) {
      const wz = -d / 2 + (c + 0.5) * (d / colsZ);
      const wy = 1.5 + r * (h / rows);
      if (wy > h - 0.5) continue;
      windowsX.push(
        <mesh key={`l${c}-${r}`} position={[w / 2 + 0.05, wy, wz]}>
          <boxGeometry args={[0.05, 0.9, 0.7]} />
          <meshStandardMaterial
            color="#fffaa0"
            emissive="#ffee55"
            emissiveIntensity={1.2}
          />
        </mesh>,
      );
      windowsX.push(
        <mesh key={`r${c}-${r}`} position={[-w / 2 - 0.05, wy, wz]}>
          <boxGeometry args={[0.05, 0.9, 0.7]} />
          <meshStandardMaterial
            color="#fffaa0"
            emissive="#ffee55"
            emissiveIntensity={1.2}
          />
        </mesh>,
      );
    }
  }

  return (
    <group position={[x, h / 2, z]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} roughness={0.85} metalness={0.1} />
      </mesh>
      {windowsX}
      {/* Rooftop detail */}
      <mesh position={[0, h / 2 + 0.5, 0]}>
        <boxGeometry args={[w * 0.4, 1.0, d * 0.4]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh position={[w * 0.2, h / 2 + 0.4, d * 0.2]}>
        <boxGeometry args={[0.6, 0.8, 0.6]} />
        <meshStandardMaterial color="#555" roughness={0.8} />
      </mesh>
    </group>
  );
}

function Buildings() {
  return (
    <>
      {BUILDING_DATA.map((b) => (
        <BuildingWithWindows key={`${b.x}-${b.z}`} {...b} />
      ))}
    </>
  );
}

// ── Pedestrian NPC ─────────────────────────────────────────────────────────
const NPC_COLORS = [
  "#e74c3c",
  "#3498db",
  "#2ecc71",
  "#f39c12",
  "#9b59b6",
  "#1abc9c",
  "#e67e22",
  "#00cec9",
];
const NPC_DATA = (() => {
  const rng = makeRng(99);
  return Array.from({ length: 12 }, (_, i) => ({
    startX: (rng() - 0.5) * 120,
    startZ: (rng() - 0.5) * 120,
    color: NPC_COLORS[i % NPC_COLORS.length],
    speed: 1.2 + rng() * 0.6,
    wanderSeed: Math.floor(rng() * 9999),
  }));
})();

function Pedestrian({
  startX,
  startZ,
  color,
  speed,
  wanderSeed,
}: {
  startX: number;
  startZ: number;
  color: string;
  speed: number;
  wanderSeed: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const pos = useRef(new THREE.Vector3(startX, 0, startZ));
  const target = useRef(new THREE.Vector3(startX + 10, 0, startZ + 10));
  const nextWander = useRef(0);
  const rng = useRef(makeRng(wanderSeed));
  const facingAngle = useRef(0);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const now = performance.now() / 1000;
    if (now > nextWander.current) {
      const r = rng.current;
      target.current.set(
        pos.current.x + (r() - 0.5) * 30,
        0,
        pos.current.z + (r() - 0.5) * 30,
      );
      target.current.x = Math.max(-95, Math.min(95, target.current.x));
      target.current.z = Math.max(-95, Math.min(95, target.current.z));
      nextWander.current = now + 3 + r() * 2;
    }
    const dir = new THREE.Vector3().subVectors(target.current, pos.current);
    const dist = dir.length();
    if (dist > 0.5) {
      dir.normalize();
      pos.current.addScaledVector(dir, speed * delta);
      facingAngle.current = Math.atan2(dir.x, dir.z);
    }
    groupRef.current.position.copy(pos.current);
    groupRef.current.rotation.y = facingAngle.current;
  });

  return (
    <group ref={groupRef}>
      {/* Head */}
      <mesh position={[0, 1.85, 0]} castShadow>
        <sphereGeometry args={[0.22, 8, 8]} />
        <meshStandardMaterial color="#f4c07a" roughness={0.8} />
      </mesh>
      {/* Body */}
      <mesh position={[0, 1.1, 0]} castShadow>
        <boxGeometry args={[0.4, 0.8, 0.25]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      {/* Left arm */}
      <mesh position={[0.3, 1.1, 0]} castShadow>
        <boxGeometry args={[0.15, 0.7, 0.15]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      {/* Right arm */}
      <mesh position={[-0.3, 1.1, 0]} castShadow>
        <boxGeometry args={[0.15, 0.7, 0.15]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      {/* Left leg */}
      <mesh position={[0.12, 0.4, 0]} castShadow>
        <boxGeometry args={[0.18, 0.75, 0.2]} />
        <meshStandardMaterial color="#2c3e50" roughness={0.9} />
      </mesh>
      {/* Right leg */}
      <mesh position={[-0.12, 0.4, 0]} castShadow>
        <boxGeometry args={[0.18, 0.75, 0.2]} />
        <meshStandardMaterial color="#2c3e50" roughness={0.9} />
      </mesh>
    </group>
  );
}

function NPCs() {
  return (
    <>
      {NPC_DATA.map((npc) => (
        <Pedestrian
          key={`npc-${npc.startX.toFixed(1)}-${npc.startZ.toFixed(1)}`}
          {...npc}
        />
      ))}
    </>
  );
}

// ── Real Online Players (from backend) ────────────────────────────────────
const PLAYER_COLORS = ["#00aaff", "#ff44aa", "#44ffaa", "#ffaa00", "#aa44ff"];

function RealOnlinePlayerMesh({
  player,
  index,
}: { player: PlayerState; index: number }) {
  const color = PLAYER_COLORS[index % PLAYER_COLORS.length];
  return (
    <group
      position={[player.x, player.y, player.z]}
      rotation={[0, player.rotation, 0]}
    >
      {/* Head */}
      <mesh position={[0, 1.85, 0]} castShadow>
        <sphereGeometry args={[0.24, 8, 8]} />
        <meshStandardMaterial color="#f4c07a" roughness={0.8} />
      </mesh>
      {/* Torso - blue hoodie (different from local player's red) */}
      <mesh position={[0, 1.1, 0]} castShadow>
        <boxGeometry args={[0.42, 0.8, 0.26]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      {/* Arms */}
      <mesh position={[0.32, 1.1, 0]} castShadow>
        <boxGeometry args={[0.15, 0.7, 0.15]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh position={[-0.32, 1.1, 0]} castShadow>
        <boxGeometry args={[0.15, 0.7, 0.15]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      {/* Legs */}
      <mesh position={[0.12, 0.4, 0]} castShadow>
        <boxGeometry args={[0.18, 0.75, 0.2]} />
        <meshStandardMaterial color="#222244" roughness={0.9} />
      </mesh>
      <mesh position={[-0.12, 0.4, 0]} castShadow>
        <boxGeometry args={[0.18, 0.75, 0.2]} />
        <meshStandardMaterial color="#222244" roughness={0.9} />
      </mesh>
      {/* Name tag glow */}
      <mesh position={[0, 2.4, 0]}>
        <boxGeometry args={[1.0, 0.3, 0.05]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={2}
          transparent
          opacity={0.85}
        />
      </mesh>
      <pointLight
        position={[0, 2.5, 0]}
        color={color}
        intensity={2}
        distance={6}
      />
    </group>
  );
}

function RealOnlinePlayers({ players }: { players: PlayerState[] }) {
  return (
    <>
      {players.map((p, i) => (
        <RealOnlinePlayerMesh key={p.id} player={p} index={i} />
      ))}
    </>
  );
}

// ── Player character (on foot) ─────────────────────────────────────────────
function PlayerCharacter({
  playerPosRef,
  controlsRef,
}: {
  playerPosRef: React.MutableRefObject<{ x: number; z: number; angle: number }>;
  controlsRef: React.MutableRefObject<Controls>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const walkTimeRef = useRef(0);
  const speedRef = useRef(0);

  // Limb refs
  const leftUpperLegRef = useRef<THREE.Group>(null);
  const rightUpperLegRef = useRef<THREE.Group>(null);
  const leftUpperArmRef = useRef<THREE.Group>(null);
  const rightUpperArmRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // Position / facing
    groupRef.current.position.set(
      playerPosRef.current.x,
      0,
      playerPosRef.current.z,
    );
    groupRef.current.rotation.y = playerPosRef.current.angle;

    // Determine movement speed from controls
    const ctrl = controlsRef.current;
    const moving = ctrl.gas || ctrl.brake || ctrl.left || ctrl.right;
    const targetSpeed = moving ? (ctrl.gas || ctrl.brake ? 3.5 : 1.5) : 0;
    speedRef.current +=
      (targetSpeed - speedRef.current) * Math.min(delta * 8, 1);
    const spd = speedRef.current;

    // Walk cycle
    if (spd > 0.1) walkTimeRef.current += delta * spd * 3.5;

    const amp = spd > 2.5 ? 0.55 : spd > 0.1 ? 0.35 : 0;
    const swing = Math.sin(walkTimeRef.current) * amp;

    // Directional lean
    const leanTarget = ctrl.gas ? -0.08 : ctrl.brake ? 0.06 : 0;
    groupRef.current.rotation.x +=
      (leanTarget - groupRef.current.rotation.x) * Math.min(delta * 6, 1);

    // Animate legs
    if (leftUpperLegRef.current) leftUpperLegRef.current.rotation.x = swing;
    if (rightUpperLegRef.current) rightUpperLegRef.current.rotation.x = -swing;
    // Arms counter-phase
    if (leftUpperArmRef.current)
      leftUpperArmRef.current.rotation.x = -swing * 0.7;
    if (rightUpperArmRef.current)
      rightUpperArmRef.current.rotation.x = swing * 0.7;
  });

  return (
    <group ref={groupRef}>
      {/* === HEAD === */}
      <mesh position={[0, 2.05, 0]} castShadow>
        <sphereGeometry args={[0.28, 10, 10]} />
        <meshStandardMaterial color="#f4c07a" roughness={0.75} />
      </mesh>
      {/* Hair */}
      <mesh position={[0, 2.3, -0.02]}>
        <boxGeometry args={[0.52, 0.14, 0.5]} />
        <meshStandardMaterial color="#3d1a00" roughness={0.9} />
      </mesh>
      {/* Neck */}
      <mesh position={[0, 1.77, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.1, 0.16, 8]} />
        <meshStandardMaterial color="#f4c07a" roughness={0.75} />
      </mesh>

      {/* === TORSO === */}
      <mesh position={[0, 1.28, 0]} castShadow>
        <boxGeometry args={[0.52, 0.72, 0.3]} />
        <meshStandardMaterial color="#e74c3c" roughness={0.7} />
      </mesh>
      {/* Belt */}
      <mesh position={[0, 0.91, 0]}>
        <boxGeometry args={[0.54, 0.07, 0.32]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
      </mesh>

      {/* === LEFT ARM === */}
      {/* Pivot at shoulder */}
      <group ref={leftUpperArmRef} position={[0.34, 1.58, 0]}>
        {/* Upper arm */}
        <mesh position={[0, -0.19, 0]} castShadow>
          <boxGeometry args={[0.16, 0.38, 0.16]} />
          <meshStandardMaterial color="#e74c3c" roughness={0.7} />
        </mesh>
        {/* Lower arm */}
        <mesh position={[0, -0.52, 0]} castShadow>
          <boxGeometry args={[0.14, 0.34, 0.14]} />
          <meshStandardMaterial color="#f4c07a" roughness={0.75} />
        </mesh>
        {/* Hand */}
        <mesh position={[0, -0.72, 0]} castShadow>
          <sphereGeometry args={[0.08, 6, 6]} />
          <meshStandardMaterial color="#f4c07a" roughness={0.75} />
        </mesh>
      </group>

      {/* === RIGHT ARM === */}
      <group ref={rightUpperArmRef} position={[-0.34, 1.58, 0]}>
        <mesh position={[0, -0.19, 0]} castShadow>
          <boxGeometry args={[0.16, 0.38, 0.16]} />
          <meshStandardMaterial color="#e74c3c" roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.52, 0]} castShadow>
          <boxGeometry args={[0.14, 0.34, 0.14]} />
          <meshStandardMaterial color="#f4c07a" roughness={0.75} />
        </mesh>
        <mesh position={[0, -0.72, 0]} castShadow>
          <sphereGeometry args={[0.08, 6, 6]} />
          <meshStandardMaterial color="#f4c07a" roughness={0.75} />
        </mesh>
      </group>

      {/* === LEFT LEG === pivot at hip */}
      <group ref={leftUpperLegRef} position={[0.14, 0.87, 0]}>
        {/* Upper leg */}
        <mesh position={[0, -0.22, 0]} castShadow>
          <boxGeometry args={[0.2, 0.44, 0.22]} />
          <meshStandardMaterial color="#1a3a6a" roughness={0.85} />
        </mesh>
        {/* Shin */}
        <mesh position={[0, -0.58, 0]} castShadow>
          <boxGeometry args={[0.17, 0.38, 0.2]} />
          <meshStandardMaterial color="#1a3a6a" roughness={0.85} />
        </mesh>
        {/* Shoe */}
        <mesh position={[0, -0.82, 0.04]} castShadow>
          <boxGeometry args={[0.2, 0.1, 0.3]} />
          <meshStandardMaterial color="#111111" roughness={0.9} />
        </mesh>
      </group>

      {/* === RIGHT LEG === */}
      <group ref={rightUpperLegRef} position={[-0.14, 0.87, 0]}>
        <mesh position={[0, -0.22, 0]} castShadow>
          <boxGeometry args={[0.2, 0.44, 0.22]} />
          <meshStandardMaterial color="#1a3a6a" roughness={0.85} />
        </mesh>
        <mesh position={[0, -0.58, 0]} castShadow>
          <boxGeometry args={[0.17, 0.38, 0.2]} />
          <meshStandardMaterial color="#1a3a6a" roughness={0.85} />
        </mesh>
        <mesh position={[0, -0.82, 0.04]} castShadow>
          <boxGeometry args={[0.2, 0.1, 0.3]} />
          <meshStandardMaterial color="#111111" roughness={0.9} />
        </mesh>
      </group>

      {/* Green arrow indicator above head */}
      <mesh position={[0, 2.75, 0]}>
        <coneGeometry args={[0.2, 0.5, 6]} />
        <meshStandardMaterial
          color="#00ff88"
          emissive="#00ff44"
          emissiveIntensity={2}
        />
      </mesh>
    </group>
  );
}

// ── Gangs Data ─────────────────────────────────────────────────────────────
const GANGS = [
  {
    name: "Grove Street",
    color: "#22aa44",
    territory: "South LS",
    members: 32,
    status: "Allied",
  },
  {
    name: "Ballas",
    color: "#9933cc",
    territory: "East LS",
    members: 28,
    status: "Enemy",
  },
  {
    name: "Vagos",
    color: "#ffcc00",
    territory: "East Vinewood",
    members: 24,
    status: "Neutral",
  },
  {
    name: "Aztecas",
    color: "#00ccff",
    territory: "El Corona",
    members: 19,
    status: "Neutral",
  },
  {
    name: "Triads",
    color: "#ff4444",
    territory: "Chinatown",
    members: 15,
    status: "Enemy",
  },
  {
    name: "Mafia",
    color: "#888888",
    territory: "Downtown",
    members: 22,
    status: "Neutral",
  },
  {
    name: "Russian Mob",
    color: "#4466ff",
    territory: "Portola Drive",
    members: 18,
    status: "Enemy",
  },
  {
    name: "Bikers",
    color: "#ff8800",
    territory: "Sandy Shores",
    members: 21,
    status: "Neutral",
  },
];

// ── Bot Car ────────────────────────────────────────────────────────────────
const BOT_STARTS = [
  { x: 30, z: 20 },
  { x: -40, z: 30 },
  { x: 50, z: -50 },
  { x: -20, z: -60 },
];
const BOT_COLORS = ["#ff2244", "#22ffaa", "#ff8800", "#44aaff"];

function BotCar({
  startX,
  startZ,
  color,
}: { startX: number; startZ: number; color: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const posRef = useRef(new THREE.Vector3(startX, 0, startZ));
  const targetRef = useRef(new THREE.Vector3(startX + 20, 0, startZ + 15));
  const angleRef = useRef(0);
  const rng = useRef(makeRng(Math.abs(startX * 37 + startZ * 13) | 0));

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const dt = Math.min(delta, 0.05);
    const dir = new THREE.Vector3().subVectors(
      targetRef.current,
      posRef.current,
    );
    const dist = dir.length();
    if (dist < 3) {
      const r = rng.current;
      targetRef.current.set((r() - 0.5) * 100, 0, (r() - 0.5) * 100);
    } else {
      dir.normalize();
      posRef.current.addScaledVector(dir, 8 * dt);
      angleRef.current = Math.atan2(dir.x, dir.z);
    }
    groupRef.current.position.copy(posRef.current);
    groupRef.current.rotation.y = angleRef.current;
  });

  return (
    <group ref={groupRef}>
      {/* Body */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[3, 0.7, 1.6]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Cabin */}
      <mesh position={[0, 1.05, 0]} castShadow>
        <boxGeometry args={[1.8, 0.6, 1.4]} />
        <meshStandardMaterial color={color} metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Wheels */}
      {(
        [
          [-1.1, 0.28, 0.85],
          [1.1, 0.28, 0.85],
          [-1.1, 0.28, -0.85],
          [1.1, 0.28, -0.85],
        ] as [number, number, number][]
      ).map((pos) => (
        <mesh
          key={`${pos[0]}-${pos[2]}`}
          position={pos}
          rotation={[0, Math.PI / 2, 0]}
          castShadow
        >
          <cylinderGeometry args={[0.28, 0.28, 0.22, 10]} />
          <meshStandardMaterial color="#222" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

// ── Bank Building ──────────────────────────────────────────────────────────
function Bank3D() {
  return (
    <group position={[0, 0, -50]}>
      {/* Main body */}
      <mesh position={[0, 6, 0]} castShadow receiveShadow>
        <boxGeometry args={[18, 12, 14]} />
        <meshStandardMaterial color="#c8b878" roughness={0.7} />
      </mesh>
      {/* Columns */}
      {([-6, -2, 2, 6] as number[]).map((cx) => (
        <mesh key={cx} position={[cx, 6, 7.2]} castShadow>
          <cylinderGeometry args={[0.4, 0.4, 12, 8]} />
          <meshStandardMaterial color="#e8d8a0" roughness={0.6} />
        </mesh>
      ))}
      {/* Vault door hint */}
      <mesh position={[0, 4, 7.1]}>
        <boxGeometry args={[3, 4, 0.3]} />
        <meshStandardMaterial color="#333" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Roof ledge */}
      <mesh position={[0, 12.4, 0]} castShadow>
        <boxGeometry args={[20, 0.8, 16]} />
        <meshStandardMaterial color="#b8a868" roughness={0.8} />
      </mesh>
      {/* Sign */}
      <mesh position={[0, 15, 7.1]}>
        <boxGeometry args={[10, 2, 0.2]} />
        <meshStandardMaterial
          color="#ffcc00"
          emissive="#ffcc00"
          emissiveIntensity={0.4}
        />
      </mesh>
      {/* Steps */}
      <mesh position={[0, 0.2, 8.5]} receiveShadow>
        <boxGeometry args={[14, 0.4, 3]} />
        <meshStandardMaterial color="#d4c898" roughness={0.9} />
      </mesh>
    </group>
  );
}

// ── House ──────────────────────────────────────────────────────────────────
const HOUSE_POSITIONS: [number, number, number][] = [
  [25, 0, 25],
  [-25, 0, 25],
  [25, 0, -25],
  [-60, 0, 10],
  [40, 0, 40],
  [-35, 0, -40],
];

function House3D({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      {/* Walls */}
      <mesh position={[0, 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[6, 4, 6]} />
        <meshStandardMaterial color="#d4a574" roughness={0.85} />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 5.5, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[4.8, 3, 4]} />
        <meshStandardMaterial color="#8b4513" roughness={0.9} />
      </mesh>
      {/* Door */}
      <mesh position={[0, 1.1, 3.05]}>
        <boxGeometry args={[1.2, 2.2, 0.15]} />
        <meshStandardMaterial color="#5c3317" roughness={0.9} />
      </mesh>
      {/* Windows */}
      <mesh position={[1.6, 2.2, 3.05]}>
        <boxGeometry args={[1.0, 1.0, 0.1]} />
        <meshStandardMaterial
          color="#88ccff"
          emissive="#88ccff"
          emissiveIntensity={0.3}
        />
      </mesh>
      <mesh position={[-1.6, 2.2, 3.05]}>
        <boxGeometry args={[1.0, 1.0, 0.1]} />
        <meshStandardMaterial
          color="#88ccff"
          emissive="#88ccff"
          emissiveIntensity={0.3}
        />
      </mesh>
    </group>
  );
}

function Houses() {
  return (
    <>
      {HOUSE_POSITIONS.map(([x, , z]) => (
        <House3D key={`${x}-${z}`} x={x} z={z} />
      ))}
    </>
  );
}

// ── City Decorations ───────────────────────────────────────────────────────
function CityDecorations() {
  return (
    <>
      {/* Water tower at (15, 0, 15) */}
      <group position={[15, 0, 15]}>
        {/* Tank */}
        <mesh position={[0, 6, 0]} castShadow>
          <cylinderGeometry args={[1.2, 1.2, 4, 12]} />
          <meshStandardMaterial color="#555" roughness={0.8} />
        </mesh>
        {/* Legs */}
        {(
          [
            [-0.8, 0.8],
            [0.8, 0.8],
            [-0.8, -0.8],
            [0.8, -0.8],
          ] as [number, number][]
        ).map(([lx, lz]) => (
          <mesh key={`${lx}-${lz}`} position={[lx, 3, lz]} castShadow>
            <boxGeometry args={[0.15, 6, 0.15]} />
            <meshStandardMaterial color="#444" roughness={0.9} />
          </mesh>
        ))}
      </group>

      {/* Billboard 1 */}
      <group position={[-15, 0, 20]}>
        <mesh position={[0, 4, 0]} castShadow>
          <boxGeometry args={[0.3, 8, 0.3]} />
          <meshStandardMaterial color="#666" roughness={0.8} />
        </mesh>
        <mesh position={[0, 8.5, 0]}>
          <boxGeometry args={[6, 3, 0.2]} />
          <meshStandardMaterial
            color="#ff4422"
            emissive="#ff2200"
            emissiveIntensity={0.3}
          />
        </mesh>
      </group>

      {/* Billboard 2 */}
      <group position={[30, 0, -10]}>
        <mesh position={[0, 4, 0]} castShadow>
          <boxGeometry args={[0.3, 8, 0.3]} />
          <meshStandardMaterial color="#666" roughness={0.8} />
        </mesh>
        <mesh position={[0, 8.5, 0]}>
          <boxGeometry args={[6, 3, 0.2]} />
          <meshStandardMaterial
            color="#00aaff"
            emissive="#0066ff"
            emissiveIntensity={0.3}
          />
        </mesh>
      </group>

      {/* Street Lamps */}
      {(
        [
          [10, 5],
          [-10, 5],
          [0, -10],
          [20, -20],
          [-20, -5],
        ] as [number, number][]
      ).map(([lx, lz]) => (
        <group key={`${lx}-${lz}`} position={[lx, 0, lz]}>
          <mesh position={[0, 3, 0]} castShadow>
            <boxGeometry args={[0.2, 6, 0.2]} />
            <meshStandardMaterial color="#777" roughness={0.7} />
          </mesh>
          <mesh position={[0, 6.3, 0]}>
            <sphereGeometry args={[0.35, 8, 8]} />
            <meshStandardMaterial
              color="#ffffaa"
              emissive="#ffff44"
              emissiveIntensity={3}
            />
          </mesh>
          <pointLight
            position={[lx, 6.3, lz]}
            color="#ffff88"
            intensity={4}
            distance={20}
          />
        </group>
      ))}

      {/* Park Benches near (0, 0, 20) */}
      {(
        [
          [0, 20],
          [3, 22],
          [-3, 22],
        ] as [number, number][]
      ).map(([bx, bz]) => (
        <group key={`${bx}-${bz}`} position={[bx, 0, bz]}>
          <mesh position={[0, 0.35, 0]}>
            <boxGeometry args={[1.8, 0.12, 0.5]} />
            <meshStandardMaterial color="#8b4513" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.6, 0.2]}>
            <boxGeometry args={[1.8, 0.5, 0.1]} />
            <meshStandardMaterial color="#8b4513" roughness={0.9} />
          </mesh>
          <mesh position={[-0.8, 0.2, 0]}>
            <boxGeometry args={[0.1, 0.4, 0.5]} />
            <meshStandardMaterial color="#666" roughness={0.8} />
          </mesh>
          <mesh position={[0.8, 0.2, 0]}>
            <boxGeometry args={[0.1, 0.4, 0.5]} />
            <meshStandardMaterial color="#666" roughness={0.8} />
          </mesh>
        </group>
      ))}
    </>
  );
}

// ── Camera Controller ──────────────────────────────────────────────────────
function CameraController({
  carRef,
  playerPosRef,
  inCar,
  cameraMode,
}: {
  carRef: React.MutableRefObject<CarState>;
  playerPosRef: React.MutableRefObject<{ x: number; z: number; angle: number }>;
  inCar: boolean;
  cameraMode: CameraMode;
}) {
  const { camera } = useThree();
  const camPos = useRef(new THREE.Vector3(0, 5, -10));

  useFrame(() => {
    const px = inCar ? carRef.current.x : playerPosRef.current.x;
    const pz = inCar ? carRef.current.z : playerPosRef.current.z;
    const angle = inCar ? carRef.current.angle : playerPosRef.current.angle;

    let targetPos: THREE.Vector3;
    if (cameraMode === "follow") {
      const ox = -Math.sin(angle) * 10;
      const oz = -Math.cos(angle) * 10;
      targetPos = new THREE.Vector3(px + ox, 5, pz + oz);
    } else if (cameraMode === "front") {
      const ox = Math.sin(angle) * 10;
      const oz = Math.cos(angle) * 10;
      targetPos = new THREE.Vector3(px + ox, 4, pz + oz);
    } else if (cameraMode === "left") {
      const ox = -Math.cos(angle) * 10;
      const oz = Math.sin(angle) * 10;
      targetPos = new THREE.Vector3(px + ox, 5, pz + oz);
    } else if (cameraMode === "right") {
      const ox = Math.cos(angle) * 10;
      const oz = -Math.sin(angle) * 10;
      targetPos = new THREE.Vector3(px + ox, 5, pz + oz);
    } else {
      // top
      targetPos = new THREE.Vector3(px, 22, pz);
    }

    camPos.current.lerp(targetPos, 0.08);
    camera.position.copy(camPos.current);
    camera.lookAt(px, 1, pz);
  });

  return null;
}

// ── Physics Controller ─────────────────────────────────────────────────────
function PhysicsController({
  carRef,
  controlsRef,
  joystickRef,
  inCar,
  playerPosRef,
}: {
  carRef: React.MutableRefObject<CarState>;
  controlsRef: React.MutableRefObject<Controls>;
  joystickRef: React.MutableRefObject<{ dx: number; dy: number }>;
  inCar: boolean;
  playerPosRef: React.MutableRefObject<{ x: number; z: number; angle: number }>;
}) {
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const ctrl = controlsRef.current;
    const joy = joystickRef.current;

    if (inCar) {
      const state = carRef.current;
      // Joystick controls car: dy < 0 = forward, dy > 0 = reverse; dx = steer
      const joyActive = Math.abs(joy.dx) > 0.1 || Math.abs(joy.dy) > 0.1;
      if (joyActive) {
        const gas = -joy.dy; // positive = forward
        if (gas > 0.1) state.speed = Math.min(state.speed + 8 * gas * dt, 20);
        else if (gas < -0.1) {
          if (state.speed > 0)
            state.speed = Math.max(0, state.speed - 12 * Math.abs(gas) * dt);
          else state.speed = Math.max(state.speed - 5 * dt, -8);
        } else {
          state.speed *= 0.97;
          if (Math.abs(state.speed) < 0.05) state.speed = 0;
        }
        if (Math.abs(state.speed) > 0.5) {
          const dir = state.speed > 0 ? 1 : -1;
          state.angle -= joy.dx * 1.8 * dt * dir;
        }
      } else if (ctrl.gas) {
        state.speed = Math.min(state.speed + 8 * dt, 20);
      } else if (ctrl.brake) {
        if (state.speed > 0) state.speed = Math.max(0, state.speed - 12 * dt);
        else state.speed = Math.max(state.speed - 5 * dt, -8);
      } else {
        state.speed *= 0.97;
        if (Math.abs(state.speed) < 0.05) state.speed = 0;
      }
      if (!joyActive && Math.abs(state.speed) > 0.5) {
        const dir = state.speed > 0 ? 1 : -1;
        if (ctrl.left) state.angle += 1.8 * dt * dir;
        if (ctrl.right) state.angle -= 1.8 * dt * dir;
      }
      state.x += Math.sin(state.angle) * state.speed * dt;
      state.z += Math.cos(state.angle) * state.speed * dt;
      state.x = Math.max(-98, Math.min(98, state.x));
      state.z = Math.max(-98, Math.min(98, state.z));
      state.wheelRot += state.speed * dt;
    } else {
      // On-foot movement — joystick takes priority over d-pad buttons
      const walkSpeed = 5;
      const player = playerPosRef.current;
      const joyActive = Math.abs(joy.dx) > 0.1 || Math.abs(joy.dy) > 0.1;
      const btnActive = ctrl.gas || ctrl.brake || ctrl.left || ctrl.right;
      const moving = joyActive || btnActive;
      if (moving) {
        let dx = 0;
        let dz = 0;
        if (joyActive) {
          // Joystick: dy < 0 = forward, dy > 0 = backward; dx = strafe/turn
          const mag = Math.min(1, Math.sqrt(joy.dx * joy.dx + joy.dy * joy.dy));
          // Turn based on horizontal input
          player.angle -= joy.dx * 2.5 * dt;
          // Move forward/backward based on vertical input
          const fwd = -joy.dy * mag;
          dx = Math.sin(player.angle) * fwd;
          dz = Math.cos(player.angle) * fwd;
        } else {
          if (ctrl.gas) {
            dx += Math.sin(player.angle);
            dz += Math.cos(player.angle);
          }
          if (ctrl.brake) {
            dx -= Math.sin(player.angle);
            dz -= Math.cos(player.angle);
          }
          if (ctrl.left) player.angle += 2 * dt;
          if (ctrl.right) player.angle -= 2 * dt;
        }
        const len = Math.sqrt(dx * dx + dz * dz);
        if (len > 0) {
          player.x += (dx / len) * walkSpeed * dt;
          player.z += (dz / len) * walkSpeed * dt;
        }
        player.x = Math.max(-98, Math.min(98, player.x));
        player.z = Math.max(-98, Math.min(98, player.z));
      }
    }
  });

  return null;
}

// ── Ground ─────────────────────────────────────────────────────────────────
function Ground() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200, 40, 40]} />
        <meshStandardMaterial color="#4a4a3a" roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[200, 200, 20, 20]} />
        <meshStandardMaterial
          color="#5a6a40"
          wireframe
          transparent
          opacity={0.3}
        />
      </mesh>
    </group>
  );
}

// ── Sun ────────────────────────────────────────────────────────────────────
function Sun() {
  return (
    <mesh position={[60, 18, 50]}>
      <sphereGeometry args={[4, 16, 16]} />
      <meshBasicMaterial color="#fff5aa" />
      <pointLight color="#ffee88" intensity={30} distance={300} />
    </mesh>
  );
}

// ── Scene ──────────────────────────────────────────────────────────────────
function Scene({
  carRef,
  controlsRef,
  joystickRef,
  inCar,
  cameraMode,
  playerPosRef,
  nearestParkedIdx,
  onlinePlayers,
  carColor,
}: {
  carRef: React.MutableRefObject<CarState>;
  controlsRef: React.MutableRefObject<Controls>;
  joystickRef: React.MutableRefObject<{ dx: number; dy: number }>;
  inCar: boolean;
  cameraMode: CameraMode;
  playerPosRef: React.MutableRefObject<{ x: number; z: number; angle: number }>;
  nearestParkedIdx: number | null;
  onlinePlayers: PlayerState[];
  carColor: string;
}) {
  const { scene } = useThree();
  useEffect(() => {
    scene.background = new THREE.Color("#f9c97a");
    scene.fog = new THREE.FogExp2("#f9e0a0", 0.007);
  }, [scene]);

  return (
    <>
      <ambientLight intensity={0.8} color="#ffe4b0" />
      <directionalLight
        position={[60, 12, 40]}
        intensity={2.5}
        color="#ffcc55"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={200}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={80}
        shadow-camera-bottom={-80}
      />
      <directionalLight
        position={[-40, 20, -30]}
        intensity={0.35}
        color="#aaddff"
      />
      <Sun />
      <Ground />
      <Buildings />
      <ParkedCars />
      <NPCs />
      <RealOnlinePlayers players={onlinePlayers} />
      {inCar ? (
        <GenericCar carRef={carRef} color={carColor} />
      ) : (
        <PlayerCharacter
          playerPosRef={playerPosRef}
          controlsRef={controlsRef}
        />
      )}
      {/* Near car indicator */}
      {nearestParkedIdx !== null && (
        <NearCarIndicator
          carX={PARKED_CARS[nearestParkedIdx].x}
          carZ={PARKED_CARS[nearestParkedIdx].z}
          active={true}
        />
      )}
      <Bank3D />
      <Houses />
      <CityDecorations />
      {BOT_STARTS.map((b, i) => (
        <BotCar
          key={`bot-${b.x}-${b.z}`}
          startX={b.x}
          startZ={b.z}
          color={BOT_COLORS[i % BOT_COLORS.length]}
        />
      ))}
      <CameraController
        carRef={carRef}
        playerPosRef={playerPosRef}
        inCar={inCar}
        cameraMode={cameraMode}
      />
      <PhysicsController
        carRef={carRef}
        controlsRef={controlsRef}
        joystickRef={joystickRef}
        inCar={inCar}
        playerPosRef={playerPosRef}
      />
    </>
  );
}

// ── HUD Speed / Gear ───────────────────────────────────────────────────────
function SpeedHUD({
  carRef,
  inCar,
}: { carRef: React.MutableRefObject<CarState>; inCar: boolean }) {
  const [displaySpeed, setDisplaySpeed] = useState(0);
  const [gear, setGear] = useState("N");

  useEffect(() => {
    let raf: number;
    const update = () => {
      const spd = inCar ? carRef.current.speed : 0;
      const kmh = Math.round(Math.abs(spd) * 18);
      setDisplaySpeed(kmh);
      if (spd < -0.5) setGear("R");
      else if (Math.abs(spd) < 0.5) setGear("N");
      else if (kmh < 30) setGear("1");
      else if (kmh < 60) setGear("2");
      else if (kmh < 100) setGear("3");
      else if (kmh < 150) setGear("4");
      else setGear("5");
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [carRef, inCar]);

  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        left: 16,
        background: "rgba(0,0,0,0.6)",
        border: "1px solid rgba(100,180,255,0.3)",
        borderRadius: 10,
        padding: "10px 18px",
        color: "#fff",
        fontFamily: "monospace",
        backdropFilter: "blur(4px)",
        userSelect: "none",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: "#88aacc",
          letterSpacing: 2,
          marginBottom: 2,
        }}
      >
        SPEED
      </div>
      <div
        style={{
          fontSize: 36,
          fontWeight: 700,
          lineHeight: 1,
          color: "#e8f4ff",
        }}
      >
        {displaySpeed}
        <span style={{ fontSize: 11, color: "#88aacc", marginLeft: 4 }}>
          km/h
        </span>
      </div>
      <div style={{ marginTop: 4, display: "flex", gap: 6 }}>
        <span style={{ fontSize: 10, color: "#88aacc" }}>GEAR</span>
        <span
          style={{
            fontSize: 16,
            fontWeight: 700,
            color:
              gear === "R" ? "#ff5555" : gear === "N" ? "#ffaa44" : "#44ff88",
          }}
        >
          {gear}
        </span>
      </div>
    </div>
  );
}

// ── Styles helper ──────────────────────────────────────────────────────────
const btnBase: React.CSSProperties = {
  background: "rgba(0,0,0,0.6)",
  border: "2px solid rgba(100,180,255,0.4)",
  borderRadius: 12,
  color: "#fff",
  fontWeight: 700,
  fontSize: 12,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexDirection: "column",
  gap: 2,
  userSelect: "none",
  touchAction: "none",
  cursor: "pointer",
  backdropFilter: "blur(6px)",
  WebkitUserSelect: "none",
};

// ── Touch Controls ─────────────────────────────────────────────────────────
function TouchControls({
  joystickRef,
}: {
  joystickRef: React.MutableRefObject<{ dx: number; dy: number }>;
}) {
  const prevent = (e: React.PointerEvent) => e.preventDefault();

  // Joystick state
  const joystickActiveRef = useRef(false);
  const joystickCenterRef = useRef({ x: 0, y: 0 });
  const thumbRef = useRef<HTMLDivElement>(null);
  const PAD_RADIUS = 55;

  const onJoyStart = (e: React.PointerEvent<HTMLDivElement>) => {
    prevent(e);
    joystickActiveRef.current = true;
    const rect = e.currentTarget.getBoundingClientRect();
    joystickCenterRef.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };

  const onJoyMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!joystickActiveRef.current) return;
    const cx = joystickCenterRef.current.x;
    const cy = joystickCenterRef.current.y;
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > PAD_RADIUS) {
      dx = (dx / dist) * PAD_RADIUS;
      dy = (dy / dist) * PAD_RADIUS;
    }
    joystickRef.current.dx = dx / PAD_RADIUS;
    joystickRef.current.dy = dy / PAD_RADIUS;
    if (thumbRef.current) {
      thumbRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
    }
  };

  const onJoyEnd = () => {
    joystickActiveRef.current = false;
    joystickRef.current.dx = 0;
    joystickRef.current.dy = 0;
    if (thumbRef.current) {
      thumbRef.current.style.transform = "translate(0px, 0px)";
    }
  };

  return (
    <>
      {/* Virtual Joystick — bottom left */}
      <div
        data-ocid="game.joystick.pad"
        style={{
          position: "absolute",
          bottom: 40,
          left: 30,
          width: PAD_RADIUS * 2,
          height: PAD_RADIUS * 2,
          borderRadius: "50%",
          background: "rgba(0,0,0,0.45)",
          border: "2px solid rgba(100,180,255,0.5)",
          backdropFilter: "blur(6px)",
          touchAction: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onPointerDown={onJoyStart}
        onPointerMove={onJoyMove}
        onPointerUp={onJoyEnd}
        onPointerCancel={onJoyEnd}
      >
        {/* Crosshair guides */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: 8,
              bottom: 8,
              width: 1,
              background: "rgba(100,180,255,0.2)",
              transform: "translateX(-50%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: 8,
              right: 8,
              height: 1,
              background: "rgba(100,180,255,0.2)",
              transform: "translateY(-50%)",
            }}
          />
        </div>
        {/* Thumb */}
        <div
          ref={thumbRef}
          data-ocid="game.joystick.thumb"
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "rgba(100,180,255,0.7)",
            border: "2px solid rgba(255,255,255,0.8)",
            boxShadow: "0 0 12px rgba(100,180,255,0.5)",
            pointerEvents: "none",
            transition: "transform 0.05s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
          }}
        >
          🕹
        </div>
      </div>
    </>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const carRef = useRef<CarState>({
    x: 0,
    z: 0,
    angle: 0,
    speed: 0,
    wheelRot: 0,
  });
  const controlsRef = useRef<Controls>({
    gas: false,
    brake: false,
    left: false,
    right: false,
  });
  const joystickRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const playerPosRef = useRef({ x: 5, z: 5, angle: 0 });

  const [inCar, setInCar] = useState(false);
  const [carColor, setCarColor] = useState("#4488cc");
  const cameraMode: CameraMode = "follow";
  const [nearestParkedIdx, setNearestParkedIdx] = useState<number | null>(null);
  const [canEnterCar, setCanEnterCar] = useState(false);

  // ── Multiplayer state ────────────────────────────────────────────────────
  const { actor: _rawActor } = useActor();
  const actor = _rawActor as import("./backend.d").backendInterface | null;
  const [gameMode, setGameMode] = useState<"select" | "offline" | "online">(
    "select",
  );
  const [lobbyVisible, setLobbyVisible] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [onlinePlayers, setOnlinePlayers] = useState<PlayerState[]>([]);
  const [lobbyLoading, setLobbyLoading] = useState(false);
  const [lobbyError, setLobbyError] = useState<string | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [lobbyTab, setLobbyTab] = useState<"create" | "join">("create");
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  // ── Gangs panel ──────────────────────────────────────────────────────────
  const [gangsOpen, setGangsOpen] = useState(false);

  // Find nearest parked car from player position
  const findNearestCar = useCallback(() => {
    const px = playerPosRef.current.x;
    const pz = playerPosRef.current.z;
    let bestDist = 9999;
    let bestIdx: number | null = null;
    PARKED_CARS.forEach((c, i) => {
      const dist = Math.sqrt((c.x - px) ** 2 + (c.z - pz) ** 2);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    });
    if (bestDist < 7 && bestIdx !== null) {
      setNearestParkedIdx(bestIdx);
      setCanEnterCar(true);
    } else {
      setNearestParkedIdx(null);
      setCanEnterCar(false);
    }
  }, []);

  // Poll nearest car while on foot
  useEffect(() => {
    if (inCar) return;
    const interval = setInterval(findNearestCar, 300);
    return () => clearInterval(interval);
  }, [inCar, findNearestCar]);

  const enterCar = useCallback(() => {
    if (!canEnterCar || nearestParkedIdx === null) return;
    const c = PARKED_CARS[nearestParkedIdx];
    carRef.current.x = c.x;
    carRef.current.z = c.z;
    carRef.current.angle = c.rotation - Math.PI / 2;
    carRef.current.speed = 0;
    const color = c.color ?? "#4488cc";
    setCarColor(color);
    setInCar(true);
  }, [canEnterCar, nearestParkedIdx]);

  const exitCar = useCallback(() => {
    const angle = carRef.current.angle;
    playerPosRef.current.x =
      carRef.current.x + Math.cos(angle + Math.PI / 2) * 3;
    playerPosRef.current.z =
      carRef.current.z + Math.sin(angle + Math.PI / 2) * 3;
    playerPosRef.current.angle = carRef.current.angle;
    carRef.current.speed = 0;
    setInCar(false);
  }, []);

  // Keyboard controls
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.key === "w" || e.key === "W" || e.key === "ArrowUp")
        controlsRef.current.gas = true;
      if (e.key === "s" || e.key === "S" || e.key === "ArrowDown")
        controlsRef.current.brake = true;
      if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft")
        controlsRef.current.left = true;
      if (e.key === "d" || e.key === "D" || e.key === "ArrowRight")
        controlsRef.current.right = true;
      if (e.key === "e" || e.key === "E") {
        if (inCar) exitCar();
        else if (canEnterCar) enterCar();
      }
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)
      )
        e.preventDefault();
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.key === "w" || e.key === "W" || e.key === "ArrowUp")
        controlsRef.current.gas = false;
      if (e.key === "s" || e.key === "S" || e.key === "ArrowDown")
        controlsRef.current.brake = false;
      if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft")
        controlsRef.current.left = false;
      if (e.key === "d" || e.key === "D" || e.key === "ArrowRight")
        controlsRef.current.right = false;
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [inCar, canEnterCar, enterCar, exitCar]);

  // ── Multiplayer lobby handlers ───────────────────────────────────────────
  const handleCreateRoom = useCallback(async () => {
    if (!actor) {
      setLobbyError("Connecting to server... Please try again.");
      return;
    }
    const name =
      playerName.trim() || `Player${Math.floor(100 + Math.random() * 900)}`;
    setPlayerName(name);
    setLobbyLoading(true);
    setLobbyError(null);
    try {
      const code = await actor.createRoom(name);
      setCreatedCode(code);
      setRoomCode(code);
      const me = await actor.getMyPlayer();
      if (me && me.__kind__ === "Some") setMyPlayerId(me.value.id);
    } catch (_e) {
      setLobbyError("Failed to create room. Try again.");
    } finally {
      setLobbyLoading(false);
    }
  }, [actor, playerName]);

  const handleJoinRoom = useCallback(async () => {
    if (!actor || !joinCodeInput.trim()) return;
    const name =
      playerName.trim() || `Player${Math.floor(100 + Math.random() * 900)}`;
    setPlayerName(name);
    setLobbyLoading(true);
    setLobbyError(null);
    try {
      const ok = await actor.joinRoom(joinCodeInput.trim().toUpperCase(), name);
      if (!ok) {
        setLobbyError("Room not found. Check the code.");
        return;
      }
      setRoomCode(joinCodeInput.trim().toUpperCase());
      const me = await actor.getMyPlayer();
      if (me && me.__kind__ === "Some") setMyPlayerId(me.value.id);
    } catch (_e) {
      setLobbyError("Failed to join room. Try again.");
    } finally {
      setLobbyLoading(false);
    }
  }, [actor, playerName, joinCodeInput]);

  const handleEnterGame = useCallback(() => {
    if (!roomCode) return;
    setLobbyVisible(false);
  }, [roomCode]);

  // Poll players in room every 1000ms while in-game
  useEffect(() => {
    if (lobbyVisible || !roomCode || !actor) return;
    const poll = async () => {
      try {
        const players = await actor.getPlayersInRoom(roomCode);
        setOnlinePlayers(players.filter((p) => p.id !== myPlayerId));
      } catch {
        /* ignore */
      }
    };
    poll();
    const id = setInterval(poll, 1000);
    return () => clearInterval(id);
  }, [lobbyVisible, roomCode, actor, myPlayerId]);

  // Sync local player position every 800ms while in-game
  useEffect(() => {
    if (lobbyVisible || !roomCode || !actor) return;
    const sync = async () => {
      try {
        const px = inCar ? carRef.current.x : playerPosRef.current.x;
        const pz = inCar ? carRef.current.z : playerPosRef.current.z;
        const rot = inCar ? carRef.current.angle : playerPosRef.current.angle;
        await actor.updatePosition(px, 0, pz, rot);
      } catch {
        /* ignore */
      }
    };
    const id = setInterval(sync, 800);
    return () => {
      clearInterval(id);
      if (actor && roomCode) actor.leaveRoom().catch(() => {});
    };
  }, [lobbyVisible, roomCode, actor, inCar]);

  return (
    <div
      style={{
        width: "100dvw",
        height: "100dvh",
        overflow: "hidden",
        position: "relative",
        background: "#f9c97a",
        touchAction: "none",
      }}
    >
      {/* Mode Selection Screen */}
      {gameMode === "select" && (
        <div
          data-ocid="mode.select"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 100,
            background:
              "linear-gradient(180deg, #0a0a0f 0%, #14141e 60%, #0a0a0f 100%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "monospace",
            color: "#fff",
            padding: 24,
          }}
        >
          <div
            style={{
              marginBottom: 8,
              fontSize: 11,
              color: "#ff4444",
              letterSpacing: 6,
            }}
          >
            Rockstar Games Presents
          </div>
          <div
            style={{
              fontSize: 48,
              fontWeight: 900,
              letterSpacing: 4,
              color: "#ffcc00",
              textShadow: "0 0 40px #ff880088",
              marginBottom: 4,
            }}
          >
            URBAN CHAOS
          </div>
          <div
            style={{
              fontSize: 13,
              color: "#88aacc",
              marginBottom: 40,
              letterSpacing: 2,
            }}
          >
            SELECT MODE
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              width: "100%",
              maxWidth: 320,
            }}
          >
            <button
              type="button"
              onClick={() => setGameMode("offline")}
              style={{
                padding: "18px 0",
                background: "rgba(255,200,0,0.15)",
                border: "2px solid #ffcc00",
                borderRadius: 10,
                color: "#ffcc00",
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: 3,
                cursor: "pointer",
                fontFamily: "monospace",
              }}
            >
              🎮 OFFLINE
            </button>
            <button
              type="button"
              onClick={() => {
                setGameMode("online");
                setLobbyVisible(true);
              }}
              style={{
                padding: "18px 0",
                background: "rgba(0,200,255,0.15)",
                border: "2px solid #00ccff",
                borderRadius: 10,
                color: "#00ccff",
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: 3,
                cursor: "pointer",
                fontFamily: "monospace",
              }}
            >
              🌐 ONLINE
            </button>
          </div>
        </div>
      )}

      {/* Multiplayer Lobby Overlay */}
      {lobbyVisible && (
        <div
          data-ocid="lobby.modal"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 100,
            background:
              "linear-gradient(180deg, #0a0a0f 0%, #14141e 60%, #0a0a0f 100%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "monospace",
            color: "#fff",
            padding: 24,
          }}
        >
          {/* Title */}
          <div
            style={{
              marginBottom: 8,
              fontSize: 11,
              color: "#ff4444",
              letterSpacing: 6,
              textTransform: "uppercase",
            }}
          >
            Rockstar Games Presents
          </div>
          <div
            style={{
              fontSize: 48,
              fontWeight: 900,
              letterSpacing: 4,
              color: "#ffcc00",
              textShadow: "0 0 40px #ff880088",
              marginBottom: 4,
            }}
          >
            URBAN CHAOS
          </div>
          <div
            style={{
              fontSize: 13,
              color: "#88aacc",
              marginBottom: 32,
              letterSpacing: 2,
            }}
          >
            ONLINE MULTIPLAYER
          </div>

          {/* Card */}
          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              padding: 28,
              width: "100%",
              maxWidth: 380,
            }}
          >
            {/* Tab selector */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              <button
                type="button"
                data-ocid="lobby.create.tab"
                onClick={() => setLobbyTab("create")}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  background:
                    lobbyTab === "create"
                      ? "rgba(255,200,0,0.2)"
                      : "transparent",
                  border: `1px solid ${lobbyTab === "create" ? "#ffcc00" : "rgba(255,255,255,0.15)"}`,
                  borderRadius: 6,
                  color: lobbyTab === "create" ? "#ffcc00" : "#888",
                  fontFamily: "monospace",
                  fontSize: 12,
                  letterSpacing: 1,
                  cursor: "pointer",
                }}
              >
                CREATE ROOM
              </button>
              <button
                type="button"
                data-ocid="lobby.join.tab"
                onClick={() => setLobbyTab("join")}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  background:
                    lobbyTab === "join" ? "rgba(0,200,255,0.2)" : "transparent",
                  border: `1px solid ${lobbyTab === "join" ? "#00ccff" : "rgba(255,255,255,0.15)"}`,
                  borderRadius: 6,
                  color: lobbyTab === "join" ? "#00ccff" : "#888",
                  fontFamily: "monospace",
                  fontSize: 12,
                  letterSpacing: 1,
                  cursor: "pointer",
                }}
              >
                JOIN ROOM
              </button>
            </div>

            {lobbyTab === "create" ? (
              <div>
                {createdCode ? (
                  <div style={{ textAlign: "center", marginBottom: 16 }}>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#88aacc",
                        marginBottom: 6,
                        letterSpacing: 2,
                      }}
                    >
                      ROOM CODE — SHARE WITH FRIENDS
                    </div>
                    <div
                      style={{
                        fontSize: 32,
                        fontWeight: 900,
                        color: "#ffcc00",
                        letterSpacing: 8,
                        textShadow: "0 0 20px #ffcc0066",
                      }}
                    >
                      {createdCode}
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    data-ocid="lobby.create.primary_button"
                    onClick={handleCreateRoom}
                    disabled={lobbyLoading || !actor}
                    style={{
                      width: "100%",
                      padding: "12px 0",
                      background: "rgba(255,200,0,0.25)",
                      border: "1px solid #ffcc00",
                      borderRadius: 8,
                      color: "#ffcc00",
                      fontFamily: "monospace",
                      fontSize: 14,
                      letterSpacing: 2,
                      cursor: "pointer",
                      marginBottom: 12,
                    }}
                  >
                    {lobbyLoading
                      ? "CREATING..."
                      : !actor
                        ? "CONNECTING..."
                        : "CREATE ROOM"}
                  </button>
                )}
              </div>
            ) : (
              <div style={{ marginBottom: 12 }}>
                <input
                  data-ocid="lobby.join.input"
                  type="text"
                  value={joinCodeInput}
                  onChange={(e) =>
                    setJoinCodeInput(e.target.value.toUpperCase())
                  }
                  placeholder="ROOM CODE"
                  maxLength={8}
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(0,200,255,0.4)",
                    borderRadius: 6,
                    padding: "10px 14px",
                    color: "#00ccff",
                    fontFamily: "monospace",
                    fontSize: 18,
                    letterSpacing: 6,
                    outline: "none",
                    boxSizing: "border-box",
                    marginBottom: 10,
                    textAlign: "center",
                  }}
                />
                <button
                  type="button"
                  data-ocid="lobby.join.primary_button"
                  onClick={handleJoinRoom}
                  disabled={!joinCodeInput.trim() || lobbyLoading}
                  style={{
                    width: "100%",
                    padding: "12px 0",
                    background: joinCodeInput.trim()
                      ? "rgba(0,200,255,0.2)"
                      : "rgba(255,255,255,0.04)",
                    border: `1px solid ${joinCodeInput.trim() ? "#00ccff" : "rgba(255,255,255,0.1)"}`,
                    borderRadius: 8,
                    color: joinCodeInput.trim() ? "#00ccff" : "#444",
                    fontFamily: "monospace",
                    fontSize: 14,
                    letterSpacing: 2,
                    cursor: joinCodeInput.trim() ? "pointer" : "not-allowed",
                  }}
                >
                  {lobbyLoading ? "JOINING..." : "JOIN ROOM"}
                </button>
              </div>
            )}

            {lobbyError && (
              <div
                data-ocid="lobby.error_state"
                style={{
                  color: "#ff4444",
                  fontSize: 12,
                  textAlign: "center",
                  marginTop: 8,
                }}
              >
                {lobbyError}
              </div>
            )}

            {roomCode && (
              <button
                type="button"
                data-ocid="lobby.enter.primary_button"
                onClick={handleEnterGame}
                style={{
                  width: "100%",
                  marginTop: 16,
                  padding: "14px 0",
                  background: "rgba(0,255,136,0.2)",
                  border: "1px solid #00ff88",
                  borderRadius: 8,
                  color: "#00ff88",
                  fontFamily: "monospace",
                  fontSize: 16,
                  letterSpacing: 3,
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                ▶ ENTER GAME
              </button>
            )}
          </div>

          <div style={{ marginTop: 24, fontSize: 10, color: "#333" }}>
            © {new Date().getFullYear()} Built with ❤️ using{" "}
            <a
              href="https://caffeine.ai"
              style={{ color: "#444" }}
              target="_blank"
              rel="noreferrer"
            >
              caffeine.ai
            </a>
          </div>
        </div>
      )}

      <Canvas
        shadows
        camera={{ fov: 60, near: 0.1, far: 300, position: [0, 5, -10] }}
        style={{ width: "100%", height: "100%" }}
      >
        <Scene
          carRef={carRef}
          controlsRef={controlsRef}
          joystickRef={joystickRef}
          inCar={inCar}
          cameraMode={cameraMode}
          playerPosRef={playerPosRef}
          nearestParkedIdx={nearestParkedIdx}
          onlinePlayers={onlinePlayers}
          carColor={carColor}
        />
      </Canvas>

      {/* Speed HUD top-left */}
      <SpeedHUD carRef={carRef} inCar={inCar} />

      {/* Gangs Button */}
      {gameMode !== "select" && (
        <button
          type="button"
          data-ocid="gangs.open_modal_button"
          onClick={() => setGangsOpen(true)}
          style={{
            position: "absolute",
            top: 120,
            left: 16,
            background: "rgba(0,0,0,0.75)",
            border: "1px solid #ff4444",
            borderRadius: 8,
            color: "#ff4444",
            fontFamily: "monospace",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 2,
            padding: "7px 14px",
            cursor: "pointer",
            backdropFilter: "blur(4px)",
            pointerEvents: "auto",
          }}
        >
          🔫 GANGS
        </button>
      )}

      {/* Gangs Panel */}
      {gangsOpen && gameMode !== "select" && (
        <div
          data-ocid="gangs.panel"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 90,
            background: "rgba(0,0,0,0.92)",
            backdropFilter: "blur(8px)",
            display: "flex",
            flexDirection: "column",
            fontFamily: "monospace",
            color: "#fff",
            padding: 24,
            overflowY: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 10,
                  color: "#ff4444",
                  letterSpacing: 4,
                  marginBottom: 4,
                }}
              >
                URBAN CHAOS
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 900,
                  color: "#ffcc00",
                  letterSpacing: 3,
                }}
              >
                🔫 GANG TERRITORIES
              </div>
            </div>
            <button
              type="button"
              data-ocid="gangs.close_button"
              onClick={() => setGangsOpen(false)}
              style={{
                background: "rgba(255,68,68,0.2)",
                border: "1px solid #ff4444",
                borderRadius: 8,
                color: "#ff4444",
                fontFamily: "monospace",
                fontSize: 14,
                padding: "8px 16px",
                cursor: "pointer",
              }}
            >
              ✕ CLOSE
            </button>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 12,
            }}
          >
            {GANGS.map((gang, i) => (
              <div
                key={gang.name}
                data-ocid={`gangs.item.${i + 1}`}
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${gang.color}44`,
                  borderLeft: `4px solid ${gang.color}`,
                  borderRadius: 10,
                  padding: "14px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 4,
                  }}
                >
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      background: gang.color,
                      flexShrink: 0,
                    }}
                  />
                  <div
                    style={{ fontSize: 15, fontWeight: 700, color: gang.color }}
                  >
                    {gang.name}
                  </div>
                  <div
                    style={{
                      marginLeft: "auto",
                      fontSize: 10,
                      padding: "2px 8px",
                      borderRadius: 12,
                      background:
                        gang.status === "Allied"
                          ? "rgba(34,170,68,0.25)"
                          : gang.status === "Enemy"
                            ? "rgba(255,68,68,0.25)"
                            : "rgba(150,150,150,0.2)",
                      color:
                        gang.status === "Allied"
                          ? "#22aa44"
                          : gang.status === "Enemy"
                            ? "#ff4444"
                            : "#aaa",
                      border: `1px solid ${gang.status === "Allied" ? "#22aa44" : gang.status === "Enemy" ? "#ff4444" : "#666"}`,
                      letterSpacing: 1,
                    }}
                  >
                    {gang.status === "Allied"
                      ? "✓ ALLIED"
                      : gang.status === "Enemy"
                        ? "✗ ENEMY"
                        : "◆ NEUTRAL"}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "#aaa" }}>
                  📍 {gang.territory}
                </div>
                <div style={{ fontSize: 11, color: "#888" }}>
                  👥 {gang.members} members
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Online players panel top-right */}
      <div
        data-ocid="game.online.panel"
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          background: "rgba(0,0,0,0.75)",
          border: "1px solid rgba(0,255,136,0.3)",
          borderRadius: 10,
          padding: "10px 14px",
          color: "#fff",
          fontFamily: "monospace",
          backdropFilter: "blur(6px)",
          userSelect: "none",
          pointerEvents: "none",
          minWidth: 170,
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: "#00ff88",
            letterSpacing: 2,
            marginBottom: 4,
          }}
        >
          🟢 ONLINE ROOM
        </div>
        {roomCode && (
          <div
            style={{
              fontSize: 13,
              color: "#ffcc00",
              fontWeight: "bold",
              marginBottom: 6,
              letterSpacing: 2,
            }}
          >
            {roomCode}
          </div>
        )}
        {onlinePlayers.length === 0 ? (
          <div style={{ fontSize: 11, color: "#666" }}>
            Waiting for players...
          </div>
        ) : (
          onlinePlayers.map((p, i) => {
            const col = ["#00aaff", "#ff44aa", "#44ffaa", "#ffaa00", "#aa44ff"][
              i % 5
            ];
            return (
              <div
                key={p.id}
                style={{
                  fontSize: 12,
                  color: col,
                  marginBottom: 3,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: col,
                    display: "inline-block",
                  }}
                />
                {p.name}
              </div>
            );
          })
        )}
        <div
          style={{
            marginTop: 6,
            fontSize: 10,
            color: "#555",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            paddingTop: 4,
          }}
        >
          {playerName && (
            <span style={{ color: "#aaa" }}>You: {playerName}</span>
          )}
        </div>
      </div>

      {/* Enter car button */}
      {!inCar && canEnterCar && (
        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: 8,
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <button
            type="button"
            data-ocid="game.enter.button"
            onClick={canEnterCar ? enterCar : undefined}
            style={{
              ...btnBase,
              padding: "10px 32px",
              fontSize: 15,
              borderColor: "#00ff88",
              background: "rgba(0,255,136,0.2)",
              color: "#00ff88",
              pointerEvents: "auto",
              width: "auto",
              height: "auto",
              flexDirection: "row",
            }}
          >
            🚗 ENTER CAR
          </button>
        </div>
      )}

      {/* Exit car button */}
      {inCar && (
        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          {/* Current car label */}
          <div
            style={{
              color: carColor,
              fontFamily: "monospace",
              fontSize: 14,
              fontWeight: 700,
              background: "rgba(0,0,0,0.6)",
              padding: "4px 16px",
              borderRadius: 8,
            }}
          >
            🚗 IN CAR
          </div>
          <button
            type="button"
            data-ocid="game.exit.button"
            onClick={exitCar}
            style={{
              ...btnBase,
              padding: "10px 36px",
              fontSize: 15,
              borderColor: "#ff6644",
              background: "rgba(255,100,68,0.25)",
              color: "#ff8866",
              pointerEvents: "auto",
              width: "auto",
              height: "auto",
              flexDirection: "row",
            }}
          >
            🚪 EXIT CAR
          </button>
        </div>
      )}

      {/* Touch Controls */}
      <TouchControls joystickRef={joystickRef} />

      {/* Controls hint */}
      <div
        data-ocid="game.controls.panel"
        style={{
          position: "absolute",
          top: 180,
          left: 16,
          background: "rgba(0,0,0,0.5)",
          border: "1px solid rgba(100,180,255,0.2)",
          borderRadius: 10,
          padding: "8px 12px",
          color: "#88aacc",
          fontFamily: "monospace",
          fontSize: 10,
          lineHeight: 1.8,
          backdropFilter: "blur(4px)",
          userSelect: "none",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            color: "#e8f4ff",
            fontWeight: 700,
            marginBottom: 4,
            fontSize: 11,
          }}
        >
          {inCar ? "🚗 IN CAR" : "🚶 ON FOOT"}
        </div>
        <div>
          <span style={{ color: "#fff" }}>W/S</span>{" "}
          {inCar ? "Gas/Brake" : "Walk fwd/bk"}
        </div>
        <div>
          <span style={{ color: "#fff" }}>A/D</span> {inCar ? "Steer" : "Turn"}
        </div>
        <div>
          <span style={{ color: "#fff" }}>E</span>{" "}
          {inCar ? "Exit car" : "Enter car"}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          bottom: 4,
          left: "50%",
          transform: "translateX(-50%)",
          color: "rgba(100,140,200,0.35)",
          fontSize: 9,
          fontFamily: "system-ui, sans-serif",
          pointerEvents: "none",
          whiteSpace: "nowrap",
        }}
      >
        © {new Date().getFullYear()} Built with ❤️ using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
          style={{ color: "rgba(100,180,255,0.45)", pointerEvents: "auto" }}
          target="_blank"
          rel="noreferrer"
        >
          caffeine.ai
        </a>
      </div>
    </div>
  );
}
