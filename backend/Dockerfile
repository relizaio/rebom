FROM node:18-alpine3.17 as builder

ARG CI_ENV=noci
ARG GIT_COMMIT=git_commit_undefined
ARG GIT_BRANCH=git_branch_undefined
ARG VERSION=not_versioned
ARG TARGETARCH
ARG TARGETOS
ARG CYCLONE_DX_CLI_VERSION=v0.25.0
RUN if [ "$TARGETARCH" = "amd64" ]; then \
        wget https://github.com/CycloneDX/cyclonedx-cli/releases/download/${CYCLONE_DX_CLI_VERSION}/cyclonedx-linux-musl-x64 ;\
        mv cyclonedx-linux-musl-x64 /usr/local/bin/cyclonedx-cli ;\
    elif [ "$TARGETARCH" = "arm64" ]; then \
        wget https://github.com/CycloneDX/cyclonedx-cli/releases/download/${CYCLONE_DX_CLI_VERSION}/cyclonedx-${TARGETOS}-${TARGETARCH} ;\
        mv cyclonedx-${TARGETOS}-${TARGETARCH} /usr/local/bin/cyclonedx-cli ;\
fi
RUN mkdir /app
RUN echo "version=$VERSION" > /app/version && echo "commit=$GIT_COMMIT" >> /app/version && echo "branch=$GIT_BRANCH" >> /app/version
WORKDIR /app
RUN addgroup -S apprunner && adduser -S apprunner -G apprunner && chown apprunner:apprunner -R /app && chown apprunner:apprunner /usr/local/bin/cyclonedx-cli && chmod a+x /usr/local/bin/cyclonedx-cli 
COPY package*.json ./
RUN npm install && npm install -g ts-node
COPY ./ .

ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=true 
LABEL git_commit $GIT_COMMIT
LABEL git_branch $GIT_BRANCH
LABEL ci_environment $CI_ENV
LABEL version $VERSION

EXPOSE 4000

CMD ["npm", "start"]