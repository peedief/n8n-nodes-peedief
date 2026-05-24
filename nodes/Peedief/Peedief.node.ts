import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

type PeediefCredentials = {
	apiKey: string;
	baseUrl: string;
};

type PeediefResponse = IDataObject & {
	downloadUrl?: string;
	fileName?: string;
};

export class Peedief implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Peedief',
		name: 'peedief',
		icon: 'file:peedief.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] === "htmlToPdf" ? "HTML to PDF" : "Template to PDF"}}',
		description: 'Generate PDFs from HTML or Peedief templates',
		defaults: {
			name: 'Peedief',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'peediefApi',
				required: true,
			},
		],
		requestDefaults: {
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'HTML to PDF',
						value: 'htmlToPdf',
						description: 'Generate a PDF from raw HTML',
						action: 'Generate a PDF from HTML',
					},
					{
						name: 'Template to PDF',
						value: 'templateToPdf',
						description: 'Generate a PDF from a saved Peedief template',
						action: 'Generate a PDF from a template',
					},
				],
				default: 'htmlToPdf',
			},
			{
				displayName: 'HTML',
				name: 'html',
				type: 'string',
				typeOptions: {
					rows: 12,
				},
				default: '',
				required: true,
				description: 'Complete HTML document or fragment to convert to PDF',
				displayOptions: {
					show: {
						operation: ['htmlToPdf'],
					},
				},
			},
			{
				displayName: 'Template Name',
				name: 'templateName',
				type: 'string',
				default: '',
				required: true,
				description: 'Name of the saved Peedief template to render',
				displayOptions: {
					show: {
						operation: ['templateToPdf'],
					},
				},
			},
			{
				displayName: 'Context JSON',
				name: 'contextJson',
				type: 'json',
				default: '{\n  "sampleKey": "value"\n}',
				required: true,
				description: 'JSON object passed to the template renderer',
				displayOptions: {
					show: {
						operation: ['templateToPdf'],
					},
				},
			},
			{
				displayName: 'File Name',
				name: 'fileName',
				type: 'string',
				default: '',
				placeholder: 'invoice.pdf',
				description: 'Optional output file name. Peedief will generate one when left empty.',
			},
			{
				displayName: 'Download PDF',
				name: 'downloadPdf',
				type: 'boolean',
				default: false,
				description: 'Whether to fetch the generated PDF and attach it as binary data',
			},
			{
				displayName: 'Binary Property',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				description: 'Name of the binary property that receives the PDF',
				displayOptions: {
					show: {
						downloadPdf: [true],
					},
				},
			},
			{
				displayName: 'PDF Options',
				name: 'pdfOptions',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				displayOptions: {
					show: {
						operation: ['htmlToPdf'],
					},
				},
				options: [
					{
						displayName: 'Format',
						name: 'format',
						type: 'options',
						options: [
							{ name: 'A3', value: 'A3' },
							{ name: 'A4', value: 'A4' },
							{ name: 'A5', value: 'A5' },
							{ name: 'Letter', value: 'Letter' },
						],
						default: 'A4',
						description: 'Paper format to use for the PDF',
					},
					{
						displayName: 'Height',
						name: 'height',
						type: 'string',
						default: '',
						placeholder: '11in',
						description: 'Custom paper height. Leave empty when using a standard format.',
					},
					{
						displayName: 'Landscape',
						name: 'landscape',
						type: 'boolean',
						default: false,
						description: 'Whether to render the PDF in landscape orientation',
					},
					{
						displayName: 'Margin Bottom',
						name: 'marginBottom',
						type: 'number',
						default: 10,
					},
					{
						displayName: 'Margin Left',
						name: 'marginLeft',
						type: 'number',
						default: 10,
					},
					{
						displayName: 'Margin Right',
						name: 'marginRight',
						type: 'number',
						default: 10,
					},
					{
						displayName: 'Margin Top',
						name: 'marginTop',
						type: 'number',
						default: 10,
					},
					{
						displayName: 'Margin Unit',
						name: 'marginUnit',
						type: 'options',
						options: [
							{ name: 'Millimeters', value: 'mm' },
							{ name: 'Centimeters', value: 'cm' },
							{ name: 'Inches', value: 'in' },
							{ name: 'Pixels', value: 'px' },
						],
						default: 'mm',
						description: 'Unit used for numeric margin fields',
					},
					{
						displayName: 'Print Background',
						name: 'printBackground',
						type: 'boolean',
						default: true,
						description: 'Whether to print CSS backgrounds',
					},
					{
						displayName: 'Scale',
						name: 'scale',
						type: 'number',
						typeOptions: {
							minValue: 0.1,
							maxValue: 2,
							numberPrecision: 2,
						},
						default: 1,
						description: 'Rendering scale from 0.1 to 2',
					},
					{
						displayName: 'Width',
						name: 'width',
						type: 'string',
						default: '',
						placeholder: '8.5in',
						description: 'Custom paper width. Leave empty when using a standard format.',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const credentials = await this.getCredentials('peediefApi') as PeediefCredentials;

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const operation = this.getNodeParameter('operation', itemIndex) as string;
				const requestOptions = buildRequestOptions(this, credentials, operation, itemIndex);
				const response = await this.helpers.httpRequest.call(this, requestOptions) as PeediefResponse;
				const executionItem: INodeExecutionData = {
					json: response,
					pairedItem: {
						item: itemIndex,
					},
				};

				const shouldDownloadPdf = this.getNodeParameter('downloadPdf', itemIndex) as boolean;
				if (shouldDownloadPdf) {
					const binaryPropertyName = this.getNodeParameter('binaryPropertyName', itemIndex) as string;
					executionItem.binary = {
						[binaryPropertyName]: await fetchPdfBinary(this, response, binaryPropertyName),
					};
				}

				returnData.push(executionItem);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error instanceof Error ? error.message : String(error),
						},
						pairedItem: {
							item: itemIndex,
						},
					});
					continue;
				}

				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex });
			}
		}

		return [returnData];
	}

}

function buildRequestOptions(
	executeFunctions: IExecuteFunctions,
	credentials: PeediefCredentials,
	operation: string,
	itemIndex: number,
): IHttpRequestOptions {
	const baseUrl = normalizeBaseUrl(credentials.baseUrl);
	const fileName = executeFunctions.getNodeParameter('fileName', itemIndex, '') as string;

	if (operation === 'templateToPdf') {
		const templateName = executeFunctions.getNodeParameter('templateName', itemIndex) as string;
		const contextJson = executeFunctions.getNodeParameter('contextJson', itemIndex) as IDataObject | string;

		return {
			method: 'POST',
			url: `${baseUrl}/templates/by-name/${encodeURIComponent(templateName)}/pdf`,
			headers: buildHeaders(credentials.apiKey),
			json: true,
			body: {
				contextJson: parseJsonObject(executeFunctions, contextJson, 'Context JSON'),
				...(fileName.trim() ? { fileName: fileName.trim() } : {}),
			},
		};
	}

	const html = executeFunctions.getNodeParameter('html', itemIndex) as string;

	return {
		method: 'POST',
		url: `${baseUrl}/pdf`,
		headers: buildHeaders(credentials.apiKey),
		json: true,
		body: {
			html,
			...(fileName.trim() ? { fileName: fileName.trim() } : {}),
			options: buildPdfOptions(executeFunctions.getNodeParameter('pdfOptions', itemIndex, {}) as IDataObject),
		},
	};
}

async function fetchPdfBinary(
	executeFunctions: IExecuteFunctions,
	response: PeediefResponse,
	binaryPropertyName: string,
) {
	if (!response.downloadUrl || typeof response.downloadUrl !== 'string') {
		throw new NodeApiError(executeFunctions.getNode(), {
			message: 'Peedief did not return a downloadUrl for the generated PDF.',
		});
	}

	const pdfBuffer = await executeFunctions.helpers.httpRequest.call(executeFunctions, {
		method: 'GET',
		url: response.downloadUrl,
		json: false,
		encoding: 'arraybuffer',
	} as IHttpRequestOptions) as Buffer;

	const fileName = typeof response.fileName === 'string' && response.fileName.trim()
		? response.fileName.trim()
		: `${binaryPropertyName}.pdf`;

	return await executeFunctions.helpers.prepareBinaryData(pdfBuffer, fileName, 'application/pdf');
}

function buildHeaders(apiKey: string) {
	return {
		Accept: 'application/json',
		'Content-Type': 'application/json',
		'x-api-key': apiKey,
	};
}

function normalizeBaseUrl(baseUrl: string) {
	return baseUrl.trim().replace(/\/+$/, '');
}

function parseJsonObject(
	executeFunctions: IExecuteFunctions,
	value: IDataObject | string,
	fieldName: string,
): IDataObject {
	if (typeof value === 'string') {
		try {
			const parsed = JSON.parse(value) as unknown;
			if (isJsonObject(parsed)) {
				return parsed;
			}
		} catch {
			throw new NodeOperationError(executeFunctions.getNode(), `${fieldName} must be valid JSON.`);
		}

		throw new NodeOperationError(executeFunctions.getNode(), `${fieldName} must be a JSON object.`);
	}

	if (!isJsonObject(value)) {
		throw new NodeOperationError(executeFunctions.getNode(), `${fieldName} must be a JSON object.`);
	}

	return value;
}

function isJsonObject(value: unknown): value is IDataObject {
	return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function buildPdfOptions(options: IDataObject) {
	const marginUnit = typeof options.marginUnit === 'string' && options.marginUnit ? options.marginUnit : 'mm';
	const margin = buildMargin(options, marginUnit);

	return {
		...(typeof options.format === 'string' && options.format ? { format: options.format } : {}),
		...(typeof options.landscape === 'boolean' ? { landscape: options.landscape } : {}),
		...(typeof options.printBackground === 'boolean' ? { printBackground: options.printBackground } : {}),
		...(typeof options.scale === 'number' ? { scale: options.scale } : {}),
		...(typeof options.width === 'string' && options.width.trim() ? { width: options.width.trim() } : {}),
		...(typeof options.height === 'string' && options.height.trim() ? { height: options.height.trim() } : {}),
		...(margin ? { margin } : {}),
	};
}

function buildMargin(options: IDataObject, marginUnit: string) {
	const sides = [
		['top', options.marginTop],
		['right', options.marginRight],
		['bottom', options.marginBottom],
		['left', options.marginLeft],
	] as const;

	const margin = Object.fromEntries(
		sides
			.filter(([, value]) => typeof value === 'number')
			.map(([side, value]) => [side, `${value}${marginUnit}`]),
	);

	return Object.keys(margin).length ? margin : undefined;
}
