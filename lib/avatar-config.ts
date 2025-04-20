export const avatars = [
  "Panda", "Tiger", "Eagle", "Wolf", "Lion", "Bear",
  "Shark", "Fox", "Rhino", "Sloth", "Kooula", "Dragon",
  "Deer", "Rabbit", "Falcon", "Dragon", "Knight", "Phoenix",
  "Player", "Gamer", "Hero", "Ranger", "Wärior", "Hunter",
];

export const baseImageWidth = 952;
export const baseImageHeight = 800;
export const rows = 4;
export const columns = 6;
export const imageUrl = "https://nfjcunaepkauiowy.public.blob.vercel-storage.com/new-avatars-ZR3xelohwqTPDzmioWp6t5FDVFyXwy.png";

// Now accepts target dimension for scaling
export const getAvatarStyle = (index: number, dimension: number) => {
  if (index < 0 || index >= avatars.length || dimension <= 0) {
    return {};
  }
  const baseAvatarWidth = baseImageWidth / columns;
  const baseAvatarHeight = baseImageHeight / rows;
  
  // Determine the intrinsic size of one avatar slot
  // Let's assume we want to fit the avatar width into the dimension
  const scaleFactor = dimension / baseAvatarWidth; 
  
  // Calculate the scaled size of the entire sprite sheet
  const scaledBgWidth = baseImageWidth * scaleFactor;
  const scaledBgHeight = baseImageHeight * scaleFactor;

  const row = Math.floor(index / columns);
  const col = index % columns;
  
  // Calculate the offset based on the original sprite sheet
  const offsetX = col * baseAvatarWidth;
  const offsetY = row * baseAvatarHeight;

  // Calculate the scaled offset for the background position
  const scaledOffsetX = offsetX * scaleFactor;
  const scaledOffsetY = offsetY * scaleFactor;

  // Return styles for scaled background image positioning
  return {
    backgroundImage: `url(${imageUrl})`,
    backgroundSize: `${scaledBgWidth}px ${scaledBgHeight}px`,
    backgroundPosition: `-${scaledOffsetX +3 }px -${scaledOffsetY +2}px`,
    imageRendering: "pixelated" as const,
    backgroundRepeat: 'no-repeat',
  };
}; 