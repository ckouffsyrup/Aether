import {describe, expect, it} from 'vitest';
import {guessCategory, normalizeTarget, parseLegacy, sanitizeTheme} from './importers';
import {DEFAULT_PREFERENCES} from './storage';

describe('parseLegacy (NexusBar)', () => {
 it('reads the apps / items / plain-array layouts', () => {
  expect(parseLegacy({apps: [{name: 'Steam', path: 'C:\\steam.exe'}]})).toHaveLength(1);
  expect(parseLegacy({items: [{title: 'Site', url: 'https://x.dev'}]})[0].target).toBe('https://x.dev');
  expect(parseLegacy([{name: 'A', target: 'a.exe'}])).toHaveLength(1);
 });
 it('skips entries without a name or target', () => {
  expect(parseLegacy({apps: [{name: 'A'}, {path: 'b.exe'}, 'junk', {name: ' ', path: 'c'}]})).toHaveLength(0);
 });
 it('maps favorite flags and guesses categories', () => {
  const [a, b] = parseLegacy({apps: [{name: 'Discord', path: 'd.exe', is_favorite: true}, {name: 'Thing', path: 't.exe', category: 'Tools', pinned: true}]});
  expect(a.category).toBe('Communication');
  expect(a.favorite).toBe(true);
  expect(b.category).toBe('Tools');
  expect(b.favorite).toBe(true);
 });
 it('throws for unsupported files', () => {
  expect(() => parseLegacy({hello: 'world'})).toThrow();
 });
});

describe('helpers', () => {
 it('guesses categories from names', () => {
  expect(guessCategory('Minecraft Launcher')).toBe('Games');
  expect(guessCategory('Visual Studio Code')).toBe('Development');
  expect(guessCategory('Calculator')).toBe('Other');
 });
 it('normalizes targets for duplicate detection', () => {
  expect(normalizeTarget(' C:\\Apps\\Steam.EXE ')).toBe(normalizeTarget('c:/apps/steam.exe'));
 });
});

describe('sanitizeTheme', () => {
 it('rejects files that are not Aether themes', () => {
  expect(() => sanitizeTheme({format: 'other'}, DEFAULT_PREFERENCES)).toThrow();
 });
 it('keeps valid values, replaces invalid colors, clamps numbers', () => {
  const t = sanitizeTheme({format: 'aether-theme-v1', preferences: {accent: '#123456', cardColor: 'red', radius: 99, scale: 10, layout: 'list'}}, DEFAULT_PREFERENCES);
  expect(t.accent).toBe('#123456');
  expect(t.cardColor).toBe(DEFAULT_PREFERENCES.cardColor);
  expect(t.radius).toBe(32);
  expect(t.scale).toBe(85);
  expect(t.layout).toBe('list');
 });
 it('never imports desktop or library settings', () => {
  const t = sanitizeTheme({format: 'aether-theme-v1', preferences: {startWithWindows: true, wallpaper: 'local', sort: 'custom'}}, DEFAULT_PREFERENCES);
  expect('startWithWindows' in t).toBe(false);
  expect('wallpaper' in t).toBe(false);
  expect('sort' in t).toBe(false);
 });
 it('carries the card icon mode and rejects unknown values', () => {
  expect(sanitizeTheme({format: 'aether-theme-v1', preferences: {cardIcons: 'never'}}, DEFAULT_PREFERENCES).cardIcons).toBe('never');
  expect(sanitizeTheme({format: 'aether-theme-v1', preferences: {cardIcons: 'huge'}}, DEFAULT_PREFERENCES).cardIcons).toBe('always');
 });
 it('migrates the old motion flag', () => {
  expect(sanitizeTheme({format: 'aether-theme-v1', preferences: {motion: false}}, DEFAULT_PREFERENCES).motionLevel).toBe('off');
 });
});
