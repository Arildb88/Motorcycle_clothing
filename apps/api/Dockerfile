FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Generate does not connect. These are local placeholders so Prisma 5.22 can read the datasource env vars.
ENV DATABASE_URL="postgresql://motorcycle:motorcycle@localhost:5432/motorcycle"
ENV DIRECT_URL="postgresql://motorcycle:motorcycle@localhost:5432/motorcycle"
RUN npx prisma generate && npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
EXPOSE 3000
# Startup applies migrations, so the container must receive DIRECT_URL on port 5432
# (session or direct). Do not point it at a transaction pooler.
# The build placeholders above are local only.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
