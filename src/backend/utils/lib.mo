import Hash "mo:base/Hash";
import Array "mo:base/Array";
import Principal "mo:base/Principal";
import Char "mo:base/Char";
import Blob "mo:base/Blob";
import Buffer "mo:base/Buffer";
import Nat8 "mo:base/Nat8";
import SHA224 "./SHA224";
import CRC32 "./CRC32";
import SHA256 "./SHA256";
import HashMap "mo:base/HashMap";
import Nat "mo:base/Nat";
import Option "mo:base/Option";
import Nat32 "mo:base/Nat32";
import Iter "mo:base/Iter";
import Text "mo:base/Text";
import Trie "mo:base/Trie";
import Nat64 "mo:base/Nat64";
import Error "mo:base/Error";
import Types "../types";
import UtilTypes "./types";
import Hex "hex";
import IC "ic:aaaaa-aa";
import Cycles "mo:base/ExperimentalCycles";
import Source "mo:uuid/async/SourceV4";
import UUID "mo:uuid/UUID";

module {
  private type Key<K> = Trie.Key<K>;
	private let symbols = [
			'0', '1', '2', '3', '4', '5', '6', '7',
			'8', '9', 'a', 'b', 'c', 'd', 'e', 'f',
	];
	private let base : Nat8 = 0x10;

	/// Convert bytes array to hex string.       
	/// E.g `[255,255]` to "ffff"
	private func encode(array : [Nat8]) : Text {
			Array.foldLeft<Nat8, Text>(array, "", func (accum, u8) {
					accum # nat8ToText(u8);
			});
	};

	/// Convert a byte to hex string.
	/// E.g `255` to "ff"
	private func nat8ToText(u8: Nat8) : Text {
			let c1 = symbols[Nat8.toNat((u8/base))];
			let c2 = symbols[Nat8.toNat((u8%base))];
			return Char.toText(c1) # Char.toText(c2);
	};

	/// Return the account identifier of the Principal.
	public func accountToText(account : Types.Account) : Text {
		let digest = SHA224.Digest();
		digest.write([10, 97, 99, 99, 111, 117, 110, 116, 45, 105, 100]:[Nat8]); // b"\x0Aaccount-id"
		let blob = Principal.toBlob(account.owner);
		digest.write(Blob.toArray(blob));

		let effectiveSubaccount : Blob = switch (account.subaccount) {
			case null Blob.fromArray([]);
			case (?_elem) _elem;
		};

		digest.write(Blob.toArray(effectiveSubaccount)); // subaccount

		let hash_bytes = digest.sum();

		let crc = CRC32.crc32(hash_bytes);
		let aid_bytes = Array.append<Nat8>(crc, hash_bytes);

		return encode(aid_bytes);
	};

	public func pushIntoArray<X>(elem: X, array: [X]) : [X] {
		let buffer = Buffer.fromArray<X>(array);
    buffer.add(elem);
		return Buffer.toArray(buffer);
	};

	public func nullishCoalescing<X>(elem: ?X, default: X) : X {
		switch(elem) {
      case null return default;
      case (?_elem) return _elem;
    };
	};

	public func compareAccounts(a: Types.Account, b: Types.Account): {#less; #equal; #greater} {
		return Text.compare(accountToText(a), accountToText(b));
	};

  public func keyFromTokenId(t: Types.TokenId): Trie.Key<Types.TokenId> { { hash = Hash.hash t; key = t } };
  public func keyFromListingId(t: Types.ListingId): Trie.Key<Types.ListingId> { { hash = Hash.hash t; key = t } };
  public func keyFromText(t: Text): Key<Text> { { hash = Text.hash t; key = t } };
  public func keyFromTransactionId(t: Types.TransactionId): Key<Types.TransactionId> { { hash = Hash.hash t; key = t } };

  public func getDefaultSubaccount(): Blob {
    return Blob.fromArray([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]);
  };

  public func acceptAccount(account: Types.Account): Types.Account {
    let effectiveSubaccount: Blob = switch (account.subaccount) {
      case null getDefaultSubaccount();
      case (?_elem) _elem;
    };

    return {
      owner = account.owner;
      subaccount = ?effectiveSubaccount;
    };
  };

  public func approveErrorCodeToCode(d: Types.ApproveErrorCode): Nat {
    switch d {
      case (#SelfApproval) 0;
    };
  };

  public func approveErrorCodeToText(d: Types.ApproveErrorCode): Text {
    switch d {
      case (#SelfApproval) "No Self Approvals";
    };
  };

  public func transferErrorCodeToCode(d: Types.TransferErrorCode): Nat {
    switch d {
      case (#EmptyTokenIds) 0;
      case (#DuplicateInTokenIds) 1;
    };
  };

  public func transferErrorCodeToText(d: Types.TransferErrorCode): Text {
    switch d {
      case (#EmptyTokenIds) "Empty Token Ids";
      case (#DuplicateInTokenIds) "Duplicates in Token Ids array";
    };
  };

  public func blobToHex(blob : Blob) : Text {
    let arr = Blob.toArray(blob);
    return Hex.toHex(arr)
  };

  // public func transform({
  //   context : Blob;
  //   response : IC.http_request_result;
  // }) : async IC.http_request_result {
  //   {
  //     response with headers = []; // not intersted in the headers
  //   };
  // };

  public func linkCaiAccount(account: Types.Account, code: Text) : async Types.LinkCaiAccountResult {
    // let host : Text = "charclub-uat.southeastasia.azure.ahihoapis.dev";
    let host : Text = "localhost:2610";
    let url = "http://" # host # "/v1/integration/charm/code:verify";

    Cycles.add<system>(25_000_000_000);

    let accountText = accountToText(account);

    let message_hash: Blob = Blob.fromArray(SHA256.sha256(Blob.toArray(Text.encodeUtf8(accountText))));
    let { signature } = await IC.sign_with_ecdsa({
        message_hash;
        derivation_path = [];
        key_id = { curve = #secp256k1; name = "dfx_test_key" };
    });

    let signature_hex = Hex.encode(Blob.toArray(signature));

    let idempotency_key : Text = await generateUUID();
    let request_headers = [
      { name = "User-Agent"; value = "http_post_sample" },
      { name = "Content-Type"; value = "application/json" },
      { name = "Idempotency-Key"; value = idempotency_key },
    ];
    let request_body_json : Text = "{ \"accountIdentifier\" : \"" # accountText # "\", \"signature\" : \"" # signature_hex # "\", \"code\" : \"" # code # "\" }";
    let request_body = Text.encodeUtf8(request_body_json);

    Cycles.add<system>(25_000_000_000);
    let http_request : IC.http_request_args = {
      url = url;
      max_response_bytes = null;
      headers = request_headers;
      body = ?request_body;
      method = #post;
      transform = null;
    };

    let http_response: IC.http_request_result = await IC.http_request(http_request);

    let decoded_text : Text = switch (Text.decodeUtf8(http_response.body)) {
      case (null) { return #Err(#NotFound) };
      case (?y) {
        switch (http_response.status) {
          case (401) { return #Err(#Unauthorized) };
          case (404) { return #Err(#NotFound) };
          case (500) { return #Err(#InternalError(y)) };
          case _ { y };
        };
      };
    };

    return #Ok(decoded_text);
  };

  private func generateUUID() : async Text {
    let g = Source.Source();
    return UUID.toText(await g.new());
  };
}
