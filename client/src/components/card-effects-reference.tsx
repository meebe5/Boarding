import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CARD_EFFECTS } from "@/lib/character-generator";

export function CardEffectsReference() {
  // Group cards by deck type
  const cardsByDeck = Object.entries(CARD_EFFECTS).reduce((acc, [cardId, effect]) => {
    if (!acc[effect.deck]) {
      acc[effect.deck] = [];
    }
    acc[effect.deck].push({ id: cardId, ...effect });
    return acc;
  }, {} as Record<string, Array<{ id: string; name: string; description: string; effect?: string; deck: string }>>);

  const deckStyles = {
    MELEE: "border-red-500 bg-red-50 dark:bg-red-900/20",
    RANGED: "border-blue-500 bg-blue-50 dark:bg-blue-900/20", 
    SUPPORT: "border-green-500 bg-green-50 dark:bg-green-900/20"
  };

  const deckIcons = {
    MELEE: "⚔️",
    RANGED: "🏹", 
    SUPPORT: "🛡️"
  };

  return (
    <div className="w-full max-w-6xl mx-auto mt-8">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white">Combat Card Decks</h2>
        <p className="text-gray-400">Three specialized decks for tactical combat</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(cardsByDeck).map(([deckType, cards]) => (
          <Card key={deckType} className={`${deckStyles[deckType as keyof typeof deckStyles]} border-2`}>
            <CardHeader className="text-center">
              <CardTitle className="text-xl font-bold flex items-center justify-center gap-2">
                <span className="text-2xl">{deckIcons[deckType as keyof typeof deckIcons]}</span>
                {deckType} DECK
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-300">
                {deckType === 'MELEE' && 'Close combat and aggressive tactics'}
                {deckType === 'RANGED' && 'Shooting and precision attacks'}
                {deckType === 'SUPPORT' && 'Healing, repair, and assistance'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {cards.map((card) => (
                  <div key={card.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 border shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm">Card {card.id}</span>
                      <Badge variant="secondary" className="text-xs">
                        {card.name}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mb-1">
                      {card.description}
                    </p>
                    {card.effect && (
                      <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded text-xs">
                        <strong>Effect:</strong> {card.effect}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
