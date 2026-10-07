import {type Data,type Statement,money,totals} from '@/lib/pool';
import {ownerLedgerLine,packetApproved} from '@/lib/owner-run';
import {contributionTotal,ownerOutstanding} from '@/lib/month-close';
import {statementNoteBlocks} from '@/lib/statement-notes';

const styles=`
.owner-statement{color:#183749;font:14px/1.55 Arial,sans-serif;border:1px solid #d9e1e7;border-top:4px solid #baa05b!important;padding:32px!important;background:white;box-shadow:none}
.owner-statement .os-header{display:flex;justify-content:space-between;gap:24px;border-bottom:1px solid #d9e1e7;padding-bottom:20px}
.owner-statement .os-brand{font:italic bold 32px Georgia;color:#a88a38}.owner-statement .os-company{font-size:10px;letter-spacing:1.4px;margin-top:2px}
.owner-statement .os-contact{font-size:11px;line-height:1.7;text-align:right;color:#536774}
.owner-statement .os-title{font-size:21px;letter-spacing:0;line-height:1.25;margin:24px 0 16px}
.owner-statement .os-meta{display:grid;grid-template-columns:1fr 1fr;gap:12px 24px;background:#f5f7f8;padding:16px;margin-bottom:24px}
.owner-statement .os-label{display:block;font-size:10px;letter-spacing:.7px;text-transform:uppercase;color:#617783}.owner-statement .os-meta strong{display:block;font-size:14px}
.owner-statement .os-status{display:inline-block;border:1px solid #ccb978;color:#806526;font-size:10px;padding:2px 7px;margin-top:5px}
.owner-statement .os-section{font-size:12px;text-transform:uppercase;letter-spacing:.9px;margin:24px 0 10px;border-bottom:2px solid #183749;padding-bottom:7px;break-after:avoid}
.owner-statement .os-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:12px}.owner-statement .os-table th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.6px;background:#f5f7f8;color:#617783}
.owner-statement .os-table td,.owner-statement .os-table th{padding:9px 8px;border-bottom:1px solid #e4e9ed;vertical-align:top;overflow-wrap:anywhere}.owner-statement .os-table th:last-child,.owner-statement .os-table td:last-child{width:108px;text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
.owner-statement .os-total td{font-weight:bold;border-top:2px solid #b6c3cc}.owner-statement .os-summary{margin-top:16px;padding:16px;background:#edf3f5;display:flex;justify-content:space-between;gap:20px;align-items:center;break-inside:avoid}.owner-statement .os-summary strong{font-size:22px;white-space:nowrap;font-variant-numeric:tabular-nums}
.owner-statement .os-detail{margin:0 0 12px;padding:12px 14px;border-left:3px solid #c7ad63;background:#fafbf9;font-size:12px;color:#334f60;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.7}
.owner-statement .os-note{font-size:11px;color:#607480;margin-top:12px;line-height:1.65}.owner-statement .os-footer{border-top:1px solid #d9e1e7;margin-top:24px;padding-top:12px;font-size:9px;color:#71838d}
@media(max-width:600px){.owner-statement{padding:18px!important}.owner-statement .os-header{display:block}.owner-statement .os-contact{text-align:left;margin-top:12px}.owner-statement .os-title{font-size:19px}.owner-statement .os-table td,.owner-statement .os-table th{padding:8px 4px}.owner-statement .os-table th:last-child,.owner-statement .os-table td:last-child{width:92px}}
@media print{.owner-statement{border:0;border-top:3px solid #baa05b!important;padding:0!important;font-size:12px}.owner-statement .os-header{display:flex}.owner-statement .os-contact{text-align:right;margin-top:0}.owner-statement .os-table thead{display:table-header-group}.owner-statement .os-table tr{break-inside:avoid}.owner-statement .os-detail{orphans:3;widows:3}}
`;

export default function StatementDocument({data,statement:s,documentCount}:{data:Data;statement:Statement;documentCount?:number}){
 const unit=data.units.find(u=>u.id===s.unitId),owner=data.owners.find(o=>o.id===s.ownerId),t=totals(s),closing=ownerOutstanding(data,s),imported=ownerLedgerLine(data,s),approved=packetApproved(data,s);
 const period=new Date(s.period+'-02T12:00:00Z').toLocaleDateString('en-US',{month:'long',year:'numeric',timeZone:'UTC'});
 const summary=[['Opening owner balance',s.opening],['Pool income',s.allocated],['Owner charges',-t.deductions],['Credits',(s.credits??[]).reduce((n,c)=>n+c.cents,0)],['Other adjustments',s.adjustments],['Cash distribution recorded',-((s.cashPaid??s.paidAmount)+imported.cash)],['Internal owner offset',-imported.netting],['HOA offset applied',-(s.offsetPaid??0)],['HOA offset received',s.offsetReceived??0],['Owner contributions received',contributionTotal(data,s)]] as const;
 return <section className="statement-paper owner-statement"><style>{styles}</style>
  <header className="os-header"><div><div className="os-brand">Devonshire</div><div className="os-company">LEASING AGENCY INC.</div></div><p className="os-contact">11843 Braesview Main Office<br/>San Antonio, Texas 78213<br/>210-493-3161 · www.devonshirecondos.com</p></header>
  <h3 className="os-title">Pool rent owner statement</h3>
  <div className="os-meta"><div><span className="os-label">Prepared for</span><strong>{(s as Statement & {ownerSnapshot?:{name:string}}).ownerSnapshot?.name??owner?.name??'Owner not assigned'}</strong><span className="os-label">Unit {unit?.number}</span></div><div><span className="os-label">Statement period</span><strong>{period}</strong><span className="os-status">{s.status==='Pending'?'DRAFT · NOT APPROVED':s.status.toUpperCase()} · Version {s.version}</span></div></div>
  <h4 className="os-section">Income and itemized charges</h4><table className="os-table"><thead><tr><th>Description / reference</th><th>Amount</th></tr></thead><tbody><tr><td>{s.status==='Pending'?'Draft pool allocation':'Allocated pool income'}</td><td>{money(s.allocated)}</td></tr>{s.expenses.map(e=><tr key={e.id}><td>{e.label}</td><td>{money(-e.cents)}</td></tr>)}{(s.credits??[]).map(c=><tr key={c.id}><td>{c.label} (credit)</td><td>{money(c.cents)}</td></tr>)}<tr className="os-total"><td>Total owner charges</td><td>{money(t.deductions)}</td></tr></tbody></table>
  <h4 className="os-section">Balance summary</h4><table className="os-table"><tbody>{summary.filter(([label,value],i)=>i<3||value!==0).map(([label,value])=><tr key={label}><td>{label}</td><td>{money(value)}</td></tr>)}</tbody></table><div className="os-summary"><div><span className="os-label">Closing owner balance</span><span>{closing<0?'Owner contribution due':'Balance available to owner'}</span></div><strong>{money(Math.abs(closing))}</strong></div>
  <p className="os-note">Opening balance {s.openingConfirmed?'verified':'requires review'}. {!approved&&s.status==='Pending'?'Amounts are provisional until the statement is approved.':''}</p>
  {!!s.ownerNotes&&<><h4 className="os-section">Work performed and material prices</h4>{statementNoteBlocks(s.ownerNotes).map((note,i)=><div className="os-detail" key={i}>{note.title&&<strong>{note.title}<br/></strong>}{note.body}</div>)}</>}
  <h4 className="os-section">Supporting documents</h4><p className="os-note">{documentCount!==undefined&&<>{documentCount} supporting document{documentCount===1?'':'s'} attached. </>}Original receipts and contractor invoices are included when you choose a PDF with supporting receipts.</p>{s.paymentRef&&<p className="os-note">Payment reference: {s.paymentRef} · {s.paidDate}</p>}
  <p className="os-footer">Devonshire Leasing Agency Inc. · Prepared with Opervix Group · www.opervixgroup.com</p>
 </section>;
}
