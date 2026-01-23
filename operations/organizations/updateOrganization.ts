import type {
	IExecuteFunctions,
	ICredentialDataDecryptedObject,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { BASE_URL } from '../../constants';
import type { paths } from '../../lib/generated/types';

type UpdateRequest = NonNullable<
	paths['/v1/organizations/{id}']['put']['requestBody']
>['content']['application/json'];
type UpdateSuccessResponse =
	paths['/v1/organizations/{id}']['put']['responses']['200']['content']['application/json'];

export async function updateOrganization(
	this: IExecuteFunctions,
	itemIndex: number,
	credentials: ICredentialDataDecryptedObject,
): Promise<INodeExecutionData> {
	const organizationId = this.getNodeParameter('organizationId', itemIndex) as string;
	const updateFields = this.getNodeParameter('updateFields', itemIndex, {}) as {
		name?: string;
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

	const requestBody: UpdateRequest = {};

	if (updateFields.name !== undefined) {
		requestBody.name = updateFields.name;
	}
	if (updateFields.contactIds !== undefined) {
		requestBody.contactIds = updateFields.contactIds;
	}
	if (updateFields.userIds !== undefined) {
		requestBody.userIds = updateFields.userIds;
	}
	if (updateFields.dealIds !== undefined) {
		requestBody.dealIds = updateFields.dealIds;
	}
	if (updateFields.customFieldValues?.field !== undefined) {
		const seenColumnIds = new Set<string>();
		requestBody.customFieldValues = updateFields.customFieldValues.field.filter((field) => {
			if (seenColumnIds.has(field.columnId)) {
				return false;
			}
			seenColumnIds.add(field.columnId);
			return true;
		});
	}

	if (Object.keys(requestBody).length === 0) {
		throw new NodeOperationError(
			this.getNode(),
			'At least one field must be provided in Update Fields to update the organization',
			{ itemIndex },
		);
	}

	const response = (await this.helpers.httpRequest({
		method: 'PUT',
		url: `${BASE_URL}/api/v1/organizations/${organizationId}`,
		headers: {
			'x-api-key': credentials.apiKey as string,
			'Content-Type': 'application/json',
			Accept: 'application/json',
		},
		body: requestBody,
		json: true,
	})) as UpdateSuccessResponse;

	return {
		json: response,
		pairedItem: { item: itemIndex },
	};
}

export const updateOrganizationProperties: INodeProperties[] = [
	{
		displayName: 'ID',
		name: 'organizationId',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['organization'],
			},
		},
		default: '',
		required: true,
		description: 'The unique identifier (UUID) of the organization to update',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['organization'],
			},
		},
		default: {},
		description: 'Fields to update on the organization',
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'The name of the organization',
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
				placeholder: 'Add Custom Field',
				description: 'Adds a custom field value to set also values which have not been predefined',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'field',
						displayName: 'Field',
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
