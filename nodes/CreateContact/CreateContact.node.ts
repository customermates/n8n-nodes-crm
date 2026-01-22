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

export class CreateContact implements INodeType {
	methods = {
		loadOptions: {
			getUsers,
			getOrganizations,
			getDeals,
			getCustomColumns: getContactCustomColumns,
		},
	};
	description: INodeTypeDescription = {
		displayName: 'Create Contact',
		name: 'createContact',
		icon: 'file:../../static/customermates.svg',
		group: ['transform'],
		version: 1,
		description: 'Create a new contact in Customermates',
		defaults: {
			name: 'Create Contact',
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
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				required: true,
				default: '',
				description: 'The first name of the contact',
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				required: true,
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
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				placeholder: 'Add Field',
				description: 'Custom field values for the contact',
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
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const credentials = await this.getCredentials('customermatesApi');
				const firstName = this.getNodeParameter('firstName', itemIndex, '') as string;
				const lastName = this.getNodeParameter('lastName', itemIndex, '') as string;
				const organizationIds = this.getNodeParameter('organizationIds', itemIndex, []) as string[];
				const userIds = this.getNodeParameter('userIds', itemIndex, []) as string[];
				const dealIds = this.getNodeParameter('dealIds', itemIndex, []) as string[];
				
				const customFieldValuesParam = this.getNodeParameter(
					'customFieldValues',
					itemIndex,
					{},
				) as {
					field?: Array<{
						columnId: string;
						value: string;
					}>;
				};
				const customFieldValues = customFieldValuesParam?.field || [];

				type CreateRequest = NonNullable<
					paths['/v1/contacts']['post']['requestBody']
				>['content']['application/json'];
				type CreateSuccessResponse =
					paths['/v1/contacts']['post']['responses']['201']['content']['application/json'];

				const requestBody: CreateRequest = {
					firstName,
					lastName,
					organizationIds: organizationIds || [],
					userIds: userIds || [],
					dealIds: dealIds || [],
					customFieldValues: customFieldValues || [],
				};

				try {
					const response = (await this.helpers.httpRequest({
						method: 'POST',
						url: `${BASE_URL}/api/v1/contacts`,
						headers: {
							'x-api-key': credentials.apiKey,
							'Content-Type': 'application/json',
							Accept: 'application/json',
						},
						body: requestBody,
						json: true,
					})) as CreateSuccessResponse;

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
