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
    serialNumber: string,
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
