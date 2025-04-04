import { isSupportedSpdxId } from '@cyclonedx/cyclonedx-library/dist.d/spdx';
import * as BomRepository from './bomRespository';
import { logger } from './logger';
import { fetchFromOci, pushToOci } from './ociService';
import { BomDto, BomInput, BomRecord, BomSearch, HIERARCHICHAL, RebomOptions, SearchObject } from './types';
import validateBom from './validateBom';
const canonicalize = require ('canonicalize')
import { createHash } from 'crypto';
import { PackageURL } from 'packageurl-js'

const utils = require('./utils')

async function bomRecordToDto(bomRecord: BomRecord, rootOverride: boolean = true): Promise<BomDto> {
    let version = ''
    let group = ''
    let name = ''
    let bomVersion = ''
    if(process.env.OCI_STORAGE_ENABLED){
      bomRecord.bom = await fetchFromOci(bomRecord.meta.serialNumber)
    }
    
    if(rootOverride)
      bomRecord.bom = rootComponentOverride(bomRecord)

    if (bomRecord.bom) bomVersion = bomRecord.bom.version
    if (bomRecord.bom && bomRecord.bom.metadata && bomRecord.bom.metadata.component) {
        version = bomRecord.bom.metadata.component.version
        name = bomRecord.bom.metadata.component.name
        group = bomRecord.bom.metadata.component.group
    }
    let bomDto: BomDto = {
        uuid: bomRecord.uuid,
        createdDate: bomRecord.created_date,
        lastUpdatedDate: bomRecord.last_updated_date,
        meta: bomRecord.meta,
        bom: bomRecord.bom,
        tags: bomRecord.tags,
        organization: bomRecord.organization,
        public: bomRecord.public,
        bomVersion: bomVersion,
        group: group,
        name: name,
        version: version,
    }
    return bomDto
}

export async function findAllBoms(): Promise<BomDto[]> {
    let bomRecords = await BomRepository.findAllBoms();
    return await Promise.all(bomRecords.map(async(b) => bomRecordToDto(b)))
}

export async function findBomObjectById(id: string): Promise<Object> {
    let bomById = (await BomRepository.bomById(id))[0]
    let bomDto = await bomRecordToDto(bomById)
    // logger.info("writing to file bomrecord")
    // await writeFileAsync("/home/r/work/reliza/rebom/boms/"+id+".byID.json", JSON.stringify(bomById))
    // await writeFileAsync("/home/r/work/reliza/rebom/boms/"+id+".dto.json", JSON.stringify(bomDto))
    return bomDto.bom
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
      bomDtos = await  Promise.all(bomRecords.map(async(b) => bomRecordToDto(b)))
    }
    return bomDtos
  }

  export async function findBomByMeta(bomMeta: RebomOptions): Promise<BomDto[]> {
    let bomDtos: BomDto[] = []
    const queryText = 'SELECT * FROM rebom.boms WHERE meta = $1::jsonb;';
    const values = [JSON.stringify(bomMeta)];
    
    let queryRes = await utils.runQuery(queryText, values)
    let bomRecords = queryRes.rows as BomRecord[]
    if(bomRecords.length)
      bomDtos = await Promise.all(bomRecords.map(async(b) => bomRecordToDto(b)))
    
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
    return await Promise.all(bomRecords.map(async(b) => bomRecordToDto(b)))
  }

  export function updateSearchObj(searchObject: SearchObject, queryPath: string, addParam: string) {
    searchObject.queryText += ` AND ${queryPath} = $${searchObject.paramId}`
    searchObject.queryParams.push(addParam)
    ++searchObject.paramId
  }

  export async function exportMergedBom(ids: string[], rebomOptions: RebomOptions): Promise<any> {
    return JSON.stringify(mergeBoms(ids, rebomOptions))
  }

  export async function mergeBoms(ids: string[], rebomOptions: RebomOptions): Promise<any> {
    try {
      let mergedBom = null
      const bomObjs = await findBomsForMerge(ids, rebomOptions.tldOnly)
      if (bomObjs && bomObjs.length)
        mergedBom = await mergeBomObjects(bomObjs, rebomOptions)
      return mergedBom
    } catch (e) {
      logger.error("Error During merge", e)
      throw e
    }
  }

  export async function mergeAndStoreBoms(ids: string[], rebomOptions: RebomOptions): Promise<any> {
    try {
      const mergedBom = await mergeBoms(ids, rebomOptions)
      const bomInput : BomInput = {
        bomInput: {
          rebomOptions: rebomOptions,
          bom: mergedBom,
        }
      }
      const bomRecord = await addBom(bomInput)
      return bomRecord
    } catch (e) {
      logger.error("Error During merge", e)
      throw e
    }
  }

  async function findBomsForMerge(ids: string[], tldOnly: boolean) {
    logger.info(`findBomsForMerge: ${ids}`)
    let bomRecords =  await Promise.all(ids.map(async(id) => findBomObjectById(id)))
    let bomObjs: any[] = []
    logger.info(`bomrecords found # ${bomRecords.length}`)
    if (bomRecords && bomRecords.length) {
      bomObjs = bomRecords.map(bomRecord => tldOnly ? extractTldFromBom(bomRecord) : bomRecord)
    }
    return bomObjs
  }



  function extractTldFromBom(bom: any) {
    let newBom: any = {}
    let rootComponentRef: string
    try {
      // const bomAuthor = bom.metadata.tools.components[0].name
      // if (bomAuthor !== 'cdxgen') {
      //   logger.error("Top level dependecy can be extracted only for cdxgen boms")
      //   throw new Error("Top level dependecy can be extracted only for cdxgen boms")

      // }
      rootComponentRef = bom.metadata.component['bom-ref']
      if (!rootComponentRef) {
        logger.error("Need root component purl to be defined to extract top level dependencies")
        throw new Error("Need root component purl to be defined to extract top level dependencies")
      }
    } catch (e) {
      logger.error(e)
      throw new Error("Top level dependecy can be extracted only for cdxgen boms")
    }
    let rootDepObj: any
    logger.info(`Bom components length before tld extract: ${bom.components.length}`)
    logger.info(`rootComponentRef: ${rootComponentRef}`)
    if (rootComponentRef && bom.dependencies.length) {
      rootDepObj = bom.dependencies.find((dep: any) => dep.ref === rootComponentRef)

      if (rootDepObj && rootDepObj.dependsOn.length && bom.components && bom.components.length) {
        newBom.components = bom.components.filter((comp: any) => {
          return rootDepObj.dependsOn.includes(comp["bom-ref"])
        })
        newBom.dependencies = []
        newBom.dependencies[0] = rootDepObj
      }
    }

    const finalBom = Object.assign(bom, newBom)
    logger.info(`Bom components length FATER tld extract: ${finalBom.components.length}`)

    return finalBom
  }



  export async function mergeBomObjects(bomObjects: any[], rebomOptions: RebomOptions): Promise<any> {
    try {
      bomObjects.forEach(async (bobjs: any) => {
        await validateBom(bobjs)
      })
      
      
      const bomPaths: string[] = await utils.createTmpFiles(bomObjects)
      const command = ['merge']
      if(rebomOptions.structure.toUpperCase() === HIERARCHICHAL.toUpperCase()){
        command.push('--hierarchical')
      }
      command.push(
        '--output-format', 'json',
        '--input-format', 'json',
        '--output-version', 'v1_6',
        '--group', rebomOptions.group,
        '--name', rebomOptions.name,
        '--version', rebomOptions.version,
        '--input-files', ...bomPaths
      )

      const mergeResponse: string = await utils.shellExec('cyclonedx-cli',command)
      // utils.deleteTmpFiles(bomPaths)s

      const jsonObj = JSON.parse(mergeResponse)
      jsonObj.metadata.tools = []
      const processedBom = await processBomObj(jsonObj)
      // let bomRoots = bomObjects.map(bomObj => bomObj.metadata.component)
      // use the bom roots to prep the root level dep obj if doesn't already exist!
      // check if the root level dep obj is there?
      const postMergeBom = postMergeOps(processedBom, rebomOptions)
      await validateBom(postMergeBom)
      return postMergeBom

    } catch (e) {
      logger.error("Error During merge", e)
      throw e
    }

  }

  function postMergeOps(bomObj: any, rebomOptions: RebomOptions): any {
    // set bom-ref and purl for the root mreged component + we would need somekinda identifiers as well?
    const purl = establishPurl(undefined, rebomOptions)
    // bomObj.serialNumber = `urn:uuid:${rebomOptions.releaseId}`
    bomObj.metadata.component['bom-ref'] = purl
    bomObj.metadata.component['purl'] = purl
    addMissingDependecyGraph(bomObj, rebomOptions)
    return bomObj
  }

  function addMissingDependecyGraph(bomObj: any, dependencyMap: any){
    let deps = bomObj.dependencies
    // see if the dependencies graph has any info about root level
    // logger.info('deps', deps)

  }

function establishPurl(origPurl: string | undefined, rebomOverride: RebomOptions): string {
    let origPurlParsed: PackageURL | undefined = undefined
    if (origPurl) origPurlParsed = PackageURL.fromString(origPurl)
    const namespace = (origPurlParsed && origPurlParsed.namespace) ? origPurlParsed.namespace : encodeURIComponent(rebomOverride.group)
    const name = (origPurlParsed && origPurlParsed.name) ? origPurlParsed.name : encodeURIComponent(rebomOverride.name)
    const type = (origPurlParsed && origPurlParsed.type) ? origPurlParsed.type : 'generic'
    const version = rebomOverride.version
    const qualifiers = (origPurlParsed && origPurlParsed.qualifiers) ? origPurlParsed.qualifiers : {}
    if (rebomOverride.belongsTo) qualifiers.belongsTo = rebomOverride.belongsTo
    if (rebomOverride.hash) qualifiers.hash = rebomOverride.hash
    if (rebomOverride.tldOnly) qualifiers.tldOnly = 'true'
    if (rebomOverride.structure.toLowerCase() === HIERARCHICHAL.toLowerCase()) qualifiers.structure = HIERARCHICHAL
    const purl = new PackageURL(
      type,
      namespace,
      name,
      version,
      qualifiers,
      undefined
    )
    
    return purl.toString()
}

  function rootComponentOverride(bomRecord: BomRecord): any {
    const rebomOverride = bomRecord.meta
    const bom = bomRecord.bom

    if (!rebomOverride) return bom
    
    const newBom: any = {}
    const rootComponentPurl: string = decodeURIComponent(bom.metadata.component["bom-ref"])
    const origPurl = (bom.metadata && bom.metadata.component && bom.metadata.component.purl) ? bom.metadata.component.purl : undefined
    const newPurl = establishPurl(origPurl, rebomOverride)
    logger.debug(`established purl: ${newPurl}`)
    newBom.metadata = bom.metadata
    newBom.metadata.component.purl = newPurl
    newBom.metadata.component['bom-ref'] = newPurl
    newBom.metadata.component['name'] = rebomOverride.name 
    newBom.metadata.component['version'] = rebomOverride.version
    // newBom.metadata.component['type'] = rebomOverride.belongsTo?.toLowerCase() ?? 'application'
    newBom.metadata.component['group'] = rebomOverride.group
    newBom.metadata['authors'] = [{name: rebomOverride.group}]
    newBom.metadata['supplier'] = {name: rebomOverride.group}
    newBom.metadata['timestamp'] = (new Date(bomRecord.last_updated_date)).toISOString()

    newBom.dependencies = bom.dependencies
    const rootdepIndex = bom.dependencies.findIndex((dep: any) => {
      // logger.info(`processing bom deps | ref : ${dep.ref}`)
      return dep.ref === rootComponentPurl
    })
    logger.info(`PSDEBUG: rootdepIndex = ${rootdepIndex}`)
    if(rootdepIndex > -1)
      newBom.dependencies[rootdepIndex]['ref'] = newPurl
    else
      logger.error(`root dependecy not found ! - rootComponentPurl: ${rootComponentPurl}, \nrebomOverride:  ${rebomOverride}, \nserialNumber: ${bom.serialNumber}`)
    const finalBom = Object.assign(bom, newBom)

    const rebomTool = {
      "type": "application",
      "name": "rebom",
      "group": "io.reliza",
      version: process.env.npm_package_version,
      "authors": [{
        name: "Reliza Incorporated",
        email: "info@reliza.io"
      }],
      supplier: {
        name: "Reliza Incorporated"
      },
      "description": "Catalog of SBOMs",
      "licenses": [
        {
          "license": {
            "id": "MIT"
          }
        }
      ],
      "externalReferences": [
        {
          "url": "ssh://git@github.com/relizaio/rebom.git",
          "type": "vcs"
        },
        {
          "url": "https://reliza.io",
          "type": "website"
        }
      ]
    }
    if (!finalBom.metadata.tools) finalBom.metadata.tools = {components: []}
    if (!finalBom.metadata.tools.components) finalBom.metadata.tools.components = []
    finalBom.metadata.tools.components.push(rebomTool)
    return finalBom
  }

  // function computeSha
  function computeBomDigest(bom: any, stripBom: string): string {
    // strip meta
    let bomForDigest: any = {}
   
    if(stripBom === 'TRUE'){
      bomForDigest["components"] = bom["components"]
      bomForDigest["dependencies"] = bom["dependencies"]
      //strip version
      const rootComponentPurl: string = bom.metadata.component["bom-ref"]
      const versionStrippedRootComponentPurl = rootComponentPurl.split("@")[0]

      let rootdepIndex = bomForDigest["dependencies"].findIndex((dep: any) => {
        return dep.ref === rootComponentPurl
      }
      )
      if(rootdepIndex > -1){
        bomForDigest["dependencies"][rootdepIndex]['ref'] = versionStrippedRootComponentPurl
      }
    }else{
      bomForDigest = bom
    }
   
    // canoncicalize
    const canonBom = canonicalize(bomForDigest)

    // compute digest
    return computeSha256Hash(canonBom)
  }

  function computeSha256Hash(obj: string): string {
    const spaces = 2
    try {
        const hash = createHash('sha256');
        hash.update(obj);
        return hash.digest('hex');
    } catch (error) {
        throw new Error(`Failed to compute hash: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

  export async function addBom(bomInput: BomInput): Promise<BomRecord> {
    let bomObj = await processBomObj(bomInput.bomInput.bom)

    let proceed: boolean = await validateBom(bomObj)
    const rebomOptions : RebomOptions = bomInput.bomInput.rebomOptions ?? {}
    rebomOptions.serialNumber = bomObj.serialNumber
    const bomSha: string = computeBomDigest(bomObj, rebomOptions.stripBom)
    rebomOptions.bomDigest = bomSha
    // find bom by digest
    let bomRows: BomRecord[]
    let bomRecord: BomRecord
    bomRows = await BomRepository.bomByDigest(bomSha)
    if (!bomRows || !bomRows.length){
      if(process.env.OCI_STORAGE_ENABLED){
        bomObj = await pushToOci(rebomOptions.serialNumber, bomObj)
        rebomOptions.storage = 'oci'
      }
  
      rebomOptions.mod = 'raw'
      // urn must be unique - if same urn is supplied, we update current record
      // similarly it works for version, component group, component name, component version
      // check if urn is set on bom
      let queryText = 'INSERT INTO rebom.boms (meta, bom, tags) VALUES ($1, $2, $3) RETURNING *'
      let queryParams = [rebomOptions, bomObj, bomInput.bomInput.tags]
      if (rebomOptions.serialNumber) {
        let bomSearch: BomSearch = {
          bomSearch: {
            serialNumber: rebomOptions.serialNumber as string,
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
        let bomDtos = await findBom(bomSearch)
  
        // if not found, re-try search by meta
        if (!bomDtos || !bomDtos.length)
          bomDtos = await findBomByMeta(rebomOptions)
  
        if (bomDtos && bomDtos.length && bomDtos[0].uuid) {
          queryText = 'UPDATE rebom.boms SET meta = $1, bom = $2, tags = $3 WHERE uuid = $4 RETURNING *'
          queryParams = [rebomOptions, bomObj, bomInput.bomInput.tags, bomDtos[0].uuid]
        }
      }
  
      let queryRes = await utils.runQuery(queryText, queryParams)
      bomRows = queryRes.rows
      bomRecord = bomRows[0]
    }else{
      bomRecord = bomRows[0]
      bomRecord.duplicate = true
    }
    return bomRecord
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
          logger.info(`deduped comp by purl: ${component.purl}`)
        }
      } else if ('name' in component && 'version' in component) {
        let nver: string = component.name + '_' + component.version
        if (!(nver in name_dedup_map)) {
          out_components.push(component)
          name_dedup_map[nver] = true
        } else {
          logger.info(`deduped comp by name: ${nver}`)
        }
      } else {
        out_components.push(component)
      }
    })
    outBom.components = out_components
    if ('dependencies' in bom) {
      outBom.dependencies = bom.dependencies
    }

    logger.info(`Dedup reduced json from ${Object.keys(bom).length} to ${Object.keys(outBom).length}`)
    return outBom
  }

  async function sanitizeBom(bom: any, patterns: Record<string, string>): Promise<any> {
    try {
      let jsonString = JSON.stringify(bom);
      // logger.info('jsonstring', jsonString)
      Object.entries(patterns).forEach(([search, replace]) => {
        jsonString = jsonString.replaceAll(search, replace);
        // logger.info('replaced', jsonString)
      });
      return JSON.parse(jsonString)
      // return bom
    } catch (e) {
      logger.error("Error sanitizing bom", e)
      throw new Error("Error sanitizing bom: " + e);
    }
  }