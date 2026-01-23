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

type GetServiceSuccessResponse =
	paths['/v1/services/{id}']['get']['responses']['200']['content']['application/json'];

export async function getService(
	this: IExecuteFunctions,
	itemIndex: number,
	credentials: ICredentialDataDecryptedObject,
): Promise<INodeExecutionData> {
	const serviceId = this.getNodeParameter('serviceId', itemIndex) as string;

	const response = (await this.helpers.httpRequest({
		method: 'GET',
		url: `${BASE_URL}/api/v1/services/${serviceId}`,
		headers: {
			'x-api-key': credentials.apiKey as string,
			Accept: 'application/json',
		},
		json: true,
	})) as GetServiceSuccessResponse;

	if (!response.service) {
		throw new NodeOperationError(this.getNode(), `Service with ID "${serviceId}" not found`, {
			itemIndex,
		});
	}

	const service = response.service as IDataObject;
	const result: INodeExecutionData = {
		json: service,
		pairedItem: { item: itemIndex },
	};

	if (response.customColumns) {
		result.json._meta = {
			customColumns: response.customColumns,
		};
	}

	return result;
}

export const getServiceProperties: INodeProperties[] = [
	{
		displayName: 'ID',
		name: 'serviceId',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['service'],
			},
		},
		default: '',
		required: true,
		description: 'The unique identifier (UUID) of the service to retrieve',
	},
];
