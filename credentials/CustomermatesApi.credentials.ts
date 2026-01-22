import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';
import { BASE_URL } from '../constants';

export class CustomermatesApi implements ICredentialType {
	name = 'customermatesApi';

	displayName = 'Customermates API';

	icon = 'file:../static/customermates.svg' as const;

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
			baseURL: BASE_URL,
			url: '/api/v1/users/me',
		},
	};
}
