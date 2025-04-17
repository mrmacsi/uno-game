// Arrays of adjectives and nouns for generating random names
const adjectives = [
  "Happy", "Grumpy", "Sleepy", "Sneezy", "Dopey", "Bashful", "Doc",
  "Swift", "Clever", "Brave", "Mighty", "Nimble", "Wise", "Sneaky",
  "Jolly", "Lucky", "Fancy", "Dizzy", "Jumpy", "Silly", "Wild",
  "Royal", "Eager", "Quiet", "Loud", "Quick", "Calm", "Bright",
  "Shiny", "Gentle", "Bold", "Fierce", "Lazy", "Crazy", "Funky"
];

const nouns = [
  "Panda", "Tiger", "Eagle", "Dolphin", "Wolf", "Lion", "Bear",
  "Hawk", "Shark", "Fox", "Owl", "Rhino", "Sloth", "Koala",
  "Penguin", "Moose", "Deer", "Rabbit", "Falcon", "Dragon", "Phoenix",
  "Knight", "Wizard", "Ninja", "Ranger", "Pirate", "Warrior", "Hunter",
  "Player", "Gamer", "Hero", "Champion", "Captain", "Chief", "Boss"
];

/**
 * Generates a random player name from combinations of adjectives and nouns
 */
export function generateRandomName(): string {
  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${randomAdjective}${randomNoun}`;
}

/**
 * Checks if a name is a default generated name by checking its format
 */
export function isDefaultName(name: string): boolean {
  // Check if the name follows our adjective + noun pattern
  for (const adj of adjectives) {
    for (const noun of nouns) {
      if (name === `${adj}${noun}`) {
        return true;
      }
    }
  }
  return false;
} 