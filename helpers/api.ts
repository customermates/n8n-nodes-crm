import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	INodeExecutionData,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export const BASE_URL = 'https://customermates.com';

export type ApiContext = IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions;

export type Handler = (
	this: IExecuteFunctions,
	itemIndex: number,
) => Promise<INodeExecutionData | INodeExecutionData[]>;

export async function apiRequest<T = IDataObject>(
	context: ApiContext,
	method: IHttpRequestMethods,
	path: string,
	body?: IDataObject,
): Promise<T> {
	const credentials = await context.getCredentials('customermatesApi');
	const baseURL = ((credentials.baseURL as string) || BASE_URL).replace(/\/+$/, '');

	try {
		return await context.helpers.httpRequest({
			method,
			url: `${baseURL}/api/v1${path}`,
			headers: {
				'x-api-key': credentials.apiKey as string,
				'Content-Type': 'application/json',
				Accept: 'application/json',
			},
			// n8n drops an empty object body; endpoints such as /model/discover still require "{}".
			body: body && Object.keys(body).length === 0 ? '{}' : body,
			json: true,
		});
	} catch (error) {
		const response = (error as { response?: { status?: number; data?: unknown } }).response;
		throw new NodeApiError(
			context.getNode(),
			error as JsonObject,
			response?.status
				? {
						httpCode: String(response.status),
						message: apiErrorMessage(response.status, response.data),
					}
				: {},
		);
	}
}

type ApiIssue = {
	code?: string;
	message?: string;
	customCode?: string;
	path?: Array<string | number>;
};

/** Turns the API's structured error body into a readable message, e.g. "recordValueInvalid at fields.0". */
export function apiErrorMessage(status: number, payload: unknown): string {
	const body = (typeof payload === 'string' ? safeJson(payload) : payload) as
		| {
				error?: string | { kind?: string; issues?: ApiIssue[]; message?: string };
				message?: string;
		  }
		| undefined;
	const error = body?.error;
	let detail = '';
	if (typeof error === 'string') {
		detail = error;
	} else if (error) {
		const issues = (error.issues ?? []).map((issue) => {
			const what = issue.customCode ?? issue.message ?? issue.code ?? 'invalid';
			return issue.path?.length ? `${what} at ${issue.path.join('.')}` : what;
		});
		detail = [error.kind, issues.join('; ') || error.message].filter(Boolean).join(': ');
	} else if (body?.message) {
		detail = body.message;
	}
	return `Customermates API error ${status}${detail ? `: ${detail}` : ''}`;
}

function safeJson(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		return { message: text.slice(0, 300) };
	}
}

export function splitList(value: string): string[] {
	return value
		.split(',')
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0);
}

export async function searchAll(
	context: IExecuteFunctions,
	path: string,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const returnAll = context.getNodeParameter('returnAll', itemIndex) as boolean;
	const limit = returnAll
		? Number.POSITIVE_INFINITY
		: (context.getNodeParameter('limit', itemIndex) as number);
	const options = context.getNodeParameter('additionalFields', itemIndex, {}) as {
		searchTerm?: string;
	};
	const results: INodeExecutionData[] = [];
	let page = 1;

	for (;;) {
		const body: IDataObject = { pagination: { page, pageSize: 100 } };
		if (options.searchTerm) {
			body.searchTerm = options.searchTerm;
		}

		const response = await apiRequest(context, 'POST', path, body);
		const items = (response.items as IDataObject[]) ?? [];

		for (const item of items) {
			if (results.length >= limit) {
				return results;
			}
			results.push({ json: item, pairedItem: { item: itemIndex } });
		}

		if (items.length < 100) {
			return results;
		}
		page += 1;
	}
}
