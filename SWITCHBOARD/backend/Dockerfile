FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
COPY src ./src
COPY tsconfig.json ./
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV DIRECT_URL=postgresql://build:build@localhost:5432/build
RUN npx prisma generate && npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/dist ./dist
EXPOSE 4000
CMD ["npm","start"]
