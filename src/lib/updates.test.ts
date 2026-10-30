import {describe, expect, it} from 'vitest';
import {compareVersions, releaseNoteLines, timeAgo} from './updates';

describe('releaseNoteLines', () => {
 it('strips headings, emphasis and entry numbers', () => {
  const lines = releaseNoteLines('## v0.15.0 — Updates\nIntro line.\n- **117 — Auto-updates:** checks `GitHub`.\n\n* plain bullet');
  expect(lines).toEqual([
   {text: 'Intro line.', bullet: false},
   {text: 'Auto-updates: checks GitHub.', bullet: true},
   {text: 'plain bullet', bullet: true},
  ]);
 });
 it('handles empty notes and caps long ones', () => {
  expect(releaseNoteLines(undefined)).toEqual([]);
  const many = releaseNoteLines(Array.from({length: 20}, (_, i) => `- item ${i}`).join('\n'), 5);
  expect(many).toHaveLength(6);
  expect(many[5].text).toBe('…and 15 more');
 });
});

describe('timeAgo', () => {
 const now = 1_000_000_000;
 it('formats minutes, hours and days', () => {
  expect(timeAgo(now - 20_000, now)).toBe('just now');
  expect(timeAgo(now - 5 * 60_000, now)).toBe('5 min ago');
  expect(timeAgo(now - 3 * 3_600_000, now)).toBe('3 h ago');
  expect(timeAgo(now - 26 * 3_600_000, now)).toBe('1 day ago');
  expect(timeAgo(now - 72 * 3_600_000, now)).toBe('3 days ago');
 });
});

describe('compareVersions', () => {
 it('compares numerically, not as text', () => {
  expect(compareVersions('0.15.0', '0.14.1')).toBe(1);
  expect(compareVersions('0.9.2', '0.10.0')).toBe(-1);
  expect(compareVersions('v1.2.3', '1.2.3')).toBe(0);
  expect(compareVersions('1.2', '1.2.0')).toBe(0);
 });
});
