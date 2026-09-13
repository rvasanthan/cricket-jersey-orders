# Cricket Jersey Orders

A small React + Firebase app for collecting team cricket jersey/hat/pants orders.

**Live app:** https://cricket-jersey-orders.web.app

## Stack

- React 18 + Vite
- Firebase Firestore (data) + Firebase Hosting (deploy)
- No authentication for players (per requirements). The `/admin` screen is
  gated by a client-side passcode only — see **Security notes** below.

## Project structure

- `src/pages/PlayerDashboard.jsx` – player home screen: search + add order
- `src/pages/AdminPage.jsx` – admin table, pricing settings, CSV export
- `src/components/OrderFormModal.jsx` – add/edit order widget (form + review steps)
- `src/services/ordersService.js` – all Firestore reads/writes
- `firestore.rules` – Firestore security rules
- `firebase.json` / `.firebaserc` – Hosting + Firestore deploy config

## Local development

```bash
npm install
cp .env.example .env   # fill in Firebase config + admin passcode
npm run dev
```

## Deploy

```bash
npm run build
firebase deploy --only hosting
# or: npm run deploy
```

To deploy updated Firestore rules: `firebase deploy --only firestore:rules`.

## Data model (Firestore)

- `orders/{id}`: firstName, lastName, shortName/shortNameLower, jerseyNumber,
  jerseySize, needHat/hatSize, needPants/pantsSize, totalCost, status
  (`pending` | `fulfilled` | `paid`), orderNumber (e.g. `CRK-4F7K9Q`), timestamps.
- `settings/pricing`: jerseyPrice, hatPrice, pantsPrice (admin-configurable).

Jersey number and short name are enforced unique across all orders, both via
live inline checks in the form and a re-check immediately before saving.

## Security notes

This app was explicitly scoped with **no user authentication**. That means:

- Firestore rules allow any client to read/write `orders` and `settings`
  (shape-validated only, not identity-validated).
- The Admin screen (`/admin`) is protected only by a passcode
  (`VITE_ADMIN_PASSCODE`) checked in the browser — this deters casual access
  but is **not a real security boundary**. Anyone with the deployed URL,
  Firebase API key, and passcode can read/write all data.
- If real access control is ever needed, add Firebase Authentication
  (e.g. anonymous + custom claims for admins) and rewrite `firestore.rules`
  to check `request.auth`.
