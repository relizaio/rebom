export type BomRecord = {
    uuid: string,
    created_date: Date,
    last_updated_date: Date,
    meta: string,
    bom: any,
    tags: Object,
    organization: string,
    public: boolean
}

export type BomDto = {
    uuid: string,
    createdDate: Date,
    lastUpdatedDate: Date,
    meta: string,
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
        meta: string,
        bom: any,
        tags: Object
        rebomOptions: any
    }
}

export type RebomOptions = {
    group: string,
    name: string, 
    version: string,
    bomSource: string,
    tldOnly: boolean,
    releaseId: string
}
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