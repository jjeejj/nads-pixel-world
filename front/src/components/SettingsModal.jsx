import React, { useRef, useEffect, useState } from 'react';
import styled from 'styled-components';
import CustomColorSelector from './CustomColorSelector';
import { useToast } from './Toast/useToast';

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

const TwitterManualGuide = styled.div`
  margin-top: 15px;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e1e8ed;
`;

const ManualGuideHeader = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #1da1f2; /* Twitter蓝 */
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  
  &:before {
    content: "ℹ️";
    margin-right: 8px;
  }
`;

const ManualGuideDescription = styled.div`
  font-size: 14px;
  color: #333;
  margin-bottom: 15px;
`;

const ManualGuideStepList = styled.ul`
  list-style-type: none;
  padding-left: 0;
`;

const ManualGuideStep = styled.li`
  margin: 8px 0;
  font-size: 14px;
  color: #333;
  display: flex;
  align-items: center;
  line-height: 1.5;
`;

const StepNumber = styled.span`
  font-weight: 600;
  margin-right: 10px;
`;

const StepText = styled.span`
  font-weight: 500;
`;

const TwitterPhotoButton = styled.a`
  color: #1da1f2;
  text-decoration: none;
  font-weight: 500;
  
  &:hover {
    text-decoration: underline;
  }
`;

const LinkIcon = styled.span`
  margin-right: 5px;
`;

const SwitchToCustomButton = styled.button`
  margin-top: 10px;
  background-color: #1da1f2;
  color: white;
  border: none;
  border-radius: 20px;
  padding: 8px 15px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #0c85d0;
  }
`;

const ManualGuideTip = styled.div`
  font-size: 12px;
  color: #666;
  margin-top: 10px;
`;

const TipIcon = styled.span`
  margin-right: 5px;
`;

const SearchIcon = styled.span`
  margin-right: 5px;
`;

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

// 设置模态框组件
const SettingsModal = React.memo((props) => {
  const { showToast } = useToast();
  const { setShowSettingsModal } = props;
  const [imageUrl, setImageUrl] = useState("");
  const [selectedColor, setSelectedColor] = useState(0); // 默认不选颜色
  const [customColor, setCustomColor] = useState("#FF00FF"); // 默认自定义颜色为紫色
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


  // 添加useEffect来处理输入框的特殊焦点问题
  useEffect(() => {
    // 初始聚焦输入框
    const inputEl = usernameInputRef.current;
    if (inputEl) {
      setTimeout(() => {
        inputEl.focus();
      }, 100);
    }
  }, []);

    // 处理购买方块
  const handleBuyEarth = () => {
    if (selectedTile === null) {
      showToast("Please select a pixel first", "error");
      return;
    }

    // 检查选择的格子索引是否在有效范围内
    if (selectedTile < 0 || selectedTile >= earthData.length) {
      showToast("Selected pixel is invalid, please select a different pixel", "error");
      setSelectedTile(null);
      return;
    }

    // 检查是否选择了颜色或提供了图片URL
    const hasColor = selectedColor !== 0;
    const hasImage = imageUrl.trim() !== "";
    
    // 允许只提供图片URL，不再要求必须选择颜色
    if (!hasColor && !hasImage) {
      showToast("Please provide an image URL or select a color", "error");
      return;
    }

    // 检查选中的方块是否已经被购买
    const selectedEarth = earthData[selectedTile];
    if (selectedEarth && ((selectedEarth.color && selectedEarth.color !== "") || (selectedEarth.image_url && selectedEarth.image_url.trim() !== ""))) {
      showToast("This pixel is already purchased. Please select another pixel.", "error");
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
      console.log(`Using custom color: ${customColor}`);
      console.log(`Selected color ID: ${colorId}, Custom color value: ${customColor}`);
    }

    // 准备实际要传递的颜色值（字符串形式）
    let colorValue = ""; // 默认为空字符串
    if (colorId === 0) {
      colorValue = ""; // 未选择颜色，传空字符串
    } else if (colorId === 7) {
      colorValue = customColor; // 自定义颜色
    } else if (colorMap[colorId]) {
      colorValue = colorMap[colorId]; // 预设颜色
    }

    // 如果用户没有选择颜色，也没有提供图片，默认设置为空字符串
    if (!hasColor && !hasImage) {
      colorValue = "";
      showToast("Please provide an image URL or select a color", "error");
      return;
    }

    // 显示正在处理的提示
    showToast("Processing transaction...", "info");

    try {
      // 位置索引就是selectedTile，它是视觉上的位置索引
      const positionIdx = selectedTile;
      
      console.log(`Buying pixel: position=${positionIdx}, color=${colorValue}`);
      console.log(`Current grid size: ${gridSize}x${gridSize}, total tiles: ${earthData.length}`);
      
      // 检查是否有效的位置索引
      if (isNaN(positionIdx) || positionIdx < 0) {
        showToast("Invalid position index", "error");
        return;
      }
      
      const config = {
        args: [positionIdx, colorValue, finalImageUrl],
        onSettled: (data, error) => {
          if (error) {
            console.error("Transaction processing error:", error);
            // 处理错误
            handleTransactionError(error);
          } else if (data) {
            console.log("Transaction submitted:", data);
          }
        },
        onSuccess: (data) => {
          console.log("Transaction sent successfully:", data);
          showToast("Transaction submitted successfully!", "info");
        }
      };
      
      // 在发送交易前进行最后确认
      console.log("Preparing to send transaction, params:", config.args);
      buyEarthWrite(config);
    } catch (error) {
      console.error("Error buying pixel:", error);
      handleTransactionError(error);
    }
    // setShowSettingsModal(false)
  };

  

  // 重置预览
  const resetPreview = () => {
    setShowPreview(false);
    setPreviewUrl("");
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

  // 处理自定义颜色变化
  const handleCustomColorChange = (e) => {
    // 阻止事件冒泡，防止触发父元素的点击事件
    e.stopPropagation();
    console.log("Custom color changed:", e.target.value);
    // 获取新的颜色值
    const newColor = e.target.value;
    console.log("Selected new custom color:", newColor);
    
    // 立即更新状态
    setCustomColor(newColor);
    
    // 自动选择自定义颜色选项（如果还没选中）
    if (selectedColor !== 7) {
      setSelectedColor(7);
      showToast(`Custom color selected: ${newColor}`, "info");
    }
  };

   // 在ColorOption和CustomColorContainer中单独处理点击事件
   const handleColorOptionClick = (colorValue, e) => {
    // 阻止事件冒泡
    if (e) e.stopPropagation();
    
    if (selectedColor === colorValue && colorValue !== 7) {
      // 如果用户点击已选中的颜色，取消选择
      setSelectedColor(0);
      showToast("Color deselected", "info");
    } else {
      setSelectedColor(colorValue);
      if (colorValue === 7) {
        console.log(`选择了自定义颜色: ${customColor}`);
        showToast(`Custom color ${customColor} selected`, "info");
      } else {
        showToast(`Color ${colorMap[colorValue]} selected`, "info");
      }
    }
  };

  // 处理社交媒体平台选择
  const handlePlatformChange = (e) => {
    setPlatform(e.target.value);
    // 当切换平台时重置预览
    setShowPreview(false);
    // 重置Twitter获取失败状态
    setTwitterFetchFailed(false);
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
            showToast("Unable to automatically obtain Twitter avatar, please follow the instructions to manually obtain it", "error");
            return;
          }
      } catch (error) {
          console.error("Avatar fetch failed:", error);
          
          if (platform === 'twitter') {
            setTwitterFetchFailed(true);
            showToast("Unable to automatically obtain Twitter avatar, please follow the instructions to manually obtain it", "error");
            return;
          }
          
          // 使用备选方案
          avatarUrl = getAvatarFromUIAvatars(username, platform);
        }
        
        // 如果头像获取失败，使用默认头像
        if (!avatarUrl) {
          if (platform === 'twitter') {
            setTwitterFetchFailed(true);
            showToast("Unable to automatically obtain Twitter avatar, please follow the instructions to manually obtain it", "error");
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
  
  return (
    <ModalOverlay onClick={(e) => {
      // 仅当点击背景时关闭模态框
      if (e.target === e.currentTarget) {
        setShowSettingsModal(false);
      }
    }}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>Pixel Settings</ModalTitle>
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
            <SectionTitle>Set Image (Optional)</SectionTitle>
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
                defaultValue={username}
                onChange={(e) => setUsername(e.target.value)}
                onBlur={(e) => {
                  // 检查是否因为点击了其他元素而失焦
                  const relatedTarget = e.relatedTarget;
                  // 如果不是因为点击了Fetch按钮或Select，就重新聚焦
                  if (!relatedTarget || 
                      (relatedTarget.tagName !== 'BUTTON' && 
                       relatedTarget.tagName !== 'SELECT')) {
                    // 为防止与其他点击事件冲突，使用短延时
                    setTimeout(() => {
                      if (usernameInputRef.current) {
                        usernameInputRef.current.focus();
                      }
                    }, 10);
                  }
                }}
                autoComplete="off"
              />
              <FetchButton onClick={handleGetAvatarUrl}>Fetch</FetchButton>
            </InputGroup>
            
            {/* Twitter获取失败时显示手动指引 */}
            {twitterFetchFailed && platform === 'twitter' && (
              <TwitterManualGuide>
                <ManualGuideHeader>
                  <SearchIcon>🔍</SearchIcon> Fetch Failed, Try Manual Method
                </ManualGuideHeader>
                
                <ManualGuideDescription>
                  Twitter avatar fetch failed, follow these steps to get it manually:
                </ManualGuideDescription>
                
                <ManualGuideStepList>
                  <ManualGuideStep>
                    <StepNumber>1.</StepNumber>
                    <TwitterPhotoButton 
                      href={`https://x.com/${username}/photo`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <LinkIcon>🔗</LinkIcon> Open Twitter Photo Page
                    </TwitterPhotoButton>
                  </ManualGuideStep>
                  
                  <ManualGuideStep>
                    <StepNumber>2.</StepNumber>
                    <StepText>Right-click on the image → Select "Copy Image Address"</StepText>
                  </ManualGuideStep>
                  
                  <ManualGuideStep>
                    <StepNumber>3.</StepNumber>
                    <SwitchToCustomButton onClick={() => setPlatform('custom')}>
                      Switch to Custom URL
                    </SwitchToCustomButton>
                  </ManualGuideStep>
                  
                  <ManualGuideStep>
                    <StepNumber>4.</StepNumber>
                    <StepText>Paste the copied image URL → Click "Get Avatar"</StepText>
                  </ManualGuideStep>
                </ManualGuideStepList>
                
                <ManualGuideTip>
                  <TipIcon>💡</TipIcon> Image URL should start with "pbs.twimg.com/profile_images"
                </ManualGuideTip>
              </TwitterManualGuide>
            )}

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
          I'll take it
          </ActionButton>
        </ModalBody>
      </ModalContent>
    </ModalOverlay>
  );
});

export default SettingsModal;

