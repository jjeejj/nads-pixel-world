// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract BuyEarth is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    uint256 private constant EARTH_PRICE = 0.01 ether;
    struct Earth {
        uint256 idx;
        uint color;
        uint price;
        string image_url;
    }
    mapping (uint => Earth) private earthsMap;
    uint[] public earthPurchasedIdxArr;

    event EarthPurchased(
        uint256 indexed idx,
        uint color,
        address buyer,
        uint256 price
    );

    /**
     * @dev 初始化函数，替代原来的constructor
     */
    function initialize() public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
    }

    function buyEarth(
        uint256 _idx,
        uint color,
        string memory imageUrl
    ) public payable {
        require(
            msg.value == EARTH_PRICE,
            "Invalid payment, please send 0.01 MON"
        );
        require(earthsMap[_idx].price == 0, "Earth already purchased");

        (bool send, ) = owner().call{value: msg.value}("");
        require(send, "Failed to send Ether");

        earthsMap[_idx] = Earth(_idx, color, msg.value, imageUrl);
        earthPurchasedIdxArr.push(_idx);
        emit EarthPurchased(_idx, color, msg.sender, msg.value);
    }

    function getEarths() public view returns (Earth[] memory result) {
        uint purchasedLength = earthPurchasedIdxArr.length;
       result = new Earth[](purchasedLength); 
        for (uint i = 0; i < purchasedLength; i++) {
            result[i] = earthsMap[earthPurchasedIdxArr[i]];
        }
        return result;
    }

    /**
     * @dev 授权升级函数，必须由UUPS实现
     * @param newImplementation 新实现合约的地址
     */
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {
    }
}
