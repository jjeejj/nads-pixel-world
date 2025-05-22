export const getColorFromStorage = () => {
  return JSON.parse(localStorage.getItem('customHistoryColorArray') || '[]');
}

export const setColorToStorage = (color) => {
  const oldColor = getColorFromStorage();
  if (oldColor.includes(color)) {
    return;
  }
  const newColor = [color,...oldColor].slice(0, 6);
  localStorage.setItem('customHistoryColorArray', JSON.stringify(newColor));
}

