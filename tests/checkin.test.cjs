const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const KEY = 'personal-daily-checkin-v1';

function app(initial = {}) {
  let current = new Date(2026, 9, 5, 12);
  let stored = JSON.stringify(initial);
  let failWrites = false;
  const elements = new Map();
  const element = () => ({ textContent: '', disabled: false, children: [],
    append(...items) { this.children.push(...items); },
    replaceChildren() { this.children = []; },
    setAttribute() {}, addEventListener() {} });
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [current.getTime()])); }
  }
  const context = vm.createContext({ Date: Clock,
    document: { getElementById(id) {
      if (!elements.has(id)) elements.set(id, element());
      return elements.get(id);
    }, createElement: element, addEventListener() {} },
    window: { addEventListener() {} }, setInterval() {},
    localStorage: { getItem() { return stored; }, setItem(key, value) {
      assert.equal(key, KEY);
      if (failWrites) throw Error('storage full');
      stored = value;
    } }
  });
  vm.runInContext(script, context);
  return { run: code => vm.runInContext(code, context),
    day(y, m, d) { current = new Date(y, m - 1, d, 12); this.run('render()'); },
    records: () => JSON.parse(stored), el: id => elements.get(id),
    failWrites() { failWrites = true; } };
}

test('intervals increase 1, 2, 3, 4 days and early/duplicate check-ins do not advance', () => {
  const a = app();
  assert.equal(a.el('checkin').disabled, false);
  assert.equal(a.run('checkin().nextDate'), '2026-10-06');
  assert.equal(a.run('checkin().alreadyChecked'), true);
  assert.equal(Object.keys(a.records()).length, 1);
  a.day(2026, 10, 6);
  assert.equal(a.run('checkin().nextDate'), '2026-10-08');
  a.day(2026, 10, 7);
  assert.equal(a.el('checkin').disabled, true);
  assert.match(a.el('schedule').textContent, /2026-10-08.*还有 1 天/);
  assert.throws(() => a.run('checkin()'), /尚未到打卡日期/);
  assert.equal(Object.keys(a.records()).length, 2);
  a.day(2026, 10, 8);
  assert.equal(a.run('checkin().nextDate'), '2026-10-11');
  a.day(2026, 10, 11);
  assert.equal(a.run('checkin().nextDate'), '2026-10-15');
});

test('late check-ins use the actual date and existing records survive reload', () => {
  const initial = { '2026-10-01': '2026-10-01T04:00:00Z', '2026-10-02': '2026-10-02T04:00:00Z' };
  const a = app(initial);
  assert.equal(a.el('checkin').disabled, false);
  assert.equal(a.run('checkin().nextDate'), '2026-10-08');
  assert.equal(a.records()['2026-10-01'], initial['2026-10-01']);
  const reloaded = app(a.records());
  assert.equal(reloaded.el('total').textContent, 3);
  reloaded.day(2026, 10, 7);
  assert.equal(reloaded.el('checkin').disabled, true);
});

test('calendar-day arithmetic crosses months, years, leap days and DST without drifting', () => {
  const a = app();
  for (const [start, days, expected] of [
    ['2026-10-31', 2, '2026-11-02'],
    ['2026-12-31', 1, '2027-01-01'],
    ['2028-02-28', 1, '2028-02-29'],
    ['2028-02-28', 2, '2028-03-01'],
    ['2026-03-07', 2, '2026-03-09']
  ]) {
    assert.equal(a.run(`shiftDay('${start}', ${days})`), expected);
    assert.equal(a.run(`dayNumber('${expected}')-dayNumber('${start}')`), days);
  }
});

test('failed storage writes do not record or advance a check-in', () => {
  const a = app();
  a.failWrites();
  assert.throws(() => a.run('checkin()'), /保存失败/);
  assert.deepEqual(a.records(), {});
  assert.equal(a.run('scheduleFor(records,dateKey(new Date())).count'), 0);
});

test('invalid stored data is preserved and disables check-in', () => {
  const initial = { '2026-02-30': '2026-03-02T04:00:00Z' };
  const a = app(initial);
  assert.equal(a.el('checkin').disabled, true);
  assert.throws(() => a.run('checkin()'), /无法保存记录/);
  assert.deepEqual(a.records(), initial);
});
