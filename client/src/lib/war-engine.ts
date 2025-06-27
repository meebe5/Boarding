import type { Character, WarState, WarParticipant, ActiveEffect } from '@shared/schema';
import { CARD_EFFECTS } from './character-generator';
import { shouldPerformRepairs, needsJunkTokens, isJunkTokenCard, performRepair } from './combat-engine';

// Dice rolling functions
export const rollD6 = (): number => Math.floor(Math.random() * 6) + 1;
export const rollD4 = (): number => Math.floor(Math.random() * 4) + 1;

// Card effect modifiers
export const getCardModifiers = (character: Character, action: 'attack' | 'damage' | 'defense' | 'armor') => {
  let modifier = 0;
  
  // Check character's active effects
  character.activeEffects.forEach(effect => {
    const cardId = effect.cardId;
    switch (cardId) {
      case 2: // +2 Attack for your next attack
        if (action === 'attack') modifier += 2;
        break;
      case 3: // +2 Damage
        if (action === 'damage') modifier += 2;
        break;
      case 4: // +2 Defense
        if (action === 'defense') modifier += 2;
        break;
      case 6: // +1 Defense, +1 Attack
        if (action === 'defense') modifier += 1;
        if (action === 'attack') modifier += 1;
        break;
      case 9: // +2 Armor until next turn
        if (action === 'armor') modifier += 2;
        break;
    }
  });

  // Check active effects from allies
  character.activeEffects.forEach(effect => {
    switch (effect.cardId) {
      case 7: // +3 Armor to ally
        if (action === 'armor') modifier += 3;
        break;
    }
  });

  return modifier;
};

// Apply card effects
export const applyCardEffect = (
  character: Character,
  cardId: number,
  allCharacters: Character[],
  targetId?: string
): { character: Character; log: string[] } => {
  const logs: string[] = [];
  let updatedCharacter = { ...character };

  switch (cardId) {
    case 1: // +2 Heal [if damaged] to you or another player
      const healTarget = targetId ? allCharacters.find(c => c.id === targetId) : character;
      if (healTarget && healTarget.hp < healTarget.maxHp) {
        const healAmount = Math.min(2, healTarget.maxHp - healTarget.hp);
        const oldHp = healTarget.hp;
        if (healTarget.id === character.id) {
          updatedCharacter.hp += healAmount;
          logs.push(`${character.name} heals self for ${healAmount} HP (${oldHp} → ${updatedCharacter.hp}/${updatedCharacter.maxHp})`);
        } else {
          logs.push(`${character.name} heals ${healTarget.name} for ${healAmount} HP (${oldHp} → ${oldHp + healAmount}/${healTarget.maxHp})`);
        }
      } else {
        logs.push(`${character.name} tries to heal but target is at full health`);
      }
      break;
    
    case 5: // Enemies focus on you; stay at 1 HP if you hit 0
      logs.push(`${character.name} becomes a defensive anchor - will stay at 1 HP if reduced to 0`);
      break;
    
    case 7: // +3 Armor to ally
      if (targetId) {
        const ally = allCharacters.find(c => c.id === targetId);
        if (ally) {
          logs.push(`${character.name} grants +3 Armor to ${ally.name} until next turn`);
        }
      } else {
        logs.push(`${character.name} prepares to grant +3 Armor to an ally`);
      }
      break;
    
    case 8: // Enemy that attacks you takes 2 damage
      logs.push(`${character.name} activates thorns - attackers will take 2 damage`);
      break;
    
    case 10: // Reduce enemy Armor by -2 until next turn
      logs.push(`${character.name} prepares armor breach - enemy armor will be reduced by 2`);
      break;
    
    case 11: // Junk Tokens - Gain 1 junk token
      updatedCharacter.junkTokens += 1;
      logs.push(`${character.name} gains 1 junk token from Junk Tokens`);
      break;
    
    case 13: // Scrap Scan - Gain 1 junk token
      updatedCharacter.junkTokens += 1;
      logs.push(`${character.name} gains 1 junk token from Scrap Scan`);
      break;
  }

  return { character: updatedCharacter, log: logs };
};

// Simulate a single attack
export const simulateAttack = (
  attacker: Character,
  defender: Character,
  attackModifier: number = 0,
  damageModifier: number = 0
): { attacker: Character; defender: Character; log: string[] } => {
  const logs: string[] = [];
  
  // Roll 1d6 for damage (single roll determines both hit and damage)
  const damageRoll = rollD6() + damageModifier;
  const defenderArmor = defender.armorPlates + defender.tempArmorPlates + getCardModifiers(defender, 'armor');
  
  // Apply armor reduction from card 10 BEFORE damage roll comparison
  let effectiveArmor = defenderArmor;
  if (attacker.activeEffects.some(e => e.cardId === 10)) {
    effectiveArmor = Math.max(0, defenderArmor - 2);
    logs.push(`${defender.name}'s armor reduced by 2 from armor breach effect (${defenderArmor} → ${effectiveArmor})`);
  }
  
  logs.push(`${attacker.name} attacks ${defender.name} (damage roll: ${damageRoll} vs ${effectiveArmor} armor)`);
  
  let updatedAttacker = { ...attacker };
  let updatedDefender = { ...defender };
  
  // Meets or beats armor = hit
  if (damageRoll >= effectiveArmor) {
    // Full damage to HP
    const finalDamage = damageRoll;
    
    const oldDefenderHp = updatedDefender.hp;
    updatedDefender.hp = Math.max(0, updatedDefender.hp - finalDamage);
    updatedDefender.isAlive = updatedDefender.hp > 0;
    
    // Handle card 5 effect (stay at 1 HP if you hit 0) - only if card was used this turn
    if (updatedDefender.hp === 0 && updatedDefender.activeEffects.some(e => e.cardId === 5)) {
      updatedDefender.hp = 1;
      updatedDefender.isAlive = true;
      logs.push(`${defender.name} stays at 1 HP due to defensive anchor!`);
    }
    
    logs.push(`${defender.name} takes ${finalDamage} damage (${oldDefenderHp} → ${updatedDefender.hp}/${updatedDefender.maxHp} HP)`);
    
    if (updatedDefender.hp === 0) {
      logs.push(`💀 ${defender.name} has been defeated!`);
    }
    
    // Apply thorns damage from card 8 - only if defender had card active
    if (updatedDefender.activeEffects.some(e => e.cardId === 8) && oldDefenderHp > 0) {
      const oldAttackerHp = updatedAttacker.hp;
      updatedAttacker.hp = Math.max(0, updatedAttacker.hp - 2);
      updatedAttacker.isAlive = updatedAttacker.hp > 0;
      logs.push(`${attacker.name} takes 2 thorns damage from ${defender.name}! (${oldAttackerHp} → ${updatedAttacker.hp}/${updatedAttacker.maxHp} HP)`);
      
      if (updatedAttacker.hp === 0) {
        logs.push(`💀 ${attacker.name} has been defeated by thorns!`);
      }
    }
  } else {
    logs.push(`Miss! Attack failed to penetrate armor`);
  }
  
  return { attacker: updatedAttacker, defender: updatedDefender, log: logs };
};

// Simulate defend action
export const simulateDefend = (character: Character): { character: Character; log: string[] } => {
  const logs: string[] = [];
  const armorGain = rollD4();
  
  const updatedCharacter = {
    ...character,
    tempArmorPlates: character.tempArmorPlates + armorGain,
  };
  
  logs.push(`${character.name} defends, gaining +${armorGain} temporary armor`);
  
  return { character: updatedCharacter, log: logs };
};

// Process turn end effects
export const processTurnEnd = (character: Character): Character => {
  // Reduce active effect durations
  const updatedEffects = character.activeEffects
    .map(effect => ({ ...effect, turnsRemaining: effect.turnsRemaining - 1 }))
    .filter(effect => effect.turnsRemaining > 0);
  
  // Reset temporary armor at start of next turn
  // Reset temporary armor at turn end
  return {
    ...character,
    tempArmorPlates: 0,
    activeEffects: updatedEffects,
  };
};

// Get random alive target from opposing group
export const getRandomTarget = (characters: Character[]): Character | null => {
  const aliveCharacters = characters.filter(c => c.isAlive);
  if (aliveCharacters.length === 0) return null;
  
  const randomIndex = Math.floor(Math.random() * aliveCharacters.length);
  return aliveCharacters[randomIndex];
};

// Check if war is over
export const isWarOver = (group1: Character[], group2: Character[]): boolean => {
  const group1Alive = group1.some(c => c.isAlive);
  const group2Alive = group2.some(c => c.isAlive);
  
  return !group1Alive || !group2Alive;
};

// Simulate a complete war round
export const simulateWarRound = (
  group1: Character[],
  group2: Character[],
  currentTurn: number
): { 
  group1: Character[], 
  group2: Character[], 
  logs: string[], 
  isComplete: boolean,
  winner: string | null 
} => {
  let updatedGroup1 = [...group1];
  let updatedGroup2 = [...group2];
  let combatLogs: string[] = [];
  
  const allCharacters = [...updatedGroup1, ...updatedGroup2];
  
  // Determine turn order based on random order (shuffled)
  const turnOrder = allCharacters
    .filter(c => c.isAlive)
    .sort(() => Math.random() - 0.5);
  
  for (const character of turnOrder) {
    if (!character.isAlive) continue;
    
    // Determine if character is from group 1 or 2
    const isGroup1 = updatedGroup1.some(c => c.id === character.id);
    const opposingGroup = isGroup1 ? updatedGroup2 : updatedGroup1;
    const currentGroup = isGroup1 ? updatedGroup1 : updatedGroup2;
    
    // Find current character in their group
    const currentCharIndex = currentGroup.findIndex(c => c.id === character.id);
    if (currentCharIndex === -1) continue;
    
    const currentChar = currentGroup[currentCharIndex];
    
    // Process turn start - clear expired effects from PREVIOUS turn
    currentGroup[currentCharIndex] = processTurnEnd(currentChar);
    const refreshedChar = currentGroup[currentCharIndex];
    
    combatLogs.push(`--- ${refreshedChar.name}'s Turn ---`);
    
    // Support classes prioritize junk token cards if they or their allies need repairs
    let shouldPlayJunkCard = false;
    let junkCardToPlay = null;
    
    // Check if support classes need junk tokens for repairs (self or allies)
    if (refreshedChar.class === 3 || refreshedChar.class === 4) {
      const repairNeeded = shouldPerformRepairs(refreshedChar, currentGroup);
      const needsJunk = repairNeeded.shouldRepair && refreshedChar.junkTokens === 0;
      
      if (needsJunk) {
        const junkCards = refreshedChar.cards.filter(card => isJunkTokenCard(card));
        if (junkCards.length > 0) {
          shouldPlayJunkCard = true;
          junkCardToPlay = junkCards[0]; // Take first available junk card
        }
      }
    }
    
    // Pick a card to play (prioritize junk cards for support classes)
    let cardToPlay = null;
    if (shouldPlayJunkCard && junkCardToPlay) {
      cardToPlay = junkCardToPlay;
    } else {
      const availableCards = refreshedChar.cards.filter(card => 
        !refreshedChar.activeEffects.some(e => e.cardId === card)
      );
      if (availableCards.length > 0) {
        cardToPlay = availableCards[Math.floor(Math.random() * availableCards.length)];
      }
    }
    
    if (cardToPlay) {
      // Log card usage
      combatLogs.push(`${refreshedChar.name} plays Card ${cardToPlay}: ${CARD_EFFECTS[cardToPlay as keyof typeof CARD_EFFECTS]}`);
      
      const cardEffect = applyCardEffect(refreshedChar, cardToPlay, allCharacters);
      combatLogs.push(...cardEffect.log);
      currentGroup[currentCharIndex] = cardEffect.character;
      
      // If this was a junk token card, allow playing another card
      if (isJunkTokenCard(cardToPlay)) {
        const remainingCards = refreshedChar.cards.filter(card => 
          card !== cardToPlay && !refreshedChar.activeEffects.some(e => e.cardId === card)
        );
        if (remainingCards.length > 0) {
          const secondCard = remainingCards[Math.floor(Math.random() * remainingCards.length)];
          combatLogs.push(`${refreshedChar.name} plays second card ${secondCard}: ${CARD_EFFECTS[secondCard as keyof typeof CARD_EFFECTS]}`);
          
          const secondCardEffect = applyCardEffect(currentGroup[currentCharIndex], secondCard, allCharacters);
          combatLogs.push(...secondCardEffect.log);
          currentGroup[currentCharIndex] = secondCardEffect.character;
        }
      }
    }
    
    // Check if support class should perform repairs first
    const repairDecision = shouldPerformRepairs(currentGroup[currentCharIndex], currentGroup);
    
    if (repairDecision.shouldRepair && currentGroup[currentCharIndex].junkTokens > 0) {
      // Perform repair action
      const junkToUse = Math.min(currentGroup[currentCharIndex].junkTokens, 2); // Use up to 2 junk tokens
      const repairResult = performRepair(currentGroup[currentCharIndex], repairDecision.repairType!, junkToUse);
      currentGroup[currentCharIndex] = repairResult.character;
      combatLogs.push(...repairResult.log);
      
      // If repairing an ally, update their stats in the group
      if (repairDecision.target && repairDecision.target.id !== currentGroup[currentCharIndex].id) {
        const allyIndex = currentGroup.findIndex(c => c.id === repairDecision.target!.id);
        if (allyIndex !== -1) {
          if (repairDecision.repairType === 'GUN') {
            const wasGunBroken = currentGroup[allyIndex].gunPoints === 0;
            currentGroup[allyIndex].gunPoints = Math.min(
              currentGroup[allyIndex].gunPoints + junkToUse * (currentGroup[currentCharIndex].class === 3 ? 2 : 1),
              currentGroup[allyIndex].maxGunPoints || 4
            );
            if (currentGroup[allyIndex].gunPoints > 0) {
              currentGroup[allyIndex].hasRangedWeapon = true;
              // If gun was completely broken and is now repaired, restore max bullets
              if (wasGunBroken) {
                currentGroup[allyIndex].bulletTokens = currentGroup[allyIndex].maxBulletTokens || 4;
                combatLogs.push(`${repairDecision.target!.name} receives full bullet count with repaired gun!`);
              }
            }
          } else if (repairDecision.repairType === 'ARMOR') {
            currentGroup[allyIndex].armorPlates = Math.min(
              currentGroup[allyIndex].armorPlates + junkToUse * (currentGroup[currentCharIndex].class === 4 ? 2 : 1),
              currentGroup[allyIndex].maxArmorPlates
            );
          }
          combatLogs.push(`${repairDecision.target.name} receives repair from ${currentGroup[currentCharIndex].name}`);
        }
      }
    } else {
      // Decide between attack or defend (80% attack, 20% defend)
      const actionRoll = Math.random();
      if (actionRoll < 0.8) {
        // Attack
        const target = getRandomTarget(opposingGroup);
        if (target) {
          const targetIndex = opposingGroup.findIndex(c => c.id === target.id);
          const attackModifier = getCardModifiers(currentGroup[currentCharIndex], 'attack');
          const damageModifier = getCardModifiers(currentGroup[currentCharIndex], 'damage');
          
          const attackResult = simulateAttack(
            currentGroup[currentCharIndex],
            opposingGroup[targetIndex],
            attackModifier,
            damageModifier
          );
          
          currentGroup[currentCharIndex] = attackResult.attacker;
          opposingGroup[targetIndex] = attackResult.defender;
          combatLogs.push(...attackResult.log);
        }
      } else {
        // Defend
        const defendResult = simulateDefend(currentGroup[currentCharIndex]);
        currentGroup[currentCharIndex] = defendResult.character;
        combatLogs.push(...defendResult.log);
      }
    }
    
    // Check if war is over after each action
    if (isWarOver(updatedGroup1, updatedGroup2)) {
      break;
    }
  }
  
  // Turn end processing is now handled per character during their turn
  
  const warComplete = isWarOver(updatedGroup1, updatedGroup2);
  let winner: string | null = null;
  
  if (warComplete) {
    const group1HasSurvivors = updatedGroup1.some(c => c.isAlive);
    const group2HasSurvivors = updatedGroup2.some(c => c.isAlive);
    
    if (group1HasSurvivors && !group2HasSurvivors) {
      winner = "Group 1";
    } else if (group2HasSurvivors && !group1HasSurvivors) {
      winner = "Group 2";
    } else {
      winner = "Draw";
    }
  }
  
  return {
    group1: updatedGroup1,
    group2: updatedGroup2,
    logs: combatLogs,
    isComplete: warComplete,
    winner
  };
};