import type {
	IExecuteFunctions,
	ICredentialDataDecryptedObject,
	IDataObject,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { getBaseURL } from '../../helpers/getBaseURL';
import type { paths } from '../../lib/generated/types';

type UpdateRequest = NonNullable<
	paths['/v1/contacts/{id}']['put']['requestBody']
>['content']['application/json'];
type UpdateSuccessResponse =
	paths['/v1/contacts/{id}']['put']['responses']['200']['content']['application/json'];

export async function updateContact(
	this: IExecuteFunctions,
	itemIndex: number,
	credentials: ICredentialDataDecryptedObject,
): Promise<INodeExecutionData> {
	const contactId = this.getNodeParameter('contactId', itemIndex) as string;
	const updateFields = this.getNodeParameter('updateFields', itemIndex, {}) as {
		firstName?: string;
		lastName?: string;
		emails?: string;
		organizationIds?: string[];
		userIds?: string[];
		dealIds?: string[];
		taskIds?: string[];
		customFieldValues?: {
			field?: Array<{
				columnId: string;
				value: string;
			}>;
		};
	};

	const requestBody: UpdateRequest = {};

	if (updateFields.firstName !== undefined) {
		requestBody.firstName = updateFields.firstName;
	}
	if (updateFields.lastName !== undefined) {
		requestBody.lastName = updateFields.lastName;
	}
	if (updateFields.emails !== undefined) {
		requestBody.emails = updateFields.emails
			.split(',')
			.map((email) => email.trim())
			.filter((email) => email.length > 0);
	}
	if (updateFields.organizationIds !== undefined) {
		requestBody.organizationIds = updateFields.organizationIds;
	}
	if (updateFields.userIds !== undefined) {
		requestBody.userIds = updateFields.userIds;
	}
	if (updateFields.dealIds !== undefined) {
		requestBody.dealIds = updateFields.dealIds;
	}
	if (updateFields.taskIds !== undefined) {
		requestBody.taskIds = updateFields.taskIds;
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
			'At least one field must be provided in Update Fields to update the contact',
			{ itemIndex },
		);
	}

	const response = (await this.helpers.httpRequest({
		method: 'PUT',
		url: `${getBaseURL(credentials)}/api/v1/contacts/${contactId}`,
		headers: {
			'x-api-key': credentials.apiKey as string,
			'Content-Type': 'application/json',
			Accept: 'application/json',
		},
		body: requestBody,
		json: true,
	})) as UpdateSuccessResponse;

	return {
		json: response as IDataObject,
		pairedItem: { item: itemIndex },
	};
}

export const updateContactProperties: INodeProperties[] = [
	{
		displayName: 'ID',
		name: 'contactId',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['contact'],
			},
		},
		default: '',
		required: true,
		description: 'The unique identifier (UUID) of the contact to update',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['contact'],
			},
		},
		default: {},
		description: 'Fields to update on the contact',
		options: [
			{
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				default: '',
				description: 'The first name of the contact',
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				default: '',
				description: 'The last name of the contact',
			},
			{
				displayName: 'Emails',
				name: 'emails',
				type: 'string',
				default: '',
				placeholder: 'jane@example.com, jane.smith@example.com',
				description: 'Comma-separated list of email addresses for this contact',
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
					'The organizations to associate with this contact. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
					'The users to associate with this contact. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
					'The deals to associate with this contact. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Task Names or IDs',
				name: 'taskIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'loadTaskOptions',
				},
				default: [],
				description:
					'The tasks to associate with this contact. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
									loadOptionsMethod: 'loadContactCustomColumnOptions',
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
