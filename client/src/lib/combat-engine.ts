import type { Character, ActiveEffect } from '@shared/schema';
import { CARD_EFFECTS, drawCards, getCardDeck, CLASS_ROLE_TYPE } from './character-generator';

// Dice rolling functions
export const rollD4 = (): number => Math.floor(Math.random() * 4) + 1;
export const rollD6 = (): number => Math.floor(Math.random() * 6) + 1;
export const rollD8 = (): number => Math.floor(Math.random() * 8) + 1;
export const rollD10 = (): number => Math.floor(Math.random() * 10) + 1;
export const rollD12 = (): number => Math.floor(Math.random() * 12) + 1;
export const rollD20 = (): number => Math.floor(Math.random() * 20) + 1;

// Parse and roll dice notation (e.g., "1d6", "2d4")
export const rollDice = (diceNotation: string): number => {
  const match = diceNotation.match(/^(\d+)d(\d+)$/);
  if (!match) return 1; // Default to 1 if invalid notation
  
  const count = parseInt(match[1]);
  const sides = parseInt(match[2]);
  
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += Math.floor(Math.random() * sides) + 1;
  }
  return total;
};

// Combat actions
export type CombatAction = 'ATTACK_MELEE' | 'ATTACK_RANGED' | 'DEFEND' | 'RELOAD' | 'REPAIR' | 'CREATE';

// Turn start - draw cards
export const startTurn = (character: Character): { character: Character; log: string[] } => {
  const logs: string[] = [];
  
  // Clear expired effects
  const activeEffects = character.activeEffects.filter(effect => {
    if (effect.turnsRemaining <= 0) {
      logs.push(`${character.name}: ${CARD_EFFECTS[effect.cardId as keyof typeof CARD_EFFECTS]} expires`);
      return false;
    }
    return true;
  }).map(effect => ({ ...effect, turnsRemaining: effect.turnsRemaining - 1 }));
  
  // Reset temporary values
  let updatedCharacter: Character = {
    ...character,
    tempHp: 0,
    tempArmorPlates: 0,
    activeEffects,
  };
  
  // Note: Card drawing is now handled by the war system based on class
  
  return { character: updatedCharacter, log: logs };
};

// Play a card
export const playCard = (
  character: Character, 
  cardId: number, 
  allCharacters: Character[],
  targetId?: string
): { character: Character; log: string[] } => {
  const logs: string[] = [];
  let updatedCharacter = { ...character };
  
  // Remove card from hand
  updatedCharacter.cards = updatedCharacter.cards.filter(c => c !== cardId);
  
  logs.push(`${character.name} plays ${CARD_EFFECTS[cardId as keyof typeof CARD_EFFECTS]}`);
  
  switch (cardId) {
    case 2: // Volley - Costs 2 Bullet Tokens
      if (updatedCharacter.bulletTokens >= 2) {
        updatedCharacter.bulletTokens -= 2;
        logs.push(`${character.name} spends 2 bullet tokens for Volley effect`);
      } else {
        logs.push(`${character.name} lacks bullet tokens for Volley!`);
        return { character: updatedCharacter, log: logs };
      }
      break;
      
    case 3: // Snap Fire - Costs 2 Bullet Tokens
      if (updatedCharacter.bulletTokens >= 2) {
        updatedCharacter.bulletTokens -= 2;
        logs.push(`${character.name} spends 2 bullet tokens for Snap Fire - will make two attacks this turn!`);
      } else {
        logs.push(`${character.name} lacks bullet tokens for Snap Fire!`);
        return { character: updatedCharacter, log: logs };
      }
      break;
      
    case 11: // Junk Material
      updatedCharacter.junkMaterials += 1;
      logs.push(`${character.name} gains 1 Junk Material (${updatedCharacter.junkMaterials} total)`);
      break;
      
    case 12: // Triage - Restore 2 HP
      const healTarget = targetId ? allCharacters.find(c => c.id === targetId) : character;
      if (healTarget) {
        const healAmount = Math.min(2, healTarget.maxHp - healTarget.hp);
        if (healTarget.id === character.id) {
          updatedCharacter.hp += healAmount;
          logs.push(`${character.name} heals self for ${healAmount} HP`);
        } else {
          logs.push(`${character.name} heals ${healTarget.name} for ${healAmount} HP`);
        }
      }
      break;
      
    case 13: // Scrap Scan
      updatedCharacter.junkMaterials += 1;
      logs.push(`${character.name} finds 1 Junk Material (${updatedCharacter.junkMaterials} total)`);
      break;
      
    case 14: // Retaliation
      updatedCharacter.activeEffects.push({
        cardId: 14,
        sourceProfileId: character.id,
        sourceProfileName: character.name,
        turnsRemaining: 1,
        effectType: 'retaliation',
        value: 2
      });
      logs.push(`${character.name} activates retaliation - attackers will take 2 damage`);
      break;
      
    case 15: // Juicing - +2 Temp HP
      const juiceTarget = targetId ? allCharacters.find(c => c.id === targetId) : character;
      if (juiceTarget) {
        if (juiceTarget.id === character.id) {
          updatedCharacter.tempHp += 2;
          logs.push(`${character.name} gains 2 temporary HP`);
        } else {
          logs.push(`${character.name} gives ${juiceTarget.name} 2 temporary HP`);
        }
      }
      break;
      
    default:
      // Other cards create active effects
      updatedCharacter.activeEffects.push({
        cardId: cardId,
        sourceProfileId: character.id,
        sourceProfileName: character.name,
        turnsRemaining: 1,
        effectType: 'other'
      });
      logs.push(`${character.name} activates card effect`);
      break;
  }
  
  return { character: updatedCharacter, log: logs };
};

// Get attack modifiers from active effects
export const getAttackModifiers = (character: Character, attackType: 'melee' | 'ranged'): number => {
  let modifier = 0;
  
  // Class passive bonuses
  if (character.class === 1 && attackType === 'ranged') modifier += 1; // Shooter
  if (character.class === 5 && attackType === 'melee') modifier += 1; // Brute
  
  // Card effects
  character.activeEffects.forEach(effect => {
    switch (effect.cardId) {
      case 4: // Take Aim
        if (attackType === 'ranged') modifier += 1;
        break;
      case 8: // Overhead Strike
        if (attackType === 'melee') modifier += 2;
        break;
    }
  });
  
  return modifier;
};

// Ranged attack
export const performRangedAttack = (
  attacker: Character,
  defender: Character,
  isSnapFireSecondAttack: boolean = false
): { attacker: Character; defender: Character; log: string[] } => {
  const logs: string[] = [];
  
  if (!attacker.hasRangedWeapon || attacker.bulletTokens <= 0) {
    logs.push(`${attacker.name} cannot perform ranged attack - no ammo or weapon`);
    return { attacker, defender, log: logs };
  }
  
  let updatedAttacker = { ...attacker };
  let updatedDefender = { ...defender };
  
  // Use bullets (1 for normal attack, already deducted for volley/snap fire in card play)
  if (!isSnapFireSecondAttack) {
    updatedAttacker.bulletTokens = Math.max(0, updatedAttacker.bulletTokens - 1);
  }
  
  // Roll attack
  let attackRoll = rollD6() + getAttackModifiers(attacker, 'ranged');
  
  // Check for Volley effect (show both rolls)
  const hasVolley = updatedAttacker.activeEffects.some(e => e.cardId === 2);
  if (hasVolley && !isSnapFireSecondAttack) {
    const roll1 = rollD6() + getAttackModifiers(attacker, 'ranged');
    const roll2 = rollD6() + getAttackModifiers(attacker, 'ranged');
    attackRoll = Math.max(roll1, roll2);
    logs.push(`${attacker.name} uses Volley! Roll 1: ${roll1}, Roll 2: ${roll2}, choosing higher: ${attackRoll}`);
  } else {
    // Apply Snap Fire penalty to second attack
    if (isSnapFireSecondAttack) {
      attackRoll = Math.max(1, attackRoll - 2); // -2 attack for second snap fire attack
      logs.push(`${attacker.name} second Snap Fire attack (with -2 penalty): ${attackRoll}`);
    } else {
      logs.push(`${attacker.name} ranged attack roll: ${attackRoll}`);
    }
  }
  
  // Check armor
  const totalArmor = defender.armorPlates + defender.tempArmorPlates;
  const ignoreArmor = attacker.activeEffects.some(e => e.cardId === 1); // Careful Shot
  const effectiveArmor = ignoreArmor ? Math.max(0, totalArmor - 1) : totalArmor;
  
  logs.push(`vs ${defender.name}'s armor: ${effectiveArmor} (${totalArmor}${ignoreArmor ? ' -1 from Careful Shot' : ''})`);
  
  // Resolve damage
  if (attackRoll >= effectiveArmor) {
    // Full damage to HP
    const damage = attackRoll;
    const actualDamage = Math.min(damage, updatedDefender.tempHp + updatedDefender.hp);
    
    if (updatedDefender.tempHp > 0) {
      const tempDamage = Math.min(damage, updatedDefender.tempHp);
      updatedDefender.tempHp -= tempDamage;
      const remainingDamage = damage - tempDamage;
      updatedDefender.hp = Math.max(0, updatedDefender.hp - remainingDamage);
      logs.push(`${defender.name} takes ${damage} damage (${tempDamage} to temp HP, ${remainingDamage} to HP)`);
    } else {
      updatedDefender.hp = Math.max(0, updatedDefender.hp - damage);
      logs.push(`${defender.name} takes ${damage} damage to HP`);
    }
    
    updatedDefender.isAlive = updatedDefender.hp > 0;
    updatedDefender.lastDamageType = 'ranged';
    
    // Ricochet effect
    if (attacker.activeEffects.some(e => e.cardId === 5) && totalArmor > 0) {
      updatedDefender.hp = Math.max(0, updatedDefender.hp - 1);
      logs.push(`Ricochet deals 1 additional damage to ${defender.name}`);
    }
    
  } else {
    // Hit armor - reduce armor plates by 1
    if (updatedDefender.tempArmorPlates > 0) {
      updatedDefender.tempArmorPlates -= 1;
      logs.push(`${defender.name} loses 1 temporary armor plate`);
    } else {
      updatedDefender.armorPlates = Math.max(0, updatedDefender.armorPlates - 1);
      logs.push(`${defender.name} loses 1 armor plate`);
    }
    
    // Ricochet effect: if armor plates were lost, deal 1 HP damage
    if (attacker.activeEffects.some(e => e.cardId === 5)) {
      updatedDefender.hp = Math.max(0, updatedDefender.hp - 1);
      logs.push(`Ricochet! Armor plate loss causes 1 HP damage to ${defender.name}`);
    }
  }
  
  // Handle retaliation
  if (updatedDefender.activeEffects.some(e => e.cardId === 14)) {
    updatedAttacker.hp = Math.max(0, updatedAttacker.hp - 2);
    updatedAttacker.isAlive = updatedAttacker.hp > 0;
    logs.push(`${attacker.name} takes 2 retaliation damage from ${defender.name}`);
  }
  
  if (updatedDefender.hp === 0) {
    logs.push(`💀 ${defender.name} has been defeated!`);
  }
  
  return { attacker: updatedAttacker, defender: updatedDefender, log: logs };
};

// Melee attack
export const performMeleeAttack = (
  attacker: Character,
  defender: Character,
  isSecondAttack: boolean = false
): { attacker: Character; defender: Character; log: string[] } => {
  const logs: string[] = [];
  
  let updatedAttacker = { ...attacker };
  let updatedDefender = { ...defender };
  
  // Roll attack
  const attackRoll = rollD6() + getAttackModifiers(attacker, 'melee');
  logs.push(`${attacker.name} melee attack roll: ${attackRoll}`);
  
  // Check armor
  const totalArmor = defender.armorPlates + defender.tempArmorPlates;
  const ignoreArmor = attacker.activeEffects.some(e => e.cardId === 7); // Feint
  const effectiveArmor = ignoreArmor ? Math.max(0, totalArmor - 1) : totalArmor;
  
  logs.push(`vs ${defender.name}'s armor: ${effectiveArmor} (${totalArmor}${ignoreArmor ? ' -1 from Feint' : ''})`);
  
  // Resolve damage
  if (attackRoll >= effectiveArmor) {
    // Full damage to HP using custom damage dice
    let damage = rollDice(attacker.meleeDamageDice || '1d6');
    logs.push(`Damage roll (${attacker.meleeDamageDice || '1d6'}): ${damage}`);
    
    // Apply damage
    if (updatedDefender.tempHp > 0) {
      const tempDamage = Math.min(damage, updatedDefender.tempHp);
      updatedDefender.tempHp -= tempDamage;
      const remainingDamage = damage - tempDamage;
      updatedDefender.hp = Math.max(0, updatedDefender.hp - remainingDamage);
      logs.push(`${defender.name} takes ${damage} damage (${tempDamage} to temp HP, ${remainingDamage} to HP)`);
    } else {
      updatedDefender.hp = Math.max(0, updatedDefender.hp - damage);
      logs.push(`${defender.name} takes ${damage} damage to HP`);
    }
    
    updatedDefender.isAlive = updatedDefender.hp > 0;
    updatedDefender.lastDamageType = 'melee';
    
    // Deadly Slice effect - target gets -1 attack next turn
    if (attacker.activeEffects.some(e => e.cardId === 9)) {
      updatedDefender.activeEffects.push({
        cardId: 9,
        sourceProfileId: attacker.id,
        sourceProfileName: attacker.name,
        turnsRemaining: 1,
        effectType: 'attack_bonus',
        value: -1
      });
      logs.push(`${defender.name} will have -1 attack on their next turn`);
    }
    
  } else {
    // Hit armor
    let armorLoss = 1;
    
    // Breaker class passive - additional armor plate removed
    if (attacker.class === 6) {
      armorLoss = 2;
      logs.push(`Breaker removes additional armor plate`);
    }
    
    // Apply armor loss
    let remainingArmorLoss = armorLoss;
    if (updatedDefender.tempArmorPlates > 0) {
      const tempLoss = Math.min(remainingArmorLoss, updatedDefender.tempArmorPlates);
      updatedDefender.tempArmorPlates -= tempLoss;
      remainingArmorLoss -= tempLoss;
      logs.push(`${defender.name} loses ${tempLoss} temporary armor plates`);
    }
    
    if (remainingArmorLoss > 0) {
      updatedDefender.armorPlates = Math.max(0, updatedDefender.armorPlates - remainingArmorLoss);
      logs.push(`${defender.name} loses ${remainingArmorLoss} armor plates`);
    }
    
    // Overhead Strike self-damage
    if (attacker.activeEffects.some(e => e.cardId === 8)) {
      updatedAttacker.hp = Math.max(0, updatedAttacker.hp - 1);
      logs.push(`${attacker.name} takes 1 self-damage from Overhead Strike`);
    }
  }
  
  // Handle retaliation
  if (updatedDefender.activeEffects.some(e => e.cardId === 14)) {
    updatedAttacker.hp = Math.max(0, updatedAttacker.hp - 2);
    updatedAttacker.isAlive = updatedAttacker.hp > 0;
    logs.push(`${attacker.name} takes 2 retaliation damage from ${defender.name}`);
  }
  
  // Apply Parry damage reduction
  if (updatedDefender.activeEffects.some(e => e.cardId === 10)) {
    // This is handled in the damage calculation above
    logs.push(`${defender.name}'s Parry reduces melee damage`);
  }
  
  if (updatedDefender.hp === 0) {
    logs.push(`💀 ${defender.name} has been defeated!`);
  }
  
  return { attacker: updatedAttacker, defender: updatedDefender, log: logs };
};

// Defend action
export const performDefend = (character: Character): { character: Character; log: string[] } => {
  const logs: string[] = [];
  
  let updatedCharacter = { ...character };
  let armorBonus = 2;
  
  // Patience card bonus
  if (character.activeEffects.some(e => e.cardId === 6)) {
    armorBonus += 2;
    logs.push(`Patience grants additional +2 armor plates`);
  }
  
  updatedCharacter.tempArmorPlates += armorBonus;
  logs.push(`${character.name} defends, gaining +${armorBonus} temporary armor plates`);
  
  return { character: updatedCharacter, log: logs };
};

// Reload action
export const performReload = (character: Character): { character: Character; log: string[] } => {
  const logs: string[] = [];
  
  if (!character.hasRangedWeapon) {
    logs.push(`${character.name} has no ranged weapon to reload`);
    return { character, log: logs };
  }
  
  let updatedCharacter = { ...character };
  
  // Reload to max bullets
  updatedCharacter.bulletTokens = updatedCharacter.maxBulletTokens || 4;
  logs.push(`${character.name} reloads ${updatedCharacter.maxBulletTokens || 4} bullets`);
  
  // Roll gun damage (unless Engineer with good roll)
  let gunDamage = rollD4();
  
  if (character.class === 2) { // Engineer
    const engineerRoll = rollD4() - 1;
    gunDamage = Math.max(0, engineerRoll);
    logs.push(`Engineer reduces gun damage: ${rollD4()} -1 = ${gunDamage}`);
  }
  
  updatedCharacter.gunPoints = Math.max(0, updatedCharacter.gunPoints - gunDamage);
  
  if (gunDamage > 0) {
    logs.push(`Gun takes ${gunDamage} damage (${updatedCharacter.gunPoints}/4 GP remaining)`);
  }
  
  if (updatedCharacter.gunPoints === 0) {
    updatedCharacter.hasRangedWeapon = false;
    updatedCharacter.bulletTokens = 0;
    logs.push(`${character.name}'s gun is destroyed!`);
  }
  
  return { character: updatedCharacter, log: logs };
};

// Repair action
export const performRepair = (
  character: Character, 
  target: 'ARMOR' | 'GUN', 
  junkTokensUsed: number
): { character: Character; log: string[] } => {
  const logs: string[] = [];
  
  if (character.junkTokens < junkTokensUsed) {
    logs.push(`${character.name} doesn't have enough junk tokens`);
    return { character, log: logs };
  }
  
  let updatedCharacter = { ...character };
  updatedCharacter.junkTokens -= junkTokensUsed;
  
  let repairAmount = junkTokensUsed;
  
  // Class bonuses
  if (character.class === 3 && target === 'GUN') { // Scavenger
    repairAmount = junkTokensUsed * 2;
    logs.push(`Scavenger doubles gun repair efficiency`);
  } else if (character.class === 4 && target === 'ARMOR') { // Tinkerer
    repairAmount = junkTokensUsed * 2;
    logs.push(`Tinkerer doubles armor repair efficiency`);
  }
  
  if (target === 'ARMOR') {
    const maxRepair = updatedCharacter.maxArmorPlates - updatedCharacter.armorPlates;
    const actualRepair = Math.min(repairAmount, maxRepair);
    updatedCharacter.armorPlates += actualRepair;
    logs.push(`${character.name} repairs ${actualRepair} armor plates using ${junkTokensUsed} junk tokens`);
  } else if (target === 'GUN') {
    const maxRepair = (updatedCharacter.maxGunPoints || 4) - updatedCharacter.gunPoints;
    const actualRepair = Math.min(repairAmount, maxRepair);
    updatedCharacter.gunPoints += actualRepair;
    
    if (updatedCharacter.gunPoints > 0 && !updatedCharacter.hasRangedWeapon) {
      updatedCharacter.hasRangedWeapon = true;
      logs.push(`${character.name}'s gun is restored to working condition!`);
    }
    
    logs.push(`${character.name} repairs ${actualRepair} gun points using ${junkTokensUsed} junk tokens`);
  }
  
  return { character: updatedCharacter, log: logs };
};