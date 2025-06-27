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
    <div className="w-full h-full bg-gray-800 flex flex-col">
      <div className="p-4 border-b border-gray-600">
        <h2 className="text-lg font-semibold mb-4 text-gray-400 uppercase tracking-wide">
          UNIT GROUPS
        </h2>
        
        {/* Mobile stats overview */}
        <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
          <div className="text-center p-2 bg-gray-700 rounded">
            <div className="text-blue-400 font-mono">{getTotalUnits()}</div>
            <div className="text-gray-400">TOTAL</div>
          </div>
          <div className="text-center p-2 bg-gray-700 rounded">
            <div className="text-green-400 font-mono">{getCombatReady()}</div>
            <div className="text-gray-400">READY</div>
          </div>
          <div className="text-center p-2 bg-gray-700 rounded">
            <div className="text-red-400 font-mono">{getInjured()}</div>
            <div className="text-gray-400">INJURED</div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {Object.keys(groups).map(groupId => (
          <div key={groupId}>
            <div 
              className={`group-tab p-3 border border-gray-600 rounded-lg flex justify-between items-center touch-manipulation ${
                groupId === activeGroup ? 'active bg-blue-600 border-blue-500' : 'bg-gray-800 hover:bg-gray-700'
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
                    className="text-green-500 hover:text-green-400 p-1 h-auto touch-manipulation"
                  >
                    <Check className="w-3 h-3" />
                  </Button>
                  <Button
                    onClick={cancelEdit}
                    size="sm"
                    variant="ghost"
                    className="text-gray-500 hover:text-gray-400 p-1 h-auto touch-manipulation"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <>
                  <span 
                    onClick={() => onGroupSelect(groupId)}
                    className="font-medium flex-1 cursor-pointer text-sm md:text-base"
                  >
                    {groupId}
                  </span>
                  <div className="flex items-center gap-1 ml-2">
                    <span className="text-xs text-gray-400 min-w-0 mr-2">
                      {groups[groupId].length} units
                    </span>
                    <Button
                      onClick={() => startEdit(groupId)}
                      size="sm"
                      variant="ghost"
                      className="text-gray-400 hover:text-blue-400 p-1 h-auto touch-manipulation"
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button
                      onClick={() => onGroupDelete(groupId)}
                      size="sm"
                      variant="ghost"
                      className="text-gray-400 hover:text-red-400 p-1 h-auto touch-manipulation"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </>
              )}
            </div>
            
            {/* Group member quick stats */}
            {groupId === activeGroup && groups[groupId] && (
              <div className="mt-2 p-2 bg-gray-700 rounded text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    Alive: <span className="text-green-400">
                      {groups[groupId].filter(c => c.hp > 0).length}
                    </span>
                  </div>
                  <div>
                    KIA: <span className="text-red-400">
                      {groups[groupId].filter(c => c.hp === 0).length}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        
        {Object.keys(groups).length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <p className="text-sm">No groups created yet</p>
            <p className="text-xs mt-1">Generate characters to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}