# hu.sh: Secret Sharing Service

![](./client/res/screenshot.png)

## Overview

- **Backend:** An API built with **Express.js**.
- **Frontend:** A user interface built with **React.js**.
- **Database:** A **PostgreSQL** database with query operations powered by
  **Knex.js**.
- **Docker Compose:** Used to orchestrate all services in the development
  environment.

## Local Access Links

| Service    | URL                                            |
| ---------- | ---------------------------------------------- |
| Frontend   | [http://localhost:3000](http://localhost:3000) |
| Backend    | [http://localhost:8000](http://localhost:8000) |
| PostgreSQL | `localhost:5432` (via psql or client tools)    |
| pgAdmin    | [http://localhost:5050](http://localhost:5050) |

## Development Commands

Many of the common development commands are documented in the
[Justfile](./Justfile).

### Install Dependencies

```bash
just install
```

### Build and Start Services

```bash
just up
```

### Stop and Remove Services

```bash
just down
```
