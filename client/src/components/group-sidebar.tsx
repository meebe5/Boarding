import type { Character } from '@shared/schema';
import { Button } from '@/components/ui/button';

interface GroupSidebarProps {
  groups: Record<string, Character[]>;
  activeGroup: string | null;
  onGroupSelect: (groupId: string) => void;
  onGroupDelete: (groupId: string) => void;
}

export function GroupSidebar({ groups, activeGroup, onGroupSelect, onGroupDelete }: GroupSidebarProps) {
  const getTotalUnits = () => {
    return Object.values(groups).reduce((total, group) => total + group.length, 0);
  };

  const getCombatReady = () => {
    return Object.values(groups).reduce((total, group) => 
      total + group.filter(char => char.hp > 0).length, 0
    );
  };

  const getInjured = () => {
    return Object.values(groups).reduce((total, group) => 
      total + group.filter(char => char.hp === 0 || char.hp < char.maxHp / 2).length, 0
    );
  };

  return (
    <div className="w-64 flex-shrink-0">
      <h2 className="text-lg font-semibold mb-4 text-gray-400 uppercase tracking-wide">
        UNIT GROUPS
      </h2>
      
      {Object.keys(groups).map(groupId => (
        <div key={groupId} className="mb-3">
          <div 
            className={`group-tab p-3 border border-gray-600 rounded cursor-pointer flex justify-between items-center ${
              groupId === activeGroup ? 'active' : 'bg-gray-800'
            }`}
          >
            <span 
              onClick={() => onGroupSelect(groupId)}
              className="font-medium flex-1"
            >
              {groupId}
            </span>
            <Button
              onClick={() => onGroupDelete(groupId)}
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-400 p-1 h-auto"
            >
              ×
            </Button>
          </div>
        </div>
      ))}
      
      {/* Group Statistics Summary */}
      <div className="mt-6 p-4 bg-gray-800 border border-gray-600 rounded">
        <h3 className="text-sm font-semibold mb-3 text-gray-400 uppercase">SQUAD STATUS</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Total Units:</span>
            <span className="text-green-500">{getTotalUnits()}</span>
          </div>
          <div className="flex justify-between">
            <span>Combat Ready:</span>
            <span className="text-green-500">{getCombatReady()}</span>
          </div>
          <div className="flex justify-between">
            <span>Injured:</span>
            <span className="text-yellow-500">{getInjured()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
