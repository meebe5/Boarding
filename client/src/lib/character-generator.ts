import { v4 as uuidv4 } from 'uuid';
import type { Character } from '@shared/schema';

// New card effects mapping
export const CARD_EFFECTS = {
  // RANGED CARDS (1-5)
  1: "[Careful Shot] Your next ranged attack ignores 1 Armor",
  2: "[Volley] Roll your attack twice, choose the higher. Costs 2 Bullet Tokens",
  3: "[Snap Fire] One additional Attack immediately, but roll -1 damage (min 1)",
  4: "[Take Aim] +1 to your next ranged attack roll",
  5: "[Ricochet] If your attack damages armor, it deals 1 HP to enemy",
  
  // MELEE CARDS (6-10)
  6: "[Patience] If you use the [DEFEND] action this turn, you gain an additional +2 [ARMOR PLATES] temporarily",
  7: "[Feint] Your next melee attack ignores 1 Armor",
  8: "[Overhead Strike] +2 ATTACK an enemy, but if you hit their [ARMOR PLATES], you take 1 self-damage",
  9: "[Deadly Slice] If you Damage a profiles HP, they receive -1 ATTACK on their next Action",
  10: "[Parry] Until your next turn, reduce all melee damage taken by 1",
  
  // UTILITY CARDS (11-15)
  11: "[Junk Material] Gain 1 Junk Material (used for gun or armor repair)",
  12: "[Triage] Restore 2 HP to yourself or adjacent ally",
  13: "[Scrap Scan] Pick one: Find 1 Junk item, OR Reveal armor value of one visible enemy",
  14: "[Retaliation] 2 HP damage to the [Profile] that attacks you, lasts until the beginning of your next turn",
  15: "[Juicing] Give an Ally or yourself +2 Temporary Hitpoints, that lasts until the start of your next turn"
};

// New class definitions
export const CLASS_NAMES = {
  1: "Shooter",   // Ranged Damage
  2: "Engineer",  // Ranged Utility
  3: "Scavenger", // Ranged Support
  4: "Tinkerer",  // Melee Support
  5: "Brute",     // Melee Damage
  6: "Breaker"    // Melee Utility
};

export const CLASS_ROLES = {
  1: "Ranged Damage",
  2: "Ranged Utility", 
  3: "Ranged Support",
  4: "Support",
  5: "Melee Damage",
  6: "Melee Utility"
};

export const CLASS_ROLE_TYPE = {
  1: "RANGED",  // Shooter
  2: "RANGED",  // Engineer
  3: "RANGED",  // Scavenger
  4: "SUPPORT", // Tinkerer
  5: "MELEE",   // Brute
  6: "MELEE"    // Breaker
};

// Base HP for each class
const CLASS_BASE_HP = {
  1: 10, // Shooter
  2: 8,  // Engineer
  3: 9,  // Scavenger
  4: 9,  // Tinkerer
  5: 12, // Brute
  6: 10  // Breaker
};

// Base Armor Plates by role
const CLASS_BASE_ARMOR = {
  1: 4,  // Shooter (Ranged)
  2: 4,  // Engineer (Ranged)
  3: 4,  // Scavenger (Ranged)
  4: 3,  // Tinkerer (Support)
  5: 6,  // Brute (Melee)
  6: 6   // Breaker (Melee)
};

// Which classes have ranged weapons by default
const CLASS_HAS_RANGED = {
  1: true,  // Shooter
  2: true,  // Engineer
  3: true,  // Scavenger
  4: false, // Tinkerer
  5: false, // Brute
  6: false  // Breaker
};

const getRandomName = (): string => {
  const names = [
    'Krell', 'Varn', 'Milo', 'Rusk', 'Dara', 'Siv', 'Juno', 'Nox', 
    'Tarn', 'Rella', 'Lex', 'Riddick', 'Hale', 'Pax', 'Nova', 'Zarn', 
    'Felix', 'Arlo', 'Rhea', 'Kara'
  ];
  return names[Math.floor(Math.random() * names.length)] + ' #' + Math.floor(Math.random() * 1000);
};

export const generateProfile = (): Character => {
  const classId = Math.floor(Math.random() * 6) + 1;
  const baseHp = CLASS_BASE_HP[classId as keyof typeof CLASS_BASE_HP];
  const baseArmor = CLASS_BASE_ARMOR[classId as keyof typeof CLASS_BASE_ARMOR];
  const hasRanged = CLASS_HAS_RANGED[classId as keyof typeof CLASS_HAS_RANGED];

  return {
    id: uuidv4(),
    name: getRandomName(),
    class: classId,
    tier: 1,
    hp: baseHp,
    maxHp: baseHp,
    tempHp: 0,
    armorPlates: baseArmor,
    maxArmorPlates: baseArmor,
    tempArmorPlates: 0,
    bulletTokens: hasRanged ? 4 : 0,
    gunPoints: hasRanged ? 4 : 0,
    junkTokens: 0,
    hasRangedWeapon: hasRanged,
    cards: [], // Cards are drawn at start of turn
    activeEffects: [],
    isAlive: true,
    lastDamageType: 'none',
  };
};

export const updateCharacterClass = (character: Character, newClass: number): Character => {
  const newHp = CLASS_BASE_HP[newClass as keyof typeof CLASS_BASE_HP];
  const newArmor = CLASS_BASE_ARMOR[newClass as keyof typeof CLASS_BASE_ARMOR];
  const hasRanged = CLASS_HAS_RANGED[newClass as keyof typeof CLASS_HAS_RANGED];
  
  return {
    ...character,
    class: newClass,
    maxHp: newHp,
    hp: newHp,
    armorPlates: newArmor,
    maxArmorPlates: newArmor,
    hasRangedWeapon: hasRanged,
    bulletTokens: hasRanged ? 4 : 0,
    gunPoints: hasRanged ? 4 : 0,
    isAlive: newHp > 0,
  };
};

// Card deck utilities
export const CARD_DECKS = {
  RANGED: [1, 2, 3, 4, 5],
  MELEE: [6, 7, 8, 9, 10],
  SUPPORT: [11, 12, 13, 14, 15] // Renamed from UTILITY
};

export const drawCards = (deckPreference?: 'RANGED' | 'MELEE' | 'SUPPORT' | 'MIXED'): number[] => {
  const allCards = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
  
  if (deckPreference && deckPreference !== 'MIXED') {
    const deckCards = CARD_DECKS[deckPreference];
    const card1 = deckCards[Math.floor(Math.random() * deckCards.length)];
    const card2 = deckCards[Math.floor(Math.random() * deckCards.length)];
    return [card1, card2];
  }
  
  // Mixed deck - draw from any cards
  const shuffled = [...allCards].sort(() => Math.random() - 0.5);
  return [shuffled[0], shuffled[1]];
};

export const drawCardsForClass = (characterClass: number): number[] => {
  const roleType = CLASS_ROLE_TYPE[characterClass as keyof typeof CLASS_ROLE_TYPE];
  return drawCards(roleType as 'RANGED' | 'MELEE' | 'SUPPORT');
};

export const getCardDeck = (cardId: number): 'RANGED' | 'MELEE' | 'SUPPORT' => {
  if (cardId >= 1 && cardId <= 5) return 'RANGED';
  if (cardId >= 6 && cardId <= 10) return 'MELEE';
  return 'SUPPORT';
};

// Create blank profile for manual creation
export const createBlankProfile = (): Character => {
  return {
    id: uuidv4(),
    name: 'New Profile',
    class: 1,
    tier: 1,
    hp: 10,
    maxHp: 10,
    tempHp: 0,
    armorPlates: 2,
    maxArmorPlates: 2,
    tempArmorPlates: 0,
    bulletTokens: 4,
    gunPoints: 4,
    junkTokens: 0,
    hasRangedWeapon: true,
    cards: [],
    activeEffects: [],
    isAlive: true,
    lastDamageType: 'none',
  };
};