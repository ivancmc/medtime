import localforage from 'localforage';

class Collection<T extends { id: string }> {
  constructor(private name: string) {}

  async getAll(): Promise<T[]> {
    const data = await localforage.getItem<T[]>(this.name);
    return data || [];
  }

  async getById(id: string): Promise<T | null> {
    const items = await this.getAll();
    return items.find((item) => item.id === id) || null;
  }

  async add(item: Omit<T, 'id'>): Promise<T> {
    const items = await this.getAll();
    const newItem = { ...item, id: crypto.randomUUID() } as unknown as T;
    items.push(newItem);
    await localforage.setItem(this.name, items);
    return newItem;
  }

  async update(id: string, updates: Partial<T>): Promise<T | null> {
    const items = await this.getAll();
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) return null;
    items[index] = { ...items[index], ...updates };
    await localforage.setItem(this.name, items);
    return items[index];
  }

  async delete(id: string): Promise<void> {
    const items = await this.getAll();
    const filtered = items.filter((item) => item.id !== id);
    await localforage.setItem(this.name, filtered);
  }
}

import { Person, Medication, Dose } from '../types';

export const db = {
  people: new Collection<Person>('people'),
  medications: new Collection<Medication>('medications'),
  doses: new Collection<Dose>('doses'),
};
