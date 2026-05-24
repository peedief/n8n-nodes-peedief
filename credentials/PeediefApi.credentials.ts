import type { ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

export class PeediefApi implements ICredentialType {
	name = 'peediefApi';

	displayName = 'Peedief API';

	icon = 'file:peedief.svg' as const;

	documentationUrl = 'https://peedief.com';

	test: ICredentialTestRequest = {
		request: {
			method: 'GET',
			baseURL: '={{$credentials.baseUrl.replace(/\\/+$/, "")}}',
			url: '/check',
			headers: {
				'x-api-key': '={{$credentials.apiKey}}',
			},
			json: true,
		},
		rules: [
			{
				type: 'responseCode',
				properties: {
					value: 200,
					message: 'API key accepted.',
				},
			},
		],
	};

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'Peedief API key sent as the x-api-key header',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://peedief.com/api',
			placeholder: 'https://peedief.com/api',
			required: true,
			description: 'Peedief API base URL, without a trailing slash',
		},
	];
}
