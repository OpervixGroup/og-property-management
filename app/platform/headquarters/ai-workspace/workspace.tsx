export default function Workspace({folderUrl}: {folderUrl: string | null}) {
  return <main className="hq hq-ai-workspace">
    <header className="hq-header">
      <a href="/platform/headquarters"><img src="/opervix-logo-luxury.webp" alt="Opervix Group" width="64" height="64"/></a>
      <div><p className="hq-kicker">HEADQUARTERS · CEO WORKSPACE</p><h1>Opervix AI Workspace</h1><p>Your cloud materials, company controls and assistant access in one place.</p></div>
      <a href="/platform/headquarters">Back to Headquarters</a>
    </header>
    <section className="hq-ai-intro" aria-label="Assistant connection status">
      <div><span className="hq-ai-badge">EMBEDDED CHAT · NOT CONNECTED</span><h2>Your work, with clear boundaries.</h2><p>Use ChatGPT in its own secure window while the Headquarters assistant connection is prepared. Your existing conversations and connections remain in ChatGPT.</p></div>
      <a className="hq-ai-primary" href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">Open ChatGPT ↗</a>
    </section>
    <section className="hq-ai-grid" aria-label="Workspace tools">
      <article><p className="hq-kicker">01 · SOURCE & CONTINUITY</p><h2>Private cloud materials</h2><p>Open the source archives, development plans and continuity handoff in your authorized Microsoft workspace.</p>
        {folderUrl ? <><a href={folderUrl} target="_blank" rel="noopener noreferrer">Open private cloud folder ↗</a><p className="hq-ai-note">Microsoft checks your account and file permissions. This link does not grant access.</p></> : <><a href="https://www.microsoft365.com/onedrive" target="_blank" rel="noopener noreferrer">Open Microsoft 365 ↗</a><p className="hq-ai-note">The direct Headquarters cloud-folder link has not been configured. Find your existing private development folder in OneDrive.</p></>}
      </article>
      <article><p className="hq-kicker">02 · HUMAN DIRECTION</p><h2>Company execution</h2><p>Review actual task evidence, pauses and approvals before work proceeds.</p><a href="/platform/autonomy">Open execution controls</a><p className="hq-ai-note">This page does not start tasks, resume workers or change CEO controls.</p></article>
      <article><p className="hq-kicker">03 · CLIENT SERVICES</p><h2>Corporate Client Campus</h2><p>Return to the dedicated client desks. Corporate, Leasing and HOA work keep their separate access and records.</p><a href="/platform/headquarters/client-campus">Open client campus</a><p className="hq-ai-note">The CEO Workspace does not grant client staff new access.</p></article>
    </section>
    <section className="hq-ai-readiness" aria-labelledby="workspace-readiness">
      <div><p className="hq-kicker">CONNECTION CHECKLIST</p><h2 id="workspace-readiness">What remains before integrated AI work</h2><p>These are setup requirements, not a live worker-health report.</p></div>
      <ul><li><strong>Supported model connection</strong><span>Existing subscriptions only. No new paid API has been enabled.</span></li><li><strong>Protected task bridge</strong><span>Website-to-worker authorization and client isolation must pass live checks.</span></li><li><strong>Pause and recovery evidence</strong><span>Verify actual controls, duplicate protection and interrupted-task recovery.</span></li><li><strong>Feature acceptance</strong><span>Files, voice, tools and computer control need separate supported integrations. Full desktop feature parity is not established.</span></li></ul>
    </section>
    <footer>Opening ChatGPT uses its own sign-in. This workspace does not embed the ChatGPT desktop application, transfer account credentials or import this chat.</footer>
  </main>;
}
