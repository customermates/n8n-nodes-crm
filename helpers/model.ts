import { randomUUID } from 'crypto';
import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError, sleep } from 'n8n-workflow';
import type { ApiContext } from './api';
import { apiRequest } from './api';

export type ValueType =
	| 'text'
	| 'richText'
	| 'number'
	| 'currency'
	| 'boolean'
	| 'date'
	| 'dateTime'
	| 'dateRange'
	| 'dateTimeRange'
	| 'select'
	| 'email'
	| 'phone'
	| 'url'
	| 'member'
	| 'channels';

export type ModelType = {
	id: string;
	label: string;
	pluralLabel: string;
	description: string;
	primaryFieldId: string | null;
	parentRelationshipId: string | null;
	embedded: boolean;
	archived: boolean;
	position: number;
};

export type ModelField = {
	id: string;
	typeId: string;
	label: string;
	valueType: ValueType;
	behavior: { kind: string; allowManualOverride?: boolean };
	required: boolean;
	multiple?: boolean;
	format?: { currency?: string | null } & IDataObject;
	archived: boolean;
	options: Array<{ id: string; label: string }>;
	position: number;
};

export type ModelRelationship = {
	id: string;
	sourceTypeId: string;
	targetTypeId: string;
	sourceLabel: string;
	targetLabel: string;
	sourceCardinality: 'one' | 'many';
	targetCardinality: 'one' | 'many';
	archived: boolean;
};

export type Model = {
	revision: number;
	types: ModelType[];
	fields: ModelField[];
	relationships: ModelRelationship[];
};

export type TypedValue = IDataObject & { kind: string };

export type RecordRef = { typeId: string; recordId: string };

export const SYSTEM_FIELDS: Record<string, { label: string; valueType: ValueType }> = {
	'system:createdAt': { label: 'Created At', valueType: 'dateTime' },
	'system:updatedAt': { label: 'Updated At', valueType: 'dateTime' },
	'system:assignedTo': { label: 'Assigned To', valueType: 'member' },
};

const modelCache = new WeakMap<object, Promise<Model>>();

/**
 * Reads the full workspace configuration (lists, fields, relationships) from /model/read,
 * once per execution (cached on the execution context).
 */
export async function discoverModel(context: ApiContext): Promise<Model> {
	let cached = modelCache.get(context);
	if (!cached) {
		cached = apiRequest<Model>(context, 'POST', '/model/read', {});
		modelCache.set(context, cached);
	}
	return await cached;
}

export function activeTypes(model: Model): ModelType[] {
	return model.types
		.filter((type) => !type.archived)
		.sort((a, b) => a.position - b.position || a.label.localeCompare(b.label));
}

export function typeFields(model: Model, typeId: string): ModelField[] {
	return model.fields
		.filter((field) => field.typeId === typeId && !field.archived)
		.sort((a, b) => a.position - b.position);
}

export function isWritable(field: ModelField): boolean {
	return (
		field.valueType !== 'channels' &&
		(field.behavior.kind === 'input' ||
			(field.behavior.kind === 'snapshot' && Boolean(field.behavior.allowManualOverride)))
	);
}

export function requireType(
	context: IExecuteFunctions,
	model: Model,
	typeId: string,
	itemIndex: number,
) {
	const type = model.types.find((candidate) => candidate.id === typeId);
	if (!type) {
		throw new NodeOperationError(context.getNode(), `List "${typeId}" was not found`, {
			itemIndex,
			description: 'Choose a list from the dropdown, or check the list ID in Customermates.',
		});
	}
	return type;
}

export function requireField(
	context: IExecuteFunctions,
	model: Model,
	typeId: string,
	fieldId: string,
	itemIndex: number,
): ModelField {
	const field = model.fields.find(
		(candidate) =>
			candidate.typeId === typeId && (candidate.id === fieldId || candidate.label === fieldId),
	);
	if (!field) {
		throw new NodeOperationError(
			context.getNode(),
			`Field "${fieldId}" does not belong to the selected list`,
			{ itemIndex },
		);
	}
	return field;
}

/**
 * Idempotency key for one record write. It is derived from the execution, node, run and item, so a
 * retried node run replays the stored result instead of writing twice; outside an execution
 * (no execution ID) it falls back to a random key.
 */
export function idempotencyKey(
	context: IExecuteFunctions,
	itemIndex: number,
	operation: string,
): string {
	const executionId = context.getExecutionId();
	if (!executionId) {
		return `n8n-${randomUUID()}`;
	}
	const node = context.getNode();
	const runIndex = Number(context.evaluateExpression('{{ $runIndex }}', itemIndex)) || 0;
	return `n8n:${executionId}:${node.id ?? node.name}:${runIndex}:${itemIndex}:${operation}`.slice(
		0,
		200,
	);
}

const TEXT_TYPES: ValueType[] = ['text', 'richText', 'email', 'phone', 'url'];

/** Normalises "1.234,50", "1,234.50", "1 234.50" or "1'234.50" to "1234.50". */
export function normaliseDecimal(raw: string): string {
	let value = raw.replace(/[\s'\u00a0]/g, '');
	const comma = value.lastIndexOf(',');
	const dot = value.lastIndexOf('.');
	if (comma >= 0 && dot >= 0) {
		value = comma > dot ? value.replace(/\./g, '').replace(',', '.') : value.replace(/,/g, '');
	} else if (comma >= 0) {
		value =
			/,\d{1,2}$/.test(value) && value.indexOf(',') === comma
				? value.replace(',', '.')
				: value.replace(/,/g, '');
	}
	return value.replace(/^\+/, '');
}

const CURRENCY_SYMBOLS: Record<string, string> = { '€': 'EUR', $: 'USD', '£': 'GBP' };

/** Parses "120.50 EUR", "EUR 120.50", "€1.234,50" or "120.50" (the field's currency). */
export function parseCurrency(
	raw: string,
	fallback: string | null,
): { value: string; currency: string | null } {
	let text = raw.trim();
	let currency: string | null = null;
	const symbol = Object.keys(CURRENCY_SYMBOLS).find(
		(key) => text.startsWith(key) || text.endsWith(key),
	);
	if (symbol) {
		currency = CURRENCY_SYMBOLS[symbol];
		text = text.startsWith(symbol) ? text.slice(symbol.length) : text.slice(0, -symbol.length);
	} else {
		const code = /^([A-Za-z]{3})\s*(.+)$/.exec(text) ?? /^(.+?)\s*([A-Za-z]{3})$/.exec(text);
		if (code) {
			const [first, second] = [code[1], code[2]];
			const isPrefix = /^[A-Za-z]{3}$/.test(first);
			currency = (isPrefix ? first : second).toUpperCase();
			text = isPrefix ? second : first;
		}
	}
	return { value: normaliseDecimal(text), currency: currency ?? fallback };
}

function parseJsonValue(raw: string): TypedValue | null {
	const trimmed = raw.trim();
	if (!trimmed.startsWith('{')) {
		return null;
	}
	try {
		const parsed = JSON.parse(trimmed) as IDataObject;
		return typeof parsed.kind === 'string' ? (parsed as TypedValue) : null;
	} catch {
		return null;
	}
}

function optionId(field: Pick<ModelField, 'options'>, raw: string): string {
	const value = raw.trim();
	const option =
		field.options.find((candidate) => candidate.id === value) ??
		field.options.find((candidate) => candidate.label.toLowerCase() === value.toLowerCase());
	return option ? option.id : value;
}

function listOf(raw: string, separators: RegExp): string[] {
	return raw
		.split(separators)
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0);
}

function paragraphsDocument(text: string): string {
	const trimmed = text.trim();
	if (trimmed.startsWith('{')) {
		try {
			const parsed = JSON.parse(trimmed) as IDataObject;
			if (parsed.type === 'doc') {
				return trimmed;
			}
		} catch {
			// Plain text that merely starts with a brace.
		}
	}
	const content = trimmed
		.split(/\n\s*\n/)
		.map((paragraph) => paragraph.trim())
		.filter((paragraph) => paragraph.length > 0)
		.map((paragraph) => ({ type: 'paragraph', content: [{ type: 'text', text: paragraph }] }));
	return JSON.stringify({ type: 'doc', content });
}

/**
 * Converts the text a user typed into n8n into the API's typed value for a field.
 * A JSON object with a "kind" property is passed through unchanged as an escape hatch.
 */
export function toTypedValue(
	field: Pick<ModelField, 'valueType' | 'multiple' | 'options' | 'format'>,
	raw: unknown,
): TypedValue | null {
	if (raw === undefined || raw === null) {
		return null;
	}
	if (typeof raw === 'object') {
		return typeof (raw as IDataObject).kind === 'string' ? (raw as TypedValue) : null;
	}
	const text = String(raw);
	if (text.trim() === '') {
		return null;
	}
	// Text-like fields keep JSON-looking input as text; other fields accept a raw typed value.
	const json = TEXT_TYPES.includes(field.valueType) ? null : parseJsonValue(text);
	if (json) {
		return json;
	}
	switch (field.valueType) {
		case 'richText':
			return { kind: 'richText', documentJson: paragraphsDocument(text) };
		case 'boolean':
			return {
				kind: 'boolean',
				value: ['true', '1', 'yes', 'on'].includes(text.trim().toLowerCase()),
			};
		case 'number':
			return { kind: 'decimal', value: normaliseDecimal(text), currency: null };
		case 'currency':
			return { kind: 'decimal', ...parseCurrency(text, field.format?.currency ?? null) };
		case 'date':
			return { kind: 'date', value: text.trim() };
		case 'dateTime':
			return { kind: 'dateTime', value: text.trim() };
		case 'dateRange':
		case 'dateTimeRange': {
			const [start, end] = text.split(',').map((part) => part.trim());
			return { kind: 'range', start: start || null, end: end || null };
		}
		case 'select':
			if (field.multiple) {
				return {
					kind: 'selectList',
					value: listOf(text, /,/).map((entry) => optionId(field, entry)),
				};
			}
			return { kind: 'select', value: optionId(field, text) };
		case 'member':
			return { kind: 'member', value: text.trim() };
		default:
			if (field.multiple) {
				const separators = field.valueType === 'text' ? /\n/ : /[\n,]/;
				return { kind: 'textList', value: listOf(text, separators) };
			}
			return { kind: 'text', value: text };
	}
}

/** Converts a filter value; list operators take every comma-separated entry as one value. */
export function toFilterValues(
	field: Pick<ModelField, 'valueType' | 'multiple' | 'options' | 'format'>,
	operator: string,
	raw: string,
): IDataObject {
	if (operator === 'empty' || operator === 'notEmpty') {
		return { value: null };
	}
	if (operator === 'inLastDays' || operator === 'notInLastDays') {
		return { value: { kind: 'decimal', value: raw.trim(), currency: null } };
	}
	// Range fields are filtered by their endpoints, which are plain dates or date-times.
	const valueType: ValueType =
		field.valueType === 'dateRange'
			? 'date'
			: field.valueType === 'dateTimeRange'
				? 'dateTime'
				: field.valueType;
	const scalar = { ...field, valueType, multiple: false };
	if (['in', 'notIn', 'all'].includes(operator)) {
		return { value: null, values: listOf(raw, /,/).map((entry) => toTypedValue(scalar, entry)) };
	}
	if (operator === 'between') {
		return { value: null, values: listOf(raw, /,/).map((entry) => toTypedValue(scalar, entry)) };
	}
	if (field.multiple && field.valueType === 'select') {
		return { value: toTypedValue(scalar, raw) };
	}
	if (field.valueType === 'richText' || field.multiple) {
		return { value: { kind: 'text', value: raw } };
	}
	return { value: toTypedValue(scalar, raw) };
}

function documentText(node: unknown): string {
	if (!node || typeof node !== 'object') {
		return '';
	}
	const { text, content, type } = node as { text?: string; content?: unknown[]; type?: string };
	if (typeof text === 'string') {
		return text;
	}
	const children = (content ?? []).map(documentText);
	const blocks = ['doc', 'bulletList', 'orderedList'];
	return children.join(type && blocks.includes(type) ? '\n\n' : '');
}

function plainValue(field: ModelField | undefined, value: TypedValue): unknown {
	const label = (id: string) => field?.options.find((option) => option.id === id)?.label ?? id;
	switch (value.kind) {
		case 'select':
			return label(value.value as string);
		case 'selectList':
			return (value.value as string[]).map(label);
		case 'decimal':
			return value.currency ? { value: value.value, currency: value.currency } : value.value;
		case 'range':
			return { start: value.start ?? null, end: value.end ?? null };
		case 'richText':
			try {
				return documentText(JSON.parse(value.documentJson as string));
			} catch {
				return value.documentJson;
			}
		default:
			return value.value;
	}
}

type ApiFieldResult = {
	fieldId: string;
	result: { state: string; value?: TypedValue; code?: string };
};

function uniqueLabel(labels: Set<string>, label: string, id: string): string {
	const key = labels.has(label) ? `${label} (${id})` : label;
	labels.add(key);
	return key;
}

/** Flattens an API record into `{ id, listId, …, fields: { <label>: <plain value> } }`. */
export function simplifyRecord(model: Model, record: IDataObject): IDataObject {
	const ref = record.ref as RecordRef;
	const fields: IDataObject = {};
	const labels = new Set<string>();
	for (const entry of (record.fields as ApiFieldResult[]) ?? []) {
		const field = model.fields.find((candidate) => candidate.id === entry.fieldId);
		const key = uniqueLabel(labels, field?.label ?? entry.fieldId, entry.fieldId);
		fields[key] =
			entry.result.state === 'value' && entry.result.value
				? (plainValue(field, entry.result.value) as IDataObject)
				: null;
	}
	const simplified: IDataObject = {
		id: ref.recordId,
		listId: ref.typeId,
		list: model.types.find((type) => type.id === ref.typeId)?.label ?? null,
		version: record.version,
		createdAt: record.createdAt,
		updatedAt: record.updatedAt,
		assignedUserIds: record.assignedUserIds,
		fields,
	};
	const relationships = record.relationships as IDataObject[] | undefined;
	if (relationships?.length) {
		simplified.links = relationships.map((relationship) => {
			const definition = model.relationships.find(
				(candidate) => candidate.id === relationship.relationId,
			);
			const outgoing = relationship.direction === 'outgoing';
			return {
				relationship: definition
					? outgoing
						? definition.sourceLabel
						: definition.targetLabel
					: null,
				relationId: relationship.relationId,
				direction: relationship.direction,
				records: ((relationship.records as IDataObject[]) ?? []).map((linked) => {
					const title = linked.title as { state: string; value?: TypedValue };
					return {
						id: (linked.ref as RecordRef).recordId,
						listId: (linked.ref as RecordRef).typeId,
						title:
							title.state === 'value' && title.value ? plainValue(undefined, title.value) : null,
					};
				}),
				hasMore: relationship.hasMore,
			};
		});
	}
	if (record.identities) {
		simplified.channels = record.identities;
	}
	return simplified;
}

/** The relationships of a list, from that list's point of view. */
export function typeRelationships(model: Model, typeId: string) {
	const sides: Array<{
		relationId: string;
		direction: 'outgoing' | 'incoming';
		otherTypeId: string;
		label: string;
	}> = [];
	for (const relationship of model.relationships) {
		if (relationship.archived) {
			continue;
		}
		if (relationship.sourceTypeId === typeId) {
			sides.push({
				relationId: relationship.id,
				direction: 'outgoing',
				otherTypeId: relationship.targetTypeId,
				label: relationship.sourceLabel,
			});
		}
		if (relationship.targetTypeId === typeId) {
			sides.push({
				relationId: relationship.id,
				direction: 'incoming',
				otherTypeId: relationship.sourceTypeId,
				label: relationship.targetLabel,
			});
		}
	}
	return sides;
}

/** Encodes one side of a relationship as a single option value. */
export function relationshipOptionValue(side: {
	relationId: string;
	direction: string;
	otherTypeId: string;
}): string {
	return `${side.relationId}:${side.direction}:${side.otherTypeId}`;
}

export function parseRelationshipOption(
	context: IExecuteFunctions,
	value: string,
	itemIndex: number,
): { relationId: string; direction: 'outgoing' | 'incoming'; otherTypeId: string } {
	const [relationId, direction, otherTypeId] = value.split(':');
	if (!relationId || (direction !== 'outgoing' && direction !== 'incoming') || !otherTypeId) {
		throw new NodeOperationError(
			context.getNode(),
			`Relationship "${value}" is not valid; choose it from the dropdown`,
			{ itemIndex },
		);
	}
	return { relationId, direction, otherTypeId };
}

/** Waits for a staged (pending) record operation to finish and returns its completed result. */
export async function settleOperation(
	context: IExecuteFunctions,
	result: IDataObject,
	itemIndex: number,
): Promise<IDataObject> {
	if (result.status !== 'pending') {
		return result;
	}
	const operationId = result.operationId as string;
	for (let attempt = 0; attempt < 120; attempt++) {
		await sleep(1000);
		const status = await apiRequest(context, 'POST', '/operations/status', { operationId });
		if (status.state === 'completed') {
			return (status.result as IDataObject) ?? { status: 'completed', operationId };
		}
		if (status.state === 'failed' || status.state === 'cancelled') {
			throw new NodeOperationError(
				context.getNode(),
				`Customermates operation ${operationId} ${status.state as string}${
					status.errorCode ? `: ${status.errorCode as string}` : ''
				}`,
				{ itemIndex },
			);
		}
	}
	throw new NodeOperationError(
		context.getNode(),
		`Customermates operation ${operationId} is still running after 2 minutes`,
		{
			itemIndex,
			description:
				'The change was accepted and continues in the background. Check the record before retrying.',
		},
	);
}
