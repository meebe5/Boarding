import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
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
    if (!isWarActive(group1, group2)) {
      endWar(group1, group2, group1Name, group2Name);
      return;
    }

    let updatedGroup1 = [...group1];
    let updatedGroup2 = [...group2];
    let roundLogs: string[] = [];
    
    roundLogs.push(`\n--- ROUND ${currentRound} ---`);
      
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

      // Check if war is over
      if (!isWarActive(updatedGroup1, updatedGroup2)) {
        endWar(updatedGroup1, updatedGroup2, group1Name, group2Name);
        return;
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

      // Check if war is over after each turn
      const g1StillAfter = updatedGroup1.filter(c => c.isAlive && c.hp > 0).length;
      const g2StillAfter = updatedGroup2.filter(c => c.isAlive && c.hp > 0).length;
      roundLogs.push(`After turn: ${group1Name} ${g1StillAfter} alive, ${group2Name} ${g2StillAfter} alive`);
      
      if (!isWarActive(updatedGroup1, updatedGroup2)) {
        endWar(updatedGroup1, updatedGroup2, group1Name, group2Name);
        return;
      }
    }

    // Round complete - update state and pause
    setCurrentRound(prev => prev + 1);
    setCurrentWarState({ group1: updatedGroup1, group2: updatedGroup2, group1Name, group2Name });
    
    const newGroups = {
      ...groups,
      [group1Name]: updatedGroup1,
      [group2Name]: updatedGroup2
    };
    onUpdateGroups(newGroups);

    setCombatLog(prev => [...prev, ...roundLogs, `\n--- ROUND ${currentRound} COMPLETE ---`, `Press CONTINUE to proceed to Round ${currentRound + 1}`]);
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
    
    // Support AI: Prioritize helping allies first
    if (classRole === 'SUPPORT' && currentChar.junkTokens > 0) {
      const allAllies = updatedCurrentGroup.filter(ally => ally.isAlive && ally.hp > 0 && ally.id !== currentChar.id);
      const needsRepair = allAllies.find(ally => 
        ally.armorPlates < ally.maxArmorPlates || 
        (ally.hasRangedWeapon && ally.gunPoints < 4)
      );
      
      if (needsRepair) {
        const repairTarget = needsRepair.armorPlates < needsRepair.maxArmorPlates ? 'ARMOR' : 'GUN';
        const tokensToUse = Math.min(currentChar.junkTokens, 2);
        const repairResult = performRepair(currentChar, repairTarget, tokensToUse);
        updatedCurrentGroup[charIndex] = repairResult.character;
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
          // No junk - draw support card for junk material if possible
          const supportCards = [11, 13]; // Junk Material and Scrap Scan
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
          
          // Check for extra attack from Snap Fire (second attack has no penalty)
          if (attackResult.attacker.tempBonuses?.extraAttack) {
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
          
          // Check for extra attack from Snap Fire (second attack has no penalty)
          if (attackResult.attacker.tempBonuses?.extraAttack) {
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
            
            // Check for extra attack from Snap Fire (second attack has no penalty)
            if (attackResult.attacker.tempBonuses?.extraAttack) {
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
            
            // Check for extra attack from Snap Fire (second attack has no penalty)
            if (attackResult.attacker.tempBonuses?.extraAttack) {
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
    setIsSimulating(false);
    setIsPaused(false);
    setCurrentRound(1);
    setCurrentWarState(null);
  };

  return (
    <div className="war-system bg-gray-900 border border-gray-700 rounded-lg p-6">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        ⚔️ WAR SIMULATION SYSTEM
      </h2>

      {/* Group Selection */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">SELECT OPPOSING GROUPS</h3>
        <div className="grid grid-cols-2 gap-4">
          {groupNames.slice(0, 2).map((groupName, index) => (
            <div key={groupName} className="bg-gray-800 rounded p-3 border border-gray-600">
              <div className="font-bold text-blue-400 mb-2">{groupName}</div>
              <div className="text-xs text-gray-300">
                Total HP: {groups[groupName]?.filter(c => c.isAlive).reduce((sum, char) => sum + Math.max(0, char.hp), 0) || 0}
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {groups[groupName]?.filter(c => c.isAlive).map(char => (
                  <Badge key={char.id} variant="secondary" className="text-xs">
                    {char.name.split(' ')[0]}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* War Controls */}
      <div className="flex gap-2 mb-4">
        <Button 
          onClick={() => groupNames.length >= 2 && startWar(groupNames[0], groupNames[1])}
          disabled={isSimulating || isPaused || groupNames.length < 2}
          className="bg-red-600 hover:bg-red-700"
        >
          {isSimulating ? 'SIMULATING...' : 'START WAR'}
        </Button>
        
        {isPaused && (
          <Button 
            onClick={continueWar}
            disabled={isSimulating}
            className="bg-blue-600 hover:bg-blue-700"
          >
            CONTINUE ROUND {currentRound}
          </Button>
        )}
        
        <Button 
          onClick={resetWar}
          variant="outline"
          className="border-gray-600"
        >
          RESET
        </Button>
      </div>

      {/* Combat Log */}
      <div className="bg-black rounded border border-gray-600 h-96">
        <div className="p-3 border-b border-gray-600">
          <h3 className="text-sm font-semibold text-green-400">COMBAT LOG</h3>
        </div>
        <ScrollArea className="h-80 p-3">
          <div className="font-mono text-xs text-green-300 whitespace-pre-line">
            {combatLog.length === 0 ? 'Waiting for combat to begin...' : combatLog.join('\n')}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}