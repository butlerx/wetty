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

ENV KUBE_VERSION="v1.16.2"
ENV VELERO_VERSION="1.1.0"
ENV HELM_VERSION="2.15.1"
#ENV KUBEDB_VERSION="v0.13.0-rc.0"
ENV NODE_ENV=production
ENV DOCTL_VERSION="1.33.0"

RUN apk add -U openssh-client sshpass curl git nano wget openrc
EXPOSE 3000
COPY --from=builder /usr/src/app/dist /usr/src/app/dist
COPY --from=builder /usr/src/app/node_modules /usr/src/app/node_modules
COPY package.json /usr/src/app
COPY index.js /usr/src/app
RUN mkdir ~/.ssh \
 && ssh-keyscan -H wetty-ssh >> ~/.ssh/known_hosts \
 && adduser bernd -D --home /home/bernd

ADD https://storage.googleapis.com/kubernetes-release/release/${KUBE_VERSION}/bin/linux/amd64/kubectl /usr/local/bin/kubectl
RUN chmod +x /usr/local/bin/kubectl \
 && wget https://github.com/vmware-tanzu/velero/releases/download/v${VELERO_VERSION}/velero-v${VELERO_VERSION}-linux-amd64.tar.gz \
 && tar -xvf velero-v${VELERO_VERSION}-linux-amd64.tar.gz -C /usr/local/bin \
 && chmod +x /usr/local/bin/velero-v${VELERO_VERSION}-linux-amd64/velero \
 && mv /usr/local/bin/velero-v${VELERO_VERSION}-linux-amd64/velero /usr/local/bin/ && rm /usr/local/bin/velero-v${VELERO_VERSION}-linux-amd64 -rf \
 #&& wget -O kubedb https://github.com/kubedb/cli/releases/download/${KUBEDB_VERSION}/kubedb-linux-amd64 \
 #&& chmod +x kubedb \
 #&& mv kubedb /usr/local/bin/ \
 && wget https://get.helm.sh/helm-v${HELM_VERSION}-linux-amd64.tar.gz \
 && tar -xvf helm-v${HELM_VERSION}-linux-amd64.tar.gz -C /usr/local/bin \
 && chmod +x /usr/local/bin/linux-amd64/helm \
 && mv /usr/local/bin/linux-amd64/helm /usr/local/bin/ && rm /usr/local/bin/linux-amd64 -rf \
 && wget https://github.com/digitalocean/doctl/releases/download/v${DOCTL_VERSION}/doctl-${DOCTL_VERSION}-linux-amd64.tar.gz \
 && tar -xvf doctl-${DOCTL_VERSION}-linux-amd64.tar.gz -C /usr/local/bin \
 && chmod +x /usr/local/bin/doctl

ENTRYPOINT [ "node", "." ]
