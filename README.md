# n8n-nodes-peedief

Generate PDFs from Peedief inside n8n.

## Actions

- **HTML to PDF**: send raw HTML to `POST /api/pdf`.
- **Template to PDF**: render a saved Peedief template with JSON context through `POST /api/templates/by-name/:templateName/pdf`.

Both actions authenticate with the `x-api-key` header and return Peedief's PDF metadata, including `downloadUrl`, `previewUrl`, `fileName`, and `fileSize`. You can optionally download the generated PDF into n8n binary data.

## Development

```bash
npm install
npm run build
npm run dev
```

`npm run dev` starts a local n8n instance with this node loaded.

## Credentials

Create a **Peedief API** credential in n8n:

- **API Key**: your Peedief API key.
- **Base URL**: your Peedief API URL, for example `https://peedief.com/api`.

## Private Install

Build the package and install it into your n8n instance:

```bash
npm run build
npm pack
```

Then install the generated `.tgz` package in n8n as a community/private node.
