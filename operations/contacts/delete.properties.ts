import type { INodeProperties } from 'n8n-workflow';

export const deleteProperties: INodeProperties[] = [
	{
		displayName: 'ID',
		name: 'contactId',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['delete'],
				resource: ['contact'],
			},
		},
		default: '',
		required: true,
		description: 'The unique identifier (UUID) of the contact to delete',
	},
];
