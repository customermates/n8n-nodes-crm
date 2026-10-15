import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import type { Handler } from '../helpers/api';
import type { Model, ModelType } from '../helpers/model';
import {
	activeTypes,
	discoverModel,
	requireType,
	typeFields,
	typeRelationships,
} from '../helpers/model';

export const listProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['list'] } },
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a list with its fields and relationships',
				action: 'Get a list',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get the lists (record types) of the workspace',
				action: 'Get many lists',
			},
		],
		default: 'getAll',
	},
	{
		displayName: 'List Name or ID',
		name: 'typeId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'loadListOptions' },
		default: '',
		required: true,
		displayOptions: { show: { resource: ['list'], operation: ['get'] } },
		description:
			'The list to describe. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
];

function describeList(model: Model, type: ModelType, details: boolean): IDataObject {
	const summary: IDataObject = {
		id: type.id,
		label: type.label,
		pluralLabel: type.pluralLabel,
		description: type.description,
		subList: type.embedded,
		primaryFieldId: type.primaryFieldId,
	};
	if (!details) {
		return summary;
	}
	return {
		...summary,
		revision: model.revision,
		fields: typeFields(model, type.id).map((field) => ({
			id: field.id,
			label: field.label,
			valueType: field.valueType,
			behavior: field.behavior.kind,
			required: field.required,
			multiple: Boolean(field.multiple),
			options: field.options.map((option) => ({ id: option.id, label: option.label })),
		})),
		relationships: typeRelationships(model, type.id).map((side) => ({
			relationId: side.relationId,
			direction: side.direction,
			label: side.label,
			listId: side.otherTypeId,
			list: model.types.find((candidate) => candidate.id === side.otherTypeId)?.pluralLabel ?? null,
		})),
	};
}

export const listHandlers: Record<string, Handler> = {
	get: async function (this: IExecuteFunctions, itemIndex: number) {
		const model = await discoverModel(this);
		const type = requireType(
			this,
			model,
			this.getNodeParameter('typeId', itemIndex) as string,
			itemIndex,
		);
		return { json: describeList(model, type, true), pairedItem: { item: itemIndex } };
	},
	getAll: async function (this: IExecuteFunctions, itemIndex: number) {
		const model = await discoverModel(this);
		return activeTypes(model).map((type) => ({
			json: describeList(model, type, false),
			pairedItem: { item: itemIndex },
		}));
	},
};
