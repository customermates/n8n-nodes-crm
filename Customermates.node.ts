import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import type { Handler } from './operations/entities';
import { entityHandlers, entityProperties } from './operations/entities';
import { messagingHandlers, messagingProperties } from './operations/messaging';
import { loadOptions } from './operations/options';
import { socialRelationHandlers, socialRelationProperties } from './operations/socialRelations';

const handlers: Record<string, Record<string, Handler>> = {
	...entityHandlers,
	messaging: messagingHandlers,
	socialRelation: socialRelationHandlers,
};

export class Customermates implements INodeType {
	methods = { loadOptions };

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
						name: 'Deal',
						value: 'deal',
					},
					{
						name: 'Messaging',
						value: 'messaging',
					},
					{
						name: 'Organization',
						value: 'organization',
					},
					{
						name: 'Service',
						value: 'service',
					},
					{
						name: 'Social Relation',
						value: 'socialRelation',
					},
					{
						name: 'Task',
						value: 'task',
					},
				],
				default: 'contact',
			},
			...entityProperties,
			...messagingProperties,
			...socialRelationProperties,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
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
						json: { error: error.response?.data ?? error.message },
						pairedItem: { item: i },
					});
					continue;
				}
				if (error.context) {
					error.context.itemIndex = i;
					throw error;
				}
				throw new NodeOperationError(this.getNode(), error.response?.data ?? error.message, {
					itemIndex: i,
				});
			}
		}

		return [returnData];
	}
}
