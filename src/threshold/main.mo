import {
  Array_tabulate;
  Array_init;
  call_raw;
  debugPrint;
  principalOfActor;
  nat64ToNat;
  time = nanos1970;
  trap = trapWith;
} = "mo:⛔";

import IC "ic:aaaaa-aa";

actor class (signers : [Principal]) = threshold {
  type Id = Nat;
  type Timestamp = Nat;
  type Payload = (Principal, Text, Blob);
  type Vote = (Timestamp, Principal);
  type State = {
    active : Bool;
    yes : Nat;
    no : Nat;
    votes : [Vote];
    result : ?Blob;
  };
  type Prop = {
    id : Id;
    memo : Text;
    signers : [Principal];
    var state : State;
    payload : Payload;
  };

  type CanisterInstallMode = IC.canister_install_mode;
  type InstallCodeArgs = IC.install_code_args;

  // criterion for valid signers
  func sanitiseSigners(signers : [Principal]) : [Principal] {
    assert signers.size() > 1;
    // no duplicates allowed
    let sanitised = Array_init<?Principal>(signers.size(), null);
    var curr = 0;
    for (s in signers.vals()) {
      let signer = ?s;
      var prev = 0;
      while (prev < curr) {
        assert signer != sanitised[prev];
        prev += 1;
      };
      sanitised[prev] := signer;
      curr += 1;
    };
    signers;
  };

  stable var serial = 0;
  stable var authorised : [Principal] = sanitiseSigners signers;
  stable var proposals : [Prop] = [];

  public shared ({ caller }) func submit(memo : Text, payload : Payload) : async Nat {
    authorise caller;
    serial += 1;
    let ?votes = vote(caller, []) else trap();
    let state = { active = true; yes = 1; no = 0; votes; result = null };
    proposals := prepend<Prop>({ id = serial; memo; signers = authorised; var state; payload }, proposals);
    serial;
  };

  public shared ({ caller }) func accept(id : Id) : async Text {
    for (prop in proposals.vals()) {
      let { id = currentId; payload; signers } = prop;
      if (id == currentId) {
        authoriseAccording(caller, signers);
        let { active; yes; votes } = prop.state;
        switch (active, vote(caller, votes)) {
          case (true, ?votes) {
            prop.state := { prop.state with yes = yes + 1; votes };
            // voting threshold reached
            if (2 * prop.state.yes > signers.size()) {
              // retire the proposal
              prop.state := { prop.state with active = false };
              // execute payload and keep result in the state
              await* execute(prop, payload);
              return "Proposal executed";
            } else {
              return "Proposal accepted";
            };
          };
          case(false, _) {
            return "Proposal not active"
          };
          case _ {
            return "Invalid vote"
          };
        };
      };
    };

    return "Proposal not found";
  };

  public shared ({ caller }) func reject(id : Id) : async Text {
    for (prop in proposals.vals()) {
      let { id = currentId; signers } = prop;
      if (id == currentId) {
        authoriseAccording(caller, signers);
        let { active; no; votes } = prop.state;
        switch (active, vote(caller, votes)) {
          case (true, ?votes) {
            let state = { prop.state with no = no + 1; votes };
            let rejected = 2 * state.no >= signers.size();
            prop.state := { state with active = not rejected };
            return if (rejected) "Proposal rejected" else "Rejection submitted";
          };
          case(false, _) {
            return "Proposal not active"
          };
          case _ {
            return "Invalid vote"
          };
        };
      };
    };

    return "Proposal not found";
  };

  public shared ({ caller }) func prune() : async () {
    self caller;
    proposals := filter(func(p : Prop) : Bool = p.state.active, proposals);
  };

  public shared ({ caller }) func setSigners(authlist : [Principal]) : async () {
    self caller;
    authorised := sanitiseSigners authlist;
  };

  public shared ({ caller }) func getSigners() : async [Principal] {
    authorise caller;
    authorised;
  };

  type Proposal = { id : Id; memo : Text; state : State; payload : Payload };
  // authorised principals can retrieve proposals (in reverse creation order)
  // `newest` (when given) specifies the newest proposal the caller is interested in
  // `count` (when given) specifies the number of proposals returned (defaults to 10)
  public shared ({ caller }) func getProposals({
    newest : ?Id;
    count : ?Nat;
  }) : async [Proposal] {
    let defaultCount = 10;
    authorise caller;
    let allProposals = Array_tabulate<Proposal>(proposals.size(), func i = { proposals[i] with state = proposals[i].state });
    var go : Int = switch count {
      case (?count) count;
      case null defaultCount;
    };
    filter<Proposal>(
      func proposal {
        go -= 1;
        switch newest {
          // keep `go` many IDs older or equal to `newest`
          case (?newest) proposal.id <= newest and go >= 0;
          case null go >= 0;
        };
      },
      allProposals,
    );
  };

  public shared ({ caller }) func getProposal(id : Id) : async ?Proposal {
    for (prop in proposals.vals()) {
      if (prop.id == id) {
        authoriseAccording(caller, prop.signers);
        return ?{ prop with state = prop.state };
      };
    };
    null;
  };

  // traps when `principal` is not in the given `according` principals list
  func authoriseAccording(principal : Principal, according : [Principal]) {
    for (a in according.vals()) {
      if (principal == a) return;
    };
    debug {
      debugPrint(debug_show ("cannot authorise", principal));
    };
    assert false;
  };

  // traps when `principal` is not in the `authorised` list
  func authorise(principal : Principal) = authoriseAccording(principal, authorised);

  // traps when `principal` is not this actor
  func self(principal : Principal) {
    assert principal == principalOfActor threshold;
  };

  // internal helper
  private func execute(prop : Prop, (principal, method, blob) : Payload) : async* () {
    switch (isCanisterUpgrade(principal, method, blob)) {
      case (?params) {
        let acceptedParams: InstallCodeArgs = {
          params with 
          sender_canister_version = null
        };
        await IC.install_code(acceptedParams);
      };
      case _ {
        let res = await call_raw(principal, method, blob);
        prop.state := { prop.state with result = ?res };
      };
    };
  };

  // utilities
  func prepend<A>(element : A, elements : [A]) : [A] = Array_tabulate<A>(elements.size() + 1, func i = if (i == 0) element else elements[i - 1]);

  func filter<A>(predicate : A -> Bool, elements : [A]) : [A] {
    var numHits = 0;
    let filtered = Array_init<?A>(elements.size(), null);
    for (element in elements.vals()) {
      if (predicate element) { filtered[numHits] := ?element; numHits += 1 };
    };
    Array_tabulate<A>(numHits, func i { let ?unpacked = filtered[i] else trap(); unpacked });
  };

  // helpers
  type InstallParams = {
    mode : { #install; #reinstall; #upgrade : ?{ skip_pre_upgrade: ?Bool; wasm_memory_persistence : ?{#keep; #replace} } };
    canister_id : Principal;
    wasm_module : Blob;
    arg : Blob;
  };

  func isCanisterUpgrade((addressee, method, args) : Payload) : ?InstallParams {
    if (addressee == principalOfActor(IC) and method == "install_code") {
      do ? {
        let params: InstallParams = (from_candid (args) : ?InstallParams)!;

        params;
      };
    } else {
      null;
    };
  };

  func now() : Timestamp = nat64ToNat(nanos1970()) / 1_000_000_000; // seconds since 1970-01-01

  func vote(signer : Principal, votes : [Vote]) : ?[Vote] {
    for ((_, principal) in votes.vals()) {
      if (principal == signer) return null;
    };
    ?prepend((now(), signer), votes);
  };

  func trap() : None = trapWith "unexpected";
};
