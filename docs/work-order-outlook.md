# Outlook work-order notifications and replies

The server queues one notification to `dla@devonshirecondos.com` when a new work order is saved or an existing work order is changed, including saves from the Maintenance portal. Viewing a ticket does not send an email. Existing tickets are not backfilled.

## Microsoft 365 setup

An administrator must register an Entra application and grant Microsoft Graph application `Mail.Send` and `Mail.Read`, with access restricted to the DLA mailbox using Exchange application RBAC / the organization's mailbox access policy. Do not grant access to unrelated mailboxes. OG uses client credentials and stores no secret in the browser.

Set these secrets in the hosting server's environment, never in GitHub or NEXT_PUBLIC variables:

- `MS_TENANT_ID`
- `MS_CLIENT_ID`
- `MS_CLIENT_SECRET`
- `OG_WORK_EMAIL_ENABLED=true` (set only after mailbox permissions are verified)
- `OG_WORK_EMAIL_CRON_SECRET` (at least 32 random characters)

Schedule an authenticated HTTPS GET to `/api/work-email` every 5 minutes with `Authorization: Bearer <OG_WORK_EMAIL_CRON_SECRET>`. A Microsoft configuration or cron-secret indicator alone does not prove the permissions or scheduler work. Managers can also use the Maintenance **Sync Outlook** button. Verify one test notification and one tenant reply before treating the integration as operational.

The send endpoint accepts requests with HTTP 202; this means accepted for processing, not confirmed delivery. Check Sent Items / mailbox delivery reports for confirmation. The queue claims a notification before sending using OG's existing revision check. A timeout or uncertain server response stays **Delivery uncertain** and is never automatically resent. Reconcile it in Sent Items before any separate corrective message. Explicit rejections remain in the queue for review.

## Tenant replies

Keep `[OG-WO:<ticket marker>]` in the subject when forwarding a ticket to its tenant. OG sends only the requested DLA notification; tenant outbound email is not enabled. Polling reads the DLA Inbox and attaches a reply only when its marker matches a saved ticket and its sender matches a tenant or second tenant email for that unit on the received date. Replies are stored once by Outlook message ID in the ticket's **Tenant replies** section. The reply body is text, capped at 12,000 characters. It never changes financial entries, status, assignment or approvals. Attachments are not downloaded. Unrecognized senders, missing markers and replies outside the current tenancy need manual handling. Deleting or moving an unprocessed message out of Inbox can prevent ingestion.

Reply polling paginates with a saved continuation and a one-minute overlap, deduplicating saved message IDs. Existing JSON workspace records hold the queue and replies, so no database schema change is required. The records API rejects client edits to email state. Maintenance users do not receive the mailbox queue or unrelated reply contents.

References: [sendMail](https://learn.microsoft.com/en-us/graph/api/user-sendmail?view=graph-rest-1.0), [list messages](https://learn.microsoft.com/en-us/graph/api/user-list-messages?view=graph-rest-1.0), [client credentials](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow).
