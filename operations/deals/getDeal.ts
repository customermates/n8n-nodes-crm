import type {
	IExecuteFunctions,
	ICredentialDataDecryptedObject,
	IDataObject,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { BASE_URL } from '../../constants';
import type { paths } from '../../lib/generated/types';

type GetDealSuccessResponse =
	paths['/v1/deals/{id}']['get']['responses']['200']['content']['application/json'];

export async function getDeal(
	this: IExecuteFunctions,
	itemIndex: number,
	credentials: ICredentialDataDecryptedObject,
): Promise<INodeExecutionData> {
	const dealId = this.getNodeParameter('dealId', itemIndex) as string;

	const response = (await this.helpers.httpRequest({
		method: 'GET',
		url: `${BASE_URL}/api/v1/deals/${dealId}`,
		headers: {
			'x-api-key': credentials.apiKey as string,
			Accept: 'application/json',
		},
		json: true,
	})) as GetDealSuccessResponse;

	if (!response.deal) {
		throw new NodeOperationError(this.getNode(), `Deal with ID "${dealId}" not found`, {
			itemIndex,
		});
	}

	const deal = response.deal as IDataObject;
	const result: INodeExecutionData = {
		json: deal,
		pairedItem: { item: itemIndex },
	};

	if (response.customColumns) {
		result.json._meta = {
			customColumns: response.customColumns,
		};
	}

	return result;
}

export const getDealProperties: INodeProperties[] = [
	{
		displayName: 'ID',
		name: 'dealId',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['deal'],
			},
		},
		default: '',
		required: true,
		description: 'The unique identifier (UUID) of the deal to retrieve',
	},
];
