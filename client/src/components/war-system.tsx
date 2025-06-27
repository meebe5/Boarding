import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Character } from '@shared/schema';
import { drawCardsForClass, CARD_EFFECTS, CLASS_ROLE_TYPE } from '@/lib/character-generator';
import { startTurn, playCard, performRangedAttack, performMeleeAttack, performDefend, performReload, performRepair } from '@/lib/combat-engine';

interface WarSystemProps {
  groups: Record<string, Character[]>;
  onUpdateGroups: (groups: Record<string, Character[]>) => void;
}

export function WarSystem({ groups, onUpdateGroups }: WarSystemProps) {
  const [combatLog, setCombatLog] = useState<string[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<[string, string] | null>(null);
  const [selectedGroup1, setSelectedGroup1] = useState<string>('');
  const [selectedGroup2, setSelectedGroup2] = useState<string>('');
  const [currentRound, setCurrentRound] = useState(1);
  const [currentWarState, setCurrentWarState] = useState<{
    group1: Character[];
    group2: Character[];
    group1Name: string;
    group2Name: string;
  } | null>(null);

  const groupNames = Object.keys(groups);
  
  const startWar = (group1Name: string, group2Name: string) => {
    if (!groups[group1Name] || !groups[group2Name]) return;
    
    setSelectedGroups([group1Name, group2Name]);
    setCombatLog([`=== WAR BEGINS: ${group1Name} vs ${group2Name} ===`]);
    setIsSimulating(true);
    setCurrentRound(1);
    
    // Start first round
    simulateRound(groups[group1Name], groups[group2Name], group1Name, group2Name);
  };

  const simulateRound = async (group1: Character[], group2: Character[], group1Name: string, group2Name: string) => {
    let updatedGroup1 = [...group1];
    let updatedGroup2 = [...group2];
    
    setCurrentWarState({ group1: updatedGroup1, group2: updatedGroup2, group1Name, group2Name });
    
    await processSingleRound(updatedGroup1, updatedGroup2, group1Name, group2Name);
  };

  const processSingleRound = async (group1: Character[], group2: Character[], group1Name: string, group2Name: string) => {
    let roundLogs: string[] = [`\n--- ROUND ${currentRound} ---`];
    
    // Check if war should end at start of round (one team has 0 HP)
    if (!isWarActive(group1, group2)) {
      roundLogs.push(`War ends - one team has no remaining HP`);
      setCombatLog(prev => [...prev, ...roundLogs]);
      endWar(group1, group2, group1Name, group2Name);
      return;
    }

    let updatedGroup1 = [...group1];
    let updatedGroup2 = [...group2];
      
    // Start of turn: draw cards for all living characters
    updatedGroup1 = updatedGroup1.map(character => {
      if (!character.isAlive) return character;
      
      const turnResult = startTurn(character);
      roundLogs.push(...turnResult.log);
      
      // Draw cards based on class
      const drawnCards = drawCardsForClass(character.class);
      const updatedChar = { ...turnResult.character, cards: drawnCards };
      roundLogs.push(`${character.name} draws from ${CLASS_ROLE_TYPE[character.class as keyof typeof CLASS_ROLE_TYPE]} deck: Cards ${drawnCards.join(', ')}`);
      
      return updatedChar;
    });

    updatedGroup2 = updatedGroup2.map(character => {
      if (!character.isAlive) return character;
      
      const turnResult = startTurn(character);
      roundLogs.push(...turnResult.log);
      
      // Draw cards based on class
      const drawnCards = drawCardsForClass(character.class);
      const updatedChar = { ...turnResult.character, cards: drawnCards };
      roundLogs.push(`${character.name} draws from ${CLASS_ROLE_TYPE[character.class as keyof typeof CLASS_ROLE_TYPE]} deck: Cards ${drawnCards.join(', ')}`);
      
      return updatedChar;
    });

    // Create alternating turn order: Group 1 -> Group 2 -> Group 1 -> etc.
    const group1Alive = updatedGroup1.filter(c => c.isAlive && c.hp > 0);
    const group2Alive = updatedGroup2.filter(c => c.isAlive && c.hp > 0);
    
    const maxTurns = Math.max(group1Alive.length, group2Alive.length);
    
    // Process alternating turns
    for (let i = 0; i < maxTurns; i++) {
      // Group 1 turn
      if (i < group1Alive.length) {
        const character = group1Alive[i];
        const charIndex = updatedGroup1.findIndex(c => c.id === character.id);
        if (charIndex !== -1) {
          const result = await processCharacterTurn(
            updatedGroup1[charIndex], 
            updatedGroup1, 
            updatedGroup2, 
            charIndex, 
            true,
            roundLogs
          );
          updatedGroup1 = result.currentGroup;
          updatedGroup2 = result.opposingGroup;
          roundLogs = result.logs;
        }
      }



      // Group 2 turn
      if (i < group2Alive.length) {
        const character = group2Alive[i];
        const charIndex = updatedGroup2.findIndex(c => c.id === character.id);
        if (charIndex !== -1) {
          const result = await processCharacterTurn(
            updatedGroup2[charIndex], 
            updatedGroup2, 
            updatedGroup1, 
            charIndex, 
            false,
            roundLogs
          );
          updatedGroup2 = result.currentGroup;
          updatedGroup1 = result.opposingGroup;
          roundLogs = result.logs;
        }
      }

      // Don't log alive/dead status after each turn - only at round end
    }

    // Always update combat log with this round's actions first
    setCombatLog(prev => [...prev, ...roundLogs]);
    
    // Log alive/dead status at the END of the round
    const g1StillAlive = updatedGroup1.filter(c => c.isAlive && c.hp > 0).length;
    const g2StillAlive = updatedGroup2.filter(c => c.isAlive && c.hp > 0).length;
    setCombatLog(prev => [...prev, `End of Round ${currentRound}: ${group1Name} ${g1StillAlive} alive, ${group2Name} ${g2StillAlive} alive`]);
    
    // Check if war should end after this round is complete
    if (!isWarActive(updatedGroup1, updatedGroup2)) {
      endWar(updatedGroup1, updatedGroup2, group1Name, group2Name);
      return;
    }

    // Round complete - update state and pause for next round
    setCurrentRound(prev => prev + 1);
    setCurrentWarState({ group1: updatedGroup1, group2: updatedGroup2, group1Name, group2Name });
    
    const newGroups = {
      ...groups,
      [group1Name]: updatedGroup1,
      [group2Name]: updatedGroup2
    };
    onUpdateGroups(newGroups);

    setCombatLog(prev => [...prev, `\n--- ROUND ${currentRound} COMPLETE ---`, `Press CONTINUE to proceed to Round ${currentRound + 1}`]);
    setIsSimulating(false);
    setIsPaused(true);
  };

  const processCharacterTurn = async (
    character: Character,
    currentGroup: Character[],
    opposingGroup: Character[],
    charIndex: number,
    isGroup1: boolean,
    logs: string[]
  ): Promise<{ currentGroup: Character[]; opposingGroup: Character[]; logs: string[] }> => {
    // Ensure character with 0 HP is marked as dead
    if (character.hp <= 0) {
      character.hp = 0;
      character.isAlive = false;
      return { currentGroup, opposingGroup, logs };
    }
    
    if (!character.isAlive) return { currentGroup, opposingGroup, logs };

    let currentChar = character;
    let updatedCurrentGroup = [...currentGroup];
    let updatedOpposingGroup = [...opposingGroup];
    let roundLogs = [...logs];
    
    roundLogs.push(`\n${currentChar.name}'s Turn:`);

    // Play a random card if available
    if (currentChar.cards.length > 0) {
      const randomCardIndex = Math.floor(Math.random() * currentChar.cards.length);
      const cardToPlay = currentChar.cards[randomCardIndex];
      
      const cardResult = playCard(currentChar, cardToPlay, [...updatedCurrentGroup, ...updatedOpposingGroup]);
      currentChar = cardResult.character;
      roundLogs.push(...cardResult.log);
      updatedCurrentGroup[charIndex] = currentChar;
    }

    // AI Decision Making based on class role
    const classRole = CLASS_ROLE_TYPE[currentChar.class as keyof typeof CLASS_ROLE_TYPE];
    
    // Support AI: Prioritize helping allies first based on class specialization
    if (classRole === 'SUPPORT' && currentChar.junkTokens > 0) {
      let repairTarget = null;
      let repairType: 'ARMOR' | 'GUN' | null = null;
      
      // Scavenger (class 3) - Ranged support: prioritize gun repairs for Engineers and Shooters
      if (currentChar.class === 3) {
        const rangedAllies = updatedCurrentGroup.filter(ally => 
          ally.isAlive && ally.hp > 0 && ally.id !== currentChar.id &&
          (ally.class === 1 || ally.class === 2) && // Shooter or Engineer
          ally.gunPoints < (ally.maxGunPoints || 4)
        );
        
        if (rangedAllies.length > 0) {
          // Find ally with lowest gun points (most urgent)
          repairTarget = rangedAllies.reduce((lowest, current) => 
            current.gunPoints < lowest.gunPoints ? current : lowest
          );
          repairType = 'GUN';
        }
      }
      
      // Tinkerer (class 4) - Melee support: prioritize armor repairs for ALL melee classes
      if (currentChar.class === 4) {
        const meleeAllies = updatedCurrentGroup.filter(ally => 
          ally.isAlive && ally.hp > 0 && ally.id !== currentChar.id &&
          (ally.class === 4 || ally.class === 5 || ally.class === 6) && // Tinkerer, Brute, or Breaker
          ally.armorPlates < ally.maxArmorPlates // Actually missing armor points
        );
        
        if (meleeAllies.length > 0) {
          // Find ally with lowest armor (most urgent)
          repairTarget = meleeAllies.reduce((lowest, current) => 
            current.armorPlates < lowest.armorPlates ? current : lowest
          );
          repairType = 'ARMOR';
        }
        // If no allies need repair, check if self needs armor repair
        else if (currentChar.armorPlates < currentChar.maxArmorPlates) {
          repairTarget = currentChar;
          repairType = 'ARMOR';
        }
      }
      
      // Perform the repair if target found
      if (repairTarget && repairType) {
        const tokensToUse = Math.min(currentChar.junkTokens, 2);
        const repairResult = performRepair(currentChar, repairType, tokensToUse);
        updatedCurrentGroup[charIndex] = repairResult.character;
        
        // Update the ally's stats
        const allyIndex = updatedCurrentGroup.findIndex(c => c.id === repairTarget.id);
        if (allyIndex !== -1) {
          if (repairType === 'GUN') {
            const wasGunBroken = updatedCurrentGroup[allyIndex].gunPoints === 0;
            const currentGunPoints = updatedCurrentGroup[allyIndex].gunPoints;
            const repairAmount = tokensToUse * (currentChar.class === 3 ? 2 : 1); // Scavenger doubles gun repair
            const maxRepair = (updatedCurrentGroup[allyIndex].maxGunPoints || 4) - currentGunPoints;
            const actualRepair = Math.min(repairAmount, maxRepair);
            
            updatedCurrentGroup[allyIndex].gunPoints = Math.min(
              updatedCurrentGroup[allyIndex].gunPoints + repairAmount,
              updatedCurrentGroup[allyIndex].maxGunPoints || 4
            );
            if (updatedCurrentGroup[allyIndex].gunPoints > 0) {
              updatedCurrentGroup[allyIndex].hasRangedWeapon = true;
              // If gun was completely broken and is now repaired, restore max bullets
              if (wasGunBroken) {
                updatedCurrentGroup[allyIndex].bulletTokens = updatedCurrentGroup[allyIndex].maxBulletTokens || 4;
                roundLogs.push(`${repairTarget.name} receives full bullet count with repaired gun!`);
              }
            }
            roundLogs.push(`${repairTarget.name} receives ${actualRepair} gun point repair from ${currentChar.name} using ${tokensToUse} junk tokens`);
          } else if (repairType === 'ARMOR') {
            const currentArmorPlates = updatedCurrentGroup[allyIndex].armorPlates;
            const repairAmount = tokensToUse * (currentChar.class === 4 ? 2 : 1); // Tinkerer doubles armor repair
            const maxRepair = updatedCurrentGroup[allyIndex].maxArmorPlates - currentArmorPlates;
            const actualRepair = Math.min(repairAmount, maxRepair);
            
            updatedCurrentGroup[allyIndex].armorPlates = Math.min(
              updatedCurrentGroup[allyIndex].armorPlates + repairAmount,
              updatedCurrentGroup[allyIndex].maxArmorPlates
            );
            roundLogs.push(`${repairTarget.name} receives ${actualRepair} armor plate repair from ${currentChar.name} using ${tokensToUse} junk tokens`);
          }
        }
        
        roundLogs.push(...repairResult.log);
        return { currentGroup: updatedCurrentGroup, opposingGroup: updatedOpposingGroup, logs: roundLogs };
      }
    }
    
    // Ranged AI: Must reload/repair if can't shoot
    if (classRole === 'RANGED' && currentChar.hasRangedWeapon) {
      if (currentChar.bulletTokens === 0) {
        // Must reload
        const reloadResult = performReload(currentChar);
        updatedCurrentGroup[charIndex] = reloadResult.character;
        roundLogs.push(...reloadResult.log);
        return { currentGroup: updatedCurrentGroup, opposingGroup: updatedOpposingGroup, logs: roundLogs };
      } else if (currentChar.gunPoints === 0) {
        // Gun broken - need junk to repair
        if (currentChar.junkTokens > 0) {
          const repairResult = performRepair(currentChar, 'GUN', Math.min(currentChar.junkTokens, 2));
          updatedCurrentGroup[charIndex] = repairResult.character;
          roundLogs.push(...repairResult.log);
          return { currentGroup: updatedCurrentGroup, opposingGroup: updatedOpposingGroup, logs: roundLogs };
        } else {
          // No junk - draw support card for junk tokens if possible
          const supportCards = [11, 13]; // Junk Tokens and Scrap Scan
          const hasJunkCard = currentChar.cards.some(card => supportCards.includes(card));
          if (hasJunkCard) {
            const junkCard = currentChar.cards.find(card => supportCards.includes(card));
            if (junkCard) {
              const cardResult = playCard(currentChar, junkCard, [...updatedCurrentGroup, ...updatedOpposingGroup]);
              currentChar = cardResult.character;
              roundLogs.push(...cardResult.log);
              updatedCurrentGroup[charIndex] = currentChar;
              return { currentGroup: updatedCurrentGroup, opposingGroup: updatedOpposingGroup, logs: roundLogs };
            }
          }
        }
      }
    }
    
    // Combat decision making
    const actionRoll = Math.random();
    
    if (classRole === 'MELEE') {
      // Melee: 85% attack, 15% defend
      if (actionRoll < 0.85) {
        // Attack
        const target = selectTarget(currentChar, updatedOpposingGroup);
        if (target) {
          const targetIndex = updatedOpposingGroup.findIndex(c => c.id === target.id);
          const attackResult = performMeleeAttack(currentChar, updatedOpposingGroup[targetIndex]);
          updatedCurrentGroup[charIndex] = attackResult.attacker;
          updatedOpposingGroup[targetIndex] = attackResult.defender;
          roundLogs.push(...attackResult.log);
        }
      } else {
        // Defend
        const defendResult = performDefend(currentChar);
        updatedCurrentGroup[charIndex] = defendResult.character;
        roundLogs.push(...defendResult.log);
      }
    } else if (classRole === 'RANGED') {
      // Ranged: Always attack if possible (already handled reload/repair above)
      const target = selectTarget(currentChar, updatedOpposingGroup);
      if (target) {
        const targetIndex = updatedOpposingGroup.findIndex(c => c.id === target.id);
        
        if (currentChar.hasRangedWeapon && currentChar.bulletTokens > 0 && currentChar.gunPoints > 0) {
          const attackResult = performRangedAttack(currentChar, updatedOpposingGroup[targetIndex]);
          updatedCurrentGroup[charIndex] = attackResult.attacker;
          updatedOpposingGroup[targetIndex] = attackResult.defender;
          roundLogs.push(...attackResult.log);
          
          // Check for Snap Fire effect - make second attack with penalty
          if (attackResult.attacker.activeEffects.some(e => e.cardId === 3)) {
            const secondAttackResult = performRangedAttack(attackResult.attacker, attackResult.defender, true);
            updatedCurrentGroup[charIndex] = secondAttackResult.attacker;
            updatedOpposingGroup[targetIndex] = secondAttackResult.defender;
            roundLogs.push(...secondAttackResult.log);
          }
        } else {
          // Fallback to melee if ranged unavailable
          const attackResult = performMeleeAttack(currentChar, updatedOpposingGroup[targetIndex]);
          updatedCurrentGroup[charIndex] = attackResult.attacker;
          updatedOpposingGroup[targetIndex] = attackResult.defender;
          roundLogs.push(...attackResult.log);
          
          // Check for Snap Fire effect - make second attack with penalty  
          if (attackResult.attacker.activeEffects.some(e => e.cardId === 3)) {
            const secondAttackResult = performMeleeAttack(attackResult.attacker, attackResult.defender, true);
            updatedCurrentGroup[charIndex] = secondAttackResult.attacker;
            updatedOpposingGroup[targetIndex] = secondAttackResult.defender;
            roundLogs.push(...secondAttackResult.log);
          }
        }
      }
    } else {
      // Support: 80% attack, 20% defend (after helping allies)
      if (actionRoll < 0.8) {
        const target = selectTarget(currentChar, updatedOpposingGroup);
        if (target) {
          const targetIndex = updatedOpposingGroup.findIndex(c => c.id === target.id);
          
          if (currentChar.hasRangedWeapon && currentChar.bulletTokens > 0 && currentChar.gunPoints > 0) {
            const attackResult = performRangedAttack(currentChar, updatedOpposingGroup[targetIndex]);
            updatedCurrentGroup[charIndex] = attackResult.attacker;
            updatedOpposingGroup[targetIndex] = attackResult.defender;
            roundLogs.push(...attackResult.log);
            
            // Check for Snap Fire effect - make second attack with penalty
            if (attackResult.attacker.activeEffects.some(e => e.cardId === 3)) {
              const secondAttackResult = performRangedAttack(attackResult.attacker, attackResult.defender, true);
              updatedCurrentGroup[charIndex] = secondAttackResult.attacker;
              updatedOpposingGroup[targetIndex] = secondAttackResult.defender;
              roundLogs.push(...secondAttackResult.log);
            }
          } else {
            const attackResult = performMeleeAttack(currentChar, updatedOpposingGroup[targetIndex]);
            updatedCurrentGroup[charIndex] = attackResult.attacker;
            updatedOpposingGroup[targetIndex] = attackResult.defender;
            roundLogs.push(...attackResult.log);
            
            // Check for Snap Fire effect - make second attack with penalty
            if (attackResult.attacker.activeEffects.some(e => e.cardId === 3)) {
              const secondAttackResult = performMeleeAttack(attackResult.attacker, attackResult.defender, true);
              updatedCurrentGroup[charIndex] = secondAttackResult.attacker;
              updatedOpposingGroup[targetIndex] = secondAttackResult.defender;
              roundLogs.push(...secondAttackResult.log);
            }
          }
        }
      } else {
        // Defend
        const defendResult = performDefend(currentChar);
        updatedCurrentGroup[charIndex] = defendResult.character;
        roundLogs.push(...defendResult.log);
      }
    }

    return { currentGroup: updatedCurrentGroup, opposingGroup: updatedOpposingGroup, logs: roundLogs };
  };

  const continueWar = () => {
    if (currentWarState) {
      setIsSimulating(true);
      setIsPaused(false);
      processSingleRound(
        currentWarState.group1,
        currentWarState.group2,
        currentWarState.group1Name,
        currentWarState.group2Name
      );
    }
  };

  const endWar = (group1: Character[], group2: Character[], group1Name: string, group2Name: string) => {
    const group1TotalHP = group1.filter(c => c.isAlive).reduce((sum, char) => sum + Math.max(0, char.hp), 0);
    const group2TotalHP = group2.filter(c => c.isAlive).reduce((sum, char) => sum + Math.max(0, char.hp), 0);
    
    let endLogs: string[] = [];
    endLogs.push(`\n=== FINAL TALLY ===`);
    endLogs.push(`${group1Name}: ${group1TotalHP} total HP remaining`);
    endLogs.push(`${group2Name}: ${group2TotalHP} total HP remaining`);
    
    if (group1TotalHP > group2TotalHP) {
      endLogs.push(`\n🎉 ${group1Name} WINS! (${group1TotalHP} HP vs ${group2TotalHP} HP)`);
    } else if (group2TotalHP > group1TotalHP) {
      endLogs.push(`\n🎉 ${group2Name} WINS! (${group2TotalHP} HP vs ${group1TotalHP} HP)`);
    } else {
      endLogs.push(`\n⚖️ DRAW! Both groups eliminated`);
    }

    setCombatLog(prev => [...prev, ...endLogs]);
    setIsSimulating(false);
    setIsPaused(false);
    setCurrentWarState(null);
    
    // Update groups in parent component
    onUpdateGroups({
      ...groups,
      [group1Name]: group1,
      [group2Name]: group2
    });
  };

  const selectTarget = (attacker: Character, enemies: Character[]): Character | null => {
    const aliveEnemies = enemies.filter(e => e.isAlive && e.hp > 0);
    if (aliveEnemies.length === 0) return null;

    const attackerRole = CLASS_ROLE_TYPE[attacker.class as keyof typeof CLASS_ROLE_TYPE];
    
    // Melee characters MUST target melee enemies first, then can target anyone
    if (attackerRole === 'MELEE') {
      const meleeEnemies = aliveEnemies.filter(e => CLASS_ROLE_TYPE[e.class as keyof typeof CLASS_ROLE_TYPE] === 'MELEE');
      if (meleeEnemies.length > 0) {
        const target = meleeEnemies[Math.floor(Math.random() * meleeEnemies.length)];
        return target;
      }
      // No melee enemies left, can target anyone
    }
    
    // Ranged and Support can target anyone, Melee targets anyone if no melee enemies
    const target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
    return target;
  };

  const isWarActive = (group1: Character[], group2: Character[]): boolean => {
    const group1TotalHP = group1.filter(c => c.isAlive).reduce((sum, char) => sum + Math.max(0, char.hp), 0);
    const group2TotalHP = group2.filter(c => c.isAlive).reduce((sum, char) => sum + Math.max(0, char.hp), 0);
    return group1TotalHP > 0 && group2TotalHP > 0;
  };

  const resetWar = () => {
    setCombatLog([]);
    setSelectedGroups(null);
    setSelectedGroup1('');
    setSelectedGroup2('');
    setIsSimulating(false);
    setIsPaused(false);
    setCurrentRound(1);
    setCurrentWarState(null);
  };

  const canStartWar = () => {
    return selectedGroup1 && selectedGroup2 && selectedGroup1 !== selectedGroup2 && 
           groups[selectedGroup1] && groups[selectedGroup2] && 
           groups[selectedGroup1].length > 0 && groups[selectedGroup2].length > 0;
  };

  return (
    <div className="war-system bg-gray-900 border border-gray-700 rounded-lg p-4 md:p-6 mobile-safe-bottom flex flex-col h-full">
      <h2 className="text-lg md:text-xl font-bold text-white mb-3 md:mb-4 flex items-center gap-2">
        ⚔️ WAR SIMULATION SYSTEM
      </h2>



      {/* War Controls */}
      <div className="space-y-3 mb-3 md:mb-4 flex-shrink-0">
        {/* Group Selection */}
        {!isSimulating && !isPaused && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Group 1</label>
              <Select value={selectedGroup1} onValueChange={setSelectedGroup1}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select first group" />
                </SelectTrigger>
                <SelectContent>
                  {groupNames.map(groupName => (
                    <SelectItem key={groupName} value={groupName}>
                      {groupName} ({groups[groupName]?.length || 0})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Group 2</label>
              <Select value={selectedGroup2} onValueChange={setSelectedGroup2}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select second group" />
                </SelectTrigger>
                <SelectContent>
                  {groupNames.filter(name => name !== selectedGroup1).map(groupName => (
                    <SelectItem key={groupName} value={groupName}>
                      {groupName} ({groups[groupName]?.length || 0})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={() => canStartWar() && startWar(selectedGroup1, selectedGroup2)}
              disabled={!canStartWar()}
              className="bg-red-600 hover:bg-red-700 text-sm h-9"
            >
              START WAR
            </Button>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap">
          {isSimulating && (
            <Button 
              disabled
              className="bg-red-600 text-sm md:text-base"
            >
              SIMULATING...
            </Button>
          )}
        
          {isPaused && (
            <Button 
              onClick={continueWar}
              disabled={isSimulating}
              className="bg-blue-600 hover:bg-blue-700 text-sm md:text-base"
            >
              CONTINUE ROUND {currentRound}
            </Button>
          )}
          
          <Button 
            onClick={resetWar}
            variant="outline"
            className="border-gray-600 text-sm md:text-base"
          >
            RESET
          </Button>
        </div>
      </div>

      {/* Combat Log - Takes remaining space */}
      <div className="bg-black rounded border border-gray-600 flex-1 flex flex-col min-h-0">
        <div className="p-2 md:p-3 border-b border-gray-600 flex-shrink-0">
          <h3 className="text-sm font-semibold text-green-400">COMBAT LOG</h3>
        </div>
        <ScrollArea className="flex-1 p-2 md:p-3">
          <div className="font-mono text-xs whitespace-pre-line">
            {combatLog.length === 0 ? (
              <div className="text-gray-500">Waiting for combat to begin...</div>
            ) : (
              combatLog.map((line, index) => {
                // Color-code different types of log entries
                if (line.includes('ROUND') || line.includes('FINAL TALLY')) {
                  return <div key={index} className="text-yellow-400 font-bold">{line}</div>;
                } else if (line.includes('WINS') || line.includes('DRAW')) {
                  return <div key={index} className="text-green-400 font-bold">{line}</div>;
                } else if (line.includes('Initiative Order:')) {
                  return <div key={index} className="text-blue-400 font-semibold">{line}</div>;
                } else if (line.includes('Turn:')) {
                  return <div key={index} className="text-cyan-400 font-semibold">{line}</div>;
                } else if (line.includes('plays Card') || line.includes('draws from')) {
                  return <div key={index} className="text-purple-400">{line}</div>;
                } else if (line.includes('damage') || line.includes('takes') || line.includes('loses')) {
                  return <div key={index} className="text-red-400">{line}</div>;
                } else if (line.includes('attacks') || line.includes('defends') || line.includes('reloads')) {
                  return <div key={index} className="text-orange-400">{line}</div>;
                } else if (line.includes('defeated') || line.includes('💀')) {
                  return <div key={index} className="text-red-500 font-bold">{line}</div>;
                } else {
                  return <div key={index} className="text-gray-300">{line}</div>;
                }
              })
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}