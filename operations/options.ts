import type { IDataObject, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { apiRequest } from '../helpers/api';
import {
	SYSTEM_FIELDS,
	activeTypes,
	discoverModel,
	isWritable,
	relationshipOptionValue,
	typeFields,
	typeRelationships,
} from '../helpers/model';

type Loader = (this: ILoadOptionsFunctions) => Promise<INodePropertyOptions[]>;

const VALUE_TYPE_LABELS: Record<string, string> = {
	text: 'Text',
	richText: 'Formatted text',
	number: 'Number',
	currency: 'Currency',
	boolean: 'Checkbox',
	date: 'Date',
	dateTime: 'Date and time',
	dateRange: 'Date range',
	dateTimeRange: 'Date and time range',
	select: 'Choice',
	email: 'Email',
	phone: 'Phone',
	url: 'URL',
	member: 'Member',
	channels: 'Channels',
};

function selectedTypeId(context: ILoadOptionsFunctions): string {
	return (context.getCurrentNodeParameter('typeId') as string | undefined) ?? '';
}

async function loadListOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const model = await discoverModel(this);
	return activeTypes(model).map((type) => {
		const parent = type.embedded ? ' (sub-list)' : '';
		return {
			name: `${type.pluralLabel}${parent}`,
			value: type.id,
			description: type.description || undefined,
		};
	});
}

function fieldLoader(include: 'writable' | 'all'): Loader {
	return async function (this: ILoadOptionsFunctions) {
		const typeId = selectedTypeId(this);
		if (!typeId) {
			return [];
		}
		const model = await discoverModel(this);
		const fields = typeFields(model, typeId).filter((field) => {
			if (include === 'writable') return isWritable(field);
			return field.valueType !== 'channels';
		});
		const options: INodePropertyOptions[] = fields.map((field) => ({
			name: field.label,
			value: field.id,
			description: `${VALUE_TYPE_LABELS[field.valueType] ?? field.valueType}${
				field.multiple ? ', multiple' : ''
			}${field.required ? ', required' : ''}`,
		}));
		if (include === 'all') {
			for (const [value, system] of Object.entries(SYSTEM_FIELDS)) {
				options.push({ name: system.label, value, description: 'System field' });
			}
		}
		return options;
	};
}

async function loadRelationshipOptions(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const typeId = selectedTypeId(this);
	if (!typeId) {
		return [];
	}
	const model = await discoverModel(this);
	return typeRelationships(model, typeId).map((side) => {
		const other = model.types.find((type) => type.id === side.otherTypeId);
		return {
			name: `${side.label} (${other?.pluralLabel ?? side.otherTypeId})`,
			value: relationshipOptionValue(side),
		};
	});
}

async function loadUserOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	try {
		const response = await apiRequest(this, 'POST', '/users/search', {
			pagination: { page: 1, pageSize: 100 },
		});
		return ((response.items as IDataObject[]) ?? []).map((user) => ({
			name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || (user.email as string),
			value: user.id as string,
		}));
	} catch {
		return [];
	}
}

async function loadConnectedAccountOptions(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	try {
		const accounts = await apiRequest<IDataObject[]>(this, 'GET', '/messaging/connected-accounts');
		return accounts.map((account) => ({
			name: `${account.displayName ?? account.emailAddress ?? account.id} (${account.provider})`,
			value: account.id as string,
		}));
	} catch {
		return [];
	}
}

export const loadOptions: Record<string, Loader> = {
	loadConnectedAccountOptions,
	loadFieldOptions: fieldLoader('writable'),
	loadFilterFieldOptions: fieldLoader('all'),
	loadListOptions,
	loadRelationshipOptions,
	loadUserOptions,
};
