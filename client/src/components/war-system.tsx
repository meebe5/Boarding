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
  const [selectedGroups, setSelectedGroups] = useState<[string, string] | null>(null);

  const groupNames = Object.keys(groups);
  
  const startWar = (group1Name: string, group2Name: string) => {
    if (!groups[group1Name] || !groups[group2Name]) return;
    
    setSelectedGroups([group1Name, group2Name]);
    setCombatLog([`=== WAR BEGINS: ${group1Name} vs ${group2Name} ===`]);
    setIsSimulating(true);
    
    // Start first round
    simulateRound(groups[group1Name], groups[group2Name], group1Name, group2Name);
  };

  const simulateRound = async (group1: Character[], group2: Character[], group1Name: string, group2Name: string) => {
    let updatedGroup1 = [...group1];
    let updatedGroup2 = [...group2];
    let roundLogs: string[] = [];
    let roundNumber = 1;

    while (isWarActive(updatedGroup1, updatedGroup2) && roundNumber <= 20) {
      roundLogs.push(`\n--- ROUND ${roundNumber} ---`);
      
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

      // Create turn order based on initiative (not implemented in new system, using class order)
      const allCharacters = [
        ...updatedGroup1.filter(c => c.isAlive).map(c => ({ ...c, groupName: group1Name, isGroup1: true })),
        ...updatedGroup2.filter(c => c.isAlive).map(c => ({ ...c, groupName: group2Name, isGroup1: false }))
      ].sort(() => Math.random() - 0.5); // Random turn order for now

      // Process each character's turn
      for (const character of allCharacters) {
        if (!character.isAlive) continue;

        const currentGroup = character.isGroup1 ? updatedGroup1 : updatedGroup2;
        const opposingGroup = character.isGroup1 ? updatedGroup2 : updatedGroup1;
        
        const charIndex = currentGroup.findIndex(c => c.id === character.id);
        if (charIndex === -1) continue;

        let currentChar = currentGroup[charIndex];
        
        roundLogs.push(`\n${currentChar.name}'s Turn:`);

        // Play a random card if available
        if (currentChar.cards.length > 0) {
          const randomCardIndex = Math.floor(Math.random() * currentChar.cards.length);
          const cardToPlay = currentChar.cards[randomCardIndex];
          
          const cardResult = playCard(currentChar, cardToPlay, [...currentGroup, ...opposingGroup]);
          currentChar = cardResult.character;
          roundLogs.push(...cardResult.log);
          currentGroup[charIndex] = currentChar;
        }

        // Choose action (80% attack, 20% defend/reload/repair)
        const actionRoll = Math.random();
        
        if (actionRoll < 0.8) {
          // Attack
          const target = selectTarget(currentChar, opposingGroup);
          if (target) {
            const targetIndex = opposingGroup.findIndex(c => c.id === target.id);
            
            // Determine attack type
            const isRangedAttack = currentChar.hasRangedWeapon && currentChar.bulletTokens > 0 && Math.random() < 0.7;
            
            if (isRangedAttack) {
              const attackResult = performRangedAttack(currentChar, opposingGroup[targetIndex]);
              currentGroup[charIndex] = attackResult.attacker;
              opposingGroup[targetIndex] = attackResult.defender;
              roundLogs.push(...attackResult.log);
            } else {
              const attackResult = performMeleeAttack(currentChar, opposingGroup[targetIndex]);
              currentGroup[charIndex] = attackResult.attacker;
              opposingGroup[targetIndex] = attackResult.defender;
              roundLogs.push(...attackResult.log);
            }
          }
        } else {
          // Other actions
          const actionChoice = Math.random();
          if (actionChoice < 0.4) {
            // Defend
            const defendResult = performDefend(currentChar);
            currentGroup[charIndex] = defendResult.character;
            roundLogs.push(...defendResult.log);
          } else if (actionChoice < 0.7 && currentChar.hasRangedWeapon && currentChar.bulletTokens < 4) {
            // Reload
            const reloadResult = performReload(currentChar);
            currentGroup[charIndex] = reloadResult.character;
            roundLogs.push(...reloadResult.log);
          } else if (currentChar.junkTokens > 0) {
            // Repair
            const repairTarget = Math.random() < 0.5 ? 'ARMOR' : 'GUN';
            const tokensToUse = Math.min(currentChar.junkTokens, Math.floor(Math.random() * 3) + 1);
            const repairResult = performRepair(currentChar, repairTarget, tokensToUse);
            currentGroup[charIndex] = repairResult.character;
            roundLogs.push(...repairResult.log);
          } else {
            // Default to defend
            const defendResult = performDefend(currentChar);
            currentGroup[charIndex] = defendResult.character;
            roundLogs.push(...defendResult.log);
          }
        }

        // Check if war is over
        if (!isWarActive(updatedGroup1, updatedGroup2)) {
          break;
        }
      }

      roundNumber++;
      
      // Add delay for readability
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Determine winner
    const group1Alive = updatedGroup1.filter(c => c.isAlive).length;
    const group2Alive = updatedGroup2.filter(c => c.isAlive).length;
    
    if (group1Alive > group2Alive) {
      roundLogs.push(`\n🎉 ${group1Name} WINS! (${group1Alive} survivors vs ${group2Alive})`);
    } else if (group2Alive > group1Alive) {
      roundLogs.push(`\n🎉 ${group2Name} WINS! (${group2Alive} survivors vs ${group1Alive})`);
    } else {
      roundLogs.push(`\n⚖️ DRAW! Both groups have ${group1Alive} survivors`);
    }

    // Update groups
    const newGroups = {
      ...groups,
      [group1Name]: updatedGroup1,
      [group2Name]: updatedGroup2
    };
    onUpdateGroups(newGroups);

    // Update combat log
    setCombatLog(prev => [...prev, ...roundLogs]);
    setIsSimulating(false);
  };

  const selectTarget = (attacker: Character, enemies: Character[]): Character | null => {
    const aliveEnemies = enemies.filter(e => e.isAlive);
    if (aliveEnemies.length === 0) return null;

    const attackerRole = CLASS_ROLE_TYPE[attacker.class as keyof typeof CLASS_ROLE_TYPE];
    
    // Melee characters must target melee enemies first
    if (attackerRole === 'MELEE') {
      const meleeEnemies = aliveEnemies.filter(e => CLASS_ROLE_TYPE[e.class as keyof typeof CLASS_ROLE_TYPE] === 'MELEE');
      if (meleeEnemies.length > 0) {
        return meleeEnemies[Math.floor(Math.random() * meleeEnemies.length)];
      }
    }
    
    // Ranged and Support can target anyone, Melee targets anyone if no melee enemies
    return aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
  };

  const isWarActive = (group1: Character[], group2: Character[]): boolean => {
    const group1Alive = group1.filter(c => c.isAlive).length;
    const group2Alive = group2.filter(c => c.isAlive).length;
    return group1Alive > 0 && group2Alive > 0;
  };

  const resetWar = () => {
    setCombatLog([]);
    setSelectedGroups(null);
    setIsSimulating(false);
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
                {groups[groupName]?.filter(c => c.isAlive).length || 0} alive / {groups[groupName]?.length || 0} total
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
          disabled={isSimulating || groupNames.length < 2}
          className="bg-red-600 hover:bg-red-700"
        >
          {isSimulating ? 'SIMULATING...' : 'START WAR'}
        </Button>
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