import Map "mo:core/Map";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Int "mo:core/Int";
import Migration "migration";

(with migration = Migration.run)
actor {
  type PlayerState = {
    id : Text;
    name : Text;
    x : Float;
    y : Float;
    z : Float;
    rotation : Float;
    roomCode : Text;
    lastSeen : Int;
  };

  type Room = {
    code : Text;
    createdAt : Int;
  };

  let players = Map.empty<Text, PlayerState>();
  let rooms = Map.empty<Text, Room>();

  // Generate a 6-character room code from a Nat seed
  func makeRoomCode(seed : Nat) : Text {
    let chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let charArr = chars.toArray();
    var code = "";
    var n = seed;
    var i : Nat = 0;
    while (i < 6) {
      let idx = n % 32;
      code := code # Text.fromChar(charArr[idx]);
      n := (n / 32 + i * 7919) % 0x100000000;
      i += 1;
    };
    code;
  };

  public shared (msg) func createRoom(playerName : Text) : async Text {
    let pid = msg.caller.toText();
    let seed = Int.abs(Time.now()) % 0xFFFFFFFF;
    let roomCode = makeRoomCode(seed);
    rooms.add(roomCode, { code = roomCode; createdAt = Time.now() });
    players.add(pid, {
      id = pid;
      name = playerName;
      x = 0.0;
      y = 0.0;
      z = 0.0;
      rotation = 0.0;
      roomCode = roomCode;
      lastSeen = Time.now();
    });
    roomCode;
  };

  public shared (msg) func joinRoom(roomCode : Text, playerName : Text) : async Bool {
    let pid = msg.caller.toText();
    switch (rooms.get(roomCode)) {
      case null { false };
      case (?_) {
        players.add(pid, {
          id = pid;
          name = playerName;
          x = 0.0;
          y = 0.0;
          z = 0.0;
          rotation = 0.0;
          roomCode = roomCode;
          lastSeen = Time.now();
        });
        true;
      };
    };
  };

  public shared (msg) func updatePosition(x : Float, y : Float, z : Float, rotation : Float) : async () {
    let pid = msg.caller.toText();
    switch (players.get(pid)) {
      case null {};
      case (?p) {
        players.add(pid, {
          p with
          x = x;
          y = y;
          z = z;
          rotation = rotation;
          lastSeen = Time.now();
        });
      };
    };
  };

  public query func getPlayersInRoom(roomCode : Text) : async [PlayerState] {
    let cutoff = Time.now() - 15_000_000_000;
    players.values()
      .filter(func(p : PlayerState) : Bool {
        p.roomCode == roomCode and p.lastSeen > cutoff
      })
      .toArray();
  };

  public shared (msg) func leaveRoom() : async () {
    players.remove(msg.caller.toText());
  };

  public shared query (msg) func getMyPlayer() : async ?PlayerState {
    players.get(msg.caller.toText());
  };

  public query func roomExists(roomCode : Text) : async Bool {
    switch (rooms.get(roomCode)) {
      case null { false };
      case (?_) { true };
    };
  };
};
