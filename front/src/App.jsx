import React, { useState, useEffect, useRef } from 'react';
import { useAccount, useConnect, useDisconnect, useContractRead, useContractWrite, useWaitForTransaction, useNetwork } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { parseEther } from 'viem';
import styled from 'styled-components';
import './App.css';
import { getContractConfig } from './config';
import { getAvatarUrl, getAvatarFromUIAvatars, generateLetterAvatar, getAvatarUrlAsync, getDefaultAvatarUrl } from './utils/avatarUtils';

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
  
  // 添加ref来跟踪输入框
  const usernameInputRef = useRef(null);
  
  // Toast状态
  const [toast, setToast] = useState({
    visible: false,
    message: "",
    type: "info"
  });

  // 读取所有方块数据
  const { data: earthsData, refetch, isError: isReadError, error: readError } = useContractRead({
    address: contractAddress,
    abi: contractABI,
    functionName: 'getEarths',
    watch: true,
    // 添加错误处理
    onError: (error) => {
      console.error("读取合约数据错误:", error);
      showToast("Failed to load contract data. Please try refreshing.", "error");
    }
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

  // 处理read合约错误
  useEffect(() => {
    if (isReadError && readError) {
      console.error("合约读取错误:", readError);
      // 创建备用数据
      const newData = Array(gridSize * gridSize).fill().map((_, index) => ({ 
        idx: index,
        color: 0, 
        price: 0, 
        image_url: "" 
      }));
      setEarthData(newData);
      showToast("Failed to load contract data. Using placeholder data.", "error");
    }
  }, [isReadError, readError, gridSize]);

  // 当合约数据更新或gridSize更改时，确保earthData大小足够
  useEffect(() => {
    if (earthsData) {
      try {
        // 创建一个初始的空数组
        let initialData = [];
        
        // 处理合约数据 - 使用idx字段而不是数组索引
        let maxIdx = 0;
        const processedEarths = [];
        
        // 安全地处理合约数据，防止解析错误
        try {
          const earths = Array.from(earthsData);
          if (earths && earths.length > 0) {
            earths.forEach(earth => {
              try {
                // 提取idx并确保它是数字
                const idx = Number(earth.idx || 0);
                // 记录最大的idx值
                maxIdx = Math.max(maxIdx, idx);
                
                processedEarths.push({
                  idx: idx,
                  color: Number(earth.color || 0),
                  price: Number(earth.price || 0),
                  image_url: earth.image_url || ""
                });
              } catch (itemError) {
                console.error("处理单个Earth数据项时出错:", itemError, earth);
              }
            });
          }
        } catch (arrayError) {
          console.error("处理Earth数组时出错:", arrayError);
        }
        
        console.log("已处理的地块数据:", processedEarths.length, "最大idx:", maxIdx);
        
        // 计算需要的格子总数
        const requiredTiles = Math.max(
          gridSize * gridSize, // 至少铺满整个屏幕
          maxIdx + 1, // 或者包含最大索引位置
          100 // 最小保证有100个格子
        );
        
        // 初始化所有格子为空
        initialData = Array(requiredTiles).fill().map((_, index) => ({ 
          idx: index, // 使用index作为默认idx
          color: 0, 
          price: 0, 
          image_url: "" 
        }));
        
        // 根据idx填充相应位置的格子数据
        if (processedEarths.length > 0) {
          processedEarths.forEach(earth => {
            if (earth.idx >= 0 && earth.idx < initialData.length) {
              initialData[earth.idx] = earth;
            } else {
              console.warn(`地块idx(${earth.idx})超出有效范围(0-${initialData.length-1})`);
            }
          });
        }
        
        setEarthData(initialData);
        
      } catch (error) {
        console.error("处理合约数据时发生错误:", error);
        // 创建备用数据
        const newData = Array(gridSize * gridSize).fill().map((_, index) => ({ 
          idx: index,
          color: 0, 
          price: 0, 
          image_url: "" 
        }));
        setEarthData(newData);
        showToast("Error processing contract data. Using default grid.", "error");
      }
    } else {
      // 如果没有合约数据，初始化空格子
      const newData = Array(gridSize * gridSize).fill().map((_, index) => ({ 
        idx: index,
        color: 0, 
        price: 0, 
        image_url: "" 
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
      setShowSettingsModal(false); // 购买成功后关闭弹窗
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
    const value = e.target.value;
    setUsername(value);
    // 移除这里的预览重置逻辑，防止输入时失去焦点
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
          // 使用异步方法获取头像，添加默认尺寸参数
          const avatarSize = platform === 'github' ? 200 : 'original';
          avatarUrl = await getAvatarUrlAsync(platform, username, avatarSize);
          
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
      
      // 获取成功后重新聚焦到输入框
      setTimeout(() => {
        if (usernameInputRef.current) {
          usernameInputRef.current.focus();
        }
      }, 100);
    } catch (error) {
      console.error("Error fetching avatar URL:", error);
      
      if (platform === 'twitter') {
        setTwitterFetchFailed(true);
        showToast("Failed to fetch Twitter avatar, please try manual method", "error");
      } else {
        showToast("Failed to fetch avatar URL, please try another platform or custom URL", "error");
      }
      
      setShowPreview(false);
      
      // 即使出错也尝试重新聚焦
      setTimeout(() => {
        if (usernameInputRef.current) {
          usernameInputRef.current.focus();
        }
      }, 100);
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

    // 检查方块是否已被购买 - 使用idx字段
    const earth = earthData[index];
    const hasColor = earth.color !== 0;
    const hasImage = earth.image_url && earth.image_url.trim() !== "";
    const isPurchased = hasColor || hasImage;
    
    if (isPurchased) {
      showToast("This tile has already been purchased", "error");
      return;
    }

    // 设置选中的方块索引为位置索引，而不是数据索引
    setSelectedTile(index);
    showToast(`Tile #${index} selected`, "info");
  };

  // 处理购买方块
  const handleBuyEarth = () => {
    if (selectedTile === null) {
      showToast("Please select a tile first", "error");
      return;
    }

    // 检查选择的格子索引是否在有效范围内
    if (selectedTile < 0 || selectedTile >= earthData.length) {
      showToast("Selected tile is invalid, please select a different tile", "error");
      setSelectedTile(null);
      return;
    }

    // 检查是否选择了颜色或提供了图片URL
    const hasColor = selectedColor !== 0;
    const hasImage = imageUrl.trim() !== "";
    
    if (!hasColor && !hasImage) {
      showToast("Please select a color or provide an image URL", "error");
      return;
    }

    // 检查选中的方块是否已经被购买
    const selectedEarth = earthData[selectedTile];
    if (selectedEarth && (selectedEarth.color !== 0 || (selectedEarth.image_url && selectedEarth.image_url.trim() !== ""))) {
      showToast("This tile is already purchased. Please select another tile.", "error");
      setSelectedTile(null);
      return;
    }

    // 使用颜色值，如果是0（未选择）或7（自定义），需要特殊处理
    const colorId = selectedColor;
    // 如果是自定义颜色，可能需要将颜色值转换为合约可以处理的格式
    // 但在当前实现中我们只传递colorId=7表示自定义颜色
    // 合约可以存储额外的自定义颜色信息，或者在前端展示时特殊处理
    const finalImageUrl = imageUrl.trim();

    // 在控制台记录自定义颜色的使用
    if (colorId === 7) {
      console.log(`使用自定义颜色: ${customColor}`);
    }

    // 显示正在处理的提示
    showToast("Processing transaction...", "info");

    try {
      // 位置索引就是selectedTile，它是视觉上的位置索引
      const positionIdx = selectedTile;
      
      console.log(`购买格子: 位置索引=${positionIdx}, 颜色=${colorId}, 图片URL=${finalImageUrl}`);
      console.log(`当前网格大小: ${gridSize}x${gridSize}, 总格子数: ${earthData.length}`);
      
      // 检查是否有效的位置索引
      if (isNaN(positionIdx) || positionIdx < 0) {
        showToast("Invalid position index", "error");
        return;
      }
      
      const config = {
        args: [positionIdx, colorId, finalImageUrl],
        onSettled: (data, error) => {
          if (error) {
            console.error("交易处理时出错:", error);
            // 处理错误
            handleTransactionError(error);
          } else if (data) {
            console.log("交易已提交:", data);
          }
        },
        onSuccess: (data) => {
          console.log("交易成功发送:", data);
          showToast("Transaction submitted successfully!", "info");
        }
      };
      
      // 在发送交易前进行最后确认
      console.log("准备发送交易，参数:", config.args);
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
    
    // 将错误转换为字符串以便检查各种错误模式
    const errorStr = typeof error === 'object' ? JSON.stringify(error) : String(error);
    const errorLower = errorStr.toLowerCase();
    
    try {
      // 检查各种可能的错误类型
      if (errorLower.includes("slice") && errorLower.includes("out-of-bounds")) {
        errorMessage = "Contract data error: Please try refreshing the page and try again.";
        console.log("检测到Slice错误，建议刷新页面");
        // 在出现slice错误时尝试刷新数据
        setTimeout(() => {
          refetch();
        }, 2000);
      } else if (
        errorLower.includes("insufficient funds") || 
        errorLower.includes("exceeds the balance") ||
        errorLower.includes("gas * price + value")
      ) {
        errorMessage = "Insufficient funds in your wallet. Please add more token to cover gas fees and purchase price.";
      } else if (errorLower.includes("user rejected")) {
        errorMessage = "Transaction rejected by user.";
      } else if (errorLower.includes("nonce too high")) {
        errorMessage = "Network error: Please reset your wallet or try again later.";
      } else if (errorLower.includes("already mined")) {
        errorMessage = "This transaction was already processed. Please refresh to see updates.";
        // 在已处理的交易情况下尝试刷新数据
        setTimeout(() => {
          refetch();
        }, 1500);
      } else if (errorLower.includes("execution reverted")) {
        if (errorLower.includes("array index out of bounds")) {
          errorMessage = "Contract error: Position already taken or invalid. Please select another tile.";
          // 在位置已被占用的情况下刷新数据
          setTimeout(() => {
            refetch();
          }, 1500);
        } else {
          errorMessage = "Contract execution error. Please try again or select a different tile.";
        }
      }
    } catch (parseError) {
      console.error("解析错误信息时出错:", parseError);
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
    // 阻止事件冒泡，防止触发父元素的点击事件
    e.stopPropagation();
    
    // 获取新的颜色值
    const newColor = e.target.value;
    console.log("选择了新的自定义颜色:", newColor);
    
    // 立即更新状态
    setCustomColor(newColor);
    
    // 自动选择自定义颜色选项（如果还没选中）
    if (selectedColor !== 7) {
      setSelectedColor(7);
      showToast(`自定义颜色已选择: ${newColor}`, "info");
    }
  };

  // 在组件顶层添加useEffect钩子，确保颜色选择器初始化正确
  useEffect(() => {
    console.log("全局监控customColor变化:", customColor);
    
    // 短暂延迟以确保DOM已更新
    setTimeout(() => {
      document.querySelectorAll('.custom-color-input').forEach(input => {
        input.value = customColor;
        input.style.backgroundColor = customColor;
        input.style.borderColor = customColor;
      });
    }, 10);
  }, [customColor]);

  // 在SettingsModal组件中使用简单的颜色预览
  const renderColorOptions = () => {
    return Object.entries(colorMap).map(([value, color]) => {
      const intValue = parseInt(value);
      // 自定义颜色选项特殊处理
      if (color === "custom") {
        return (
          <CustomColorContainer 
            key={value} 
            $selected={selectedColor === intValue} 
            onClick={(e) => handleColorOptionClick(intValue, e)}
            style={{ 
              borderColor: selectedColor === intValue ? customColor : '#ddd',
              boxShadow: selectedColor === intValue ? `0 0 12px ${customColor}` : '0 2px 5px rgba(0, 0, 0, 0.1)'
            }}
          >
            <CustomColorLabel>Custom</CustomColorLabel>
            <div style={{ 
              width: '65px', 
              height: '40px', 
              backgroundColor: customColor,
              borderRadius: '8px',
              border: '2px solid #ccc',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <input
                type="color"
                value={customColor}
                onChange={handleCustomColorChange}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer'
                }}
              />
            </div>
          </CustomColorContainer>
        );
      }
      
      // 常规颜色选项
      return (
        <ColorOption 
          key={value}
          style={{ backgroundColor: color }}
          $selected={selectedColor === intValue}
          onClick={(e) => handleColorOptionClick(intValue, e)}
        />
      );
    });
  };

  // 在ColorOption和CustomColorContainer中单独处理点击事件
  const handleColorOptionClick = (colorValue, e) => {
    // 阻止事件冒泡
    if (e) e.stopPropagation();
    
    if (selectedColor === colorValue) {
      // 如果用户点击已选中的颜色，取消选择
      setSelectedColor(0);
      showToast("Color deselected", "info");
    } else {
      setSelectedColor(colorValue);
      if (colorValue === 7) {
        showToast(`Custom color ${customColor} selected`, "info");
      } else {
        showToast(`Color ${colorMap[colorValue]} selected`, "info");
      }
    }
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
    border: 1px solid #e0e0e0; /* 略微加深边框颜色 */
    cursor: ${props => props.$purchased ? 'not-allowed' : 'pointer'};
    transition: all 0.2s ease;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 4px;
    overflow: hidden;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02); /* 添加微弱阴影增强边界可见性 */
    
    &:hover {
      transform: ${props => props.$purchased ? 'none' : 'scale(0.97)'};
      border-color: ${props => props.$isSelected ? '#3498db' : '#b0b0b0'};
      z-index: 2;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05); /* 悬停时增强阴影 */
    }
    
    ${props => props.$isSelected && `
      border: 2px solid #3498db;
      z-index: 3;
      box-shadow: 0 0 8px rgba(52, 152, 219, 0.4); /* 选中时添加发光效果 */
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
    try {
      // 计算购买的格子数量
      const purchasedCount = earthData.filter(earth => 
        earth && (earth.color !== 0 || (earth.image_url && earth.image_url.trim() !== ""))
      ).length;
      
      // 检查剩余空格子是否低于总格子的20%
      const totalTiles = gridSize * gridSize;
      const remainingTiles = totalTiles - purchasedCount;
      
      console.log(`Grid status: ${purchasedCount} purchased, ${remainingTiles} remaining out of ${totalTiles} total`);
      
      if (remainingTiles < totalTiles * 0.2) {
        // 需要扩展网格 - 增加20%
        const newSize = Math.ceil(gridSize * 1.2);
        
        // 计算需要的新总格子数
        const newTotalTiles = newSize * newSize;
        
        console.log(`Expanding grid from ${gridSize}x${gridSize} to ${newSize}x${newSize}`);
        
        // 创建新的扩展数组，保留现有数据并扩充
        try {
          const newEarthData = Array(newTotalTiles).fill().map((_, index) => {
            if (index < earthData.length) {
              // 保留原有数据
              const existingEarth = earthData[index];
              if (existingEarth) {
                return existingEarth;
              }
            } 
            
            // 添加新的空格子
            return { 
              idx: index,
              color: 0, 
              price: 0, 
              image_url: "" 
            };
          });
          
          setGridSize(newSize);
          setEarthData(newEarthData);
          showToast(`Grid expanded to ${newSize}x${newSize}`, "info");
        } catch (expandError) {
          console.error("扩展网格时出错:", expandError);
          showToast("Failed to expand grid", "error");
        }
      }
    } catch (error) {
      console.error("检查网格扩展时出错:", error);
    }
  };

  // 修改渲染网格的方法
  const renderGrid = () => {
    // 确保earthData存在且是数组
    if (!Array.isArray(earthData) || earthData.length === 0) {
      console.warn("earthData不是有效数组或为空，渲染默认网格");
    return (
        <div style={{textAlign: 'center', padding: '20px'}}>
          Loading grid data...
        </div>
      );
    }

    return (
      <Grid $gridSize={gridSize}>
        {earthData.map((earth, index) => {
          // 确保earth对象有效
          if (!earth) {
            console.warn(`位置 ${index} 的earth数据无效`);
            earth = { idx: index, color: 0, price: 0, image_url: "" };
          }
          
          // 检查是否有颜色和图片
          const hasColor = earth.color !== 0;
          const hasImage = earth.image_url && earth.image_url.trim() !== "";
          
          // 确定背景颜色
          let backgroundColor;
          if (hasColor) {
          if (earth.color === 7) {
              // 对于自定义颜色，使用紫色作为默认显示，但在实际应用中可能需要从合约获取实际颜色
              backgroundColor = customColor || "#FF00FF";
              console.log(`渲染自定义颜色方块: ${backgroundColor}`);
            } else if (colorMap[earth.color]) {
              backgroundColor = colorMap[earth.color];
          } else {
              // 颜色值无效，使用默认灰色
              console.warn(`无效的颜色值: ${earth.color}，使用默认颜色`);
              backgroundColor = '#AAAAAA';
            }
          } else {
            // 如果没有颜色，使用白色作为背景
            backgroundColor = '#FFFFFF';
          }
          
          // 注意：这里我们使用数组索引作为视觉上的位置索引
          // 但购买时使用的是这个位置的索引
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
                {hasImage && (
                  <TileImage 
                    src={earth.image_url} 
                    alt={`Tile ${index}`} 
                    $hasColor={hasColor}
                    onError={(e) => {
                      console.warn(`位置 ${index} 的图片加载失败:`, earth.image_url);
                      e.target.src = getDefaultAvatarUrl(); // 加载失败时使用默认头像
                    }}
                  />
                )}
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
    
    // 使用useEffect在组件挂载时强制更新自定义颜色
    useEffect(() => {
      // 保持各处的颜色同步
      document.querySelectorAll('.custom-color-input').forEach(input => {
        input.value = customColor;
        input.style.backgroundColor = customColor;
      });
    }, [customColor]);
    
    return (
      <ModalOverlay onClick={(e) => {
        // 仅当点击背景时关闭模态框
        if (e.target === e.currentTarget) {
          setShowSettingsModal(false);
        }
      }}>
        <ModalContent onClick={(e) => e.stopPropagation()}>
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
                        <CustomColorSelector 
                        key={value} 
                          value={customColor}
                          onChange={handleCustomColorChange}
                          selected={selectedColor === intValue}
                          onClick={(e) => handleColorOptionClick(intValue, e)}
                        />
                      );
                    }
                  return (
                    <ColorOption
                      key={value}
                        style={{ backgroundColor: color }}
                      $selected={selectedColor === intValue}
                        onClick={(e) => handleColorOptionClick(intValue, e)}
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
                  ref={usernameInputRef}
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

  // 实现一个简单直接的CustomColorSelector组件
  const CustomColorSelector = ({ value, onChange, selected, onClick }) => {
    // 当颜色变化时
    const handleChange = (e) => {
      const newColor = e.target.value;
      console.log("颜色选择器选择了新颜色:", newColor);
      onChange(e);
    };

    // 使用内联样式确保颜色显示正确
    return (
      <CustomColorContainer 
        className={`custom-color-container ${selected ? 'selected' : ''}`}
        $selected={selected}
        onClick={onClick}
        style={{ 
          borderColor: selected ? value : '#ddd',
          boxShadow: selected ? `0 0 12px ${value}` : '0 2px 5px rgba(0, 0, 0, 0.1)'
        }}
      >
        <CustomColorLabel>Custom</CustomColorLabel>
        <div style={{ 
          position: 'relative',
          width: '65px', 
          height: '40px',
          marginTop: '5px',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          {/* 显示颜色预览 */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: value,
            borderRadius: '8px',
            border: '2px solid #ccc',
            zIndex: 1
          }} />
          
          {/* 真正的颜色选择器 */}
          <input
            type="color"
            value={value}
            onChange={handleChange}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: 'pointer',
              zIndex: 2
            }}
          />
        </div>
      </CustomColorContainer>
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
                      <StyledWalletConnected>
                        <StyledAccountInfo onClick={openAccountModal}>
                          <StyledAvatar>
                            {account.address.substring(account.address.length - 2).toUpperCase()}
                          </StyledAvatar>
                          <StyledAccountDetails>
                            <StyledAddress>{account.address.substring(0, 6)}...{account.address.substring(account.address.length - 4)}</StyledAddress>
                            <StyledConnected>
                              <StyledDot />
                              Connected
                            </StyledConnected>
                          </StyledAccountDetails>
                        </StyledAccountInfo>
                        <TestButton onClick={() => console.log("Monad Test clicked")}>
                          Monad Test
                        </TestButton>
                        <StyledLogoutButton onClick={disconnect}>
                          <StyledLogoutIcon>⬆️</StyledLogoutIcon>
                          Logout
                        </StyledLogoutButton>
                      </StyledWalletConnected>
                    );
                  })()}
                </div>
              );
            }}
          </ConnectButton.Custom>
        </WalletSection>
      </AppHeader>
      
      <MainContent>
        <GridContainer>
          {renderGrid()}
        </GridContainer>
        
        {/* 修改浮动设置按钮，更改图标和文字 */}
        <FloatingActionButton 
          onClick={() => {
            if (!isConnected) {
              showToast("Please connect your wallet first", "error");
              return;
            }
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
  background-color: #f5f5f5; /* 保持顶部区域的浅灰色背景 */
  padding: 0; /* 确保没有内边距 */
`;

const AppHeader = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 30px; /* 减小垂直内边距，从15px减小到12px */
  background: #f5f5f5;
  margin: 14px 15px 0; /* 减少上边距1px，将下边距设为0 */
  border-radius: 15px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  width: calc(100% - 30px);
  z-index: 10;
`;

const MainContent = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 0; /* 移除内边距 */
  position: relative;
  background-color: #ffffff; /* 背景颜色修改为白色 */
  margin-top: 0; /* 确保与顶部区域无间距 */
`;

const GridContainer = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 10px;
  margin-top: 0; /* 移除顶部外边距 */
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(${props => props.$gridSize}, 45.2px); // 增大格子宽度为45.2px
  grid-template-rows: repeat(${props => props.$gridSize}, 45.2px); // 增大格子高度为45.2px
  gap: 1px;
  background-color: #ffffff; // 白色背景
  border-radius: 8px;
  overflow: auto;
  width: auto;
  margin: 5px; /* 设置四周边距为5px */
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(200, 200, 200, 0.3); /* 减轻边框颜色 */
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
  border-radius: 10px;
  object-fit: cover;
  border: 3px solid #e6f2ff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
  
  &:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }
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
  flex-wrap: nowrap;
`;

const StyledWalletConnected = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const StyledAccountInfo = styled.div`
  display: flex;
  align-items: center;
  cursor: pointer;
`;

const StyledAvatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #3498db;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: bold;
`;

const StyledAccountDetails = styled.div`
  display: flex;
  flex-direction: column;
  margin-left: 10px;
`;

const StyledAddress = styled.div`
  font-size: 16px;
  color: #333;
  font-weight: 500;
`;

const StyledConnected = styled.div`
  display: flex;
  align-items: center;
  font-size: 14px;
  color: #4caf50;
  font-weight: 500;
`;

const StyledDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #4caf50;
  margin-right: 6px;
`;

const StyledChainInfo = styled.div`
  font-size: 14px;
  color: #666;
  cursor: pointer;
  padding: 5px 10px;
  border-radius: 5px;
  background-color: #e6f2ff;
`;

const StyledLogoutButton = styled.button`
  background-color: #f5e1e1;
  color: #e74c3c;
  border: none;
  padding: 10px 15px;
  border-radius: 8px;
  font-weight: 500;
  font-size: 15px;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: all 0.2s;

  &:hover {
    background-color: #f2dede;
  }
`;

const StyledLogoutIcon = styled.span`
  margin-right: 5px;
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
  /* 边框颜色通过内联样式控制 */
  border: ${props => props.$selected ? `2px solid` : '1px solid #ddd'};
  /* 阴影通过内联样式控制 */
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
  background-color: ${props => props.value || '#FF00FF'};

  &:hover {
    opacity: 1;
    transform: scale(1.05);
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
    border: 2px solid ${props => props.value || '#FF00FF'};
  }

  &::-webkit-color-swatch-wrapper {
    padding: 0;
  }

  &::-webkit-color-swatch {
    border: none;
    border-radius: 6px;
  }
`;

// 修改浮动操作按钮样式
const FloatingActionButton = styled.button`
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  width: 230px;
  height: 50px;
  border-radius: 25px;
  background-color: #00B7FF; // 更鲜艳的蓝色
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 10px rgba(0, 183, 255, 0.4);
  border: none;
  cursor: pointer;
  z-index: 100;
  transition: all 0.3s;
  font-size: 16px;
  font-weight: 500;
  
  &:hover {
    background-color: #00A5E6;
    transform: translateX(-50%) translateY(-2px);
    box-shadow: 0 6px 15px rgba(0, 183, 255, 0.5);
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

// 添加Monad Test按钮样式
const TestButton = styled.button`
  background-color: #e8f2fa;
  color: #3498db;
  border: none;
  padding: 8px 15px;
  border-radius: 5px;
  font-weight: 500;
  font-size: 15px;
  cursor: pointer;
  margin: 0 10px;
  transition: all 0.2s;
  
  &:hover {
    background-color: #d1e6f9;
  }
`;

// Logo相关样式
const Logo = styled.div`
  display: flex;
  align-items: center;
  margin-right: auto;
  height: 40px; /* 设置固定高度以确保顶栏高度稳定 */
`;

const LogoIcon = styled.span`
  font-size: 32px; /* 从28px增大到32px */
  color: #00B7FF;
  margin-right: 12px; /* 略微增加边距 */
  display: flex;
  align-items: center;
  height: 100%;
`;

const LogoTextGroup = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center; /* 添加垂直居中 */
  height: 100%; /* 确保高度充满父容器 */
`;

const LogoText = styled.h1`
  font-size: 26px; /* 从22px增大到26px */
  font-weight: 700;
  margin: 0;
  color: #333;
  letter-spacing: 0.5px;
  line-height: 1.2; /* 添加行高控制 */
`;

const LogoSubtitle = styled.span`
  font-size: 14px; /* 从12px增大到14px */
  color: #888;
  margin-top: 0px; /* 调整上边距 */
  line-height: 1.2; /* 添加行高控制 */
`;

// 钱包部分样式
const WalletSection = styled.div`
  display: flex;
  align-items: center;
  border-radius: 10px;
  background-color: #e8f2fa;
  padding: 10px 15px;
  border: 1px solid #ddd;
`;

export default App;