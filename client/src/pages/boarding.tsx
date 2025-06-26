import { useState } from 'react';
import type { Character } from '@shared/schema';
import { generateProfile, createBlankProfile } from '@/lib/character-generator';
import { CharacterCard } from '@/components/character-card';
import { GroupSidebar } from '@/components/group-sidebar';
import { ControlPanel } from '@/components/control-panel';
import { CardEffectsReference } from '@/components/card-effects-reference';
import { WarSystem } from '@/components/war-system';

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

  // Migration helper to ensure all characters have new properties
  const migrateCharacter = (character: Character): Character => {
    return {
      ...character,
      tempHp: character.tempHp ?? 0,
      armorPlates: character.armorPlates ?? (character as any).armor ?? 2,
      maxArmorPlates: character.maxArmorPlates ?? (character as any).armor ?? 2,
      tempArmorPlates: character.tempArmorPlates ?? 0,
      bulletTokens: character.bulletTokens ?? (character.hasRangedWeapon ? 4 : 0),
      gunPoints: character.gunPoints ?? (character.hasRangedWeapon ? 4 : 0),
      junkTokens: character.junkTokens ?? 0,
      hasRangedWeapon: character.hasRangedWeapon ?? (character.class <= 3),
      activeEffects: character.activeEffects ?? [],
      isAlive: character.isAlive ?? (character.hp > 0),
      lastDamageType: character.lastDamageType ?? 'none',
      cards: character.cards ?? [],
    };
  };

  // Migrate existing groups on load
  const migratedGroups = Object.fromEntries(
    Object.entries(groups).map(([groupId, characters]) => [
      groupId,
      characters.map(migrateCharacter)
    ])
  );

  const addBlankProfile = () => {
    if (!activeGroup) return;
    
    const blankProfile = createBlankProfile();
    const updatedGroup = [...(migratedGroups[activeGroup] || []), blankProfile];
    setGroups({ ...groups, [activeGroup]: updatedGroup });
  };

  const updateProfile = (profileId: string, updatedData: Character) => {
    if (!activeGroup) return;
    
    const updatedGroup = migratedGroups[activeGroup].map(p =>
      p.id === profileId ? migrateCharacter(updatedData) : p
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

  const renameGroup = (oldName: string, newName: string) => {
    if (newName === oldName || groups[newName]) return;
    
    const newGroups = { ...groups };
    newGroups[newName] = newGroups[oldName];
    delete newGroups[oldName];
    
    setGroups(newGroups);
    if (activeGroup === oldName) {
      setActiveGroup(newName);
    }
  };

  const resetAllCards = () => {
    const newGroups: Record<string, Character[]> = {};
    for (const group in migratedGroups) {
      newGroups[group] = migratedGroups[group].map(p => ({ 
        ...migrateCharacter(p), 
        cards: [],
        activeEffects: [],
        tempHp: 0,
        tempArmorPlates: 0,
      }));
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
        onAddBlank={addBlankProfile}
        activeGroup={activeGroup}
      />

      <div className="flex gap-6">
        {/* Group Sidebar */}
        <GroupSidebar
          groups={migratedGroups}
          activeGroup={activeGroup}
          onGroupSelect={setActiveGroup}
          onGroupDelete={deleteGroup}
          onGroupRename={renameGroup}
        />

        {/* Character Profiles Grid */}
        <div className="flex-1">
          {activeGroup && migratedGroups[activeGroup] && (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {migratedGroups[activeGroup].map(character => (
                <CharacterCard
                  key={character.id}
                  character={character}
                  onUpdate={(updatedCharacter) => updateProfile(character.id, updatedCharacter)}
                />
              ))}
            </div>
          )}

          {(!activeGroup || !migratedGroups[activeGroup]) && (
            <div className="text-center text-gray-400 mt-12">
              <h2 className="text-2xl mb-4">NO ACTIVE GROUP</h2>
              <p>Generate characters to get started</p>
            </div>
          )}

          {/* Card Effects Reference */}
          <CardEffectsReference />
        </div>
      </div>
      
      {/* WAR System */}
      <WarSystem 
        groups={migratedGroups} 
        onUpdateGroups={setGroups}
      />
    </div>
  );
}
