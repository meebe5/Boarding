import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { Character, Scenario } from '@shared/schema';
import { generateProfile } from '@/lib/character-generator';
import { CharacterCard } from '@/components/character-card';
import { GroupSidebar } from '@/components/group-sidebar';
import { ControlPanel } from '@/components/control-panel';
import { CardEffectsReference } from '@/components/card-effects-reference';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function BoardingPage() {
  const [groups, setGroups] = useState<Record<string, Character[]>>({});
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [currentScenarioId, setCurrentScenarioId] = useState<number | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Load scenarios only once when component mounts
  const loadScenariosFromDb = async () => {
    try {
      setIsLoading(true);
      const data = await apiRequest<Scenario[]>({ endpoint: '/api/scenarios' });
      setScenarios(data);
    } catch (error) {
      console.error('Failed to load scenarios:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load scenarios on component mount
  useEffect(() => {
    loadScenariosFromDb();
  }, []);

  // Create scenario mutation
  const createScenarioMutation = useMutation({
    mutationFn: (data: { name: string; groups: Record<string, Character[]> }) =>
      apiRequest<Scenario>({
        endpoint: '/api/scenarios',
        method: 'POST',
        body: data,
      }),
    onSuccess: (newScenario) => {
      setScenarios(prev => [...prev, newScenario]);
      setCurrentScenarioId(newScenario.id);
      toast({
        title: "Success",
        description: "Scenario saved to database",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save scenario",
        variant: "destructive",
      });
    },
  });

  // Update scenario mutation
  const updateScenarioMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; groups?: Record<string, Character[]> } }) =>
      apiRequest<Scenario>({
        endpoint: `/api/scenarios/${id}`,
        method: 'PUT',
        body: data,
      }),
    onSuccess: (updatedScenario) => {
      setScenarios(prev => prev.map(s => s.id === updatedScenario.id ? updatedScenario : s));
      toast({
        title: "Success",
        description: "Scenario updated",
      });
    },
  });

  const handleGenerate = (troopCount: number) => {
    const newProfiles = Array.from({ length: troopCount }, generateProfile);
    const groupId = `Group ${Object.keys(groups).length + 1}`;
    const newGroups = {
      ...groups,
      [groupId]: newProfiles,
    };
    setGroups(newGroups);
    setActiveGroup(groupId);
    // Clear current scenario ID when generating new data
    setCurrentScenarioId(null);
  };

  const updateProfile = (profileId: string, updatedData: Character) => {
    if (!activeGroup) return;
    
    const updatedGroup = groups[activeGroup].map(p =>
      p.id === profileId ? updatedData : p
    );
    setGroups({ ...groups, [activeGroup]: updatedGroup });
  };

  const saveScenario = () => {
    if (Object.keys(groups).length === 0) {
      toast({
        title: "No data to save",
        description: "Generate some characters first",
        variant: "destructive",
      });
      return;
    }
    
    const saveName = prompt('Enter scenario name:');
    if (saveName) {
      if (currentScenarioId) {
        // Update existing scenario
        updateScenarioMutation.mutate({
          id: currentScenarioId,
          data: { name: saveName, groups },
        });
      } else {
        // Create new scenario
        createScenarioMutation.mutate({ name: saveName, groups });
      }
    }
  };

  const loadScenario = async () => {
    // Refresh scenarios first
    await loadScenariosFromDb();
    
    if (scenarios.length === 0) {
      toast({
        title: "No scenarios",
        description: "No saved scenarios found in database",
      });
      return;
    }
    const names = scenarios.map(s => `${s.id}: ${s.name}`);
    const selection = prompt(`Enter scenario ID to load:\n${names.join('\n')}`);
    if (selection) {
      const scenarioId = parseInt(selection.split(':')[0]);
      const scenario = scenarios.find(s => s.id === scenarioId);
      if (scenario) {
        setGroups(scenario.groups);
        setActiveGroup(Object.keys(scenario.groups)[0] || null);
        setCurrentScenarioId(scenario.id);
        toast({
          title: "Success",
          description: `Loaded scenario: ${scenario.name}`,
        });
      }
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
