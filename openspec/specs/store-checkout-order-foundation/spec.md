# Store Checkout Order Foundation Specification

## ADDED Requirements

### Requirement: Order persistence model and immutable snapshots

The system MUST persist orders and order items as durable checkout records independent of mutable cart and catalog state.

Orders MUST store customer name, customer email, status, subtotal minor units, total minor units, and a private confirmation token. Monetary values MUST use integer minor units for Peruvian soles (S/.). Order status MUST be limited to `pending` and `confirmed` for this slice.

Order items MUST snapshot the product id, product name, product slug, unit price minor units, quantity, and line total minor units at checkout time. Historical order display MUST use order snapshots and MUST NOT depend on current product name, slug, price, or cart line data.

#### Scenario: Order records contain durable totals and contact

- **Given** a shopper has a valid cart with one or more purchasable items
- **And** the shopper provides valid `customerName` and `customerEmail`
- **When** checkout creates an order
- **Then** the order MUST be persisted with customer name and email
- **And** the order MUST store subtotal and total as integer minor units
- **And** the order status MUST be either `pending` or `confirmed`

#### Scenario: Order item snapshots survive catalog changes

- **Given** an order item was created for product `A` with name, slug, unit price, quantity, and line total snapshots
- **When** product `A` is later renamed, repriced, archived, or deleted from public catalog visibility
- **Then** the order item MUST retain the original snapshot values
- **And** historical order details MUST remain renderable from the order data

### Requirement: Checkout contact validation

Checkout MUST require only `customerName` and `customerEmail` as customer-provided contact fields.

The system MUST reject checkout when either required field is missing or invalid. This slice MUST NOT require phone number, shipping address, tax details, payment details, or account registration.

#### Scenario: Valid minimal contact is accepted

- **Given** a shopper has a non-empty valid cart
- **When** the shopper submits checkout with `customerName` and a syntactically valid `customerEmail`
- **Then** checkout validation MUST accept the contact payload
- **And** no additional customer contact field MUST be required

#### Scenario: Missing or invalid contact is rejected

- **Given** a shopper has a non-empty cart
- **When** the shopper submits checkout without `customerName`, without `customerEmail`, or with an invalid email value
- **Then** checkout MUST be rejected with a validation failure
- **And** no order MUST be created
- **And** the cart MUST remain available to the shopper

### Requirement: Cart-to-order transaction

The system MUST convert the current cart into an order through a single server-side checkout operation.

Order creation, order item creation, authoritative total calculation, stock decrement, and successful cart clearing MUST be consistent as one checkout result. The system MUST reject empty carts and MUST NOT create partial orders.

#### Scenario: Non-empty cart becomes one complete order

- **Given** a shopper has a current cart containing one or more valid line items
- **And** the shopper provides valid checkout contact
- **When** checkout succeeds
- **Then** exactly one order MUST be created for that checkout attempt
- **And** each cart line MUST become a corresponding order item snapshot
- **And** the order totals MUST equal the sum of order item line totals

#### Scenario: Empty cart cannot be checked out

- **Given** a shopper has no current cart items
- **When** the shopper submits checkout with otherwise valid contact
- **Then** checkout MUST be rejected
- **And** no order MUST be created
- **And** no product stock MUST be changed

#### Scenario: Partial order creation is not observable

- **Given** checkout encounters a validation, stock, or persistence failure
- **When** the checkout attempt finishes
- **Then** the system MUST NOT expose a partially created order
- **And** the cart MUST remain available for correction or retry

### Requirement: Stock revalidation, decrement, and stale cart rejection

Checkout MUST revalidate each cart item against authoritative product state at order creation time.

A cart item MUST be rejected as stale when the product no longer exists, is not `active`, has insufficient stock for the requested quantity, or otherwise fails current purchasability rules. Product stock MUST be decremented transactionally only when the order is successfully created.

#### Scenario: Checkout decrements stock on success

- **Given** product `A` is active with stock quantity `5`
- **And** the shopper cart contains product `A` with quantity `2`
- **When** checkout succeeds
- **Then** product `A` stock quantity MUST become `3`
- **And** the order item for product `A` MUST snapshot quantity `2`

#### Scenario: Over-stock stale cart is rejected

- **Given** product `A` stock quantity changed to `1` after the shopper placed quantity `2` in the cart
- **When** the shopper submits checkout
- **Then** checkout MUST be rejected as stale or unavailable
- **And** no order MUST be created
- **And** product `A` stock quantity MUST NOT be decremented for the failed attempt
- **And** the cart MUST remain available to the shopper

#### Scenario: Non-active product stale cart is rejected

- **Given** a cart contains product `A`
- **And** product `A` is changed from `active` to `draft` or `archived` before checkout
- **When** the shopper submits checkout
- **Then** checkout MUST be rejected
- **And** no order MUST be created for product `A`
- **And** the cart MUST remain available to the shopper

#### Scenario: Checkout totals use authoritative current product prices

- **Given** a cart was displaying product `A` with an earlier live price
- **And** product `A` has a different authoritative price at checkout time
- **When** checkout succeeds
- **Then** order item unit price and line total snapshots MUST use the authoritative checkout-time price
- **And** order subtotal and total MUST be computed from those snapshots in integer minor units

### Requirement: Cart lifecycle after checkout success or failure

The system MUST clear the shopper cart only after successful order creation. Failed checkout attempts MUST preserve cart contents so the shopper can correct stale quantities, update contact, or retry.

#### Scenario: Successful checkout clears the cart

- **Given** a shopper has a cart with one or more items
- **When** checkout successfully creates an order
- **Then** the shopper cart MUST no longer contain those items
- **And** `/carrito` MUST render an empty cart state or an equivalent post-checkout empty state

#### Scenario: Failed checkout preserves the cart

- **Given** a shopper has a cart with one or more items
- **When** checkout fails because of invalid contact, stale stock, unavailable product, or persistence failure
- **Then** the cart MUST retain its pre-checkout line items
- **And** the shopper MUST be able to inspect or update the cart after the failure

### Requirement: Private confirmation token behavior

Order confirmation access MUST use a dedicated private, non-enumerable order confirmation token.

The anonymous cart token MUST NOT grant order access and MUST NOT be reused as an order credential. Public confirmation UX MUST require the private confirmation token or an equivalent private credential specific to the order.

#### Scenario: Successful checkout provides private confirmation access

- **Given** checkout successfully creates an order
- **When** the shopper is directed to confirmation
- **Then** confirmation access MUST be tied to the order private token
- **And** the confirmation view MUST be able to display the order snapshot and totals for that order

#### Scenario: Cart token does not grant order access

- **Given** a shopper has or previously had an anonymous cart token
- **And** an order exists with a distinct private confirmation token
- **When** a request attempts to access the order using only the cart token
- **Then** the system MUST deny order access
- **And** the cart token MUST NOT be treated as an order credential

#### Scenario: Invalid confirmation token is rejected

- **Given** an order exists
- **When** confirmation is requested with a missing, invalid, or unrelated private token
- **Then** order details MUST NOT be disclosed
- **And** the system SHOULD render a not-found or access-denied outcome

### Requirement: Public catalog, admin product, and cart regressions are preserved

The checkout foundation MUST preserve existing public catalog, admin product, and cart behavior from `store-admin-products` and `store-cart-foundation` unless explicitly changed by this spec.

Public catalog visibility MUST continue to show only active products. Admin product management MUST remain protected by the established administrator and view-mode gates. Cart mutation validation, anonymous cart cookie handling, quantity rules, subtotal formatting, and cart page behavior MUST continue to work outside successful checkout clearing.

#### Scenario: Public catalog visibility remains active-only

- **Given** products exist in `active`, `draft`, and `archived` states
- **When** a shopper opens public store catalog or product detail routes
- **Then** public visibility MUST continue to follow the active-only catalog contract
- **And** checkout changes MUST NOT expose draft or archived products publicly

#### Scenario: Admin product management remains protected

- **Given** a visitor, client user, or administrator in client view mode attempts to access store admin product management
- **When** checkout foundation has been implemented
- **Then** existing admin access restrictions MUST still deny unauthorized access
- **And** product mutation actions MUST remain protected by the existing admin gate

#### Scenario: Cart behavior remains intact before checkout

- **Given** a shopper uses existing cart add, update, remove, clear, or read behavior
- **When** no successful checkout has occurred
- **Then** cart persistence, anonymous identity, quantity validation, purchasability validation, and subtotal formatting MUST behave as specified by `store-cart-foundation`

### Requirement: Strict TDD evidence expectations

Implementation and verification MUST follow strict TDD protocol: RED, GREEN, TRIANGULATE, REFACTOR.

Checkout/order work MUST include failing test or validator evidence before production implementation, then passing evidence after implementation. Verification MUST include `pnpm test`; targeted evidence SHOULD cover order snapshots, contact validation, cart-to-order transaction behavior, stock decrement, stale cart rejection, cart lifecycle, confirmation token access, and preserved catalog/admin/cart regressions.

#### Scenario: RED evidence precedes production changes

- **Given** apply phase starts for this change
- **When** checkout/order tests or validators are introduced
- **Then** phase reporting MUST record failing RED evidence before the corresponding production behavior is completed

#### Scenario: GREEN evidence verifies core checkout behavior

- **Given** implementation is complete
- **When** verification runs
- **Then** `pnpm test` MUST be run or a blocker MUST be documented
- **And** passing evidence SHOULD include targeted checkout/order tests for snapshots, stock decrement, stale cart rejection, cart clearing on success, cart preservation on failure, and private confirmation-token behavior

#### Scenario: Regression evidence is recorded

- **Given** checkout/order implementation changes shared product, cart, route, action, or persistence code
- **When** verification completes
- **Then** phase reporting SHOULD include evidence that public catalog, admin product management, and cart foundation behavior remain intact

### Requirement: Signed-in checkout ownership linkage for account history

When checkout succeeds for an authenticated user, the system MUST persist that order with `Order.userId` set to the authenticated user identity so account history can enforce ownership by `userId`.

When checkout succeeds without an authenticated user, the system MUST keep `Order.userId` unlinked and MUST keep access in the private confirmation-token flow only.

#### Scenario: Authenticated checkout creates linkable owned order

- GIVEN a shopper is authenticated and submits a valid checkout
- WHEN the order is created successfully
- THEN the created order MUST persist with `Order.userId` equal to that authenticated user
- AND the order SHALL be eligible for that user's account history filtering

#### Scenario: Guest checkout remains outside account history

- GIVEN a shopper is not authenticated and submits a valid checkout
- WHEN the order is created successfully
- THEN the created order MUST NOT be linked to any user account
- AND account history routes MUST NOT treat email, cart token, or confirmation token as ownership credentials

### Requirement: Checkout Rate Limiting Before Order Creation

Checkout submission MUST enforce server-side rate limiting before validation, stock checks, transaction creation, order persistence, stock decrement, or cart clearing work begins.

When a checkout attempt is throttled, the system MUST NOT create an order, decrement stock, clear the cart, or disclose whether customer contact, cart contents, product availability, or account state is valid. The shopper-facing result MUST be controlled, retry-safe, and aligned with the shared public-mutation rate-limit behavior.

#### Scenario: Repeated checkout attempts are throttled before mutation

- GIVEN a shopper or request actor has exceeded the checkout submission limit
- WHEN checkout is submitted with otherwise valid cart and contact data
- THEN checkout MUST be rejected before order creation starts
- AND no order, order item, stock decrement, payment-adjacent side effect, or cart clearing MUST occur

#### Scenario: Throttled checkout preserves privacy and cart state

- GIVEN a checkout attempt is rate limited
- WHEN the system returns the checkout result
- THEN the response MUST NOT reveal whether the cart, customer email, account, or product availability was otherwise valid
- AND the cart MUST remain available for a later retry

#### Scenario: Checkout shares production-grade limit enforcement

- GIVEN checkout runs in production
- WHEN rate limits are evaluated
- THEN checkout MUST use the same shared cross-instance rate-limit backing decision as other protected public mutations
- AND process-local counters MUST NOT be the production enforcement mechanism

#### Scenario: Checkout throttling is observable without leaking sensitive data

- GIVEN a checkout attempt is allowed or denied by rate limiting
- WHEN the event is logged or measured
- THEN operational telemetry MUST identify the checkout surface and limit decision
- AND telemetry MUST NOT include full cart contents, raw contact details, secrets, or account-enumerating conclusions

## Non-goals

The following are explicitly out of scope for `store-checkout-order-foundation` and MUST NOT be implemented in this change:

- payment providers, payment intents, card/cash payment flows, or payment state modeling;
- shipping, taxes, invoices, fulfillment, notifications, or email;
- admin order management;
- stock reservation, reservation expiry, or inventory holds beyond transactionally decrementing stock on successful order creation;
- cart merge-on-login, abandoned-cart recovery, or broader cart lifecycle redesign;
- discounts, coupons, bundles, variants, or multi-currency support;
- requiring phone number, shipping address, tax identity, payment details, or account registration during checkout;
- navbar cart/order counts or broad storefront redesign;
- catalog-card checkout/add-to-cart behavior changes;
- using the cart anonymous token as an order access credential.
