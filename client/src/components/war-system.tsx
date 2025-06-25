import { useState } from 'react';
import type { Character, WarState, WarParticipant } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { simulateWarRound } from '@/lib/war-engine';
import { Swords, Shield, Skull } from 'lucide-react';

interface WarSystemProps {
  groups: Record<string, Character[]>;
  onUpdateGroups: (groups: Record<string, Character[]>) => void;
}

export function WarSystem({ groups, onUpdateGroups }: WarSystemProps) {
  const [warState, setWarState] = useState<WarState>({
    isActive: false,
    currentTurn: 0,
    currentGroup: 1,
    combatLog: [],
  });
  
  const [selectedGroup1, setSelectedGroup1] = useState<string | null>(null);
  const [selectedGroup2, setSelectedGroup2] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const startWar = () => {
    if (!selectedGroup1 || !selectedGroup2) return;
    
    const group1Data = groups[selectedGroup1];
    const group2Data = groups[selectedGroup2];
    
    if (!group1Data || !group2Data) return;
    
    setWarState({
      isActive: true,
      group1: {
        groupId: selectedGroup1,
        groupName: selectedGroup1,
        characters: group1Data.map(char => ({ ...char, isAlive: char.hp > 0 })),
      },
      group2: {
        groupId: selectedGroup2,
        groupName: selectedGroup2,
        characters: group2Data.map(char => ({ ...char, isAlive: char.hp > 0 })),
      },
      currentTurn: 1,
      currentGroup: 1,
      combatLog: [`WAR BEGINS: ${selectedGroup1} vs ${selectedGroup2}`],
    });
  };

  const simulateRound = async () => {
    if (!warState.group1 || !warState.group2) return;
    
    setIsSimulating(true);
    
    const result = simulateWarRound(
      warState.group1.characters,
      warState.group2.characters,
      warState.currentTurn
    );
    
    const newLog = [
      ...warState.combatLog,
      `--- TURN ${warState.currentTurn} ---`,
      ...result.logs,
    ];
    
    if (result.isComplete) {
      newLog.push(`WAR ENDED: ${result.winner} WINS!`);
      
      // Update the original groups with the war results
      const updatedGroups = { ...groups };
      if (warState.group1) {
        updatedGroups[warState.group1.groupId] = result.group1;
      }
      if (warState.group2) {
        updatedGroups[warState.group2.groupId] = result.group2;
      }
      onUpdateGroups(updatedGroups);
    }
    
    setWarState(prev => ({
      ...prev,
      group1: prev.group1 ? { ...prev.group1, characters: result.group1 } : undefined,
      group2: prev.group2 ? { ...prev.group2, characters: result.group2 } : undefined,
      currentTurn: prev.currentTurn + 1,
      combatLog: newLog,
    }));
    
    setIsSimulating(false);
  };

  const resetWar = () => {
    setWarState({
      isActive: false,
      currentTurn: 0,
      currentGroup: 1,
      combatLog: [],
    });
    setSelectedGroup1(null);
    setSelectedGroup2(null);
  };

  const getGroupStats = (characters: Character[]) => {
    const alive = characters.filter(c => c.isAlive).length;
    const total = characters.length;
    const totalHp = characters.reduce((sum, c) => sum + c.hp, 0);
    const maxHp = characters.reduce((sum, c) => sum + c.maxHp, 0);
    
    return { alive, total, totalHp, maxHp };
  };

  const availableGroups = Object.keys(groups).filter(groupId => 
    groups[groupId].some(char => char.hp > 0)
  );

  if (!warState.isActive) {
    return (
      <Card className="mt-8 bg-red-900/20 border-red-500/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-400">
            <Swords className="w-6 h-6" />
            WAR SYSTEM
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Group Selection */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-white">SELECT COMBATANTS</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">ASSAULT FORCE</label>
                  <div className="space-y-2">
                    {availableGroups.map(groupId => (
                      <Button
                        key={groupId}
                        variant={selectedGroup1 === groupId ? "default" : "outline"}
                        onClick={() => setSelectedGroup1(groupId)}
                        className="w-full justify-start"
                        disabled={selectedGroup2 === groupId}
                      >
                        {groupId} ({groups[groupId].filter(c => c.hp > 0).length} active)
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-2">DEFENDING FORCE</label>
                  <div className="space-y-2">
                    {availableGroups.map(groupId => (
                      <Button
                        key={groupId}
                        variant={selectedGroup2 === groupId ? "default" : "outline"}
                        onClick={() => setSelectedGroup2(groupId)}
                        className="w-full justify-start"
                        disabled={selectedGroup1 === groupId}
                      >
                        {groupId} ({groups[groupId].filter(c => c.hp > 0).length} active)
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              
              <Button
                onClick={startWar}
                disabled={!selectedGroup1 || !selectedGroup2}
                className="w-full mt-6 bg-red-600 hover:bg-red-700"
              >
                INITIATE WAR
              </Button>
            </div>
            
            {/* War Preview */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-white">WAR PREVIEW</h3>
              {selectedGroup1 && selectedGroup2 ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-400">
                      {selectedGroup1} vs {selectedGroup2}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <h4 className="font-semibold text-blue-400">{selectedGroup1}</h4>
                      <div className="text-sm text-gray-400">
                        {groups[selectedGroup1].filter(c => c.hp > 0).length} fighters
                      </div>
                    </div>
                    <div className="text-center">
                      <h4 className="font-semibold text-red-400">{selectedGroup2}</h4>
                      <div className="text-sm text-gray-400">
                        {groups[selectedGroup2].filter(c => c.hp > 0).length} fighters
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-400">
                  Select two groups to preview the war
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Active war state
  const group1Stats = warState.group1 ? getGroupStats(warState.group1.characters) : null;
  const group2Stats = warState.group2 ? getGroupStats(warState.group2.characters) : null;
  const isWarOver = (group1Stats?.alive === 0) || (group2Stats?.alive === 0);

  return (
    <Card className="mt-8 bg-red-900/20 border-red-500/50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-400">
            <Swords className="w-6 h-6" />
            ACTIVE WAR - TURN {warState.currentTurn}
          </div>
          <Button onClick={resetWar} variant="outline" size="sm">
            END WAR
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* War Status */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Group 1 Status */}
              <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-4">
                <h3 className="font-semibold text-blue-400 mb-2">
                  {warState.group1?.groupName || 'Group 1'}
                </h3>
                {group1Stats && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Active:</span>
                      <span className="text-green-400">{group1Stats.alive}/{group1Stats.total}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Total HP:</span>
                      <span>{group1Stats.totalHp}/{group1Stats.maxHp}</span>
                    </div>
                    <div className="w-full bg-gray-700 h-2 rounded">
                      <div 
                        className="bg-blue-500 h-2 rounded transition-all duration-300"
                        style={{ width: `${(group1Stats.totalHp / group1Stats.maxHp) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Group 2 Status */}
              <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4">
                <h3 className="font-semibold text-red-400 mb-2">
                  {warState.group2?.groupName || 'Group 2'}
                </h3>
                {group2Stats && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Active:</span>
                      <span className="text-green-400">{group2Stats.alive}/{group2Stats.total}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Total HP:</span>
                      <span>{group2Stats.totalHp}/{group2Stats.maxHp}</span>
                    </div>
                    <div className="w-full bg-gray-700 h-2 rounded">
                      <div 
                        className="bg-red-500 h-2 rounded transition-all duration-300"
                        style={{ width: `${(group2Stats.totalHp / group2Stats.maxHp) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Combat Controls */}
            <div className="flex gap-4">
              <Button
                onClick={simulateRound}
                disabled={isSimulating || isWarOver}
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                {isSimulating ? 'SIMULATING...' : 'SIMULATE ROUND'}
              </Button>
              
              {isWarOver && (
                <Badge variant="destructive" className="px-4 py-2">
                  WAR COMPLETE
                </Badge>
              )}
            </div>
          </div>
          
          {/* Combat Log */}
          <div>
            <h3 className="font-semibold text-white mb-2">COMBAT LOG</h3>
            <ScrollArea className="h-96 w-full border border-gray-600 rounded p-4 bg-black/50">
              <div className="space-y-2">
                {warState.combatLog.map((log, index) => (
                  <div key={index} className="text-sm font-mono">
                    {log.includes('TURN') ? (
                      <div className="text-yellow-400 font-bold border-b border-gray-600 pb-1 mb-2">
                        {log}
                      </div>
                    ) : log.includes('WINS') ? (
                      <div className="text-green-400 font-bold text-center py-2">
                        {log}
                      </div>
                    ) : (
                      <div className="text-gray-300">{log}</div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}