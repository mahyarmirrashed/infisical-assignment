install:
  cd client && npm install
  cd server && npm install

up:
  docker compose -f compose.dev.yaml up --build

down *args:
  docker compose -f compose.dev.yaml down {{args}}
