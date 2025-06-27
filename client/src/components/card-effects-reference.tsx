import { CARD_EFFECTS, CARD_DECKS } from '@/lib/character-generator';

export function CardEffectsReference() {
  const renderCardSection = (title: string, cards: number[], bgColor: string) => (
    <div className="space-y-2">
      <h4 className={`text-sm font-semibold uppercase tracking-wide ${bgColor} px-2 py-1 rounded`}>
        {title}
      </h4>
      <div className="space-y-1">
        {cards.map(cardId => (
          <div key={cardId} className="flex items-start gap-2 text-xs">
            <div className="w-5 h-5 flex items-center justify-center border border-gray-600 rounded bg-white text-black font-mono flex-shrink-0 mt-0.5">
              {cardId}
            </div>
            <span className="text-gray-300 leading-tight">{CARD_EFFECTS[cardId as keyof typeof CARD_EFFECTS]}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="mt-8 bg-gray-800 border border-gray-600 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-3 text-gray-400 uppercase tracking-wide">
        COMBAT CARD REFERENCE
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {renderCardSection("Ranged", CARD_DECKS.RANGED, "bg-blue-900 text-blue-200")}
        {renderCardSection("Melee", CARD_DECKS.MELEE, "bg-red-900 text-red-200")}
        {renderCardSection("Support", CARD_DECKS.SUPPORT, "bg-green-900 text-green-200")}
      </div>
    </div>
  );
}