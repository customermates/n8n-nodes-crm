import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { apiRequest } from '../helpers/api';
import type { Handler } from './entities';

const show = (operation: string[]) => ({ show: { resource: ['socialRelation'], operation } });

export const socialRelationProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['socialRelation'] } },
		options: [
			{
				name: 'Accept Invitation',
				value: 'accept',
				description: 'Accept a received relation request',
				action: 'Accept an invitation',
			},
			{
				name: 'Cancel Invitation',
				value: 'cancel',
				description: 'Withdraw a sent or refuse a received relation request',
				action: 'Cancel an invitation',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get relation requests received or sent by a connected account',
				action: 'Get many invitations',
			},
			{
				name: 'Send Invitation',
				value: 'invite',
				description: 'Send a connection / relation request from a connected account',
				action: 'Send an invitation',
			},
		],
		default: 'getAll',
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
		displayOptions: show(['accept', 'cancel', 'getAll', 'invite']),
		description:
			'The connected LinkedIn or Instagram account. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Invitation ID',
		name: 'invitationId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: show(['accept', 'cancel']),
		description: 'The provider ID of the invitation, as returned by Get Many',
	},
	{
		displayName: 'Identifier',
		name: 'identifier',
		type: 'string',
		default: '',
		required: true,
		displayOptions: show(['invite']),
		description:
			'Provider-internal ID of the person to invite (e.g. the messaging ID of a contact channel)',
	},
	{
		displayName: 'Message',
		name: 'message',
		type: 'string',
		default: '',
		displayOptions: show(['invite']),
		description: 'Optional short message to include with the invitation (max 300 characters)',
	},
	{
		displayName: 'Direction',
		name: 'direction',
		type: 'options',
		options: [
			{ name: 'Received', value: 'received' },
			{ name: 'Sent', value: 'sent' },
		],
		default: 'received',
		displayOptions: show(['getAll']),
		description: 'Whether to list received or sent relation requests',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: show(['getAll']),
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
			show: { resource: ['socialRelation'], operation: ['getAll'], returnAll: [false] },
		},
		description: 'Max number of results to return',
	},
];

export const socialRelationHandlers: Record<string, Handler> = {
	accept: async function (this: IExecuteFunctions, itemIndex: number) {
		const response = await apiRequest(this, 'POST', '/messaging/social-relations/accept', {
			connectedAccountId: this.getNodeParameter('connectedAccountId', itemIndex) as string,
			invitationId: this.getNodeParameter('invitationId', itemIndex) as string,
		});
		return { json: response, pairedItem: { item: itemIndex } };
	},
	cancel: async function (this: IExecuteFunctions, itemIndex: number) {
		const response = await apiRequest(this, 'POST', '/messaging/social-relations/cancel', {
			connectedAccountId: this.getNodeParameter('connectedAccountId', itemIndex) as string,
			invitationId: this.getNodeParameter('invitationId', itemIndex) as string,
		});
		return { json: response, pairedItem: { item: itemIndex } };
	},
	getAll: async function (this: IExecuteFunctions, itemIndex: number) {
		const connectedAccountId = this.getNodeParameter('connectedAccountId', itemIndex) as string;
		const direction = this.getNodeParameter('direction', itemIndex) as string;
		const returnAll = this.getNodeParameter('returnAll', itemIndex) as boolean;
		const limit = returnAll
			? Number.POSITIVE_INFINITY
			: (this.getNodeParameter('limit', itemIndex) as number);
		const results: INodeExecutionData[] = [];
		let cursor: string | undefined;

		for (;;) {
			const body: IDataObject = {
				connectedAccountId,
				direction,
				limit: Math.min(100, limit - results.length),
			};
			if (cursor) {
				body.cursor = cursor;
			}
			const response = await apiRequest(this, 'POST', '/messaging/social-relations/search', body);
			for (const item of (response.data as IDataObject[]) ?? []) {
				if (results.length >= limit) {
					return results;
				}
				results.push({ json: item, pairedItem: { item: itemIndex } });
			}
			cursor = (response.next_cursor as string | null) ?? undefined;
			if (!cursor || results.length >= limit) {
				return results;
			}
		}
	},
	invite: async function (this: IExecuteFunctions, itemIndex: number) {
		const body: IDataObject = {
			connectedAccountId: this.getNodeParameter('connectedAccountId', itemIndex) as string,
			identifier: this.getNodeParameter('identifier', itemIndex) as string,
		};
		const message = this.getNodeParameter('message', itemIndex, '') as string;
		if (message) {
			body.message = message;
		}
		const response = await apiRequest(this, 'POST', '/messaging/social-relations/invite', body);
		return { json: response, pairedItem: { item: itemIndex } };
	},
};
