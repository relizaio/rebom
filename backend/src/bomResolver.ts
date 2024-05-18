const utils = require('./utils')
import { BomDto, BomInput, BomRecord, BomSearch, SearchObject, bomRecordToDto } from './types';
import {findBom, mergeBoms} from './bomService';
import * as BomService from './bomService';
// A map of functions which return data for the schema.
const resolvers = {
	Query: {
		hello: () => 'world',
		allBoms: async (): Promise<BomDto[]> => BomService.findAllBoms(),
		findBom: async (parent: any, bomSearch: BomSearch): Promise<BomDto[]> => BomService.findBom(bomSearch),
		bomById: async (parent: any, id: any): Promise<Object> => BomService.findBomObjectById(id.id),
		mergeBoms: async (parent: any, mergeInput: any): Promise<Object | null> => BomService.mergeBoms(mergeInput)
	},
	Mutation: {
		addBom: async (parent: any, bomInput: BomInput): Promise<BomRecord> => {
			// urn must be unique - if same urn is supplied, we update current record
			// similarly it works for version, component group, component name, component version
			// check if urn is set on bom
			let queryText = 'INSERT INTO rebom.boms (meta, bom, tags) VALUES ($1, $2, $3) RETURNING *'
			let queryParams = [bomInput.bomInput.meta, bomInput.bomInput.bom, bomInput.bomInput.tags]
			if (bomInput.bomInput.bom.serialNumber) {
				let bomSearch: BomSearch = {
					bomSearch: {
						serialNumber: bomInput.bomInput.bom.serialNumber as string,
						version: '',
						componentVersion: '',
						componentGroup: '',
						componentName: '',
						singleQuery: '',
						page: 0,
						offset: 0
					}
				}
				// if bom record found then update, otherwise insert
				let bomRecord = await findBom(bomSearch)

				// if not found, re-try search by version and component details
				if (!bomRecord || !bomRecord.length) {
					bomSearch = {
						bomSearch: {
							serialNumber: '',
							version: bomInput.bomInput.bom.version as string,
							componentVersion: bomInput.bomInput.bom.metadata.component.version as string,
							componentGroup: bomInput.bomInput.bom.metadata.component.group as string,
							componentName: bomInput.bomInput.bom.metadata.component.name as string,
							singleQuery: '',
							page: 0,
							offset: 0
						}
					}
					bomRecord = await findBom(bomSearch)
				}

				if (bomRecord && bomRecord.length && bomRecord[0].uuid) {
					queryText = 'UPDATE rebom.boms SET meta = $1, bom = $2, tags = $3 WHERE uuid = $4 RETURNING *'
					queryParams = [bomInput.bomInput.meta, bomInput.bomInput.bom, bomInput.bomInput.tags, bomRecord[0].uuid]
				}
			}

			let queryRes = await utils.runQuery(queryText, queryParams)
			return queryRes.rows[0]
		}
	}
}
export default resolvers;