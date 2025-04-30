import React from 'react';
import styled from 'styled-components';

const GridTile = React.memo(({ earth, index, selectedTile, handleTileClick, isEditSelected, isDeleteSelected, editTileData }) => {
  // 确保earth对象有效
  if (!earth) {
    console.warn(`位置 ${index} 的earth数据无效`);
    earth = { idx: index, color: "", price: 0, image_url: "" };
  }

  // 检查是否有颜色和图片
  const hasColor = earth.color && earth.color !== "";
  const hasImage = earth.image_url && earth.image_url.trim() !== "";

  // 确定背景颜色
  const localEdit = editTileData[index];
  const backgroundColor = localEdit && localEdit.color
    ? localEdit.color
    : (hasColor ? earth.color : '#FFFFFF');

  // 注意：这里我们使用数组索引作为视觉上的位置索引
  // 但购买时使用的是这个位置的索引
  const isSelected = selectedTile === index;
  // 一个方块被认为是已购买的条件：有颜色或有图片
  const isPurchased = hasColor || hasImage;

  return (
    <TileWrapper key={index}>
      <Tile
        $isEditSelected={isEditSelected}
        $isDeleteSelected={isDeleteSelected}
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
  return (
    prevProps.selectedTile === nextProps.selectedTile &&
    prevProps.earth.color === nextProps.earth.color &&
    prevProps.earth.image_url === nextProps.earth.image_url &&
    prevProps.isEditSelected === nextProps.isEditSelected &&
    prevProps.isDeleteSelected === nextProps.isDeleteSelected &&
    prevProps.editTileData === nextProps.editTileData
  );
});

export default GridTile;



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
  border: 2px solid
    ${({ $isEditSelected, $isDeleteSelected }) =>
      $isDeleteSelected ? '#e74c3c' :
      $isEditSelected ? '#3498db' : '#e0e0e0'};
  box-shadow: ${({ $isEditSelected, $isDeleteSelected }) =>
      $isDeleteSelected ? '0 0 8px #e74c3c44' :
      $isEditSelected ? '0 0 8px #3498db44' : 'none'};
  cursor: pointer;
  transition: all 0.2s;
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  border-radius: 4px;
  overflow: hidden;
  &:hover {
    border-color:
      ${({ $isDeleteSelected, $isEditSelected }) =>
        $isDeleteSelected ? '#c0392b' :
        $isEditSelected ? '#1565c0' : '#b0b0b0'};
    /* #1565c0 是更深的蓝色，你也可以用 #2980b9 */
  }
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