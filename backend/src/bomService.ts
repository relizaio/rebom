import {BomDto, BomInput, BomRecord, BomSearch, SearchObject, bomRecordToDto} from './types';
const utils = require('./utils')
import * as BomRepository from './bomRespository'

export async function findAllBoms(): Promise<BomDto[]>{
  let bomRecords = await BomRepository.findAllBoms();
  return bomRecords.map(b => bomRecordToDto(b))
}

export async function findBomObjectById(id: string): Promise<Object>{
  let retObj = {}
  let bomsById = await BomRepository.bomById(id)
  if (bomsById && bomsById.length && bomsById[0]) {
    retObj = bomsById[0].bom
  }
  return retObj
}

export async function findBom (bomSearch: BomSearch): Promise<BomDto[]> {
    let searchObject = {
      queryText: `select * from rebom.boms where 1 = 1`,
      queryParams: [],
      paramId: 1
    }
  
    let bomDtos: BomDto[] = []
  
    if (bomSearch.bomSearch.singleQuery) {
      bomDtos = await findBomViaSingleQuery(bomSearch.bomSearch.singleQuery)
    } else {
      if (bomSearch.bomSearch.serialNumber) {
        if (!bomSearch.bomSearch.serialNumber.startsWith('urn')) {
          bomSearch.bomSearch.serialNumber = 'urn:uuid:' + bomSearch.bomSearch.serialNumber
        }
        updateSearchObj(searchObject, `bom->>'serialNumber'`, bomSearch.bomSearch.serialNumber)
      }
  
      if (bomSearch.bomSearch.version) updateSearchObj(searchObject, `bom->>'version'`, bomSearch.bomSearch.version)
  
      if (bomSearch.bomSearch.componentVersion) updateSearchObj(searchObject, `bom->'metadata'->'component'->>'version'`, 
          bomSearch.bomSearch.componentVersion)
      
      if (bomSearch.bomSearch.componentGroup) updateSearchObj(searchObject, `bom->'metadata'->'component'->>'group'`, 
          bomSearch.bomSearch.componentGroup)
      
      if (bomSearch.bomSearch.componentName) updateSearchObj(searchObject, `bom->'metadata'->'component'->>'name'`, 
          bomSearch.bomSearch.componentName)
  
      let queryRes = await utils.runQuery(searchObject.queryText, searchObject.queryParams)
      let bomRecords = queryRes.rows as BomRecord[]
      bomDtos = bomRecords.map(b => bomRecordToDto(b))
    }
    return bomDtos
  }
  

export  async function findBomViaSingleQuery(singleQuery: string): Promise<BomDto[]> {
    let proceed: boolean = false
    // 1. search by uuid
    let queryRes = await utils.runQuery(`select * from rebom.boms where bom->>'serialNumber' = $1`, [singleQuery])
    proceed = (queryRes.rows.length < 1)
  
    if (proceed) {
      queryRes = await utils.runQuery(`select * from rebom.boms where bom->>'serialNumber' = $1`, ['urn:uuid:' + singleQuery])
      proceed = (queryRes.rows.length < 1)
    }
  
    // 2. search by name
    if (proceed) {
      queryRes = await utils.runQuery(`select * from rebom.boms where bom->'metadata'->'component'->>'name' like $1`, ['%' + singleQuery + '%'])
      proceed = (queryRes.rows.length < 1)
    }
  
    // 3. search by group
    if (proceed) {
      queryRes = await utils.runQuery(`select * from rebom.boms where bom->'metadata'->'component'->>'group' like $1`, ['%' + singleQuery + '%'])
      proceed = (queryRes.rows.length < 1)
    }
  
    // 3. search by version
    if (proceed) {
      queryRes = await utils.runQuery(`select * from rebom.boms where bom->'metadata'->'component'->>'version' = $1`, [singleQuery])
      proceed = (queryRes.rows.length < 1)
    }
  
    let bomRecords = queryRes.rows as BomRecord[]
    return bomRecords.map(b => bomRecordToDto(b))
  }
  
export  function updateSearchObj(searchObject: SearchObject, queryPath: string, addParam: string) {
    searchObject.queryText += ` AND ${queryPath} = $${searchObject.paramId}`
    searchObject.queryParams.push(addParam)
    ++searchObject.paramId
  }
  

export async function mergeBoms(mergeInput: any) :Promise<Object | null>  {
  let boms = await BomRepository.bomsByIds(mergeInput.ids)
  var mergedBom = null
  if (boms && boms.length)
    mergedBom = mergeBomObjects(boms, mergeInput.group, mergeInput.name, mergeInput.version)
  return mergedBom
}
  
export async function mergeBomObjects(boms :BomRecord[], group: String, name: String, version: String): Promise<Object> {
  const bomPaths: String[] = await utils.createTmpFiles(boms.map(bom => bom.bom))

  const response: Object = await utils.shellExec('cyclonedx-cli', ['merge', 
    '--output-format', 'json',
    '--input-format', 'json',
    '--group', group,
    '--name', name,
    '--version', version,
    '--input-files', ...bomPaths
  ])
  utils.deleteTmpFiles(bomPaths)
  return response
}
