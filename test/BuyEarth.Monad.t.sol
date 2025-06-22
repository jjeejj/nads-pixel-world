// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;
import {Test, console} from "forge-std/Test.sol";
import "../src/BuyEarth.sol";

contract BuyEarthMonadTest is Test {
    BuyEarth buyEarth;

    function setUp() public {
        vm.prank(0x2eC78D4677FBA1b5A589C66e75b0F6e180D8A66f);
        buyEarth = BuyEarth(0x61ae35C22A0B9Ce4E715dD0e876F51e28cB746A9);
    }

    // forge test --match-path /Users/wenjunjiang/repo/nads-pixel-world/test/BuyEarth.Monad.t.sol --match-test test_getUniqueAddressCount --rpc-url  https://testnet-rpc.monad.xyz -vvv
    function test_getUniqueAddressCount() public view {
        // 获取合约地址 0x61ae35C22A0B9Ce4E715dD0e876F51e28cB746A9 上的所有交易地址
        BuyEarth targetContract = BuyEarth(
            0x61ae35C22A0B9Ce4E715dD0e876F51e28cB746A9
        );

        // 获取所有已购买的 Earth
        BuyEarth.Earth[] memory earths = targetContract.getEarths();
        console.log("Total purchased earths: %d", earths.length);

        // 使用数组来存储唯一地址（由于 Solidity 限制，不能在 view 函数中使用 mapping）
        address[] memory uniqueAddresses = new address[](earths.length);
        uint256 uniqueCount = 0;

        // 统计唯一地址
        for (uint256 i = 0; i < earths.length; i++) {
            address currentOwner = earths[i].owner;
            bool isUnique = true;

            // 检查当前地址是否已经存在
            for (uint256 j = 0; j < uniqueCount; j++) {
                if (uniqueAddresses[j] == currentOwner) {
                    isUnique = false;
                    break;
                }
            }

            // 如果是新地址，添加到数组中
            if (isUnique && currentOwner != address(0)) {
                uniqueAddresses[uniqueCount] = currentOwner;
                uniqueCount++;
            }
        }

        console.log("Unique addresses count: %d", uniqueCount);

        // 打印所有唯一地址
        for (uint256 i = 0; i < uniqueCount; i++) {
            console.log("Address[%d]: %s", i, uniqueAddresses[i]);
        }
    }

    // forge test --match-path /Users/wenjunjiang/repo/nads-pixel-world/test/BuyEarth.Anvil.t.sol --match-test test_getAddressTransactionCount --fork-url http://localhost:8545 -vvv
    function test_getAddressTransactionCount() public view {
        // 获取合约地址 0x61ae35C22A0B9Ce4E715dD0e876F51e28cB746A9 上每个地址的交易次数
        BuyEarth targetContract = BuyEarth(
            0x61ae35C22A0B9Ce4E715dD0e876F51e28cB746A9
        );

        // 获取所有已购买的 Earth
        BuyEarth.Earth[] memory earths = targetContract.getEarths();
        console.log("Total purchased earths: %d", earths.length);

        // 使用数组来存储地址和对应的交易次数
        address[] memory addresses = new address[](earths.length);
        uint256[] memory transactionCounts = new uint256[](earths.length);
        uint256 uniqueCount = 0;

        // 统计每个地址的交易次数
        for (uint256 i = 0; i < earths.length; i++) {
            address currentOwner = earths[i].owner;
            if (currentOwner == address(0)) continue;

            bool found = false;
            // 查找是否已经记录过这个地址
            for (uint256 j = 0; j < uniqueCount; j++) {
                if (addresses[j] == currentOwner) {
                    transactionCounts[j]++;
                    found = true;
                    break;
                }
            }

            // 如果是新地址，添加到数组中
            if (!found) {
                addresses[uniqueCount] = currentOwner;
                transactionCounts[uniqueCount] = 1;
                uniqueCount++;
            }
        }

        console.log("Unique addresses with transaction counts:");
        for (uint256 i = 0; i < uniqueCount; i++) {
            console.log(
                "Address: %s, Transactions: %d",
                addresses[i],
                transactionCounts[i]
            );
        }

        console.log("Total unique addresses: %d", uniqueCount);
    }
}
