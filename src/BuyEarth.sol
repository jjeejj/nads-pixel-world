// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract BuyEarth is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    // 添加 using 声明
    using Strings for uint256;
    uint256 private constant EARTH_PRICE = 0.01 ether;
    struct Earth {
        uint256 idx;
        string color;
        string image_url;
        address owner;
        uint price;
    }
    mapping(uint => Earth) private earthsMap;
    uint[] public earthPurchasedIdxArr;
    // 指定地址购买的所有像素
    mapping(address => Earth[]) private userPurchasedMap;

    event EarthPurchased(
        uint256 indexed idx,
        string color,
        string image_url,
        address owner,
        uint price
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
        Earth memory buyedEarthInfo = Earth(_idx, color, imageUrl, msg.sender, msg.value);
        earthsMap[_idx] = buyedEarthInfo;
        earthPurchasedIdxArr.push(_idx);
        userPurchasedMap[msg.sender].push(
            buyedEarthInfo
        );
        (bool send, ) = owner().call{value: msg.value}("");
        require(send, "Failed to send Ether");
        emit EarthPurchased(_idx, color, imageUrl, msg.sender, msg.value);
    }

    // 批量购买（设置），如果已经购买 不需要再次付费，只需要支付 gas 费用
    function batchBuyEarth(
        Earth[] memory earths
    ) public payable {
        require(earths.length > 0, "Invalid earths");
        // 计算未购买的数据
        uint256 totalPrice = 0;
        uint256 updateCount = 0;
        uint256 buyCount = 0;
        for (uint i = 0; i < earths.length; i++) {
            Earth memory _earth = earths[i];
            if (earthsMap[_earth.idx].owner == address(0)) {
                totalPrice += EARTH_PRICE;
                buyCount++;
            } else {
                require(earthsMap[_earth.idx].owner == msg.sender, "Pixel already purchased");
                updateCount++;
            }
        }
        require(
            msg.value == totalPrice,
           string(abi.encodePacked("Invalid payment, please send ", totalPrice.toString(), " MON"))   
        );
        // 处理相关的逻辑
        Earth[] memory buyEarths = new Earth[](buyCount);
        Earth[] memory updateEarths = new Earth[](updateCount);
        uint256 buyIndex = 0;
        uint256 updateIndex = 0;
        for (uint i = 0; i < earths.length; i++) {
            Earth memory _earth = earths[i];
            // 直接没有购买，直接保存信息
            if (earthsMap[_earth.idx].price == 0) {
                buyEarths[buyIndex] = _earth;
                buyIndex++;
            } else { // 购买了 只设置相关的信息
                updateEarths[updateIndex] = _earth;
                updateIndex++;
            }
        }
        _batchBuyEarth(msg.sender,buyEarths);
        _batchUpdateEarth(msg.sender,updateEarths);
        if (totalPrice > 0) {
            (bool send, ) = owner().call{value: msg.value}("");
            require(send, "Failed to send Ether");
        }
    }

    // 批量购买
    function _batchBuyEarth(address user, Earth[] memory earths ) private {
        for (uint i = 0; i < earths.length; i++) {
            Earth memory _earth = earths[i];
            require(earthsMap[_earth.idx].price == 0, "Pixel already purchased");
            Earth memory buyedEarthInfo = Earth(_earth.idx, _earth.color, _earth.image_url, user, msg.value);
            earthsMap[_earth.idx] = buyedEarthInfo;
            earthPurchasedIdxArr.push(_earth.idx);
            userPurchasedMap[user].push(buyedEarthInfo);
        }
        // 更新事件，必须购买成功后再通知
        for (uint i = 0; i < earths.length; i++) {
            Earth memory _earth = earths[i];
            emit EarthPurchased(_earth.idx, _earth.color,_earth.image_url, user, EARTH_PRICE);
        }
    }

    // 批量更新 必须是已经购买过的  而且属于购买者
    function _batchUpdateEarth(address user, Earth[] memory earths ) private {
        for (uint i = 0; i < earths.length; i++) {
            Earth memory _earth = earths[i];
            Earth storage existEarthInfo = earthsMap[_earth.idx];
            require(existEarthInfo.price != 0, "Pixel not purchased");
            require(existEarthInfo.owner == user, "Pixel already purchased");
            existEarthInfo.color = _earth.color;
            existEarthInfo.image_url = _earth.image_url;
            earthsMap[_earth.idx] = existEarthInfo;
        }
        // 更新事件，必须设置成功后再通知
        for (uint i = 0; i < earths.length; i++) {
            Earth memory _earth = earths[i];
            emit EarthPurchased(_earth.idx, _earth.color,_earth.image_url, user, EARTH_PRICE);
        }
    }

    // 批量清除购买的设置信息
    function batchClearEarthSetting(uint256[] memory earthsIdx) public {
        for (uint i = 0; i < earthsIdx.length; i++) {
            uint256 _idx = earthsIdx[i];
            Earth storage existEarthInfo = earthsMap[_idx];
            require(existEarthInfo.price != 0, "Pixel not purchased");
            require(existEarthInfo.owner == msg.sender, "Not your pixel, operation is not allowed");
            existEarthInfo.color = "";
            existEarthInfo.image_url = "";
            earthsMap[_idx] = existEarthInfo;
        }
        // 更新事件，必须设置成功后再通知
        for (uint i = 0; i < earthsIdx.length; i++) {
            uint256 _idx = earthsIdx[i];
            Earth memory _earth = earthsMap[_idx];
            emit EarthPurchased(_earth.idx, _earth.color, _earth.image_url, msg.sender, _earth.price);
        }
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
