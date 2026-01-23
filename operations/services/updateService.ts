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
	paths['/v1/services/{id}']['put']['requestBody']
>['content']['application/json'];
type UpdateSuccessResponse =
	paths['/v1/services/{id}']['put']['responses']['200']['content']['application/json'];

export async function updateService(
	this: IExecuteFunctions,
	itemIndex: number,
	credentials: ICredentialDataDecryptedObject,
): Promise<INodeExecutionData> {
	const serviceId = this.getNodeParameter('serviceId', itemIndex) as string;
	const updateFields = this.getNodeParameter('updateFields', itemIndex, {}) as {
		name?: string;
		amount?: number;
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
	if (updateFields.amount !== undefined) {
		requestBody.amount = updateFields.amount;
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
			'At least one field must be provided in Update Fields to update the service',
			{ itemIndex },
		);
	}

	const response = (await this.helpers.httpRequest({
		method: 'PUT',
		url: `${BASE_URL}/api/v1/services/${serviceId}`,
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

export const updateServiceProperties: INodeProperties[] = [
	{
		displayName: 'ID',
		name: 'serviceId',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['service'],
			},
		},
		default: '',
		required: true,
		description: 'The unique identifier (UUID) of the service to update',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['service'],
			},
		},
		default: {},
		description: 'Fields to update on the service',
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'The name of the service',
			},
			{
				displayName: 'Amount',
				name: 'amount',
				type: 'number',
				default: 0,
				description: 'The amount/price of the service',
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
					'The users to associate with this service. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
					'The deals to associate with this service. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
									loadOptionsMethod: 'loadServiceCustomColumnOptions',
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
