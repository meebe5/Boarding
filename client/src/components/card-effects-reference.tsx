import { CARD_EFFECTS } from '@/lib/character-generator';

export function CardEffectsReference() {
  return (
    <div className="mt-8 bg-gray-800 border border-gray-600 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-400 uppercase tracking-wide">
        COMBAT CARD REFERENCE
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        {Object.entries(CARD_EFFECTS).map(([cardId, effect]) => (
          <div key={cardId} className="flex items-center gap-3">
            <div className="w-6 h-8 flex items-center justify-center text-xs border border-gray-600 rounded bg-white text-black font-mono">
              {cardId}
            </div>
            <span className="text-gray-400">{effect}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
