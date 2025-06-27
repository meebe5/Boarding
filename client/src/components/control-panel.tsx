import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Character } from '@shared/schema';

interface ControlPanelProps {
  onGenerate: (count: number) => void;
  onSaveScenario: () => void;
  onLoadScenario: () => void;
  onResetAllCards: () => void;
  onAddBlank: () => void;
  activeGroup: string | null;
}

export function ControlPanel({ 
  onGenerate, 
  onSaveScenario, 
  onLoadScenario, 
  onResetAllCards,
  onAddBlank,
  activeGroup
}: ControlPanelProps) {
  const [troopCount, setTroopCount] = useState(4);

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 md:p-6">
      {/* Mobile-first layout */}
      <div className="space-y-4 md:space-y-0 md:flex md:flex-wrap md:gap-4 md:items-center">
        {/* Troop count input - full width on mobile */}
        <div className="flex items-center justify-between md:justify-start gap-3">
          <label className="text-gray-400 text-xs md:text-sm uppercase tracking-wide flex-shrink-0">
            TROOP COUNT:
          </label>
          <Input
            type="number"
            min="1"
            max="100"
            value={troopCount}
            onChange={(e) => setTroopCount(Number(e.target.value))}
            className="tactical-input w-16 md:w-20 text-center focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
          />
        </div>
        
        {/* Primary actions - stack on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-none md:flex gap-3 md:gap-4">
          <Button 
            onClick={() => onGenerate(troopCount)}
            className="action-button bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-4 py-3 md:px-6 md:py-2 text-sm md:text-base touch-manipulation"
          >
            GENERATE {troopCount} PROFILE{troopCount !== 1 ? 'S' : ''}
          </Button>
          
          <Button 
            onClick={onAddBlank} 
            disabled={!activeGroup}
            className="action-button bg-green-600 hover:bg-green-700 active:bg-green-800 text-white px-4 py-3 md:px-6 md:py-2 disabled:opacity-50 text-sm md:text-base touch-manipulation"
          >
            + CREATE BLANK PROFILE
          </Button>
        </div>
        
        {/* Secondary actions - horizontal scroll on mobile */}
        <div className="flex gap-3 overflow-x-auto pb-2 md:pb-0 md:flex-wrap">
          <Button 
            onClick={onSaveScenario}
            className="action-button bg-green-600 hover:bg-green-700 active:bg-green-800 text-white px-4 py-2 md:px-6 whitespace-nowrap text-sm md:text-base touch-manipulation"
          >
            SAVE SCENARIO
          </Button>
          
          <Button 
            onClick={onLoadScenario}
            className="action-button bg-yellow-600 hover:bg-yellow-700 active:bg-yellow-800 text-black px-4 py-2 md:px-6 whitespace-nowrap text-sm md:text-base touch-manipulation"
          >
            LOAD SCENARIO
          </Button>
          
          <Button 
            onClick={onResetAllCards}
            className="action-button bg-gray-600 hover:bg-gray-700 active:bg-gray-800 text-white px-4 py-2 md:px-6 whitespace-nowrap text-sm md:text-base touch-manipulation"
          >
            RESET CARDS
          </Button>
        </div>
      </div>
    </div>
  );
}