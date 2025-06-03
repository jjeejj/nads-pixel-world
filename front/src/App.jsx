import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId,
  useSimulateContract,
  useAccountEffect
} from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { parseEther } from 'viem';
import { ethers } from 'ethers';
import { BrowserProvider } from 'ethers';
import styled from 'styled-components';
import './App.css';
import { getContractConfig } from './config';
import SettingsModal from './components/SettingsModal';
import ConfirmModal from './components/ConfirmModal';
// BuyEarth合约ABI
import contractABI from './abi.json'; // 正确导入ABI
import { useToast } from './components/Toast/useToast';
import RenderGrid from './components/RenderGrid';
// 从配置获取合约地址
const contractConfig = getContractConfig();
const contractAddress = contractConfig.address;

const App = () => {
  const { showToast } = useToast();
  const [selectedTile, setSelectedTile] = useState(null);
  const [gridSize, setGridSize] = useState(10); // 初始网格大小
  const [earthData, setEarthData] = useState([]); // 初始化为空数组

  // 记录编辑选中的格子（待提交）
  const [editSelectedTiles, setEditSelectedTiles] = useState([]); // [id, id, ...]
  // 记录删除模式和删除选中的格子
  const [deleteMode, setDeleteMode] = useState(false);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [multiSelectTiles, setMultiSelectTiles] = useState([]); // [id, id, ...]
  const [deleteSelectedTiles, setDeleteSelectedTiles] = useState([]); // [id, id, ...]
  const deleteModeRef = useRef(false);
  const multiSelectModeRef = useRef(false);
  const isConnectedRef = useRef(false);
  const accountInfoRef = useRef(null);
  const { disconnect } = useDisconnect();
  const chainId = useChainId(); // 获取当前连接的链ID
  const [showSettingsModal, setShowSettingsModal] = useState(false); // 新增设置模态框状态
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  useAccountEffect({
    onConnect(data) {
      console.log('Connected!', data)
      accountInfoRef.current = data;
      isConnectedRef.current = true;
    },
    onDisconnect() {
      console.log('Disconnected!')
      accountInfoRef.current = null;
      isConnectedRef.current = false;
    },
  })

  // Toast状态
  const [toast, setToast] = useState({
    visible: false,
    message: "",
    type: "info"
  });

  useEffect(() => {
    deleteModeRef.current = deleteMode;
  }, [deleteMode]);

  useEffect(() => {
    multiSelectModeRef.current = multiSelectMode;
  }, [multiSelectMode]);


  // 读取所有方块数据
  const { data: earthsData, refetch, isError: isReadError, error: readError } = useReadContract({
    address: contractAddress,
    abi: contractABI,
    functionName: 'getEarths',
    // 添加错误处理
    onError: (error) => {
      console.error("读取合约数据错误:", error);
      showToast("Failed to load contract data. Please try refreshing.", "error");
    }
  });


  // 批量购买/编辑
  const { writeContractAsync: batchBuyEarthWrite, isSuccess: isBuySuccess, isError: isBuyError, error: buyError } = useWriteContract();

  // 批量删除
  const { writeContractAsync: batchClearEarthWrite, isSuccess: isClearSuccess, isError: isClearError, error: clearError } = useWriteContract();

  useEffect(() => {
    if (isBuyError) {
      handleTransactionError(buyError);
    } else if (isBuySuccess) {
      refetch();
      showToast("Purchase successful!", "info");
      setSelectedTile(null);
      setEditSelectedTiles([]);
      setMultiSelectTiles([]);
      // setEditTileData([]);
      checkAndExpandGrid();
      setMultiSelectMode(false);
      setDeleteMode(false);
    }
  }, [isBuySuccess, isBuyError, buyError]);

  // 添加对EarthPurchased事件的监听
  const [eventData, setEventData] = useState(null);

  // 使用useEffect监听合约事件
  useEffect(() => {
    if (!contractAddress || !isConnectedRef.current) return;

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
        const listener = (idx, color, image_url, owner, price) => {
          console.log("检测到新的EarthPurchased事件:", { idx, color, image_url, owner, price });
          setEventData({ idx, color, image_url, owner, price });
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
  }, [contractAddress, isConnectedRef, refetch]);

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
      checkAndExpandGrid(); // 在初始化数据后调用
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
                image_url: earth.image_url || "",
                owner: earth.owner || ""
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
            console.warn(`地块idx(${earth.idx})超出有效范围(0-${initialData.length - 1})`);
          }
        });
      }

      // 使用函数式更新，避免依赖于之前的状态
      setEarthData(initialData);
      checkAndExpandGrid(); // 在初始化数据后调用

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

  // 记录每个格子的编辑信息
  const [editTileData, setEditTileData] = useState([]); // {id: {color, image_url}}
  // 处理方块点击
  const handleTileClick = useCallback((index) => {
    const currentDeleteMode = deleteModeRef.current;
    console.log('handleTileClick', isConnectedRef.current);
    if (!isConnectedRef.current) {
      showToast("Please connect your wallet first", "error");
      return;
    }
    // 非删除模式，禁止编辑已被购买的格子
    const earth = earthData[index];
    const hasColor = earth.color && earth.color !== "";
    const hasImage = earth.image_url && earth.image_url.trim() !== "";
    console.log('当前格子owner:', earth.owner, '当前用户:', accountInfoRef.current.address);
    const isPurchased = !!earth.owner && earth.owner !== accountInfoRef.current.address;
    if (isPurchased) {
      showToast("This pixel has already been purchased", "error");
      return;
    }
    if (multiSelectModeRef.current) {
      setMultiSelectTiles(prev => prev.includes(index) ? prev.filter(id => id !== index) : [...prev, index]);
    } else if (currentDeleteMode) {
      if (earthData[index].owner === accountInfoRef.current.address) {
        setDeleteSelectedTiles(prev =>
          prev.includes(index) ? prev.filter(id => id !== index) : [...prev, index]
        );
      }
    } else {
      setSelectedTile(index);
      setShowSettingsModal(true);
    }
  }, [earthData, accountInfoRef.current, selectedTile, setSelectedTile, setShowSettingsModal, isConnectedRef]);

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

  // 更新检查格子扩展的函数
  const checkAndExpandGrid = () => {
    try {
      // 计算购买的格子数量
      const purchasedCount = earthData.filter(earth =>
        earth && earth.owner && earth.owner !== ""
      ).length;

      // 检查剩余空格子是否低于总格子的20%
      const totalTiles = gridSize * gridSize;
      const remainingTiles = totalTiles - purchasedCount;

      console.log(`Grid status: ${purchasedCount} purchased, ${remainingTiles} remaining out of ${totalTiles} total`);
      console.log(`Condition check: remainingTiles (${remainingTiles}) < totalTiles * 0.8 (${totalTiles * 0.8}) = ${remainingTiles < totalTiles * 0.8}`); // 添加日志

      if (remainingTiles < totalTiles * 0.8) {
        // 需要扩展网格 - 增加100%
        const newSize = Math.ceil(gridSize * 2);

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

  // SettingsModal 相关回调
  const handleConfirmPixelSetting = (pixel) => {
    setEditSelectedTiles(prev => {
      const others = prev.filter(id => id !== pixel.id);
      return [...others, pixel.id];
    });
    setEditTileData(prev => ({ ...prev, [pixel.id]: { ...pixel, color: pixel.color, image_url: pixel.image_url } }));
    setShowSettingsModal(false);
    setSelectedTile(null);
  };
  const handleConfirmMultiSelect = (pixel) => {
    setEditSelectedTiles([...multiSelectTiles]);
    setEditTileData(prev => ({
      ...prev,
      ...multiSelectTiles.reduce((acc, id) => ({
        ...acc,
        [id]: { color: pixel.color, image_url: pixel.image_url }
      }), {})
    }));
    setShowSettingsModal(false);
    setSelectedTile(null);
  };
  const handleCancelPixelSetting = (id) => {
    // 如果已经是编辑选中（已保存），只关闭弹窗，不清除
    if (editSelectedTiles.includes(id)) {
      setShowSettingsModal(false);
      setSelectedTile(null);
      return;
    }
    // 否则清除本地编辑数据
    setEditSelectedTiles(prev => prev.filter(tid => tid !== id));
    setEditTileData(prev => {
      const newData = { ...prev };
      delete newData[id];
      return newData;
    });
    setShowSettingsModal(false);
    setSelectedTile(null);
  };

  useEffect(() => {
    if (!deleteMode) {
      setDeleteSelectedTiles([]);
    }
  }, [deleteMode]);

  useEffect(() => {
    if (!multiSelectMode) {
      setMultiSelectTiles([]);
      setEditSelectedTiles([]);
    }
  }, [multiSelectMode]);

  // 监控批量删除的状态
  useEffect(() => {
    if (isClearError) {
      handleTransactionError(clearError);
    } else if (isClearSuccess) {
      refetch();
      showToast("Delete successful!", "info");
      // 清理状态
      setDeleteSelectedTiles([]);
      setDeleteMode(false);
    }
  }, [isClearSuccess, isClearError, clearError]);

  // 添加 loading 状态
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleBatchSubmit = async () => {
    if (editSelectedTiles.length === 0) return;

    // 设置加载状态
    setIsSubmitting(true);

    try {
      console.log('editSelectedTiles:', editSelectedTiles);
      console.log('editTileData:', editTileData);
      // 组装参数
      const earths = editSelectedTiles.map(idx => {
        const data = editTileData[idx] || {};
        // 确保所有字段都有值，不为undefined
        return {
          idx: Number(idx) || 0,
          color: data.color || '',
          image_url: data.image_url || '',
          owner: accountInfoRef.current.address || '',
          price: Number(data.price) || 0
        };
      });

      // 检查是否所有地块都是修改现有地块
      const isAllModification = earths.every(earth => {
        // 找到对应的原始地块数据
        const originalEarth = earthData[earth.idx];
        // 如果原始地块存在、已有颜色或图片、且归属者是当前用户，则是修改操作
        return originalEarth &&
          ((originalEarth.color && originalEarth.color !== '') ||
            (originalEarth.image_url && originalEarth.image_url !== '')) &&
          originalEarth.owner === accountInfoRef.current.address;
      });

      // 根据是否是修改操作决定支付金额
      let totalValue = 0n;
      if (!isAllModification) {
        // 如果不是全部都是修改操作（有新购买），则计算购买费用
        // 计算需要购买的地块数量
        const newPurchaseCount = earths.filter(earth => {
          const originalEarth = earthData[earth.idx];
          return !originalEarth ||
            ((!originalEarth.color || originalEarth.color === '') &&
              (!originalEarth.image_url || originalEarth.image_url === '')) ||
            originalEarth.owner !== accountInfoRef.current.address;
        }).length;

        totalValue = parseEther('0.01') * BigInt(newPurchaseCount);
      }

      console.log('是否全部为修改操作:', isAllModification);
      console.log('totalValue:', totalValue.toString());

      console.log('earths:', earths);

      await batchBuyEarthWrite({
        address: contractAddress,
        abi: contractABI,
        functionName: 'batchBuyEarth',
        args: [earths],
        value: totalValue
      });
    } catch (error) {
      console.error('执行交易失败:', error);
      handleTransactionError(error);
    } finally {
      // 无论成功还是失败，都结束加载状态
      setIsSubmitting(false);
    }
  };

  const handleBatchDelete = async () => {
    if (deleteSelectedTiles.length === 0) return;

    // 设置加载状态
    setIsDeleting(true);

    try {
      // 确保所有idx都是数字
      const cleanedIds = deleteSelectedTiles.map(id => Number(id) || 0);
      await batchClearEarthWrite({
        address: contractAddress,
        abi: contractABI,
        functionName: 'batchClearEarthSetting',
        args: [cleanedIds]
      });
    } catch (error) {
      console.error('执行删除交易失败:', error);
      handleTransactionError(error);
    } finally {
      // 无论成功还是失败，都结束加载状态
      setIsDeleting(false);
    }
  };

  const [showConfirmModal, setShowConfirmModal] = useState(false);

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
          <RenderGrid
            earthData={earthData}
            gridSize={gridSize}
            selectedTile={selectedTile}
            handleTileClick={handleTileClick}
            editSelectedTiles={editSelectedTiles}
            deleteSelectedTiles={deleteSelectedTiles}
            multiSelectTiles={multiSelectTiles}
            editTileData={editTileData}
          />
        </GridContainer>

        {showSettingsModal && (
          <SettingsModal
            setShowSettingsModal={setShowSettingsModal}
            selectedTile={selectedTile}
            setSelectedTile={setSelectedTile}
            earthData={earthData}
            // 回显数据：如果已卖出且owner是自己，传递earthData[selectedTile]，否则editTileData[selectedTile]或默认
            pixelData={(() => {
              const earth = earthData[selectedTile];
              if (earth && (earth.owner === accountInfoRef.current.address)) {
                return earth;
              }
              return editTileData[selectedTile] || { color: '', image_url: '' };
            })()}
            onConfirmPixelSetting={handleConfirmPixelSetting}
            onCancelPixelSetting={handleCancelPixelSetting}
            multiSelectMode={multiSelectMode}
            onConfirmMultiSelect={handleConfirmMultiSelect}
          />
        )}
      </MainContent>
      <BottomBar>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          {/* 普通模式下的按钮 */}
          {!multiSelectMode && !deleteMode && (
            <>
              <BottomBarButton
                active={!!multiSelectMode}
                onClick={() => setMultiSelectMode(!multiSelectMode)}
                disabled={editSelectedTiles.length > 0}
              >
                Multi select mode
              </BottomBarButton>
              {/* <BottomBarButton
                active={!!deleteMode}
                onClick={() => setDeleteMode(!deleteMode)}
                disabled={editSelectedTiles.length > 0}
              >
                clean setting mode
              </BottomBarButton> */}
              <BottomBarButton
                active={editSelectedTiles.length > 0}
                disabled={editSelectedTiles.length === 0 || isSubmitting}
                onClick={handleBatchSubmit}
              >
                {isSubmitting ? 'Processing...' : 'I\'ll take it'}
              </BottomBarButton>
            </>
          )}

          {/* 多选模式下的按钮 */}
          {multiSelectMode && (
            <>
              <BottomBarButton
                active={true}
                onClick={() => setMultiSelectMode(false)}
              >
                Exit Multi select mode
              </BottomBarButton>
              <BottomBarButton
                danger
                active={multiSelectTiles.length > 0}
                disabled={multiSelectTiles.length === 0 || isDeleting}
                ml={8}
                onClick={() => {
                  if (multiSelectTiles.length === 0) return;
                  setShowSettingsModal(true);
                }}
              >
                Select color
              </BottomBarButton>
              {
                editSelectedTiles.length > 0 && (
                  <BottomBarButton
                    active={editSelectedTiles.length > 0}
                    disabled={editSelectedTiles.length === 0 || isSubmitting}
                    onClick={handleBatchSubmit}
                  >
                    {isSubmitting ? 'Processing...' : 'I\'ll take it'}
                  </BottomBarButton>
                )
              }
            </>
          )}

          {/* 删除模式下的按钮 */}
          {deleteMode && (
            <>
              <BottomBarButton
                active={true}
                onClick={() => setDeleteMode(false)}
              >
                Exit clean setting mode
              </BottomBarButton>
              <BottomBarButton
                danger
                active={deleteSelectedTiles.length > 0}
                disabled={deleteSelectedTiles.length === 0 || isDeleting}
                ml={8}
                onClick={() => {
                  if (deleteSelectedTiles.length === 0) return;
                  setShowConfirmModal(true);
                }}
              >
                {isDeleting ? 'Deleting...' : 'Confirm Clean'}
              </BottomBarButton>
            </>
          )}
        </div>
        {/* <BottomBarLegend>
          <BottomBarLegendItem>
            <LegendColor color="#3498db" bg="#eaf6fd" />
            Selected (Pending)
          </BottomBarLegendItem>
          <BottomBarLegendItem>
            <LegendColor color="#e74c3c" bg="#fdeaea" />
            To Delete
          </BottomBarLegendItem>
          <BottomBarLegendItem>
            <LegendColor color="#e0e0e0" bg="#fff" />
            Normal
          </BottomBarLegendItem>
        </BottomBarLegend> */}
      </BottomBar>

      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={() => {
          // 通过调用handleBatchDelete函数处理删除操作
          handleBatchDelete();
          setShowConfirmModal(false);
        }}
        title="Confirm Clean"
        message={`Are you sure you want to clean the selected pixel setting? This action cannot be undone.`}
        confirmButtonText={isDeleting ? "Processing..." : "Confirm"}
        isLoading={isDeleting}
      />
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
  padding-bottom: 100px;
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

const BottomBar = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  border-top: 1px solid #eee;
  display: flex;
  flex-direction: column;
  background-color: #fff;
  align-items: center;
  z-index: 99;
  padding: 6px 0;
  box-shadow: 0 -2px 8px rgba(0,0,0,0.04);
`;

const BottomBarButton = styled.button`
  background: ${props => props.danger ? (props.active ? '#e74c3c' : '#eee') : (props.active ? '#e74c3c' : '#3498db')};
  color: ${props => props.danger ? (props.active ? '#fff' : '#aaa') : '#fff'};
  border: none;
  border-radius: 8px;
  padding: 4px 12px;
  font-size: 14px;
  height: 30px;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  box-shadow: ${props => props.active ? '0 2px 8px #e74c3c33' : '0 2px 8px #3498db33'};
  transition: all 0.2s;
  margin-left: ${props => props.ml || 0}px;
  @media (max-width: 768px) {
    font-size: 13px;
  }
`;

const BottomBarLegend = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 2px;
  flex-wrap: wrap;
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: start;
    gap: 4px;
  }
`;

const BottomBarLegendItem = styled.div`
  display: flex;
  align-items: center;
  font-size: 12px;
  @media (max-width: 768px) {
    margin-right: 6px;
  }
`;

const LegendColor = styled.span`
  display: inline-block;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  margin-right: 8px;
  border: 2px solid ${props => props.color};
  background: ${props => props.bg};
  @media (max-width: 768px) {
    width: 14px;
    height: 14px;
    margin-right: 5px;
  }
`;

export default App;
