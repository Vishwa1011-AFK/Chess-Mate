// src/utils/pieceImages.js

const pieceNames = [
    'wp', 'wr', 'wn', 'wb', 'wq', 'wk',
    'bp', 'br', 'bn', 'bb', 'bq', 'bk'
  ];
  
  // Dynamically import images
  const importImages = async () => {
    const images = {};
    for (const piece of pieceNames) {
      images[piece] = (await import(`../assets/images/pieces/${piece}.png`)).default;
    }
    return images;
  };
  
  // Create a singleton to store images
  let pieceImages;
  
  const getPieceImages = async () => {
    if (!pieceImages) {
      pieceImages = await importImages();
    }
    return pieceImages;
  };
  
  export default getPieceImages;
  