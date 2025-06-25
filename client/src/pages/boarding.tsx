import { useState } from 'react';
import type { Character } from '@shared/schema';
import { generateProfile } from '@/lib/character-generator';
import { CharacterCard } from '@/components/character-card';
import { GroupSidebar } from '@/components/group-sidebar';
import { ControlPanel } from '@/components/control-panel';
import { CardEffectsReference } from '@/components/card-effects-reference';

export default function BoardingPage() {
  const [groups, setGroups] = useState<Record<string, Character[]>>({});
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  const handleGenerate = (troopCount: number) => {
    const newProfiles = Array.from({ length: troopCount }, generateProfile);
    const groupId = `Group ${Object.keys(groups).length + 1}`;
    const newGroups = {
      ...groups,
      [groupId]: newProfiles,
    };
    setGroups(newGroups);
    setActiveGroup(groupId);
  };

  const updateProfile = (profileId: string, updatedData: Character) => {
    if (!activeGroup) return;
    
    const updatedGroup = groups[activeGroup].map(p =>
      p.id === profileId ? updatedData : p
    );
    setGroups({ ...groups, [activeGroup]: updatedGroup });
  };

  const saveScenario = () => {
    const allSaves = JSON.parse(localStorage.getItem('boardingScenarios') || '{}');
    const saveName = prompt('Enter scenario name:');
    if (saveName) {
      allSaves[saveName] = groups;
      localStorage.setItem('boardingScenarios', JSON.stringify(allSaves));
      alert('Scenario saved.');
    }
  };

  const loadScenario = () => {
    const allSaves = JSON.parse(localStorage.getItem('boardingScenarios') || '{}');
    const names = Object.keys(allSaves);
    if (names.length === 0) {
      alert('No saved scenarios found.');
      return;
    }
    const selection = prompt(`Enter scenario name to load:\n${names.join(', ')}`);
    if (selection && allSaves[selection]) {
      setGroups(allSaves[selection]);
      setActiveGroup(Object.keys(allSaves[selection])[0]);
    }
  };

  const deleteGroup = (groupId: string) => {
    const newGroups = { ...groups };
    delete newGroups[groupId];
    setGroups(newGroups);
    if (activeGroup === groupId) {
      setActiveGroup(Object.keys(newGroups)[0] || null);
    }
  };

  const resetAllCards = () => {
    const newGroups: Record<string, Character[]> = {};
    for (const group in groups) {
      newGroups[group] = groups[group].map(p => ({ ...p, usedCards: [] }));
    }
    setGroups(newGroups);
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header Section */}
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-2 text-white tracking-wider">
          ▶ BOARDING
          <span className="text-blue-500 text-lg ml-2">TACTICAL OPERATIONS</span>
        </h1>
        <div className="h-1 w-32 bg-gradient-to-r from-blue-500 to-green-500"></div>
      </header>

      {/* Control Panel */}
      <ControlPanel
        onGenerate={handleGenerate}
        onSaveScenario={saveScenario}
        onLoadScenario={loadScenario}
        onResetAllCards={resetAllCards}
      />

      <div className="flex gap-6">
        {/* Group Sidebar */}
        <GroupSidebar
          groups={groups}
          activeGroup={activeGroup}
          onGroupSelect={setActiveGroup}
          onGroupDelete={deleteGroup}
        />

        {/* Character Profiles Grid */}
        <div className="flex-1">
          {activeGroup && groups[activeGroup] && (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {groups[activeGroup].map(character => (
                <CharacterCard
                  key={character.id}
                  character={character}
                  onUpdate={(updatedCharacter) => updateProfile(character.id, updatedCharacter)}
                />
              ))}
            </div>
          )}

          {(!activeGroup || !groups[activeGroup]) && (
            <div className="text-center text-gray-400 mt-12">
              <h2 className="text-2xl mb-4">NO ACTIVE GROUP</h2>
              <p>Generate characters to get started</p>
            </div>
          )}

          {/* Card Effects Reference */}
          <CardEffectsReference />
        </div>
      </div>
    </div>
  );
}
