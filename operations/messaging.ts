import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { apiRequest, searchAll, splitList } from '../helpers/api';
import type { Handler } from './entities';

const show = (operation: string[]) => ({ show: { resource: ['messaging'], operation } });

export const messagingProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['messaging'] } },
		options: [
			{
				name: 'Get Connected Accounts',
				value: 'getConnectedAccounts',
				description: 'Get the connected messaging accounts (email, LinkedIn, WhatsApp, …)',
				action: 'Get connected accounts',
			},
			{
				name: 'Get Many Threads',
				value: 'getAllThreads',
				description: 'Get data of many conversation threads',
				action: 'Get many threads',
			},
			{
				name: 'Get Thread',
				value: 'getThread',
				description: 'Get a conversation thread with its messages',
				action: 'Get a thread',
			},
			{
				name: 'Send Chat Message',
				value: 'sendMessage',
				description: 'Send a chat message in an existing thread',
				action: 'Send a chat message',
			},
			{
				name: 'Send Email',
				value: 'sendEmail',
				description: 'Send an email from a connected account',
				action: 'Send an email',
			},
			{
				name: 'Start Chat',
				value: 'startChat',
				description: 'Start a new chat conversation from a connected account',
				action: 'Start a chat',
			},
		],
		default: 'sendEmail',
	},
	{
		displayName: 'Thread ID',
		name: 'threadId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: show(['getThread', 'sendMessage']),
		description: 'The unique identifier (UUID) of the thread',
	},
	{
		displayName: 'To',
		name: 'to',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'jane@example.com, john@example.com',
		displayOptions: show(['sendEmail']),
		description: 'Comma-separated list of recipient email addresses',
	},
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		default: '',
		required: true,
		displayOptions: show(['sendEmail']),
		description: 'The subject of the email',
	},
	{
		displayName: 'Body',
		name: 'body',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		default: '',
		required: true,
		displayOptions: show(['sendEmail']),
		description: 'The body of the email',
	},
	{
		displayName: 'Connected Account Name or ID',
		name: 'connectedAccountId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'loadConnectedAccountOptions',
		},
		default: '',
		required: true,
		displayOptions: show(['startChat']),
		description:
			'The connected account to start the chat from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Attendee Identifiers',
		name: 'attendeeIdentifiers',
		type: 'string',
		default: '',
		required: true,
		displayOptions: show(['startChat']),
		description:
			'Comma-separated provider-internal attendee IDs (e.g. the messaging ID of a contact channel; for WhatsApp use the format 4917656945421@s.whatsapp.net)',
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		default: '',
		required: true,
		displayOptions: show(['sendMessage', 'startChat']),
		description: 'The message text to send',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['sendEmail']),
		options: [
			{
				displayName: 'BCC',
				name: 'bcc',
				type: 'string',
				default: '',
				description: 'Comma-separated list of BCC email addresses',
			},
			{
				displayName: 'CC',
				name: 'cc',
				type: 'string',
				default: '',
				description: 'Comma-separated list of CC email addresses',
			},
			{
				displayName: 'Connected Account Name or ID',
				name: 'connectedAccountId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'loadConnectedAccountOptions',
				},
				default: '',
				description:
					'The connected account to send from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Thread ID',
				name: 'threadId',
				type: 'string',
				default: '',
				description: 'The unique identifier (UUID) of an existing thread to reply in',
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['startChat']),
		options: [
			{
				displayName: 'Chat Name',
				name: 'chatName',
				type: 'string',
				default: '',
				description: 'Display name for the new chat (group chats)',
			},
			{
				displayName: 'InMail',
				name: 'inmail',
				type: 'boolean',
				default: false,
				description:
					'Whether to send as InMail to message people outside your network (LinkedIn classic only, uses InMail credit)',
			},
			{
				displayName: 'InMail Signature',
				name: 'inmailSignature',
				type: 'string',
				default: '',
				description: 'Sender signature of the InMail (required for the recruiter product)',
			},
			{
				displayName: 'InMail Subject',
				name: 'inmailSubject',
				type: 'string',
				default: '',
				description:
					'Subject line of the InMail (required for the sales navigator and recruiter products)',
			},
			{
				displayName: 'LinkedIn Product',
				name: 'linkedinProduct',
				type: 'options',
				options: [
					{ name: 'Classic', value: 'classic' },
					{ name: 'Recruiter', value: 'recruiter' },
					{ name: 'Sales Navigator', value: 'sales_navigator' },
				],
				default: 'classic',
				description: 'LinkedIn only: which product to send the chat from',
			},
		],
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: show(['getAllThreads']),
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		default: 25,
		displayOptions: {
			show: { resource: ['messaging'], operation: ['getAllThreads'], returnAll: [false] },
		},
		description: 'Max number of results to return',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['getAllThreads']),
		options: [
			{
				displayName: 'Search Term',
				name: 'searchTerm',
				type: 'string',
				default: '',
				description: 'Search term to filter threads',
			},
		],
	},
];

function assignExtras(body: IDataObject, extras: IDataObject, listKeys: string[] = []) {
	for (const [key, value] of Object.entries(extras)) {
		if (value === '' || value === false) {
			continue;
		}
		body[key] = listKeys.includes(key) ? splitList(value as string) : value;
	}
}

export const messagingHandlers: Record<string, Handler> = {
	getConnectedAccounts: async function (this: IExecuteFunctions, itemIndex: number) {
		const accounts = await apiRequest<IDataObject[]>(this, 'GET', '/messaging/connected-accounts');
		return accounts.map((account) => ({ json: account, pairedItem: { item: itemIndex } }));
	},
	getAllThreads: async function (this: IExecuteFunctions, itemIndex: number) {
		return await searchAll(this, '/messaging/threads/search', itemIndex);
	},
	getThread: async function (this: IExecuteFunctions, itemIndex: number) {
		const threadId = this.getNodeParameter('threadId', itemIndex) as string;
		const response = await apiRequest(this, 'GET', `/messaging/threads/${threadId}`);
		return { json: response, pairedItem: { item: itemIndex } };
	},
	sendMessage: async function (this: IExecuteFunctions, itemIndex: number) {
		const threadId = this.getNodeParameter('threadId', itemIndex) as string;
		const text = this.getNodeParameter('text', itemIndex) as string;
		const response = await apiRequest(this, 'POST', `/messaging/threads/${threadId}/messages`, {
			text,
		});
		return { json: response, pairedItem: { item: itemIndex } };
	},
	sendEmail: async function (this: IExecuteFunctions, itemIndex: number) {
		const body: IDataObject = {
			to: splitList(this.getNodeParameter('to', itemIndex) as string).map((identifier) => ({
				identifier,
			})),
			subject: this.getNodeParameter('subject', itemIndex) as string,
			body: this.getNodeParameter('body', itemIndex) as string,
		};
		assignExtras(body, this.getNodeParameter('additionalFields', itemIndex, {}) as IDataObject, [
			'cc',
			'bcc',
		]);
		const response = await apiRequest(this, 'POST', '/messaging/send-email', body);
		return { json: response ?? {}, pairedItem: { item: itemIndex } };
	},
	startChat: async function (this: IExecuteFunctions, itemIndex: number) {
		const body: IDataObject = {
			connectedAccountId: this.getNodeParameter('connectedAccountId', itemIndex) as string,
			attendeeIdentifiers: splitList(
				this.getNodeParameter('attendeeIdentifiers', itemIndex) as string,
			),
			text: this.getNodeParameter('text', itemIndex) as string,
		};
		assignExtras(body, this.getNodeParameter('additionalFields', itemIndex, {}) as IDataObject);
		const response = await apiRequest(this, 'POST', '/messaging/start-chat', body);
		return { json: response, pairedItem: { item: itemIndex } };
	},
};
