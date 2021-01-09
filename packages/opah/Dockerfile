FROM node:14 as builder

WORKDIR /tmp/build

ADD ./package.json ./yarn.lock ./

RUN yarn

ADD ./tsconfig.json ./
ADD ./src ./src

RUN yarn build:ts

FROM node

WORKDIR /opah

COPY --from=builder /tmp/build/package.json ./package.json
COPY --from=builder /tmp/build/yarn.lock ./yarn.lock
COPY --from=builder /tmp/build/dist ./dist

RUN yarn --production

ENTRYPOINT ["node", "/opah/dist/bin.js" ]

