# OG Microsoft 365 sign-in and administration

OG now has Account & Login, My Settings and General Settings, plus an administration hub that connects existing OG staff, roles, services and audit workflows. General Settings mirrors AppFolio category names where applicable; unsupported external products and automation are labeled unavailable. No AppFolio settings or passwords are imported.

## Administrator activation

Implementation is ready for deployment but Microsoft sign-in is NOT connected merely by installing the code. The administrator must configure and verify both services:

1. In Microsoft Entra admin center, App registrations, register a dedicated **OG sign-in** application for accounts in **this organizational directory only**. Use a separate application from the Outlook mail worker. Choose the Web platform and the exact Supabase provider callback shown by that project's Auth settings, normally `https://<project-ref>.supabase.co/auth/v1/callback`.
2. Follow the current Supabase Azure guide, including the optional `xms_edov` and `email` claims. OG rejects Microsoft identities whose provider email is not verified. Do not relax this check to permit an unverified account. Set Azure Tenant URL to `https://login.microsoftonline.com/<your-tenant-id>`; do not use `common` or `consumers` for this workspace.
3. Store the application client ID and secret privately in Supabase Authentication → Sign In / Providers → Azure. Use the secret VALUE, not its identifier. Set a reminder before expiration. Never put secrets in source code, OG forms or chat. Configure only the identity scopes needed for sign-in, including email. This sign-in flow requests no mail, calendar or directory-management permissions.
4. In Supabase's redirect allowlist, add the exact deployed OG origin followed by `/auth/microsoft/callback`. Set its Site URL to the same deployed origin. Use exact URLs, with no broad production wildcard.
5. In hosting, set `OG_APP_URL=https://your-og-host.example` (origin only), `OG_MICROSOFT_TENANT_ID=<directory-tenant-UUID>` and `OG_MICROSOFT_LOGIN_ENABLED=true`. The tenant ID flag records the administrator's configured directory; actual tenant enforcement is through the single-tenant Entra registration and Supabase Azure Tenant URL. OG does not infer tenant or roles from editable user metadata.
6. In Entra Enterprise applications, require assignment and assign only approved staff. Configure MFA and Conditional Access in Entra according to company policy. OG links to Microsoft Security Info and My Sign-ins rather than storing authentication methods itself.
7. Keep an independently tested Global Admin email/password login available while activating Microsoft sign-in. Do not disable existing authentication as part of this change.

Changing identity configuration creates a sensitive access connection. An administrator must review and approve the exact application and identity permissions before activation. No such grant was made by this implementation.

## OG membership and identity linking

The callback exchanges the PKCE code through the server cookie client, verifies the Microsoft identity and then registers the existing OG session. It does NOT create an OG staff record, assign a role, promote a user or accept a domain as permission. A current Active `og_app_users` record for the resulting Supabase auth ID is required. OG property scope and disabled status are checked on subsequent requests.

Supabase may automatically link a verified Microsoft email to an existing identity. Verify the actual Supabase auth ID after a test sign-in. If a separate identity is created or email aliases differ, OG intentionally denies access. Resolve identity linking through the Supabase administrator workflow after verifying the person; do not copy privileges by matching email inside the callback. Existing temporary-password change requirements remain in force and can be completed using the existing OG login before switching to Microsoft.

Failed callbacks sign out the issued local session and mark its OG session inactive. Redirect destinations use the configured OG origin, never callback query parameters or forwarded hosts. Raw OAuth codes, provider tokens, secrets and user metadata are not logged. The Microsoft attempt cookie lasts ten minutes; Supabase manages the PKCE verifier. No provider access or refresh token is returned to the browser by OG.

## Required live verification

- Approved Active staff member signs in and retains their exact OG role/property scope.
- Unassigned Microsoft user and account outside the configured tenant cannot complete the provider flow.
- A valid Microsoft identity with no OG membership and a Disabled OG member receive no OG record access.
- Cancelled sign-in, missing/invalid/expired PKCE codes and reused callbacks fail without exposing tokens or granting access.
- Logout and administrator disabling invalidate OG access on the next request.
- A Global Admin can access General Settings and audit logs; Management cannot grant Global Admin; scoped staff do not receive administrative data.
- Test Outlook sending and replies separately using `docs/work-order-outlook.md`. Microsoft sign-in does not enable email or calendar synchronization.

## Settings and calendar behavior

My Settings are browser-local, keyed by individual Supabase auth ID, and control report rows, font/row size, alternating rows, fitted columns, report detail headers, initial page and calendar view. They do not change exports or workspace permissions. Profile self-edit is restricted server-side to name and phone. Email and role remain administrator-managed.

Delete Event is at the bottom of saved event details. It asks to move the saved event into recoverable calendar trash. For recurrence it applies to the whole series; unsaved edits are discarded. Restore retains the prior event status, so a previously Cancelled event must also be changed back to Scheduled to reappear. Work orders and lease-derived calendar activities open their source workflow; they are not deleted as independent events.

## References

- [Supabase Azure sign-in](https://supabase.com/docs/guides/auth/social-login/auth-azure)
- [Microsoft My Account](https://support.microsoft.com/en-us/accounts-billing/work-school/my-account-portal-for-work-or-school-accounts)
- [Microsoft authentication method management](https://learn.microsoft.com/en-gb/entra/identity/authentication/howto-mfa-userdevicesettings)
- [Microsoft sign-in logs](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-ins)
