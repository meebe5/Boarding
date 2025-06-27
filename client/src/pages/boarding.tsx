import { useState } from 'react';
import type { Character } from '@shared/schema';
import { generateProfile, createBlankProfile } from '@/lib/character-generator';
import { CharacterCard } from '@/components/character-card';
import { GroupSidebar } from '@/components/group-sidebar';
import { ControlPanel } from '@/components/control-panel';
import { CardEffectsReference } from '@/components/card-effects-reference';
import { WarSystem } from '@/components/war-system';
import { PWAInstallPrompt } from '@/components/pwa-install-prompt';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, Users, Zap } from 'lucide-react';

export default function BoardingPage() {
  const [groups, setGroups] = useState<Record<string, Character[]>>({});
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [warSystemOpen, setWarSystemOpen] = useState(false);
  const isMobile = useIsMobile();

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
      maxBulletTokens: (character as any).maxBulletTokens ?? 4,
      gunPoints: character.gunPoints ?? (character.hasRangedWeapon ? 4 : 0),
      maxGunPoints: (character as any).maxGunPoints ?? 4,
      junkTokens: character.junkTokens ?? 0,
      hasRangedWeapon: character.hasRangedWeapon ?? (character.class <= 3),
      activeEffects: character.activeEffects ?? [],
      isAlive: character.isAlive ?? (character.hp > 0),
      lastDamageType: character.lastDamageType ?? 'none',
      cards: character.cards ?? [],
      meleeDamageDice: (character as any).meleeDamageDice ?? '1d6',
      rangedDamageDice: (character as any).rangedDamageDice ?? '1d4',
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
    <div className="min-h-screen bg-gray-900">
      {/* Mobile Header with Navigation */}
      <header className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isMobile && (
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-white">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 p-0">
                  <GroupSidebar
                    groups={migratedGroups}
                    activeGroup={activeGroup}
                    onGroupSelect={(groupId) => {
                      setActiveGroup(groupId);
                      setSidebarOpen(false);
                    }}
                    onGroupDelete={deleteGroup}
                    onGroupRename={renameGroup}
                  />
                </SheetContent>
              </Sheet>
            )}
            <div>
              <h1 className="text-xl md:text-3xl font-bold text-white tracking-wider">
                ▶ BOARDING
              </h1>
              <p className="text-xs md:text-sm text-blue-400">TACTICAL OPERATIONS</p>
            </div>
          </div>
          
          {isMobile && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setWarSystemOpen(true)}
                className="text-white"
              >
                <Zap className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        {!isMobile && (
          <div className="w-80 flex-shrink-0">
            <GroupSidebar
              groups={migratedGroups}
              activeGroup={activeGroup}
              onGroupSelect={setActiveGroup}
              onGroupDelete={deleteGroup}
              onGroupRename={renameGroup}
            />
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Control Panel */}
          <div className="p-4 md:p-6">
            <ControlPanel
              onGenerate={handleGenerate}
              onSaveScenario={saveScenario}
              onLoadScenario={loadScenario}
              onResetAllCards={resetAllCards}
              onAddBlank={addBlankProfile}
              activeGroup={activeGroup}
            />
          </div>

          {/* Character Profiles Grid */}
          <div className="px-4 md:px-6 pb-6">
            {activeGroup && migratedGroups[activeGroup] && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
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
              <div className="text-center text-gray-400 mt-12 px-4">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h2 className="text-xl md:text-2xl mb-4">NO ACTIVE GROUP</h2>
                <p className="text-sm md:text-base">Generate characters to get started</p>
              </div>
            )}

            {/* Card Effects Reference - Mobile Collapsed by Default */}
            <div className="mt-8">
              <CardEffectsReference />
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile WAR System Modal */}
      {isMobile ? (
        <Sheet open={warSystemOpen} onOpenChange={setWarSystemOpen}>
          <SheetContent side="bottom" className="h-[80vh] p-0">
            <WarSystem 
              groups={migratedGroups} 
              onUpdateGroups={setGroups}
            />
          </SheetContent>
        </Sheet>
      ) : (
        /* Desktop WAR System */
        <div className="border-t border-gray-700">
          <WarSystem 
            groups={migratedGroups} 
            onUpdateGroups={setGroups}
          />
        </div>
      )}

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
    </div>
  );
}
