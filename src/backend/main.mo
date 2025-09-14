import Types "./types";
import Principal "mo:base/Principal";
import Trie "mo:base/Trie";
import Nat "mo:base/Nat";
import Nat64 "mo:base/Nat64";
import Time "mo:base/Time";
import Buffer "mo:base/Buffer";
import Array "mo:base/Array";
import Text "mo:base/Text";
import HashMap "mo:base/HashMap";
import Hash "mo:base/Hash";
import Error "mo:base/Error";
import Blob "mo:base/Blob";
import Utils "./utils";
import IcpLedger "canister:icp_ledger_canister";
import IC "ic:aaaaa-aa";

shared actor class Charclub(collectionOwner: Types.Account) = Self {
  private stable var owner: Types.Account = collectionOwner;
  private stable var name: Text = "Charclub";
  private stable var symbol: Text = "CAI";
  private stable var description: ?Text = null;
  private stable var image: ?Blob = null;
  private stable var supplyCap: ?Nat = null;
  private stable var totalSupply: Nat = 0;
  private stable var transferSequentialIndex: Nat = 0;
  private stable var approvalSequentialIndex: Nat = 0;
  private stable var listingSequentialIndex: Types.ListingId = 0;
  private stable var transactionSequentialIndex: Nat = 0;
  private stable var nextTokenId: Types.TokenId = 1;

  private var NULL_PRINCIPAL: Principal = Principal.fromText("aaaaa-aa");
  private var PERMITTED_DRIFT : Nat64 = 2 * 60 * 1_000_000_000; // 2 minutes in nanoseconds
  private var TX_WINDOW : Nat64 = 5 * 60 * 1_000_000_000; // 5 minutes in nanoseconds

  ///////////////////
  // Mapping       //
  ///////////////////
  private stable var caiAccounts: Trie.Trie<Types.AccountIdentifier, Types.CaiId> = Trie.empty();

  private stable var listingTokens: Trie.Trie<Types.TokenId, Types.Listing> = Trie.empty();

  private stable var buyOrders: Trie.Trie<Types.ListingId, Types.BuyOrder> = Trie.empty();

  private stable var tokens: Trie.Trie<Types.TokenId, Types.TokenMetadata> = Trie.empty(); 

  private stable var owners: Trie.Trie<Types.AccountIdentifier, [Types.TokenId]> = Trie.empty();

  private stable var balances: Trie.Trie<Types.AccountIdentifier, Nat> = Trie.empty();

  private stable var tokenApprovals: Trie.Trie<Types.TokenId, [Types.TokenApproval]> = Trie.empty();

  private stable var transactions: Trie.Trie<Types.TransactionId, Types.Transaction> = Trie.empty(); 

  private stable var transactionsByAccount: Trie.Trie<Types.AccountIdentifier, [Types.TransactionId]> = Trie.empty(); 

  private stable var transactionsByToken: Trie.Trie<Types.TokenId, [Types.TransactionId]> = Trie.empty();

  private stable var operatorApprovals: Trie.Trie<Types.AccountIdentifier, [Types.OperatorApproval]> = Trie.empty();
  ////////////////////

  private func _incrementTransferIndex() {
    transferSequentialIndex := transferSequentialIndex + 1;
  };

  private func _incrementTransactionIndex() {
    transactionSequentialIndex := transactionSequentialIndex + 1;
  };

  private func _incrementApprovalIndex() {
    approvalSequentialIndex := approvalSequentialIndex + 1;
  };

  private func _incrementNextTokenId() {
    nextTokenId := nextTokenId + 1;
  };

  private func _exists(tokenId: Types.TokenId): Bool {
    let tokensResult = Trie.get(tokens, Utils.keyFromTokenId tokenId, Nat.equal);
    switch(tokensResult) {
      case null return false;
      case (?_elem) return true;
    };
  };

  private func _isOwner(spender: Types.Account, tokenId: Types.TokenId): Bool {
    let item = Trie.get(tokens, Utils.keyFromTokenId tokenId, Nat.equal);
    switch (item) {
      case null {
        return false;
      };
      case (?_elem) {
        return Utils.compareAccounts(spender, _elem.owner) == #equal;
      }
    };
  };

  private func _isApproved(spender: Types.Account, tokenId: Types.TokenId, now: Nat64): Bool {
    let item = Trie.get(tokens, Utils.keyFromTokenId tokenId, Nat.equal);

    switch (item) {
      case null {
        return false;
      };
      case (?_elem) {
        let ownerToText: Text = Utils.accountToText(_elem.owner);
        let approvalsByThisOperator: [Types.OperatorApproval] = Utils.nullishCoalescing<[Types.OperatorApproval]>(Trie.get(operatorApprovals, Utils.keyFromText ownerToText, Text.equal), []);

        let approvalForThisSpender = Array.find<Types.OperatorApproval>(approvalsByThisOperator, func x = Utils.compareAccounts(spender, x.spender) == #equal and (x.expires_at == null or Nat64.greater(Utils.nullishCoalescing<Nat64>(x.expires_at, 0), now)));

        switch (approvalForThisSpender) {
          case (?_foundOperatorApproval) return true;
          case null {
            let approvalsForThisToken: [Types.TokenApproval] = Utils.nullishCoalescing<[Types.TokenApproval]>(Trie.get(tokenApprovals, Utils.keyFromTokenId tokenId, Nat.equal), []);
            let approvalForThisToken = Array.find<Types.TokenApproval>(approvalsForThisToken, func x = Utils.compareAccounts(spender, x.spender) == #equal and (x.expires_at == null or Nat64.greater(Utils.nullishCoalescing<Nat64>(x.expires_at, 0), now)));
            switch (approvalForThisToken) { 
              case (?_foundTokenApproval) return true;
              case null return false;
            }

          };
        };

        return false;
      }
    };
  };

  private func _updateToken(tokenId: Types.TokenId, newOwner: ?Types.Account, newMetadata: ?[(Text, Types.Metadata)]) {
    let item = Trie.get(tokens, Utils.keyFromTokenId tokenId, Nat.equal);

    switch (item) {
      case null {
        return;
      };
      case (?_elem) {
        //update owner
        let newToken: Types.TokenMetadata = {
          tokenId = _elem.tokenId;
          owner = Utils.nullishCoalescing<Types.Account>(newOwner, _elem.owner);
          metadata = Utils.nullishCoalescing<[(Text, Types.Metadata)]>(newMetadata, _elem.metadata);
        };

        //update the token metadata
        tokens := Trie.put(tokens, Utils.keyFromTokenId tokenId, Nat.equal, newToken).0;
        return;
      }
    };
  };



  private func _isApprovedOrOwner(spender: Types.Account, tokenId: Types.TokenId, now: Nat64): Bool {
    return _isOwner(spender, tokenId) or _isApproved(spender, tokenId, now);
  };

  private func _addTokenToOwners(account: Types.Account, tokenId: Types.TokenId) {
    let textAccount: Text = Utils.accountToText(account);

    //find the tokens owned by an account, in order to add the new one
    let newOwners = Utils.nullishCoalescing<[Types.TokenId]>(Trie.get(owners, Utils.keyFromText textAccount, Text.equal), []);

    //add the token id
    owners := Trie.put(owners, Utils.keyFromText textAccount, Text.equal, Utils.pushIntoArray<Types.TokenId>(tokenId, newOwners)).0;
  };

  private func _removeTokenFromOwners(account: Types.Account, tokenId: Types.TokenId) {
    let textAccount: Text = Utils.accountToText(account);

    //find the tokens owned by an account, in order to add the new one
    let newOwners = Utils.nullishCoalescing<[Types.TokenId]>(Trie.get(owners, Utils.keyFromText textAccount, Text.equal), []);

    let updated: [Types.TokenId] = Array.filter<Types.TokenId>(newOwners, func x = x != tokenId);

    //add the token id
    owners := Trie.put(owners, Utils.keyFromText textAccount, Text.equal, updated).0;
  };

  private func _incrementBalance(account: Types.Account) {
    let textAccount: Text = Utils.accountToText(account);

    //find the balance of an account, in order to increment
    let balanceResult = Trie.get(balances, Utils.keyFromText textAccount, Text.equal);

    let actualBalance: Nat = switch(balanceResult) {
      case null 0;
      case (?_elem) _elem;
    };

    //update the balance
    balances := Trie.put(balances, Utils.keyFromText textAccount, Text.equal, actualBalance + 1).0;
  };

  private func _decrementBalance(account: Types.Account) {
    let textAccount: Text = Utils.accountToText(account);

    //find the balance of an account, in order to increment
    let balanceResult = Trie.get(balances, Utils.keyFromText textAccount, Text.equal);

    let actualBalance: Nat = Utils.nullishCoalescing<Nat>(balanceResult, 0);

    //update the balance
    if (actualBalance > 0) {
      balances := Trie.put(balances, Utils.keyFromText textAccount, Text.equal, actualBalance - 1).0;
    }
  };

  //increment the total supply
  private func _incrementTotalSupply(quantity: Nat) {
    totalSupply := totalSupply + quantity;
  };

  // private func _transferICP(args: Types.TransferICPArgs) {
  //
  // };

  private func _singleTransfer(caller: ?Types.Account, from: Types.Account, to: Types.Account, tokenId: Types.TokenId, dryRun: Bool, now: Nat64): ?Types.TransferError {
    //check if token exists
    if (_exists(tokenId) == false) {
      return ?#Unauthorized({
        token_ids = [tokenId];
      });
    };

    //check if caller is owner or approved to transferred token
    switch(caller) {
      case null {};
      case (?_elem) {
        if (_isApprovedOrOwner(_elem, tokenId, now) == false) {
          return ?#Unauthorized({
            token_ids = [tokenId];
          });
        };
      }
    };

    //check if the from is owner of transferred token
    if (_isOwner(from, tokenId) == false) {
      return ?#Unauthorized({
        token_ids = [tokenId];
      });
    };

    if (dryRun == false) {
      _deleteAllTokenApprovals(tokenId);
      _removeTokenFromOwners(from, tokenId);
      _decrementBalance(from);

      //change the token owner
      _updateToken(tokenId, ?to, null);

      _addTokenToOwners(to, tokenId);
      _incrementBalance(to);
    };

    return null;
  };

  private func _deleteAllTokenApprovals(tokenId: Types.TokenId) {
    tokenApprovals := Trie.remove(tokenApprovals, Utils.keyFromTokenId tokenId, Nat.equal).0;
  };

  private func _addTransactionIdToToken(transactionId: Types.TransactionId, tokenId: Types.TokenId) {
    let tokenIdTransactions: [Types.TransactionId] = Utils.nullishCoalescing<[Types.TransactionId]>(Trie.get(transactionsByToken, Utils.keyFromTokenId tokenId, Nat.equal), []);

    transactionsByToken := Trie.put(transactionsByToken, Utils.keyFromTokenId tokenId, Nat.equal, Utils.pushIntoArray<Types.TransactionId>(transactionId, tokenIdTransactions)).0;
  };

  private func _addTransactionIdToAccount(transactionId: Types.TransactionId, account: Types.Account) {
    let accountText: Text = Utils.accountToText(Utils.acceptAccount(account));
    let accountTransactions: [Types.TransactionId] = Utils.nullishCoalescing<[Types.TransactionId]>(Trie.get(transactionsByAccount, Utils.keyFromText accountText, Text.equal), []);
    transactionsByAccount := Trie.put(transactionsByAccount, Utils.keyFromText accountText, Text.equal, Utils.pushIntoArray<Types.TransactionId>(transactionId, accountTransactions)).0;
  };

  private func _addTransaction(
    kind: {#mint; #icrc7_transfer; #icrc7_approve},
    timestamp: Nat64,
    tokenIds: ?[Types.TokenId],
    to: ?Types.Account,
    from: ?Types.Account,
    spender: ?Types.Account,
    memo: ?Nat64,
    createdAtTime: ?Nat64,
    expiresAt: ?Nat64
  ) : Types.Transaction {
    let transactionId: Types.TransactionId = transactionSequentialIndex;
    _incrementTransactionIndex();

    let acceptedTo = Utils.nullishCoalescing<Types.Account>(to, Utils.acceptAccount({owner = NULL_PRINCIPAL; subaccount = ?Utils.getDefaultSubaccount()}));
    let acceptedFrom = Utils.nullishCoalescing<Types.Account>(from, Utils.acceptAccount({owner = NULL_PRINCIPAL; subaccount = ?Utils.getDefaultSubaccount()}));
    let acceptedSpender = Utils.nullishCoalescing<Types.Account>(spender, Utils.acceptAccount({owner = NULL_PRINCIPAL; subaccount = ?Utils.getDefaultSubaccount()}));

    let transaction: Types.Transaction = switch kind {
      case (#mint) {
        {
          kind = "mint";
          timestamp = timestamp;
          mint = ?{
            to = acceptedTo;
            token_ids = Utils.nullishCoalescing<[Types.TokenId]>(tokenIds, []);
          };
          icrc7_transfer = null;
          icrc7_approve = null;
        };
      };
      case (#icrc7_transfer) {
        {
          kind = "icrc7_transfer";
          timestamp = timestamp;
          mint = null;
          icrc7_transfer = ?{
            from = acceptedFrom;
            to = acceptedTo;
            spender = ?acceptedSpender;
            token_ids = Utils.nullishCoalescing<[Types.TokenId]>(tokenIds, []);
            memo = memo;
            created_at_time = createdAtTime;
          };
          icrc7_approve = null;
        };
      };
      case (#icrc7_approve) {
        {
          kind = "icrc7_approve";
          timestamp = timestamp;
          mint = null;
          icrc7_transfer = null;
          icrc7_approve = ?{
            from = acceptedFrom;
            spender = acceptedSpender;
            token_ids = tokenIds;
            expires_at = expiresAt;
            memo = memo;
            created_at_time = createdAtTime;
          };
        };
      };
    };

    transactions := Trie.put(transactions, Utils.keyFromTransactionId transactionId, Nat.equal, transaction).0;

    switch kind {
      case (#mint) {
        _addTransactionIdToAccount(transactionId, acceptedTo);
        for (x in Utils.nullishCoalescing(tokenIds, []).vals()) {
          _addTransactionIdToToken(transactionId, x);
        }
      };
      case (#icrc7_transfer) {
        for (x in Utils.nullishCoalescing(tokenIds, []).vals()) {
          _addTransactionIdToToken(transactionId, x);
        };
        _addTransactionIdToAccount(transactionId, acceptedTo);
        if (from != null) {
          if (Utils.compareAccounts(acceptedFrom, acceptedTo) != #equal) {
            _addTransactionIdToAccount(transactionId, acceptedFrom);
          }
        };
        if (spender != null) {
          if (Utils.compareAccounts(acceptedSpender, acceptedTo) != #equal and Utils.compareAccounts(acceptedSpender, acceptedFrom) != #equal) {
            _addTransactionIdToAccount(transactionId, acceptedSpender);
          };
        };
      };
      case (#icrc7_approve) {
        _addTransactionIdToAccount(transactionId, acceptedFrom);
      };
    };

    return transaction;
  };

  private func _createApproval(from: Types.Account, spender: Types.Account, tokenIds: [Types.TokenId], expiresAt: ?Nat64, memo: ?Nat64, createdAtTime: ?Nat64) : Types.ApprovalId {
    if (tokenIds.size() == 0) {
      let fromTextAccount: Text = Utils.accountToText(from);
      let approvalsByThisOperator: [Types.OperatorApproval] = Utils.nullishCoalescing<[Types.OperatorApproval]>(Trie.get(operatorApprovals, Utils.keyFromText fromTextAccount, Text.equal), []);
      let newApproval: Types.OperatorApproval = {
        spender = spender;
        memo = memo;
        expires_at = expiresAt;
      };

      //add the updated approval
      operatorApprovals := Trie.put(operatorApprovals, Utils.keyFromText fromTextAccount, Text.equal, Utils.pushIntoArray<Types.OperatorApproval>(newApproval, approvalsByThisOperator)).0;
    } else {
      for (tokenId in tokenIds.vals()) {
        let approvalsForThisToken: [Types.TokenApproval] = Utils.nullishCoalescing<[Types.TokenApproval]>(Trie.get(tokenApprovals, Utils.keyFromTokenId tokenId, Nat.equal), []);
        let newApproval: Types.TokenApproval = {
          spender = spender;
          memo = memo;
          expires_at = expiresAt;
        };
        //add the updated approval
        tokenApprovals := Trie.put(tokenApprovals, Utils.keyFromTokenId tokenId, Nat.equal, Utils.pushIntoArray<Types.TokenApproval>(newApproval, approvalsForThisToken)).0;
      };
    };

    let approvalId: Types.ApprovalId = approvalSequentialIndex;
    _incrementApprovalIndex();

    return approvalId;
  };

  ////////////////////
  // query methods  //
  ////////////////////
  public shared query({caller}) func getCaiId(): async ?Types.CaiId {
    let callerAccount = {
      owner = caller;
      subaccount = ?Utils.getDefaultSubaccount();
    };

    let callerAccountText: Text = Utils.accountToText(callerAccount);

    let id = Trie.get(caiAccounts, Utils.keyFromText callerAccountText, Text.equal);

    return id;
  };
  public shared query func getTokenPricing(tokenId: Types.TokenId) : async Types.GetTokenPricingResult {
    let listing = Trie.get(listingTokens, Utils.keyFromTokenId tokenId, Nat.equal);
    let item = Trie.get(tokens, Utils.keyFromTokenId tokenId, Nat.equal);

    switch (listing) {
      case null {
        return #Err(#NotListed);
      };
      case (?l) {
        switch (item) {
          case null {
            return #Err(#InvalidTokenId);
          };
          case (?_item) {
            if (Utils.compareAccounts(l.owner, _item.owner) != #equal) {
              return #Err(#NotListed);
            };
          }
        };

        return #Ok({
          id = l.id;
          owner = l.owner;
          price = l.price;
          tokenId = l.tokenId;
        });
      };
    };
  };

  public shared query func listTokens(
    prev: ?Types.TokenId,
    limit: ?Nat,
    owner: ?Types.AccountIdentifier,
    tag: ?Text,
    search: ?Text
  ): async [Types.TokenMetadata] {
    var allTokens: [Types.TokenMetadata] = Trie.toArray<Types.TokenId, Types.TokenMetadata, Types.TokenMetadata>(tokens, func (k, v) = v);

    // filters
    if (owner != null) {
      let ?_owner = owner;
      allTokens := Array.filter<Types.TokenMetadata>(allTokens, func (x) = Text.compare(Utils.accountToText(x.owner), _owner) == #equal);
    };

    if (tag != null) {
      let ?_tag = tag;
      allTokens := Array.filter<Types.TokenMetadata>(allTokens, func (x) {
        let tagValue = Array.find<Types.MetadataValue>(x.metadata, func (y) = Text.compare(y.0, "tags") == #equal);
        if (tagValue != null) {
          let ?_tagValue = tagValue;
          switch (_tagValue.1) {
            case (#Array(_v)) {
              let found = Array.find<Types.Metadata>(_v, func (y) {
                switch (y) {
                  case (#Text(_y)) {
                    return Text.compare(_y, _tag) == #equal;
                  };
                  case _ {
                    return false;
                  }
                };
              });
              return found != null;
            };
            case _ {
              return false;
            }
          };
          return true;
        } else {
          return false;
        };
      });
    };

    if (search != null) {
      let ?_search = search;
      let searchLower = Text.toLowercase(_search);
      allTokens := Array.filter<Types.TokenMetadata>(allTokens, func (x) {
        var nameMatch = false;

        let nameValue = Array.find<Types.MetadataValue>(x.metadata, func (y) = Text.compare(y.0, "tokenName") == #equal);
        if (nameValue != null) {
          let ?_nameValue = nameValue;
          switch (_nameValue.1) {
            case (#Text(nameText)) {
              let nameLower = Text.toLowercase(nameText);
              let pattern: Text.Pattern = #text searchLower;
              nameMatch := Text.contains(nameLower, pattern);
            };
            case _ {
              nameMatch := false;
            }
          };
        };

        return nameMatch;
      });
    };

    var prevIndex = 0;

    switch (prev) {
      case null {
        prevIndex := 0;
      };
      case (?_prev) {
        label l for (i in allTokens.keys()) {
          if (allTokens[i].tokenId == _prev) {
            prevIndex := i;
            break l
          }
        }
      }
    };

    var checkedLimit = 20;

    switch (limit) {
      case null {
        checkedLimit := Nat.min(allTokens.size() - prevIndex, 20);
      };
      case (?_limit) {
        checkedLimit := Nat.min(allTokens.size() - prevIndex, _limit);
      }
    };

    let subArray: [Types.TokenMetadata] = Array.subArray<Types.TokenMetadata>(allTokens, prevIndex, checkedLimit);

    return subArray;
  };

  public shared query func icrc7_token_metadata(tokenIds: [Types.TokenId]): async [[(Text, Types.Metadata)]] {
    var returnedMetadatas = Buffer.Buffer<[(Text, Types.Metadata)]>(0);

    for (tokenId in tokenIds.vals()) {
      let item = Trie.get(tokens, Utils.keyFromTokenId tokenId, Nat.equal);
      switch (item) {
        case null {};
        case (?_elem) {
          returnedMetadatas.add(_elem.metadata);
        }
      };
    };

    return Buffer.toArray(returnedMetadatas);
  };

    public shared query func icrc7_owner_of(tokenId: Types.TokenId): async Types.OwnerResult {
    let item = Trie.get(tokens, Utils.keyFromTokenId tokenId, Nat.equal);
    switch (item) {
      case null {
        return #Err(#InvalidTokenId);
      };
      case (?_elem) {
        return #Ok(_elem.owner);
      }
    };
  };

  public shared query func icrc7_balance_of(account: Types.Account): async Types.BalanceResult {
    let acceptedAccount: Types.Account = Utils.acceptAccount(account);
    let accountText: Text = Utils.accountToText(acceptedAccount);
    let item = Trie.get(balances, Utils.keyFromText accountText, Text.equal);
    switch (item) {
      case null {
        return #Ok(0);
      };
      case (?_elem) {
        return #Ok(_elem);
      }
    };
  };

  public shared query func icrc7_tokens_of(account: Types.Account): async Types.TokensOfResult {
    let acceptedAccount: Types.Account = Utils.acceptAccount(account);
    let accountText: Text = Utils.accountToText(acceptedAccount);
    let item = Trie.get(owners, Utils.keyFromText accountText, Text.equal);
    switch (item) {
      case null {
        return #Ok([]);
      };
      case (?_elem) {
        return #Ok(_elem);
      }
    };
  };

  public shared query func get_transactions(getTransactionsArgs: Types.GetTransactionsArgs): async Types.GetTransactionsResult {
    switch (getTransactionsArgs.account) {
      case null {
        switch (getTransactionsArgs.token) {
          case null {
            let allTransactions: [Types.Transaction] = Trie.toArray<Types.TransactionId, Types.Transaction, Types.Transaction>(
              transactions,
              func (k, v) = v
            );

            let checkedOffset = Nat.min(Array.size(allTransactions), getTransactionsArgs.offset);
            let length = Nat.min(getTransactionsArgs.limit, Array.size(allTransactions) - checkedOffset);
            let subArray: [Types.Transaction] = Array.subArray<Types.Transaction>(allTransactions, checkedOffset, length);

            return {
              total = Array.size(allTransactions);
              transactions = subArray;
            };
          };

          case (?_tokenId) {
            var tokenTransactionIds: [Types.TransactionId] = Utils.nullishCoalescing<[Types.TransactionId]>(
              Trie.get(transactionsByToken, Utils.keyFromTokenId _tokenId, Nat.equal),
              []
            );

            tokenTransactionIds := Array.reverse(tokenTransactionIds);

            let checkedOffset = Nat.min(Array.size(tokenTransactionIds), getTransactionsArgs.offset);
            let length = Nat.min(getTransactionsArgs.limit, Array.size(tokenTransactionIds) - checkedOffset);
            let subArray: [Types.TransactionId] = Array.subArray<Types.TransactionId>(tokenTransactionIds, checkedOffset, length);

            let returnedTransactions = Buffer.Buffer<Types.Transaction>(0);

            for (transactionId in subArray.vals()) {
              let transaction = Trie.get(transactions, Utils.keyFromTransactionId transactionId, Nat.equal);
              switch(transaction) {
                case null {};
                case (?_elem) returnedTransactions.add(_elem);
              };
            };

            return {
              total = Array.size(tokenTransactionIds);
              transactions = Buffer.toArray(returnedTransactions);
            };
          }
        };

      };

      case (?_elem) {
        let acceptedAccount: Types.Account = Utils.acceptAccount(_elem);
        let accountText: Text = Utils.accountToText(acceptedAccount);
        let accountTransactions: [Types.TransactionId] = Utils.nullishCoalescing<[Types.TransactionId]>(Trie.get(transactionsByAccount, Utils.keyFromText accountText, Text.equal), []);
        let reversedAccountTransactions: [Types.TransactionId] = Array.reverse(accountTransactions);

        let checkedOffset = Nat.min(Array.size(reversedAccountTransactions), getTransactionsArgs.offset);
        let length = Nat.min(getTransactionsArgs.limit, Array.size(reversedAccountTransactions) - checkedOffset);
        let subArray: [Types.TransactionId] = Array.subArray<Types.TransactionId>(reversedAccountTransactions, checkedOffset, length);
        let returnedTransactions = Buffer.Buffer<Types.Transaction>(0);

        for (transactionId in subArray.vals()) {
          let transaction = Trie.get(transactions, Utils.keyFromTransactionId transactionId, Nat.equal);
          switch(transaction) {
            case null {};
            case (?_elem) returnedTransactions.add(_elem);
          };
        };

        return {
          total = Array.size(reversedAccountTransactions);
          transactions = Buffer.toArray(returnedTransactions);
        };
      };
    };
  };

  public shared query func icrc7_name(): async Text { return name; };
  public shared query func icrc7_symbol(): async Text { return symbol; };
  public shared query func icrc7_royalties(): async ?Nat16 { return null; };
  public shared query func icrc7_royalty_recipient(): async ?Types.Account { return null; };
  public shared query func icrc7_description(): async ?Text { return description; };
  public shared query func icrc7_image(): async ?Blob { return image; };
  public shared query func icrc7_total_supply(): async Nat { return totalSupply; };
  public shared query func icrc7_supply_cap(): async ?Nat { return supplyCap; };
  public shared query func icrc7_collection_metadata(): async Types.CollectionMetadata {
    return {
      name = name;
      symbol = symbol;
      royalties = null;
      royaltyRecipient = null;
      description = description;
      image = image;
      totalSupply = totalSupply;
      supplyCap = supplyCap;
    }
  };
  public shared query func icrc7_supported_standards(): async [Types.SupportedStandard] {
    return [{ name = "ICRC-7"; url = "https://github.com/dfinity/ICRC/ICRCs/ICRC-7" }];
  };
  public shared query func get_collection_owner(): async Types.Account {
    return owner;
  };

  ////////////////////

  ////////////////////
  // update methods //
  ////////////////////
  public shared({ caller }) func icrc7_transfer(transferArgs: Types.TransferArgs): async Types.TransferReceipt {
    let now = Nat64.fromIntWrap(Time.now());

    let callerSubaccount: Types.Subaccount = switch(transferArgs.spender_subaccount) {
      case null Utils.getDefaultSubaccount();
      case (?_elem) _elem;
    };
    let acceptedCaller: Types.Account = Utils.acceptAccount({owner= caller; subaccount=?callerSubaccount});

    let acceptedFrom: Types.Account = switch(transferArgs.from) {
      case null acceptedCaller;
      case (?_elem) Utils.acceptAccount(_elem);
    };

    let acceptedTo: Types.Account = Utils.acceptAccount(transferArgs.to);

    if (transferArgs.created_at_time != null) {
      if (Nat64.less(Utils.nullishCoalescing<Nat64>(transferArgs.created_at_time, 0), now - TX_WINDOW - PERMITTED_DRIFT)) {
        return #Err(#TooOld());
      };

      if (Nat64.greater(Utils.nullishCoalescing<Nat64>(transferArgs.created_at_time, 0), now + PERMITTED_DRIFT)) {
        return #Err(#CreatedInFuture({
          ledger_time = now;
        }));
      };

    };

    if (transferArgs.token_ids.size() == 0) {
      return #Err(#GenericError({
        error_code = Utils.transferErrorCodeToCode(#EmptyTokenIds); 
        message = Utils.transferErrorCodeToText(#EmptyTokenIds);
      }));
    };

    // no duplicates in token ids are allowed
    let duplicatesCheckHashMap = HashMap.HashMap<Types.TokenId, Bool>(5, Nat.equal, Hash.hash);
    for (tokenId in transferArgs.token_ids.vals()) {
      let duplicateCheck = duplicatesCheckHashMap.get(tokenId);
      if (duplicateCheck != null) {
        return #Err(#GenericError({
          error_code = Utils.transferErrorCodeToCode(#DuplicateInTokenIds); 
          message = Utils.transferErrorCodeToText(#DuplicateInTokenIds);
        }));
      }
    };

    let isAtomic: Bool = Utils.nullishCoalescing<Bool>(transferArgs.is_atomic, true);
    if (isAtomic) {
      let errors = Buffer.Buffer<Types.TransferError>(0);
      for (tokenId in transferArgs.token_ids.vals()) {
        let transferResult = _singleTransfer(?acceptedCaller, acceptedFrom, acceptedTo, tokenId, true, now);
        switch (transferResult) {
            case null {};
            case (?_elem) errors.add(_elem);
          };
      };

      //todo errors should be re-processed to aggregate tokenIds in order to have them in a single token_ids array (Unanthorized standard specifications)
      if (errors.size() > 0) {
        return #Err(errors.get(0));
      }
    };

    let transferredTokenIds = Buffer.Buffer<Types.TokenId>(0);
    let errors = Buffer.Buffer<Types.TransferError>(0);
    for (tokenId in transferArgs.token_ids.vals()) {
      let transferResult = _singleTransfer(?acceptedCaller, acceptedFrom, acceptedTo, tokenId, false, now);
      switch (transferResult) {
          case null transferredTokenIds.add(tokenId);
          case (?_elem) errors.add(_elem);
        };
    };

    if (isAtomic) {
      assert(errors.size() == 0);
    };

    if (errors.size() > 0) {
      return #Err(errors.get(0));
    };

    let transferId: Nat = transferSequentialIndex;
    _incrementTransferIndex();

    ignore _addTransaction(#icrc7_transfer, now, ?Buffer.toArray(transferredTokenIds), ?acceptedTo, ?acceptedFrom, ?acceptedCaller, transferArgs.memo, transferArgs.created_at_time, null);

    return #Ok(transferId);
  };

  public shared({ caller }) func icrc7_approve(approvalArgs: Types.ApprovalArgs): async Types.ApprovalReceipt {
    let now = Nat64.fromIntWrap(Time.now());

    let callerSubaccount: Types.Subaccount = switch(approvalArgs.from_subaccount) {
      case null Utils.getDefaultSubaccount();
      case (?_elem) _elem;
    };
    let acceptedFrom: Types.Account = Utils.acceptAccount({owner= caller; subaccount=?callerSubaccount});

    let acceptedSpender: Types.Account = Utils.acceptAccount(approvalArgs.spender);

    if (Utils.compareAccounts(acceptedFrom, acceptedSpender) == #equal) {
      return #Err(#GenericError({
        error_code = Utils.approveErrorCodeToCode(#SelfApproval); 
        message = Utils.approveErrorCodeToText(#SelfApproval);
      }));
    };

    if (approvalArgs.created_at_time != null) {
      if (Nat64.less(Utils.nullishCoalescing<Nat64>(approvalArgs.created_at_time, 0), now - TX_WINDOW - PERMITTED_DRIFT)) {
        return #Err(#TooOld());
      };
    };

    let tokenIds: [Types.TokenId] = switch(approvalArgs.token_ids) {
      case null [];
      case (?_elem) _elem;
    };

    let unauthorizedTokenIds = Buffer.Buffer<Types.ApprovalId>(0);

    for (tokenId in tokenIds.vals()) {
      if (_exists(tokenId) == false) {
        unauthorizedTokenIds.add(tokenId);
      } else if (_isOwner(acceptedFrom, tokenId) == false) { //check if the from is owner of approved token
        unauthorizedTokenIds.add(tokenId);
      };
    };

    if (unauthorizedTokenIds.size() > 0) {
      return #Err(#Unauthorized({
        token_ids = Buffer.toArray(unauthorizedTokenIds);
      }));
    };

    let approvalId: Types.ApprovalId = _createApproval(acceptedFrom, acceptedSpender, tokenIds, approvalArgs.expires_at, approvalArgs.memo, approvalArgs.created_at_time);

    ignore _addTransaction(#icrc7_approve, now, approvalArgs.token_ids, null, ?acceptedFrom, ?acceptedSpender, approvalArgs.memo, approvalArgs.created_at_time, approvalArgs.expires_at);

    return #Ok(approvalId);
  };

  public shared({ caller }) func mint(mintArgs: Types.MintArgs): async Types.MintReceipt {
    if(not Principal.equal(owner.owner, caller)) {
      return #Err(#Unauthorized);
    };
    let now = Nat64.fromIntWrap(Time.now());
    let acceptedTo: Types.Account = Utils.acceptAccount(mintArgs.to);

    // check on supply cap overflow
    if (supplyCap != null) {
      let _supplyCap: Nat = Utils.nullishCoalescing<Nat>(supplyCap, 0);
      if (totalSupply + 1 > _supplyCap) {
        return #Err(#SupplyCapOverflow);
      };
    };

    // cannot mint to zero principal
    if (Principal.equal(acceptedTo.owner, NULL_PRINCIPAL)) {
      return #Err(#InvalidRecipient);
    };

    // create the new token
    let newToken: Types.TokenMetadata = {
      tokenId = nextTokenId;
      owner = acceptedTo;
      metadata = mintArgs.metadata;
    };

    // update the token metadata
    let tokenId : Types.TokenId = nextTokenId;
    nextTokenId := nextTokenId + 1;
    tokens := Trie.put(tokens, Utils.keyFromTokenId tokenId, Nat.equal, newToken).0;

    _addTokenToOwners(acceptedTo, tokenId);

    _incrementBalance(acceptedTo);

    _incrementTotalSupply(1);

    ignore _addTransaction(#mint, now, ?[tokenId], ?acceptedTo, null, null, null, null, null);

    return #Ok(tokenId);
  };

  public shared({caller}) func createListing(
    createListingArgs: Types.CreateListingArgs
  ): async Types.CreateListingResult {
    let tokenId = createListingArgs.token;
    let listing = Trie.get(listingTokens, Utils.keyFromTokenId tokenId, Nat.equal);
    let item = Trie.get(tokens, Utils.keyFromTokenId tokenId, Nat.equal);
    if (listing != null) {
      return #Err(#ListingAlreadyExists);
    };
    let ?_item = item;

    if (createListingArgs.price.e8s <= Nat64.fromNat(0)) {
      return #Err(#InvalidPrice);
    };

    let callerAccount: Types.Account = {
      owner = caller; subaccount=?Utils.getDefaultSubaccount()
    };

    if (Utils.compareAccounts(callerAccount, _item.owner) != #equal) {
      return #Err(#Unauthorized);
    };

    listingSequentialIndex:= listingSequentialIndex + 1;

    let newListing: Types.Listing = {
      id = listingSequentialIndex;
      owner = callerAccount;
      price = createListingArgs.price;
      tokenId = tokenId;
    };

    listingTokens := Trie.put(listingTokens, Utils.keyFromTokenId tokenId, Nat.equal, newListing).0;

    return #Ok(tokenId);
  };

  public shared({caller}) func removeListing(
    tokenId: Types.TokenId
  ): async Types.RemoveListingResult {
    // Check if listing exists
    let listing = Trie.get(listingTokens, Utils.keyFromTokenId(tokenId), Nat.equal);
    if (listing == null) {
      return #Err(#ListingNotFound);
    };

    // Get listing owner information
    let ?existingListing = listing;

    // Verify caller authorization
    let callerAccount: Types.Account = {
      owner = caller;
      subaccount = ?Utils.getDefaultSubaccount()
    };

    if (Utils.compareAccounts(callerAccount, existingListing.owner) != #equal) {
      return #Err(#Unauthorized);
    };

    // Remove listing from storage
    listingTokens := Trie.remove(
      listingTokens,
      Utils.keyFromTokenId(tokenId),
      Nat.equal
    ).0;

    #Ok(tokenId);
  };

  public shared({caller}) func createBuyOrder(buyOrderArgs: Types.CreateBuyOrderArgs): async Types.CreateBuyOrderResult {
    let tokenId = buyOrderArgs.token;
    let now = Nat64.fromIntWrap(Time.now());
    if (Nat64.less(buyOrderArgs.createdAtTime, now - TX_WINDOW - PERMITTED_DRIFT)) {
      return #Err(#TooOld);
    };

    let item = Trie.get(tokens, Utils.keyFromTokenId tokenId, Nat.equal);
    let listing = Trie.get(listingTokens, Utils.keyFromTokenId tokenId, Nat.equal);

    switch (item) {
      case null {
        return #Err(#InvalidTokenId);
      };
      case (?_item) {
        if (listing == null) {
          return #Err(#InvalidTokenId);
        };
        let ?_listing = listing;
        let listingId = _listing.id;

        let existingBuyOrder = Trie.get(buyOrders, Utils.keyFromListingId listingId, Nat.equal);

        if (existingBuyOrder != null) {
          let ?_buyOrder = existingBuyOrder;
          if(Nat64.less(now, _buyOrder.expiresAtTime) and _buyOrder.buyer != caller) {
            return #Err(#BuyOrderAlreadyExists);
          }
        };

        let acceptedCaller: Types.Account = Utils.acceptAccount({owner= caller; subaccount=?Utils.getDefaultSubaccount()});

        let canisterPrincipal = Principal.fromActor(Self);
        let canisterAddress = Utils.blobToHex(Principal.toLedgerAccount(canisterPrincipal, null));

        let paymentInstruction: Types.PaymentInstruction = {
          to = canisterAddress;
          amount = _listing.price;
          memo = Nat64.fromNat(_listing.id);
          expiresAtTime = now + TX_WINDOW;
          listingId = _listing.id;
        };

        let buyOrder: Types.BuyOrder = {
          buyer = acceptedCaller.owner;
          expiresAtTime = paymentInstruction.expiresAtTime;
          createdAtTime = now
        };

        buyOrders := Trie.put(buyOrders, Utils.keyFromListingId listingId, Nat.equal, buyOrder).0;

        return #Ok(paymentInstruction);
      };
    };
  };

  public shared func verifyBuyTokenTx(tokenId: Nat, listingId: Nat, blockIndex: Nat64): async Types.VerifyBuyTokenTxResult {
    let now = Nat64.fromIntWrap(Time.now());
    let canisterPrincipal = Principal.fromActor(Self);
    let canisterAddress = Utils.blobToHex(Principal.toLedgerAccount(canisterPrincipal, null));

    let existingBuyOrder = Trie.get(buyOrders, Utils.keyFromListingId(listingId), Nat.equal);

    switch (existingBuyOrder) {
      case null return #Err(#NoBuyOrderFound);
      case (?buyOrder) {
        if (Nat64.greater(now, buyOrder.expiresAtTime)) {
          // TODO: Refund to buyer
          return #Err(#BuyOrderExpired);
        };

        let listing = Trie.get(listingTokens, Utils.keyFromTokenId tokenId, Nat.equal);
        let ?_listing = listing else {
          // TODO: Refund to buyer
          return #Err(#ListingNotFound);
        };

        let expectedMemo = Nat64.fromNat(listingId);
        let expectedAmount = _listing.price;

        let result = await IcpLedger.query_blocks({
          start = blockIndex;
          length = 1;
        });

        let block = result.blocks[0];
        switch (block.transaction.operation) {
          case (?op) {
            switch (op) {
              case (#Transfer(transfer)) {
                let txToHex = Utils.blobToHex(transfer.to);
                let txFromHex = Utils.blobToHex(transfer.from);

                let buyerAccount = {
                  owner = buyOrder.buyer;
                  subaccount = ?Utils.getDefaultSubaccount()
                };

                let buyerHex = Utils.accountToText(buyerAccount);

                if (txToHex == canisterAddress and 
                    txFromHex == buyerHex and
                    block.transaction.memo == expectedMemo and
                    transfer.amount.e8s == expectedAmount.e8s) {
                  let item = Trie.get(tokens, Utils.keyFromTokenId tokenId, Nat.equal);
                  let ?_item = item else return #Err(#InvalidTokenId);
                  let buyer = buyOrder.buyer;
                  let buyerAccount = {
                    owner = buyer;
                    subaccount = ?Utils.getDefaultSubaccount()
                  };
                  let sellerAccount = Utils.acceptAccount(_item.owner);

                  let transferResult = _singleTransfer(null, sellerAccount, buyerAccount, tokenId, false, now);

                  ignore _addTransaction(#icrc7_transfer, now, ?[tokenId], ?buyerAccount, ?sellerAccount, null, ?block.transaction.memo, ?buyOrder.createdAtTime, null);


                  buyOrders := Trie.remove(buyOrders, Utils.keyFromListingId listingId, Nat.equal).0;
                  listingTokens := Trie.remove(listingTokens, Utils.keyFromTokenId tokenId, Nat.equal).0;

                  switch (transferResult) {
                      case null {
                        let transferArgs : IcpLedger.TransferArgs = {
                          memo = 0;
                          amount = expectedAmount;
                          fee = { e8s = 10_000 };
                          from_subaccount = null;
                          to = Principal.toLedgerAccount(sellerAccount.owner, sellerAccount.subaccount);
                          created_at_time = null;
                        };
                        let transferResult = await IcpLedger.transfer(transferArgs);
                        return #Ok(#Verified);
                      };
                      case (?result) {
                        return #Err(#Unauthorized);
                      };
                    }
                };
              };
              case _ { /* Not a transfer */ };
            }
          };
          case _ { /* Not a transfer */ }
        };

        return #Err(#PaymentNotFound);
      };
    };
  };

  public shared({caller}) func linkCaiAccount(code: Text): async Types.LinkCaiAccountResult {
    let callerAccount = {
      owner = caller;
      subaccount = ?Utils.getDefaultSubaccount()
    };

    let callerToText = Utils.accountToText(callerAccount);

    let userId = await Utils.linkCaiAccount(callerAccount, code);

    switch (userId) {
      case (#Err(err)) { return #Err(err); };
      case (#Ok(_id)) {
        caiAccounts := Trie.put(caiAccounts, Utils.keyFromText callerToText, Text.equal, _id).0;
        return #Ok(_id);
      };
    };
  };

  public shared func public_key() : async { #Ok : { public_key: Blob }; #Err : Text } {
    try {
      let { public_key } = await IC.ecdsa_public_key({
          canister_id = null;
          derivation_path = [];
          key_id = { curve = #secp256k1; name = "dfx_test_key" };
      });

      #Ok({ public_key })
    } catch (err) {
      #Err(Error.message(err))
    }
  };

  public shared({caller}) func transfer_collection_owner(newOwner: Types.Account): async Types.Result<Types.Account, Types.TransferCollectionOwnerError> {
    if(not Principal.equal(owner.owner, caller)) {
      return #Err(#Unauthorized);
    };

    owner := newOwner;

    return #Ok(owner);
  };
}
