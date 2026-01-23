import type {
	IExecuteFunctions,
	ICredentialDataDecryptedObject,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { BASE_URL } from '../../constants';
import type { paths } from '../../lib/generated/types';

type CreateRequest = NonNullable<
	paths['/v1/deals']['post']['requestBody']
>['content']['application/json'];
type CreateSuccessResponse =
	paths['/v1/deals']['post']['responses']['201']['content']['application/json'];

export async function createDeal(
	this: IExecuteFunctions,
	itemIndex: number,
	credentials: ICredentialDataDecryptedObject,
): Promise<INodeExecutionData> {
	const name = this.getNodeParameter('name', itemIndex) as string;
	const additionalFields = this.getNodeParameter('additionalFields', itemIndex, {}) as {
		organizationIds?: string[];
		userIds?: string[];
		contactIds?: string[];
		services?: {
			service?: Array<{
				serviceId: string;
				quantity: number;
			}>;
		};
		customFieldValues?: {
			field?: Array<{
				columnId: string;
				value: string;
			}>;
		};
	};

	const requestBody: CreateRequest = {
		name,
		organizationIds: additionalFields.organizationIds || [],
		userIds: additionalFields.userIds || [],
		contactIds: additionalFields.contactIds || [],
		services: additionalFields.services?.service || [],
		customFieldValues: additionalFields.customFieldValues?.field || [],
	};

	const response = (await this.helpers.httpRequest({
		method: 'POST',
		url: `${BASE_URL}/api/v1/deals`,
		headers: {
			'x-api-key': credentials.apiKey as string,
			'Content-Type': 'application/json',
			Accept: 'application/json',
		},
		body: requestBody,
		json: true,
	})) as CreateSuccessResponse;

	return {
		json: response,
		pairedItem: { item: itemIndex },
	};
}

export const createDealProperties: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['deal'],
			},
		},
		description: 'The name of the deal',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['deal'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Organization Names or IDs',
				name: 'organizationIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'loadOrganizationOptions',
				},
				default: [],
				description:
					'The organizations to associate with this deal. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'User Names or IDs',
				name: 'userIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'loadUserOptions',
				},
				default: [],
				description:
					'The users to associate with this deal. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Contact Names or IDs',
				name: 'contactIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'loadContactOptions',
				},
				default: [],
				description:
					'The contacts to associate with this deal. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Services',
				name: 'services',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				placeholder: 'Add Service',
				description: 'Services to include in this deal',
				options: [
					{
						displayName: 'Service',
						name: 'service',
						values: [
							{
								displayName: 'Service Name or ID',
								name: 'serviceId',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'loadServiceOptions',
								},
								default: '',
								required: true,
								description:
									'The service to add. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
							},
							{
								displayName: 'Quantity',
								name: 'quantity',
								type: 'number',
								default: 1,
								description: 'The quantity of this service',
							},
						],
					},
				],
			},
			{
				displayName: 'Custom Field Values',
				name: 'customFieldValues',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				placeholder: 'Add Field',
				description: 'Custom field values for the deal',
				options: [
					{
						displayName: 'Field',
						name: 'field',
						values: [
							{
								displayName: 'Custom Column Name or ID',
								name: 'columnId',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'loadDealCustomColumnOptions',
								},
								default: '',
								required: true,
								description:
									'The custom column to set a value for. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'The value for this custom field (always a string)',
							},
						],
					},
				],
			},
		],
	},
];
