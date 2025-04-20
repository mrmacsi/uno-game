// Arrays of adjectives and nouns for generating random names
const adjectives = [
  "Happy", "Grumpy", "Sleepy", "Sneezy", "Dopey", "Bashful", "Doc",
  "Swift", "Clever", "Brave", "Mighty", "Nimble", "Wise", "Sneaky",
  "Jolly", "Lucky", "Fancy", "Dizzy", "Jumpy", "Silly", "Wild",
  "Royal", "Eager", "Quiet", "Loud", "Quick", "Calm", "Bright",
  "Shiny", "Gentle", "Bold", "Fierce", "Lazy", "Crazy", "Funky"
];

// Import the avatars array to use as nouns
import { avatars } from "@/lib/avatar-config";

/**
 * Generates a random player name from combinations of adjectives and avatar names
 */
export function generateRandomName(): string {
  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  // Use the imported avatars array
  const randomNoun = avatars[Math.floor(Math.random() * avatars.length)];
  return `${randomAdjective}${randomNoun}`;
}

/**
 * Checks if a name is a default generated name by checking its format
 */
export function isDefaultName(name: string): boolean {
  // Check if the name follows our adjective + avatar name pattern
  for (const adj of adjectives) {
    // Use the imported avatars array
    for (const noun of avatars) { 
      if (name === `${adj}${noun}`) {
        return true;
      }
    }
  }
  return false;
} 