import Text "mo:base/Text";
import Iter "mo:base/Iter";
import Nat8 "mo:base/Nat8";
import Array "mo:base/Array";
import Char "mo:base/Char";
import Prim "mo:⛔";

// https://github.com/crusso/motoko-hex/blob/0.6/src/Hex.mo
// https://github.com/ninegua/tipjar/blob/main/src/tipjar/Util.mo#L145

module {
  let hexChars = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"];
  private let base : Nat8 = 0x10;

  public func toHex(arr : [Nat8]) : Text {
    Text.join(
      "",
      Iter.map<Nat8, Text>(
        Iter.fromArray(arr),
        func(x : Nat8) : Text {
          let a = Nat8.toNat(x / 16);
          let b = Nat8.toNat(x % 16);
          hexChars[a] # hexChars[b]
        },
      ),
    )
  };

  public func encode(array : [Nat8]) : Text {
    let encoded = Array.foldLeft<Nat8, Text>(array, "", func (accum, w8) {
      accum # encodeW8(w8);
    });
    // encode as lowercase
    return Text.map(encoded, Prim.charToLower);
  };

  /**
   * Encode an unsigned 8-bit integer in hexadecimal format.
   */
  private func encodeW8(w8 : Nat8) : Text {
    let c1 = hexChars[Nat8.toNat(w8 / base)];
    let c2 = hexChars[Nat8.toNat(w8 % base)];
    return c1 # c2;
  };

}
