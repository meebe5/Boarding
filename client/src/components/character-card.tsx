import { useState } from 'react';
import type { Character } from '@shared/schema';
import { CARD_EFFECTS, updateCharacterClass, updateCharacterCon } from '@/lib/character-generator';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CharacterCardProps {
  character: Character;
  onUpdate: (updatedCharacter: Character) => void;
}

export function CharacterCard({ character, onUpdate }: CharacterCardProps) {
  const [hpBarWidth, setHpBarWidth] = useState((character.hp / character.maxHp) * 100);

  const handleUpdate = (updates: Partial<Character>) => {
    const updatedCharacter = { ...character, ...updates };
    if (updates.hp !== undefined || updates.maxHp !== undefined) {
      setHpBarWidth((updatedCharacter.hp / updatedCharacter.maxHp) * 100);
    }
    onUpdate(updatedCharacter);
  };

  const handleClassChange = (newClass: number) => {
    const updatedCharacter = updateCharacterClass(character, newClass);
    setHpBarWidth((updatedCharacter.hp / updatedCharacter.maxHp) * 100);
    onUpdate(updatedCharacter);
  };

  const handleConChange = (newCon: number) => {
    const updatedCharacter = updateCharacterCon(character, newCon);
    setHpBarWidth((updatedCharacter.hp / updatedCharacter.maxHp) * 100);
    onUpdate(updatedCharacter);
  };

  const toggleCard = (card: number) => {
    const used = new Set(character.usedCards);
    if (used.has(card)) {
      used.delete(card);
    } else {
      used.add(card);
    }
    handleUpdate({ usedCards: Array.from(used) });
  };

  const getHpBarColor = () => {
    const percentage = (character.hp / character.maxHp) * 100;
    if (percentage === 0) return 'bg-gray-600';
    return percentage > 50 ? 'bg-green-500' : 'bg-red-500';
  };

  return (
    <TooltipProvider>
      <div className="character-card rounded-lg p-5">
        {/* Character Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <Input
              value={character.name}
              onChange={(e) => handleUpdate({ name: e.target.value })}
              className="bg-transparent text-lg font-semibold border-b border-transparent hover:border-blue-500 focus:border-blue-500 focus:outline-none w-full"
            />
            <div className="text-xs text-gray-400 mt-1 uppercase tracking-wide">
              OPERATIVE ID: <span>{character.id.substring(0, 8).toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center">
            <label className="text-xs text-gray-400 uppercase block mb-1">CLASS</label>
            <Input
              type="number"
              min="1"
              max="6"
              value={character.class}
              onChange={(e) => handleClassChange(Number(e.target.value))}
              className="tactical-input w-full text-center py-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="text-center">
            <label className="text-xs text-gray-400 uppercase block mb-1">TIER</label>
            <Input
              type="number"
              value={character.tier}
              onChange={(e) => handleUpdate({ tier: Number(e.target.value) })}
              className="tactical-input w-full text-center py-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="text-center">
            <label className="text-xs text-gray-400 uppercase block mb-1">CON</label>
            <Input
              type="number"
              min="0"
              max="2"
              value={character.con}
              onChange={(e) => handleConChange(Number(e.target.value))}
              className="tactical-input w-full text-center py-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Health Section */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs text-gray-400 uppercase">HEALTH POINTS</label>
            <span className="text-sm font-mono">
              <Input
                type="number"
                min="0"
                value={character.hp}
                onChange={(e) => handleUpdate({ hp: Number(e.target.value) })}
                className="w-12 text-center bg-transparent border-b border-gray-600 focus:border-blue-500 focus:outline-none inline"
              />
              /
              <Input
                type="number"
                min="1"
                value={character.maxHp}
                onChange={(e) => handleUpdate({ maxHp: Number(e.target.value) })}
                className="w-12 text-center bg-transparent border-b border-gray-600 focus:border-blue-500 focus:outline-none inline"
              />
            </span>
          </div>
          <div className="w-full bg-gray-700 h-3 rounded-full overflow-hidden">
            <div 
              className={`hp-bar ${getHpBarColor()} h-full rounded-full`}
              style={{ width: `${hpBarWidth}%` }}
            />
          </div>
        </div>

        {/* Armor and Initiative */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <label className="text-xs text-gray-400 uppercase block mb-1">ARMOR</label>
            <div className="flex gap-1">
              {Array.from({ length: character.armor }, (_, i) => (
                <span key={i} className="text-blue-500">🛡️</span>
              ))}
            </div>
          </div>
          <div className="text-right">
            <label className="text-xs text-gray-400 uppercase block mb-1">INITIATIVE</label>
            <Input
              type="number"
              min="1"
              max="20"
              value={character.initiative}
              onChange={(e) => handleUpdate({ initiative: Number(e.target.value) })}
              className="tactical-input w-16 text-center py-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Combat Cards */}
        <div className="border-t border-gray-600 pt-4">
          <label className="text-xs text-gray-400 uppercase block mb-2">COMBAT CARDS</label>
          <div className="flex gap-2">
            {character.cards.map(card => (
              <Tooltip key={card}>
                <TooltipTrigger asChild>
                  <div
                    onClick={() => toggleCard(card)}
                    className={`card-effect relative w-8 h-10 flex items-center justify-center text-sm border border-gray-600 rounded cursor-pointer transition-all duration-200 hover:border-blue-500 ${
                      character.usedCards.includes(card) 
                        ? 'bg-gray-400 text-black' 
                        : 'bg-white text-black'
                    }`}
                  >
                    {card}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-sm">{CARD_EFFECTS[card as keyof typeof CARD_EFFECTS]}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
