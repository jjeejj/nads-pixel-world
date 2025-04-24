
import styled from 'styled-components';
import { useRef, useEffect } from 'react';

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
// 实现一个简单直接的CustomColorSelector组件
const CustomColorSelector = ({ value, onChange, selected, onClick }) => {
  // 当颜色变化时
  const handleChange = (e) => {
    // 只阻止事件冒泡，但不阻止默认行为
    e.stopPropagation();
    // 移除 e.preventDefault() 以允许颜色选择器正常打开
    
    const newColor = e.target.value;
    console.log("Color picker selected new color:", newColor);
    // 确保选择了自定义颜色选项（colorId=7）
    onClick(e); // 触发点击事件，设置selectedColor为7
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
          onClick={(e) => {
            // 只阻止事件冒泡，但不阻止默认行为
            e.stopPropagation();
            // 移除 e.preventDefault() 以允许颜色选择器正常打开
            console.log("颜色选择器被点击，当前颜色值:", value);
          }}
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

export default CustomColorSelector;