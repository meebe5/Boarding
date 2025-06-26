import { useState } from 'react';
import type { Character } from '@shared/schema';
import { CARD_EFFECTS, CLASS_NAMES, CLASS_ROLES, CLASS_ROLE_TYPE, updateCharacterClass, drawCards } from '@/lib/character-generator';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Shield, Heart, Zap, Skull, Target, Wrench, Plus, Minus } from 'lucide-react';

interface CharacterCardProps {
  character: Character;
  onUpdate: (updatedCharacter: Character) => void;
}

export function CharacterCard({ character, onUpdate }: CharacterCardProps) {
  const [hpBarWidth, setHpBarWidth] = useState((character.hp / character.maxHp) * 100);

  const handleUpdate = (updates: Partial<Character>) => {
    const updatedCharacter = { ...character, ...updates };
    if (updates.hp !== undefined || updates.maxHp !== undefined) {
      updatedCharacter.isAlive = updatedCharacter.hp > 0;
      setHpBarWidth((updatedCharacter.hp / updatedCharacter.maxHp) * 100);
    }
    onUpdate(updatedCharacter);
  };

  const addCard = () => {
    const newCards = drawCards('MIXED');
    const availableCard = newCards.find(card => !character.cards.includes(card)) || newCards[0];
    handleUpdate({ 
      cards: [...character.cards, availableCard] 
    });
  };

  const removeCard = (cardId: number) => {
    handleUpdate({ 
      cards: character.cards.filter(c => c !== cardId) 
    });
  };

  const getHpBarColor = (percentage: number): string => {
    if (percentage === 0) return 'bg-gray-600';
    return percentage > 50 ? 'bg-green-500' : 'bg-red-500';
  };

  return (
    <TooltipProvider>
      <div className={`character-card rounded-lg p-5 relative ${!character.isAlive ? 'opacity-50 bg-red-900/20' : ''}`}>
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
          
          {/* Status Icons */}
          <div className="flex gap-1">
            {!character.isAlive && (
              <Badge variant="destructive" className="p-1">
                <Skull className="w-3 h-3" />
              </Badge>
            )}
            {character.activeEffects && character.activeEffects.length > 0 && (
              <div className="flex gap-1">
                {character.activeEffects.map((effect, index) => (
                  <Tooltip key={index}>
                    <TooltipTrigger asChild>
                      <Badge variant="secondary" className="p-1 text-xs">
                        <Zap className="w-3 h-3" />
                        {effect.cardId}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-sm">
                        {(() => {
                          const cardEffect = CARD_EFFECTS[effect.cardId as keyof typeof CARD_EFFECTS];
                          if (!cardEffect) return 'Effect not found';
                          return typeof cardEffect === 'string' ? cardEffect : 
                                 (cardEffect.description || cardEffect.name || 'Unknown Effect');
                        })()}
                      </p>
                      <p className="text-xs text-gray-400">
                        From: {effect.sourceProfileName} ({effect.turnsRemaining} turns left)
                      </p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Character Information Section */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs text-gray-400 uppercase block mb-1">CLASS</label>
            <select
              value={character.class}
              onChange={(e) => handleUpdate(updateCharacterClass(character, parseInt(e.target.value)))}
              className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
            >
              <option value={1}>Shooter (Ranged Damage)</option>
              <option value={2}>Engineer (Ranged Utility)</option>
              <option value={3}>Scavenger (Ranged Support)</option>
              <option value={4}>Tinkerer (Melee Support)</option>
              <option value={5}>Brute (Melee Damage)</option>
              <option value={6}>Breaker (Melee Utility)</option>
            </select>
            <div className="text-xs text-blue-400 mt-1">
              {CLASS_NAMES[character.class as keyof typeof CLASS_NAMES]} - {CLASS_ROLES[character.class as keyof typeof CLASS_ROLES]}
            </div>
            <div className="text-xs text-purple-400 mt-1">
              Draws from: {CLASS_ROLE_TYPE[character.class as keyof typeof CLASS_ROLE_TYPE]} deck
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase block mb-1">TIER</label>
            <div className="flex gap-1 items-center">
              <span className="text-orange-500 text-lg">⭐</span>
              <span className="text-white font-mono">{character.tier}</span>
            </div>
          </div>
        </div>

        {/* HP Section */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs text-gray-400 uppercase">HEALTH POINTS</label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={character.hp}
                onChange={(e) => handleUpdate({ hp: Math.max(0, parseInt(e.target.value) || 0) })}
                className="w-16 h-6 text-xs text-center bg-gray-800 border-gray-600"
                min="0"
              />
              <span className="text-gray-500">/</span>
              <Input
                type="number"
                value={character.maxHp}
                onChange={(e) => handleUpdate({ maxHp: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-16 h-6 text-xs text-center bg-gray-800 border-gray-600"
                min="1"
              />
              {character.tempHp && character.tempHp > 0 && (
                <Badge variant="secondary" className="text-xs">
                  +{character.tempHp} TEMP
                </Badge>
              )}
            </div>
          </div>
          <div className="w-full bg-gray-700 h-4 rounded relative overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${getHpBarColor(hpBarWidth)}`}
              style={{ width: `${hpBarWidth}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-white drop-shadow">
                {character.hp}/{character.maxHp}
              </span>
            </div>
          </div>
        </div>

        {/* Armor and Equipment */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs text-gray-400 uppercase block mb-1">ARMOR PLATES</label>
            <div className="flex gap-2 items-center">
              <div className="flex items-center gap-1">
                <Shield className="w-4 h-4 text-blue-500" />
                <Input
                  type="number"
                  value={character.armorPlates}
                  onChange={(e) => handleUpdate({ armorPlates: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="w-16 h-6 text-xs text-center bg-gray-800 border-gray-600"
                  min="0"
                />
                <span className="text-gray-500">/</span>
                <span className="text-white font-mono">{character.maxArmorPlates}</span>
              </div>
              {character.tempArmorPlates && character.tempArmorPlates > 0 && (
                <Badge variant="secondary" className="text-xs">
                  +{character.tempArmorPlates} TEMP
                </Badge>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase block mb-1">JUNK TOKENS</label>
            <div className="flex gap-1 items-center">
              <Wrench className="w-4 h-4 text-orange-500" />
              <Input
                type="number"
                value={character.junkTokens}
                onChange={(e) => handleUpdate({ junkTokens: Math.max(0, parseInt(e.target.value) || 0) })}
                className="w-16 h-6 text-xs text-center bg-gray-800 border-gray-600"
                min="0"
              />
            </div>
          </div>
        </div>

        {/* Ranged Weapon Info */}
        {character.hasRangedWeapon && (
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs text-gray-400 uppercase block mb-1">BULLETS</label>
              <div className="flex gap-1 items-center">
                <Target className="w-4 h-4 text-red-500" />
                <Input
                  type="number"
                  value={character.bulletTokens}
                  onChange={(e) => handleUpdate({ bulletTokens: Math.max(0, Math.min(4, parseInt(e.target.value) || 0)) })}
                  className="w-16 h-6 text-xs text-center bg-gray-800 border-gray-600"
                  min="0"
                  max="4"
                />
                <span className="text-gray-500">/4</span>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 uppercase block mb-1">GUN POINTS</label>
              <div className="flex gap-1 items-center mb-1">
                <span className="text-red-500 text-lg">🔫</span>
                <Input
                  type="number"
                  value={character.gunPoints}
                  onChange={(e) => handleUpdate({ gunPoints: Math.max(0, Math.min(4, parseInt(e.target.value) || 0)) })}
                  className="w-16 h-6 text-xs text-center bg-gray-800 border-gray-600"
                  min="0"
                  max="4"
                />
                <span className="text-gray-500">/4</span>
              </div>
              {/* Gun Points Health Bar */}
              <div className="w-full bg-gray-700 h-2 rounded relative overflow-hidden">
                <div 
                  className="h-full transition-all duration-300 bg-red-500"
                  style={{ width: `${(character.gunPoints / 4) * 100}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-white drop-shadow">
                    {character.gunPoints}/4
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cards Section */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs text-gray-400 uppercase">COMBAT CARDS</label>
            <Button
              onClick={addCard}
              size="sm"
              variant="outline"
              className="h-6 px-2 text-xs"
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {character.cards.map((cardId, index) => (
              <TooltipProvider key={index}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="card-slot p-2 border border-gray-600 rounded bg-gray-800 relative group">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-bold text-blue-400 text-xs">CARD {cardId}</div>
                          <div className="text-gray-400 text-xs mt-1">
                            {CARD_EFFECTS[cardId as keyof typeof CARD_EFFECTS] || `Card ${cardId}`}
                          </div>
                        </div>
                        <Button
                          onClick={() => removeCard(cardId)}
                          size="sm"
                          variant="ghost"
                          className="h-4 w-4 p-0 text-red-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      <strong>Card {cardId}:</strong><br />
                      {(() => {
                        const effect = CARD_EFFECTS[cardId as keyof typeof CARD_EFFECTS];
                        if (!effect) return 'Effect not found';
                        return typeof effect === 'string' ? effect : 
                               (effect.description || effect.name || 'Unknown Effect');
                      })()}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
            
            {character.cards.length === 0 && (
              <div className="text-center text-gray-500 text-xs py-4 border border-dashed border-gray-600 rounded">
                No cards drawn
              </div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}