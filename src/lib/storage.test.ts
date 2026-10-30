import {describe, expect, it} from 'vitest';
import {DEFAULT_DATABASE, DEFAULT_PREFERENCES, migratePreferences, parseDatabase, sanitizeBackupItems, serializeDatabase} from './storage';

describe('parseDatabase', () => {
 it('falls back to an empty library for missing or broken data', () => {
  expect(parseDatabase(null)).toEqual(DEFAULT_DATABASE);
  expect(parseDatabase('not json')).toEqual(DEFAULT_DATABASE);
  expect(parseDatabase('{"items":"nope"}')).toEqual(DEFAULT_DATABASE);
 });
 it('drops malformed items and fixes unknown categories', () => {
  const db = parseDatabase(JSON.stringify({items: [
   {id: 'a', name: 'Steam', target: 'C:\\steam.exe', category: 'Games'},
   {id: 'b', name: 'Bad'},
   null,
   {id: 'c', name: 'Odd', target: 'x', category: 'Snacks'},
  ]}));
  expect(db.items.map(x => x.id)).toEqual(['a', 'c']);
  expect(db.items[1].category).toBe('Other');
 });
 it('rejects unsafe stored file names', () => {
  const db = parseDatabase(JSON.stringify({items: [{id: 'a', name: 'A', target: 'x', cardArt: '../../evil.png', iconFile: 'icon-a-1.png'}]}));
  expect(db.items[0].cardArt).toBeUndefined();
  expect(db.items[0].iconFile).toBe('icon-a-1.png');
 });
});

describe('migratePreferences', () => {
 it('maps the old on/off motion flag to Off / Full', () => {
  expect(migratePreferences({motion: false}).motionLevel).toBe('off');
  expect(migratePreferences({motion: true}).motionLevel).toBe('full');
  expect(migratePreferences({}).motionLevel).toBe('full');
 });
 it('keeps an existing motion level and fills missing keys with defaults', () => {
  const p = migratePreferences({motionLevel: 'subtle', accent: '#ffffff'});
  expect(p.motionLevel).toBe('subtle');
  expect(p.accent).toBe('#ffffff');
  expect(p.radius).toBe(DEFAULT_PREFERENCES.radius);
 });
 it('treats non-objects as empty', () => {
  expect(migratePreferences('junk')).toEqual(DEFAULT_PREFERENCES);
 });
});

describe('serializeDatabase', () => {
 it('keeps the legacy motion flag in sync for older versions', () => {
  const json = serializeDatabase({items: [], preferences: {...DEFAULT_PREFERENCES, motionLevel: 'off', motion: true}});
  expect(JSON.parse(json).preferences.motion).toBe(false);
 });
});

describe('sanitizeBackupItems', () => {
 let n = 0; const id = () => `new-${++n}`;
 it('throws when there is no items array', () => {
  expect(() => sanitizeBackupItems(undefined)).toThrow();
 });
 it('assigns new ids and keeps only image data URLs', () => {
  const [item] = sanitizeBackupItems([{id: 'old', name: 'A', target: 'x', icon: 'javascript:alert(1)', cardImage: 'data:image/png;base64,AAA', launchCount: '3'}], id);
  expect(item.id).toMatch(/^new-/);
  expect(item.icon).toBeUndefined();
  expect(item.cardImage).toBe('data:image/png;base64,AAA');
  expect(item.launchCount).toBe(3);
 });
 it('clamps framing and limits text length', () => {
  const [item] = sanitizeBackupItems([{name: 'x'.repeat(500), target: 't', cardImageX: 140, cardImageY: -5}], id);
  expect(item.name.length).toBe(200);
  expect(item.cardImageX).toBe(100);
  expect(item.cardImageY).toBe(0);
 });
 it('skips entries without a name or target and caps the count', () => {
  const many = Array.from({length: 6000}, (_, i) => ({name: 'n' + i, target: 't'}));
  expect(sanitizeBackupItems([{name: 'only'}, null, ...many], id).length).toBe(5000);
 });
});
