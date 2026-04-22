module {
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

  type OldActor = {
    var playerEntries : [(Text, PlayerState)];
    var roomEntries : [(Text, Room)];
  };

  // Discard old stable arrays — actor now uses mo:core Maps which persist natively
  public func run(_old : OldActor) : {} {
    {};
  };
};
