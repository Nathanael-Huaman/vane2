# Delta for Production Security Controls

## ADDED Requirements

### Requirement: Bot Challenge for Anonymous Checkout Mutation

Anonymous checkout MUST be treated as a public abuse-prone mutation requiring server-side bot-challenge verification in addition to shared rate limiting. Signed-in checkout MUST NOT require that anonymous bot challenge.

The bot-challenge verifier MUST fail closed when the token is missing, invalid, expired, malformed, or the verification service cannot produce an allow decision. Denials MUST be privacy-preserving and MUST NOT disclose cart, product, customer email, account, or order validity.

#### Scenario: Anonymous checkout requires verified bot challenge

- GIVEN an unauthenticated request submits the checkout mutation
- WHEN production security controls evaluate abuse protections
- THEN the request MUST pass shared rate limiting and server-side bot-challenge verification before checkout mutation proceeds
- AND the bot challenge MUST NOT replace the existing rate limit requirement

#### Scenario: Bot verifier failure preserves privacy

- GIVEN bot-challenge verification is missing, invalid, expired, malformed, or unavailable
- WHEN anonymous checkout is submitted
- THEN checkout MUST be denied without creating order side effects
- AND the response and logs MUST NOT disclose cart contents, contact validity, account existence, or product availability

#### Scenario: Authenticated checkout remains outside anonymous challenge

- GIVEN a signed-in shopper submits checkout
- WHEN production security controls evaluate bot-challenge requirements
- THEN anonymous CAPTCHA verification MUST NOT be required
- AND existing authenticated checkout ownership and rate-limit controls MUST still apply

#### Scenario: Provider allowances are scoped to the challenge

- GIVEN the CAPTCHA widget or verifier requires external provider origins or secrets
- WHEN security configuration is reviewed
- THEN provider origins MUST be narrowly scoped to the selected CAPTCHA provider
- AND provider secrets MUST NOT be exposed to browser code, logs, or client-readable configuration
