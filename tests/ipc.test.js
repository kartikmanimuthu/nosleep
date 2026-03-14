import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { encode, createLineParser } from '../source/ipc.js';

describe('encode()', () => {
  test('produces newline-terminated JSON', () => {
    const out = encode({ type: 'ok' });
    assert.equal(out, '{"type":"ok"}\n');
  });

  test('handles nested objects', () => {
    const msg = { type: 'state', payload: { active: true, mode: 'idle', remaining: null } };
    const out = encode(msg);
    assert.ok(out.endsWith('\n'));
    assert.deepEqual(JSON.parse(out.trimEnd()), msg);
  });

  test('handles all IPC message types', () => {
    const types = ['ok', 'error', 'state', 'start', 'stop', 'subscribe', 'unsubscribe', 'shutdown'];
    for (const type of types) {
      const out = encode({ type });
      assert.doesNotThrow(() => JSON.parse(out.trimEnd()));
    }
  });
});

describe('createLineParser()', () => {
  test('calls onMessage for a complete JSON line', () => {
    const received = [];
    const parser = createLineParser(msg => received.push(msg));
    parser('{"type":"ok"}\n');
    assert.equal(received.length, 1);
    assert.deepEqual(received[0], { type: 'ok' });
  });

  test('buffers partial data across chunks', () => {
    const received = [];
    const parser = createLineParser(msg => received.push(msg));
    parser('{"type":');
    assert.equal(received.length, 0);
    parser('"ok"}\n');
    assert.equal(received.length, 1);
    assert.deepEqual(received[0], { type: 'ok' });
  });

  test('parses multiple messages in a single chunk', () => {
    const received = [];
    const parser = createLineParser(msg => received.push(msg));
    parser('{"type":"ok"}\n{"type":"state","payload":{}}\n');
    assert.equal(received.length, 2);
    assert.equal(received[0].type, 'ok');
    assert.equal(received[1].type, 'state');
  });

  test('ignores blank lines', () => {
    const received = [];
    const parser = createLineParser(msg => received.push(msg));
    parser('\n\n{"type":"ok"}\n\n');
    assert.equal(received.length, 1);
  });

  test('ignores malformed JSON without throwing', () => {
    const received = [];
    const parser = createLineParser(msg => received.push(msg));
    assert.doesNotThrow(() => {
      parser('not-json\n');
      parser('{broken\n');
    });
    assert.equal(received.length, 0);
  });

  test('parses valid message after malformed one', () => {
    const received = [];
    const parser = createLineParser(msg => received.push(msg));
    parser('garbage\n{"type":"ok"}\n');
    assert.equal(received.length, 1);
    assert.equal(received[0].type, 'ok');
  });

  test('handles Buffer input (socket data)', () => {
    const received = [];
    const parser = createLineParser(msg => received.push(msg));
    parser(Buffer.from('{"type":"ok"}\n'));
    assert.equal(received.length, 1);
  });

  test('accumulates a message split across many tiny chunks', () => {
    const received = [];
    const parser = createLineParser(msg => received.push(msg));
    const raw = '{"type":"state","payload":{"active":true}}\n';
    for (const char of raw) parser(char);
    assert.equal(received.length, 1);
    assert.equal(received[0].type, 'state');
  });
});
