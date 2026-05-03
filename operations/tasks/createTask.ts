import type {
	IExecuteFunctions,
	ICredentialDataDecryptedObject,
	IDataObject,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { getBaseURL } from '../../helpers/getBaseURL';
import type { paths } from '../../lib/generated/types';

type CreateRequest = NonNullable<
	paths['/v1/tasks']['post']['requestBody']
>['content']['application/json'];
type CreateSuccessResponse =
	paths['/v1/tasks']['post']['responses']['201']['content']['application/json'];

export async function createTask(
	this: IExecuteFunctions,
	itemIndex: number,
	credentials: ICredentialDataDecryptedObject,
): Promise<INodeExecutionData> {
	const name = this.getNodeParameter('name', itemIndex) as string;
	const additionalFields = this.getNodeParameter('additionalFields', itemIndex, {}) as {
		userIds?: string[];
		contactIds?: string[];
		organizationIds?: string[];
		dealIds?: string[];
		serviceIds?: string[];
		customFieldValues?: {
			field?: Array<{
				columnId: string;
				value: string;
			}>;
		};
	};

	const requestBody: CreateRequest = {
		name,
		userIds: additionalFields.userIds || [],
		contactIds: additionalFields.contactIds || [],
		organizationIds: additionalFields.organizationIds || [],
		dealIds: additionalFields.dealIds || [],
		serviceIds: additionalFields.serviceIds || [],
		customFieldValues: additionalFields.customFieldValues?.field || [],
	};

	const response = (await this.helpers.httpRequest({
		method: 'POST',
		url: `${getBaseURL(credentials)}/api/v1/tasks`,
		headers: {
			'x-api-key': credentials.apiKey as string,
			'Content-Type': 'application/json',
			Accept: 'application/json',
		},
		body: requestBody,
		json: true,
	})) as CreateSuccessResponse;

	return {
		json: response as IDataObject,
		pairedItem: { item: itemIndex },
	};
}

export const createTaskProperties: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['task'],
			},
		},
		description: 'The name of the task',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['task'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'User Names or IDs',
				name: 'userIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'loadUserOptions',
				},
				default: [],
				description:
					'The users to associate with this task. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
					'The contacts to associate with this task. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Organization Names or IDs',
				name: 'organizationIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'loadOrganizationOptions',
				},
				default: [],
				description:
					'The organizations to associate with this task. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
					'The deals to associate with this task. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Service Names or IDs',
				name: 'serviceIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'loadServiceOptions',
				},
				default: [],
				description:
					'The services to associate with this task. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
				description: 'Custom field values for the task',
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
									loadOptionsMethod: 'loadTaskCustomColumnOptions',
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
