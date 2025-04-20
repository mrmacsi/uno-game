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

export const getAvatarStyle = (index: number) => {
  if (index < 0 || index >= avatars.length) {
    // Return default or empty style for invalid index
    return {};
  }
  const baseAvatarWidth = baseImageWidth / columns;
  const baseAvatarHeight = baseImageHeight / rows;
  const row = Math.floor(index / columns);
  const col = index % columns;
  const offsetX = col * baseAvatarWidth;
  const offsetY = row * baseAvatarHeight;

  // Return styles for background image positioning
  return {
    backgroundImage: `url(${imageUrl})`,
    backgroundSize: `${baseImageWidth}px ${baseImageHeight}px`,
    backgroundPosition: `-${offsetX + 3}px -${offsetY + 3}px`,
    imageRendering: "pixelated" as const,
  };
}; 