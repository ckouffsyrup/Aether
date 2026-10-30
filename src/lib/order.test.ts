import {describe, expect, it} from 'vitest';
import type {Item} from '../shared';
import {adoptOrder, moveItem, quickLauncherResults, sortItems} from './order';

const item = (id: string, extra: Partial<Item> = {}): Item => ({id, name: id, target: id + '.exe', category: 'Other', favorite: false, ...extra});
const ids = (items: Item[]) => items.map(x => x.id).join('');

describe('moveItem', () => {
 const list = ['a', 'b', 'c', 'd'].map(x => item(x));
 it('moves before or after the target', () => {
  expect(ids(moveItem(list, 'a', 'c', false))).toBe('bacd');
  expect(ids(moveItem(list, 'a', 'c', true))).toBe('bcad');
  expect(ids(moveItem(list, 'd', 'a', false))).toBe('dabc');
 });
 it('leaves the list untouched for unknown or identical ids', () => {
  expect(moveItem(list, 'x', 'a', false)).toBe(list);
  expect(moveItem(list, 'a', 'x', false)).toBe(list);
  expect(moveItem(list, 'b', 'b', true)).toBe(list);
 });
 it('does not mutate the input', () => {
  moveItem(list, 'a', 'd', true);
  expect(ids(list)).toBe('abcd');
 });
});

describe('adoptOrder', () => {
 const list = ['a', 'x', 'b', 'y', 'c'].map(x => item(x));
 it('reorders only the given ids, inside the slots they occupy', () => {
  expect(ids(adoptOrder(list, ['c', 'a', 'b']))).toBe('cxayb');
 });
 it('returns the same list when the ids do not match', () => {
  expect(adoptOrder(list, ['a', 'zzz'])).toBe(list);
 });
});

describe('sortItems', () => {
 const list = [
  item('b', {name: 'Beta', lastOpened: 10, launchCount: 1}),
  item('a', {name: 'Alpha', favorite: true, launchCount: 5}),
  item('c', {name: 'Charlie', lastOpened: 30}),
 ];
 it('sorts by each mode', () => {
  expect(ids(sortItems(list, 'name'))).toBe('abc');
  expect(ids(sortItems(list, 'recent'))).toBe('cba');
  expect(ids(sortItems(list, 'favorites'))).toBe('abc');
  expect(ids(sortItems(list, 'most-used'))).toBe('abc');
 });
 it('keeps the stored order for custom', () => {
  expect(sortItems(list, 'custom')).toBe(list);
 });
 it('does not mutate the input', () => {
  sortItems(list, 'name');
  expect(ids(list)).toBe('bac');
 });
});

describe('quickLauncherResults', () => {
 const list = [
  item('1', {name: 'Steam Deck Tools'}),
  item('2', {name: 'Steam'}),
  item('3', {name: 'Big Steam Mode', favorite: true}),
  item('4', {name: 'Notes', category: 'Tools'}),
 ];
 it('ranks exact, then prefix, then contains', () => {
  expect(quickLauncherResults(list, 'steam').map(x => x.name)).toEqual(['Steam', 'Steam Deck Tools', 'Big Steam Mode']);
 });
 it('matches categories and limits the count', () => {
  expect(quickLauncherResults(list, 'tools').map(x => x.name)).toEqual(['Steam Deck Tools', 'Notes']);
  expect(quickLauncherResults(list, '', 2)).toHaveLength(2);
 });
});
