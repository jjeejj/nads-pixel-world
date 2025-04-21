// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;
import {Test, console} from "forge-std/Test.sol";
import "../src/BuyEarth.sol";

contract BuyEarthAnvilTest is Test {
    BuyEarth buyEarth;

    function setUp() public {
        vm.prank(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266);
        buyEarth = BuyEarth(0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512);
    }

    // forge test --match-path /Users/wenjunjiang/repo/nads-pixel-world/test/BuyEarth.Anvil.t.sol --match-test test_getEarths --fork-url http://localhost:8545 -vvv
    function test_getEarths() public view {
        BuyEarth.Earth[] memory earths = buyEarth.getEarths();
        console.log("Earths array length: %d", earths.length);
        for (uint i = 0; i < earths.length; i++) {
            console.log("Earth[%d] idx: %d", i, earths[i].idx);
            console.log("Earth[%d] color: %s", i, earths[i].color);
            console.log("Earth[%d] owner: %s", i, earths[i].owner);
        }
    }

    // forge test --match-path /Users/wenjunjiang/repo/nads-pixel-world/test/BuyEarth.Anvil.t.sol --match-test test_updateEarthOwnByIdx --fork-url http://localhost:8545 -vvv
    function test_updateEarthOwnByIdx() public {
        uint256 idx = 25;
        buyEarth.updateEarthOwnByIdx(
            idx,
            0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
        );
        BuyEarth.Earth memory earth = buyEarth.getEarthByIdx(idx);
        console.log("Earth idx: %d", earth.idx);
        console.log("Earth color: %s", earth.color);
        console.log("Earth owner: %s", earth.owner);
    }

    // cast call 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 "getEarthByIdx(uint256)" 25 --rpc-url http://127.0.0.1:8545 | cast --abi-decode "getEarthByIdx(uint256)" "(uint256,string,uint,string,address)" | jq '.owner'
}
