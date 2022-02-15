# Rebom by Reliza

## Catalog of Software Bills of Materials (SBOMs)

Rebom works with [CycloneDX](https://cyclonedx.org) json standard.

## Running SBOM

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

## Load SBOM to Rebom
Download [Reliza CLI](https://github.com/relizaio/reliza-cli) for your platform.

Add reliza-cli to path and run following command to load bom json:

```
reliza-cli rebom put --rebomuri http://localhost --infile "tests/bom_versioning_1.json"
```

Flags used:
- --rebomuri - set to the URI where rebom server is deployed
- --infile - set to absolute or relative path of the bom file to be added. To test, you may use samples from the tests directory of this repository.