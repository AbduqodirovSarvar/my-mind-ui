# Build context: web/
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
# Optional extra root CA (e.g. a TLS-inspecting corporate proxy); empty in CI. See deploy/.env.example.
RUN --mount=type=secret,id=extra_ca \
    if [ -s /run/secrets/extra_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca; fi && \
    npm ci

COPY . .
RUN npx ng build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=4000

# The SSR server bundle is self-contained; node_modules is not needed at runtime.
COPY --from=build /app/dist/web ./dist/web

USER node
EXPOSE 4000
CMD ["node", "dist/web/server/server.mjs"]
