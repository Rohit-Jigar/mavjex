FROM node:22-alpine

WORKDIR /app

# Copy repo code
COPY . .

ENV PORT=10000
EXPOSE 10000

CMD ["node", "--experimental-strip-types", "mavjex/server/src/index.ts"]
