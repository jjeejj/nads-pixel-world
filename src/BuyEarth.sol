// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract BuyEarth is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    uint256 private constant EARTH_PRICE = 0.01 ether;
    struct Earth {
        uint256 idx;
        string color;
        uint price;
        string image_url;
        address owner;
    }
    mapping(uint => Earth) private earthsMap;
    uint[] public earthPurchasedIdxArr;
    // 指定地址购买的所有像素
    mapping(address => Earth[]) private userPurchasedMap;

    event EarthPurchased(
        uint256 indexed idx,
        string color,
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

    // 单个购买
    function buyEarth(
        uint256 _idx,
        string memory color,
        string memory imageUrl
    ) public payable {
        require(
            msg.value == EARTH_PRICE,
            "Invalid payment, please send 0.01 MON"
        );
        require(earthsMap[_idx].price == 0, "Pixel already purchased");

        (bool send, ) = owner().call{value: msg.value}("");
        require(send, "Failed to send Ether");
        Earth memory buyedEarthInfo = Earth(_idx, color, msg.value, imageUrl, msg.sender);
        earthsMap[_idx] = buyedEarthInfo;
        earthPurchasedIdxArr.push(_idx);
        userPurchasedMap[msg.sender].push(
            buyedEarthInfo
        );
        emit EarthPurchased(_idx, color, msg.sender, msg.value);
    }

    // 批量购买
    function batchBuyEarth(
        Earth[] memory earths
    ) public payable {
        require(earths.length > 0, "Invalid earths");
        require(
            msg.value == EARTH_PRICE * earths.length,
           string(abi.encodePacked("Invalid payment, please send ", EARTH_PRICE * earths.length, " MON"))   
        );
        for (uint i = 0; i < earths.length; i++) {
            Earth memory _earth = earths[i];
            require(earthsMap[_earth.idx].price == 0, "Pixel already purchased");
            Earth memory buyedEarthInfo = Earth(_earth.idx, _earth.color, EARTH_PRICE, _earth.image_url, msg.sender);
            earthsMap[_earth.idx] = buyedEarthInfo;
            earthPurchasedIdxArr.push(_earth.idx);
            userPurchasedMap[msg.sender].push(
                buyedEarthInfo
            );
            emit EarthPurchased(_earth.idx, _earth.color, msg.sender, msg.value);
        }
        (bool send, ) = owner().call{value: msg.value}("");
        require(send, "Failed to send Ether");
    }


    function getEarths() public view returns (Earth[] memory result) {
        uint purchasedLength = earthPurchasedIdxArr.length;
        result = new Earth[](purchasedLength);
        for (uint i = 0; i < purchasedLength; i++) {
            result[i] = earthsMap[earthPurchasedIdxArr[i]];
        }
        return result;
    }

     function getEarthByIdx(uint256 _idx) public view returns (Earth memory result) {
        return earthsMap[_idx];
    }

    function updateEarthOwnByIdx(uint256 _idx, address owner) public onlyOwner {
        require(earthsMap[_idx].idx == _idx , "Pixel not purchased");
        require(earthsMap[_idx].owner == address(0) , "Pixel already has owner");
        earthsMap[_idx].owner = owner;
    }

    /**
     * @dev 授权升级函数，必须由UUPS实现
     * @param newImplementation 新实现合约的地址
     */
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}
}
