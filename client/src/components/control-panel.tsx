import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Character } from '@shared/schema';

interface ControlPanelProps {
  onGenerate: (count: number) => void;
  onSaveScenario: () => void;
  onLoadScenario: () => void;
  onResetAllCards: () => void;
}

export function ControlPanel({ 
  onGenerate, 
  onSaveScenario, 
  onLoadScenario, 
  onResetAllCards 
}: ControlPanelProps) {
  const [troopCount, setTroopCount] = useState(4);

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 mb-6">
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <label className="text-gray-400 text-sm uppercase tracking-wide">TROOP COUNT:</label>
          <Input
            type="number"
            min="1"
            max="100"
            value={troopCount}
            onChange={(e) => setTroopCount(Number(e.target.value))}
            className="tactical-input w-20 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <Button 
          onClick={() => onGenerate(troopCount)}
          className="action-button bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
        >
          GENERATE
        </Button>
        
        <Button 
          onClick={onSaveScenario}
          className="action-button bg-green-600 hover:bg-green-700 text-white px-6 py-2"
        >
          SAVE SCENARIO
        </Button>
        
        <Button 
          onClick={onLoadScenario}
          className="action-button bg-yellow-600 hover:bg-yellow-700 text-black px-6 py-2"
        >
          LOAD SCENARIO
        </Button>
        
        <Button 
          onClick={onResetAllCards}
          className="action-button bg-gray-600 hover:bg-gray-700 text-white px-6 py-2"
        >
          RESET CARDS
        </Button>
      </div>
    </div>
  );
}
