# sinterklaas-api

Express REST API for the Sinterklaas Secret Santa app. Persists data in MongoDB via Mongoose.

## Stack

- **Node.js** with CommonJS modules
- **Express 4**
- **Mongoose 8** / MongoDB
- **dotenv** for environment configuration
- **nodemon** for development hot-reload

## Running locally

```bash
npm install
npm run dev   # starts with nodemon on port 3001
```

For production:

```bash
npm start   # node src/index.js
```

## Environment variables

Create a `.env` file in this directory:

```
MONGODB_URI=mongodb://localhost:27017/sinterklaas
FRONTEND_URL=http://localhost:3000
PORT=3001
```

`MONGODB_URI` — MongoDB connection string.  
`FRONTEND_URL` — used as the base when generating invitation URLs.  
`PORT` — defaults to `3001` if not set.  
`CORS_ORIGIN` — allowed CORS origin; defaults to `http://localhost:3000`.

## API reference

All routes are prefixed with `/api`.

### Groups — `/api/groups`

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/groups` | Create a new group/event. Body: `{ name, year }` |
| `GET` | `/api/groups/:id` | Fetch a group by ID |
| `GET` | `/api/groups/:groupId/members` | List all members of a group |
| `POST` | `/api/groups/:groupId/invite` | Generate an invitation token/URL. Body: `{ email? }` |
| `DELETE` | `/api/groups/:groupId/members/:userId` | Remove a member from the group |
| `POST` | `/api/groups/:groupId/draw` | Run the Secret Sinterklaas name draw and persist results |
| `GET` | `/api/groups/:groupId/draw` | Fetch the current draw assignments |

### Wishlists — `/api/wishlists`

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/wishlists/:userId` | List all wishlist items for a user |
| `POST` | `/api/wishlists/:userId/items` | Add an item. Body: `{ name, description?, links? }` |
| `PATCH` | `/api/wishlists/:userId/items/:itemId` | Update an item. Body: `{ name?, description?, links? }` |
| `DELETE` | `/api/wishlists/:userId/items/:itemId` | Delete an item |
| `POST` | `/api/wishlists/:userId/items/:itemId/claim` | Claim an item (mark as being bought) |
| `POST` | `/api/wishlists/:userId/items/:itemId/unclaim` | Release a claim |

### Users — `/api/users`

| Method | Path | Description |
|---|---|---|
| `PATCH` | `/api/users/:userId` | Update display name and/or email. Body: `{ displayName?, email? }` |
| `GET` | `/api/users/:userId/partner` | Get the user's linked partner (or `null`) |
| `POST` | `/api/users/:userId/partner/invite` | Link a partner by email (bidirectional). Body: `{ email }` |
| `DELETE` | `/api/users/:userId/partner` | Unlink the current partner (bidirectional) |
| `POST` | `/api/users/:userId/children` | Create a child user and attach to the parent. Body: `{ displayName, email? }` |

## Data models

- **Event** — a Sinterklaas group with a name, year, participant IDs, and stored draw assignments
- **User** — display name, email, role, optional `partnerId`, and `childrenIds`
- **WishlistItem** — belongs to an owner user; has name, description, links, and claim state
- **Invitation** — a single-use token linking to an event, with an optional email and expiry
