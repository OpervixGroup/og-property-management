# Platform administrator password setup

The Founder can open Super Admin access in the platform to create a login for an already approved, active, unbound registry reservation. A mailbox is not required: the administrator explicitly provisions the login and privately supplies a temporary password. Existing identities are never reset or reassigned. Passwords retain the existing 12–128 character policy.

New accounts carry a server-managed required-password-change flag. Verified sessions are sent to the password setup page and platform APIs deny access until the password changes. Authorization never trusts user-editable metadata. Requests require the configured same origin, rate limits and access audit records. No email invitations are sent; no external service permissions are granted.

The Founder performs production release separately. Test against a disposable identity before provisioning a real account. Synthetic coverage is in tests/platform-admin-setup.mjs and tests/company-sessions.mjs. Automatic report delivery and username-only recovery are not implemented by this change. Recovery for a username without a mailbox requires a separately authorized administrator procedure; do not send reset links to a nonexistent mailbox.
