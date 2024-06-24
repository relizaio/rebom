export type BomRecord = {
    uuid: string,
    created_date: Date,
    last_updated_date: Date,
    meta: RebomOptions,
    bom: any,
    tags: Object,
    organization: string,
    public: boolean
}

export type BomDto = {
    uuid: string,
    createdDate: Date,
    lastUpdatedDate: Date,
    meta: RebomOptions,
    bom: Object,
    tags: Object,
    organization: string,
    public: boolean,
    bomVersion: string,
    group: string,
    name: string,
    version: string
}

export type BomInput = {
    bomInput: {
        bom: any,
        tags?: Object,
        rebomOptions: RebomOptions
    }
}

export type RebomMeta = {
    relizaType: string,

    
}
export type RebomOptions = {
    name: string,
    group: string,
    version: string,
    rebomType: string, // rebomType = application and hash = null || rebomType = '' = a cross merged bom
    hash?: string,
    notes: string,
    tldOnly: boolean,
    structure: string,
    bomState: String, //[raw, merged, cross-merged]
}

// export type RebomOverride = {
//     name: string,
//     group: string,
//     version: string,
    
//     rebomType: string,
//     hash?: string,


//     tldOnly: boolean,
//     structure: string,
//     bomState: String, [raw. merged, cross-merged]
//   }

// export type RebomMergeOptions = {
//     rebomType: string,
//     tldOnly: boolean,
//     structure: string,
//     hash?: string
//   }
export type BomSearch = {
    bomSearch: {
        serialNumber: string,
        version: string,
        componentVersion: string,
        componentGroup: string,
        componentName: string,
        singleQuery: string,
        page: number,
        offset: number
    }
}

export type SearchObject = {    
    queryText: string,
    queryParams: string[],
    paramId: number
}

export const HIERARCHICHAL = 'hierarchical'

export function bomRecordToDto(bomRecord: BomRecord): BomDto {
    let version = ''
    let group = ''
    let name = ''
    let bomVersion = ''
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
        version: version
    }
    return bomDto
}