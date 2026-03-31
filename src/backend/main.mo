import HashMap "mo:base/HashMap";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Principal "mo:base/Principal";
import Nat32 "mo:base/Nat32";
import Int "mo:base/Int";

persistent actor {
  type PlayerState = {
    id: Text;
    name: Text;
    x: Float;
    y: Float;
    z: Float;
    rotation: Float;
    roomCode: Text;
    lastSeen: Int;
  };

  type Room = {
    code: Text;
    createdAt: Int;
  };

  // Stable storage for upgrade persistence
  var playerEntries : [(Text, PlayerState)] = [];
  var roomEntries : [(Text, Room)] = [];

  // Runtime HashMaps (non-stable, rebuilt on upgrade)
  transient var players = HashMap.fromIter<Text, PlayerState>(playerEntries.vals(), 16, Text.equal, Text.hash);
  transient var rooms = HashMap.fromIter<Text, Room>(roomEntries.vals(), 8, Text.equal, Text.hash);

  system func preupgrade() {
    playerEntries := Iter.toArray(players.entries());
    roomEntries := Iter.toArray(rooms.entries());
  };

  system func postupgrade() {
    playerEntries := [];
    roomEntries := [];
  };

  func makeRoomCode(seed: Nat32) : Text {
    let chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let charArr = Text.toArray(chars);
    var code = "";
    var n = seed;
    var i : Nat = 0;
    while (i < 6) {
      let idx = Nat32.toNat(n % 32);
      code := code # Text.fromChar(charArr[idx]);
      n := n / 32 +% Nat32.fromNat(i * 7919);
      i += 1;
    };
    code
  };

  public shared(msg) func createRoom(playerName: Text) : async Text {
    let pid = Principal.toText(msg.caller);
    let seed = Principal.hash(msg.caller) +% Nat32.fromNat(Int.abs(Time.now()) % 0xFFFFFFFF);
    let roomCode = makeRoomCode(seed);
    rooms.put(roomCode, { code = roomCode; createdAt = Time.now() });
    players.put(pid, {
      id = pid; name = playerName;
      x = 0.0; y = 0.0; z = 0.0; rotation = 0.0;
      roomCode = roomCode; lastSeen = Time.now();
    });
    roomCode
  };

  public shared(msg) func joinRoom(roomCode: Text, playerName: Text) : async Bool {
    let pid = Principal.toText(msg.caller);
    switch (rooms.get(roomCode)) {
      case null { false };
      case (?_) {
        players.put(pid, {
          id = pid; name = playerName;
          x = 0.0; y = 0.0; z = 0.0; rotation = 0.0;
          roomCode = roomCode; lastSeen = Time.now();
        });
        true
      };
    }
  };

  public shared(msg) func updatePosition(x: Float, y: Float, z: Float, rotation: Float) : async () {
    let pid = Principal.toText(msg.caller);
    switch (players.get(pid)) {
      case null {};
      case (?p) {
        players.put(pid, {
          id = p.id; name = p.name;
          x = x; y = y; z = z; rotation = rotation;
          roomCode = p.roomCode; lastSeen = Time.now();
        });
      };
    }
  };

  public query func getPlayersInRoom(roomCode: Text) : async [PlayerState] {
    let cutoff = Time.now() - 15_000_000_000;
    Array.filter<PlayerState>(Iter.toArray(players.vals()), func(p) {
      p.roomCode == roomCode and p.lastSeen > cutoff
    })
  };

  public shared(msg) func leaveRoom() : async () {
    players.delete(Principal.toText(msg.caller));
  };

  public shared query(msg) func getMyPlayer() : async ?PlayerState {
    players.get(Principal.toText(msg.caller))
  };

  public query func roomExists(roomCode: Text) : async Bool {
    switch (rooms.get(roomCode)) {
      case null { false };
      case (?_) { true };
    }
  };
}
