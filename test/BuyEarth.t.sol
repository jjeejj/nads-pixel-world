// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;
import { Test,console } from  "forge-std/Test.sol";
import "../src/BuyEarth.sol";

contract BuyEarthTest is Test {
    BuyEarth buyEarth;
    address owner = address(1);
    address user = address(2);

    function setUp() public {
        vm.prank(owner);
        buyEarth = new BuyEarth();
    }

    function test_BuyEarth() public {
        vm.prank(user);
        vm.deal(user, 1 ether);
        buyEarth.buyEarth{value: 0.01 ether}(100, "#FFFFFF", "");
        console.log("Owner balance: %s wei", address(owner).balance);
        console.log("User balance: %s wei", address(user).balance);
    }

    function test_FailBuyEarth() public {
        vm.prank(user);
        vm.deal(user, 1 ether);
        vm.expectRevert();
        buyEarth.buyEarth{value: 0.00001 ether}(1, "#FFFFFF", "");
    }

    function test_getEarths() public view{
        BuyEarth.Earth[] memory earths = buyEarth.getEarths();
        console.log("Earths array length: %d", earths.length);
        for(uint i = 0; i < earths.length; i++) {
            console.log("Earth[%d] color: %d", i, earths[i].color);
        }
    }

    function test_BatchBuyEarths() public view{
        BuyEarth.Earth[] memory earths = buyEarth.getEarths();
        console.log("Earths array length: %d", earths.length);
        for(uint i = 0; i < earths.length; i++) {
            console.log("Earth[%d] color: %d", i, earths[i].color);
        }
    }

    function test_batchClearEarthSetting() public {
        buyEarth.batchClearEarthSetting(new uint256[](0));
    }

    function test_batchBuyEarth() public {
        BuyEarth.Earth[] memory earths = new BuyEarth.Earth[](1);
        earths[0] = BuyEarth.Earth(1, "#FFFFFF", "", user, 0);
        buyEarth.batchBuyEarth{value: 0.01 ether}(earths);
    }
}