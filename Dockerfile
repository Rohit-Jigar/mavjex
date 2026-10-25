FROM node:22-alpine

WORKDIR /app

# Copy entire repository
COPY . .

ENV PORT=10000
EXPOSE 10000

CMD ["node", "--experimental-strip-types", "server/src/index.ts"]
