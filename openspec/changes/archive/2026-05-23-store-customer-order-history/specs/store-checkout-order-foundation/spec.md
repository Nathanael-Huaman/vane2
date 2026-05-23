# Delta for Store Checkout Order Foundation

## ADDED Requirements

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
