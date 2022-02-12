FROM node:16.14.0-alpine3.15
ARG CI_ENV=noci
ARG GIT_COMMIT=git_commit_undefined
ARG GIT_BRANCH=git_branch_undefined
ARG VERSION=not_versioned
RUN mkdir /app
RUN echo "version=$VERSION" > /app/version && echo "commit=$GIT_COMMIT" >> /app/version && echo "branch=$GIT_BRANCH" >> /app/version
WORKDIR /app
COPY package*.json ./
RUN npm install && npm install -g ts-node
COPY ./ .

LABEL git_commit $GIT_COMMIT
LABEL git_branch $GIT_BRANCH
LABEL ci_environment $CI_ENV
LABEL version $VERSION

EXPOSE 4000

CMD ["npm", "start"]