import type {
	IExecuteFunctions,
	ICredentialDataDecryptedObject,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { BASE_URL } from '../../constants';
import type { paths } from '../../lib/generated/types';

type CreateRequest = NonNullable<
	paths['/v1/organizations']['post']['requestBody']
>['content']['application/json'];
type CreateSuccessResponse =
	paths['/v1/organizations']['post']['responses']['201']['content']['application/json'];

export async function createOrganization(
	this: IExecuteFunctions,
	itemIndex: number,
	credentials: ICredentialDataDecryptedObject,
): Promise<INodeExecutionData> {
	const name = this.getNodeParameter('name', itemIndex) as string;
	const additionalFields = this.getNodeParameter('additionalFields', itemIndex, {}) as {
		contactIds?: string[];
		userIds?: string[];
		dealIds?: string[];
		customFieldValues?: {
			field?: Array<{
				columnId: string;
				value: string;
			}>;
		};
	};

	const requestBody: CreateRequest = {
		name,
		contactIds: additionalFields.contactIds || [],
		userIds: additionalFields.userIds || [],
		dealIds: additionalFields.dealIds || [],
		customFieldValues: additionalFields.customFieldValues?.field || [],
	};

	const response = (await this.helpers.httpRequest({
		method: 'POST',
		url: `${BASE_URL}/api/v1/organizations`,
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

export const createOrganizationProperties: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['organization'],
			},
		},
		description: 'The name of the organization',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['organization'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Contact Names or IDs',
				name: 'contactIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'loadContactOptions',
				},
				default: [],
				description:
					'The contacts to associate with this organization. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
					'The users to associate with this organization. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Deal Names or IDs',
				name: 'dealIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'loadDealOptions',
				},
				default: [],
				description:
					'The deals to associate with this organization. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
				description: 'Custom field values for the organization',
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
									loadOptionsMethod: 'loadOrganizationCustomColumnOptions',
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
