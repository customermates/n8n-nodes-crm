import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import type { Handler } from './helpers/api';
import { listHandlers, listProperties } from './operations/lists';
import { messagingHandlers, messagingProperties } from './operations/messaging';
import { loadOptions } from './operations/options';
import { recordHandlers, recordProperties } from './operations/records';
import { socialRelationHandlers, socialRelationProperties } from './operations/socialRelations';
import { trashHandlers, trashProperties } from './operations/trash';

const handlers: Record<string, Record<string, Handler>> = {
	list: listHandlers,
	messaging: messagingHandlers,
	record: recordHandlers,
	socialRelation: socialRelationHandlers,
	trash: trashHandlers,
};

const LEGACY_RESOURCES = ['contact', 'deal', 'organization', 'service', 'task'];

export class Customermates implements INodeType {
	methods = { loadOptions };

	description: INodeTypeDescription = {
		displayName: 'Customermates',
		name: 'customermates',
		icon: 'file:customermates.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Create, find and edit records of any list in Customermates',
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
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'List',
						value: 'list',
						description: 'The lists (record types) of the workspace and their fields',
					},
					{
						name: 'Messaging',
						value: 'messaging',
					},
					{
						name: 'Record',
						value: 'record',
						description: 'Records of any list, such as contacts, deals or your own lists',
					},
					{
						name: 'Social Relation',
						value: 'socialRelation',
					},
					{
						name: 'Trash',
						value: 'trash',
					},
				],
				default: 'record',
			},
			...recordProperties,
			...listProperties,
			...messagingProperties,
			...socialRelationProperties,
			...trashProperties,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		if (LEGACY_RESOURCES.includes(resource)) {
			throw new NodeOperationError(
				this.getNode(),
				`The "${resource}" resource was removed in version 2 of this node`,
				{
					description:
						'Version 2 of the Customermates node replaced the Contact, Deal, Organization, Service and Task resources with the Record resource, because the Customermates API now serves every list through one record API. Choose Resource "Record" and pick the list; see "Migrating from version 1" in the package README.',
				},
			);
		}
		const operation = this.getNodeParameter('operation', 0) as string;
		const handler = handlers[resource]?.[operation];
		if (!handler) {
			throw new NodeOperationError(
				this.getNode(),
				`The operation "${operation}" is not known for resource "${resource}"!`,
			);
		}

		for (let i = 0; i < items.length; i++) {
			try {
				const result = await handler.call(this, i);
				returnData.push(...(Array.isArray(result) ? result : [result]));
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw error instanceof NodeOperationError || error instanceof NodeApiError
					? error
					: new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
