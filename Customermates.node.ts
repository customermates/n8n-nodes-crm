import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { BASE_URL } from './constants';
import {
	loadUserOptions,
	loadOrganizationOptions,
	loadDealOptions,
	loadContactCustomColumnOptions,
} from './operations/options';
import {
	createContact,
	deleteContact,
	getContact,
	getAllContacts,
	updateContact,
} from './operations/contacts';
import { createProperties } from './operations/contacts/create.properties';
import { deleteProperties } from './operations/contacts/delete.properties';
import { getProperties } from './operations/contacts/get.properties';
import { getAllProperties } from './operations/contacts/getAll.properties';
import { updateProperties } from './operations/contacts/update.properties';

export class Customermates implements INodeType {
	methods = {
		loadOptions: {
			loadUserOptions,
			loadOrganizationOptions,
			loadDealOptions,
			loadContactCustomColumnOptions,
		},
	};

	description: INodeTypeDescription = {
		displayName: 'Customermates',
		name: 'customermates',
		icon: 'file:customermates.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Create and edit data in Customermates',
		defaults: {
			name: 'Customermates',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'customermatesApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: BASE_URL,
			url: '',
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Contact',
						value: 'contact',
					},
				],
				default: 'contact',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['contact'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a contact',
						action: 'Create a contact',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a contact',
						action: 'Delete a contact',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get data of a contact',
						action: 'Get a contact',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get data of many contacts',
						action: 'Get many contacts',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a contact',
						action: 'Update a contact',
					},
				],
				default: 'create',
			},
			...createProperties,
			...deleteProperties,
			...getProperties,
			...getAllProperties,
			...updateProperties,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				const credentials = await this.getCredentials('customermatesApi');

				if (resource === 'contact') {
					if (operation === 'create') {
						const result = await createContact.call(this, i, credentials);
						returnData.push(result);
					} else if (operation === 'delete') {
						const result = await deleteContact.call(this, i, credentials);
						returnData.push(result);
					} else if (operation === 'get') {
						const result = await getContact.call(this, i, credentials);
						returnData.push(result);
					} else if (operation === 'getAll') {
						const results = await getAllContacts.call(this, i, credentials);
						returnData.push(...results);
					} else if (operation === 'update') {
						const result = await updateContact.call(this, i, credentials);
						returnData.push(result);
					} else {
						throw new NodeOperationError(
							this.getNode(),
							`The operation "${operation}" is not known!`,
							{ itemIndex: i },
						);
					}
				} else {
					throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known!`, {
						itemIndex: i,
					});
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: error.response.data || error.message },
						pairedItem: { item: i },
					});
					continue;
				}
				if (error.context) {
					error.context.itemIndex = i;
					throw error;
				}
				throw new NodeOperationError(this.getNode(), error.response.data || error.message, {
					itemIndex: i,
				});
			}
		}

		return [returnData];
	}
}
