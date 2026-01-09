/**
 * Tests for readiness.js - Issue/PR readiness evaluation
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('readiness.js', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'opencode-pilot-readiness-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('checkLabels', () => {
    test('returns ready when no label constraints', async () => {
      const { checkLabels } = await import('../../service/readiness.js');
      
      const issue = { labels: ['bug', 'help wanted'] };
      const config = {};
      
      const result = checkLabels(issue, config);
      
      assert.strictEqual(result.ready, true);
    });

    test('returns not ready when has blocking label', async () => {
      const { checkLabels } = await import('../../service/readiness.js');
      
      const issue = { labels: ['bug', 'wip'] };
      const config = {
        readiness: {
          labels: {
            exclude: ['wip', 'do-not-merge']
          }
        }
      };
      
      const result = checkLabels(issue, config);
      
      assert.strictEqual(result.ready, false);
      assert.ok(result.reason.includes('wip'));
    });

    test('returns not ready when missing required label', async () => {
      const { checkLabels } = await import('../../service/readiness.js');
      
      const issue = { labels: ['bug'] };
      const config = {
        readiness: {
          labels: {
            required: ['approved', 'ready']
          }
        }
      };
      
      const result = checkLabels(issue, config);
      
      assert.strictEqual(result.ready, false);
      assert.ok(result.reason.includes('approved'));
    });

    test('handles label objects with name property', async () => {
      const { checkLabels } = await import('../../service/readiness.js');
      
      const issue = { 
        labels: [
          { name: 'bug' },
          { name: 'approved' }
        ]
      };
      const config = {
        readiness: {
          labels: {
            required: ['approved']
          }
        }
      };
      
      const result = checkLabels(issue, config);
      
      assert.strictEqual(result.ready, true);
    });
  });

  describe('checkBotComments', () => {
    test('returns ready when there are non-bot comments', async () => {
      const { checkBotComments } = await import('../../service/readiness.js');
      
      const pr = {
        user: { login: 'author' },
        _comments: [
          { user: { login: 'github-actions[bot]', type: 'Bot' }, body: 'CI passed' },
          { user: { login: 'reviewer', type: 'User' }, body: 'Please fix the bug' },
        ]
      };
      const config = {};
      
      const result = checkBotComments(pr, config);
      
      assert.strictEqual(result.ready, true);
    });

    test('returns not ready when all comments are from bots', async () => {
      const { checkBotComments } = await import('../../service/readiness.js');
      
      const pr = {
        user: { login: 'author' },
        _comments: [
          { user: { login: 'github-actions[bot]', type: 'Bot' }, body: 'CI passed' },
          { user: { login: 'codecov[bot]', type: 'Bot' }, body: 'Coverage report' },
        ]
      };
      const config = {};
      
      const result = checkBotComments(pr, config);
      
      assert.strictEqual(result.ready, false);
      assert.ok(result.reason.includes('bot'));
    });

    test('returns not ready when only author and bots have commented', async () => {
      const { checkBotComments } = await import('../../service/readiness.js');
      
      const pr = {
        user: { login: 'athal7' },
        _comments: [
          { user: { login: 'github-actions[bot]', type: 'Bot' }, body: 'CI passed' },
          { user: { login: 'athal7', type: 'User' }, body: 'Added screenshots' },
        ]
      };
      const config = {};
      
      const result = checkBotComments(pr, config);
      
      assert.strictEqual(result.ready, false);
    });

    test('returns ready when no _comments field (skip check)', async () => {
      const { checkBotComments } = await import('../../service/readiness.js');
      
      const pr = {
        user: { login: 'author' },
        comments: 5  // count only, no _comments enrichment
      };
      const config = {};
      
      const result = checkBotComments(pr, config);
      
      assert.strictEqual(result.ready, true);
    });

    test('returns ready when _comments is empty (no comments yet)', async () => {
      const { checkBotComments } = await import('../../service/readiness.js');
      
      const pr = {
        user: { login: 'author' },
        _comments: []
      };
      const config = {};
      
      const result = checkBotComments(pr, config);
      
      assert.strictEqual(result.ready, true);
    });
  });

  describe('checkFields', () => {
    test('returns ready when no fields configured', async () => {
      const { checkFields } = await import('../../service/readiness.js');
      
      const item = { id: 'item-1', has_notes: false };
      const config = {};
      
      const result = checkFields(item, config);
      
      assert.strictEqual(result.ready, true);
    });

    test('returns ready when field matches required value (boolean)', async () => {
      const { checkFields } = await import('../../service/readiness.js');
      
      const meeting = { id: 'meeting-1', has_notes: true };
      const config = {
        readiness: {
          fields: {
            has_notes: true
          }
        }
      };
      
      const result = checkFields(meeting, config);
      
      assert.strictEqual(result.ready, true);
    });

    test('returns not ready when field does not match required value', async () => {
      const { checkFields } = await import('../../service/readiness.js');
      
      const meeting = { id: 'meeting-1', has_notes: false };
      const config = {
        readiness: {
          fields: {
            has_notes: true
          }
        }
      };
      
      const result = checkFields(meeting, config);
      
      assert.strictEqual(result.ready, false);
      assert.ok(result.reason.includes('has_notes'));
    });

    test('returns not ready when required field is missing', async () => {
      const { checkFields } = await import('../../service/readiness.js');
      
      const item = { id: 'item-1', title: 'Test' };
      const config = {
        readiness: {
          fields: {
            has_notes: true
          }
        }
      };
      
      const result = checkFields(item, config);
      
      assert.strictEqual(result.ready, false);
      assert.ok(result.reason.includes('has_notes'));
    });

    test('checks multiple fields (all must match)', async () => {
      const { checkFields } = await import('../../service/readiness.js');
      
      const item = { id: 'item-1', has_notes: true, type: 'meeting' };
      const config = {
        readiness: {
          fields: {
            has_notes: true,
            type: 'meeting'
          }
        }
      };
      
      const result = checkFields(item, config);
      
      assert.strictEqual(result.ready, true);
    });

    test('fails if any field does not match', async () => {
      const { checkFields } = await import('../../service/readiness.js');
      
      const item = { id: 'item-1', has_notes: true, type: 'note' };
      const config = {
        readiness: {
          fields: {
            has_notes: true,
            type: 'meeting'
          }
        }
      };
      
      const result = checkFields(item, config);
      
      assert.strictEqual(result.ready, false);
      assert.ok(result.reason.includes('type'));
    });

    test('supports string field values', async () => {
      const { checkFields } = await import('../../service/readiness.js');
      
      const item = { id: 'item-1', state: 'open' };
      const config = {
        readiness: {
          fields: {
            state: 'open'
          }
        }
      };
      
      const result = checkFields(item, config);
      
      assert.strictEqual(result.ready, true);
    });

    test('supports numeric field values', async () => {
      const { checkFields } = await import('../../service/readiness.js');
      
      const item = { id: 'item-1', participant_count: 3 };
      const config = {
        readiness: {
          fields: {
            participant_count: 3
          }
        }
      };
      
      const result = checkFields(item, config);
      
      assert.strictEqual(result.ready, true);
    });
  });

  describe('evaluateReadiness', () => {
    test('checks bot comments when _comments is present', async () => {
      const { evaluateReadiness } = await import('../../service/readiness.js');
      
      const pr = {
        user: { login: 'author' },
        _comments: [
          { user: { login: 'dependabot[bot]', type: 'Bot' }, body: 'Bump dependency' },
        ]
      };
      const config = {};
      
      const result = evaluateReadiness(pr, config);
      
      assert.strictEqual(result.ready, false);
      assert.ok(result.reason.includes('bot'));
    });

    test('passes when there is real human feedback', async () => {
      const { evaluateReadiness } = await import('../../service/readiness.js');
      
      const pr = {
        user: { login: 'author' },
        _comments: [
          { user: { login: 'github-actions[bot]', type: 'Bot' }, body: 'CI passed' },
          { user: { login: 'teammate', type: 'User' }, body: 'LGTM!' },
        ]
      };
      const config = {};
      
      const result = evaluateReadiness(pr, config);
      
      assert.strictEqual(result.ready, true);
    });

    test('checks fields when readiness.fields is configured', async () => {
      const { evaluateReadiness } = await import('../../service/readiness.js');
      
      const meeting = {
        id: 'meeting-123',
        title: 'Team Standup',
        has_notes: false
      };
      const config = {
        readiness: {
          fields: {
            has_notes: true
          }
        }
      };
      
      const result = evaluateReadiness(meeting, config);
      
      assert.strictEqual(result.ready, false);
      assert.ok(result.reason.includes('has_notes'));
    });

    test('passes when field matches required value', async () => {
      const { evaluateReadiness } = await import('../../service/readiness.js');
      
      const meeting = {
        id: 'meeting-123',
        title: 'Team Standup',
        has_notes: true
      };
      const config = {
        readiness: {
          fields: {
            has_notes: true
          }
        }
      };
      
      const result = evaluateReadiness(meeting, config);
      
      assert.strictEqual(result.ready, true);
    });
  });
});
