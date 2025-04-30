#!/bin/bash

# deploy
forge script ./script/BuyEarth.s.sol --rpc-url Anvil --broadcast
forge script ./script/BuyEarthProxy.s.sol --rpc-url Anvil --broadcast
forge script ./script/UpgradeBuyEarth.s.sol --rpc-url Anvil --broadcast
forge script ./script/UpgradeBuyEarth.s.sol --rpc-url Monnad_TestNet --broadcast
forge script ./script/BuyEarthProxyUUPS.s.sol --rpc-url Anvil --broadcast
forge script ./script/BuyEarthProxyUUPS.s.sol --rpc-url Monnad_TestNet --broadcast
forge script ./script/VerifyUpgrade.s.sol --rpc-url Anvil --broadcast

# verify

# monad testnet BuyEarth contract
forge verify-contract \
    --rpc-url https://testnet-rpc.monad.xyz \
    --verifier sourcify \
    --verifier-url 'https://sourcify-api-monad.blockvision.org' \
    0xCE42328B06fE856615Cb617Bce2c11F2351D63Bf \
    ./src/BuyEarth.sol:BuyEarth

# monad testnet BuyEarthProxy contract
forge verify-contract \
    --rpc-url https://testnet-rpc.monad.xyz \
    --verifier sourcify \
    --verifier-url 'https://sourcify-api-monad.blockvision.org' \
    0xd918d63D91bd731C866A35A4c3252E78F577503c \
    ./src/BuyEarthProxy.sol:BuyEarthProxy
