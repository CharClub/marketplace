import Text "mo:base/Text";
import Nat64 "mo:base/Nat64";
module {
  public type Result<S, E> = {
    #Ok: S;
    #Err: E;
  };

  public type ICPTokens = {
    e8s: Nat64;
  };

	public type Subaccount = Blob;

	public type Account = {
		owner: Principal; 
		subaccount: ?Subaccount;
  };

  public type Listing = {
    id: ListingId;
    owner: Account;
    tokenId: TokenId;
    price: ICPTokens; // Cannot change the price; the user will have to create a new listing to change it.
  };

  public type BuyOrder = {
    buyer: Principal;
    expiresAtTime: Nat64;
    createdAtTime: Nat64;
  };
  public type SupportedStandard = {
    name: Text;
    url: Text;
  };

  public type ApproveErrorCode = {
    #SelfApproval;
  };

  public type TransferErrorCode = {
    #EmptyTokenIds;
    #DuplicateInTokenIds;
  };

  public type OperatorApproval = {
    spender: Account;
    memo: ?Nat64;
    expires_at: ?Nat64;
  };

  //////////////////
  // ID Types     //
  //////////////////
  public type TokenId = Nat;
  public type TransferId = Nat;
  public type ApprovalId = Nat;
  public type ListingId = Nat;
  public type AccountIdentifier = Text;
  public type CaiId = Text;
  //////////////////

  //////////////////
  // Args types   //
  //////////////////
  public type CreateListingArgs = {
    price: ICPTokens;
    token: TokenId;
  };

  public type CreateBuyOrderArgs = {
    token: TokenId;
    createdAtTime: Nat64;
  };

  public type GetTransactionsArgs = {
    limit: Nat;
    offset: Nat;
    account: ?Account;
    token: ?TokenId;
  };

  public type TransferArgs = {
    spender_subaccount: ?Subaccount; // the subaccount of the caller (used to identify the spender)
    from: ?Account;     /* if supplied and is not caller then is permit transfer, if not supplied defaults to subaccount 0 of the caller principal */
    to: Account;
    token_ids: [TokenId];
    // type: leave open for now
    memo: ?Nat64;
    created_at_time: ?Nat64;
    is_atomic: ?Bool;
  };

  public type ApprovalArgs = {
    from_subaccount: ?Subaccount;
    spender: Account; // Approval is given to an ICRC Account
    token_ids: ?[TokenId]; // if no tokenIds given then approve entire collection
    expires_at: ?Nat64;
    memo: ?Nat64;
    created_at_time: ?Nat64;
  };

  public type MintArgs = {
    to: Account;
    metadata: [(Text, Metadata)];
  };
  //////////////////

  public type PaymentInstruction = {
    amount: ICPTokens;
    to: Text;
    memo: Nat64;
    expiresAtTime: Nat64;
    listingId: ListingId;
  };

  public type Metadata = { #Nat: Nat; #Int: Int; #Text: Text; #Blob: Blob; #Array: [Metadata] };

  public type MetadataValue = (Text, Metadata);

  public type TokenMetadata = {
    tokenId: TokenId;
    owner: Account;
    metadata: [MetadataValue];
  };

  public type TokenApproval = {
    spender: Account;
    memo: ?Nat64;
    expires_at: ?Nat64;
  };

  public type TransactionId = Nat;

  public type Transaction = {
    kind: Text; // "icrc7_transfer" | "mint" ...
    timestamp: Nat64;
    mint: ?{
      to: Account;
      token_ids: [TokenId];
    };
    icrc7_transfer: ?{
      from: Account;
      to: Account;
      spender: ?Account;
      token_ids: [TokenId];
      memo: ?Nat64;
      created_at_time: ?Nat64;
    };
    icrc7_approve: ?{
      from: Account;
      spender: Account;
      token_ids: ?[TokenId];
      expires_at: ?Nat64;
      memo: ?Nat64;
      created_at_time: ?Nat64;
    };
  };

  public type CollectionMetadata = {
    name: Text;
    symbol: Text;
    royalties: ?Nat16;
    royaltyRecipient: ?Account;
    description: ?Text;
    image: ?Blob;
    totalSupply: Nat;
    supplyCap: ?Nat;
  };
  

  //////////////////
  // Error types  //
  //////////////////
  public type CallError = {
    #Unauthorized;
    #InvalidTokenId;
    #AlreadyExistTokenId;
    #SupplyCapOverflow;
    #InvalidRecipient;
    #GenericError;
  };

  public type MintError = {
    #Unauthorized;
    #SupplyCapOverflow;
    #InvalidRecipient;
    #AlreadyExistTokenId;
    #GenericError: { error_code: Nat; message: Text };
  };

  public type TransferError = {
    #Unauthorized: { token_ids: [TokenId] };
    #TooOld;
    #CreatedInFuture: { ledger_time: Nat64 };
    #Duplicate: { duplicate_of: TransferId };
    #TemporarilyUnavailable: {};
    #GenericError: { error_code: Nat; message: Text };
  };

  public type ListingError = {
    #Unauthorized;
    #ListingAlreadyExists;
    #InvalidPrice;
    #GenericError: { error_code: Nat; message: Text };
  };

  public type ApprovalError = {
    #Unauthorized: { token_ids: [TokenId] };
    #TooOld;
    #TemporarilyUnavailable: {};
    #GenericError: { error_code: Nat; message: Text };
  };

  public type BuyTokenError = {
    #InvalidTokenId;
  };

  public type GetTokenPricingErr = {
    #NotListed;
    #InvalidTokenId;
  };

  public type CreateBuyOrderError = {
    #InvalidTokenId;
    #BuyOrderAlreadyExists;
    #TooOld;
  };

  public type VerifyBuyTokenTxError = {
    #NoBuyOrderFound;
    #BuyOrderExpired;
    #ListingNotFound;
    #PaymentNotFound;
    #InvalidTokenId;
    #Unauthorized;
  };

 public type RemoveListingError = {
    #ListingNotFound;
    #Unauthorized;
  };

  public type LinkCaiError = {
    #NotFound;
    #Unauthorized;
    #InternalError: Text;
  };
  //////////////////

  //////////////////
  // Result types //
  //////////////////
  public type MetadataResult = Result<[(Text, Metadata)], CallError>;
  public type OwnerResult = Result<Account, CallError>;
  public type BalanceResult = Result<Nat, CallError>;
  public type TokensOfResult = Result<[TokenId], CallError>;
  public type MintReceipt = Result<TokenId, MintError>;
  public type TransferReceipt = Result<TransferId, TransferError>;
  public type ApprovalReceipt = Result<ApprovalId, ApprovalError>;
  public type GetTransactionsResult = {
    total : Nat;
    transactions : [Transaction];
  }; 
  public type BuyTokenResult = Result<TokenId, BuyTokenError>;
  public type CreateBuyOrderResult = Result<PaymentInstruction, CreateBuyOrderError>;
  public type CreateListingResult = Result<TokenId, ListingError>;
  public type GetTokenPricingResult = Result<Listing, GetTokenPricingErr>;
  public type VerifyBuyTokenTxResult = Result<{#Verified}, VerifyBuyTokenTxError>;
  public type RemoveListingResult = Result<TokenId, RemoveListingError>;
  public type LinkCaiAccountResult = Result<CaiId, LinkCaiError>;
  //////////////////
}
