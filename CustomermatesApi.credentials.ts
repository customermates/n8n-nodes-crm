import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';
import { BASE_URL } from './constants';

export class CustomermatesApi implements ICredentialType {
	name = 'customermatesApi';

	displayName = 'Customermates API';

	icon = 'file:customermates.svg' as const;

	documentationUrl =
		'https://github.com/customermates/n8n-nodes-crm?tab=readme-ov-file#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description: 'Customermates API key',
		},
		{
			displayName: 'Base URL',
			name: 'baseURL',
			type: 'string',
			default: BASE_URL,
			placeholder: 'https://customermates.com',
			description:
				'Base URL of the Customermates instance. Use the default for the hosted Cloud, or your own URL for self-hosted (e.g. https://crm.example.com).',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'x-api-key': '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseURL || "https://customermates.com"}}',
			url: '/api/v1/users/me',
		},
	};
}
