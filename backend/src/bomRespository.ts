const utils = require('./utils')
import { BomRecord } from './types';

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

export async function bomBySerialNumber(serialNumber: string): Promise<BomRecord[]> {
    if (!serialNumber.startsWith('urn')) {
        serialNumber = 'urn:uuid:' + serialNumber
    }
    let byIdRows = await utils.runQuery(`select * from rebom.boms where meta->>'serialNumber' = $1 ORDER BY (meta->>'bomVersion')::numeric DESC
LIMIT 1;`, [serialNumber])
    let boms = byIdRows.rows as BomRecord[]
    return boms
}

export async function bomsByIds(ids: string[]): Promise<BomRecord[]> {
    let queryRes = await utils.runQuery(`select * from rebom.boms where uuid::text in ('` + ids.join('\',\'') + `')`)
    let boms = queryRes.rows as BomRecord[]
    return boms
}

export async function bomByDigest(digest: string): Promise<BomRecord[]> {
    let queryRes = await utils.runQuery(`select * from rebom.boms where meta->>'bomDigest' = $1`, [digest])
    let boms = queryRes.rows as BomRecord[]
    return boms
}