import React, { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, useContractRead, useContractWrite, useWaitForTransaction, useNetwork } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { parseEther } from 'viem';
import styled from 'styled-components';
import './App.css';
import { getContractConfig } from './config';
import { getAvatarUrl, getAvatarFromUIAvatars, generateLetterAvatar, getAvatarUrlAsync } from './utils/avatarUtils';

// BuyEarth合约ABI
import contractABI from './abi.json'; // 正确导入ABI

// 从配置获取合约地址
const contractConfig = getContractConfig();
const contractAddress = contractConfig.address;

// 颜色映射 - 保留6个常用颜色
const colorMap = {
  1: "#FF0000", // 红色
  2: "#00FF00", // 绿色
  3: "#0000FF", // 蓝色
  4: "#FFFF00", // 黄色
  5: "#00FFFF", // 青色
  6: "#FFA500", // 橙色
  7: "custom"   // 自定义颜色
};

// 手印图标 - SVG路径
const handprintIcon = {
  path: "M12,1C5.925,1,1,5.925,1,12s4.925,11,11,11s11-4.925,11-11S18.075,1,12,1z M18.707,9.293l-7,7 C11.512,16.488,11.256,16.585,11,16.585s-0.512-0.098-0.707-0.293l-3-3c-0.391-0.391-0.391-1.023,0-1.414s1.023-0.391,1.414,0 L11,14.171l6.293-6.293c0.391-0.391,1.023-0.391,1.414,0S19.098,8.902,18.707,9.293z",
  viewBox: "0 0 24 24"
};

// Toast样式组件
const ToastContainer = styled.div`
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  width: 100%;
  max-width: 320px;
  display: flex;
  justify-content: center;
`;

const ToastContent = styled.div`
  display: flex;
  align-items: center;
  padding: 14px 18px;
  background-color: ${props => props.type === "error" ? "rgba(231, 76, 60, 0.9)" : "rgba(52, 152, 219, 0.9)"};
  color: white;
  border-radius: 15px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: slideDown 0.3s ease-out forwards;
  width: 100%;
  backdrop-filter: blur(5px);
  border: 1px solid ${props => props.type === "error" ? "rgba(231, 76, 60, 0.6)" : "rgba(52, 152, 219, 0.6)"};

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const ToastIcon = styled.div`
  margin-right: 10px;
  font-size: 20px;
`;

const ToastMessage = styled.div`
  flex: 1;
  font-size: 14px;
  font-weight: 500;
`;

const ToastCloseButton = styled.button`
  background-color: rgba(255, 255, 255, 0.25);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-left: 10px;

  &:hover {
    background-color: rgba(255, 255, 255, 0.35);
  }
`;

// 自定义Toast组件
const Toast = ({ message, isVisible, onClose, type = "info" }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <ToastContainer>
      <ToastContent type={type}>
        <ToastIcon>{type === "error" ? "⚠️" : "ℹ️"}</ToastIcon>
        <ToastMessage>{message}</ToastMessage>
        <ToastCloseButton onClick={onClose}>OK</ToastCloseButton>
      </ToastContent>
    </ToastContainer>
  );
};

const App = () => {
  const [selectedColor, setSelectedColor] = useState(0); // 默认不选颜色
  const [selectedTile, setSelectedTile] = useState(null);
  const [gridSize, setGridSize] = useState(10); // 初始网格大小
  const [earthData, setEarthData] = useState([]); // 初始化为空数组
  const [imageUrl, setImageUrl] = useState("");
  const [customColor, setCustomColor] = useState("#FF00FF"); // 默认自定义颜色为紫色
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { chain } = useNetwork(); // 获取当前连接的链
  const [showSettingsModal, setShowSettingsModal] = useState(false); // 新增设置模态框状态
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  
  // 社交媒体用户名状态
  const [platform, setPlatform] = useState("github"); // 默认为GitHub
  const [username, setUsername] = useState("");
  // 预览状态
  const [previewUrl, setPreviewUrl] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  // Twitter头像获取状态
  const [twitterFetchFailed, setTwitterFetchFailed] = useState(false);
  
  // Toast状态
  const [toast, setToast] = useState({
    visible: false,
    message: "",
    type: "info"
  });

  // 读取所有方块数据
  const { data: earthsData, refetch } = useContractRead({
    address: contractAddress,
    abi: contractABI,
    functionName: 'getEarths',
    watch: true,
  });

  // 监听窗口大小变化，动态调整格子数量
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 修改计算网格大小的方法，使用固定尺寸
  useEffect(() => {
    // 根据可用屏幕宽度计算可以容纳的格子数量
    const availableWidth = windowSize.width - 20; // 减去左右边距
    const tileSize = 44.2; // 固定格子大小为44.2px
    
    // 计算能容纳的格子数量
    const calculatedGridSize = Math.floor(availableWidth / tileSize);
    
    // 确保网格大小至少为10，最多为30（防止格子过多导致性能问题）
    const newGridSize = Math.max(10, Math.min(30, calculatedGridSize));
    setGridSize(newGridSize);
  }, [windowSize]);

  // 当合约数据更新或gridSize更改时，确保earthData大小足够
  useEffect(() => {
    if (earthsData) {
      try {
        // 处理合约数据
        const earthDataArray = Array.from(earthsData).map(earth => ({
          color: Number(earth.color),
          price: Number(earth.price),
          image_url: earth.image_url
        }));
        
        // 查找最大已使用的索引
        let maxUsedIndex = -1;
        for (let i = 0; i < earthDataArray.length; i++) {
          const earth = earthDataArray[i];
          if (earth && (earth.color !== 0 || (earth.image_url && earth.image_url.trim() !== ""))) {
            maxUsedIndex = i;
          }
        }
        
        // 计算需要的行数
        const requiredRows = Math.ceil((maxUsedIndex + 1) / gridSize);
        
        // 计算所需总格子数
        const requiredTiles = Math.max(
          gridSize * gridSize, // 至少铺满整个屏幕
          requiredRows * gridSize // 或者包含最大索引所在行
        );
        
        // 确保earthData长度足够
        if (earthDataArray.length < requiredTiles) {
          const paddedArray = [...earthDataArray];
          while (paddedArray.length < requiredTiles) {
            paddedArray.push({ color: 0, price: 0, image_url: "" });
          }
          setEarthData(paddedArray);
        } else {
          setEarthData(earthDataArray);
        }
        
      } catch (error) {
        console.error("Error processing contract data:", error);
        // 创建备用数据
        const newData = Array(gridSize * gridSize).fill().map(() => ({ 
          color: 0, price: 0, image_url: "" 
        }));
        setEarthData(newData);
      }
    } else {
      // 如果没有合约数据，初始化空格子
      const newData = Array(gridSize * gridSize).fill().map(() => ({ 
        color: 0, price: 0, image_url: "" 
      }));
      setEarthData(newData);
    }
  }, [earthsData, gridSize]);

  // 显示Toast消息
  const showToast = (message, type = "info") => {
    setToast({
      visible: true,
      message,
      type
    });
  };

  // 关闭Toast
  const closeToast = () => {
    setToast(prev => ({
      ...prev,
      visible: false
    }));
  };

  // 购买方块
  const { write: buyEarthWrite, data: buyEarthData, error: writeError, isError: isWriteError } = useContractWrite({
    address: contractAddress,
    abi: contractABI,
    functionName: 'buyEarth',
    value: parseEther('0.01'),
  });

  // 等待交易完成
  const { isLoading, isSuccess, isError, error } = useWaitForTransaction({
    hash: buyEarthData?.hash,
    onError: (error) => {
      console.error("等待交易时出错:", error);
      handleTransactionError(error);
    }
  });

  // 处理写入错误
  useEffect(() => {
    if (isWriteError && writeError) {
      console.error("合约写入错误:", writeError);
      handleTransactionError(writeError);
    }
  }, [isWriteError, writeError]);

  // 当交易成功时刷新数据，或处理错误
  useEffect(() => {
    if (isSuccess) {
      refetch();
      setSelectedTile(null);
      showToast("Purchase successful!", "info");
      // 购买成功后检查是否需要扩展网格
      checkAndExpandGrid();
    } else if (isError && error) {
      console.error("Transaction error:", error);
      handleTransactionError(error);
    }
  }, [isSuccess, isError, error, refetch]);

  // 处理图片URL输入变化
  const handleImageUrlChange = (e) => {
    setImageUrl(e.target.value);
  };

  // 处理社交媒体平台选择
  const handlePlatformChange = (e) => {
    setPlatform(e.target.value);
    // 当切换平台时重置预览
    setShowPreview(false);
    // 重置Twitter获取失败状态
    setTwitterFetchFailed(false);
  };

  // 处理社交媒体用户名输入
  const handleUsernameChange = (e) => {
    setUsername(e.target.value);
    // 当用户名更改时重置预览
    setShowPreview(false);
  };

  // 重置预览
  const resetPreview = () => {
    setShowPreview(false);
    setPreviewUrl("");
  };

  // 获取头像URL
  const handleGetAvatarUrl = async () => {
    if (!username) {
      showToast("Please enter a username", "error");
      return;
    }
    
    // 重置Twitter获取状态
    if (platform === 'twitter') {
      setTwitterFetchFailed(false);
    }
    
    // 设置加载状态
    setShowPreview(false);
    showToast(platform === "custom" ? "Fetching image..." : `Fetching ${platform === 'github' ? 'GitHub' : 'X(Twitter)'} avatar...`, "info");
    
    try {
      let avatarUrl;
      
      // 处理自定义URL
      if (platform === "custom") {
        // 检查是否是有效的URL或Twitter图片路径
        if (username.includes('pbs.twimg.com/profile_images')) {
          // 这是Twitter头像URL
          avatarUrl = username;
          if (!username.startsWith('http')) {
            avatarUrl = `https://${username.replace(/^\/+/, '')}`;
          }
          showToast("Twitter avatar URL detected", "info");
        } else if (!isValidUrl(username)) {
          showToast("Please enter a valid URL", "error");
          return;
        } else {
          avatarUrl = username;
        }
      } else {
        // 使用社交媒体API获取头像 - 异步方式
        try {
          // 使用异步方法获取头像
          avatarUrl = await getAvatarUrlAsync(platform, username);
          
          // 检查Twitter头像获取是否成功
          if (platform === 'twitter' && !avatarUrl) {
            setTwitterFetchFailed(true);
            showToast("Failed to fetch Twitter avatar, please try manual method", "error");
            return;
          }
        } catch (error) {
          console.error("Avatar fetch failed:", error);
          
          if (platform === 'twitter') {
            setTwitterFetchFailed(true);
            showToast("Failed to fetch Twitter avatar, please try manual method", "error");
            return;
          }
          
          // 使用备选方案
          avatarUrl = getAvatarFromUIAvatars(username, platform);
        }
        
        // 如果头像获取失败，使用默认头像
        if (!avatarUrl) {
          if (platform === 'twitter') {
            setTwitterFetchFailed(true);
            showToast("Failed to fetch Twitter avatar, please try manual method", "error");
          } else {
            showToast(`Failed to fetch ${platform === 'github' ? 'GitHub' : ''} avatar`, "error");
          }
          return;
        }
      }
      
      setPreviewUrl(avatarUrl);
      setImageUrl(avatarUrl);
      setShowPreview(true);
      showToast(
        platform === "custom" 
          ? "Custom image fetched successfully" 
          : `${platform === 'github' ? 'GitHub' : 'X(Twitter)'} avatar fetched successfully`, 
        "info"
      );
    } catch (error) {
      console.error("Error fetching avatar URL:", error);
      
      if (platform === 'twitter') {
        setTwitterFetchFailed(true);
        showToast("Failed to fetch Twitter avatar, please try manual method", "error");
      } else {
        showToast("Failed to fetch avatar URL, please try another platform or custom URL", "error");
      }
      
      setShowPreview(false);
    }
  };
  
  // 验证URL是否有效
  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  // 处理方块点击
  const handleTileClick = (index) => {
    if (!isConnected) {
      showToast("Please connect your wallet first", "error");
      return;
    }

    console.log(`Clicked tile #${index}:`, earthData[index]);

    // 检查方块是否已被购买
    const earth = earthData[index] || { color: 0, image_url: "" };
    const hasColor = earth.color !== 0;
    const hasImage = earth.image_url && earth.image_url.trim() !== "";
    const isPurchased = hasColor || hasImage;
    
    if (isPurchased) {
      showToast("This tile has already been purchased", "error");
      return;
    }

    setSelectedTile(index);
    showToast(`Tile #${index} selected`, "info");
  };

  // 处理购买方块
  const handleBuyEarth = () => {
    if (selectedTile === null) {
      showToast("Please select a tile first", "error");
      return;
    }

    // 检查是否选择了颜色或提供了图片URL
    const hasColor = selectedColor !== 0;
    const hasImage = imageUrl.trim() !== "";
    
    if (!hasColor && !hasImage) {
      showToast("Please select a color or provide an image URL", "error");
      return;
    }

    // 使用颜色值，如果是0（未选择）或7（自定义），需要特殊处理
    const colorId = selectedColor;
    const finalImageUrl = imageUrl.trim();

    // 显示正在处理的提示
    showToast("Processing transaction...", "info");

    try {
      const config = {
        args: [selectedTile, colorId, finalImageUrl],
        onSettled: (data, error) => {
          if (error) {
            console.error("Transaction error:", error);
            // 处理错误
            handleTransactionError(error);
          }
        }
      };
      
      buyEarthWrite(config);
    } catch (error) {
      console.error("购买方块错误:", error);
      handleTransactionError(error);
    }
  };

  // 处理交易错误的统一函数
  const handleTransactionError = (error) => {
    console.error("交易错误详情:", error);
    
    // 错误消息
    let errorMessage = "Transaction failed";
    
    // 检查各种可能的错误格式和位置
    const errorStr = JSON.stringify(error).toLowerCase();
    
    if (
      errorStr.includes("insufficient funds") || 
      errorStr.includes("exceeds the balance") ||
      errorStr.includes("gas * price + value")
    ) {
      errorMessage = "Insufficient funds in your wallet. Please add more token to cover gas fees and purchase price.";
    } else if (errorStr.includes("user rejected")) {
      errorMessage = "Transaction rejected by user.";
    }
    
    // 显示友好的错误消息
    showToast(errorMessage, "error");
  };

  // 处理颜色选择
  const handleColorSelection = (colorValue) => {
    if (selectedColor === colorValue) {
      // 如果用户点击已选中的颜色，取消选择
      setSelectedColor(0);
      showToast("Color deselected", "info");
    } else {
      setSelectedColor(colorValue);
      showToast(`Color ${colorMap[colorValue]} selected`, "info");
    }
  };

  // 处理自定义颜色变化
  const handleCustomColorChange = (e) => {
    setCustomColor(e.target.value);
    setSelectedColor(7); // 自动选择自定义颜色选项
  };

  // 为格子添加设置按钮样式
  const TileSettingsButton = styled.button`
    position: absolute;
    bottom: 3px;
    right: 3px;
    width: 24px;
    height: 24px;
    background-color: rgba(255, 255, 255, 0.7);
    border-radius: 50%;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.2s, transform 0.2s;
    z-index: 10;
    padding: 0;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    
    &:hover {
      transform: scale(1.1);
      background-color: rgba(255, 255, 255, 0.9);
      box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
    }
  `;

  const SettingsIcon = styled.span`
    font-size: 14px;
    line-height: 1;
  `;

  // 添加格子包装器来确保正方形
  const TileWrapper = styled.div`
    aspect-ratio: 1 / 1;
    width: 100%;
    position: relative;
    padding: 1px;
  `;

  // 修改Tile样式让设置按钮在悬停时显示
  const Tile = styled.div`
    background-color: white;
    border: 1px solid #cccccc;
    cursor: ${props => props.$purchased ? 'not-allowed' : 'pointer'};
    transition: all 0.2s ease;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 4px;
    overflow: hidden;
    
    &:hover {
      transform: ${props => props.$purchased ? 'none' : 'scale(0.97)'};
      border-color: ${props => props.$isSelected ? '#3498db' : '#b0b0b0'};
      z-index: 2;
    }
    
    ${props => props.$isSelected && `
      border: 2px solid #3498db;
      z-index: 3;
    `}
  `;

  // 创建背景颜色层组件
  const ColorBackground = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: ${props => props.color};
    opacity: ${props => props.$hasImage ? 0.7 : 1}; // 降低透明度，使背景更模糊但仍可见
    border-radius: 3px;
    z-index: 1; // 背景层在图片下面
    pointer-events: none; // 避免影响点击事件
  `;

  // 更新检查格子扩展的函数
  const checkAndExpandGrid = () => {
    // 计算购买的格子数量
    const purchasedCount = earthData.filter(earth => earth.color !== 0 || (earth.image_url && earth.image_url.trim() !== "")).length;
    
    // 检查剩余空格子是否低于总格子的20%
    const totalTiles = gridSize * gridSize;
    const remainingTiles = totalTiles - purchasedCount;
    
    if (remainingTiles < totalTiles * 0.2) {
      // 需要扩展网格 - 增加20%
      const newSize = Math.ceil(gridSize * 1.2);
      
      // 创建新的扩展数组
      const newEarthData = Array(newSize * newSize).fill().map((_, index) => {
        if (index < earthData.length) {
          // 保留原有数据
          return earthData[index];
        } else {
          // 添加新的空格子
          return { color: 0, price: 0, image_url: "" };
        }
      });
      
      setGridSize(newSize);
      setEarthData(newEarthData);
      showToast(`Grid expanded to ${newSize}x${newSize}`, "info");
    }
  };

  // 修改渲染网格的方法
  const renderGrid = () => {
    return (
      <Grid $gridSize={gridSize}>
        {Array(earthData.length).fill(0).map((_, index) => {
          const earth = earthData[index] || { color: 0, image_url: "" };
          // 检查是否有颜色和图片
          const hasColor = earth.color !== 0;
          const hasImage = earth.image_url && earth.image_url.trim() !== "";
          
          // 确定背景颜色
          let backgroundColor;
          if (hasColor) {
            if (earth.color === 7) {
              // 对于自定义颜色，使用紫色作为默认显示
              backgroundColor = "#FF00FF";
            } else {
              backgroundColor = colorMap[earth.color];
            }
          } else {
            // 如果没有颜色，使用白色作为背景
            backgroundColor = '#FFFFFF';
          }
          
          const isSelected = selectedTile === index;
          // 一个方块被认为是已购买的条件：有颜色或有图片
          const isPurchased = hasColor || hasImage;

          return (
            <TileWrapper key={index}>
              <Tile
                $isSelected={isSelected}
                onClick={() => handleTileClick(index)}
                $purchased={isPurchased}
              >
                {/* 始终添加背景颜色层 */}
                <ColorBackground 
                  color={hasColor ? backgroundColor : '#FFFFFF'} 
                  $hasImage={hasImage}
                />
                {hasImage && <TileImage src={earth.image_url} alt={`Tile ${index}`} $hasColor={hasColor} />}
              </Tile>
            </TileWrapper>
          );
        })}
      </Grid>
    );
  };

  // 设置模态框组件
  const SettingsModal = () => {
    if (!showSettingsModal) return null;
    
    return (
      <ModalOverlay>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Tile Settings</ModalTitle>
            <CloseButton onClick={() => setShowSettingsModal(false)}>×</CloseButton>
          </ModalHeader>
          
          <ModalBody>
            <SettingsSection>
              <SectionTitle>Select Color</SectionTitle>
              <ColorSelection>
                <ColorPicker>
                  {Object.entries(colorMap).map(([value, color]) => {
                    const intValue = parseInt(value);
                    // 自定义颜色选项特殊处理
                    if (color === "custom") {
                      return (
                        <CustomColorContainer 
                          key={value} 
                          $selected={selectedColor === intValue} 
                          onClick={() => handleColorSelection(intValue)}
                        >
                          <CustomColorLabel>Custom</CustomColorLabel>
                          <CustomColorInput
                            type="color"
                            value={customColor}
                            onChange={handleCustomColorChange}
                            title="Click to select a custom color"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleColorSelection(intValue);
                            }}
                          />
                        </CustomColorContainer>
                      );
                    }
                    return (
                      <ColorOption 
                        key={value}
                        style={{ backgroundColor: color }}
                        $selected={selectedColor === intValue}
                        onClick={() => handleColorSelection(intValue)}
                      />
                    );
                  })}
                </ColorPicker>
              </ColorSelection>
            </SettingsSection>

            <SettingsSection>
              <SectionTitle>Set Image</SectionTitle>
              <InputGroup>
                <Select
                  value={platform}
                  onChange={handlePlatformChange}
                >
                  <option value="github">GitHub</option>
                  <option value="twitter">Twitter</option>
                  <option value="custom">Custom URL</option>
                </Select>
                <Input 
                  type="text"
                  placeholder={platform === "custom" ? "Enter image URL" : `Enter ${platform === "github" ? "GitHub" : "Twitter"} username`}
                  value={username}
                  onChange={handleUsernameChange}
                  autoComplete="off"
                />
                <FetchButton onClick={handleGetAvatarUrl}>Fetch</FetchButton>
              </InputGroup>

              {/* 图片预览 */}
              {showPreview && (
                <PreviewContainer>
                  <PreviewHeader>
                    <PreviewTitle>Image Preview</PreviewTitle>
                    <ClosePreviewButton onClick={resetPreview}>×</ClosePreviewButton>
                  </PreviewHeader>
                  <ImagePreview>
                    <PreviewImage src={previewUrl} alt="Preview" />
                  </ImagePreview>
                </PreviewContainer>
              )}
            </SettingsSection>
            
            <ActionButton onClick={handleBuyEarth}>
              Purchase This Tile
            </ActionButton>
          </ModalBody>
        </ModalContent>
      </ModalOverlay>
    );
  };

  return (
    <FullScreenContainer>
      <AppHeader>
        <Logo>
          <LogoIcon>🧩</LogoIcon>
          <LogoTextGroup>
            <LogoText>Pixel Grid</LogoText>
            <LogoSubtitle>Blockchain-based pixel art canvas</LogoSubtitle>
          </LogoTextGroup>
        </Logo>
        <WalletSection>
          <ConnectButton.Custom>
            {({
              account,
              chain,
              openAccountModal,
              openChainModal,
              openConnectModal,
              authenticationStatus,
              mounted,
            }) => {
              const ready = mounted && authenticationStatus !== 'loading';
              const connected =
                ready &&
                account &&
                chain &&
                (!authenticationStatus ||
                  authenticationStatus === 'authenticated');

              return (
                <div
                  {...(!ready && {
                    'aria-hidden': true,
                    'style': {
                      opacity: 0,
                      pointerEvents: 'none',
                      userSelect: 'none',
                    },
                  })}
                >
                  {(() => {
                    if (!connected) {
                      return (
                        <EnhancedConnectButton onClick={openConnectModal} type="button">
                          Connect Wallet
                        </EnhancedConnectButton>
                      );
                    }

                    return (
                      <WalletConnected>
                        <button
                          onClick={openChainModal}
                          className="chain-button"
                          type="button"
                        >
                          {chain.hasIcon && (
                            <div
                              className="chain-icon"
                              style={{
                                background: chain.iconBackground,
                                width: 12,
                                height: 12,
                                borderRadius: 999,
                                overflow: 'hidden',
                                marginRight: 4,
                              }}
                            >
                              {chain.iconUrl && (
                                <img
                                  alt={chain.name ?? 'Chain icon'}
                                  src={chain.iconUrl}
                                  style={{ width: 12, height: 12 }}
                                />
                              )}
                            </div>
                          )}
                          {chain.name}
                        </button>

                        <AccountButton onClick={openAccountModal} type="button">
                          {account.displayName}
                          {account.displayBalance
                            ? ` (${account.displayBalance})`
                            : ''}
                        </AccountButton>
                      </WalletConnected>
                    );
                  })()}
                </div>
              );
            }}
          </ConnectButton.Custom>
        </WalletSection>
      </AppHeader>
      
      <MainContent>
        {renderGrid()}
        
        {/* 修改浮动设置按钮，更改图标和文字 */}
        {isConnected && (
          <FloatingActionButton 
            onClick={() => {
              if (selectedTile === null) {
                showToast("Please select a tile first", "error");
              } else {
                setShowSettingsModal(true);
              }
            }}
            title="Customize tile"
          >
            <CustomizeIcon>🎨</CustomizeIcon> Customize This Tile
          </FloatingActionButton>
        )}
      </MainContent>
      
      <Toast 
        message={toast.message} 
        isVisible={toast.visible} 
        onClose={closeToast} 
        type={toast.type} 
      />
      
      <SettingsModal />
    </FullScreenContainer>
  );
};

// 新增和修改样式组件
const FullScreenContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
  background-color: #f5f5f5;
`;

const AppHeader = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 30px;
  background: #e0e0e0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  width: 100%;
  z-index: 10;
`;

const MainContent = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 15px 10px; // 上下15px，左右10px的间距
  position: relative;
  background-color: #f5f5f5;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(${props => props.$gridSize}, 44.2px); // 固定宽度44.2px
  grid-template-rows: repeat(${props => props.$gridSize}, 44.2px); // 固定高度44.2px
  gap: 1px;
  background-color: #ffffff; // 改为白色背景
  border-radius: 8px;
  overflow: auto;
  width: auto; // 自适应宽度
  max-width: 95%;
  margin: 15px 10px; // 上下15px，左右10px的间距
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(200, 200, 200, 0.5);
`;

// 新增模态框相关样式
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 10px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  color: #333;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 22px;
  color: #666;
  cursor: pointer;
  transition: color 0.2s;
  
  &:hover {
    color: #333;
  }
`;

const ModalBody = styled.div`
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const SettingsSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const SectionTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  color: #333;
`;

const InputGroup = styled.div`
  display: flex;
  gap: 8px;
  width: 100%;
`;

const Select = styled.select`
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  background-color: white;
`;

const Input = styled.input`
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  flex: 1;
  background-color: white;
  
  &:focus {
    border-color: #3498db;
    outline: none;
  }
`;

const FetchButton = styled.button`
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0 15px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #2980b9;
  }
`;

const ActionButton = styled.button`
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
  
  &:hover {
    background-color: #2980b9;
  }
`;

const PreviewContainer = styled.div`
  margin-top: 10px;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 10px;
  background-color: #f9f9f9;
`;

const PreviewHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
`;

const PreviewTitle = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: #2980b9;
`;

const ClosePreviewButton = styled.button`
  background: none;
  border: none;
  font-size: 16px;
  color: #666;
  cursor: pointer;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
    color: #333;
  }
`;

const ImagePreview = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  margin-bottom: 10px;
`;

const PreviewImage = styled.img`
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #e6f2ff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const AccountButton = styled.button`
  background: none;
  border: none;
  color: #333;
  font-size: 14px;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 6px;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #f0f0f0;
  }
`;

const WalletConnected = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  background-color: rgba(52, 152, 219, 0.08);
  border-radius: 8px;
  padding: 5px 10px;
  
  .chain-button {
    background: none;
    border: none;
    display: flex;
    align-items: center;
    color: #3498db;
    font-size: 14px;
    cursor: pointer;
    padding: 6px 10px;
    border-radius: 6px;
    transition: background-color 0.2s;
    
    &:hover {
      background-color: rgba(52, 152, 219, 0.1);
    }
  }
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const LogoIcon = styled.div`
  font-size: 28px;
`;

const LogoTextGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const LogoText = styled.div`
  font-size: 20px;
  font-weight: bold;
  color: #333;
`;

const LogoSubtitle = styled.div`
  font-size: 12px;
  color: #666;
  margin-top: 2px;
  font-weight: normal;
  letter-spacing: 0.3px;
`;

const WalletSection = styled.div`
  display: flex;
  align-items: center;
`;

const EnhancedConnectButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 8px 15px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 6px rgba(52, 152, 219, 0.3);
  
  &:hover {
    background-color: #2980b9;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(52, 152, 219, 0.4);
  }
  
  &:active {
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba(52, 152, 219, 0.3);
  }
`;

const TileImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  position: absolute;
  top: 0;
  left: 0;
  opacity: ${props => props.$hasColor ? 0.6 : 1}; // 只有在存在颜色时才降低透明度
  mix-blend-mode: normal;
  border-radius: 3px;
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
  -webkit-backface-visibility: hidden;
  -moz-backface-visibility: hidden;
  -webkit-transform: translateZ(0);
  -moz-transform: translateZ(0);
  transform: translateZ(0);
  z-index: 2;
  pointer-events: none;
  filter: contrast(1.05);
`;

const ColorSelection = styled.div`
  margin-bottom: 20px;
  display: flex;
  justify-content: center;
`;

const ColorPicker = styled.div`
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  justify-content: center;
  max-width: 450px;
  padding: 10px;
`;

const ColorOption = styled.div`
  width: 45px;
  height: 45px;
  border-radius: 50%;
  background-color: ${props => props.color};
  cursor: pointer;
  transition: all 0.2s;
  border: 3px solid ${props => props.$selected ? '#333' : 'transparent'};
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15);

  &:hover {
    transform: scale(1.12);
    box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
  }
`;

const CustomColorContainer = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 0;
  width: 85px;
  height: 85px;
  border-radius: 10px;
  background-color: ${props => props.$selected ? '#f8f0ff' : '#ffffff'};
  border: ${props => props.$selected ? '2px solid #FF00FF' : '1px solid #ddd'};
  box-shadow: ${props => props.$selected ? '0 0 12px rgba(255, 0, 255, 0.5)' : '0 2px 5px rgba(0, 0, 0, 0.1)'};
  transition: all 0.3s ease;
  padding: 8px;
  cursor: pointer;
  
  &:hover {
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
    transform: translateY(-2px);
    background-color: #f8f8ff;
  }
  
  &:active {
    transform: translateY(0);
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.1);
  }
`;

const CustomColorLabel = styled.div`
  font-size: 15px;
  color: #333;
  font-weight: bold;
  margin-top: 5px;
  text-align: center;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &::before {
    content: "🎨";
    margin-right: 4px;
    font-size: 15px;
  }
`;

const CustomColorInput = styled.input`
  width: 65px;
  height: 40px;
  border: 2px solid #ccc;
  padding: 0;
  background: none;
  cursor: pointer;
  opacity: 1;
  transition: all 0.3s;
  z-index: 10;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  margin-top: 5px;

  &:hover {
    opacity: 1;
    transform: scale(1.05);
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
    border: 2px solid #FF00FF;
  }

  &::-webkit-color-swatch-wrapper {
    padding: 0;
  }

  &::-webkit-color-swatch {
    border: none;
    border-radius: 6px;
  }
`;

// 修改浮动操作按钮颜色为青色
const FloatingActionButton = styled.button`
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  width: 230px;
  height: 50px;
  border-radius: 25px;
  background-color: #00BFFF; // 保持青色
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 10px rgba(0, 187, 255, 0.3);
  border: none;
  cursor: pointer;
  z-index: 100;
  transition: all 0.3s;
  font-size: 16px;
  font-weight: 500;
  
  &:hover {
    background-color: #00A5DD;
    transform: translateX(-50%) translateY(-2px);
    box-shadow: 0 6px 15px rgba(0, 187, 255, 0.4);
  }
  
  &:active {
    transform: translateX(-50%) translateY(0);
  }
`;

// 替换设置图标组件
const CustomizeIcon = styled.span`
  font-size: 20px;
  line-height: 1;
  margin-right: 8px;
`;

export default App;