#!/bin/bash
bun install
bun run db:push
bun run db:seed
bun build ./src/index.ts --outfile server --compile
