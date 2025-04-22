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
    0xdD98AcC2C7Cc8064A4bB5AEAeEb20f5A12D86A1B \
    ./src/BuyEarth.sol:BuyEarth

# monad testnet BuyEarthProxy contract
forge verify-contract \
    --rpc-url https://testnet-rpc.monad.xyz \
    --verifier sourcify \
    --verifier-url 'https://sourcify-api-monad.blockvision.org' \
    0x89d3aB33ED755C52A8C2AaC560a5bE7A81b0fa20 \
    ./src/BuyEarthProxy.sol:BuyEarthProxy
