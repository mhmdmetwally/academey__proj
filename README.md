# Academy API

## Local Docker Setup

Run the API, MongoDB replica set, and Redis with:

```sh
docker compose up --build
```

The API listens on `http://localhost:3000`. MongoDB data is stored in the
`mongo_data` Docker volume. The default JWT secret is for local development
only; set `JWT_SECRET` before using this stack in a shared environment.

## Currency Behavior

Set the academy's base currency during registration with the optional `currency`
field, for example `"currency": "EGP"`. If omitted, `DEFAULT_CURRENCY` is used.
The base currency is used for lesson prices, invoices, and payroll.

Expenses and payments accept an optional 3-letter `currency` code. If it is
omitted, the academy's base currency is used. The original amount is retained,
and its converted base-currency amount and rate are saved at entry time. A
foreign-currency invoice payment is converted to the invoice currency before the
invoice balance is updated. When allocating an advance, `amount` is expressed in
the advance payment's original currency.

Choose the report display currency with the `currency` query parameter:

```text
GET /financial/report?currency=USD
```

Exchange rates come from the free Open ER API and are cached in Redis for 12
hours. Redis is optional; the API falls back to the rate provider if Redis is
unavailable. Reports convert saved base-currency values using the current
cached rate. Existing records without currency fields are interpreted using the
academy base currency (or `DEFAULT_CURRENCY` for legacy academies).