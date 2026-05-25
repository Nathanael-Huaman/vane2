# Delta for Store Checkout Order Foundation

## ADDED Requirements

### Requirement: Anonymous Checkout CAPTCHA Gate

Anonymous checkout submissions MUST include a server-verified CAPTCHA before order creation begins. Authenticated checkout submissions MUST bypass CAPTCHA and preserve existing `Order.userId` linkage behavior.

The checkout flow MUST evaluate rate limiting before CAPTCHA verification. Missing, invalid, or verifier-failed CAPTCHA results MUST reject checkout before contact validation, stock checks, order persistence, stock decrement, or cart clearing, and MUST return a neutral retry-safe failure.

#### Scenario: Anonymous checkout without CAPTCHA is rejected before mutation

- GIVEN an unauthenticated shopper has a cart and submits checkout without a CAPTCHA token
- WHEN checkout processes the submission
- THEN checkout MUST be rejected before order creation, stock decrement, or cart clearing
- AND the response MUST NOT reveal whether contact, cart, or product state was otherwise valid

#### Scenario: Anonymous checkout with invalid CAPTCHA fails closed

- GIVEN an unauthenticated shopper submits checkout with a missing, invalid, expired, or verifier-failed CAPTCHA result
- WHEN checkout processes the submission
- THEN checkout MUST fail closed with a neutral retry-safe failure
- AND no order, order item, stock decrement, or cart clearing MUST occur

#### Scenario: Valid anonymous CAPTCHA allows existing checkout rules to proceed

- GIVEN an unauthenticated shopper submits valid contact, a valid cart, and a server-verified CAPTCHA
- WHEN checkout processes the submission
- THEN checkout MAY proceed to existing cart-to-order validation and mutation rules
- AND successful checkout MUST still create an unlinked guest order using private confirmation-token access

#### Scenario: Authenticated checkout bypasses CAPTCHA

- GIVEN an authenticated shopper submits valid checkout without a CAPTCHA token
- WHEN checkout processes the submission
- THEN CAPTCHA MUST NOT be required
- AND successful checkout MUST persist `Order.userId` for account history ownership

#### Scenario: Rate limiting remains the first checkout gate

- GIVEN a checkout attempt exceeds the configured submission limit
- WHEN checkout processes the submission with any CAPTCHA value
- THEN rate limiting MUST reject the attempt before CAPTCHA verification or order mutation
- AND no CAPTCHA verifier result MUST be required to preserve the denial
