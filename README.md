# Rebom by Reliza

## Catalog of Software Bills of Materials (SBOMs)

Rebom works with [CycloneDX](https://cyclonedx.org) JSON standard.

Public demo is available at https://rebomdemo.relizahub.com .

*N.B.* (!) Please note, that any boms uploaded to demo are publicly visible (!)


## Load SBOM to Rebom
Download [Reliza CLI](https://github.com/relizaio/reliza-cli) for your platform.

Add reliza-cli to path and run following command to load bom json:

```
reliza-cli rebom put --rebomuri "https://rebomdemo.relizahub.com" --infile "tests/bom_versioning_1.json"
```

Flags used:
- --rebomuri - set to the URI where rebom server is deployed
- --infile - set to absolute or relative path of the bom file to be added. To test, you may use samples from the tests directory of this repository.

Note that only CycloneDX BOMs in JSON are supported.


## Running Rebom packages

### With Docker-compose
Clone this repository and run the following command:

```
docker-compose up -d
```

### With Kubernetes

You would need helm pre-installed. Clone this repository. Then run:

```
kubectl create ns rebom
helm install rebom -n rebom helm/rebom
```

## Developing Rebom

You would need Docker and Node 16+. Visual Studio Code is recommended.

1. Create a docker container for database:
```
docker run --name rebom-postgres -d -p 5438:5432 -e POSTGRES_PASSWORD=password postgres:14
```

You can later start/stop database container using `docker stop rebom-postgres` and `docker start rebom-postgres`.

2. Run backend:

Backend is an Express.js / Apollo GraphQL project.

```
cd backend
npm install
npm start
```

Backend will be listening on localhost, port 4000.

3. Run frontend:

Frontend is a Vue 3 project.

```
cd frontend
npm install
npm run serve
```

Frontend will be listening on localhost, port 3005.

Navigating to http://localhost:3005 in your browser should open Rebom.
