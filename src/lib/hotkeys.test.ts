import {describe, expect, it} from 'vitest';
import {hotkeyLabel, hotkeyParts, keyName, recordKey} from './hotkeys';

const key = (code: string, mods: Partial<{ctrlKey: boolean; altKey: boolean; shiftKey: boolean; metaKey: boolean}> = {}) =>
 recordKey({code, ctrlKey: false, altKey: false, shiftKey: false, metaKey: false, ...mods});

describe('keyName', () => {
 it('maps letters, digits, F-keys, numpad and named keys', () => {
  expect(keyName('KeyK')).toBe('K');
  expect(keyName('Digit7')).toBe('7');
  expect(keyName('F12')).toBe('F12');
  expect(keyName('Numpad3')).toBe('Num3');
  expect(keyName('ArrowUp')).toBe('Up');
  expect(keyName('Space')).toBe('Space');
 });
 it('rejects modifiers and unknown keys', () => {
  expect(keyName('ControlLeft')).toBeNull();
  expect(keyName('F25')).toBeNull();
  expect(keyName('MediaPlayPause')).toBeNull();
 });
});

describe('recordKey', () => {
 it('finishes a combination in a fixed modifier order', () => {
  expect(key('Space', {altKey: true, ctrlKey: true})).toEqual({kind: 'done', accelerator: 'Ctrl+Alt+Space'});
  expect(key('KeyA', {metaKey: true, shiftKey: true})).toEqual({kind: 'done', accelerator: 'Shift+Super+A'});
 });
 it('keeps waiting while only modifiers are held', () => {
  expect(key('ControlLeft', {ctrlKey: true})).toEqual({kind: 'partial', parts: ['Ctrl']});
  expect(key('AltRight', {ctrlKey: true, altKey: true})).toEqual({kind: 'partial', parts: ['Ctrl', 'Alt']});
 });
 it('needs Ctrl, Alt or Win', () => {
  expect(key('KeyA').kind).toBe('invalid');
  expect(key('KeyA', {shiftKey: true}).kind).toBe('invalid');
 });
 it('refuses keys Windows keeps for itself', () => {
  expect(key('Tab', {altKey: true}).kind).toBe('invalid');
  expect(key('KeyL', {metaKey: true}).kind).toBe('invalid');
 });
});

describe('display', () => {
 it('shows Super as Win', () => {
  expect(hotkeyParts('Ctrl+Super+K')).toEqual(['Ctrl', 'Win', 'K']);
  expect(hotkeyLabel('Ctrl+Alt+Space')).toBe('Ctrl + Alt + Space');
 });
});
