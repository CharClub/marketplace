#!/usr/bin/env bash

set -euo pipefail

# Check if didc is installed, if not install it
if ! didc -V &>/dev/null; then
  mkdir -p $HOME/.local/bin
  echo "$HOME/.local/bin" >>$GITHUB_PATH
  release=$(curl --silent "https://api.github.com/repos/dfinity/candid/releases/latest" | grep -e '"tag_name"' | cut -c 16-25)
  curl -fsSL https://github.com/dfinity/candid/releases/download/${release}/didc-linux64 >$HOME/.local/bin/didc
  chmod +x $HOME/.local/bin/didc
fi

declare wasm=
declare canister_id=
declare target_canister_id=

while [[ $# -gt 0 ]]; do
  case $1 in
  --wasm)
    wasm="${2:?missing value for '--wasm'}"
    shift # shift past --wasm and value
    shift
    ;;
  --canister-id)
    canister_id="${2:?missing value for '--canister-id'}"
    shift # shift past --canister-id and value
    shift
    ;;
  --target-canister-id)
    target_canister_id="${2:?missing value for '--target-canister-id'}"
    shift # shift past --target-canister-id and value
    shift
    ;;
  *)
    echo "ERROR: unknown argument $1"
    exit 1
    ;;
  esac
done

if [ -z "$wasm" ]; then
  echo "No wasm specified"
  exit 1
fi

if [ -z "$canister_id" ]; then
  echo "No canister id specified"
  exit 1
fi

if [ -z "$target_canister_id" ]; then
  echo "No target canister id specified"
  exit 1
fi

install_args=$(echo "(record {
  mode = variant { upgrade = record {skip_pre_upgrade = true} };
  canister_id = principal \"$target_canister_id\";
  wasm_module = blob \"$(hexdump -ve '1/1 "%.2x"' "$wasm" | sed 's/../\\&/g')\";
  arg = blob \"DIDL\\00\\00\"
})" | didc encode -f blob)

result=$(dfx canister call "$canister_id" submit --network=ic \
  --argument-file <(echo "(
    \"Upgrade backend\",
    record {
      principal \"aaaaa-aa\";
      \"install_code\";
      $install_args
     }
  )"))
proposal_id=$(echo "$result" | sed 's/(\([0-9]*\) : nat)/\1/')

echo "Proposal ID: $proposal_id"

payload=$(jq -n --arg canister "$canister_id" --arg target_canister "$target_canister_id" --arg proposal_id "$proposal_id" '{
    "embeds": [{
      "title": ":white_check_mark: Proposal Created",
      "color": 2326507,
      "description": "Proposal `\($proposal_id)` to upgrade `\($target_canister)` was created.",
      "fields": [
        {
          "name": "View the proposal",
          "value": "```dfx canister --network=ic call \($canister) getProposal \($proposal_id)```"
        },
        {
          "name": "Accept the proposal",
          "value": "```dfx canister --network=ic call \($canister) accept \($proposal_id)```"
        },
        {
          "name": "Reject the proposal",
          "value": "```dfx canister --network=ic call \($canister) reject \($proposal_id)```"
        }
      ]
    }]
  }')

curl -H "Content-Type: application/json" -d "$payload" -X POST "$DISCORD_WEBHOOK_URL" -o /dev/null
