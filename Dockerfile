FROM node:boron-alpine as builder

RUN apk add -U build-base python
WORKDIR /usr/src/app
COPY . /usr/src/app
RUN yarn && \
    yarn build && \
    yarn install --production --ignore-scripts --prefer-offline

FROM node:boron-alpine
LABEL maintainer "Bernd Klaus <me@berndklaus.at>"
WORKDIR /usr/src/app

ENV KUBE_VERSION="v1.15.0"
ENV VELERO_VERSION="v1.0.0"
ENV HELM_VERSION="v2.14.1"
ENV KUBEDB_VERSION=0.12.0
ENV NODE_ENV=production

RUN apk add -U openssh-client sshpass curl git nano wget openrc
EXPOSE 3000
COPY --from=builder /usr/src/app/dist /usr/src/app/dist
COPY --from=builder /usr/src/app/node_modules /usr/src/app/node_modules
COPY package.json /usr/src/app
COPY index.js /usr/src/app
RUN mkdir ~/.ssh
RUN ssh-keyscan -H wetty-ssh >> ~/.ssh/known_hosts

ADD https://storage.googleapis.com/kubernetes-release/release/${KUBE_VERSION}/bin/linux/amd64/kubectl /usr/local/bin/kubectl
RUN chmod +x /usr/local/bin/kubectl \
 && wget https://github.com/heptio/velero/releases/download/v1.0.0/velero-${VELERO_VERSION}-linux-amd64.tar.gz \
 && tar -xvf velero-${VELERO_VERSION}-linux-amd64.tar.gz -C /usr/local/bin \
 && chmod +x /usr/local/bin/velero-v1.0.0-linux-amd64/velero \
 && mv /usr/local/bin/velero-${VELERO_VERSION}-linux-amd64/velero /usr/local/bin/ && rm /usr/local/bin/velero-${VELERO_VERSION}-linux-amd64 -rf \
 && wget -O kubedb https://github.com/kubedb/cli/releases/download/${KUBEDB_VERSION}/kubedb-linux-amd64 \
 && chmod +x kubedb \
 && mv kubedb /usr/local/bin/ \
 && wget https://get.helm.sh/helm-${HELM_VERSION}-linux-amd64.tar.gz \
 && tar -xvf helm-${HELM_VERSION}-linux-amd64.tar.gz -C /usr/local/bin \
 && chmod +x /usr/local/bin/linux-amd64/helm \
 && mv /usr/local/bin/linux-amd64/helm /usr/local/bin/ && rm /usr/local/bin/linux-amd64 -rf


ENTRYPOINT [ "node", "." ]
