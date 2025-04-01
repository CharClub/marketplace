#!/usr/bin/env bash

set -euo pipefail

# Check if didc is installed, if not install it
if ! didc -V &> /dev/null
then
  curl -fsSL https://github.com/dfinity/candid/releases/download/${release}/didc-linux64 > $HOME/bin/didc
  chmod +x $HOME/bin/didc
fi

declare wasm=
declare canister_id=
declare target_canister_id=

while [[ $# -gt 0 ]]
do
    case $1 in
        --wasm)
            wasm="${2:?missing value for '--wasm'}"
            shift; # shift past --wasm and value
            shift;
            ;;
        --canister-id)
            canister_id="${2:?missing value for '--canister-id'}"
            shift; # shift past --canister-id and value
            shift;
            ;;
        --target-canister-id)
            target_canister_id="${2:?missing value for '--target-canister-id'}"
            shift; # shift past --target-canister-id and value
            shift;
            ;;
        *)
            echo "ERROR: unknown argument $1"
            exit 1
            ;;
    esac
done

if [ -z "$wasm" ]
then
    echo "No wasm specified"
    exit 1
fi

if [ -z "$canister_id" ]
then
    echo "No canister id specified"
    exit 1
fi

if [ -z "$target_canister_id" ]
then
    echo "No target canister id specified"
    exit 1
fi

init_args=$(didc encode '(record { owner = principal "be2us-64aaa-aaaaa-qaabq-cai"; subaccount = null })' -f blob)
install_args=$(echo "(record {
  mode = variant { upgrade = null };
  canister_id = principal \"$target_canister_id\";
  wasm_module = blob \"$(hexdump -ve '1/1 "%.2x"' "$wasm" | sed 's/../\\&/g')\";
  arg = $init_args
})" | didc encode -f blob)

dfx canister call "$canister_id" submit \
  --argument-file <(echo "(
    \"Self upgrade\",
    record {
      principal \"aaaaa-aa\";
      \"install_code\";
      $install_args
     }
  )")
