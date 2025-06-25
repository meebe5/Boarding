import { v4 as uuidv4 } from 'uuid';
import type { Character } from '@shared/schema';

const CLASS_BASE_HP = {
  1: 8,
  2: 9,
  3: 10,
  4: 10,
  5: 12,
  6: 9,
};

const CLASS_ARMOR = {
  1: 1,
  2: 1,
  3: 2,
  4: 2,
  5: 3,
  6: 3,
};

export const CARD_EFFECTS = {
  1: '+2 Heal [if damaged] to you or another player',
  2: '+2 Attack for your next attack',
  3: '+2 Damage',
  4: '+2 Defense',
  5: 'Enemies focus on you; stay at 1 HP if you hit 0',
  6: '+1 Defense, +1 Attack',
  7: '+3 Evasion to ally about to be attacked',
  8: 'Enemy that attacks you takes 2 damage',
  9: '+2 Armor until next turn',
  10: 'Reduce enemy Armor by -2 until next turn',
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
  const classId = Math.floor(Math.random() * 6) + 1 as keyof typeof CLASS_BASE_HP;
  const con = Math.floor(Math.random() * 3);
  const baseHp = CLASS_BASE_HP[classId] + con;
  const card1 = Math.floor(Math.random() * 10) + 1;
  let card2;
  do {
    card2 = Math.floor(Math.random() * 10) + 1;
  } while (card2 === card1);
  const initiative = Math.floor(Math.random() * 20) + 1;

  return {
    id: uuidv4(),
    name: getRandomName(),
    class: classId,
    tier: 1,
    hp: baseHp,
    maxHp: baseHp,
    con,
    armor: CLASS_ARMOR[classId],
    cards: [card1, card2],
    usedCards: [],
    initiative,
  };
};

export const updateCharacterClass = (character: Character, newClass: number): Character => {
  const newHp = CLASS_BASE_HP[newClass as keyof typeof CLASS_BASE_HP] + character.con;
  return {
    ...character,
    class: newClass,
    maxHp: newHp,
    hp: newHp,
    armor: CLASS_ARMOR[newClass as keyof typeof CLASS_ARMOR]
  };
};

export const updateCharacterCon = (character: Character, newCon: number): Character => {
  const newHp = CLASS_BASE_HP[character.class as keyof typeof CLASS_BASE_HP] + newCon;
  return {
    ...character,
    con: newCon,
    maxHp: newHp,
    hp: newHp
  };
};
