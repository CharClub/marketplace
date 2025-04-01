#!/usr/bin/env bash

LANG=en_US.UTF-8

get_balance() {
  dfx canister --network ic status "$1" 2>&1 | grep Balance: | sed 's/[^0-9]//g'
}

format_balance() {
  echo "$1" | awk '{printf "%'\''d\n", $0}'
}

for canister in backend frontend; do
  balance=$(get_balance "$canister")
  formatted_balance=$(format_balance "$balance")

  echo "Canister $canister balance: $formatted_balance"

  if [ "$balance" -lt 5000000000000 ]; then
    payload=$(jq -n --arg canister "$canister" --arg balance "$formatted_balance" '{
                "embeds": [{
                  "title": ":warning: Internet Computer Canister Alert",
                  "color": 16711680,
                  "description": "Canister `\($canister)` balance is **\($balance)**.",
                  "fields": [{
                    "name": "Top it up by:",
                    "value": "- Running: `dfx ledger --network ic top-up \($canister) --amount 5.0`\n- Or adding the canister on the NNS and sending cycles to it."
                  }]
                }]
              }')

    curl -H "Content-Type: application/json" -d "$payload" -X POST "$DISCORD_WEBHOOK_URL" -o /dev/null
  fi
done
