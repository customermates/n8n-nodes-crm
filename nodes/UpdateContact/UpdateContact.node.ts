import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { BASE_URL } from '../../constants';
import type { paths } from '../../lib/generated/types';
import { getUsers } from '../shared/getUsers';
import { getOrganizations } from '../shared/getOrganizations';
import { getDeals } from '../shared/getDeals';
import { getContactCustomColumns } from '../shared/getContactCustomColumns';

export class UpdateContact implements INodeType {
	methods = {
		loadOptions: {
			getUsers,
			getOrganizations,
			getDeals,
			getCustomColumns: getContactCustomColumns,
		},
	};
	description: INodeTypeDescription = {
		displayName: 'Update Contact',
		name: 'updateContact',
		icon: 'file:../../static/customermates.svg',
		group: ['transform'],
		version: 1,
		description: 'Update an existing contact in Customermates',
		defaults: {
			name: 'Update Contact',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'customermatesApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Contact ID',
				name: 'contactId',
				type: 'string',
				default: '',
				description: 'The unique identifier (UUID) of the contact to update',
			},
			{
				displayName: 'Update Fields',
				name: 'updateFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				description: 'Fields to update on the contact',
				// eslint-disable-next-line n8n-nodes-base/node-param-collection-type-unsorted-items
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
						displayName: 'Organization Names or IDs',
						name: 'organizationIds',
						type: 'multiOptions',
						typeOptions: {
							loadOptionsMethod: 'getOrganizations',
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
							loadOptionsMethod: 'getUsers',
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
							loadOptionsMethod: 'getDeals',
						},
						default: [],
						description:
							'The deals to associate with this contact. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
											loadOptionsMethod: 'getCustomColumns',
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
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const credentials = await this.getCredentials('customermatesApi');
				const contactId = this.getNodeParameter('contactId', itemIndex, '') as string;

				const updateFields = this.getNodeParameter('updateFields', itemIndex, {}) as {
					firstName?: string;
					lastName?: string;
					organizationIds?: string[];
					userIds?: string[];
					dealIds?: string[];
					customFieldValues?: {
						field?: Array<{
							columnId: string;
							value: string;
						}>;
					};
				};

				type UpdateRequest = NonNullable<
					paths['/v1/contacts/{id}']['put']['requestBody']
				>['content']['application/json'];
				type UpdateSuccessResponse =
					paths['/v1/contacts/{id}']['put']['responses']['200']['content']['application/json'];

				const requestBody: UpdateRequest = {};

				if (updateFields.firstName !== undefined) {
					requestBody.firstName = updateFields.firstName;
				}
				if (updateFields.lastName !== undefined) {
					requestBody.lastName = updateFields.lastName;
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

				try {
					const response = (await this.helpers.httpRequest({
						method: 'PUT',
						url: `${BASE_URL}/api/v1/contacts/${contactId}`,
						headers: {
							'x-api-key': credentials.apiKey,
							'Content-Type': 'application/json',
							Accept: 'application/json',
						},
						body: requestBody,
						json: true,
					})) as UpdateSuccessResponse;

					if (response) {
						const result: INodeExecutionData = {
							json: response,
							pairedItem: { item: itemIndex },
						};

						returnData.push(result);
					}
				} catch (error) {
					throw new NodeOperationError(this.getNode(), error.response?.data || error.message);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: error.message },
						pairedItem: { item: itemIndex },
					});
				} else {
					if (error.context) {
						error.context.itemIndex = itemIndex;
						throw error;
					}

					throw new NodeOperationError(this.getNode(), error, {
						itemIndex,
					});
				}
			}
		}

		return [returnData];
	}
}
