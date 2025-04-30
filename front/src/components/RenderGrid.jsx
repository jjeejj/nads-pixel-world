import React, { memo } from 'react';
import GridTile from './GridTile';
import styled from 'styled-components';

const RenderGrid = ({ earthData, gridSize, selectedTile, handleTileClick, editSelectedTiles, deleteSelectedTiles, editTileData }) => {
  if (!Array.isArray(earthData) || earthData.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
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
          isEditSelected={editSelectedTiles.includes(index)}
          isDeleteSelected={deleteSelectedTiles.includes(index)}
          editTileData={editTileData}
        />
      ))}
    </Grid>
  );
};

export default memo(RenderGrid);


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
