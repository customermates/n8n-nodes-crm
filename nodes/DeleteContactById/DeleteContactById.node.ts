import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { BASE_URL } from '../../constants';
import type { paths } from '../../lib/generated/types';

export class DeleteContactById implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Delete Contact By ID',
		name: 'deleteContactById',
		icon: 'file:../../static/customermates.svg',
		group: ['transform'],
		version: 1,
		description: 'Delete a contact from Customermates by ID',
		defaults: {
			name: 'Delete Contact By ID',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'customermatesApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Contact ID',
				name: 'contactId',
				type: 'string',
				default: '',
				required: true,
				description: 'The unique identifier (UUID) of the contact to delete',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const credentials = await this.getCredentials('customermatesApi');
				const contactId = this.getNodeParameter('contactId', itemIndex, '') as string;

				type DeleteResponse =
					paths['/v1/contacts/{id}']['delete']['responses']['200']['content']['application/json'];

				try {
					const id = (await this.helpers.httpRequest({
						method: 'DELETE',
						url: `${BASE_URL}/api/v1/contacts/${contactId}`,
						headers: {
							'x-api-key': credentials.apiKey,
							Accept: 'application/json',
						},
						json: true,
					})) as DeleteResponse;

					returnData.push({
						json: {
							 id,
						},
						pairedItem: { item: itemIndex },
					});
				} catch (error) {
					throw new NodeOperationError(
						this.getNode(),
						error.response?.data || error.message,
						{ itemIndex },
					);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: error.message },
						pairedItem: { item: itemIndex },
					});
				} else {
					if (error.context) {
						error.context.itemIndex = itemIndex;
						throw error;
					}

					throw new NodeOperationError(this.getNode(), error, {
						itemIndex,
					});
				}
			}
		}

		return [returnData];
	}
}
