import axios, { AxiosResponse } from 'axios';
import FormData from 'form-data';

const client = axios.create({
    baseURL: process.env.OCI_ARTIFACT_SERVICE_HOST ? process.env.OCI_ARTIFACT_SERVICE_HOST : `http://[::1]:8083/`,
  });

const registryHost = process.env.OCIARTIFACTS_REGISTRY_HOST 
const repository = process.env.OCIARTIFACTS_REGISTRY_NAMESPACE + '/rebom-artifacts'

export async function fetchFromOci(tag: string): Promise<Object>{
    if(tag.startsWith("urn")){
        tag = tag.replace("urn:uuid:","")
    }
    const resp: AxiosResponse = await client.get('/pull', { 
        params: {
            registry: registryHost,
            repo: repository,
            tag: tag
        },
        headers: {
            Accept: 'application/json'
        }
    });
    const bom: any = resp.data

    return bom
}

interface OciResponse {
    mediaType?: string,
    digest?: string,
    size?: string,
    artifactType?: string
}

export async function pushToOci(tag: string, bom: any): Promise<OciResponse>{
    if(tag.startsWith("urn")){
        tag = tag.replace("urn:uuid:","")
    }
    let resp: OciResponse = {}
    const formData = new FormData();
    formData.append('registry', registryHost)
    formData.append('repo', repository)
    formData.append('tag', tag)
    const jsonBuffer = Buffer.from(JSON.stringify(bom));
    formData.append('file', jsonBuffer, 'file.json')
    console.log('client before sending request', client)
    console.log('formData before sending request', formData)
    try {
        const response = await client.post('/push', formData, {
            headers: {
            ...formData.getHeaders(),
            },
        });
        resp = response.data
        console.log('response from oci service: ', response)
        } catch (error) {
            console.error(`Error sending request: ${error}`);
        }
    return resp
}