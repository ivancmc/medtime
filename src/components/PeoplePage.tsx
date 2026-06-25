import React, { useState, useEffect } from 'react';
import { db } from '../lib/db';
import { Person } from '../types';
import { UserPlus, User as UserIcon } from 'lucide-react';

export function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [newName, setNewName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    loadPeople();
  }, []);

  async function loadPeople() {
    const data = await db.people.getAll();
    data.sort((a, b) => b.createdAt - a.createdAt);
    setPeople(data);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;

    await db.people.add({
      name: newName.trim(),
      createdAt: Date.now(),
    });
    setNewName('');
    setIsAdding(false);
    loadPeople();
  }

  return (
    <div className="p-4 max-w-md mx-auto w-full pb-24">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Pessoas</h1>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="p-2 bg-app-primary-bg text-app-primary rounded-full hover:opacity-80 transition shadow-sm"
        >
          <UserPlus size={20} />
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="bg-app-surface p-4 rounded-2xl shadow-sm mb-4 border border-app-border transition-colors">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome da pessoa..."
            className="w-full bg-app-input border border-app-border rounded-xl px-4 py-3 mb-3 focus:outline-none focus:ring-2 focus:ring-app-primary transition-colors text-app-text"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 text-sm text-app-muted font-medium hover:text-app-text transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-app-primary-solid text-app-primary-solid-text rounded-lg font-medium shadow-sm disabled:opacity-50 transition-opacity"
              disabled={!newName.trim()}
            >
              Salvar
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {people.length === 0 && !isAdding && (
          <div className="text-center py-12 text-app-muted">
            <UserIcon size={48} className="mx-auto mb-3 opacity-20" />
            <p>Nenhuma pessoa cadastrada.</p>
          </div>
        )}
        {people.map((person) => (
          <div key={person.id} className="bg-app-surface p-4 rounded-2xl shadow-sm border border-app-border flex items-center gap-4 transition-colors">
            <div className="w-10 h-10 rounded-full bg-app-primary-bg text-app-primary flex items-center justify-center font-bold text-lg">
              {person.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-app-text">{person.name}</h3>
              <p className="text-xs text-app-muted">
                Adicionado em {new Date(person.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
