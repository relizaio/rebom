const utils = require('./utils')
import { BomDto, BomInput, BomRecord, BomSearch, SearchObject, bomRecordToDto } from './types';

export async function findAllBoms(): Promise<BomRecord[]> {
    let queryRes = await utils.runQuery('select * from rebom.boms', [])
    let boms = queryRes.rows as BomRecord[]
    return boms
}

export async function bomById(id: string): Promise<BomRecord[]> {
    let byIdRows = await utils.runQuery(`select * from rebom.boms where uuid = $1`, [id])
    let boms = byIdRows.rows as BomRecord[]
    return boms
}

export async function bomsByIds(ids: string[]): Promise<BomRecord[]> {
    let queryRes = await utils.runQuery(`select * from rebom.boms where uuid::text in ('` + ids.join('\',\'') + `')`)
    let boms = queryRes.rows as BomRecord[]
    return boms
}
