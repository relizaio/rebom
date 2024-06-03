import { BomDto, BomInput, BomRecord, BomSearch, RebomOptions, SearchObject, bomRecordToDto } from './types';
const utils = require('./utils')
import * as BomRepository from './bomRespository'
import validateBom from './validateBom';


export async function findAllBoms(): Promise<BomDto[]> {
  let bomRecords = await BomRepository.findAllBoms();
  return bomRecords.map(b => bomRecordToDto(b))
}

export async function findBomObjectById(id: string): Promise<Object> {
  let retObj = {}
  let bomsById = await BomRepository.bomById(id)
  if (bomsById && bomsById.length && bomsById[0]) {
    retObj = bomsById[0].bom
  }
  return retObj
}

export async function findBom(bomSearch: BomSearch): Promise<BomDto[]> {
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


export async function findBomViaSingleQuery(singleQuery: string): Promise<BomDto[]> {
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

export function updateSearchObj(searchObject: SearchObject, queryPath: string, addParam: string) {
  searchObject.queryText += ` AND ${queryPath} = $${searchObject.paramId}`
  searchObject.queryParams.push(addParam)
  ++searchObject.paramId
}


export async function mergeBoms(ids: string[], rebomOptions: RebomOptions): Promise<any> {
  try {
    var mergedBom = null
    let bomObjs = await findBomsForMerge(ids, rebomOptions.tldOnly)
    if (bomObjs && bomObjs.length)
      mergedBom = await mergeBomObjects(bomObjs, rebomOptions)
    return mergedBom
  } catch (e) {
    console.log("Error During merge", e)
    throw e
  }
}

async function findBomsForMerge(ids: string[], tldOnly: boolean) {
  console.log('ids before repo call', ids)
  let bomRecords = await BomRepository.bomsByIds(ids)
  let bomObjs: any[] = []
  if (bomRecords && bomRecords.length) {
    bomObjs = bomRecords.map(bomRecord => tldOnly ? extractTldFromBom(bomRecord.bom) : bomRecord.bom)
  }
  return bomObjs
}



function extractTldFromBom(bom: any) {
  let newBom: any = {}
  let rootComponentPurl: string
  try {
    const bomAuthor = bom.metadata.tools.components[0].name
    if (bomAuthor !== 'cdxgen') {
      console.error("Top level dependecy can be extracted only for cdxgen boms")
      throw new Error("Top level dependecy can be extracted only for cdxgen boms")

    }
    rootComponentPurl = bom.metadata.component.purl
    if (!rootComponentPurl) {
      console.error("Need root component purl to be defined to extract top level dependencies")
      throw new Error("Need root component purl to be defined to extract top level dependencies")
    }
  } catch (e) {
    console.error(e)
    throw new Error("Top level dependecy can be extracted only for cdxgen boms")
  }
  let rootDepObj: any
  if (rootComponentPurl && bom.dependencies.length) {
    rootDepObj = bom.dependencies.find((dep: any) => dep.ref === rootComponentPurl)
    if (rootDepObj && rootDepObj.dependsOn.length && bom.components && bom.components.length) {
      newBom.components = bom.components.filter((comp: any) => rootDepObj.dependsOn.includes(comp.purl))
      newBom.dependencies = []
      newBom.dependencies[0] = rootDepObj
    }
  }
  const finalBom = Object.assign(bom, newBom)
  return finalBom
}

export async function mergeBomObjects(bomObjects: Object[], rebomOptions: RebomOptions): Promise<any> {
  try {
    const bomPaths: String[] = await utils.createTmpFiles(bomObjects)

    const mergeResponse: string = await utils.shellExec('cyclonedx-cli', ['merge',
      '--output-format', 'json',
      '--input-format', 'json',
      '--group', rebomOptions.group,
      '--name', rebomOptions.name,
      '--version', rebomOptions.version,
      '--input-files', ...bomPaths
    ])
    utils.deleteTmpFiles(bomPaths)

    let jsonObj = JSON.parse(mergeResponse)
    let processedBom = await processBomObj(jsonObj)
    let postMergeBom = postMergeOps(processedBom, rebomOptions)
    return JSON.stringify(processedBom)

  } catch (e) {
    console.log("Error During merge", e)
    throw e
  }

}

function postMergeOps(bomObj: any, rebomOptions: RebomOptions): any {
  // set bom-ref and purl for the root mreged component + we would need somekinda identifiers as well?
  let purl = generatePurl(rebomOptions)
  bomObj.serialNumber = `urn:uuid:${rebomOptions.releaseId}`
  bomObj.metadata.component['bom-ref'] = purl
  bomObj.metadata.component['purl'] = purl
  return bomObj
}

function generatePurl(rebomOptions: RebomOptions): string {
  ////
  return `pkg:reliza/${rebomOptions.group}/${rebomOptions.name}@${rebomOptions.version}` + (rebomOptions.bomSource ? `?bomSource=${rebomOptions.bomSource}` : '')



}

function rootComponentOverride(bom: any, rebomOptions: RebomOptions): any {
  let newBom: any = {}
  let rootComponentPurl: string = decodeURIComponent(bom.metadata.component.purl)
  //generate purl
  let newPurl = `pkg:reliza/${rebomOptions.group}/${rebomOptions.name}@${rebomOptions.version}` + (rebomOptions.bomSource ? `?bomSource=${rebomOptions.bomSource}` : '')
  newBom.metadata = bom.metadata
  newBom.metadata.component.purl = newPurl
  newBom.metadata.component['bom-ref'] = newPurl
  newBom.metadata.component['name'] = rebomOptions.name
  newBom.metadata.component['version'] = rebomOptions.version
  newBom.metadata.component['type'] = rebomOptions.bomSource.toLowerCase()
  newBom.metadata.component['group'] = rebomOptions.group
  newBom.dependencies = bom.dependencies

  let rootdepIndex = bom.dependencies.findIndex((dep: any) => dep.ref === rootComponentPurl)
  newBom.dependencies[rootdepIndex]['ref'] = newPurl

  const finalBom = Object.assign(bom, newBom)
  return finalBom
}

export async function addBom(bomInput: BomInput): Promise<BomRecord> {
  // preprocessing here
  let bomObj = await processBomObj(bomInput.bomInput.bom)
  let override = bomInput.bomInput.rebomOptions
  bomObj = rootComponentOverride(bomObj, override)


  // urn must be unique - if same urn is supplied, we update current record
  // similarly it works for version, component group, component name, component version
  // check if urn is set on bom
  let queryText = 'INSERT INTO rebom.boms (meta, bom, tags) VALUES ($1, $2, $3) RETURNING *'
  let queryParams = [bomInput.bomInput.meta, bomObj, bomInput.bomInput.tags]
  if (bomObj.serialNumber) {
    let bomSearch: BomSearch = {
      bomSearch: {
        serialNumber: bomObj.serialNumber as string,
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
          version: bomObj.version as string,
          componentVersion: bomObj.metadata.component.version as string,
          componentGroup: bomObj.metadata.component.group as string,
          componentName: bomObj.metadata.component.name as string,
          singleQuery: '',
          page: 0,
          offset: 0
        }
      }
      bomRecord = await findBom(bomSearch)
    }

    if (bomRecord && bomRecord.length && bomRecord[0].uuid) {
      queryText = 'UPDATE rebom.boms SET meta = $1, bom = $2, tags = $3 WHERE uuid = $4 RETURNING *'
      queryParams = [bomInput.bomInput.meta, bomObj, bomInput.bomInput.tags, bomRecord[0].uuid]
    }
  }

  let queryRes = await utils.runQuery(queryText, queryParams)
  return queryRes.rows[0]
}

async function processBomObj(bom: any): Promise<any> {
  let processedBom = {}
  processedBom = await sanitizeBom(bom, {
    '\\u003c': '<',
    '\\u003e': '>',
    '\\u0022': '',
    '\\u002B': '+',
    '\\u0027': ',',
    '\\u0060': '',
    'Purl': 'purl',
    ':git@github': ':ssh://git@github',
    'git+https://github': 'ssh://git@github',

  })

  let proceed: boolean = await validateBom(processedBom)
  // const bomModel = new CDX.Models.Bom(bom) <- doesn't yet support deserialization

  if (proceed)
    processedBom = deduplicateBom(processedBom)

  proceed = await validateBom(processedBom)

  if (!proceed) {
    return null
  }

  return processedBom
}

function deduplicateBom(bom: any): any {
  let outBom: any = {
    'bomFormat': bom.bomFormat,
    'specVersion': bom.specVersion,
    'serialNumber': bom.serialNumber,
    'version': bom.version,
    'metadata': bom.metadata
  }
  let purl_dedup_map: any = {}
  let name_dedup_map: any = {}
  let out_components: any[] = []
  bom.components.forEach((component: any) => {
    if ('purl' in component) {
      if (!(component.purl in purl_dedup_map)) {
        out_components.push(component)
        purl_dedup_map[component.purl] = true
      } else {
        console.info(`deduped comp by purl: ${component.purl}`)
      }
    } else if ('name' in component && 'version' in component) {
      let nver: string = component.name + '_' + component.version
      if (!(nver in name_dedup_map)) {
        out_components.push(component)
        name_dedup_map[nver] = true
      } else {
        console.info(`deduped comp by name: ${nver}`)
      }
    } else {
      out_components.push(component)
    }
  })
  outBom.components = out_components
  if ('dependencies' in bom) {
    outBom.dependencies = bom.dependencies
  }

  console.info(`Dedup reduced json from ${Object.keys(bom).length} to ${Object.keys(outBom).length}`)
  return outBom
}

async function sanitizeBom(bom: any, patterns: Record<string, string>): Promise<any> {
  try {
    let jsonString = JSON.stringify(bom);
    // console.log('jsonstring', jsonString)
    Object.entries(patterns).forEach(([search, replace]) => {
      jsonString = jsonString.replaceAll(search, replace);
      // console.log('replaced', jsonString)
    });
    return JSON.parse(jsonString)
    // return bom
  } catch (e) {
    console.error("Error sanitizing bom", e)
    throw new Error("Error sanitizing bom: " + e);
  }
}