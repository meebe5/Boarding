import type { Character, WarState, WarParticipant, ActiveEffect } from '@shared/schema';
import { CARD_EFFECTS } from './character-generator';
import { shouldPerformRepairs, needsJunkTokens, isJunkTokenCard, performRepair, playCard, performReload, applyCardEffect } from './combat-engine';

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

// Apply card effects - use combat engine for proper implementation
export const applyCardEffect = (
  character: Character,
  cardId: number,
  allCharacters: Character[],
  targetId?: string
): { character: Character; log: string[] } => {
  // Use the combat engine's proper card implementation
  return playCard(character, cardId, allCharacters, targetId);
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

// Process turn start - clear expired effects and reset temporary values
export const processTurnStart = (character: Character): { character: Character; log: string[] } => {
  const logs: string[] = [];
  
  // Clear effects that have expired (turnsRemaining <= 0)
  const expiredEffects = character.activeEffects.filter(effect => effect.turnsRemaining <= 0);
  const activeEffects = character.activeEffects.filter(effect => effect.turnsRemaining > 0);
  
  // Log expired effects
  expiredEffects.forEach(effect => {
    logs.push(`${character.name}: ${CARD_EFFECTS[effect.cardId as keyof typeof CARD_EFFECTS]} expires`);
  });
  
  // Decrement remaining turn counters for active effects
  const updatedEffects = activeEffects.map(effect => ({ 
    ...effect, 
    turnsRemaining: effect.turnsRemaining - 1 
  }));
  
  return {
    character: {
      ...character,
      tempArmorPlates: 0,
      activeEffects: updatedEffects,
    },
    log: logs
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
    const turnStartResult = processTurnStart(currentChar);
    currentGroup[currentCharIndex] = turnStartResult.character;
    combatLogs.push(...turnStartResult.log);
    const refreshedChar = currentGroup[currentCharIndex];
    
    combatLogs.push(`--- ${refreshedChar.name}'s Turn ---`);
    
    // Helper function to activate a card for a character
    const activateCard = (character: Character, cardId: number, allChars: Character[]) => {
      // Log card usage
      combatLogs.push(`${character.name} plays Card ${cardId}: ${CARD_EFFECTS[cardId as keyof typeof CARD_EFFECTS]}`);
      
      // Clear all existing active effects before applying new card (except junk token effects)
      let characterWithClearedEffects = {
        ...character,
        activeEffects: character.activeEffects.filter(effect => 
          isJunkTokenCard(effect.cardId) || effect.sourceProfileId !== character.id
        )
      };
      
      const cardEffect = applyCardEffect(characterWithClearedEffects, cardId, allChars);
      combatLogs.push(...cardEffect.log);
      return cardEffect.character;
    };
    
    // Helper function to get available cards for activation
    const getAvailableCards = (character: Character, prioritizeJunk: boolean = false) => {
      if (prioritizeJunk) {
        const junkCards = character.cards.filter(card => isJunkTokenCard(card));
        if (junkCards.length > 0) {
          return junkCards;
        }
      }
      
      return character.cards.filter(card => 
        !character.activeEffects.some(e => e.cardId === card && e.sourceProfileId === character.id) ||
        isJunkTokenCard(card)
      );
    };
    
    // First check if support class needs junk tokens and has junk token cards
    const repairDecision = shouldPerformRepairs(currentGroup[currentCharIndex], currentGroup);
    const needsJunkForRepair = repairDecision.shouldRepair && currentGroup[currentCharIndex].junkTokens === 0;
    
    if (needsJunkForRepair && (currentGroup[currentCharIndex].class === 3 || currentGroup[currentCharIndex].class === 4)) {
      const junkCards = getAvailableCards(currentGroup[currentCharIndex], true);
      if (junkCards.length > 0) {
        const junkCard = junkCards[0];
        currentGroup[currentCharIndex] = activateCard(currentGroup[currentCharIndex], junkCard, allCharacters);
        
        // Check for second card after junk token card
        const remainingCards = getAvailableCards(currentGroup[currentCharIndex]).filter(c => c !== junkCard);
        if (remainingCards.length > 0 && isJunkTokenCard(junkCard)) {
          const secondCard = remainingCards[Math.floor(Math.random() * remainingCards.length)];
          currentGroup[currentCharIndex] = activateCard(currentGroup[currentCharIndex], secondCard, allCharacters);
        }
      }
    }
    
    // Now determine what action to take and only activate cards if action can be performed
    if (repairDecision.shouldRepair && currentGroup[currentCharIndex].junkTokens > 0) {
      // REPAIR ACTION - activate any support cards that help with repairs
      const supportCards = currentGroup[currentCharIndex].cards.filter(card => 
        [12, 15].includes(card) && // Triage, Juicing
        !currentGroup[currentCharIndex].activeEffects.some(e => e.cardId === card && e.sourceProfileId === currentGroup[currentCharIndex].id)
      );
      
      if (supportCards.length > 0 && Math.random() < 0.7) { // 70% chance to use support card
        const supportCard = supportCards[Math.floor(Math.random() * supportCards.length)];
        currentGroup[currentCharIndex] = activateCard(currentGroup[currentCharIndex], supportCard, allCharacters);
      }
      
      // Perform repair action
      const junkToUse = Math.min(currentGroup[currentCharIndex].junkTokens, 2);
      const repairResult = performRepair(currentGroup[currentCharIndex], repairDecision.repairType!, junkToUse);
      currentGroup[currentCharIndex] = repairResult.character;
      combatLogs.push(...repairResult.log);
      
      // Update ally stats if repairing an ally
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
      // COMBAT ACTION - decide between attack or defend
      const actionRoll = Math.random();
      if (actionRoll < 0.8) {
        // ATTACK ACTION
        const target = getRandomTarget(opposingGroup);
        if (target) {
          const targetIndex = opposingGroup.findIndex(c => c.id === target.id);
          let canAttack = true;
          let mustReload = false;
          
          // Check if ranged character can actually attack
          if (currentGroup[currentCharIndex].hasRangedWeapon) {
            if (currentGroup[currentCharIndex].bulletTokens === 0) {
              canAttack = false;
              mustReload = true;
            } else if (currentGroup[currentCharIndex].gunPoints === 0) {
              canAttack = false;
              mustReload = false; // Can't reload broken gun without junk
            }
          }
          
          if (canAttack) {
            // ATTACK - activate offensive cards
            const offensiveCards = getAvailableCards(currentGroup[currentCharIndex]).filter(card =>
              ![11, 12, 13, 15].includes(card) // Exclude junk tokens and pure support cards
            );
            
            if (offensiveCards.length > 0 && Math.random() < 0.7) { // 70% chance to use card
              const offensiveCard = offensiveCards[Math.floor(Math.random() * offensiveCards.length)];
              currentGroup[currentCharIndex] = activateCard(currentGroup[currentCharIndex], offensiveCard, allCharacters);
            }
            
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
          } else if (mustReload) {
            // RELOAD - must discard any chosen card since action failed
            const availableCards = getAvailableCards(currentGroup[currentCharIndex]).filter(card => !isJunkTokenCard(card));
            if (availableCards.length > 0) {
              const discardedCard = availableCards[Math.floor(Math.random() * availableCards.length)];
              combatLogs.push(`${currentGroup[currentCharIndex].name} attempted to use Card ${discardedCard} but must reload instead - card discarded!`);
            }
            
            // Perform reload
            const reloadResult = performReload(currentGroup[currentCharIndex]);
            currentGroup[currentCharIndex] = reloadResult.character;
            combatLogs.push(...reloadResult.log);
          } else {
            // CAN'T ATTACK OR RELOAD - defend instead, discard any chosen card
            const availableCards = getAvailableCards(currentGroup[currentCharIndex]).filter(card => !isJunkTokenCard(card));
            if (availableCards.length > 0) {
              const discardedCard = availableCards[Math.floor(Math.random() * availableCards.length)];
              combatLogs.push(`${currentGroup[currentCharIndex].name} attempted to use Card ${discardedCard} but cannot act - card discarded!`);
            }
            
            const defendResult = simulateDefend(currentGroup[currentCharIndex]);
            currentGroup[currentCharIndex] = defendResult.character;
            combatLogs.push(...defendResult.log);
          }
        }
      } else {
        // DEFEND ACTION - activate defensive cards
        const defensiveCards = getAvailableCards(currentGroup[currentCharIndex]).filter(card =>
          [6, 10, 14].includes(card) // Patience, Parry, Retaliation
        );
        
        if (defensiveCards.length > 0 && Math.random() < 0.8) { // 80% chance to use defensive card when defending
          const defensiveCard = defensiveCards[Math.floor(Math.random() * defensiveCards.length)];
          currentGroup[currentCharIndex] = activateCard(currentGroup[currentCharIndex], defensiveCard, allCharacters);
        }
        
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