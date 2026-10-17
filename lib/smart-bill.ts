import type {Data} from './pool';
import {payables,payableTotal} from './payables-ledger';
export type BillSuggestion={payee:string;reference:string;date:string;due:string;total:string;memo:string;warnings:string[]};
const normalized=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
function invoiceDate(s:string){
 const iso=s.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/),us=s.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/);
 const value=iso?iso[0]:us?`${us[3]}-${us[1].padStart(2,'0')}-${us[2].padStart(2,'0')}`:'';
 return value&&Number.isFinite(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value?value:'';
}
// Suggestions are deliberately conservative. No inferred field is approved or posted.
export function suggestBill(text:string):BillSuggestion{
 if(text.length>200000)throw Error('Invoice text exceeds 200,000 characters');
 const lines=text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 const labeled=(label:RegExp)=>lines.find(s=>label.test(s))??'';
 const vendor=labeled(/^(vendor|supplier|from)\s*:/i).replace(/^(vendor|supplier|from)\s*:\s*/i,'');
 const reference=labeled(/^invoice\s*(number|no\.?|#)\s*[:#-]?\s*\S/i).replace(/^invoice\s*(number|no\.?|#)\s*[:#-]?\s*/i,'').trim();
 const totalLine=labeled(/^(grand total|invoice total|total amount|total)\s*[:$\s]/i);
 const total=totalLine.match(/(?:USD\s*|\$\s*)?([0-9][0-9,]*\.\d{2})\s*(?:USD)?$/i)?.[1]?.replace(/,/g,'')??'';
 const date=invoiceDate(labeled(/^invoice date\b/i)),due=invoiceDate(labeled(/^(due date|payment due)\b/i));
 const account=labeled(/^(customer account|account number|account no\.?)\s*[:#]/i);
 const warnings=['All extracted fields are suggestions. Verify the invoice total, currency and existing QBO/OG entries.'];
 if(!vendor)warnings.push('Vendor not confidently identified. Enter the exact supplier.');
 if(!reference)warnings.push('Invoice number not identified. Check the original.');
 if(!total)warnings.push('Invoice total not confidently identified. Enter the original total.');
 if(!date||!due)warnings.push('Check invoice and due dates; supported automatic formats are YYYY-MM-DD and MM/DD/YYYY.');
 return {payee:vendor,reference,date,due,total,memo:account,warnings};
}
export function smartBillDuplicates(d:Data,bookId:string,payee:string,reference:string,total:number,hash:string){
 return payables(d).documents.filter(r=>r.bookId===bookId&&(hash&&r.source.includes('SHA256 '+hash)||normalized(payee)&&normalized(payee)===normalized(r.payee)&&(normalized(reference)&&normalized(reference)===normalized(r.reference)||total>0&&total===payableTotal(r))));
}
