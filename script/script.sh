#!/bin/bash

# deploy
forge script ./script/BuyEarth.s.sol --rpc-url Anvil --broadcast
forge script ./script/BuyEarthProxy.s.sol --rpc-url Anvil --broadcast
forge script ./script/UpgradeBuyEarth.s.sol --rpc-url Anvil --broadcast
forge script ./script/UpgradeBuyEarth.s.sol --rpc-url Monnad_TestNet --broadcast
forge script ./script/BuyEarthProxyUUPS.s.sol --rpc-url Anvil --broadcast
forge script ./script/BuyEarthProxyUUPS.s.sol --rpc-url Monnad_TestNet --broadcast
forge script ./script/VerifyUpgrade.s.sol --rpc-url Anvil --broadcast
forge script ./script/VerifyUpgrade.s.sol --rpc-url Monnad_TestNet --broadcast

# verify

# monad testnet BuyEarth contract
forge verify-contract \
    --rpc-url https://testnet-rpc.monad.xyz \
    --verifier sourcify \
    --verifier-url 'https://sourcify-api-monad.blockvision.org' \
    0xA142Cc55C87e603EE618cC9bfB0fCE0BcD5C8802 \
    ./src/BuyEarth.sol:BuyEarth

# monad testnet BuyEarthProxy contract
forge verify-contract \
    --rpc-url https://testnet-rpc.monad.xyz \
    --verifier sourcify \
    --verifier-url 'https://sourcify-api-monad.blockvision.org' \
    0x61ae35C22A0B9Ce4E715dD0e876F51e28cB746A9 \
    ./src/BuyEarthProxy.sol:BuyEarthProxy
