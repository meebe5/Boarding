import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  simulateWarRound
} from 'Desktop/warEngine'; // Adjust path if needed

const CLASS_BASE_HP = {
  1: 8,
  2: 9,
  3: 10,
  4: 10,
  5: 12,
  6: 9,
};

const CLASS_ARMOR = {
  1: 1,
  2: 1,
  3: 2,
  4: 2,
  5: 3,
  6: 3,
};

const CARD_EFFECTS = {
  1: '+2 Heal [if damaged] to you or another player',
  2: '+2 Attack for your next attack',
  3: '+2 Damage',
  4: '+2 Defense',
  5: 'Enemies focus on you; stay at 1 HP if you hit 0',
  6: '+1 Defense, +1 Attack',
  7: '+3 Evasion to ally about to be attacked',
  8: 'Enemy that attacks you takes 2 damage',
  9: '+2 Armor until next turn',
  10: 'Reduce enemy Armor by -2 until next turn',
};

const getRandomName = () => {
  const names = ['Krell', 'Varn', 'Milo', 'Rusk', 'Dara', 'Siv', 'Juno', 'Nox', 'Tarn', 'Rella', 'Lex', 'Riddick', 'Hale', 'Pax', 'Nova', 'Zarn', 'Felix', 'Arlo', 'Rhea', 'Kara'];
  return names[Math.floor(Math.random() * names.length)] + ' #' + Math.floor(Math.random() * 1000);
};

const generateProfile = () => {
  const classId = Math.floor(Math.random() * 6) + 1;
  const con = Math.floor(Math.random() * 3); // 0 to 2
  const baseHp = CLASS_BASE_HP[classId] + con;
  const card1 = Math.floor(Math.random() * 10) + 1;
  let card2;
  do {
    card2 = Math.floor(Math.random() * 10) + 1;
  } while (card2 === card1);
  const initiative = Math.floor(Math.random() * 20) + 1;

  return {
    id: uuidv4(),
    name: getRandomName(),
    class: classId,
    tier: 1,
    hp: baseHp,
    maxHp: baseHp,
    con,
    armor: CLASS_ARMOR[classId],
    cards: [card1, card2],
    usedCards: [],
    initiative,
  };
};

const BoardingApp = () => {
  const [troopCount, setTroopCount] = useState(0);
  const [groups, setGroups] = useState({});
  const [activeGroup, setActiveGroup] = useState(null);

  const handleGenerate = () => {
    const newProfiles = Array.from({ length: troopCount }, generateProfile);
    const groupId = `Group ${Object.keys(groups).length + 1}`;
    const newGroups = {
      ...groups,
      [groupId]: newProfiles,
    };
    setGroups(newGroups);
    setActiveGroup(groupId);
  };

  const updateProfile = (groupId, profileId, updatedData) => {
    const updatedGroup = groups[groupId].map(p =>
      p.id === profileId ? { ...p, ...updatedData } : p
    );
    setGroups({ ...groups, [groupId]: updatedGroup });
  };

  const saveScenario = () => {
    const allSaves = JSON.parse(localStorage.getItem('boardingScenarios') || '{}');
    const saveName = prompt('Enter scenario name:');
    if (saveName) {
      allSaves[saveName] = groups;
      localStorage.setItem('boardingScenarios', JSON.stringify(allSaves));
      alert('Scenario saved.');
    }
  };

  const loadScenario = () => {
    const allSaves = JSON.parse(localStorage.getItem('boardingScenarios') || '{}');
    const names = Object.keys(allSaves);
    const selection = prompt(`Enter scenario name to load:\n${names.join(', ')}`);
    if (selection && allSaves[selection]) {
      setGroups(allSaves[selection]);
      setActiveGroup(Object.keys(allSaves[selection])[0]);
    }
  };

  const deleteGroup = (groupId) => {
    const newGroups = { ...groups };
    delete newGroups[groupId];
    setGroups(newGroups);
    if (activeGroup === groupId) {
      setActiveGroup(null);
    }
  };

  const renderHpBar = (hp, maxHp) => {
    const percentage = (hp / maxHp) * 100;
    const color = percentage > 50 ? 'bg-green-500' : 'bg-red-500';
    return (
      <div className="w-full bg-gray-200 h-3 rounded">
        <div className={`${color} h-3 rounded`} style={{ width: `${percentage}%` }}></div>
      </div>
    );
  };

  const toggleCard = (profile, card) => {
    const used = new Set(profile.usedCards);
    if (used.has(card)) used.delete(card);
    else used.add(card);
    return Array.from(used);
  };

  const resetAllCards = () => {
    const newGroups = {};
    for (const group in groups) {
      newGroups[group] = groups[group].map(p => ({ ...p, usedCards: [] }));
    }
    setGroups(newGroups);
  };

  return (
    <div className="p-4 font-mono">
      <h1 className="text-3xl mb-4">BOARDING</h1>

      <div className="flex gap-2 items-center mb-4">
        <input
          type="number"
          min="1"
          max="100"
          value={troopCount}
          onChange={e => setTroopCount(Number(e.target.value))}
          className="border px-2 py-1"
        />
        <button onClick={handleGenerate} className="bg-blue-500 text-white px-4 py-1 rounded">
          Generate
        </button>
        <button onClick={saveScenario} className="bg-green-500 text-white px-4 py-1 rounded">
          Save Scenario
        </button>
        <button onClick={loadScenario} className="bg-yellow-500 text-black px-4 py-1 rounded">
          Load Scenario
        </button>
        <button onClick={resetAllCards} className="bg-gray-700 text-white px-4 py-1 rounded">
          Reset All Cards
        </button>
      </div>

      <div className="flex gap-4">
        <div className="w-40">
          {Object.keys(groups).map(group => (
            <div key={group} className="mb-2">
              <div
                className={`p-2 border cursor-pointer flex justify-between items-center ${group === activeGroup ? 'bg-gray-200' : ''}`}
              >
                <span onClick={() => setActiveGroup(group)}>{group}</span>
                <button onClick={() => deleteGroup(group)} className="text-red-500 ml-2">✕</button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex-1">
          {activeGroup && (
            <div className="grid grid-cols-2 gap-4">
              {groups[activeGroup].map(profile => (
                <div key={profile.id} className="p-2 border rounded shadow">
                  <div>
                    <strong>Name:</strong>{' '}
                    <input
                      value={profile.name}
                      onChange={e => updateProfile(activeGroup, profile.id, { name: e.target.value })}
                      className="border px-1"
                    />
                  </div>
                  <div>Class: <input value={profile.class} onChange={e => {
                    const newClass = Number(e.target.value);
                    const newHp = CLASS_BASE_HP[newClass] + profile.con;
                    updateProfile(activeGroup, profile.id, {
                      class: newClass,
                      maxHp: newHp,
                      hp: newHp,
                      armor: CLASS_ARMOR[newClass]
                    });
                  }} className="border px-1 w-12" /></div>
                  <div>Tier: <input value={profile.tier} onChange={e => updateProfile(activeGroup, profile.id, { tier: Number(e.target.value) })} className="border px-1 w-12" /></div>
                  <div>CON: <input value={profile.con} onChange={e => updateProfile(activeGroup, profile.id, { con: Number(e.target.value), maxHp: CLASS_BASE_HP[profile.class] + Number(e.target.value), hp: CLASS_BASE_HP[profile.class] + Number(e.target.value) })} className="border px-1 w-12" /></div>
                  <div>Initiative: <input value={profile.initiative} onChange={e => updateProfile(activeGroup, profile.id, { initiative: Number(e.target.value) })} className="border px-1 w-12" /></div>
                  <div className="flex items-center gap-2">
                    <span>HP: {profile.hp}/{profile.maxHp}</span>
                    <input
                      type="number"
                      value={profile.hp}
                      onChange={e => updateProfile(activeGroup, profile.id, { hp: Number(e.target.value) })}
                      className="border px-1 w-16"
                    />
                    <input
                      type="number"
                      value={profile.maxHp}
                      onChange={e => updateProfile(activeGroup, profile.id, { maxHp: Number(e.target.value) })}
                      className="border px-1 w-16"
                    />
                  </div>
                  {renderHpBar(profile.hp, profile.maxHp)}
                  <div className="flex gap-1 items-center mt-2">
                    Armor: {'🛡️'.repeat(profile.armor)}
                  </div>
                  <div className="flex gap-2 mt-2">
                    {profile.cards.map(card => (
                      <div
                        key={card}
                        onClick={() => updateProfile(activeGroup, profile.id, { usedCards: toggleCard(profile, card) })}
                        title={CARD_EFFECTS[card]}
                        className={`w-6 h-8 flex items-center justify-center text-xs border cursor-pointer ${profile.usedCards.includes(card) ? 'bg-gray-400' : 'bg-white'}`}
                      >
                        {card}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BoardingApp;
