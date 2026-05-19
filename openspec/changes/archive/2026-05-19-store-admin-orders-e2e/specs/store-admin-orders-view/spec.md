# Delta for Store Admin Orders View

## ADDED Requirements

### Requirement: Browser E2E evidence for admin orders workflows

The system MUST have focused Playwright/browser-level evidence for existing admin order list access, order detail navigation, and one authorized status mutation flow. This requirement adds verification expectations only and MUST NOT expand product behavior, introduce new order statuses, or change the existing admin gate contract.

Browser evidence SHOULD run against deterministic seeded data and an authenticated administrator in `administrador` view mode. Assertions MUST use visible persisted order data or persisted status outcomes rather than implementation-only details.

#### Scenario: Authorized admin sees seeded order list

- **Given** a browser session is authenticated as a real `administrador` in `administrador` view mode
- **And** deterministic persisted orders exist with customer name, customer email, status, total, and identifiers
- **When** the browser opens `/admin/tienda/pedidos`
- **Then** the page MUST render the admin orders list with the seeded order data visible
- **And** the evidence MUST prove list access without relying on checkout-driven setup

#### Scenario: Authorized admin navigates from list to detail

- **Given** the browser is on `/admin/tienda/pedidos` as an authorized administrator
- **And** a seeded order is visible in the list
- **When** the administrator follows that order's detail navigation
- **Then** the browser MUST reach the matching `/admin/tienda/pedidos/<id>` detail route
- **And** the detail page MUST render the same persisted customer and order data

#### Scenario: Authorized admin confirms a pending order in browser

- **Given** a seeded order exists with status `pending`
- **And** the browser is authenticated as an administrator in admin view mode
- **When** the administrator submits the existing status change control to set the order to `confirmed`
- **Then** the browser-visible result MUST show the order as `confirmed`
- **And** follow-up evidence MUST confirm the persisted order status is `confirmed`

#### Scenario: Admin in client view is denied admin order pages

- **Given** a browser session is authenticated as a real `administrador` in `cliente` view mode
- **When** the browser opens `/admin/tienda/pedidos` or a seeded order detail route
- **Then** the system MUST deny access according to the established admin gate
- **And** seeded admin order data MUST NOT be rendered

## Non-goals

This E2E hardening slice MUST NOT add product behavior, new statuses, all-browser coverage requirements, checkout-driven setup, broad helper refactors, or extra denial cases beyond cheap reuse of existing gate setup.
