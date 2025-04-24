import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAccount, useConnect, useDisconnect, useContractRead, useContractWrite, useWaitForTransaction, useNetwork } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { parseEther } from 'viem';
import { ethers } from 'ethers';
import { BrowserProvider } from 'ethers';
import styled from 'styled-components';
import './App.css';
import { getContractConfig } from './config';
import { getAvatarUrl, getAvatarFromUIAvatars, generateLetterAvatar, getAvatarUrlAsync, getDefaultAvatarUrl } from './utils/avatarUtils';
import SettingsModal from './components/SettingsModal';
// BuyEarth合约ABI
import contractABI from './abi.json'; // 正确导入ABI
import { useToast } from './components/Toast/useToast';
// 从配置获取合约地址
const contractConfig = getContractConfig();
const contractAddress = contractConfig.address;

const App = () => {
  const { showToast } = useToast();
  const [selectedTile, setSelectedTile] = useState(null);
  const [gridSize, setGridSize] = useState(10); // 初始网格大小
  const [earthData, setEarthData] = useState([]); // 初始化为空数组
  
  
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { chain } = useNetwork(); // 获取当前连接的链
  const [showSettingsModal, setShowSettingsModal] = useState(false); // 新增设置模态框状态
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
 
  
  
  
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
    watch: false, // 修改为false，避免持续监听导致重复渲染
    // 添加错误处理
    onError: (error) => {
      console.error("读取合约数据错误:", error);
      showToast("Failed to load contract data. Please try refreshing.", "error");
    }
  });
  
  // 添加对EarthPurchased事件的监听
  const [eventData, setEventData] = useState(null);
  
  // 使用useEffect监听合约事件
  useEffect(() => {
    if (!contractAddress || !isConnected) return;
    
    // 创建provider和合约实例
    const { ethereum } = window;
    if (!ethereum) return;
    
    // 使用ethers v6的方式创建provider
    const provider = new BrowserProvider(ethereum);
    // 异步创建合约实例
    const getContract = async () => {
      try {
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(contractAddress, contractABI, signer);
    
        // 监听EarthPurchased事件
        const filter = contract.filters.EarthPurchased();
        const listener = (idx, color, buyer, price) => {
          console.log("检测到新的EarthPurchased事件:", { idx, color, buyer, price });
          setEventData({ idx, color, buyer, price });
          // 当事件触发时刷新数据
          refetch();
        };
        
        // 添加事件监听器
        contract.on(filter, listener);
        
        // 返回清理函数
        return contract;
      } catch (error) {
        console.error("创建合约实例失败:", error);
        showToast("Failed to connect to contract. Please try again.", "error");
        return null;
      }
    };
    
    // 执行异步函数并保存合约引用
    let contractInstance;
    getContract().then(contract => {
      contractInstance = contract;
    });
    
    // 组件卸载时移除监听器
    return () => {
      if (contractInstance) {
        // 移除所有监听器
        contractInstance.removeAllListeners();
      }
    };
  }, [contractAddress, isConnected, refetch]);
  

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
    const isMobile = window.innerWidth <= 768;
    const availableWidth = windowSize.width - (isMobile ? 20 : 40);
    const tileSize = isMobile ? 32 : 44.2; // 移动端使用更小的格子尺寸
    
    // 计算能容纳的格子数量
    const calculatedGridSize = Math.floor(availableWidth / tileSize);
    
    // 确保网格大小至少为8（移动设备）或10（桌面），最多为30
    const newGridSize = Math.max(isMobile ? 8 : 10, Math.min(30, calculatedGridSize));
    setGridSize(newGridSize);
  }, [windowSize]);

  // 处理read合约错误
  useEffect(() => {
    if (isReadError && readError) {
      console.error("合约读取错误:", readError);
      // 创建备用数据
      const newData = Array(gridSize * gridSize).fill().map((_, index) => ({ 
        idx: index,
        color: "", 
        price: 0, 
        image_url: "" 
      }));
      setEarthData(newData);
      showToast("Failed to load contract data. Using placeholder data.", "error");
    }
  }, [isReadError, readError, gridSize]);

  // 当合约数据更新或gridSize更改时，确保earthData大小足够
  useEffect(() => {
    if (!earthsData) {
      // 如果没有合约数据，初始化空格子
      const newData = Array(gridSize * gridSize).fill().map((_, index) => ({ 
        idx: index,
        color: "", 
        price: 0, 
        image_url: "" 
      }));
      setEarthData(newData);
      return;
    }
    
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
              
              // 确保颜色值的处理
              let colorValue = earth.color;
              // 将颜色处理简化，空字符串或空值视为未购买
              if (!colorValue || colorValue === "") {
                colorValue = "";
              }
              
              processedEarths.push({
                idx: idx,
                color: colorValue,
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
        color: "", 
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
      
      // 使用函数式更新，避免依赖于之前的状态
      setEarthData(initialData);
      
    } catch (error) {
      console.error("处理合约数据时发生错误:", error);
      // 创建备用数据
      const newData = Array(gridSize * gridSize).fill().map((_, index) => ({ 
        idx: index,
        color: "", 
        price: 0, 
        image_url: "" 
      }));
      setEarthData(newData);
      showToast("Failed to load contract data. Using placeholder data.", "error");
    }
    // 删除多余的else分支，因为已经在前面处理了没有合约数据的情况
  }, [earthsData, gridSize]);

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
  

  // 处理方块点击
  const handleTileClick = (index) => {
    if (!isConnected) {
      showToast("Please connect your wallet first", "error");
      return;
    }

    console.log(`Clicked tile #${index}:`, earthData[index]);

    // 检查方块是否已被购买 - 使用idx字段
    const earth = earthData[index];
    const hasColor = earth.color && earth.color !== "";
    const hasImage = earth.image_url && earth.image_url.trim() !== "";
    const isPurchased = hasColor || hasImage;
    
    if (isPurchased) {
      showToast("This pixel has already been purchased", "error");
      return;
    }

    // 设置选中的方块索引为位置索引，而不是数据索引
    setSelectedTile(index);
    showToast(`Pixel #${index} selected`, "info");
  };



  // 处理交易错误的统一函数
  const handleTransactionError = (error) => {
    console.error("Transaction error details:", error);
    
    // 错误消息
    let errorMessage = "Transaction failed";
    
    // 将错误转换为字符串以便检查各种错误模式
    const errorStr = typeof error === 'object' ? JSON.stringify(error) : String(error);
    const errorLower = errorStr.toLowerCase();
    
    try {
      // 检查各种可能的错误类型
      if (errorLower.includes("slice") && errorLower.includes("out-of-bounds")) {
        errorMessage = "Contract data error: Please try refreshing the page and try again.";
        console.log("Slice error detected, please refresh the page");
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
      console.error("Error parsing error message:", parseError);
    }
    
    // 显示友好的错误消息
    showToast(errorMessage, "error");
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
        earth && ((earth.color && earth.color !== "") || (earth.image_url && earth.image_url.trim() !== ""))
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

  // 优化渲染网格的方法，使用React.memo避免不必要的重新渲染
  const GridTile = React.memo(({ earth, index, selectedTile, handleTileClick }) => {
    // 确保earth对象有效
    if (!earth) {
      console.warn(`位置 ${index} 的earth数据无效`);
      earth = { idx: index, color: "", price: 0, image_url: "" };
    }
    
    // 检查是否有颜色和图片
    const hasColor = earth.color && earth.color !== "";
    const hasImage = earth.image_url && earth.image_url.trim() !== "";
    
    // 确定背景颜色
    const backgroundColor = hasColor ? earth.color : '#FFFFFF';
    
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
            color={backgroundColor} 
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
  }, (prevProps, nextProps) => {
    // 只有在这些属性变化时才重新渲染
    return (
      prevProps.selectedTile === nextProps.selectedTile &&
      prevProps.earth.color === nextProps.earth.color &&
      prevProps.earth.image_url === nextProps.earth.image_url
    );
  });

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
        {earthData.map((earth, index) => (
          <GridTile 
            key={index}
            earth={earth} 
            index={index} 
            selectedTile={selectedTile} 
            handleTileClick={handleTileClick}
          />
        ))}
      </Grid>
    );
  };

  

  
  return (
    <FullScreenContainer>
      <AppHeader>
        <Logo>
          <LogoIcon>🧩</LogoIcon>
          <LogoTextGroup>
            <LogoText>Nads Pixel World</LogoText>
            <LogoSubtitle>Nads' Home, Build and Powered by Community.</LogoSubtitle>
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
                        <NetworkButton onClick={openChainModal}>
                          {chain?.name || "Unknown Network"}
                        </NetworkButton>
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
              showToast("Please select a pixel first", "error");
            } else {
              setShowSettingsModal(true);
            }
          }}
          title="Customize pixel"
        >
          <CustomizeIcon>🎨</CustomizeIcon> Customize This Pixel
        </FloatingActionButton>
        </MainContent>
      {
        showSettingsModal && (
          <SettingsModal 
            setShowSettingsModal={setShowSettingsModal}
            selectedTile={selectedTile}
            setSelectedTile={setSelectedTile}
          />
        )
      }
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
  padding: 12px 15px;
  background-color: white;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  position: sticky;
  top: 0;
  z-index: 100;
  
  @media (max-width: 768px) {
    padding: 8px 10px;
    flex-direction: column;
  }
`;

const MainContent = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  padding: 0;
  position: relative;
  background-color: #ffffff;
  overflow-x: hidden;
`;

const GridContainer = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 10px;
  margin-top: 0;
  overflow-x: hidden;
  
  @media (max-width: 768px) {
    padding: 5px;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(${props => props.$gridSize}, 45.2px);
  grid-template-rows: repeat(${props => props.$gridSize}, 45.2px);
  gap: 1px;
  background-color: #ffffff;
  border-radius: 8px;
  margin: 5px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(200, 200, 200, 0.3);
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(${props => props.$gridSize}, 1fr);
    grid-template-rows: repeat(${props => props.$gridSize}, 1fr);
    width: 100%;
    gap: 2px;
    margin: 0;
  }
`;


const StyledWalletConnected = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  
  @media (max-width: 768px) {
    gap: 5px;
    flex-wrap: wrap;
    justify-content: center;
  }
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
  
  @media (max-width: 768px) {
    padding: 6px 10px;
    font-size: 13px;
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




// 修改浮动操作按钮样式
const FloatingActionButton = styled.button`
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: #2196f3;
  color: white;
  border: none;
  border-radius: 30px;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
  cursor: pointer;
  transition: all 0.2s;
  z-index: 1000;
  display: flex;
  align-items: center;
  
  &:hover {
    background-color: #1976d2;
    box-shadow: 0 6px 14px rgba(33, 150, 243, 0.4);
  }
  
  @media (max-width: 768px) {
    bottom: 15px;
    padding: 10px 20px;
    font-size: 14px;
    width: auto;
  }
`;

// 替换设置图标组件
const CustomizeIcon = styled.span`
  font-size: 20px;
  line-height: 1;
  margin-right: 8px;
`;

// 替换TestButton为NetworkButton样式
const NetworkButton = styled.button`
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
  
  @media (max-width: 768px) {
    padding: 6px 12px;
    font-size: 14px;
    margin: 5px;
  }
`;

// Logo相关样式
const Logo = styled.div`
  display: flex;
  align-items: center;
  margin-right: auto;
  height: 40px;
  
  @media (max-width: 768px) {
    margin-right: 0;
    margin-bottom: 8px;
    width: 100%;
    justify-content: center;
  }
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
  font-size: 26px;
  font-weight: 700;
  margin: 0;
  color: #333;
  letter-spacing: 0.5px;
  line-height: 1.2;
  
  @media (max-width: 768px) {
    font-size: 22px;
  }
`;

const LogoSubtitle = styled.span`
  font-size: 14px;
  color: #888;
  margin-top: 0px;
  line-height: 1.2;
  
  @media (max-width: 768px) {
    font-size: 12px;
  }
`;

// 钱包部分样式
const WalletSection = styled.div`
  display: flex;
  align-items: center;
  background-color: #e8f2fa;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid #ddd;
  
  @media (max-width: 768px) {
    width: 100%;
    justify-content: center;
    padding: 6px 10px;
  }
`;



export default App;