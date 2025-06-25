import { useState } from 'react';
import type { Character } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Edit2, Check, X } from 'lucide-react';

interface GroupSidebarProps {
  groups: Record<string, Character[]>;
  activeGroup: string | null;
  onGroupSelect: (groupId: string) => void;
  onGroupDelete: (groupId: string) => void;
  onGroupRename: (oldName: string, newName: string) => void;
}

export function GroupSidebar({ groups, activeGroup, onGroupSelect, onGroupDelete, onGroupRename }: GroupSidebarProps) {
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
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

  const startEdit = (groupId: string) => {
    setEditingGroup(groupId);
    setEditName(groupId);
  };

  const saveEdit = () => {
    if (editingGroup && editName.trim() && editName !== editingGroup) {
      onGroupRename(editingGroup, editName.trim());
    }
    setEditingGroup(null);
    setEditName('');
  };

  const cancelEdit = () => {
    setEditingGroup(null);
    setEditName('');
  };

  return (
    <div className="w-64 flex-shrink-0">
      <h2 className="text-lg font-semibold mb-4 text-gray-400 uppercase tracking-wide">
        UNIT GROUPS
      </h2>
      
      {Object.keys(groups).map(groupId => (
        <div key={groupId} className="mb-3">
          <div 
            className={`group-tab p-3 border border-gray-600 rounded flex justify-between items-center ${
              groupId === activeGroup ? 'active' : 'bg-gray-800'
            }`}
          >
            {editingGroup === groupId ? (
              <div className="flex items-center gap-2 flex-1">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 h-8 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit();
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  autoFocus
                />
                <Button
                  onClick={saveEdit}
                  size="sm"
                  variant="ghost"
                  className="text-green-500 hover:text-green-400 p-1 h-auto"
                >
                  <Check className="w-3 h-3" />
                </Button>
                <Button
                  onClick={cancelEdit}
                  size="sm"
                  variant="ghost"
                  className="text-gray-500 hover:text-gray-400 p-1 h-auto"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <>
                <span 
                  onClick={() => onGroupSelect(groupId)}
                  className="font-medium flex-1 cursor-pointer"
                >
                  {groupId}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    onClick={() => startEdit(groupId)}
                    variant="ghost"
                    size="sm"
                    className="text-blue-500 hover:text-blue-400 p-1 h-auto"
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button
                    onClick={() => onGroupDelete(groupId)}
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-400 p-1 h-auto"
                  >
                    ×
                  </Button>
                </div>
              </>
            )}
          </div>
          <div className="text-xs text-gray-400 mt-1 px-3">
            {groups[groupId].filter(c => c.isAlive).length} / {groups[groupId].length} alive
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
