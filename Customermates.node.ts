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
	loadContactOptions,
	loadServiceOptions,
	loadContactCustomColumnOptions,
	loadOrganizationCustomColumnOptions,
	loadDealCustomColumnOptions,
	loadServiceCustomColumnOptions,
	loadTaskCustomColumnOptions,
} from './operations/options';
import {
	createContact,
	createContactProperties,
	deleteContact,
	deleteContactProperties,
	getContact,
	getContactProperties,
	getAllContacts,
	getAllContactsProperties,
	updateContact,
	updateContactProperties,
} from './operations/contacts';
import {
	createOrganization,
	createOrganizationProperties,
	deleteOrganization,
	deleteOrganizationProperties,
	getOrganization,
	getOrganizationProperties,
	getAllOrganizations,
	getAllOrganizationsProperties,
	updateOrganization,
	updateOrganizationProperties,
} from './operations/organizations';
import {
	createDeal,
	createDealProperties,
	deleteDeal,
	deleteDealProperties,
	getDeal,
	getDealProperties,
	getAllDeals,
	getAllDealsProperties,
	updateDeal,
	updateDealProperties,
} from './operations/deals';
import {
	createService,
	createServiceProperties,
	deleteService,
	deleteServiceProperties,
	getService,
	getServiceProperties,
	getAllServices,
	getAllServicesProperties,
	updateService,
	updateServiceProperties,
} from './operations/services';
import {
	createTask,
	createTaskProperties,
	deleteTask,
	deleteTaskProperties,
	getTask,
	getTaskProperties,
	getAllTasks,
	getAllTasksProperties,
	updateTask,
	updateTaskProperties,
} from './operations/tasks';

export class Customermates implements INodeType {
	methods = {
		loadOptions: {
			loadUserOptions,
			loadOrganizationOptions,
			loadDealOptions,
			loadContactOptions,
			loadServiceOptions,
			loadContactCustomColumnOptions,
			loadOrganizationCustomColumnOptions,
			loadDealCustomColumnOptions,
			loadServiceCustomColumnOptions,
			loadTaskCustomColumnOptions,
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
					{
						name: 'Organization',
						value: 'organization',
					},
					{
						name: 'Deal',
						value: 'deal',
					},
					{
						name: 'Service',
						value: 'service',
					},
					{
						name: 'Task',
						value: 'task',
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
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['organization'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create an organization',
						action: 'Create an organization',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete an organization',
						action: 'Delete an organization',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get data of an organization',
						action: 'Get an organization',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get data of many organizations',
						action: 'Get many organizations',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update an organization',
						action: 'Update an organization',
					},
				],
				default: 'create',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['deal'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a deal',
						action: 'Create a deal',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a deal',
						action: 'Delete a deal',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get data of a deal',
						action: 'Get a deal',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get data of many deals',
						action: 'Get many deals',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a deal',
						action: 'Update a deal',
					},
				],
				default: 'create',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['service'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a service',
						action: 'Create a service',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a service',
						action: 'Delete a service',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get data of a service',
						action: 'Get a service',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get data of many services',
						action: 'Get many services',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a service',
						action: 'Update a service',
					},
				],
				default: 'create',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['task'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a task',
						action: 'Create a task',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a task',
						action: 'Delete a task',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get data of a task',
						action: 'Get a task',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get data of many tasks',
						action: 'Get many tasks',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a task',
						action: 'Update a task',
					},
				],
				default: 'create',
			},
			...createContactProperties,
			...deleteContactProperties,
			...getContactProperties,
			...getAllContactsProperties,
			...updateContactProperties,
			...createOrganizationProperties,
			...deleteOrganizationProperties,
			...getOrganizationProperties,
			...getAllOrganizationsProperties,
			...updateOrganizationProperties,
			...createDealProperties,
			...deleteDealProperties,
			...getDealProperties,
			...getAllDealsProperties,
			...updateDealProperties,
			...createServiceProperties,
			...deleteServiceProperties,
			...getServiceProperties,
			...getAllServicesProperties,
			...updateServiceProperties,
			...createTaskProperties,
			...deleteTaskProperties,
			...getTaskProperties,
			...getAllTasksProperties,
			...updateTaskProperties,
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
				} else if (resource === 'organization') {
					if (operation === 'create') {
						const result = await createOrganization.call(this, i, credentials);
						returnData.push(result);
					} else if (operation === 'delete') {
						const result = await deleteOrganization.call(this, i, credentials);
						returnData.push(result);
					} else if (operation === 'get') {
						const result = await getOrganization.call(this, i, credentials);
						returnData.push(result);
					} else if (operation === 'getAll') {
						const results = await getAllOrganizations.call(this, i, credentials);
						returnData.push(...results);
					} else if (operation === 'update') {
						const result = await updateOrganization.call(this, i, credentials);
						returnData.push(result);
					} else {
						throw new NodeOperationError(
							this.getNode(),
							`The operation "${operation}" is not known!`,
							{ itemIndex: i },
						);
					}
				} else if (resource === 'deal') {
					if (operation === 'create') {
						const result = await createDeal.call(this, i, credentials);
						returnData.push(result);
					} else if (operation === 'delete') {
						const result = await deleteDeal.call(this, i, credentials);
						returnData.push(result);
					} else if (operation === 'get') {
						const result = await getDeal.call(this, i, credentials);
						returnData.push(result);
					} else if (operation === 'getAll') {
						const results = await getAllDeals.call(this, i, credentials);
						returnData.push(...results);
					} else if (operation === 'update') {
						const result = await updateDeal.call(this, i, credentials);
						returnData.push(result);
					} else {
						throw new NodeOperationError(
							this.getNode(),
							`The operation "${operation}" is not known!`,
							{ itemIndex: i },
						);
					}
				} else if (resource === 'service') {
					if (operation === 'create') {
						const result = await createService.call(this, i, credentials);
						returnData.push(result);
					} else if (operation === 'delete') {
						const result = await deleteService.call(this, i, credentials);
						returnData.push(result);
					} else if (operation === 'get') {
						const result = await getService.call(this, i, credentials);
						returnData.push(result);
					} else if (operation === 'getAll') {
						const results = await getAllServices.call(this, i, credentials);
						returnData.push(...results);
					} else if (operation === 'update') {
						const result = await updateService.call(this, i, credentials);
						returnData.push(result);
					} else {
						throw new NodeOperationError(
							this.getNode(),
							`The operation "${operation}" is not known!`,
							{ itemIndex: i },
						);
					}
				} else if (resource === 'task') {
					if (operation === 'create') {
						const result = await createTask.call(this, i, credentials);
						returnData.push(result);
					} else if (operation === 'delete') {
						const result = await deleteTask.call(this, i, credentials);
						returnData.push(result);
					} else if (operation === 'get') {
						const result = await getTask.call(this, i, credentials);
						returnData.push(result);
					} else if (operation === 'getAll') {
						const results = await getAllTasks.call(this, i, credentials);
						returnData.push(...results);
					} else if (operation === 'update') {
						const result = await updateTask.call(this, i, credentials);
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
