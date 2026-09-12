const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Peedief } = require('../dist/nodes/Peedief/Peedief.node.js');

function context(parameters, responses = [], continueOnFail = false) {
  const requests = [];
  return {
    requests,
    getInputData: () => [{ json: {} }],
    getCredentials: async () => ({ baseUrl: 'https://example.test/api/', apiKey: 'test-key' }),
    getNodeParameter: (name, _index, fallback) => parameters[name] ?? fallback,
    getNode: () => ({ name: 'Peedief', type: 'peedief', typeVersion: 1, position: [0, 0], parameters: {} }),
    continueOnFail: () => continueOnFail,
    helpers: {
      httpRequest: async (request) => { requests.push(request); return responses.shift(); },
      prepareBinaryData: async (buffer, fileName, mimeType) => ({ data: buffer.toString('base64'), fileName, mimeType }),
    },
  };
}

test('HTML operation preserves API authentication, margins, and paired items', async () => {
  const ctx = context({ operation: 'htmlToPdf', html: '<h1>Invoice</h1>', fileName: ' invoice.pdf ',
    pdfOptions: { marginTop: 12, marginUnit: 'mm', landscape: true }, downloadPdf: false },
    [{ downloadUrl: 'https://files.test/invoice.pdf' }]);
  const [items] = await new Peedief().execute.call(ctx);
  assert.equal(ctx.requests[0].url, 'https://example.test/api/pdf');
  assert.equal(ctx.requests[0].headers['x-api-key'], 'test-key');
  assert.deepEqual(ctx.requests[0].body, { html: '<h1>Invoice</h1>', fileName: 'invoice.pdf',
    options: { landscape: true, margin: { top: '12mm' } } });
  assert.deepEqual(items[0].pairedItem, { item: 0 });
});

test('template operation encodes the name and downloads PDF binary without leaking API credentials', async () => {
  const ctx = context({ operation: 'templateToPdf', templateName: 'Invoice / 2026',
    contextJson: '{"total":42}', downloadPdf: true, binaryPropertyName: 'document' },
    [{ downloadUrl: 'https://files.test/invoice.pdf', fileName: 'invoice.pdf' }, Buffer.from('%PDF-')]);
  const [items] = await new Peedief().execute.call(ctx);
  assert.equal(ctx.requests[0].url, 'https://example.test/api/templates/by-name/Invoice%20%2F%202026/pdf');
  assert.deepEqual(ctx.requests[0].body, { contextJson: { total: 42 } });
  assert.equal(ctx.requests[1].headers, undefined);
  assert.deepEqual(items[0].binary.document, {
    data: Buffer.from('%PDF-').toString('base64'), fileName: 'invoice.pdf', mimeType: 'application/pdf',
  });
});

test('invalid template JSON produces an item error without making a request when continueOnFail is enabled', async () => {
  const ctx = context({ operation: 'templateToPdf', templateName: 'Invoice', contextJson: '[]' }, [], true);
  const [items] = await new Peedief().execute.call(ctx);
  assert.match(items[0].json.error, /must be a JSON object/);
  assert.equal(ctx.requests.length, 0);
  assert.deepEqual(items[0].pairedItem, { item: 0 });
});
